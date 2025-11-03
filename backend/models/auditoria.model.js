// backend/models/auditoria.model.js
const mongoose = require('mongoose');

const auditoriaSchema = new mongoose.Schema({
  // Tipo de acción realizada
  accion: {
    type: String,
    required: true,
    enum: ['eliminacion_facturas', 'modificacion_fecha', 'creacion_personalizada', 'otro'],
    index: true
  },

  // Usuario que realizó la acción
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Puede ser null si no hay usuario autenticado
  },

  // Cliente afectado (si aplica)
  clienteAfectado: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: false
  },

  // Detalles específicos de la acción
  detalles: {
    // Para eliminación de facturas
    facturasEliminadas: [{
      numeroFactura: String,
      _id: mongoose.Schema.Types.ObjectId,
      montoTotal: Number
    }],

    cantidadEliminada: {
      type: Number,
      default: 0
    },

    // Para modificación de fechas
    facturaModificada: {
      numeroFactura: String,
      _id: mongoose.Schema.Types.ObjectId,
      fechaAnterior: Date,
      fechaNueva: Date
    },

    // Motivo general
    motivo: String,

    // Información adicional
    informacionAdicional: mongoose.Schema.Types.Mixed
  },

  // Metadatos de la operación
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  ipAddress: {
    type: String,
    required: false
  },

  userAgent: {
    type: String,
    required: false
  },

  // Estado de la operación
  exitosa: {
    type: Boolean,
    default: true
  },

  mensajeError: {
    type: String,
    required: false
  }
}, {
  timestamps: true,
  collection: 'auditorias'
});

// Índices para mejorar el rendimiento de consultas
auditoriaSchema.index({ timestamp: -1 });
auditoriaSchema.index({ accion: 1, timestamp: -1 });
auditoriaSchema.index({ usuario: 1, timestamp: -1 });
auditoriaSchema.index({ clienteAfectado: 1, timestamp: -1 });

// Método estático para registrar una eliminación de facturas
auditoriaSchema.statics.registrarEliminacion = async function(data) {
  const {
    usuario,
    clienteAfectado,
    facturasEliminadas,
    motivo,
    ipAddress,
    userAgent
  } = data;

  const registro = new this({
    accion: 'eliminacion_facturas',
    usuario,
    clienteAfectado,
    detalles: {
      facturasEliminadas: facturasEliminadas.map(factura => ({
        numeroFactura: factura.numeroFactura,
        _id: factura._id,
        montoTotal: factura.montoTotal
      })),
      cantidadEliminada: facturasEliminadas.length,
      motivo
    },
    ipAddress,
    userAgent,
    exitosa: true
  });

  return await registro.save();
};

// Método estático para registrar una modificación de fecha
auditoriaSchema.statics.registrarModificacionFecha = async function(data) {
  const {
    usuario,
    facturaModificada,
    fechaAnterior,
    fechaNueva,
    motivo,
    ipAddress,
    userAgent
  } = data;

  const registro = new this({
    accion: 'modificacion_fecha',
    usuario,
    clienteAfectado: facturaModificada.clienteId,
    detalles: {
      facturaModificada: {
        numeroFactura: facturaModificada.numeroFactura,
        _id: facturaModificada._id,
        fechaAnterior,
        fechaNueva
      },
      motivo
    },
    ipAddress,
    userAgent,
    exitosa: true
  });

  return await registro.save();
};

// Método estático para obtener auditoría por cliente
auditoriaSchema.statics.obtenerPorCliente = async function(clienteId, limit = 50) {
  return await this.find({ clienteAfectado: clienteId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('usuario', 'username role')
    .populate('clienteAfectado', 'nombres apellidos dpi');
};

// Método estático para obtener auditoría reciente
auditoriaSchema.statics.obtenerReciente = async function(limit = 100) {
  return await this.find()
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('usuario', 'username role')
    .populate('clienteAfectado', 'nombres apellidos dpi');
};

const Auditoria = mongoose.model('Auditoria', auditoriaSchema);

module.exports = Auditoria;
