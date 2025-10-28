// backend/routes/factura.admin.routes.js
/**
 * Rutas para funciones administrativas de facturas
 * Incluye endpoints especiales para pruebas y modificación de fechas
 */

const express = require('express');
const router = express.Router();
const facturaAdminController = require('../controllers/factura.admin.controller');
const { protect, authorize } = require('../middleware/auth');

// ============================================
// RUTAS PROTEGIDAS - REQUIEREN AUTENTICACIÓN
// ============================================

/**
 * @route   POST /api/facturas/admin/crear-con-fecha
 * @desc    Crear factura con fecha de vencimiento personalizada (para pruebas)
 * @access  Privado (requiere rol de administrador o encargado)
 */
router.post(
  '/crear-con-fecha',
  protect,
  authorize('admin', 'encargado'),
  facturaAdminController.createFacturaConFechaPersonalizada
);

/**
 * @route   PUT /api/facturas/admin/:facturaId/modificar-fecha
 * @desc    Modificar fecha de vencimiento de una factura existente
 * @access  Privado (requiere contraseña administrativa)
 */
router.put(
  '/:facturaId/modificar-fecha',
  protect,
  authorize('admin'),
  facturaAdminController.modificarFechaVencimiento
);

/**
 * @route   POST /api/facturas/admin/crear-lote-prueba
 * @desc    Crear lote de facturas de prueba con diferentes estados
 * @access  Privado (requiere rol de administrador)
 */
router.post(
  '/crear-lote-prueba',
  protect,
  authorize('admin'),
  facturaAdminController.crearLoteFacturasPrueba
);

/**
 * @route   POST /api/facturas/admin/generar-hash
 * @desc    Generar hash de contraseña para uso administrativo
 * @access  Privado (solo en desarrollo)
 * @note    Esta ruta debe deshabilitarse en producción
 */
if (process.env.NODE_ENV === 'development') {
  router.post(
    '/generar-hash',
    protect,
    authorize('admin'),
    facturaAdminController.generarHashPassword
  );
}

module.exports = router;
