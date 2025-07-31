// backend/models/lectura.model.js
const mongoose = require('mongoose');

const lecturaSchema = new mongoose.Schema({
  // Cliente asociado
  clienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true,
    index: true
  },
  
  // Información de la lectura
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
  
  // Fechas
  fechaLectura: {
    type: Date,
    required: true
  },
  
  periodoInicio: {
    type: Date,
    required: true
  },
  
  periodoFin: {
    type: Date,
    required: true
  },
  
  // Estado de la lectura
  estado: {
    type: String,
    enum: ['pendiente', 'procesada', 'facturada', 'corregida'],
    default: 'pendiente',
    index: true
  },
  
  // Factura asociada (cuando se genera)
  facturaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Factura',
    default: null
  },
  
  // Información del contador
  numeroContador: {
    type: String,
    required: true
  },
  
  // Observaciones del lector
  observaciones: {
    type: String,
    maxlength: 300
  },
  
  // Anomalías detectadas
  anomalias: [{
    tipo: {
      type: String,
      enum: ['fuga', 'contador_dañado', 'lectura_estimada', 'acceso_denegado', 'otro']
    },
    descripcion: String,
    fechaDeteccion: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Información técnica
  tipoLectura: {
    type: String,
    enum: ['normal', 'estimada', 'correccion'],
    default: 'normal'
  },
  
  // Para lecturas estimadas
  esEstimada: {
    type: Boolean,
    default: false
  },
  
  motivoEstimacion: {
    type: String,
    maxlength: 200
  },
  
  // Metadatos
  tomadaPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  procesadaPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Geolocalización (para futuras implementaciones móviles)
  ubicacion: {
    latitud: Number,
    longitud: Number
  },
  
  // Foto del contador (para futuras implementaciones)
  fotoContador: {
    type: String, // URL o path de la imagen
    default: null
  }
  
}, {
  timestamps: true, // createdAt, updatedAt automáticos
  
  // Índices compuestos
  index: [
    { clienteId: 1, fechaLectura: -1 },
    { estado: 1, fechaLectura: -1 },
    { numeroContador: 1, fechaLectura: -1 }
  ]
});

// Middleware pre-save para validaciones
lecturaSchema.pre('save', function(next) {
  // Validar que la lectura actual sea mayor o igual a la anterior
  if (this.lecturaActual < this.lecturaAnterior && !this.esEstimada) {
    return next(new Error('La lectura actual no puede ser menor a la anterior (excepto en lecturas estimadas)'));
  }
  
  // Calcular consumo automáticamente
  this.consumoLitros = this.lecturaActual - this.lecturaAnterior;
  
  // Validar fechas del período
  if (this.periodoFin <= this.periodoInicio) {
    return next(new Error('La fecha de fin del período debe ser posterior a la fecha de inicio'));
  }
  
  // Si es estimada, requerir motivo
  if (this.esEstimada && !this.motivoEstimacion) {
    return next(new Error('Las lecturas estimadas requieren especificar el motivo'));
  }
  
  next();
});

// Middleware post-save para actualizar el estado del cliente
lecturaSchema.post('save', async function(doc) {
  try {
    const Cliente = mongoose.model('Cliente');
    await Cliente.findByIdAndUpdate(doc.clienteId, {
      ultimaLectura: doc.lecturaActual,
      fechaUltimaLectura: doc.fechaLectura,
      $inc: { totalLecturas: 1 }
    });
  } catch (error) {
    console.error('Error actualizando cliente después de lectura:', error);
  }
});

// Métodos de instancia
lecturaSchema.methods.marcarComoProcesada = function(usuarioId) {
  this.estado = 'procesada';
  this.procesadaPor = usuarioId;
  return this.save();
};

lecturaSchema.methods.asociarFactura = function(facturaId) {
  this.facturaId = facturaId;
  this.estado = 'facturada';
  return this.save();
};

lecturaSchema.methods.agregarAnomalia = function(tipo, descripcion) {
  this.anomalias.push({
    tipo,
    descripcion,
    fechaDeteccion: new Date()
  });
  return this.save();
};

