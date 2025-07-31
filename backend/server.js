// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") }); // ✅ Ruta absoluta

// Rutas
const authRoutes = require("./routes/auth.routes");
const clienteRoutes = require("./routes/cliente.routes");
const facturaRoutes = require("./routes/factura.routes"); // ✅ Nueva ruta para facturas
const lecturaRoutes = require("./routes/lectura.routes"); // ✅ Nueva ruta para lecturas

// Inicializar app
const app = express();

// Middlewares
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500'], // Permitir frontend
  credentials: true
}));
app.use(express.json()); // Para leer JSON desde el body
app.use(express.urlencoded({ extended: true })); // Para forms

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch((err) => console.error("❌ Error conectando a MongoDB:", err));

// Middleware para logging de requests (desarrollo)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
}

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/facturas", facturaRoutes); // ✅ Nueva ruta para facturas
app.use("/api/lecturas", lecturaRoutes); // ✅ Nueva ruta para lecturas

// Ruta de prueba
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

// Manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Puerto
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
  console.log(`📊 API de clientes disponible en: http://localhost:${PORT}/api/clientes`);
});

// Exportar app para pruebas
module.exports = app;