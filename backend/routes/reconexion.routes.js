const express = require('express');
const router = express.Router();
const reconexionController = require('../controllers/reconexion.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

/**
 * @route GET /api/reconexion/opciones/:clienteId
 * @desc Obtener opciones de reconexión para un cliente
 */
router.get('/opciones/:clienteId', reconexionController.obtenerOpcionesReconexion);

/**
 * @route POST /api/reconexion/procesar/:clienteId
 * @desc Procesar reconexión de un cliente
 */
router.post('/procesar/:clienteId', reconexionController.procesarReconexion);

/**
 * @route GET /api/reconexion/lista-priorizada
 * @desc Obtener lista de clientes que requieren reconexión (≥2 meses mora)
 */
router.get('/lista-priorizada', reconexionController.obtenerListaPriorizada);

module.exports = router;
