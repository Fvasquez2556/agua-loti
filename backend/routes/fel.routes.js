const express = require('express');
const router = express.Router();
const felController = require('../controllers/fel.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

/**
 * @route GET /api/fel/estado
 * @desc Verifica el estado de configuración de FEL
 */
router.get('/estado', felController.verificarEstado);

/**
 * @route POST /api/fel/certificar/:facturaId
 * @desc Certifica una factura (PENDIENTE DE IMPLEMENTACIÓN)
 */
router.post('/certificar/:facturaId', felController.certificarFactura);

module.exports = router;
