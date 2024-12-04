import json
import requests
import pika
import pandas as pd
from flask import Flask, jsonify
from flask_cors import CORS
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import os


app = Flask(__name__)
CORS(app)

# Función para calcular similitud de tramas
def calculate_plot_similarity(liked_movies, movies):
    liked_plots = movies[movies["Title"].isin(liked_movies)]["plot"].fillna("")
    all_plots = movies["plot"].fillna("")

    # TF-IDF Vectorizer para las tramas
    vectorizer = TfidfVectorizer(stop_words='english')
    tfidf_matrix = vectorizer.fit_transform(all_plots)

    # Calcular similitud coseno entre tramas liked y todas las demás
    liked_vectors = tfidf_matrix[movies["Title"].isin(liked_movies)]
    similarity_scores = cosine_similarity(tfidf_matrix, liked_vectors).max(axis=1)

    # Agregar similitud como una columna
    movies["PlotScore"] = similarity_scores

# Función para conectar a RabbitMQ y obtener los mensajes
def get_liked_movie_titles_from_queue(movies):
    rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
    parameters = pika.URLParameters(rabbitmq_url)
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()

    # Declarar la cola y obtener los mensajes
    channel.queue_declare(queue='movie_clicks', durable=True)
    method_frame, header_frame, body = channel.basic_get(queue='movie_clicks')

    liked_ids = []
    while method_frame:
        movie_message = json.loads(body)
        liked_ids.append(movie_message['movieId'])
        channel.basic_ack(method_frame.delivery_tag)
        method_frame, header_frame, body = channel.basic_get(queue='movie_clicks')

    connection.close()

    # Mapear IDs a títulos
    liked_movies = movies[movies["_id"].isin(liked_ids)]["Title"].tolist()
    return liked_movies

# Cargar el dataset de películas desde el API
def load_movies_data():
    # Obtener datos de películas desde la API
    response = requests.get("http://movies:3000/movies")
    if response.status_code == 200:
        data = response.json()
        movies = pd.json_normalize(data)
        
        # Asegurarte de que el campo '_id' esté correctamente mapeado
        if '_id.$oid' in movies.columns:
            movies['_id'] = movies['_id.$oid']
        
        # Seleccionar y renombrar columnas
        movies = movies[["title", "genres", "imdb.rating", "runtime", "year", "poster", "_id", "plot"]]
        movies.rename(columns={"title": "Title", "genres": "Genres", "imdb.rating": "Rating"}, inplace=True)
        movies["Genres"] = movies["Genres"].apply(lambda x: x if isinstance(x, list) else [])
        return movies
    else:
        raise Exception("Error al obtener los datos de la API")

# Función para obtener las películas recomendadas
def recommend_movies(liked_movies, movies):
    # Step 3: Analyze User Preferences
    liked_genres = movies[movies["Title"].isin(liked_movies)]["Genres"].explode()
    liked_genres_count = liked_genres.value_counts()

    # Step 4: Calculate GenreScore
    def calculate_genre_score(genres):
        if not isinstance(genres, list):
            return 0
        return sum(liked_genres_count.get(genre, 0) for genre in genres)

    movies["GenreScore"] = movies["Genres"].apply(calculate_genre_score)
    movies["Rating"] = pd.to_numeric(movies["Rating"], errors='coerce')

    # Step 5: Calculate PlotScore
    calculate_plot_similarity(liked_movies, movies)

    # Step 6: Combine scores into RecommendationScore
    movies["RecommendationScore"] = movies["GenreScore"] + movies["Rating"] + movies["PlotScore"]

    # Exclude already liked movies
    recommendations = movies[~movies["Title"].isin(liked_movies)]

    # Select top 5 recommendations based on the score
    top_recommendations = recommendations.sort_values(by='RecommendationScore', ascending=False).head(5)
    return top_recommendations[['Title', 'Genres', 'Rating', 'runtime', 'year', 'poster', 'plot']]