lecturaSchema.methods.corregirLectura = function(nuevaLecturaActual, motivo, usuarioId) {
  // Guardar la lectura original en observaciones
  const lecturaOriginal = this.lecturaActual;
  this.observaciones = (this.observaciones || '') + 
    `\nCorrección: Lectura original ${lecturaOriginal}, corregida a ${nuevaLecturaActual}. Motivo: ${motivo}`;
  
  this.lecturaActual = nuevaLecturaActual;
  this.consumoLitros = nuevaLecturaActual - this.lecturaAnterior;
  this.estado = 'corregida';
  this.procesadaPor = usuarioId;
  this.tipoLectura = 'correccion';
  
  return this.save();
};

// Métodos estáticos
lecturaSchema.statics.obtenerUltimaLectura = function(clienteId) {
  return this.findOne({ 
    clienteId,
    estado: { $in: ['procesada', 'facturada'] }
  })
    .sort({ fechaLectura: -1 });
};

lecturaSchema.statics.obtenerLecturasPendientes = function() {
  return this.find({ estado: 'pendiente' })
    .populate('clienteId', 'nombres apellidos contador proyecto')
    .populate('tomadaPor', 'nombres apellidos')
    .sort({ fechaLectura: -1 });
};

lecturaSchema.statics.obtenerLecturasPorPeriodo = function(fechaInicio, fechaFin, clienteId = null) {
  const filtros = {
    fechaLectura: {
      $gte: new Date(fechaInicio),
      $lte: new Date(fechaFin)
    }
  };
  
  if (clienteId) {
    filtros.clienteId = clienteId;
  }
  
  return this.find(filtros)
    .populate('clienteId', 'nombres apellidos contador proyecto')
    .populate('tomadaPor', 'nombres apellidos')
    .sort({ fechaLectura: -1 });
};

lecturaSchema.statics.obtenerConsumoPromedio = async function(clienteId, meses = 6) {
  const fechaLimite = new Date();
  fechaLimite.setMonth(fechaLimite.getMonth() - meses);
  
  const resultado = await this.aggregate([
    {
      $match: {
        clienteId: new mongoose.Types.ObjectId(clienteId),
        fechaLectura: { $gte: fechaLimite },
        estado: { $in: ['procesada', 'facturada'] },
        tipoLectura: { $ne: 'estimada' }
      }
    },
    {
      $group: {
        _id: null,
        consumoPromedio: { $avg: '$consumoLitros' },
        consumoMinimo: { $min: '$consumoLitros' },
        consumoMaximo: { $max: '$consumoLitros' },
        totalLecturas: { $sum: 1 }
      }
    }
  ]);
  
  return resultado[0] || {
    consumoPromedio: 0,
    consumoMinimo: 0,
    consumoMaximo: 0,
    totalLecturas: 0
  };
};

lecturaSchema.statics.detectarAnomalias = async function(clienteId, nuevaLectura) {
  const anomalias = [];
  
  // Obtener estadísticas del cliente
  const stats = await this.obtenerConsumoPromedio(clienteId);
  
  if (stats.totalLecturas > 0) {
    const consumoPromedio = stats.consumoPromedio;
    const variacionMaxima = consumoPromedio * 1.5; // 150% del promedio
    
    // Detectar consumo excesivo
    if (nuevaLectura > variacionMaxima) {
      anomalias.push({
        tipo: 'consumo_excesivo',
        descripcion: `Consumo ${nuevaLectura}L supera significativamente el promedio de ${Math.round(consumoPromedio)}L`
      });
    }
    
    // Detectar consumo muy bajo
    if (nuevaLectura < (consumoPromedio * 0.1) && nuevaLectura > 0) {
      anomalias.push({
        tipo: 'consumo_minimo',
        descripcion: `Consumo ${nuevaLectura}L es significativamente menor al promedio`
      });
    }
  }
  
  // Detectar consumo cero (posible fuga o contador dañado)
  if (nuevaLectura === 0) {
    anomalias.push({
      tipo: 'consumo_cero',
      descripcion: 'Consumo registrado en cero, verificar contador'
    });
  }
  
  return anomalias;
};

// Índices adicionales
lecturaSchema.index({ fechaLectura: -1 });
lecturaSchema.index({ 'clienteId': 1, 'estado': 1 });
lecturaSchema.index({ 'numeroContador': 1 });

module.exports = mongoose.model('Lectura', lecturaSchema);
