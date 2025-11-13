// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

// ========================================
// INICIALIZACIÓN AUTOMÁTICA
// ========================================
// Ejecutar script de inicialización (crea .env, usuario admin, etc.)
const { initialize } = require('./init');

// Ejecutar inicialización asíncrona
(async () => {
  try {
    const initSuccess = await initialize();
    if (!initSuccess) {
      console.error('');
      console.error('========================================');
      console.error('  ❌ ERROR CRÍTICO');
      console.error('========================================');
      console.error('⚠️  La inicialización no se completó correctamente');
      console.error('   MongoDB no está disponible o no se pudo conectar');
      console.error('');
      console.error('   SOLUCIONES:');
      console.error('   1. Verifica que MongoDB esté instalado');
      console.error('   2. Inicia el servicio: net start MongoDB');
      console.error('   3. Verifica la URI en el archivo .env');
      console.error('');

      // No continuar si MongoDB no está disponible
      process.exit(1);
    }

    // Recargar variables de entorno después de la inicialización
    const envPath = process.env.ENV_FILE_PATH || path.join(__dirname, "../.env");
    require("dotenv").config({ path: envPath });
    console.log(`📄 Variables de entorno cargadas desde: ${envPath}`);

    // Continuar con la inicialización del servidor
    startServer();
  } catch (error) {
    console.error('');
    console.error('========================================');
    console.error('  ❌ ERROR FATAL AL INICIAR SERVIDOR');
    console.error('========================================');
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    console.error('Stack:', error.stack);
    console.error('');
    process.exit(1);
  }
})();

// Variable global para almacenar el servidor
let serverInstance = null;

function startServer() {
  // Rutas
  const authRoutes = require("./routes/auth.routes");
  const clienteRoutes = require("./routes/cliente.routes");
  const facturaRoutes = require("./routes/factura.routes");
  const lecturaRoutes = require("./routes/lectura.routes");
  const pagoRoutes = require("./routes/pago.routes");
  const moraRoutes = require('./routes/mora.routes');
  const reconexionRoutes = require('./routes/reconexion.routes');
  const facturaAdminRoutes = require('./routes/factura.admin.routes');
  const notaRoutes = require('./routes/nota.routes');

  // Inicializar app
  const app = express();

  // Middlewares
  app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500'],
    credentials: true
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Conexión a MongoDB
  mongoose.connect(process.env.MONGO_URI)
    .then(() => {
      console.log("✅ Conectado a MongoDB (servidor)");

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
  let PORT = parseInt(process.env.PORT || '5000');
  const MAX_PORT_ATTEMPTS = 5;
  let portAttempts = 0;

  /**
   * Intentar iniciar servidor en un puerto, si falla, intentar con el siguiente
   */
  function tryStartServer(port) {
    serverInstance = app.listen(port, () => {
      console.log(`🚀 Servidor escuchando en el puerto ${port}`);
      console.log(`🏠 Aplicación disponible en: http://localhost:${port}`);
      console.log(`📊 API disponible en: http://localhost:${port}/api/`);

      // Actualizar variable de entorno para que otros módulos sepan el puerto real
      process.env.ACTUAL_PORT = port.toString();
    });

    return serverInstance;
  }

  tryStartServer(PORT);

  // Manejar error de puerto ocupado
  serverInstance.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      portAttempts++;

      if (portAttempts < MAX_PORT_ATTEMPTS) {
        const nextPort = PORT + portAttempts;
        console.warn('');
        console.warn('⚠️  Puerto ' + (nextPort - 1) + ' ocupado, intentando con puerto ' + nextPort + '...');
        console.warn('');

        // Intentar con el siguiente puerto
        tryStartServer(nextPort);
      } else {
        // Ya intentamos con varios puertos y todos están ocupados
        console.error('');
        console.error('========================================');
        console.error('  ❌ ERROR: PUERTOS OCUPADOS');
        console.error('========================================');
        console.error('');
        console.error(`Intentamos con los puertos ${PORT} a ${PORT + portAttempts - 1} y todos están ocupados.`);
        console.error('');
        console.error('Esto puede deberse a:');
        console.error('  1. Múltiples instancias de la aplicación corriendo');
        console.error('  2. Otros servicios usando estos puertos');
        console.error('');
        console.error('SOLUCIONES:');
        console.error('');
        console.error('  Opción 1 - Cerrar procesos de la aplicación:');
        console.error('    Windows PowerShell:');
        console.error('      Get-Process "Sistema Agua LOTI" | Stop-Process -Force');
        console.error('');
        console.error('  Opción 2 - Cambiar el puerto base en el archivo .env:');
        console.error('    ELECTRON_PORT=8000');
        console.error('');

        // Si estamos en Electron, cerrar la aplicación
        if (process.versions.electron) {
          console.error('🛑 Cerrando aplicación Electron...');
          setTimeout(() => {
            // Forzar cierre usando app de Electron si está disponible
            if (typeof require === 'function') {
              try {
                const { app } = require('electron');
                if (app) {
                  app.exit(1);
                }
              } catch (e) {
                process.exit(1);
              }
            } else {
              process.exit(1);
            }
          }, 500);
        } else {
          process.exit(1);
        }
      }
    } else {
      console.error('Error al iniciar servidor:', error);

      // Para otros errores, cerrar inmediatamente
      if (process.versions.electron) {
        setTimeout(() => {
          if (typeof require === 'function') {
            try {
              const { app } = require('electron');
              if (app) {
                app.exit(1);
              }
            } catch (e) {
              process.exit(1);
            }
          } else {
            process.exit(1);
          }
        }, 500);
      } else {
        process.exit(1);
      }
    }
  });

  // Exportar app para pruebas
  return { app, server: serverInstance };
}

/**
 * Función para cerrar el servidor limpiamente
 */
function shutdownServer() {
  return new Promise((resolve) => {
    console.log('🛑 Cerrando servidor backend...');

    // Cerrar servidor HTTP
    if (serverInstance) {
      serverInstance.close((err) => {
        if (err) {
          console.error('Error al cerrar servidor HTTP:', err);
        } else {
          console.log('✅ Servidor HTTP cerrado');
        }

        // Cerrar conexión a MongoDB
        mongoose.connection.close(false, () => {
          console.log('✅ Conexión a MongoDB cerrada');
          resolve();
        });
      });
    } else {
      // Cerrar conexión a MongoDB aunque no haya servidor HTTP
      mongoose.connection.close(false, () => {
        console.log('✅ Conexión a MongoDB cerrada');
        resolve();
      });
    }
  });
}

// Exportar para uso en Electron y pruebas
module.exports = { startServer, shutdownServer };