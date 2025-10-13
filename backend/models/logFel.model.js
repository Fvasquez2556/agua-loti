const mongoose = require('mongoose');

const logFelSchema = new mongoose.Schema({
  facturaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Factura',
    required: true
  },
  tipo: {
    type: String,
    enum: ['certificacion', 'anulacion', 'consulta'],
    required: true
  },
  estado: {
    type: String,
    enum: ['exitoso', 'error', 'pendiente'],
    required: true
  },
  intentos: {
    type: Number,
    default: 1
  },
  respuesta: {
    type: mongoose.Schema.Types.Mixed
  },
  error: {
    type: String
  },
  detalles: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

logFelSchema.index({ facturaId: 1, timestamp: -1 });
logFelSchema.index({ estado: 1, timestamp: -1 });

module.exports = mongoose.model('LogFEL', logFelSchema);
