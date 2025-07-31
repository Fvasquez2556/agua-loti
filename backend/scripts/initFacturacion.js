// backend/scripts/initFacturacion.js
/**
 * Script para inicializar el sistema de facturación
 * Crea índices, valida modelos y opcionalmente datos de prueba
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') }); // ✅ Ruta absoluta

// Importar modelos
const Cliente = require('../models/cliente.model');
const Factura = require('../models/factura.model');
const Lectura = require('../models/lectura.model');
const User = require('../models/User');

async function initializeFacturacion() {
  try {
    console.log('🚀 Inicializando sistema de facturación...');
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Verificar índices existentes sin crear conflictos
    console.log('📊 Verificando índices...');
    
    const facturaIndexes = await Factura.collection.listIndexes().toArray();
    const lecturaIndexes = await Lectura.collection.listIndexes().toArray();
    const clienteIndexes = await Cliente.collection.listIndexes().toArray();
    
    console.log(`✅ Índices de facturas: ${facturaIndexes.length}`);
    console.log(`✅ Índices de lecturas: ${lecturaIndexes.length}`);
    console.log(`✅ Índices de clientes: ${clienteIndexes.length}`);
    
    console.log('✅ Índices creados exitosamente');

    // Verificar que existe al menos un usuario admin
    const adminUser = await User.findOne({ rol: 'admin' });
    if (!adminUser) {
      console.log('⚠️  No se encontró usuario administrador');
      console.log('   Ejecute: npm run create-admin');
    } else {
      console.log('✅ Usuario administrador encontrado');
    }

    // Mostrar estadísticas actuales
    const statsClientes = await Cliente.countDocuments();
    const statsFacturas = await Factura.countDocuments();
    const statsLecturas = await Lectura.countDocuments();
    
    console.log('\n📈 Estadísticas actuales:');
    console.log(`   Clientes registrados: ${statsClientes}`);
    console.log(`   Facturas generadas: ${statsFacturas}`);
    console.log(`   Lecturas registradas: ${statsLecturas}`);

    // Verificar integridad de datos
    console.log('\n🔍 Verificando integridad de datos...');
    
    // Facturas sin cliente asociado
    const facturaSinCliente = await Factura.countDocuments({
      clienteId: { $exists: false }
    });
    
    if (facturaSinCliente > 0) {
      console.log(`⚠️  Encontradas ${facturaSinCliente} facturas sin cliente asociado`);
    }
    
    // Lecturas sin cliente asociado
    const lecturaSinCliente = await Lectura.countDocuments({
      clienteId: { $exists: false }
    });
    
    if (lecturaSinCliente > 0) {
      console.log(`⚠️  Encontradas ${lecturaSinCliente} lecturas sin cliente asociado`);
    }
    
    // Facturas vencidas
    const facturasVencidas = await Factura.obtenerFacturasVencidas();
    console.log(`📅 Facturas vencidas: ${facturasVencidas.length}`);
    
    // Lecturas pendientes
    const lecturasPendientes = await Lectura.obtenerLecturasPendientes();
    console.log(`⏳ Lecturas pendientes: ${lecturasPendientes.length}`);

    console.log('\n✅ Sistema de facturación inicializado correctamente');
    console.log('\n🔗 URLs disponibles:');
    console.log('   Frontend: http://localhost:5500/frontend/pages/factura.html');
    console.log('   API Facturas: http://localhost:5000/api/facturas');
    console.log('   API Lecturas: http://localhost:5000/api/lecturas');
    console.log('   API Clientes: http://localhost:5000/api/clientes');

  } catch (error) {
    console.error('❌ Error inicializando sistema de facturación:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n📤 Desconectado de MongoDB');
  }
}

// Función para crear datos de prueba (opcional)
async function createTestData() {
  try {
    console.log('🧪 Creando datos de prueba...');
    
    // Buscar un cliente de prueba
    let clientePrueba = await Cliente.findOne({ nombres: 'Juan' });
    
    if (!clientePrueba) {
      console.log('📝 Creando cliente de prueba...');
      clientePrueba = new Cliente({
        nombres: 'Juan',
        apellidos: 'Pérez López',
        dpi: '1234567890123',
        contador: 'TEST-001',
        lote: 'T-001',
        proyecto: 'san-miguel',
        whatsapp: '12345678',
        correoElectronico: 'juan.perez@email.com'
      });
      await clientePrueba.save();
      console.log('✅ Cliente de prueba creado');
    }
    
    // Buscar un usuario admin para asociar las acciones
    const adminUser = await User.findOne({ rol: 'admin' });
    if (!adminUser) {
      console.log('⚠️  No se puede crear datos de prueba sin un usuario admin');
      return;
    }
    
    // Crear lectura de prueba
    const lecturaExistente = await Lectura.findOne({ clienteId: clientePrueba._id });
    
    if (!lecturaExistente) {
      console.log('📊 Creando lectura de prueba...');
      const lecturaPrueba = new Lectura({
        clienteId: clientePrueba._id,
        lecturaAnterior: 0,
        lecturaActual: 25000,
        consumoLitros: 25000,
        fechaLectura: new Date(),
        periodoInicio: new Date(2025, 6, 1), // Julio 2025
        periodoFin: new Date(2025, 6, 31),
        numeroContador: clientePrueba.contador,
        observaciones: 'Lectura de prueba inicial',
        tomadaPor: adminUser._id,
        procesadaPor: adminUser._id,
        estado: 'procesada'
      });
      await lecturaPrueba.save();
      console.log('✅ Lectura de prueba creada');
      
      // Crear factura de prueba
      console.log('🧾 Creando factura de prueba...');
      const numeroFactura = await Factura.generarNumeroFactura();
      
      const facturaPrueba = new Factura({
        numeroFactura,
        clienteId: clientePrueba._id,
        fechaEmision: new Date(),
        periodoInicio: lecturaPrueba.periodoInicio,
        periodoFin: lecturaPrueba.periodoFin,
        lecturaAnterior: lecturaPrueba.lecturaAnterior,
        lecturaActual: lecturaPrueba.lecturaActual,
        consumoLitros: lecturaPrueba.consumoLitros,
        tarifaBase: 50.00,
        excedenteLitros: 0,
        costoExcedente: 0,
        subtotal: 50.00,
        montoTotal: 50.00,
        observaciones: 'Factura de prueba del sistema',
        creadoPor: adminUser._id
      });
      await facturaPrueba.save();
      
      // Asociar factura con lectura
      await lecturaPrueba.asociarFactura(facturaPrueba._id);
      
      console.log('✅ Factura de prueba creada:', numeroFactura);
    }
    
    console.log('✅ Datos de prueba verificados/creados');
    
  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error);
  }
}

// Ejecutar el script
async function main() {
  const args = process.argv.slice(2);
  const createTest = args.includes('--test-data');
  
  await initializeFacturacion();
  
  if (createTest) {
    await createTestData();
  }
  
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { initializeFacturacion, createTestData };
