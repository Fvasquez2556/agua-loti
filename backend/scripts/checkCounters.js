// Script para verificar contadores
const mongoose = require('mongoose');
const Contador = require('../models/contador.model');
require('dotenv').config();

async function checkCounters() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/agua-loti';
    await mongoose.connect(mongoUri);
    
    const contadores = await Contador.find({}).sort({ _id: 1 });
    console.log('📊 Estado actual de contadores:');
    contadores.forEach(contador => {
      console.log(`   ${contador._id}: ${contador.secuencial}`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCounters();
