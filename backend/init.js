// backend/init.js
// Script de inicialización automática para la primera ejecución

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Verificar y crear archivo .env si no existe
 */
function ensureEnvFile() {
  // Usar la ruta del .env configurada en electron-main.js si está disponible
  // Si no, usar la ruta por defecto (para cuando se ejecuta con npm start)
  const envPath = process.env.ENV_FILE_PATH || path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', '.env.example');

  console.log('📄 Verificando archivo de configuración...');
  console.log(`   Ruta .env: ${envPath}`);

  if (fs.existsSync(envPath)) {
    console.log('✅ Archivo .env encontrado');
    return true;
  }

  console.log('⚠️  Archivo .env no encontrado.');
  console.log('   Creando nuevo archivo de configuración...');

  // Intentar copiar desde .env.example si existe
  if (fs.existsSync(envExamplePath)) {
    try {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('✅ Archivo .env creado desde .env.example');
      return true;
    } catch (error) {
      console.log('⚠️  No se pudo copiar .env.example:', error.message);
      console.log('   Creando .env con configuración por defecto...');
    }
  }

  // Si no existe .env.example o no se pudo copiar, crear .env con configuración mínima
  try {
    const defaultEnv = `# Configuración automática - Sistema Agua LOTI
MONGO_URI=mongodb://localhost:27017/agua-loti
JWT_SECRET=${generateRandomSecret()}
NODE_ENV=development

# ===== CONFIGURACIÓN DE PUERTOS =====
# Puerto para el servidor backend cuando se ejecuta solo (npm start)
PORT=5000

# Puerto para Electron en producción (cuando empaquetas la app)
ELECTRON_PORT=3000

# Desactivar servicios opcionales por defecto
WHATSAPP_ENABLED=false
INFILE_ENABLED=false
ENABLE_ADMIN_FUNCTIONS=true
`;
    fs.writeFileSync(envPath, defaultEnv);
    console.log('✅ Archivo .env creado con configuración por defecto');
    return true;
  } catch (error) {
    console.error('❌ Error al crear archivo .env:', error.message);
    console.error('   Ruta intentada:', envPath);
    console.error('   La aplicación puede no funcionar correctamente');
    return false;
  }
}

/**
 * Generar secreto aleatorio para JWT
 */
function generateRandomSecret() {
  return require('crypto').randomBytes(64).toString('hex');
}

/**
 * Inicializar usuario admin si no existe
 */
async function ensureAdminUser() {
  try {
    console.log('👤 Verificando usuario administrador...');

    const User = require('./models/User');
    const existingAdmin = await User.findOne({ username: 'admin' });

    if (existingAdmin) {
      console.log('✅ Usuario admin ya existe');
      return true;
    }

    console.log('📝 Creando usuario administrador por defecto...');

    const passwordHash = await bcrypt.hash('admin123', 10);
    const adminUser = new User({
      username: 'admin',
      password: passwordHash,
      role: 'admin',
      estado: 'activo'
    });

    await adminUser.save();
    console.log('✅ Usuario admin creado');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   ⚠️  IMPORTANTE: Cambia la contraseña después del primer login');

    return true;
  } catch (error) {
    console.error('❌ Error al crear usuario admin:', error.message);
    return false;
  }
}

/**
 * Verificar conexión a MongoDB
 */
async function verifyMongoConnection(mongoUri) {
  try {
    console.log('🔌 Verificando conexión a MongoDB...');
    console.log(`   URI: ${mongoUri}`);

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });

    console.log('✅ Conexión a MongoDB establecida');
    return true;
  } catch (error) {
    console.error('❌ No se pudo conectar a MongoDB:', error.message);
    console.error('');
    console.error('   Posibles soluciones:');
    console.error('   1. Verifica que MongoDB esté instalado');
    console.error('   2. Inicia el servicio MongoDB: net start MongoDB');
    console.error('   3. Verifica la URI en el archivo .env');
    return false;
  }
}

/**
 * Función principal de inicialización
 */
async function initialize() {
  console.log('');
  console.log('========================================');
  console.log('  INICIALIZACIÓN - Sistema Agua LOTI');
  console.log('========================================');
  console.log('');

  try {
    // Paso 1: Verificar/crear archivo .env
    ensureEnvFile();

    // Paso 2: Cargar variables de entorno
    const envPath = process.env.ENV_FILE_PATH || path.join(__dirname, '..', '.env');
    require('dotenv').config({ path: envPath });

    // Paso 3: Verificar variables críticas
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET no está definido en .env');
      console.error('   Regenerando archivo .env...');
      const envPath = process.env.ENV_FILE_PATH || path.join(__dirname, '..', '.env');
      if (fs.existsSync(envPath)) {
        fs.unlinkSync(envPath);
      }
      ensureEnvFile();
      require('dotenv').config({ path: envPath });
    }

    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/agua-loti';

    // Paso 4: Verificar conexión a MongoDB
    const mongoConnected = await verifyMongoConnection(mongoUri);
    if (!mongoConnected) {
      console.error('');
      console.error('⚠️  No se pudo conectar a MongoDB.');
      console.error('   La aplicación puede no funcionar correctamente.');
      console.error('');
      return false;
    }

    // Paso 5: Crear usuario admin si no existe
    await ensureAdminUser();

    // Paso 6: Desconectar (se reconectará en server.js)
    await mongoose.disconnect();

    console.log('');
    console.log('========================================');
    console.log('  ✅ INICIALIZACIÓN COMPLETADA');
    console.log('========================================');
    console.log('');

    return true;
  } catch (error) {
    console.error('');
    console.error('========================================');
    console.error('  ❌ ERROR EN INICIALIZACIÓN');
    console.error('========================================');
    console.error('');
    console.error(error);
    return false;
  }
}

module.exports = { initialize, ensureEnvFile, ensureAdminUser };

// Si se ejecuta directamente
if (require.main === module) {
  initialize()
    .then(() => {
      console.log('Inicialización completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error en inicialización:', error);
      process.exit(1);
    });
}
