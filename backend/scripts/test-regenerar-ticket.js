/**
 * Script para regenerar ticket de factura consolidada
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Factura = require('../models/factura.model');
const ticketPagoService = require('../services/ticketPago.service');

async function regenerarTicket() {
  try {
    // Conectar a MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/agua-loti';
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB\n');

    // Buscar la factura consolidada
    const factura = await Factura.findOne({
      numeroFactura: 'FAC-RECON-202510-0001'
    });

    if (!factura) {
      console.log('❌ No se encontró la factura');
      return;
    }

    console.log(`📄 Factura encontrada: ${factura.numeroFactura}`);
    console.log(`   Tipo: ${factura.tipoFactura}`);
    console.log(`   facturasConsolidadas.length: ${factura.facturasConsolidadas?.length || 0}\n`);

    // Generar el ticket
    console.log('🎫 Generando ticket...\n');
    const resultado = await ticketPagoService.generarTicketFacturaConsolidada(factura._id);

    if (resultado.exitoso) {
      console.log('\n✅ Ticket generado exitosamente:');
      console.log(`   Archivo: ${resultado.nombreArchivo}`);
      console.log(`   Ruta: ${resultado.rutaArchivo}`);
    } else {
      console.log('\n❌ Error al generar ticket:');
      console.log(`   ${resultado.mensaje}`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Desconectado de MongoDB');
  }
}

regenerarTicket();
