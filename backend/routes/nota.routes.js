// backend/routes/nota.routes.js
const express = require('express');
const router = express.Router();
const notaController = require('../controllers/nota.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

/**
 * Rutas para Notas de Crédito y Débito
 * Todas las rutas requieren autenticación
 */

// @route   GET /api/notas
// @desc    Obtener todas las notas con filtros opcionales
// @access  Private
router.get('/', authMiddleware, notaController.getNotas);

// @route   GET /api/notas/:id
// @desc    Obtener una nota por ID
// @access  Private
router.get('/:id', authMiddleware, notaController.getNotaById);

// @route   POST /api/notas/credito
// @desc    Crear una nota de crédito (NCRE)
// @access  Private
router.post('/credito', authMiddleware, notaController.crearNotaCredito);

// @route   POST /api/notas/debito
// @desc    Crear una nota de débito (NDEB)
// @access  Private
router.post('/debito', authMiddleware, notaController.crearNotaDebito);

// @route   PUT /api/notas/:id/anular
// @desc    Anular una nota (crédito o débito)
// @access  Private
router.put('/:id/anular', authMiddleware, notaController.anularNota);

module.exports = router;
