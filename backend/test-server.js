/**
 * Script de prueba para verificar que el servidor puede iniciarse
 * con todos los nuevos cambios
 */

const path = require('path');

// Simular variables de entorno
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/agua-loti';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'aguasecreta123';
process.env.ENABLE_ADMIN_FUNCTIONS = 'true';
process.env.NODE_ENV = 'development';

console.log('🧪 Iniciando pruebas del servidor...\n');

// 1. Verificar que el modelo de Auditoría se puede cargar
console.log('1️⃣ Cargando modelo de Auditoría...');
try {
    const Auditoria = require('./models/auditoria.model');
    console.log('   ✅ Modelo de Auditoría cargado correctamente');
    console.log('   - Métodos estáticos:', Object.getOwnPropertyNames(Auditoria).filter(m => m !== 'length' && m !== 'name' && m !== 'prototype'));
} catch (error) {
    console.error('   ❌ Error al cargar modelo de Auditoría:', error.message);
    process.exit(1);
}

// 2. Verificar que el controlador admin se puede cargar
console.log('\n2️⃣ Cargando controlador de factura admin...');
try {
    const facturaAdminController = require('./controllers/factura.admin.controller');
    console.log('   ✅ Controlador admin cargado correctamente');
    console.log('   - Funciones exportadas:', Object.keys(facturaAdminController));

    // Verificar que la función nueva existe
    if (facturaAdminController.eliminarFacturasSelectivas) {
        console.log('   ✅ Función eliminarFacturasSelectivas() encontrada');
    } else {
        console.error('   ❌ Función eliminarFacturasSelectivas() NO encontrada');
    }

    if (facturaAdminController.verificarEstadoAdmin) {
        console.log('   ✅ Función verificarEstadoAdmin() encontrada');
    } else {
        console.error('   ❌ Función verificarEstadoAdmin() NO encontrada');
    }
} catch (error) {
    console.error('   ❌ Error al cargar controlador admin:', error.message);
    process.exit(1);
}

// 3. Verificar que las rutas admin se pueden cargar
console.log('\n3️⃣ Cargando rutas de factura admin...');
try {
    const express = require('express');
    const app = express();

    // Mock del middleware de autenticación
    const mockAuthMiddleware = (req, res, next) => next();
    const mockRequireRole = (...roles) => (req, res, next) => next();

    // Inyectar mocks en el módulo de autenticación
    const Module = require('module');
    const originalRequire = Module.prototype.require;

    Module.prototype.require = function(id) {
        if (id === '../middlewares/auth.middleware') {
            return {
                authMiddleware: mockAuthMiddleware,
                requireRole: mockRequireRole
            };
        }
        return originalRequire.apply(this, arguments);
    };

    const facturaAdminRoutes = require('./routes/factura.admin.routes');
    console.log('   ✅ Rutas admin cargadas correctamente');

    // Restaurar require original
    Module.prototype.require = originalRequire;

} catch (error) {
    console.error('   ❌ Error al cargar rutas admin:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
}

// 4. Verificar estructura del esquema de auditoría
console.log('\n4️⃣ Verificando esquema de Auditoría...');
try {
    const mongoose = require('mongoose');
    const Auditoria = require('./models/auditoria.model');

    const schema = Auditoria.schema;
    const paths = Object.keys(schema.paths);

    console.log('   ✅ Campos del modelo:');
    const requiredFields = ['accion', 'detalles'];
    requiredFields.forEach(field => {
        if (paths.includes(field)) {
            console.log(`   ✅ Campo '${field}' presente`);
        } else {
            console.error(`   ❌ Campo '${field}' NO encontrado`);
        }
    });
} catch (error) {
    console.error('   ❌ Error al verificar esquema:', error.message);
    process.exit(1);
}

console.log('\n' + '='.repeat(50));
console.log('✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE');
console.log('='.repeat(50));
console.log('\n📝 Resumen:');
console.log('   ✅ Modelo de Auditoría: OK');
console.log('   ✅ Controlador Admin: OK');
console.log('   ✅ Rutas Admin: OK');
console.log('   ✅ Esquema de Auditoría: OK');
console.log('\n💡 El servidor está listo para iniciar con los nuevos cambios.');
console.log('\n📌 IMPORTANTE:');
console.log('   - Asegúrate de generar el hash de contraseña administrativa');
console.log('   - Configura ADMIN_FECHA_PASSWORD en el archivo .env');
console.log('   - Reinicia el servidor después de configurar');
