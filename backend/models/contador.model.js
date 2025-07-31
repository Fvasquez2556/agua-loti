// Modelo para contadores de números de factura
const mongoose = require('mongoose');

const contadorSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  secuencial: {
    type: Number,
    default: 0
  }
}, {
  collection: 'contadores',
  timestamps: false
});

module.exports = mongoose.model('Contador', contadorSchema);
