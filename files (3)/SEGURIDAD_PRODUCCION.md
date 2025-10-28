# 🔒 Gestión de Archivos Administrativos en Producción

## 🎯 Resumen Ejecutivo

**La opción más segura:** Deshabilitar las funciones administrativas en producción mediante variables de entorno, manteniendo el código pero sin que sea accesible.

**¿Por qué no eliminar?** Porque podrías necesitar estas funciones en el futuro para:
- Corregir errores de facturación
- Hacer ajustes autorizados
- Realizar migraciones de datos

---

## 📊 Comparación de Opciones

| Opción | Seguridad | Flexibilidad | Recomendada |
|--------|-----------|--------------|-------------|
| 1. Deshabilitar con ENV | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ **SÍ** |
| 2. Eliminar archivos | ⭐⭐⭐⭐ | ⭐ | ❌ NO |
| 3. Protección IP | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⚠️ Depende |
| 4. Dejar sin cambios | ⭐ | ⭐⭐⭐⭐⭐ | ❌ **NUNCA** |

---

## ✅ OPCIÓN RECOMENDADA: Deshabilitar con Variables de Entorno

### Por qué es la mejor opción:

1. ✅ **Seguridad máxima** - Las rutas no están disponibles en producción
2. ✅ **Flexibilidad** - Puedes habilitarlas temporalmente si es necesario
3. ✅ **Mantenimiento** - El código sigue en el repositorio para futuras necesidades
4. ✅ **Auditoría** - Puedes revisar el código cuando lo necesites
5. ✅ **Cero riesgo** - Si la variable no existe, las funciones no existen

### Implementación:

#### 1. Modificar el archivo de rutas

```javascript
// backend/routes/factura.admin.routes.js
const express = require('express');
const router = express.Router();
const facturaAdminController = require('../controllers/factura.admin.controller');
const { protect, authorize } = require('../middleware/auth');

// ============================================
// PROTECCIÓN PARA PRODUCCIÓN
// ============================================

// Solo cargar rutas si está habilitado en las variables de entorno
const ADMIN_FUNCTIONS_ENABLED = process.env.ENABLE_ADMIN_FUNCTIONS === 'true';

if (!ADMIN_FUNCTIONS_ENABLED) {
  // Si no está habilitado, todas las rutas devuelven 404
  router.all('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'Funciones administrativas no disponibles en este entorno'
    });
  });
  
  module.exports = router;
  return;
}

// ============================================
// RUTAS ADMINISTRATIVAS (solo si está habilitado)
// ============================================

router.post(
  '/crear-con-fecha',
  protect,
  authorize('admin', 'encargado'),
  facturaAdminController.createFacturaConFechaPersonalizada
);

router.put(
  '/:facturaId/modificar-fecha',
  protect,
  authorize('admin'),
  facturaAdminController.modificarFechaVencimiento
);

router.post(
  '/crear-lote-prueba',
  protect,
  authorize('admin'),
  facturaAdminController.crearLoteFacturasPrueba
);

// Endpoint de generación de hash - SOLO en desarrollo
if (process.env.NODE_ENV === 'development') {
  router.post(
    '/generar-hash',
    protect,
    authorize('admin'),
    facturaAdminController.generarHashPassword
  );
}

module.exports = router;
```

#### 2. Configurar variables de entorno

**Desarrollo (.env.development):**
```env
NODE_ENV=development
ENABLE_ADMIN_FUNCTIONS=true
ADMIN_FECHA_PASSWORD=$2a$10$tu_hash_aqui
```

**Producción (.env.production):**
```env
NODE_ENV=production
ENABLE_ADMIN_FUNCTIONS=false
# ADMIN_FECHA_PASSWORD no es necesaria si está deshabilitado
```

#### 3. Agregar middleware de advertencia

Crea un middleware que registre intentos de acceso:

```javascript
// backend/middleware/adminFunctionsLogger.js
const adminFunctionsLogger = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    console.warn(`⚠️  [SEGURIDAD] Intento de acceso a funciones admin en producción`);
    console.warn(`   IP: ${req.ip}`);
    console.warn(`   Usuario: ${req.user?.email || 'No autenticado'}`);
    console.warn(`   Ruta: ${req.originalUrl}`);
    console.warn(`   Método: ${req.method}`);
    console.warn(`   Fecha: ${new Date().toISOString()}`);
  }
  next();
};

module.exports = adminFunctionsLogger;
```

Úsalo en las rutas:

