// Script para sincronizar el contador con las facturas existentes
const mongoose = require('mongoose');
const Factura = require('../models/factura.model');
const Contador = require('../models/contador.model');
require('dotenv').config();

async function syncCounters() {
  try {
    // Conectar a la base de datos
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/agua-loti';
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');

    console.log('🔄 Sincronizando contadores con facturas existentes...');

    // Buscar todas las facturas y agrupar por mes
    const facturas = await Factura.find({}).select('numeroFactura fechaEmision');
    
    const contadoresPorMes = {};
    
    facturas.forEach(factura => {
      const fecha = new Date(factura.fechaEmision);
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const contadorId = `FAC-${year}${month}`;
      
      // Extraer número secuencial
      const match = factura.numeroFactura.match(/(\d{4})$/);
      if (match) {
        const secuencial = parseInt(match[1]);
        
        if (!contadoresPorMes[contadorId]) {
          contadoresPorMes[contadorId] = [];
        }
        contadoresPorMes[contadorId].push(secuencial);
      }
    });

    // Actualizar o crear contadores
    for (const [contadorId, secuenciales] of Object.entries(contadoresPorMes)) {
      const maxSecuencial = Math.max(...secuenciales);
      
      console.log(`📊 ${contadorId}: ${secuenciales.length} facturas, máximo secuencial: ${maxSecuencial}`);
      
      await Contador.findOneAndUpdate(
        { _id: contadorId },
        { secuencial: maxSecuencial },
        { upsert: true }
      );
      
      console.log(`✅ Contador ${contadorId} actualizado a ${maxSecuencial}`);
    }

    // Verificar contadores
    const contadores = await Contador.find({}).sort({ _id: 1 });
    console.log('\n📋 Estado actual de contadores:');
    contadores.forEach(contador => {
      console.log(`   ${contador._id}: ${contador.secuencial}`);
    });

    console.log('\n✅ Sincronización completada');

  } catch (error) {
    console.error('❌ Error al sincronizar contadores:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  syncCounters()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = syncCounters;
