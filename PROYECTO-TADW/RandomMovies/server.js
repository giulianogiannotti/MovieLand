const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const axiosRetry = require('axios-retry').default;
axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay, });
const app = express();
app.use(cors());

// Middleware para parsear JSON
app.use(express.json());

// Leer variables de entorno
const PORT = process.env.PORT || 4000; // Este microservicio correrá en un puerto diferente
const MOVIES_API_URL = process.env.MOVIES_API_URL || 'http://movies:3000/movies'; // URL del microservicio movies
const OMDB_API_KEY = '720b1853'; // Tu AppKey de OMDB


/**
 * Función para verificar si una imagen es válida
 */
async function posterValid(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return response.status === 200;
  } catch (error) {
    console.error('Error al verificar el póster:', error.message);
    return false;
  }
}

async function updatePoster(movie) {
  const formattedTitle = movie.title.replace(/\s+/g, '-'); // Reemplaza espacios por guiones
  const omdbUrl = `https://www.omdbapi.com/?t=${formattedTitle}&plot=full&apikey=${OMDB_API_KEY}`;

  try {
    const response = await axios.get(omdbUrl);
    const omdbData = response.data;

    if (omdbData.Poster && await posterValid(omdbData.Poster)) {
      movie.poster = omdbData.Poster; // Actualiza el póster si es válido
    } else {
      movie.poster = "404.jpeg"; // Si no se encuentra un póster válido, asignar imagen por defecto
    }
  } catch (error) {
    console.error(`Error al obtener el póster de ${movie.title}:, error.message`);
    movie.poster = "404.jpeg"; // Asignar imagen por defecto si ocurre un error
  }

  return movie;
}

/**
 * Función para validar y actualizar los pósters de un array de películas
 */
async function validateAndUpdatePosters(movies) {
  const promises = movies.map(async (movie) => {
    if (!movie.poster) {
      console.log(`La película "${movie.title}" no tiene póster. Intentando asignar uno...`);
      return await updatePoster(movie);
    }

    const isPosterValid = await posterValid(movie.poster);
    if (!isPosterValid) {
      console.log(`Póster inválido para la película: "${movie.title}". Intentando actualizar...`);
      return await updatePoster(movie);
    }

    return movie; // Si el póster es válido, devolver la película sin cambios
  });

  return Promise.all(promises);
}

/**
 * Función para obtener N películas al azar de un género específico
 */
const getRandomMoviesByGenre = (movies, genre, n) => {
  const filteredMovies = movies.filter(movie => Array.isArray(movie.genres) && movie.genres.includes(genre));
  const shuffled = filteredMovies.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
};

// Ruta para obtener 10 películas de cada género especificado
app.get('/random-movies-by-genres', async (req, res) => {
  try {
    const response = await axios.get(MOVIES_API_URL);
    const movies = response.data;

    if (!movies || movies.length === 0) {
      return res.status(404).json({ error: 'No hay películas disponibles.' });
    }

    const genres = ['Horror', 'Adventure', 'Action', 'Drama', 'Comedy'];
    const moviesByGenre = {};

    // Filtrar 10 películas de cada género
    genres.forEach(genre => {
      const genreMovies = getRandomMoviesByGenre(movies, genre, 10);
      
      // Validar y actualizar los pósters solo para las 10 películas de cada género
      moviesByGenre[genre] = validateAndUpdatePosters(genreMovies);
    });

    // Esperar a que todas las validaciones y actualizaciones de los pósters se completen
    const validatedMoviesByGenre = await Promise.all(Object.values(moviesByGenre));

    // Reestructurar el resultado para devolverlo correctamente
    const finalResponse = genres.reduce((acc, genre, index) => {
      acc[genre] = validatedMoviesByGenre[index];
      return acc;
    }, {});

    res.json(finalResponse);
  } catch (err) {
    console.error('Error al obtener películas:', err.message);
    res.status(500).json({ error: 'Error al obtener películas.' });
  }
});

// Ruta para obtener 10 películas al azar
app.get('/random-movies', async (req, res) => {
  try {
    const response = await axios.get(MOVIES_API_URL);
    const movies = response.data;

    if (!movies || movies.length === 0) {
      return res.status(404).json({ error: 'No hay películas disponibles.' });
    }

    const shuffled = movies.sort(() => 0.5 - Math.random());
    const randomMovies = shuffled.slice(0, 10);

    // Validar y actualizar los pósters de todas las películas
    const validatedMovies = await validateAndUpdatePosters(randomMovies);


    res.json(validatedMovies);
  } catch (err) {
    console.error('Error al obtener películas:', err.message);
    res.status(500).json({ error: 'Error al obtener películas.' });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log('RandomMovies corriendo');
});