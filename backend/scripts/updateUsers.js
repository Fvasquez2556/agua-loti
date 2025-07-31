// backend/scripts/updateUsers.js
require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');

async function updateUsers() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Actualizar todos los usuarios que no tengan el campo estado
    const result = await User.updateMany(
      { estado: { $exists: false } }, // Usuarios sin campo estado
      { $set: { estado: 'activo' } }   // Agregar estado activo
    );

    console.log(`📝 Usuarios actualizados: ${result.modifiedCount}`);

    // Mostrar todos los usuarios
    const users = await User.find({}, 'username role estado');
    console.log('👥 Usuarios en la base de datos:');
    users.forEach(user => {
      console.log(`  - ${user.username} (${user.role}) - Estado: ${user.estado || 'sin estado'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Desconectado de MongoDB');
  }
}

updateUsers();
