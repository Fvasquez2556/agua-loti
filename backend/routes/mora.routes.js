const express = require('express');
const router = express.Router();
const moraController = require('../controllers/mora.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

/**
 * @route GET /api/mora/cliente/:clienteId
 * @desc Obtener mora acumulada de un cliente
 */
router.get('/cliente/:clienteId', moraController.obtenerMoraCliente);

/**
 * @route GET /api/mora/cliente/:clienteId/verificar-corte
 * @desc Verificar si el cliente requiere corte de servicio
 */
router.get('/cliente/:clienteId/verificar-corte', moraController.verificarCorteServicio);

module.exports = router;
