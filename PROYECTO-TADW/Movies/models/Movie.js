const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  // El campo _id es gestionado automáticamente por MongoDB
}, { strict: false });  // Permite que los documentos tengan campos no definidos en el esquema

module.exports = mongoose.model('Movie', movieSchema);