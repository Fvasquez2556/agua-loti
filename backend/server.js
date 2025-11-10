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
const pagoRoutes = require("./routes/pago.routes"); // ✅ Nueva ruta para pagos
const moraRoutes = require('./routes/mora.routes');
const reconexionRoutes = require('./routes/reconexion.routes');
const facturaAdminRoutes = require('./routes/factura.admin.routes');
const notaRoutes = require('./routes/nota.routes'); // ✅ Rutas para notas de crédito y débito

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
  .then(() => {
    console.log("✅ Conectado a MongoDB");

    // ========================================
    // INICIALIZAR SERVICIOS DE NOTIFICACIÓN
    // ========================================
    console.log('\n📱 Inicializando servicios de notificación...');

    const notificacionesService = require('./services/notificaciones.service');
    const estadoNotificaciones = notificacionesService.verificarEstado();

    console.log('\n📊 Estado de servicios de notificación:');
    console.log('  📧 Email:');
    console.log(`    - Habilitado: ${estadoNotificaciones.email.habilitado ? '✅' : '❌'}`);
    if (!estadoNotificaciones.email.habilitado) {
      console.log('    ⚠️  Configura EMAIL_USER y EMAIL_PASSWORD en .env');
    }

    console.log('  📱 WhatsApp:');
    console.log(`    - Habilitado: ${estadoNotificaciones.whatsapp.habilitado ? '✅' : '❌'}`);
    console.log(`    - Conectado: ${estadoNotificaciones.whatsapp.conectado ? '✅' : '⏳ Pendiente'}`);
    if (estadoNotificaciones.whatsapp.habilitado && !estadoNotificaciones.whatsapp.conectado) {
      console.log('    📲 Escanea el código QR que aparecerá arriba para conectar WhatsApp');
    }
    if (!estadoNotificaciones.whatsapp.habilitado) {
      console.log('    ℹ️  Configura WHATSAPP_ENABLED=true en .env para habilitar');
    }
    console.log('');
  })
  .catch((err) => console.error("❌ Error conectando a MongoDB:", err));

// Middleware para logging de requests (desarrollo)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
}

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Rutas de API
app.use("/api/auth", authRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/facturas", facturaRoutes); // ✅ Nueva ruta para facturas
app.use("/api/lecturas", lecturaRoutes); // ✅ Nueva ruta para lecturas
app.use("/api/pagos", pagoRoutes); // ✅ Nueva ruta para pagos
app.use('/api/mora', moraRoutes);
app.use('/api/reconexion', reconexionRoutes);
app.use('/api/facturas/admin', facturaAdminRoutes); // ✅ Rutas administrativas de facturas
app.use('/api/notas', notaRoutes); // ✅ Rutas para notas de crédito y débito (NCRE, NDEB)

// Ruta de prueba
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Ruta raíz que redirije al login
app.get('/', (req, res) => {
  res.redirect('/pages/login.html');
});

// Manejar rutas del frontend (SPA routing)
app.get('*', (req, res, next) => {
  // Si la ruta empieza con /api/, deja que el middleware de error la maneje
  if (req.originalUrl.startsWith('/api/')) {
    return next();
  }
  // Para todas las demás rutas, servir el login si no es un archivo estático
  res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
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

// Manejar rutas de API no encontradas
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta de API no encontrada'
  });
});

// Puerto
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
  console.log(`🏠 Aplicación disponible en: http://localhost:${PORT}`);
  console.log(`📊 API disponible en: http://localhost:${PORT}/api/`);
});

// Exportar app para pruebas
module.exports = app;