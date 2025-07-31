// backend/routes/lectura.routes.js
const express = require('express');
const router = express.Router();
const lecturaController = require('../controllers/lectura.controller');
const { authMiddleware } = require('../middlewares/auth.middleware'); // ✅ Extraer función

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

/**
 * @route GET /api/lecturas
 * @desc Obtener todas las lecturas con filtros opcionales
 * @query {string} clienteId - ID del cliente (opcional)
 * @query {string} estado - Estado de la lectura: pendiente, procesada, facturada, corregida (opcional)
 * @query {string} fechaInicio - Fecha de inicio para filtrar (opcional)
 * @query {string} fechaFin - Fecha de fin para filtrar (opcional)
 * @query {number} page - Página actual (default: 1)
 * @query {number} limit - Documentos por página (default: 50)
 * @query {string} sortBy - Campo para ordenar (default: fechaLectura)
 * @query {string} sortOrder - Orden: asc, desc (default: desc)
 * @access Private
 */
router.get('/', lecturaController.getLecturas);

/**
 * @route GET /api/lecturas/pendientes
 * @desc Obtener lecturas pendientes de procesar
 * @access Private
 */
router.get('/pendientes', lecturaController.getLecturasPendientes);

/**
 * @route GET /api/lecturas/periodo
 * @desc Obtener lecturas por período específico
 * @query {string} fechaInicio - Fecha de inicio (requerido)
 * @query {string} fechaFin - Fecha de fin (requerido)
 * @query {string} clienteId - ID del cliente (opcional)
 * @access Private
 */
router.get('/periodo', lecturaController.getLecturasPorPeriodo);

/**
 * @route GET /api/lecturas/cliente/:clienteId/ultima
 * @desc Obtener la última lectura de un cliente
 * @param {string} clienteId - ID del cliente
 * @access Private
 */
router.get('/cliente/:clienteId/ultima', lecturaController.getUltimaLectura);

/**
 * @route GET /api/lecturas/cliente/:clienteId/estadisticas
 * @desc Obtener estadísticas de consumo de un cliente
 * @param {string} clienteId - ID del cliente
 * @query {number} meses - Número de meses para el cálculo (default: 6)
 * @access Private
 */
router.get('/cliente/:clienteId/estadisticas', lecturaController.getEstadisticasConsumo);

/**
 * @route GET /api/lecturas/:id
 * @desc Obtener una lectura por ID
 * @param {string} id - ID de la lectura
 * @access Private
 */
router.get('/:id', lecturaController.getLecturaById);

/**
 * @route POST /api/lecturas
 * @desc Crear una nueva lectura
 * @body {string} clienteId - ID del cliente (requerido)
 * @body {number} lecturaAnterior - Lectura anterior del contador (requerido)
 * @body {number} lecturaActual - Lectura actual del contador (requerido)
 * @body {string} fechaLectura - Fecha de la lectura (requerido)
 * @body {string} periodoInicio - Fecha de inicio del período (requerido)
 * @body {string} periodoFin - Fecha de fin del período (requerido)
 * @body {string} observaciones - Observaciones adicionales (opcional)
 * @body {boolean} esEstimada - Si es una lectura estimada (opcional)
 * @body {string} motivoEstimacion - Motivo de estimación si aplica (opcional)
 * @body {string} tipoLectura - Tipo: normal, estimada, correccion (opcional)
 * @access Private
 */
router.post('/', lecturaController.createLectura);

/**
 * @route PUT /api/lecturas/:id/procesar
 * @desc Marcar lectura como procesada
 * @param {string} id - ID de la lectura
 * @access Private
 */
router.put('/:id/procesar', lecturaController.procesarLectura);

/**
 * @route PUT /api/lecturas/:id/corregir
 * @desc Corregir una lectura
 * @param {string} id - ID de la lectura
 * @body {number} nuevaLecturaActual - Nueva lectura actual (requerido)
 * @body {string} motivo - Motivo de la corrección (requerido)
 * @access Private
 */
router.put('/:id/corregir', lecturaController.corregirLectura);

/**
 * @route PUT /api/lecturas/:id/anomalia
 * @desc Agregar anomalía a una lectura
 * @param {string} id - ID de la lectura
 * @body {string} tipo - Tipo de anomalía: fuga, contador_dañado, lectura_estimada, acceso_denegado, otro (requerido)
 * @body {string} descripcion - Descripción de la anomalía (requerido)
 * @access Private
 */
router.put('/:id/anomalia', lecturaController.agregarAnomalia);

module.exports = router;
