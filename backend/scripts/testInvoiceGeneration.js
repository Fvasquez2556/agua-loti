// Script de prueba para verificar la generación de números de factura
const mongoose = require('mongoose');
const Factura = require('../models/factura.model');
require('dotenv').config();

async function testInvoiceNumberGeneration() {
  try {
    // Conectar a la base de datos
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/agua-loti';
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');

    console.log('\n🧪 Probando generación de números de factura...');

    // Generar varios números de factura consecutivos
    const numeros = [];
    for (let i = 0; i < 5; i++) {
      const numero = await Factura.generarNumeroFactura();
      numeros.push(numero);
      console.log(`${i + 1}. ${numero}`);
    }

    // Verificar que todos sean únicos
    const numerosUnicos = new Set(numeros);
    if (numerosUnicos.size === numeros.length) {
      console.log('✅ Todos los números generados son únicos');
    } else {
      console.log('❌ Se encontraron números duplicados');
    }

    // Buscar el último número de factura en la base de datos
    const ultimaFactura = await Factura.findOne({}, {}, { sort: { numeroFactura: -1 } });
    if (ultimaFactura) {
      console.log(`\n📄 Última factura en BD: ${ultimaFactura.numeroFactura}`);
    } else {
      console.log('\n📄 No hay facturas en la base de datos');
    }

    // Verificar formato correcto
    const formatoValido = /^FAC-\d{6}-\d{4}$/;
    const todosFormatoValido = numeros.every(num => formatoValido.test(num));
    
    if (todosFormatoValido) {
      console.log('✅ Todos los números tienen el formato correcto (FAC-YYYYMM-NNNN)');
    } else {
      console.log('❌ Algunos números no tienen el formato correcto');
      numeros.forEach((num, i) => {
        if (!formatoValido.test(num)) {
          console.log(`   Formato incorrecto: ${num}`);
        }
      });
    }

    console.log('\n✅ Prueba de generación completada');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testInvoiceNumberGeneration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = testInvoiceNumberGeneration;
