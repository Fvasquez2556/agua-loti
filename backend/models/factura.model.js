// backend/models/factura.model.js
const mongoose = require('mongoose');

const facturaSchema = new mongoose.Schema({
  // Información básica de la factura
  numeroFactura: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Cliente asociado
  clienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true,
    index: true
  },
  
  // Fechas importantes
  fechaEmision: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  fechaVencimiento: {
    type: Date,
    required: true
  },
  
  // Período de facturación
  periodoInicio: {
    type: Date,
    required: true
  },
  
  periodoFin: {
    type: Date,
    required: true
  },
  
  // Datos de consumo
  lecturaAnterior: {
    type: Number,
    required: true,
    min: 0
  },
  
  lecturaActual: {
    type: Number,
    required: true,
    min: 0
  },
  
  consumoLitros: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Cálculos de tarifa según especificaciones técnicas
  tarifaBase: {
    type: Number,
    required: true,
    default: 50.00
  },
  
  excedenteLitros: {
    type: Number,
    default: 0,
    min: 0
  },
  
  costoExcedente: {
    type: Number,
    default: 0,
    min: 0
  },
  
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Monto final con redondeo aplicado
  montoTotal: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Estado de la factura
  estado: {
    type: String,
    enum: ['pendiente', 'pagada', 'vencida', 'anulada'],
    default: 'pendiente',
    index: true
  },
  
  // Información de pago
  fechaPago: {
    type: Date,
    default: null
  },
  
  metodoPago: {
    type: String,
    enum: ['efectivo', 'deposito', 'transferencia', 'tarjeta'],
    default: null
  },
  
  referenciaPago: {
    type: String,
    default: null
  },
  
  // Mora y recargos
  diasMora: {
    type: Number,
    default: 0,
    min: 0
  },
  
  montoMora: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Información de reconexión (si aplica)
  requiereReconexion: {
    type: Boolean,
    default: false
  },
  
  costoReconexion: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Observaciones y notas
  observaciones: {
    type: String,
    maxlength: 500
  },
  
  // Información técnica
  tipoFactura: {
    type: String,
    enum: ['interna', 'fel'],
    default: 'interna'
  },
  
  // Para futuras implementaciones FEL
  certificadoFEL: {
    type: Boolean,
    default: false
  },
  
  codigoAutorizacionSAT: {
    type: String,
    default: null
  },
  
  fechaCertificacionFEL: {
    type: Date,
    default: null
  },
  
  // Metadatos
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  actualizadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
  
}, {
  timestamps: true, // createdAt, updatedAt automáticos
  
  // Índices compuestos para optimizar consultas
  index: [
    { clienteId: 1, fechaEmision: -1 },
    { estado: 1, fechaVencimiento: 1 },
    { numeroFactura: 1 },
    { periodoInicio: 1, periodoFin: 1 }
  ]
});

// Middleware pre-save para validaciones adicionales
facturaSchema.pre('save', function(next) {
  // Validar que la lectura actual sea mayor o igual a la anterior
  if (this.lecturaActual < this.lecturaAnterior) {
    return next(new Error('La lectura actual no puede ser menor a la anterior'));
  }
  
  // Calcular consumo automáticamente
  this.consumoLitros = this.lecturaActual - this.lecturaAnterior;
  
  // Validar fechas del período
  if (this.periodoFin <= this.periodoInicio) {
    return next(new Error('La fecha de fin del período debe ser posterior a la fecha de inicio'));
  }
  
  // Calcular fecha de vencimiento (30 días por defecto)
  if (!this.fechaVencimiento) {
    this.fechaVencimiento = new Date(this.fechaEmision);
    this.fechaVencimiento.setDate(this.fechaVencimiento.getDate() + 30);
  }
  
  next();
});

// Métodos de instancia
facturaSchema.methods.calcularMora = function() {
  if (this.estado === 'pagada' || this.estado === 'anulada') {
    return { diasMora: 0, montoMora: 0 };
  }
  
  const hoy = new Date();
  const fechaVencimiento = new Date(this.fechaVencimiento);
  
  if (hoy <= fechaVencimiento) {
    return { diasMora: 0, montoMora: 0 };
  }
  
  const diasMora = Math.floor((hoy - fechaVencimiento) / (1000 * 60 * 60 * 24));
  const mesesMora = Math.floor(diasMora / 30);
  const MORA_MENSUAL = 0.07; // 7% mensual
  
  const montoMora = this.montoTotal * (MORA_MENSUAL * mesesMora);
  
  return { diasMora, montoMora: Math.round(montoMora * 100) / 100 };
};

facturaSchema.methods.marcarComoPagada = function(metodoPago, referencia = null) {
  this.estado = 'pagada';
  this.fechaPago = new Date();
  this.metodoPago = metodoPago;
  if (referencia) {
    this.referenciaPago = referencia;
  }
  return this.save();
};

facturaSchema.methods.anular = function(motivo = '') {
  this.estado = 'anulada';
  if (motivo) {
    this.observaciones = (this.observaciones || '') + '\nAnulada: ' + motivo;
  }
  return this.save();
};

// Métodos estáticos
facturaSchema.statics.generarNumeroFactura = async function() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  // Buscar facturas del mes actual
  const startOfMonth = new Date(year, now.getMonth(), 1);
  const endOfMonth = new Date(year, now.getMonth() + 1, 0);
  
  const count = await this.countDocuments({
    fechaEmision: {
      $gte: startOfMonth,
      $lte: endOfMonth
    }
  });
  
  const sequential = (count + 1).toString().padStart(4, '0');
  return `FAC-${year}${month}-${sequential}`;
};

facturaSchema.statics.obtenerFacturasPendientes = function(clienteId = null) {
  const filtros = { estado: 'pendiente' };
  if (clienteId) {
    filtros.clienteId = clienteId;
  }
  
  return this.find(filtros)
    .populate('clienteId', 'nombres apellidos contador proyecto')
    .sort({ fechaVencimiento: 1 });
};

facturaSchema.statics.obtenerFacturasVencidas = function() {
  return this.find({
    estado: 'pendiente',
    fechaVencimiento: { $lt: new Date() }
  })
    .populate('clienteId', 'nombres apellidos contador proyecto whatsapp')
    .sort({ fechaVencimiento: 1 });
};

// Índices adicionales para optimización
facturaSchema.index({ fechaEmision: -1 });
facturaSchema.index({ 'clienteId': 1, 'estado': 1 });
facturaSchema.index({ 'estado': 1, 'fechaVencimiento': 1 });

module.exports = mongoose.model('Factura', facturaSchema);
