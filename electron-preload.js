// electron-preload.js
// Script de precarga para exponer APIs seguras al renderer

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Exponer APIs seguras al contexto del renderer
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Información de la aplicación
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // Minimizar a bandeja del sistema
  minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),

  // Información del sistema
  platform: process.platform,
  isElectron: true,
  version: process.versions.electron
});

/**
 * Eventos del DOM
 */
window.addEventListener('DOMContentLoaded', () => {
  // Indicar que la app está corriendo en Electron
  const body = document.body;
  if (body) {
    body.classList.add('electron-app');
    body.setAttribute('data-platform', process.platform);
  }

  // Agregar información de versión en consola
  console.log('%c🌊 Sistema Agua LOTI - Electron', 'color: #0066cc; font-size: 14px; font-weight: bold');
  console.log(`Versión Electron: ${process.versions.electron}`);
  console.log(`Plataforma: ${process.platform}`);
});
