/**
 * Script para corregir el rol del usuario admin
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function corregirRolAdmin() {
  try {
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar el usuario admin
    const adminUser = await User.findOne({ username: 'admin' });

    if (!adminUser) {
      console.log('❌ No se encontró el usuario "admin"');
      await mongoose.connection.close();
      return;
    }

    console.log('\n👤 Usuario encontrado:');
    console.log(`  Username: ${adminUser.username}`);
    console.log(`  Rol actual: ${adminUser.role}`);

    // Actualizar el rol a admin
    adminUser.role = 'admin';
    await adminUser.save();

    console.log('\n✅ Rol actualizado exitosamente');
    console.log(`  Nuevo rol: ${adminUser.role}`);

    // Verificar la actualización
    const verificacion = await User.findOne({ username: 'admin' });
    console.log('\n✔️  Verificación:');
    console.log(`  Username: ${verificacion.username}`);
    console.log(`  Rol: ${verificacion.role}`);
    console.log(`  Estado: ${verificacion.estado}`);

    await mongoose.connection.close();
    console.log('\n✅ Desconectado de MongoDB');
    console.log('\n🎉 El usuario admin ahora tiene rol de administrador');
    console.log('   Puedes iniciar sesión y usar las funciones administrativas');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

corregirRolAdmin();
