// backend/models/pago.model.js
const mongoose = require('mongoose');

const pagoSchema = new mongoose.Schema({
  // Información básica del pago
  numeroPago: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Factura asociada al pago
  facturaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Factura',
    required: true,
    index: true
  },
  
  // Cliente asociado (referencia directa para consultas optimizadas)
  clienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true,
    index: true
  },
  
  // Fechas importantes
  fechaPago: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  fechaRegistro: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Montos del pago
  montoOriginal: {
    type: Number,
    required: true,
    min: 0
  },
  
  montoMora: {
    type: Number,
    default: 0,
    min: 0
  },
  
  montoReconexion: {
    type: Number,
    default: 0,
    min: 0
  },
  
  montoPagado: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Información del método de pago
  metodoPago: {
    type: String,
    required: true,
    enum: ['efectivo', 'transferencia', 'deposito', 'cheque'],
    index: true
  },
  
  // Referencia del pago (número de comprobante, cheque, etc.)
  referenciaPago: {
    type: String,
    default: null
  },
  
  // Información específica para cheques
  bancoCheque: {
    type: String,
    default: null
  },
  
  numeroCheque: {
    type: String,
    default: null
  },
  
  // Estado del pago
  estado: {
    type: String,
    enum: ['procesado', 'cancelado', 'pendiente_confirmacion'],
    default: 'procesado',
    index: true
  },
  
  // Información de Facturación Electrónica en Línea (FEL)
  fel: {
    generado: {
      type: Boolean,
      default: false
    },
    uuid: {
      type: String,
      default: null
    },
    serie: {
      type: String,
      default: null
    },
    numero: {
      type: String,
      default: null
    },
    fechaCertificacion: {
      type: Date,
      default: null
    },
    codigoAutorizacion: {
      type: String,
      default: null
    },
    xmlResponse: {
      type: String,
      default: null
    },
    pdfUrl: {
      type: String,
      default: null
    },
    error: {
      type: String,
      default: null
    }
  },
  
  // Observaciones y notas
  observaciones: {
    type: String,
    maxlength: 1000
  },
  
  // Información de auditoría
  registradoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  modificadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Información de la factura en el momento del pago (para histórico)
  facturaSnapshot: {
    numeroFactura: String,
    fechaEmision: Date,
    fechaVencimiento: Date,
    diasMora: Number,
    periodoInicio: Date,
    periodoFin: Date
  }
  
}, {
  timestamps: true,
  
  // Índices compuestos para optimizar consultas
  index: [
    { facturaId: 1, fechaPago: -1 },
    { clienteId: 1, fechaPago: -1 },
    { metodoPago: 1, fechaPago: -1 },
    { estado: 1, fechaPago: -1 },
    { 'fel.generado': 1, fechaPago: -1 }
  ]
});

// Middleware pre-save para validaciones
pagoSchema.pre('save', function(next) {
  // Validar que el monto pagado sea positivo
  if (this.montoPagado <= 0) {
    return next(new Error('El monto pagado debe ser mayor a cero'));
  }
  
  // Validar que el monto pagado sea igual a la suma de los componentes
  const montoCalculado = this.montoOriginal + this.montoMora + this.montoReconexion;
  if (Math.abs(this.montoPagado - montoCalculado) > 0.01) {
    return next(new Error('El monto pagado no coincide con la suma de los componentes'));
  }
  
  // Validar información específica de cheques
  if (this.metodoPago === 'cheque') {
    if (!this.numeroCheque) {
      return next(new Error('El número de cheque es requerido para pagos con cheque'));
    }
    if (!this.bancoCheque) {
      return next(new Error('El banco del cheque es requerido para pagos con cheque'));
    }
  }
  
  // Validar que la fecha de pago no sea futura
  if (this.fechaPago > new Date()) {
    return next(new Error('La fecha de pago no puede ser futura'));
  }
  
  next();
});

// Métodos de instancia
pagoSchema.methods.generarDTE = async function() {
  // TODO: Implementar integración con FEL/SAT
  // Por ahora, simulamos la generación del DTE
  try {
    // Aquí iría la lógica de integración con el proveedor de FEL
    this.fel.generado = true;
    this.fel.serie = 'A';
    this.fel.numero = await this.constructor.generarNumeroDTE();
    this.fel.fechaCertificacion = new Date();
    this.fel.uuid = require('crypto').randomUUID();
    this.fel.codigoAutorizacion = `SAT-${Date.now()}`;
    
    await this.save();
    
    return {
      success: true,
      dte: {
        serie: this.fel.serie,
        numero: this.fel.numero,
        uuid: this.fel.uuid,
        fechaCertificacion: this.fel.fechaCertificacion,
        codigoAutorizacion: this.fel.codigoAutorizacion
      }
    };
  } catch (error) {
    this.fel.error = error.message;
    await this.save();
    throw error;
  }
};

