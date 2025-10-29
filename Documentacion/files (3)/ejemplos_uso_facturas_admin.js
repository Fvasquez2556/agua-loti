// ejemplos_uso_facturas_admin.js
/**
 * Scripts de ejemplo para usar las funciones administrativas de facturas
 * Puedes ejecutar estos ejemplos modificando las variables según tu configuración
 */

const BASE_URL = 'http://localhost:5000/api';
const TOKEN = 'TU_TOKEN_DE_AUTENTICACION'; // Reemplazar con tu token real
const CLIENT_ID = 'ID_DEL_CLIENTE'; // Reemplazar con un ID de cliente real

// ===========================================
// EJEMPLO 1: Generar Hash de Contraseña
// ===========================================
async function generarHashPassword() {
  console.log('\n📝 Generando hash de contraseña...\n');

  const response = await fetch(`${BASE_URL}/facturas/admin/generar-hash`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify({
      password: 'MiContraseñaSegura123!'
    })
  });

  const data = await response.json();
  console.log('Resultado:', data);
  console.log('\n⚠️  Guarda este hash en tu archivo .env como ADMIN_FECHA_PASSWORD\n');
  
  return data;
}

// ===========================================
// EJEMPLO 2: Crear Factura Vencida
// ===========================================
async function crearFacturaVencida() {
  console.log('\n📄 Creando factura vencida hace 30 días...\n');

  // Calcular fechas
  const hoy = new Date();
  const hace60Dias = new Date(hoy);
  hace60Dias.setDate(hace60Dias.getDate() - 60);
  
  const hace30Dias = new Date(hoy);
  hace30Dias.setDate(hace30Dias.getDate() - 30);

  const response = await fetch(`${BASE_URL}/facturas/admin/crear-con-fecha`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify({
      clienteId: CLIENT_ID,
      lecturaAnterior: 1000,
      lecturaActual: 5000,
      fechaLectura: hace60Dias.toISOString().split('T')[0],
      periodoInicio: new Date(hace60Dias.getFullYear(), hace60Dias.getMonth(), 1).toISOString().split('T')[0],
      periodoFin: new Date(hace60Dias.getFullYear(), hace60Dias.getMonth() + 1, 0).toISOString().split('T')[0],
      fechaEmision: hace60Dias.toISOString().split('T')[0],
      fechaVencimiento: hace30Dias.toISOString().split('T')[0],
      observaciones: 'Factura de prueba - vencida',
      modoPrueba: true
    })
  });

  const data = await response.json();
  console.log('Resultado:', data);
  console.log(`\n✅ Factura creada: ${data.data?.numeroFactura}`);
  console.log(`   Días de mora: ${data.data?.diasMora}`);
  console.log(`   Mora: Q${data.data?.montoMora}\n`);
  
  return data;
}

// ===========================================
// EJEMPLO 3: Crear Factura que Vence Mañana
// ===========================================
async function crearFacturaVenceMañana() {
  console.log('\n📄 Creando factura que vence mañana...\n');

  const hoy = new Date();
  const hace30Dias = new Date(hoy);
  hace30Dias.setDate(hace30Dias.getDate() - 30);
  
  const mañana = new Date(hoy);
  mañana.setDate(mañana.getDate() + 1);

  const response = await fetch(`${BASE_URL}/facturas/admin/crear-con-fecha`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify({
      clienteId: CLIENT_ID,
      lecturaAnterior: 2000,
      lecturaActual: 4500,
      fechaLectura: hace30Dias.toISOString().split('T')[0],
      periodoInicio: new Date(hace30Dias.getFullYear(), hace30Dias.getMonth(), 1).toISOString().split('T')[0],
      periodoFin: new Date(hace30Dias.getFullYear(), hace30Dias.getMonth() + 1, 0).toISOString().split('T')[0],
      fechaEmision: hace30Dias.toISOString().split('T')[0],
      fechaVencimiento: mañana.toISOString().split('T')[0],
      observaciones: 'Factura de prueba - vence mañana',
      modoPrueba: true
    })
  });

  const data = await response.json();
  console.log('Resultado:', data);
  console.log(`\n✅ Factura creada: ${data.data?.numeroFactura}`);
  console.log(`   Vence: ${mañana.toLocaleDateString('es-GT')}\n`);
  
  return data;
}

// ===========================================
// EJEMPLO 4: Modificar Fecha de Vencimiento
// ===========================================
async function modificarFechaVencimiento(facturaId) {
  console.log('\n📝 Modificando fecha de vencimiento...\n');

  const nuevaFecha = new Date();
  nuevaFecha.setDate(nuevaFecha.getDate() + 15); // Extender 15 días

  const response = await fetch(`${BASE_URL}/facturas/admin/${facturaId}/modificar-fecha`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify({
      nuevaFechaVencimiento: nuevaFecha.toISOString().split('T')[0],
      password: 'MiContraseñaSegura123!', // Usar tu contraseña real
      motivo: 'Extensión de plazo por solicitud del cliente'
    })
  });

  const data = await response.json();
  console.log('Resultado:', data);
  
  if (data.success) {
    console.log('\n✅ Fecha modificada exitosamente');
    console.log(`   Fecha anterior: ${new Date(data.data.fechaAnterior).toLocaleDateString('es-GT')}`);
    console.log(`   Fecha nueva: ${new Date(data.data.fechaNueva).toLocaleDateString('es-GT')}\n`);
  } else {
    console.log('\n❌ Error al modificar fecha:', data.message, '\n');
  }
  
  return data;
}

