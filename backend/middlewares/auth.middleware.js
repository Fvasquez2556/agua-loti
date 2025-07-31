// backend/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware de autenticación para validar JWT tokens
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      console.log(`❌ [${req.method} ${req.path}] Token de autorización faltante`);
      return res.status(401).json({
        success: false,
        message: 'Token de autorización requerido'
      });
    }

    // Verificar formato del token (Bearer TOKEN)
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      console.log(`❌ [${req.method} ${req.path}] Formato de token inválido`);
      return res.status(401).json({
        success: false,
        message: 'Token no válido'
      });
    }

    // Verificar y decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuario en la base de datos
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      console.log(`❌ [${req.method} ${req.path}] Usuario no encontrado para ID: ${decoded.id}`);
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    if (user.estado !== 'activo') {
      console.log(`❌ [${req.method} ${req.path}] Usuario inactivo: ${user.username}`);
      return res.status(401).json({
        success: false,
        message: 'Usuario inactivo'
      });
    }

    // Log de éxito (comentar en producción)
    console.log(`✅ [${req.method} ${req.path}] Autenticación exitosa para: ${user.username}`);

    // Agregar usuario al request para uso en controladores
    req.user = user;
    next();

  } catch (error) {
    console.error(`❌ [${req.method} ${req.path}] Error en middleware de autenticación:`, error.message);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Middleware para validar roles específicos
 * @param {...string} roles - Roles permitidos
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Permisos insuficientes'
      });
    }

    next();
  };
};

/**
 * Middleware opcional de autenticación (no falla si no hay token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return next();
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (user && user.estado === 'activo') {
      req.user = user;
    }

    next();

  } catch (error) {
    // En autenticación opcional, continuar sin usuario si hay error
    next();
  }
};

module.exports = {
  authMiddleware,
  requireRole,
  optionalAuth
};
