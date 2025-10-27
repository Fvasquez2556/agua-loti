// backend/routes/pago.routes.js
const express = require('express');
const router = express.Router();
const pagoController = require('../controllers/pago.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

/**
 * @route GET /api/pagos
 * @desc Obtener todos los pagos con filtros opcionales
 * @query {string} clienteId - ID del cliente (opcional)
 * @query {string} facturaId - ID de la factura (opcional)
 * @query {string} metodoPago - Método de pago: efectivo, transferencia, deposito, cheque (opcional)
 * @query {string} estado - Estado del pago: procesado, cancelado, pendiente_confirmacion (opcional)
 * @query {string} fechaInicio - Fecha de inicio para filtrar (opcional)
 * @query {string} fechaFin - Fecha de fin para filtrar (opcional)
 * @query {number} page - Página actual (default: 1)
 * @query {number} limit - Documentos por página (default: 50)
 * @query {string} sortBy - Campo para ordenar (default: fechaPago)
 * @query {string} sortOrder - Orden: asc, desc (default: desc)
 * @access Private
 */
router.get('/', pagoController.getPagos);

/**
 * @route GET /api/pagos/resumen
 * @desc Obtener resumen de pagos (estadísticas)
 * @query {string} fechaInicio - Fecha de inicio para el resumen (opcional)
 * @query {string} fechaFin - Fecha de fin para el resumen (opcional)
 * @query {string} proyecto - Proyecto para filtrar (opcional)
 * @access Private
 */
router.get('/resumen', pagoController.getResumenPagos);

/**
 * @route GET /api/pagos/historial
 * @desc Obtener historial de pagos recientes
 * @query {string} clienteId - ID del cliente (opcional)
 * @query {string} metodoPago - Método de pago (opcional)
 * @query {string} fechaInicio - Fecha de inicio (opcional)
 * @query {string} fechaFin - Fecha de fin (opcional)
 * @query {number} page - Página actual (default: 1)
 * @query {number} limit - Documentos por página (default: 20)
 * @access Private
 */
router.get('/historial', pagoController.getHistorialPagos);

/**
 * @route GET /api/pagos/facturas-pendientes/resumen
 * @desc Obtener resumen de facturas pendientes
 * @query {string} clienteId - ID del cliente (opcional)
 * @query {string} proyecto - Proyecto para filtrar (opcional)
 * @access Private
 */
router.get('/facturas-pendientes/resumen', pagoController.getResumenFacturasPendientes);

/**
 * @route GET /api/pagos/facturas-pendientes/:clienteId
 * @desc Obtener facturas pendientes de un cliente específico
 * @param {string} clienteId - ID del cliente
 * @access Private
 */
router.get('/facturas-pendientes/:clienteId', pagoController.getFacturasPendientesCliente);

/**
 * @route GET /api/pagos/:id
 * @desc Obtener un pago por ID
 * @param {string} id - ID del pago
 * @access Private
 */
router.get('/:id', pagoController.getPagoById);

/**
 * @route POST /api/pagos
 * @desc Registrar un nuevo pago
 * @body {string} facturaId - ID de la factura (requerido)
 * @body {string} fechaPago - Fecha del pago (opcional, default: hoy)
 * @body {string} metodoPago - Método de pago: efectivo, transferencia, deposito, cheque (requerido)
 * @body {string} referenciaPago - Referencia del pago (opcional)
 * @body {string} bancoCheque - Banco del cheque (requerido si metodoPago es 'cheque')
 * @body {string} numeroCheque - Número del cheque (requerido si metodoPago es 'cheque')
 * @body {string} observaciones - Observaciones adicionales (opcional)
 * @access Private
 */
router.post('/', pagoController.registrarPago);

/**
 * @route PUT /api/pagos/:id/cancelar
 * @desc Cancelar un pago
 * @param {string} id - ID del pago
 * @body {string} motivo - Motivo de cancelación (opcional)
 * @access Private
 */
router.put('/:id/cancelar', pagoController.cancelarPago);

/**
 * @route POST /api/pagos/:id/regenerar-dte
 * @desc Regenerar DTE para un pago
 * @param {string} id - ID del pago
 * @access Private
 */
router.post('/:id/regenerar-dte', pagoController.regenerarDTE);

/**
 * @route GET /api/pagos/:id/ticket
 * @desc Generar y descargar ticket de pago en PDF
 * @param {string} id - ID del pago
 * @access Private
 */
router.get('/:id/ticket', pagoController.generarTicketPago);

module.exports = router;
