/**
 * Script para verificar la contraseña administrativa
 * Uso: node backend/scripts/verificar-password-admin.js "tu_contraseña"
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');

async function verificarPassword() {
  const passwordInput = process.argv[2];

  if (!passwordInput) {
    console.log('❌ Por favor proporciona la contraseña a verificar');
    console.log('Uso: node backend/scripts/verificar-password-admin.js "tu_contraseña"');
    console.log('\nEjemplo:');
    console.log('  node backend/scripts/verificar-password-admin.js "Hola_/2090"');
    return;
  }

  const hashEnv = process.env.ADMIN_FECHA_PASSWORD;

  if (!hashEnv) {
    console.log('❌ No se encontró ADMIN_FECHA_PASSWORD en el archivo .env');
    return;
  }

  console.log('\n🔐 Verificando contraseña administrativa...\n');
  console.log(`Hash en .env: ${hashEnv.substring(0, 20)}...`);
  console.log(`Contraseña ingresada: ${passwordInput}`);

  try {
    const isMatch = await bcrypt.compare(passwordInput, hashEnv);

    if (isMatch) {
      console.log('\n✅ ¡CONTRASEÑA CORRECTA!');
      console.log('   La contraseña coincide con el hash almacenado');
    } else {
      console.log('\n❌ CONTRASEÑA INCORRECTA');
      console.log('   La contraseña NO coincide con el hash almacenado');
      console.log('\n💡 Posibles soluciones:');
      console.log('   1. Verifica que estés usando la contraseña correcta');
      console.log('   2. Genera un nuevo hash con la contraseña correcta:');
      console.log('      node backend/scripts/generar-hash-admin.js "tu_nueva_contraseña"');
    }
  } catch (error) {
    console.error('\n❌ Error al verificar:', error.message);
  }
}

verificarPassword();
