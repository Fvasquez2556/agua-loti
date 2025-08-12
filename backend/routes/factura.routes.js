// backend/routes/factura.routes.js
const express = require('express');
const router = express.Router();
const facturaController = require('../controllers/factura.controller');
const { authMiddleware } = require('../middlewares/auth.middleware'); // ✅ Extraer función

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

/**
 * @route GET /api/facturas
 * @desc Obtener todas las facturas con filtros opcionales
 * @query {string} clienteId - ID del cliente (opcional)
 * @query {string} estado - Estado de la factura: pendiente, pagada, vencida, anulada (opcional)
 * @query {string} fechaInicio - Fecha de inicio para filtrar (opcional)
 * @query {string} fechaFin - Fecha de fin para filtrar (opcional)
 * @query {number} page - Página actual (default: 1)
 * @query {number} limit - Documentos por página (default: 50)
 * @query {string} sortBy - Campo para ordenar (default: fechaEmision)
 * @query {string} sortOrder - Orden: asc, desc (default: desc)
 * @access Private
 */
router.get('/', facturaController.getFacturas);

/**
 * @route GET /api/facturas/resumen
 * @desc Obtener resumen de facturación
 * @query {string} fechaInicio - Fecha de inicio para el resumen (opcional)
 * @query {string} fechaFin - Fecha de fin para el resumen (opcional)
 * @access Private
 */
router.get('/resumen', facturaController.getResumenFacturacion);

/**
 * @route GET /api/facturas/dashboard/avanzadas
 * @desc Obtener estadísticas avanzadas para el dashboard
 * @access Private
 */
router.get('/dashboard/avanzadas', facturaController.getEstadisticasAvanzadas);

/**
 * @route GET /api/facturas/reportes/datos
 * @desc Obtener datos para reportes detallados
 * @query {string} tipo - Tipo de reporte: clientes, facturas, pagos, completo
 * @query {string} fechaInicio - Fecha de inicio para filtrar (opcional)
 * @query {string} fechaFin - Fecha de fin para filtrar (opcional)
 * @query {string} proyecto - Proyecto específico (opcional)
 * @access Private
 */
router.get('/reportes/datos', facturaController.getDatosReportes);

/**
 * @route GET /api/facturas/dashboard
 * @desc Obtener estadísticas generales para el dashboard
 * @access Private
 */
router.get('/dashboard', facturaController.getEstadisticasDashboard);

/**
 * @route GET /api/facturas/vencidas
 * @desc Obtener facturas vencidas
 * @access Private
 */
router.get('/vencidas', facturaController.getFacturasVencidas);

/**
 * @route GET /api/facturas/:id
 * @desc Obtener una factura por ID
 * @param {string} id - ID de la factura
 * @access Private
 */
router.get('/:id', facturaController.getFacturaById);

/**
 * @route POST /api/facturas
 * @desc Crear una nueva factura
 * @body {string} clienteId - ID del cliente (requerido)
 * @body {number} lecturaAnterior - Lectura anterior del contador (requerido)
 * @body {number} lecturaActual - Lectura actual del contador (requerido)
 * @body {string} fechaLectura - Fecha de la lectura (requerido)
 * @body {string} periodoInicio - Fecha de inicio del período (requerido)
 * @body {string} periodoFin - Fecha de fin del período (requerido)
 * @body {string} observaciones - Observaciones adicionales (opcional)
 * @access Private
 */
router.post('/', facturaController.createFactura);

/**
 * @route PUT /api/facturas/:id/pagar
 * @desc Marcar factura como pagada
 * @param {string} id - ID de la factura
 * @body {string} metodoPago - Método de pago: efectivo, deposito, transferencia, tarjeta (requerido)
 * @body {string} referenciaPago - Referencia del pago (opcional)
 * @body {string} fechaPago - Fecha del pago (opcional, default: hoy)
 * @access Private
 */
router.put('/:id/pagar', facturaController.marcarComoPagada);

/**
 * @route PUT /api/facturas/:id/anular
 * @desc Anular una factura
 * @param {string} id - ID de la factura
 * @body {string} motivo - Motivo de anulación (opcional)
 * @access Private
 */
router.put('/:id/anular', facturaController.anularFactura);

module.exports = router;