```javascript
// En factura.admin.routes.js
const adminFunctionsLogger = require('../middleware/adminFunctionsLogger');

// Aplicar a todas las rutas admin
router.use(adminFunctionsLogger);
```

---

## 🔐 OPCIÓN 2: Protección por IP (Alternativa)

Si necesitas mantener las funciones activas en producción pero solo para ciertas IPs:

```javascript
// backend/middleware/ipWhitelist.js
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Extraer IP sin prefijo IPv6
    const cleanIP = clientIP.replace(/^::ffff:/, '');
    
    if (!allowedIPs.includes(cleanIP)) {
      console.warn(`🚫 Acceso denegado desde IP no autorizada: ${cleanIP}`);
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: IP no autorizada'
      });
    }
    
    next();
  };
};

module.exports = ipWhitelist;
```

Uso:

```javascript
// En factura.admin.routes.js
const ipWhitelist = require('../middleware/ipWhitelist');

// IPs permitidas desde variables de entorno
const allowedIPs = process.env.ADMIN_ALLOWED_IPS?.split(',') || [];

if (allowedIPs.length > 0) {
  router.use(ipWhitelist(allowedIPs));
}

// ... resto de las rutas
```

En `.env`:
```env
ADMIN_ALLOWED_IPS=192.168.1.100,10.0.0.5
```

---

## ❌ OPCIÓN 3: Eliminar Archivos (NO Recomendada)

### Por qué NO es recomendada:

1. ❌ Pierdes el código si lo necesitas después
2. ❌ Más trabajo reintroducir las funciones si son necesarias
3. ❌ Problemas si necesitas hacer un rollback
4. ❌ Pérdida de historial en git

### Si AÚN ASÍ decides eliminar:

```bash
# En producción, antes de deploy:
rm backend/controllers/factura.admin.controller.js
rm backend/routes/factura.admin.routes.js

# Y comenta la línea en server.js:
# app.use('/api/facturas/admin', facturaAdminRoutes);
```

---

## 🛡️ OPCIÓN 4: Protección Múltiple (Máxima Seguridad)

Combina varias capas de seguridad:

```javascript
// backend/middleware/adminProtection.js
const adminProtection = {
  // 1. Verificar si está habilitado
  checkEnabled: (req, res, next) => {
    if (process.env.ENABLE_ADMIN_FUNCTIONS !== 'true') {
      return res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado'
      });
    }
    next();
  },

  // 2. Verificar entorno
  checkEnvironment: (req, res, next) => {
    if (process.env.NODE_ENV === 'production' && 
        process.env.ALLOW_ADMIN_IN_PRODUCTION !== 'true') {
      console.error('🚨 Intento de acceso a funciones admin en producción');
      return res.status(403).json({
        success: false,
        message: 'Funciones administrativas no disponibles en producción'
      });
    }
    next();
  },

  // 3. Rate limiting
  rateLimiter: require('express-rate-limit')({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 requests
    message: {
      success: false,
      message: 'Demasiados intentos. Intente más tarde.'
    }
  }),

  // 4. Registro de auditoría
  auditLog: (req, res, next) => {
    const log = {
      timestamp: new Date().toISOString(),
      user: req.user?.email || 'Desconocido',
      ip: req.ip,
      method: req.method,
      path: req.originalUrl,
      body: req.method === 'POST' || req.method === 'PUT' ? 
            JSON.stringify(req.body) : undefined
    };
    
    // Guardar en base de datos o archivo de log
    console.log('📝 [ADMIN AUDIT]', JSON.stringify(log));
    
    // Opcional: guardar en MongoDB
    // const AdminLog = require('../models/adminLog.model');
    // await AdminLog.create(log);
    
    next();
  }
};

module.exports = adminProtection;
```

Uso combinado:

```javascript
// En factura.admin.routes.js
const adminProtection = require('../middleware/adminProtection');

// Aplicar todas las protecciones
router.use(adminProtection.checkEnabled);
router.use(adminProtection.checkEnvironment);
router.use(adminProtection.rateLimiter);
router.use(adminProtection.auditLog);

// Ahora las rutas
router.post('/crear-con-fecha', ...);
```

---

## 📋 Checklist de Seguridad para Producción

### Antes de lanzar a producción:

