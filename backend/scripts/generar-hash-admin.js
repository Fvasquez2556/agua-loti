/**
 * Script para generar hash de contraseña administrativa
 * Uso: node backend/scripts/generar-hash-admin.js "tu_contraseña"
 */

const bcrypt = require('bcryptjs');

async function generarHash() {
  const password = process.argv[2];

  if (!password) {
    console.log('❌ Por favor proporciona la contraseña');
    console.log('Uso: node backend/scripts/generar-hash-admin.js "tu_contraseña"');
    console.log('\nEjemplo:');
    console.log('  node backend/scripts/generar-hash-admin.js "Hola_/2090"');
    return;
  }

  if (password.length < 8) {
    console.log('⚠️  Advertencia: Se recomienda una contraseña de al menos 8 caracteres');
  }

  console.log('\n🔐 Generando hash para la contraseña...\n');

  try {
    const hash = await bcrypt.hash(password, 10);

    console.log('✅ Hash generado exitosamente:\n');
    console.log(hash);
    console.log('\n📝 Copia este hash y actualiza tu archivo .env:');
    console.log(`\nADMIN_FECHA_PASSWORD=${hash}`);
    console.log('\n⚠️  IMPORTANTE: Guarda esta contraseña en un lugar seguro');
    console.log(`   Contraseña: ${password}`);
    console.log(`   Hash: ${hash}`);
  } catch (error) {
    console.error('\n❌ Error al generar hash:', error.message);
  }
}

generarHash();
