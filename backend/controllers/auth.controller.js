// backend/controllers/auth.controller.js
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    console.log(`🔐 Intento de login para usuario: ${username}`);
    
    const user = await User.findOne({ username }).select('+password');
    if (!user) {
      console.log(`❌ Usuario no encontrado: ${username}`);
      return res.status(400).json({ 
        success: false,
        message: "Usuario no encontrado." 
      });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.log(`❌ Contraseña incorrecta para usuario: ${username}`);
      return res.status(400).json({ 
        success: false,
        message: "Contraseña incorrecta." 
      });
    }

    // Verificar que el usuario esté activo
    if (user.estado !== 'activo') {
      console.log(`❌ Usuario inactivo: ${username}`);
      return res.status(400).json({ 
        success: false,
        message: "Usuario inactivo. Contacte al administrador." 
      });
    }

    const token = jwt.sign(
      { 
        id: user._id, 
        username: user.username,
        role: user.role 
      }, 
      process.env.JWT_SECRET, 
      {
        expiresIn: "1d",
      }
    );

    // Preparar datos del usuario para enviar (sin password)
    const userData = {
      id: user._id,
      username: user.username,
      role: user.role,
      estado: user.estado
    };

    console.log(`✅ Login exitoso para usuario: ${username}`);

    res.json({ 
      success: true,
      token,
      user: userData,
      message: "Login exitoso"
    });
    
  } catch (err) {
    console.error('❌ Error en login:', err);
    res.status(500).json({ 
      success: false,
      message: "Error en el servidor." 
    });
  }
};