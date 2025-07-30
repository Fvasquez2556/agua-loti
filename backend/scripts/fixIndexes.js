// backend/scripts/fixIndexes.js
const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

async function fixIndexes() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    const Cliente = require('../models/cliente.model');
    
    console.log('🔄 Eliminando índices existentes...');
    
    // Obtener la colección directamente
    const collection = mongoose.connection.db.collection('clientes');
    
    // Listar índices actuales
    const indexes = await collection.listIndexes().toArray();
    console.log('📋 Índices actuales:', indexes.map(idx => idx.name));
    
    // Eliminar todos los índices excepto _id_
    for (const index of indexes) {
      if (index.name !== '_id_') {
        try {
          await collection.dropIndex(index.name);
          console.log(`🗑️  Eliminado índice: ${index.name}`);
        } catch (error) {
          console.log(`⚠️  No se pudo eliminar ${index.name}:`, error.message);
        }
      }
    }
    
    console.log('🔄 Recreando índices...');
    
    // Recrear índices necesarios
    await collection.createIndex({ dpi: 1 }, { unique: true });
    console.log('✅ Creado índice único para DPI');
    
    await collection.createIndex({ contador: 1 }, { unique: true });
    console.log('✅ Creado índice único para contador');
    
    await collection.createIndex({ proyecto: 1 });
    console.log('✅ Creado índice para proyecto');
    
    await collection.createIndex({ nombres: 'text', apellidos: 'text' });
    console.log('✅ Creado índice de texto para nombres y apellidos');
    
    // Verificar índices finales
    const finalIndexes = await collection.listIndexes().toArray();
    console.log('📋 Índices finales:', finalIndexes.map(idx => idx.name));
    
    console.log('✅ Índices corregidos exitosamente');
    
  } catch (error) {
    console.error('❌ Error corrigiendo índices:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
    process.exit(0);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  fixIndexes();
}

module.exports = fixIndexes;
