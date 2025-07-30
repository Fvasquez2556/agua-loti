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

// Middleware de autenticación (opcional - si quieres proteger las rutas)
// const { authMiddleware } = require('../middleware/auth.middleware');

// Rutas públicas (o protegidas si descometas el middleware)
router.get('/estadisticas', getEstadisticas);
router.get('/', getClientes);
router.get('/:id', getClienteById);
router.post('/', createCliente);
router.put('/:id', updateCliente);
router.delete('/:id', deleteCliente);
router.patch('/:id/reactivar', reactivarCliente);

module.exports = router;