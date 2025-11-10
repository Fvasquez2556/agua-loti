// electron-main.js
// Proceso principal de Electron para Sistema Agua LOTI

const { app, BrowserWindow, Tray, Menu, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Variables globales
let mainWindow = null;
let tray = null;
let backendProcess = null;
const isDev = process.env.NODE_ENV === 'development';

// Puerto del servidor backend
const BACKEND_PORT = process.env.PORT || 3000;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

/**
 * Crear ventana principal de la aplicación
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'Sistema de Agua LOTI',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.js')
    },
    backgroundColor: '#ffffff',
    show: false // No mostrar hasta que esté listo
  });

  // Mostrar ventana cuando esté lista
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  // Cargar la aplicación web
  mainWindow.loadURL(BACKEND_URL);

  // Abrir DevTools en modo desarrollo
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Prevenir cierre de ventana, minimizar a bandeja
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  // Manejar enlaces externos
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return mainWindow;
}

/**
 * Crear icono en bandeja del sistema
 */
function createTray() {
  const trayIconPath = path.join(__dirname, 'build', 'tray-icon.png');

  // Verificar si existe el icono, si no usar uno por defecto
  const iconPath = fs.existsSync(trayIconPath)
    ? trayIconPath
    : path.join(__dirname, 'build', 'icon.png');

  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir Sistema Agua LOTI',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.loadURL(`${BACKEND_URL}/frontend/pages/dashboard.html`);
        }
      }
    },
    {
      label: 'Facturas',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.loadURL(`${BACKEND_URL}/frontend/pages/factura.html`);
        }
      }
    },
    {
      label: 'Pagos',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.loadURL(`${BACKEND_URL}/frontend/pages/pagos.html`);
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Acerca de',
      click: () => {
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Acerca de',
          message: 'Sistema de Agua LOTI',
          detail: 'Versión 1.0.0\nHuehuetenango, Guatemala\n\n© 2025 Sistema Agua LOTI'
        });
      }
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Sistema de Agua LOTI');
  tray.setContextMenu(contextMenu);

  // Doble clic en el icono para mostrar ventana
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return tray;
}

/**
 * Iniciar servidor backend de Node.js
 */
function startBackendServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Iniciando servidor backend...');

    const serverPath = path.join(__dirname, 'backend', 'server.js');

    backendProcess = spawn('node', [serverPath], {
      cwd: __dirname,
      env: { ...process.env, PORT: BACKEND_PORT },
      stdio: 'pipe'
    });

    // Capturar logs del backend
    backendProcess.stdout.on('data', (data) => {
      const message = data.toString().trim();
      console.log('[Backend]', message);

      // Detectar cuando el servidor está listo
      if (message.includes('Servidor corriendo') || message.includes('listening on')) {
        console.log('✅ Backend listo');
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      console.error('[Backend Error]', data.toString());
    });

    backendProcess.on('error', (error) => {
      console.error('❌ Error al iniciar backend:', error);
      reject(error);
    });

    backendProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`❌ Backend cerrado con código ${code}`);
      }
    });

    // Timeout de 10 segundos
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        console.log('⏱️ Backend iniciado (timeout alcanzado)');
        resolve();
      }
    }, 10000);
  });
}

/**
 * Verificar si MongoDB está corriendo
 */
async function checkMongoDB() {
  const mongoose = require('mongoose');
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/agua-loti';

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000
    });
    console.log('✅ MongoDB conectado');
    await mongoose.disconnect();
    return true;
  } catch (error) {
    console.error('❌ MongoDB no disponible:', error.message);
    return false;
  }
}

/**
 * Mostrar diálogo de error si MongoDB no está disponible
 */
function showMongoDBError() {
  dialog.showErrorBox(
    'MongoDB No Disponible',
    'No se pudo conectar a MongoDB.\n\n' +
    'Asegúrate de que MongoDB esté instalado y corriendo.\n\n' +
    'Windows: net start MongoDB\n' +
    'Linux/Mac: sudo systemctl start mongod'
  );
}

// ===== EVENTOS DE LA APLICACIÓN =====

/**
 * Cuando Electron ha terminado de inicializarse
 */
app.whenReady().then(async () => {
  console.log('🌊 Iniciando Sistema de Agua LOTI...');

  // Verificar MongoDB
  const mongoAvailable = await checkMongoDB();
  if (!mongoAvailable) {
    showMongoDBError();
    app.quit();
    return;
  }

  // Iniciar servidor backend
  try {
    await startBackendServer();
  } catch (error) {
    dialog.showErrorBox(
      'Error al Iniciar',
      'No se pudo iniciar el servidor backend.\n\n' + error.message
    );
    app.quit();
    return;
  }

  // Crear ventana principal
  createMainWindow();

  // Crear icono en bandeja del sistema
  createTray();

  console.log('✅ Sistema de Agua LOTI iniciado correctamente');
});

/**
 * Cuando todas las ventanas están cerradas
 */
app.on('window-all-closed', () => {
  // En macOS, mantener la app activa hasta que el usuario salga explícitamente
  if (process.platform !== 'darwin') {
    // No hacer nada, mantener en la bandeja
  }
});

/**
 * Cuando se activa la app (macOS)
 */
app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  } else {
    mainWindow.show();
  }
});

/**
 * Antes de salir de la aplicación
 */
app.on('before-quit', () => {
  app.isQuitting = true;

  // Cerrar proceso backend
  if (backendProcess && !backendProcess.killed) {
    console.log('🛑 Cerrando servidor backend...');
    backendProcess.kill();
  }
});

/**
 * Al salir de la aplicación
 */
app.on('quit', () => {
  console.log('👋 Sistema de Agua LOTI cerrado');
});

// ===== IPC HANDLERS =====

/**
 * Minimizar ventana a bandeja
 */
ipcMain.on('minimize-to-tray', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

/**
 * Obtener información de la aplicación
 */
ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    name: app.getName(),
    platform: process.platform
  };
});
