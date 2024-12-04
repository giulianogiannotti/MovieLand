const express = require('express');
const amqp = require('amqplib');
const bodyParser = require('body-parser');
const cors= require('cors');
const app = express();

app.use(cors());
const port = 5000;

app.use(bodyParser.json()); // Para procesar los datos JSON enviados

let movieClicks = {}; // Para almacenar la cantidad de clics por película

// Función para conectar a RabbitMQ y enviar un mensaje
const sendToQueue = async (movieId) => {
  try {
    const connection = await amqp.connect('amqp://guest:guest@rabbitmq'); // URL de RabbitMQ
    const channel = await connection.createChannel();
    const queue = 'movie_clicks'; // Nombre de la cola

    await channel.assertQueue(queue, { durable: true });

    // Enviar el mensaje con el ID de la película y la cantidad de clics
    const message = JSON.stringify({
      movieId,
      clicks: movieClicks[movieId] || 0
    });

    channel.sendToQueue(queue, Buffer.from(message), { persistent: true });

    console.log(`Enviado: ${message}`);

    // Cerrar la conexión después de enviar el mensaje
    setTimeout(() => {
      connection.close();
    }, 500);
  } catch (error) {
    console.error('Error al conectar con RabbitMQ:', error);
  }
};

// Endpoint para recibir clics de películas
app.post('/register-click', async (req, res) => {
  const { movieId } = req.body;

  if (!movieId) {
    return res.status(400).send('ID de película es requerido');
  }

  // Incrementar el contador de clics para la película
  movieClicks[movieId] = (movieClicks[movieId] || 0) + 1;

  // Llamar a la función para enviar el clic a RabbitMQ
  await sendToQueue(movieId);
  console.log('Exito');
  res.status(200).send('Clic registrado');
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Microservicio Historial escuchando en el puerto ${port}`);
});