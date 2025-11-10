# 🖥️ Sistema Agua LOTI - Versión Electron (Aplicación de Escritorio)

## 📖 ¿Qué es esta versión?

Esta es la **versión de aplicación de escritorio** del Sistema Agua LOTI, construida con Electron. Se ve y funciona como cualquier programa tradicional de Windows (como Word, Excel, etc.) pero internamente usa las mismas tecnologías web del sistema.

### ✨ Ventajas de la Versión Electron

- ✅ **Aplicación nativa**: Se ve como un programa normal de Windows
- ✅ **No requiere navegador**: No verás URLs ni pestañas del navegador
- ✅ **Icono en escritorio**: Acceso directo como cualquier programa
- ✅ **Instalador profesional**: Setup.exe con wizard de instalación
- ✅ **Bandeja del sistema**: Minimiza a la bandeja (junto al reloj)
- ✅ **Fácil de usar**: Usuarios no técnicos lo entienden mejor
- ✅ **Distribución simple**: Un solo archivo .exe para instalar

---

## 🚀 Desarrollo y Pruebas

### Requisitos Previos

1. **Node.js** (v18 o superior)
2. **MongoDB** corriendo
3. **Dependencias instaladas**:
   ```bash
   npm install
   ```

### Ejecutar en Modo Desarrollo

Para probar la aplicación Electron sin generar el instalador:

```bash
# Modo desarrollo (con DevTools)
npm run electron-dev

# O modo normal
npm run electron
```

**Qué hace:**
1. Verifica que MongoDB esté corriendo
2. Inicia el servidor backend (Node.js + Express)
3. Abre la ventana de Electron
4. Carga la aplicación web dentro de Electron

---

## 🔨 Generar Instalador

### Windows (.exe)

Para crear el instalador de Windows:

```bash
npm run build
```

**Resultado:**
```
dist/
└── Sistema Agua LOTI-Setup-1.0.0.exe  (~150 MB)
```

### Otras Plataformas

```bash
# macOS
npm run build:mac

# Linux
npm run build:linux

# Todas las plataformas
npm run build:all
```

---

## 📦 Distribuir el Instalador

Una vez generado el instalador, puedes:

1. **Copiar el .exe** de `dist/Sistema Agua LOTI-Setup-1.0.0.exe`
2. **Distribuir por**:
   - USB/pendrive
   - Carpeta compartida en red
   - Email (si es pequeño)
   - Dropbox/Google Drive
   - Subir a tu sitio web

### Instalación en Computadora del Usuario

El usuario solo necesita:

1. **Descargar/copiar** el archivo `Sistema Agua LOTI-Setup-1.0.0.exe`
2. **Doble clic** en el instalador
3. **Seguir el wizard**:
   - Aceptar licencia
   - Elegir carpeta de instalación (por defecto: `C:\Users\[usuario]\AppData\Local\Programs\sistema-agua-loti`)
   - Elegir si crear acceso directo en escritorio
   - Instalar
4. **Listo** - La aplicación está instalada

### Primera Ejecución

Al abrir por primera vez:

1. La app verificará que **MongoDB esté corriendo**
   - Si no está, mostrará error con instrucciones
2. Iniciará el **backend automáticamente**
3. Abrirá la **ventana principal**

---

## 🎨 Personalizar Iconos

Los iconos están en la carpeta `build/`. Necesitas:

### 1. Icono Principal

**Archivo**: `build/icon.png`
- **Tamaño**: 512x512 px
- **Formato**: PNG con fondo transparente

### 2. Icono Windows

**Archivo**: `build/icon.ico`
- **Formato**: ICO multi-tamaño
- **Tamaños incluidos**: 16x16, 32x32, 48x48, 256x256

### 3. Icono macOS

**Archivo**: `build/icon.icns`
- **Formato**: ICNS de Apple

### 4. Icono Bandeja del Sistema

**Archivo**: `build/tray-icon.png`
- **Tamaño**: 48x48 px (máximo 64x64)
- **Formato**: PNG con fondo transparente
- **Estilo**: Simple, monocromático preferiblemente

### Herramientas para Crear Iconos

