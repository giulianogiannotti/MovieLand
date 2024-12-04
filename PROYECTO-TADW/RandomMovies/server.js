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


async function saveMoviesToFile(filename, data) {
  try {
    const filePath = path.resolve(__dirname, filename);  // __dirname es el directorio de server.js
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log('Datos guardados ');
  } catch (err) {
    console.error('Error al guardar los datos :', err.message);
  }
}

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

// Ruta para obtener 15 películas de cada género especificado
app.get('/random-movies-by-genres', async (req, res) => {
  try {
    const response = await axios.get(MOVIES_API_URL);
    const movies = response.data;

    if (!movies || movies.length === 0) {
      return res.status(404).json({ error: 'No hay películas disponibles.' });
    }

    // Validar y actualizar los pósters de todas las películas
    const validatedMovies = await validateAndUpdatePosters(movies);

    const genres = ['Horror', 'Adventure', 'Action', 'Drama', 'Comedy'];
    const moviesByGenre = {};

    genres.forEach(genre => {
      moviesByGenre[genre] = getRandomMoviesByGenre(validatedMovies, genre, 15);
    });

    await saveMoviesToFile('movies3.json', moviesByGenre);
	
    res.json(moviesByGenre);
  } catch (err) {
    console.error('Error al obtener películas:', err.message);
    res.status(500).json({ error: 'Error al obtener películas.' });
  }
});

// Ruta para obtener 9 películas al azar
app.get('/random-movies', async (req, res) => {
  try {
    const response = await axios.get(MOVIES_API_URL);
    const movies = response.data;

    if (!movies || movies.length === 0) {
      return res.status(404).json({ error: 'No hay películas disponibles.' });
    }

    // Validar y actualizar los pósters de todas las películas
    const validatedMovies = await validateAndUpdatePosters(movies);

    const shuffled = validatedMovies.sort(() => 0.5 - Math.random());
    const randomMovies = shuffled.slice(0, 9);
    await saveMoviesToFile('movies2.json', randomMovies);

    res.json(randomMovies);
  } catch (err) {
    console.error('Error al obtener películas:', err.message);
    res.status(500).json({ error: 'Error al obtener películas.' });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log('RandomMovies corriendo');
});