// ===========================================
// EJEMPLO 5: Crear Lote de Facturas de Prueba
// ===========================================
async function crearLoteFacturasPrueba() {
  console.log('\n📦 Creando lote de 5 facturas de prueba...\n');

  const response = await fetch(`${BASE_URL}/facturas/admin/crear-lote-prueba`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify({
      clienteId: CLIENT_ID,
      cantidadFacturas: 5
    })
  });

  const data = await response.json();
  console.log('Resultado:', data);
  
  if (data.success) {
    console.log('\n✅ Facturas creadas:');
    data.data.forEach((factura, index) => {
      console.log(`   ${index + 1}. ${factura.numeroFactura}`);
      console.log(`      Vencimiento: ${new Date(factura.fechaVencimiento).toLocaleDateString('es-GT')}`);
      console.log(`      Días mora: ${factura.diasMora}`);
      console.log(`      Mora: Q${factura.montoMora}\n`);
    });
  }
  
  return data;
}

// ===========================================
// EJEMPLO 6: Escenario Completo de Pruebas
// ===========================================
async function escenarioCompletoPruebas() {
  console.log('\n🧪 INICIANDO ESCENARIO COMPLETO DE PRUEBAS\n');
  console.log('=' .repeat(50));

  try {
    // 1. Crear factura al día
    console.log('\n1️⃣  Creando factura al día (vence en 30 días)...');
    const facturaAlDia = await crearFacturaVenceMañana();
    
    // 2. Crear factura vencida
    console.log('\n2️⃣  Creando factura vencida (30 días de mora)...');
    const facturaVencida = await crearFacturaVencida();
    
    // 3. Crear lote de facturas variadas
    console.log('\n3️⃣  Creando lote de facturas con diferentes estados...');
    await crearLoteFacturasPrueba();
    
    // 4. Modificar fecha de vencimiento
    if (facturaAlDia.success && facturaAlDia.data?._id) {
      console.log('\n4️⃣  Modificando fecha de vencimiento de la primera factura...');
      await modificarFechaVencimiento(facturaAlDia.data._id);
    }

    console.log('\n' + '='.repeat(50));
    console.log('\n✅ ESCENARIO COMPLETADO EXITOSAMENTE\n');

  } catch (error) {
    console.error('\n❌ Error en el escenario:', error.message);
    console.error('Detalles:', error, '\n');
  }
}

// ===========================================
// EJEMPLO 7: Facturas para Pruebas de Reconexión
// ===========================================
async function crearFacturasReconexion() {
  console.log('\n🔌 Creando facturas para pruebas de reconexión...\n');

  const hoy = new Date();
  
  // Factura vencida hace 60 días (requiere reconexión)
  const hace90Dias = new Date(hoy);
  hace90Dias.setDate(hace90Dias.getDate() - 90);
  
  const hace60Dias = new Date(hoy);
  hace60Dias.setDate(hace60Dias.getDate() - 60);

  const response = await fetch(`${BASE_URL}/facturas/admin/crear-con-fecha`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify({
      clienteId: CLIENT_ID,
      lecturaAnterior: 1500,
      lecturaActual: 5500,
      fechaLectura: hace90Dias.toISOString().split('T')[0],
      periodoInicio: new Date(hace90Dias.getFullYear(), hace90Dias.getMonth(), 1).toISOString().split('T')[0],
      periodoFin: new Date(hace90Dias.getFullYear(), hace90Dias.getMonth() + 1, 0).toISOString().split('T')[0],
      fechaEmision: hace90Dias.toISOString().split('T')[0],
      fechaVencimiento: hace60Dias.toISOString().split('T')[0],
      observaciones: 'Factura de prueba - requiere reconexión (60+ días vencida)',
      modoPrueba: true
    })
  });

  const data = await response.json();
  console.log('Resultado:', data);
  
  if (data.success) {
    console.log(`\n✅ Factura creada: ${data.data.numeroFactura}`);
    console.log(`   Días de mora: ${data.data.diasMora}`);
    console.log(`   Mora acumulada: Q${data.data.montoMora}`);
    console.log(`   Total con mora: Q${data.data.montoTotalConMora}`);
    console.log('\n   ⚠️  Esta factura debería requerir reconexión (Q125.00)\n');
  }
  
  return data;
}

// ===========================================
// FUNCIONES DE UTILIDAD
// ===========================================

function mostrarMenu() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  FUNCIONES ADMINISTRATIVAS FACTURAS   ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log('Funciones disponibles:');
  console.log('  1. generarHashPassword()');
  console.log('  2. crearFacturaVencida()');
  console.log('  3. crearFacturaVenceMañana()');
  console.log('  4. modificarFechaVencimiento(facturaId)');
  console.log('  5. crearLoteFacturasPrueba()');
  console.log('  6. escenarioCompletoPruebas()');
  console.log('  7. crearFacturasReconexion()');
  console.log('\nNota: Recuerda actualizar BASE_URL, TOKEN y CLIENT_ID\n');
}

// Mostrar menú al cargar el archivo
mostrarMenu();

// Exportar funciones para uso en Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generarHashPassword,
    crearFacturaVencida,
    crearFacturaVenceMañana,
    modificarFechaVencimiento,
    crearLoteFacturasPrueba,
    escenarioCompletoPruebas,
    crearFacturasReconexion
  };
}

// ===========================================
// INSTRUCCIONES DE USO
// ===========================================
console.log('📚 INSTRUCCIONES DE USO:\n');
console.log('1. Actualiza las constantes BASE_URL, TOKEN y CLIENT_ID');
console.log('2. Ejecuta en Node.js: node ejemplos_uso_facturas_admin.js');
console.log('3. En la consola del navegador: copia y pega las funciones');
console.log('4. Llama las funciones según necesites:');
console.log('   - await generarHashPassword()');
console.log('   - await crearFacturaVencida()');
console.log('   - await escenarioCompletoPruebas()');
console.log('\n⚠️  Asegúrate de estar autenticado y tener permisos de admin\n');
