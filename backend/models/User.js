// backend/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    unique: true, 
    required: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true,
    select: false // Por defecto no incluir en queries
  },
  role: { 
    type: String, 
    enum: ["admin", "empleado"], 
    default: "empleado" 
  },
  estado: {
    type: String,
    enum: ["activo", "inactivo"],
    default: "activo"
  }
}, {
  timestamps: true // Agregar createdAt y updatedAt automáticamente
});

module.exports = mongoose.model("User", userSchema);