pagoSchema.methods.cancelar = function(motivo = '') {
  this.estado = 'cancelado';
  if (motivo) {
    this.observaciones = (this.observaciones || '') + '\nCancelado: ' + motivo;
  }
  return this.save();
};

pagoSchema.methods.obtenerResumen = function() {
  return {
    numeroPago: this.numeroPago,
    fechaPago: this.fechaPago,
    montoPagado: this.montoPagado,
    metodoPago: this.metodoPago,
    referenciaPago: this.referenciaPago,
    estado: this.estado,
    fel: this.fel,
    factura: this.facturaSnapshot
  };
};

// Métodos estáticos
pagoSchema.statics.generarNumeroPago = async function() {
  const Contador = require('./contador.model');
  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const contadorId = `PAG-${year}${month}`;
  
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
    const numeroPago = `${contadorId}-${sequential}`;
    
    // Verificar que no exista un pago con este número
    const existePago = await this.findOne({ numeroPago });
    
    if (existePago) {
      console.warn(`Número de pago ${numeroPago} ya existe, generando nuevo número...`);
      const nuevoContador = await Contador.findOneAndUpdate(
        { _id: contadorId },
        { $inc: { secuencial: 1 } },
        { new: true }
      );
      
      const nuevoSequential = nuevoContador.secuencial.toString().padStart(4, '0');
      return `${contadorId}-${nuevoSequential}`;
    }
    
    return numeroPago;
    
  } catch (error) {
    console.error('Error al generar número de pago:', error);
    const timestamp = Date.now().toString().slice(-4);
    const fallbackSequential = timestamp.padStart(4, '0');
    return `${contadorId}-${fallbackSequential}`;
  }
};

pagoSchema.statics.generarNumeroDTE = async function() {
  const Contador = require('./contador.model');
  
  const now = new Date();
  const year = now.getFullYear();
  const contadorId = `DTE-${year}`;
  
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
    
    return contador.secuencial.toString().padStart(8, '0');
    
  } catch (error) {
    console.error('Error al generar número de DTE:', error);
    return Date.now().toString().slice(-8);
  }
};

pagoSchema.statics.obtenerPagosPorCliente = function(clienteId, opciones = {}) {
  const { fechaInicio, fechaFin, metodoPago, limit = 50 } = opciones;
  
  const filtros = { clienteId };
  
  if (fechaInicio || fechaFin) {
    filtros.fechaPago = {};
    if (fechaInicio) filtros.fechaPago.$gte = new Date(fechaInicio);
    if (fechaFin) filtros.fechaPago.$lte = new Date(fechaFin);
  }
  
  if (metodoPago) {
    filtros.metodoPago = metodoPago;
  }
  
  return this.find(filtros)
    .populate('facturaId', 'numeroFactura fechaEmision montoTotal')
    .populate('clienteId', 'nombres apellidos contador')
    .populate('registradoPor', 'nombres apellidos')
    .sort({ fechaPago: -1 })
    .limit(limit);
};

pagoSchema.statics.obtenerResumenPagos = async function(filtros = {}) {
  const pipeline = [
    { $match: filtros },
    {
      $group: {
        _id: null,
        totalPagos: { $sum: 1 },
        montoTotal: { $sum: '$montoPagado' },
        montoOriginalTotal: { $sum: '$montoOriginal' },
        montoMoraTotal: { $sum: '$montoMora' },
        pagosPorMetodo: {
          $push: {
            metodo: '$metodoPago',
            monto: '$montoPagado'
          }
        }
      }
    }
  ];
  
  const resultado = await this.aggregate(pipeline);
  
  if (resultado.length === 0) {
    return {
      totalPagos: 0,
      montoTotal: 0,
      montoOriginalTotal: 0,
      montoMoraTotal: 0,
      pagosPorMetodo: {}
    };
  }
  
  const resumen = resultado[0];
  
  // Procesar pagos por método
  const pagosPorMetodo = {};
  resumen.pagosPorMetodo.forEach(pago => {
    if (!pagosPorMetodo[pago.metodo]) {
      pagosPorMetodo[pago.metodo] = { cantidad: 0, monto: 0 };
    }
    pagosPorMetodo[pago.metodo].cantidad++;
    pagosPorMetodo[pago.metodo].monto += pago.monto;
  });
  
  return {
    totalPagos: resumen.totalPagos,
    montoTotal: resumen.montoTotal,
    montoOriginalTotal: resumen.montoOriginalTotal,
    montoMoraTotal: resumen.montoMoraTotal,
    pagosPorMetodo
  };
};

// Índices adicionales para optimización
pagoSchema.index({ fechaPago: -1 });
pagoSchema.index({ 'fel.generado': 1, 'fel.fechaCertificacion': -1 });

module.exports = mongoose.model('Pago', pagoSchema);
