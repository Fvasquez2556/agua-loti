/**
 * Script para verificar el estado FEL de los pagos
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Cliente = require('../models/cliente.model');
const Factura = require('../models/factura.model');
const Pago = require('../models/pago.model');

async function verificarPagosFEL() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Buscar pagos de la factura específica
    const facturaId = '6905268f67dbc7e79f4abf26'; // FAC-202510-0001

    console.log('🔍 Buscando pagos de la factura FAC-202510-0001...\n');
    const pagos = await Pago.find({ facturaId: facturaId })
      .populate('clienteId', 'nombres apellidos')
      .populate('facturaId', 'numeroFactura');

    if (pagos.length === 0) {
      console.log('⚠️  No se encontraron pagos para esta factura');
      await mongoose.connection.close();
      return;
    }

    console.log(`📊 Se encontraron ${pagos.length} pago(s):\n`);

    pagos.forEach((pago, index) => {
      console.log(`\nPago #${index + 1}:`);
      console.log(`  ID: ${pago._id}`);
      console.log(`  Número: ${pago.numeroPago || 'N/A'}`);
      console.log(`  Cliente: ${pago.clienteId?.nombres || 'N/A'}`);
      console.log(`  Factura: ${pago.facturaId?.numeroFactura || 'N/A'}`);
      console.log(`  Monto: Q${pago.montoPagado}`);
      console.log(`  Fecha: ${new Date(pago.fechaPago).toLocaleDateString('es-GT')}`);
      console.log(`  Método: ${pago.metodoPago}`);
      console.log(`\n  📋 Estado FEL:`);

      if (pago.fel) {
        console.log(`    fel existe: ✅`);
        console.log(`    fel.generado: ${pago.fel.generado}`);
        console.log(`    fel.uuid: ${pago.fel.uuid || 'N/A'}`);
        console.log(`    fel.serie: ${pago.fel.serie || 'N/A'}`);
        console.log(`    fel.numero: ${pago.fel.numero || 'N/A'}`);
        console.log(`    fel.fechaCertificacion: ${pago.fel.fechaCertificacion || 'N/A'}`);

        if (pago.fel.generado === true) {
          console.log(`\n    ⚠️  PROBLEMA DETECTADO:`);
          console.log(`    Este pago tiene fel.generado=true pero no debería`);
          console.log(`    Ya que no están conectados a Infile aún.`);
        }
      } else {
        console.log(`    fel: No existe (null/undefined)`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n💡 DIAGNÓSTICO:');

    const pagosConFelGenerado = pagos.filter(p => p.fel?.generado === true);

    if (pagosConFelGenerado.length > 0) {
      console.log(`\n❌ Hay ${pagosConFelGenerado.length} pago(s) con fel.generado=true`);
      console.log(`   Esto está causando que el sistema los detecte como certificados`);
      console.log(`   y no permita eliminar las facturas.`);
      console.log('\n🔧 SOLUCIONES:');
      console.log('   1. Corregir los datos: node backend/scripts/limpiar-fel-pagos.js');
      console.log('   2. Modificar la validación para permitir eliminar estos pagos');
    } else {
      console.log('\n✅ Ningún pago tiene fel.generado=true');
      console.log('   El problema debe estar en otro lugar');
    }

    await mongoose.connection.close();
    console.log('\n✅ Desconectado de MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verificarPagosFEL();
