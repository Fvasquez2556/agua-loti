// backend/scripts/seedDatabase.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../../.env' });

// Modelos
const User = require('../models/User');
const Cliente = require('../models/cliente.model');

// Datos de ejemplo para usuarios
const usuariosEjemplo = [
  {
    username: 'admin',
    password: 'admin123',
    role: 'admin'
  },
  {
    username: 'empleado',
    password: 'empleado123', 
    role: 'empleado'
  }
];

// Datos de ejemplo para clientes
const clientesEjemplo = [
  {
    nombres: 'Juan Carlos',
    apellidos: 'García López',
    dpi: '1234567890123',
    contador: 'CTR-001',
    lote: 'LT-001',
    proyecto: 'san-miguel',
    whatsapp: '12345678',
    correoElectronico: 'juan.garcia@email.com',
    estado: 'activo'
  },
  {
    nombres: 'María Elena',
    apellidos: 'Rodríguez Pérez',
    dpi: '2345678901234',
    contador: 'CTR-002',
    lote: 'LT-002',
    proyecto: 'santa-clara-1',
    whatsapp: '23456789',
    correoElectronico: 'maria.rodriguez@email.com',
    estado: 'activo'
  },
  {
    nombres: 'Carlos Antonio',
    apellidos: 'Morales Díaz',
    dpi: '3456789012345',
    contador: 'CTR-003',
    lote: 'LT-003',
    proyecto: 'cabanas-1',
    whatsapp: '34567890',
    correoElectronico: 'carlos.morales@email.com',
    estado: 'activo'
  },
  {
    nombres: 'Ana Sofía',
    apellidos: 'Herrera González',
    dpi: '4567890123456',
    contador: 'CTR-004',
    lote: 'LT-004',
    proyecto: 'santa-clara-2',
    whatsapp: '45678901',
    correoElectronico: 'ana.herrera@email.com',
    estado: 'activo'
  },
  {
    nombres: 'Luis Miguel',
    apellidos: 'Castillo Ruiz',
    dpi: '5678901234567',
    contador: 'CTR-005',
    lote: 'LT-005',
    proyecto: 'cabanas-2',
    whatsapp: '56789012',
    correoElectronico: 'luis.castillo@email.com',
    estado: 'activo'
  },
  {
    nombres: 'Carmen Rosa',
    apellidos: 'Vásquez Torres',
    dpi: '6789012345678',
    contador: 'CTR-006',
    lote: 'LT-006',
    proyecto: 'san-miguel',
    whatsapp: '67890123',
    correoElectronico: 'carmen.vasquez@email.com',
    estado: 'activo'
  },
  {
    nombres: 'Roberto',
    apellidos: 'Méndez Silva',
    dpi: '7890123456789',
    contador: 'CTR-007',
    lote: 'LT-007',
    proyecto: 'santa-clara-1',
    whatsapp: '78901234',
    correoElectronico: 'roberto.mendez@email.com',
    estado: 'activo'
  },
  {
    nombres: 'Patricia',
    apellidos: 'Jiménez Ramos',
    dpi: '8901234567890',
    contador: 'CTR-008',
    lote: 'LT-008',
    proyecto: 'cabanas-1',
    whatsapp: '89012345',
    correoElectronico: 'patricia.jimenez@email.com',
    estado: 'activo'
  }
];

async function conectarDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
}

async function crearUsuarios() {
  try {
    console.log('📝 Creando usuarios de ejemplo...');
    
    // Verificar si ya existen usuarios
    const usuariosExistentes = await User.countDocuments();
    if (usuariosExistentes > 0) {
      console.log('ℹ️  Ya existen usuarios en la base de datos. Saltando creación de usuarios.');
      return;
    }

    // Crear usuarios con contraseñas hasheadas
    for (const userData of usuariosEjemplo) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
      
      const usuario = new User({
        username: userData.username,
        password: hashedPassword,
        role: userData.role
      });

      await usuario.save();
      console.log(`✅ Usuario creado: ${userData.username} (${userData.role})`);
    }

    console.log('🎉 Usuarios de ejemplo creados exitosamente');
  } catch (error) {
    console.error('❌ Error al crear usuarios:', error);
  }
}