- **En línea**: [https://icon.kitchen/](https://icon.kitchen/)
- **Convertidor ICO**: [https://www.icoconverter.com/](https://www.icoconverter.com/)
- **Photoshop/GIMP**: Exportar en diferentes tamaños
- **electron-icon-maker**: npm package para generar todos los formatos

---

## ⚙️ Configuración

### Variables de Entorno

La aplicación Electron usa el mismo archivo `.env` que la versión web.

**Importante**: Al crear el instalador, el `.env` NO se incluye por seguridad.

**Solución**: La aplicación buscará `.env` en:
1. Carpeta de instalación
2. `%APPDATA%/sistema-agua-loti/.env`
3. O crear un `.env` copiando desde `.env.example`

### Primera Configuración

Después de instalar, el usuario debe:

1. Ir a la carpeta de instalación
2. Copiar `.env.example` → `.env`
3. Editar `.env` con sus credenciales
4. Reiniciar la aplicación

---

## 🔧 Características de la Aplicación

### 1. Ventana Principal

- **Tamaño inicial**: 1400x900 px
- **Tamaño mínimo**: 1200x700 px
- **Comportamiento**: Se maximiza automáticamente al abrir
- **Botón cerrar**: Minimiza a bandeja (no cierra la app)

### 2. Bandeja del Sistema (System Tray)

Icono junto al reloj con menú contextual:

```
Sistema Agua LOTI
├── Abrir Sistema Agua LOTI
├── ─────────────
├── Dashboard
├── Facturas
├── Pagos
├── ─────────────
├── Acerca de
├── ─────────────
└── Salir
```

**Acciones**:
- **Clic simple**: Mostrar menú
- **Doble clic**: Abrir ventana principal

### 3. Inicio Automático

La aplicación NO se inicia automáticamente con Windows por defecto.

**Para habilitar** (opcional):
```javascript
// En electron-main.js
app.setLoginItemSettings({
  openAtLogin: true
});
```

### 4. Verificaciones al Iniciar

1. ✅ **MongoDB**: Verifica conexión (timeout 3 segundos)
2. ✅ **Backend**: Inicia servidor Node.js
3. ✅ **Puerto**: Usa puerto 3000 (configurable con PORT en .env)

---

## 🐛 Solución de Problemas

### Error: "MongoDB No Disponible"

**Causa**: MongoDB no está corriendo

**Solución**:
```bash
# Windows
net start MongoDB

# Linux
sudo systemctl start mongod

# macOS
brew services start mongodb-community
```

### Error: "No se pudo iniciar el servidor backend"

**Causa**: Error en backend/server.js

**Solución**:
1. Abrir DevTools: Ctrl+Shift+I en la app
2. Ver errores en la consola
3. Verificar `.env` está configurado
4. Verificar dependencias: `npm install`

### La aplicación no abre

**Solución**:
1. Cerrar completamente (clic derecho en bandeja → Salir)
2. Abrir desde el acceso directo
3. Si persiste, desinstalar y reinstalar

### Ventana en blanco

**Causa**: Backend no inició o puerto ocupado

**Solución**:
1. Cerrar otras instancias del sistema
2. Verificar puerto 3000 no esté en uso
3. Ver logs en consola de DevTools

---

## 📊 Comparación: Web vs Electron

| Característica | Versión Web | Versión Electron |
|----------------|-------------|------------------|
| **Requiere navegador** | ✅ Sí (Chrome/Edge) | ❌ No |
| **Usuario ve URL** | ✅ Sí | ❌ No |
| **Instalación** | Scripts (.bat/.sh) | Instalador (.exe) |
| **Icono escritorio** | ✅ Sí | ✅ Sí |
| **Bandeja sistema** | ❌ No | ✅ Sí |
| **Apariencia** | Página web | Aplicación nativa |
| **Tamaño** | ~50 MB | ~150 MB |
| **Distribución** | Clonar repo | Un solo .exe |
| **Usuarios casuales** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🚢 Publicación y Actualizaciones

### Versionado

Usa [SemVer](https://semver.org/):
- **1.0.0**: Primera versión
- **1.0.1**: Corrección de bugs
- **1.1.0**: Nuevas características
- **2.0.0**: Cambios mayores

**Actualizar versión**:
```json
// package.json
{
  "version": "1.1.0"
}
```

### Auto-Actualización (Opcional)

Para agregar auto-actualización:

1. Publicar releases en GitHub
2. Usar `electron-updater`
3. La app descargará actualizaciones automáticamente

---

## 📝 Notas Técnicas

### Arquitectura

```
┌─────────────────────────────────┐
│   Proceso Principal (Main)      │
│   electron-main.js              │
│   - Crea ventana                │
│   - Inicia backend              │
│   - Maneja system tray          │
└────────┬────────────────────────┘
         │
         ├─────────────────────────┐
         │                         │
┌────────▼────────┐       ┌────────▼────────┐
│  Backend        │       │  Renderer       │
│  Node.js        │◄─────►│  (Ventana)      │
│  Express        │       │  HTML/CSS/JS    │
│  MongoDB        │       │  Frontend       │
└─────────────────┘       └─────────────────┘
```

### Tecnologías Usadas

- **Electron**: v39+
- **Node.js**: Embebido con Electron
- **Express**: Backend HTTP server
- **MongoDB**: Base de datos (externa)
- **Electron Builder**: Generación de instaladores

### Recursos Empaquetados

El instalador incluye:
- ✅ Electron runtime (~130 MB)
- ✅ Tu código (backend + frontend)
- ✅ node_modules (dependencias)
- ❌ MongoDB (debe instalarse aparte)
- ❌ Archivos `.env` (seguridad)

---

## 🤝 Contribuir

Si quieres mejorar la versión Electron:

1. Fork el repositorio
2. Modifica `electron-main.js` o `electron-preload.js`
3. Prueba con `npm run electron-dev`
4. Genera build con `npm run build`
5. Crea pull request

---

## 📞 Soporte

**Problemas comunes**: Ver sección "Solución de Problemas" arriba

**Reportar bugs**: GitHub Issues

**Email**: soporte@agua-loti.com

---

## 📜 Licencia

MIT License - Ver archivo LICENSE

---

**Versión Electron:** 1.0.0
**Última actualización:** Noviembre 2025
**Autor:** Sistema Agua LOTI
