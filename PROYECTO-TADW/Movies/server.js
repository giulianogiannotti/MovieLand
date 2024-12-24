const { MongoClient, ObjectId } = require('mongodb');
const PORT = process.env.PORT || 3000;
const fs = require('fs');
const path = require('path');
const cors = require("cors");
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = 'moviesdb';
const COLLECTION_NAME = 'movies';
const jsonFilePath = path.join(__dirname, 'movies.json');
const express = require('express');
const app = express();
app.use(cors());

let database;

async function main() {
    const client = new MongoClient(MONGO_URI);

    try {
        // Conectar al cliente MongoDB
        await client.connect();
        console.log('Conectado a MongoDB');

        database = client.db(DATABASE_NAME);
        const collection = database.collection(COLLECTION_NAME);

        // Verificar si el archivo JSON existe
        if (fs.existsSync(jsonFilePath)) {
            console.log('Cargando datos desde movies.json...');
            const info = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
	 
	    
            info.forEach(movie => {
                if (movie._id && movie._id.$oid) {
                    movie._id = new ObjectId(movie._id.$oid);
                } else if (movie._id && typeof movie._id !== 'object') {
                    movie._id = new ObjectId();
                }

                // Convertir otros campos específicos
                if (movie.runtime?.$numberInt) {
                    movie.runtime = parseInt(movie.runtime.$numberInt, 10);
                }
                if (movie.released?.$date?.$numberLong) {
                    movie.released = new Date(parseInt(movie.released.$date.$numberLong, 10));
                }
                if (movie.awards?.wins?.$numberInt) {
                    movie.awards.wins = parseInt(movie.awards.wins.$numberInt, 10);
                }
                if (movie.awards?.nominations?.$numberInt) {
                    movie.awards.nominations = parseInt(movie.awards.nominations.$numberInt, 10);
                }
                if (movie.year?.$numberInt) {
                    movie.year = parseInt(movie.year.$numberInt, 10);
                }
                if (movie.imdb?.rating?.$numberDouble) {
                    movie.imdb.rating = parseFloat(movie.imdb.rating.$numberDouble);
                }
                if (movie.imdb?.votes?.$numberInt) {
                    movie.imdb.votes = parseInt(movie.imdb.votes.$numberInt, 10);
                }
                if (movie.imdb?.id?.$numberInt) {
                    movie.imdb.id = parseInt(movie.imdb.id.$numberInt, 10);
                }
                if (movie.tomatoes?.viewer?.rating?.$numberInt) {
                    movie.tomatoes.viewer.rating = parseInt(movie.tomatoes.viewer.rating.$numberInt, 10);
                }
                if (movie.tomatoes?.viewer?.numReviews?.$numberInt) {
                    movie.tomatoes.viewer.numReviews = parseInt(movie.tomatoes.viewer.numReviews.$numberInt, 10);
                }
                if (movie.tomatoes?.viewer?.meter?.$numberInt) {
                    movie.tomatoes.viewer.meter = parseInt(movie.tomatoes.viewer.meter.$numberInt, 10);
                }
                if (movie.tomatoes?.lastUpdated?.$date?.$numberLong) {
                    movie.tomatoes.lastUpdated = new Date(parseInt(movie.tomatoes.lastUpdated.$date.$numberLong, 10));
                }
            });

            // Insertar los movieumentos procesados en la colección
            const result = await collection.insertMany(info);
            console.log(' documentos insertados correctamente.');
        } else {
            console.error('Archivo no encontrado.');
        }
    } catch (err) {
        console.error('Error al cargar datos en MongoDB:', err.message);
    } 
}


app.get('/movies', async (req, res) => {
    try {
        const collection = database.collection(COLLECTION_NAME);
        const movies = await collection.find().toArray();
        res.json(movies);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error al obtener las peliculas.');
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});

main().catch(console.error);
