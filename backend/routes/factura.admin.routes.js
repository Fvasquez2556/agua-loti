// backend/routes/factura.admin.routes.js
/**
 * Rutas para funciones administrativas de facturas
 * Incluye endpoints especiales para pruebas y modificación de fechas
 * 
 * SEGURIDAD: Este archivo incluye protección para producción
 * Las funciones solo están disponibles si ENABLE_ADMIN_FUNCTIONS=true
 */

const express = require('express');
const router = express.Router();
const facturaAdminController = require('../controllers/factura.admin.controller');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');

// ============================================
// PROTECCIÓN PARA PRODUCCIÓN
// ============================================

const ADMIN_FUNCTIONS_ENABLED = process.env.ENABLE_ADMIN_FUNCTIONS === 'true';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Middleware de logging para auditoría
const auditLog = (req, res, next) => {
  const log = {
    timestamp: new Date().toISOString(),
    user: req.user?.username || 'Desconocido',
    userId: req.user?.id || 'N/A',
    ip: req.ip || req.connection.remoteAddress,
    method: req.method,
    path: req.originalUrl,
    environment: process.env.NODE_ENV
  };

  console.log('📝 [ADMIN AUDIT]', JSON.stringify(log));

  // En producción, registrar también advertencia
  if (IS_PRODUCTION) {
    console.warn('⚠️  [ALERTA] Acceso a funciones administrativas en PRODUCCIÓN');
  }

  next();
};

// Si las funciones admin NO están habilitadas, devolver 404 para todas las rutas
if (!ADMIN_FUNCTIONS_ENABLED) {
  router.all('*', (req, res) => {
    // Log de intento de acceso
    console.warn(`🚫 Intento de acceso a funciones admin deshabilitadas`);
    console.warn(`   IP: ${req.ip}`);
    console.warn(`   Ruta: ${req.originalUrl}`);
    console.warn(`   Fecha: ${new Date().toISOString()}`);
    
    res.status(404).json({
      success: false,
      message: 'Endpoint no encontrado'
    });
  });
  
  module.exports = router;
  // Salir temprano si no está habilitado
  return;
}

// ============================================
// ADVERTENCIA EN PRODUCCIÓN
// ============================================

if (IS_PRODUCTION) {
  console.warn('⚠️⚠️⚠️ ADVERTENCIA ⚠️⚠️⚠️');
  console.warn('Funciones administrativas de facturas HABILITADAS en PRODUCCIÓN');
  console.warn('Esto es un riesgo de seguridad. Deshabilita con ENABLE_ADMIN_FUNCTIONS=false');
  console.warn('⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️');
}

// Aplicar logging a todas las rutas admin
router.use(auditLog);

// ============================================
// RUTAS PROTEGIDAS - REQUIEREN AUTENTICACIÓN
// ============================================

/**
 * @route   POST /api/facturas/admin/crear-con-fecha
 * @desc    Crear factura con fecha de vencimiento personalizada (para pruebas)
 * @access  Privado (requiere rol de administrador o encargado)
 * @security Solo disponible si ENABLE_ADMIN_FUNCTIONS=true
 */
router.post(
  '/crear-con-fecha',
  authMiddleware,
  requireRole('admin', 'encargado'),
  facturaAdminController.createFacturaConFechaPersonalizada
);

/**
 * @route   PUT /api/facturas/admin/:facturaId/modificar-fecha
 * @desc    Modificar fecha de vencimiento de una factura existente
 * @access  Privado (requiere contraseña administrativa)
 * @security Requiere contraseña adicional + Solo admin
 */
router.put(
  '/:facturaId/modificar-fecha',
  authMiddleware,
  requireRole('admin'),
  facturaAdminController.modificarFechaVencimiento
);

/**
 * @route   POST /api/facturas/admin/crear-lote-prueba
 * @desc    Crear lote de facturas de prueba con diferentes estados
 * @access  Privado (requiere rol de administrador)
 * @security Solo para pruebas y desarrollo
 */
router.post(
  '/crear-lote-prueba',
  authMiddleware,
  requireRole('admin'),
  facturaAdminController.crearLoteFacturasPrueba
);

/**
 * @route   POST /api/facturas/admin/generar-hash
 * @desc    Generar hash de contraseña para uso administrativo
 * @access  Privado (solo en desarrollo)
 * @security Esta ruta NUNCA está disponible en producción
 */
if (process.env.NODE_ENV === 'development') {
  router.post(
    '/generar-hash',
    authMiddleware,
    requireRole('admin'),
    facturaAdminController.generarHashPassword
  );
} else {
  // En producción, devolver 404 si intentan acceder
  router.post('/generar-hash', (req, res) => {
    console.error('🚨 Intento de acceso a /generar-hash en producción');
    res.status(404).json({
      success: false,
      message: 'Endpoint no disponible en producción'
    });
  });
}

// ============================================
// INFORMACIÓN DE ESTADO (para debugging)
// ============================================

/**
 * @route   DELETE /api/facturas/admin/:facturaId/eliminar
 * @desc    Eliminar una factura con autenticación administrativa
 * @access  Privado (requiere contraseña administrativa)
 * @security Requiere contraseña adicional + Solo admin
 * @body    { password, motivo, forzarEliminacion }
 */
router.delete(
  '/:facturaId/eliminar',
  authMiddleware,
  requireRole('admin'),
  facturaAdminController.eliminarFactura
);

/**
 * @route   POST /api/facturas/admin/eliminar-multiples
 * @desc    Eliminar múltiples facturas a la vez
 * @access  Privado (requiere contraseña administrativa)
 * @security Requiere contraseña adicional + Solo admin
 * @body    { facturaIds: [], password, motivo }
 */
router.post(
  '/eliminar-multiples',
  authMiddleware,
  requireRole('admin'),
  facturaAdminController.eliminarFacturasMultiples
);

/**
 * @route   GET /api/facturas/admin/status
 * @desc    Verificar si las funciones admin están habilitadas
 * @access  Privado (requiere autenticación)
 */
router.get(
  '/status',
  authMiddleware,
  requireRole('admin'),
  (req, res) => {
    res.json({
      success: true,
      data: {
        enabled: ADMIN_FUNCTIONS_ENABLED,
        environment: process.env.NODE_ENV,
        warning: IS_PRODUCTION ? 'Funciones admin activas en PRODUCCIÓN - Deshabilitar después de usar' : null
      }
    });
  }
);

module.exports = router;
