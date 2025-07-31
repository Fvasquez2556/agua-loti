// backend/routes/cliente.routes.js
const express = require('express');
const router = express.Router();
const {
  getClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
  reactivarCliente,
  getEstadisticas
} = require('../controllers/cliente.controller');

// Middleware de autenticación - ACTIVADO para proteger las rutas
const { authMiddleware } = require('../middlewares/auth.middleware');

// Rutas protegidas con autenticación
router.get('/estadisticas', authMiddleware, getEstadisticas);
router.get('/', authMiddleware, getClientes);
router.get('/:id', authMiddleware, getClienteById);
router.post('/', authMiddleware, createCliente);
router.put('/:id', authMiddleware, updateCliente);
router.delete('/:id', authMiddleware, deleteCliente);
router.patch('/:id/reactivar', authMiddleware, reactivarCliente);

module.exports = router;