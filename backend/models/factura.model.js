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
  },

  // ===== AGREGAR ESTOS CAMPOS AL SCHEMA EXISTENTE =====

  // Información de Factura Electrónica (FEL)
  fel: {
    certificada: { type: Boolean, default: false },
    uuid: { type: String, default: null },
    numeroAutorizacion: { type: String, default: null },
    serie: { type: String, default: null },
    numero: { type: String, default: null },
    fechaCertificacion: { type: Date, default: null },
    urlVerificacion: { type: String, default: null },
    intentosFallidos: { type: Number, default: 0 },
    ultimoError: { type: String, default: null },
    tipoDocumento: {
      type: String,
      enum: ['FACT', 'NCRE', 'NDEB', 'NABN'],
      default: 'FACT'
    }
  },

  // Referencia a documento original (para NCRE y NDEB)
  documentoReferencia: {
    tipo: { type: String, enum: ['factura', 'nota'], default: null },
    uuid: { type: String, default: null },
    numeroDocumento: { type: String, default: null }
  },

  // Información de mora detallada
  detallesMora: {
    diasVencidos: { type: Number, default: 0 },
    mesesCompletos: { type: Number, default: 0 },
    porcentajeMora: { type: Number, default: 0 },
    calculadoEn: { type: Date, default: null }
  },

  // ===== CAMPOS PARA FACTURAS CONSOLIDADAS =====

  // Tipo de factura
  tipoFactura: {
    type: String,
    enum: ['normal', 'reconexion'],
    default: 'normal'
  },

  // Array de facturas consolidadas (solo para tipo 'reconexion')
  facturasConsolidadas: [{
    facturaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Factura'
    },
    numeroFactura: String,
    mesNombre: String,        // "Enero", "Febrero", etc.
    periodo: {
      inicio: Date,
      fin: Date
    },
    montoOriginal: Number,
    montoMora: Number,
    diasMora: Number,
    subtotal: Number          // Original + Mora
  }],

  // Monto base (solo para facturas consolidadas)
  montoBase: {
    type: Number,
    default: 0
  },

  // Estado de consolidación (para facturas originales)
  estadoConsolidacion: {
    type: String,
    enum: ['no_consolidada', 'consolidada'],
    default: 'no_consolidada'
  },

  // Referencia a la factura consolidada que la incluye
  facturaConsolidadaRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Factura',
    default: null
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
  const Contador = require('./contador.model');
  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const contadorId = `FAC-${year}${month}`;
  
  try {
    // Usar findOneAndUpdate con upsert para incrementar de forma atómica
    const contador = await Contador.findOneAndUpdate(
      { _id: contadorId },
      { $inc: { secuencial: 1 } },
      { 
        new: true, 
        upsert: true,
        setDefaultsOnInsert: true
      }
    );
    
    const sequential = contador.secuencial.toString().padStart(4, '0');
    const numeroFactura = `${contadorId}-${sequential}`;
    
    // Verificar que no exista una factura con este número (seguridad adicional)
    const existeFactura = await this.findOne({ numeroFactura });
    
    if (existeFactura) {
      // Si por alguna razón existe, incrementar el contador una vez más
      console.warn(`Número de factura ${numeroFactura} ya existe, generando nuevo número...`);
      const nuevoContador = await Contador.findOneAndUpdate(
        { _id: contadorId },
        { $inc: { secuencial: 1 } },
        { new: true }
      );
      
      const nuevoSequential = nuevoContador.secuencial.toString().padStart(4, '0');
      return `${contadorId}-${nuevoSequential}`;
    }
    
    return numeroFactura;
    
  } catch (error) {
    console.error('Error al generar número de factura:', error);
    // Fallback: usar timestamp si falla el contador
    const timestamp = Date.now().toString().slice(-4);
    const fallbackSequential = timestamp.padStart(4, '0');
    return `${contadorId}-${fallbackSequential}`;
  }
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

// Método estático para generar número de factura de reconexión
facturaSchema.statics.generarNumeroFacturaReconexion = async function() {
  const Contador = require('./contador.model');

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const contadorId = `FAC-RECON-${year}${month}`;

  try {
    const contador = await Contador.findOneAndUpdate(
      { _id: contadorId },
      { $inc: { secuencial: 1 } },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    const sequential = contador.secuencial.toString().padStart(4, '0');
    return `${contadorId}-${sequential}`;

  } catch (error) {
    console.error('Error al generar número de factura de reconexión:', error);
    const timestamp = Date.now().toString().slice(-4);
    const fallbackSequential = timestamp.padStart(4, '0');
    return `${contadorId}-${fallbackSequential}`;
  }
};

// Método de instancia para obtener nombre del mes
facturaSchema.methods.obtenerNombreMes = function() {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const mes = this.periodoInicio.getMonth();
  return meses[mes];
};

// Índices adicionales para optimización
facturaSchema.index({ fechaEmision: -1 });
facturaSchema.index({ 'clienteId': 1, 'estado': 1 });
facturaSchema.index({ 'estado': 1, 'fechaVencimiento': 1 });
facturaSchema.index({ 'tipoFactura': 1 });
facturaSchema.index({ 'estadoConsolidacion': 1 });

module.exports = mongoose.model('Factura', facturaSchema);