- [ ] Configurar `ENABLE_ADMIN_FUNCTIONS=false` en producción
- [ ] Verificar que `NODE_ENV=production`
- [ ] Cambiar contraseña administrativa (nuevo hash)
- [ ] Implementar rate limiting
- [ ] Configurar logs de auditoría
- [ ] Documentar procedimiento para habilitar temporalmente si es necesario
- [ ] Revisar que no haya credenciales hardcodeadas
- [ ] Probar que las funciones NO funcionan en producción
- [ ] Configurar alertas si alguien intenta acceder
- [ ] Documentar IPs autorizadas (si usas whitelist)

### Durante producción:

- [ ] Monitorear logs de intentos de acceso
- [ ] Revisar auditoría mensualmente
- [ ] Mantener actualizado el hash de contraseña
- [ ] Limitar acceso físico al servidor
- [ ] Usar VPN para acceso remoto

---

## 🎓 Mejores Prácticas

### 1. **Separación de Ambientes**

```bash
# Desarrollo
ENABLE_ADMIN_FUNCTIONS=true

# Staging (pruebas pre-producción)
ENABLE_ADMIN_FUNCTIONS=true

# Producción
ENABLE_ADMIN_FUNCTIONS=false
```

### 2. **Documentación**

Crea un documento `PROCEDIMIENTO_EMERGENCIA.md`:

```markdown
# Habilitar Funciones Admin en Producción

## ⚠️ SOLO EN CASO DE EMERGENCIA

1. Conectarse al servidor vía SSH
2. Editar el archivo .env: `ENABLE_ADMIN_FUNCTIONS=true`
3. Reiniciar el servidor: `pm2 restart all`
4. Realizar la operación necesaria
5. **INMEDIATAMENTE** volver a `ENABLE_ADMIN_FUNCTIONS=false`
6. Reiniciar nuevamente: `pm2 restart all`
7. Registrar la actividad en el log de operaciones
```

### 3. **Control de Versiones**

Usa `.gitignore` para variables sensibles:

```bash
# .gitignore
.env
.env.production
.env.development
.env.local
```

Y un archivo de ejemplo:

```bash
# .env.example
NODE_ENV=development
ENABLE_ADMIN_FUNCTIONS=false
ADMIN_FECHA_PASSWORD=genera_tu_hash_con_el_endpoint
ADMIN_ALLOWED_IPS=127.0.0.1
```

---

## 🚀 Configuración Recomendada Final

### Estructura de archivos:

```
backend/
├── controllers/
│   └── factura.admin.controller.js  ✅ Mantener
├── routes/
│   └── factura.admin.routes.js      ✅ Mantener con protección
├── middleware/
│   ├── adminProtection.js           ✅ Crear
│   └── adminFunctionsLogger.js      ✅ Crear
└── .env.production                   ✅ ENABLE_ADMIN_FUNCTIONS=false
```

### Variables de entorno recomendadas:

```env
# Producción
NODE_ENV=production
ENABLE_ADMIN_FUNCTIONS=false
# ADMIN_FECHA_PASSWORD no es necesaria si está deshabilitado

# Desarrollo
NODE_ENV=development
ENABLE_ADMIN_FUNCTIONS=true
ADMIN_FECHA_PASSWORD=$2a$10$tu_hash
```

---

## 💡 Recomendación Final

**Para tu proyecto, te recomiendo:**

1. ✅ **Implementar la Opción 1** (Deshabilitar con ENV)
2. ✅ Agregar el middleware de logging
3. ✅ Mantener el código en el repositorio
4. ✅ Configurar correctamente las variables de entorno
5. ✅ Documentar el procedimiento de emergencia

**En resumen:**
- **Desarrollo:** Todo habilitado para pruebas
- **Producción:** Todo deshabilitado por defecto
- **Emergencias:** Procedimiento documentado para habilitar temporalmente

Esto te da **seguridad** sin perder **flexibilidad**. 🔒✨

---

## 📞 Preguntas Frecuentes

**P: ¿Y si necesito modificar una fecha en producción?**
R: Habilitas temporalmente, haces el cambio, y vuelves a deshabilitar inmediatamente.

**P: ¿Es seguro mantener el código si está deshabilitado?**
R: Sí, porque las rutas no están registradas. Es como si no existieran.

**P: ¿Puedo usar estas funciones en staging?**
R: Sí, en staging puedes tenerlas habilitadas para pruebas finales.

**P: ¿Debo cambiar la contraseña entre ambientes?**
R: Sí, usa diferentes contraseñas para desarrollo y producción.

---

*Esta guía está diseñada para el Sistema de Agua LOTI*
*Última actualización: Octubre 2025*
