/**
 * Script de diagnóstico para verificar facturas consolidadas
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Factura = require('../models/factura.model');

async function debugFacturaConsolidada() {
  try {
    // Conectar a MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/agua-loti';
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');

    // Buscar la factura consolidada reciente
    const factura = await Factura.findOne({
      numeroFactura: 'FAC-RECON-202510-0001'
    });

    if (!factura) {
      console.log('❌ No se encontró la factura FAC-RECON-202510-0001');
      return;
    }

    console.log('\n📄 FACTURA CONSOLIDADA ENCONTRADA:');
    console.log('='.repeat(60));
    console.log(`Número: ${factura.numeroFactura}`);
    console.log(`Tipo: ${factura.tipoFactura}`);
    console.log(`Cliente ID: ${factura.clienteId}`);
    console.log(`Fecha Emisión: ${factura.fechaEmision}`);
    console.log(`Monto Base: Q ${factura.montoBase}`);
    console.log(`Monto Mora: Q ${factura.montoMora}`);
    console.log(`Costo Reconexión: Q ${factura.costoReconexion}`);
    console.log(`Monto Total: Q ${factura.montoTotal}`);
    console.log('\n📋 ARRAY FACTURAS CONSOLIDADAS:');
    console.log(`Longitud: ${factura.facturasConsolidadas?.length || 0}`);

    if (factura.facturasConsolidadas && factura.facturasConsolidadas.length > 0) {
      console.log('\n✅ El array facturasConsolidadas EXISTE y tiene datos:');
      factura.facturasConsolidadas.forEach((detalle, index) => {
        console.log(`\n--- Factura ${index + 1} ---`);
        console.log(`  Número: ${detalle.numeroFactura}`);
        console.log(`  Mes: ${detalle.mesNombre}`);
        console.log(`  Período: ${detalle.periodo?.inicio} - ${detalle.periodo?.fin}`);
        console.log(`  Monto Original: Q ${detalle.montoOriginal}`);
        console.log(`  Monto Mora: Q ${detalle.montoMora}`);
        console.log(`  Días Mora: ${detalle.diasMora}`);
        console.log(`  Subtotal: Q ${detalle.subtotal}`);
      });
    } else {
      console.log('\n❌ El array facturasConsolidadas está VACÍO o UNDEFINED');
      console.log('   Esto explica por qué el ticket muestra el formato simple');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 OBJETO COMPLETO (JSON):');
    console.log(JSON.stringify(factura, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Desconectado de MongoDB');
  }
}

debugFacturaConsolidada();
