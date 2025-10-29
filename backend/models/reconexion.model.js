const mongoose = require('mongoose');

const reconexionSchema = new mongoose.Schema({
  clienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  tipoOpcion: {
    type: String,
    enum: ['parcial', 'total', 'emergencia'],
    required: true
  },
  montoTotal: {
    type: Number,
    required: true,
    min: 0
  },
  montoDeuda: {
    type: Number,
    required: true,
    min: 0
  },
  costoReconexion: {
    type: Number,
    required: true,
    default: 125.00
  },
  saldoPendiente: {
    type: Number,
    default: 0,
    min: 0
  },
  facturasPagadas: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Factura'
  }],

  // Referencia a la factura consolidada generada
  facturaConsolidadaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Factura',
    default: null
  },

  // Referencias a las facturas originales que se consolidaron
  facturasOriginales: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Factura'
  }],

  metodoPago: {
    type: String,
    required: true
  },
  referencia: String,
  procesadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fechaReconexion: {
    type: Date,
    default: Date.now
  },
  observaciones: String,

  // Campos para reconexión de emergencia
  esEmergencia: {
    type: Boolean,
    default: false
  },
  justificacion: String,
  autorizadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

reconexionSchema.index({ clienteId: 1, fechaReconexion: -1 });

module.exports = mongoose.model('Reconexion', reconexionSchema);
