/**
 * Script de prueba para verificar generación automática de ticket de reconexión
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Pago = require('../models/pago.model');
const ticketPagoService = require('../services/ticketPago.service');

async function testTicketReconexion() {
  try {
    // Conectar a MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/agua-loti';
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB\n');

    // Buscar el pago de reconexión
    const pago = await Pago.findOne({
      numeroPago: 'PAG-202510-0001'
    }).populate('facturaId').populate('clienteId');

    if (!pago) {
      console.log('❌ No se encontró el pago PAG-202510-0001');
      return;
    }

    console.log('📄 PAGO ENCONTRADO:');
    console.log(`   Número: ${pago.numeroPago}`);
    console.log(`   Factura: ${pago.facturaId.numeroFactura}`);
    console.log(`   Tipo Factura: ${pago.facturaId.tipoFactura}`);
    console.log(`   Cliente: ${pago.clienteId.nombres} ${pago.clienteId.apellidos}`);
    console.log(`   Monto Total: Q ${pago.montoPagado}`);
    console.log(`   facturasConsolidadas: ${pago.facturaId.facturasConsolidadas?.length || 0} elementos\n`);

    // Llamar al método generarTicketPago (simula lo que hace el controller)
    console.log('🎫 Generando ticket con generarTicketPago()...\n');
    const resultado = await ticketPagoService.generarTicketPago(pago._id);

    if (resultado.exitoso) {
      console.log('\n✅ TICKET GENERADO EXITOSAMENTE:');
      console.log(`   Archivo: ${resultado.nombreArchivo}`);
      console.log(`   Ruta: ${resultado.rutaArchivo}`);
      console.log('\n📋 Verifica que el archivo muestre el desglose por mes:');
      console.log(`   - Mayo 2025: Consumo + Mora + Subtotal`);
      console.log(`   - Junio 2025: Consumo + Mora + Subtotal`);
      console.log(`   - Julio 2025: Consumo + Mora + Subtotal`);
      console.log(`   - Agosto 2025: Consumo + Mora + Subtotal`);
    } else {
      console.log('\n❌ ERROR AL GENERAR TICKET:');
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

testTicketReconexion();