async function crearClientes() {
  try {
    console.log('👥 Creando clientes de ejemplo...');
    
    // Verificar si ya existen clientes
    const clientesExistentes = await Cliente.countDocuments();
    if (clientesExistentes > 0) {
      console.log('ℹ️  Ya existen clientes en la base de datos. Saltando creación de clientes.');
      return;
    }

    // Crear clientes
    const clientesCreados = await Cliente.insertMany(clientesEjemplo);
    console.log(`✅ ${clientesCreados.length} clientes creados exitosamente`);

    // Mostrar resumen
    const resumenPorProyecto = await Cliente.aggregate([
      {
        $group: {
          _id: '$proyecto',
          cantidad: { $sum: 1 }
        }
      },
      {
        $sort: { cantidad: -1 }
      }
    ]);

    console.log('\n📊 Resumen de clientes por proyecto:');
    resumenPorProyecto.forEach(item => {
      console.log(`   ${item._id}: ${item.cantidad} clientes`);
    });

  } catch (error) {
    console.error('❌ Error al crear clientes:', error);
  }
}

async function verificarDatos() {
  try {
    console.log('\n🔍 Verificando datos creados...');
    
    const totalUsuarios = await User.countDocuments();
    const totalClientes = await Cliente.countDocuments();
    const clientesActivos = await Cliente.countDocuments({ estado: 'activo' });

    console.log(`📈 Estadísticas:`);
    console.log(`   Usuarios: ${totalUsuarios}`);
    console.log(`   Clientes totales: ${totalClientes}`);
    console.log(`   Clientes activos: ${clientesActivos}`);

    // Mostrar usuarios creados
    const usuarios = await User.find().select('username role');
    console.log('\n👤 Usuarios disponibles:');
    usuarios.forEach(user => {
      console.log(`   ${user.username} (${user.role})`);
    });

    // Mostrar algunos clientes
    const algunosClientes = await Cliente.find().limit(3).select('nombres apellidos contador proyecto');
    console.log('\n👥 Algunos clientes creados:');
    algunosClientes.forEach(cliente => {
      console.log(`   ${cliente.nombres} ${cliente.apellidos} - ${cliente.contador} (${cliente.proyecto})`);
    });

  } catch (error) {
    console.error('❌ Error al verificar datos:', error);
  }
}

async function limpiarBaseDatos() {
  try {
    console.log('🧹 Limpiando base de datos...');
    
    await User.deleteMany({});
    await Cliente.deleteMany({});
    
    console.log('✅ Base de datos limpiada');
  } catch (error) {
    console.error('❌ Error al limpiar base de datos:', error);
  }
}

async function seedDatabase() {
  try {
    console.log('🌱 Iniciando seed de la base de datos...');
    console.log('=====================================\n');

    await conectarDB();
    
    // Verificar argumentos de línea de comandos
    const args = process.argv.slice(2);
    
    if (args.includes('--clean')) {
      await limpiarBaseDatos();
      console.log('\n✅ Base de datos limpiada. Saliendo...');
      process.exit(0);
    }

    await crearUsuarios();
    await crearClientes();
    await verificarDatos();

    console.log('\n🎉 Seed completado exitosamente!');
    console.log('\n📝 Credenciales de prueba:');
    console.log('   Usuario admin: admin / admin123');
    console.log('   Usuario empleado: empleado / empleado123');
    console.log('\n🌐 Puedes probar el sistema en: http://localhost:5000/api/clientes');
    
  } catch (error) {
    console.error('❌ Error general en seed:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n👋 Conexión a base de datos cerrada');
  }
}

// Ejecutar seed si es llamado directamente
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, crearUsuarios, crearClientes };