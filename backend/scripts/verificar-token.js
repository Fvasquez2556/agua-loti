/**
 * Script para decodificar y verificar un token JWT
 * Uso: node backend/scripts/verificar-token.js "TU_TOKEN_AQUI"
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

async function verificarToken() {
  try {
    const token = process.argv[2];

    if (!token) {
      console.log('❌ Por favor proporciona un token');
      console.log('Uso: node backend/scripts/verificar-token.js "TU_TOKEN_AQUI"');
      console.log('\nPuedes obtener el token desde:');
      console.log('  1. Consola del navegador: sessionStorage.getItem("auth_token")');
      console.log('  2. DevTools > Application > Session Storage > auth_token');
      return;
    }

    console.log('🔍 Analizando token...\n');

    // Decodificar sin verificar (para ver el contenido)
    const decoded = jwt.decode(token);
    console.log('📄 Contenido del token (sin verificar):');
    console.log(JSON.stringify(decoded, null, 2));

    // Verificar con la clave secreta
    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);
      console.log('\n✅ Token válido y verificado');
      console.log('\n📊 Información del usuario en el token:');
      console.log(`  ID: ${verified.id}`);
      console.log(`  Username: ${verified.username || 'No incluido'}`);
      console.log(`  Role: ${verified.role || 'No incluido'}`);
      console.log(`  Emitido: ${new Date(verified.iat * 1000).toLocaleString('es-GT')}`);
      console.log(`  Expira: ${new Date(verified.exp * 1000).toLocaleString('es-GT')}`);

      // Conectar a la base de datos para verificar el usuario actual
      await mongoose.connect(process.env.MONGO_URI);
      const user = await User.findById(verified.id);

      if (user) {
        console.log('\n👤 Usuario actual en base de datos:');
        console.log(`  Username: ${user.username}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Estado: ${user.estado}`);

        if (user.role !== verified.role) {
          console.log('\n⚠️  ADVERTENCIA: El rol en el token no coincide con el de la base de datos');
          console.log(`  Token dice: ${verified.role}`);
          console.log(`  BD dice: ${user.role}`);
          console.log('\n💡 Solución: Cierra sesión e inicia sesión nuevamente para actualizar el token');
        }
      } else {
        console.log('\n❌ Usuario no encontrado en la base de datos');
      }

      await mongoose.connection.close();

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.log('\n❌ Token expirado');
        console.log(`   Expiró: ${new Date(error.expiredAt).toLocaleString('es-GT')}`);
      } else if (error.name === 'JsonWebTokenError') {
        console.log('\n❌ Token inválido:', error.message);
      } else {
        throw error;
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verificarToken();
