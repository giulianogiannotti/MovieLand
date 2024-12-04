const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const app = express();
const cors= require('cors');
const https = require('https');
const axios = require('axios');
const axiosRetry = require('axios-retry').default;
axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay, });

app.use(cors());

// Middleware para parsear JSON
app.use(express.json());

const Movie = require('./models/Movie');

// Leer variables de entorno
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/moviesdb';

// Conexión a MongoDB y carga de datos
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Conectado a MongoDB');

    // Verificar si hay datos en la colección
    const count = await Movie.countDocuments();

    // Borrar los datos existentes si hay documentos en la colección
    if (count > 0) {
      console.log('Ya hay datos');
      //await Movie.deleteMany({});
    }
    else {

    // Cargar los nuevos datos
    console.log('Cargando datos iniciales desde movies.json...');
    const dataPath = path.join(__dirname, 'movies.json');
    let movies = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

      // Convertir el campo _id a ObjectId sin modificar el archivo JSON
      movies = movies.map(movie => {
        if (movie._id && movie._id.$oid) {
          // Convertir el campo _id de String a ObjectId
          movie._id = new mongoose.Types.ObjectId(movie._id.$oid);
        }
        return movie;
      });

      // Insertar las películas en la base de datos
      await Movie.insertMany(movies);
    console.log('Datos iniciales cargados correctamente.');
   }
  })
  .catch((err) => {
    console.error('Error al conectar a MongoDB:', err.message);
  });

// Rutas de la API
app.get('/movies', async (req, res) => {
  try {
    const movies = await Movie.find();
    res.json(movies);
  } catch (err) {
    console.error('Error al obtener las películas:', err);
    res.status(500).send('Error al obtener las películas');
  }
});

// Nueva ruta: Encontrar película por título
app.get('/movies/title/:title', async (req, res) => {
  try {
    const movie = await Movie.findOne({ title: req.params.title });
    if (!movie) return res.status(404).send('Película no encontrada.');
    res.json(movie);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error al obtener la película.');
  }
});

// Nueva ruta: Obtener películas por género
app.get('/movies/genre/:genre', async (req, res) => {
  try {
    const movies = await Movie.find({ genres: req.params.genre });
    if (movies.length === 0) return res.status(404).send('No se encontraron películas para este género.');
    res.json(movies);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error al obtener las películas.');
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log('Servidor corriendo');
});