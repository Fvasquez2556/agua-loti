/**
 * Script para verificar y corregir el usuario administrador
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function verificarUsuarioAdmin() {
  try {
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar todos los usuarios
    const usuarios = await User.find({});

    console.log('\n📋 USUARIOS EN LA BASE DE DATOS:');
    console.log('='.repeat(80));

    if (usuarios.length === 0) {
      console.log('⚠️  No hay usuarios en la base de datos');
      await mongoose.connection.close();
      return;
    }

    usuarios.forEach((usuario, index) => {
      console.log(`\nUsuario #${index + 1}:`);
      console.log(`  ID: ${usuario._id}`);
      console.log(`  Username: ${usuario.username}`);
      console.log(`  Nombres: ${usuario.nombres || 'N/A'}`);
      console.log(`  Email: ${usuario.email || 'N/A'}`);
      console.log(`  Rol: ${usuario.role || 'N/A'}`);
      console.log(`  Estado: ${usuario.estado || 'N/A'}`);
      console.log(`  Creado: ${usuario.createdAt || 'N/A'}`);
    });

    console.log('\n' + '='.repeat(80));

    // Buscar específicamente el usuario admin
    const adminUser = await User.findOne({ username: 'admin' });

    if (!adminUser) {
      console.log('\n⚠️  No se encontró el usuario "admin"');
    } else {
      console.log('\n👤 USUARIO ADMIN ENCONTRADO:');
      console.log(`  ID: ${adminUser._id}`);
      console.log(`  Username: ${adminUser.username}`);
      console.log(`  Rol actual: ${adminUser.role}`);
      console.log(`  Estado: ${adminUser.estado}`);

      if (adminUser.role !== 'admin') {
        console.log('\n⚠️  EL USUARIO NO TIENE ROL DE ADMINISTRADOR');
        console.log('   Rol actual:', adminUser.role);
        console.log('   Rol esperado: admin');
        console.log('\n¿Deseas corregir esto?');
        console.log('   Ejecuta: node backend/scripts/corregir-rol-admin.js');
      } else {
        console.log('\n✅ El usuario tiene rol de administrador correcto');
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Desconectado de MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verificarUsuarioAdmin();
