// backend/models/cliente.model.js
const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
  nombres: {
    type: String,
    required: [true, 'Los nombres son obligatorios'],
    trim: true,
    minlength: [2, 'Los nombres deben tener al menos 2 caracteres'],
    maxlength: [50, 'Los nombres no pueden exceder 50 caracteres']
  },
  apellidos: {
    type: String,
    required: [true, 'Los apellidos son obligatorios'],
    trim: true,
    minlength: [2, 'Los apellidos deben tener al menos 2 caracteres'],
    maxlength: [50, 'Los apellidos no pueden exceder 50 caracteres']
  },
  dpi: {
    type: String,
    required: [true, 'El DPI es obligatorio'],
    unique: true,
    validate: {
      validator: function(v) {
        return /^\d{13}$/.test(v);
      },
      message: 'El DPI debe tener exactamente 13 dígitos'
    }
  },
  contador: {
    type: String,
    required: [true, 'El número de contador es obligatorio'],
    unique: true,
    trim: true,
    uppercase: true,
    minlength: [3, 'El contador debe tener al menos 3 caracteres'],
    maxlength: [20, 'El contador no puede exceder 20 caracteres']
  },
  lote: {
    type: String,
    required: [true, 'El número de lote es obligatorio'],
    trim: true,
    uppercase: true,
    minlength: [2, 'El lote debe tener al menos 2 caracteres'],
    maxlength: [20, 'El lote no puede exceder 20 caracteres']
  },
  proyecto: {
    type: String,
    required: [true, 'El proyecto es obligatorio'],
    enum: {
      values: ['san-miguel', 'santa-clara-1', 'santa-clara-2', 'cabanas-1', 'cabanas-2'],
      message: 'El proyecto seleccionado no es válido'
    }
  },
  // Campos adicionales que vi en la imagen del formulario
  whatsapp: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^\d{8}$/.test(v); // Opcional, pero si se proporciona debe ser 8 dígitos
      },
      message: 'El WhatsApp debe tener 8 dígitos'
    }
  },
  correoElectronico: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v); // Opcional
      },
      message: 'El formato del correo electrónico no es válido'
    }
  },
  estado: {
    type: String,
    enum: ['activo', 'inactivo', 'suspendido'],
    default: 'activo'
  },
  fechaRegistro: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Agrega createdAt y updatedAt automáticamente
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para nombre completo
clienteSchema.virtual('nombreCompleto').get(function() {
  return `${this.nombres} ${this.apellidos}`;
});

// Middleware para actualizar fechaActualizacion antes de guardar
clienteSchema.pre('save', function(next) {
  if (!this.isNew) {
    this.fechaActualizacion = new Date();
  }
  next();
});

// Índices para mejorar rendimiento en búsquedas
// Nota: dpi y contador ya tienen índices únicos automáticos por unique: true
clienteSchema.index({ proyecto: 1 });
clienteSchema.index({ nombres: 'text', apellidos: 'text' });

module.exports = mongoose.model('Cliente', clienteSchema);