# Función para verificar si un póster es válido
def poster_valid(url):
    try:
        response = requests.get(url, timeout=5)
        return response.status_code == 200
    except requests.exceptions.RequestException:
        return False

# Función para actualizar el póster si es inválido o NaN
def update_poster(movie):
    formatted_title = movie['Title'].replace(' ', '+')
    omdb_url = f"http://www.omdbapi.com/?t={formatted_title}&apikey=720b1853"
    
    try:
        response = requests.get(omdb_url)
        omdb_data = response.json()
        
        # Si el póster está en los datos de OMDB, actualiza el atributo poster
        if 'Poster' in omdb_data and omdb_data['Poster'] != 'N/A':
            movie['poster'] = omdb_data['Poster']
        else:
            movie['poster'] = None  # Asignar None si no hay póster en OMDB
    except requests.exceptions.RequestException as e:
        movie['poster'] = None  # Si falla la API, asignar None
    
    # Si el póster es inválido, asignar '404.jpeg'
    if pd.isna(movie.get('poster')) or movie['poster'] is None or not poster_valid(movie['poster']):
        movie['poster'] = os.path.join(os.getcwd(), '404.jpeg')  # Ruta del póster predeterminado
    
    return movie

# Función para actualizar datos faltantes desde la API
def update_movie_data(movie):
    formatted_title = movie['Title'].replace(' ', '+')
    omdb_url = f"http://www.omdbapi.com/?t={formatted_title}&apikey=720b1853"

    try:
        response = requests.get(omdb_url)
        omdb_data = response.json()
        
        # Actualizar campos faltantes
        if 'Poster' in omdb_data and omdb_data['Poster'] != 'N/A':
            movie['poster'] = omdb_data['Poster']
        if 'Runtime' in omdb_data and omdb_data['Runtime'] != 'N/A':
            movie['runtime'] = omdb_data['Runtime']
        if 'Year' in omdb_data and omdb_data['Year'] != 'N/A':
            movie['year'] = omdb_data['Year']
        if 'imdbRating' in omdb_data and omdb_data['imdbRating'] != 'N/A':
            movie['Rating'] = omdb_data['imdbRating']
    except requests.exceptions.RequestException as e:
        pass  # Si hay un error, dejamos los valores como están
    
    return movie

@app.route('/get-recommended-movies', methods=['GET'])
def get_recommended_movies():
    # Cargar el dataset de películas
    movies = load_movies_data()

    # Obtener los títulos de las películas "liked" desde RabbitMQ
    liked_movies = get_liked_movie_titles_from_queue(movies)

    # Obtener las recomendaciones
    recommended_movies = recommend_movies(liked_movies, movies)

    # Validar y actualizar datos de las recomendaciones
    for i, movie in recommended_movies.iterrows():
        # Asegurarse de que el póster esté presente
        if 'poster' not in movie or pd.isna(movie['poster']):
            updated_movie = update_poster(movie)
            for key in ['poster']:
                recommended_movies.at[i, key] = updated_movie[key]
        
        # Verificar si faltan datos esenciales
        if pd.isna(movie['runtime']) or pd.isna(movie['year']) or pd.isna(movie['Rating']):
            updated_movie = update_movie_data(movie)
            for key in ['poster', 'runtime', 'year', 'Rating']:
                recommended_movies.at[i, key] = updated_movie[key]

    # Convertir el DataFrame a una lista de diccionarios
    recommended_movies_list = recommended_movies[['Title', 'Genres', 'Rating', 'runtime', 'year', 'poster', 'plot']].to_dict(orient='records')

    # Convertir la lista de diccionarios a JSON sin escapar caracteres especiales
    recommended_movies_json = json.dumps(recommended_movies_list, ensure_ascii=False)
    print(recommended_movies_json)
    # Devolver las recomendaciones en formato JSON
    return jsonify(recommended_movies_json)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=6001)