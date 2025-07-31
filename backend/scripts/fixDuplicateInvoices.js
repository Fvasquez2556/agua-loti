// Script para corregir facturas duplicadas
const mongoose = require('mongoose');
const Factura = require('../models/factura.model');
require('dotenv').config();

async function fixDuplicateInvoices() {
  try {
    // Conectar a la base de datos
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/agua-loti';
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');

    // Buscar facturas duplicadas por numeroFactura
    console.log('🔍 Buscando facturas duplicadas...');
    
    const duplicates = await Factura.aggregate([
      {
        $group: {
          _id: '$numeroFactura',
          count: { $sum: 1 },
          docs: { $push: { id: '$_id', fechaEmision: '$fechaEmision' } }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    if (duplicates.length === 0) {
      console.log('✅ No se encontraron facturas duplicadas');
      return;
    }

    console.log(`⚠️  Encontradas ${duplicates.length} facturas con números duplicados:`);
    
    for (const duplicate of duplicates) {
      console.log(`\n📄 Número de factura: ${duplicate._id}`);
      console.log(`   Cantidad de duplicados: ${duplicate.count}`);
      
      // Ordenar por fecha de emisión, mantener la más antigua
      const sortedDocs = duplicate.docs.sort((a, b) => new Date(a.fechaEmision) - new Date(b.fechaEmision));
      const toKeep = sortedDocs[0];
      const toUpdate = sortedDocs.slice(1);
      
      console.log(`   ✅ Mantener: ${toKeep.id} (${toKeep.fechaEmision})`);
      
      // Regenerar números para los duplicados
      for (let i = 0; i < toUpdate.length; i++) {
        const doc = toUpdate[i];
        let newNumber = await Factura.generarNumeroFactura();
        
        // Asegurar que el nuevo número no existe
        let exists = await Factura.findOne({ numeroFactura: newNumber });
        let attempts = 0;
        
        while (exists && attempts < 10) {
          newNumber = await Factura.generarNumeroFactura();
          exists = await Factura.findOne({ numeroFactura: newNumber });
          attempts++;
        }
        
        if (attempts >= 10) {
          // Usar timestamp si no se puede generar número único
          const timestamp = Date.now().toString().slice(-6);
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          newNumber = `FAC-${year}${month}-${timestamp}`;
        }
        
        await Factura.findByIdAndUpdate(doc.id, { numeroFactura: newNumber });
        console.log(`   🔄 Actualizado: ${doc.id} -> ${newNumber}`);
      }
    }

    console.log('\n✅ Proceso de corrección completado');
    
    // Verificar que no hay más duplicados
    const remainingDuplicates = await Factura.aggregate([
      {
        $group: {
          _id: '$numeroFactura',
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    if (remainingDuplicates.length === 0) {
      console.log('✅ Verificación: No quedan facturas duplicadas');
    } else {
      console.log(`⚠️  Advertencia: Aún quedan ${remainingDuplicates.length} duplicados`);
    }

  } catch (error) {
    console.error('❌ Error al corregir duplicados:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  fixDuplicateInvoices()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = fixDuplicateInvoices;
