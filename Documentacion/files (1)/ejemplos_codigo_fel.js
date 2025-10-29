/**
 * EJEMPLOS DE CÓDIGO COMPLETOS PARA IMPLEMENTACIÓN FEL
 * Sistema de Agua Loti - Guatemala
 * 
 * Este archivo contiene ejemplos funcionales listos para usar
 */

const axios = require('axios');
const xml2js = require('xml2js');
const { v4: uuidv4 } = require('uuid');

// ============================================
// 1. CONFIGURACIÓN Y CREDENCIALES
// ============================================

const FEL_CONFIG = {
  ambiente: process.env.FEL_AMBIENTE || 'sandbox',
  nit: process.env.FEL_NIT || '39840360',
  usuario: process.env.FEL_USUARIO || '39840360',
  clave: process.env.FEL_CLAVE || '1E6E69845CDFFA02C82246468394408C',
  token: process.env.FEL_TOKEN || 'fa113ded48964de0f986089e3f3575ec',
  
  urls: {
    sandbox: 'https://fel-sandbox.infile.com.gt/api',
    produccion: 'https://fel.infile.com.gt/api',
    consultaNIT: 'https://consultareceptores.feel.com.gt/rest/action',
    consultaCUI: 'https://certificador.feel.com.gt/api/v2/servicios/externos'
  }
};

// ============================================
// 2. CONSTRUIR XML DE FACTURA
// ============================================

/**
 * Construye el XML de una factura FEL
 * @param {Object} factura - Datos de la factura del sistema de agua
 * @param {String} uuid - UUID generado para el DTE
 * @returns {String} XML formateado
 */
async function construirXMLFactura(factura, uuid) {
  // Generar fecha y hora actual en formato ISO
  const fechaHora = new Date().toISOString();
  
  // Calcular IVA (12%)
  const montoSinIVA = factura.montoTotal / 1.12;
  const montoIVA = factura.montoTotal - montoSinIVA;
  
  const xmlData = {
    'gte:GTDocumento': {
      $: {
        'xmlns:dte': 'http://www.sat.gob.gt/dte/fel/0.2.0',
        'Version': '0.1'
      },
      'dte:SAT': {
        $: { ClaseDocumento: 'dte' },
        'dte:DTE': {
          $: { ID: 'DatosCertificados' },
          'dte:DatosEmision': {
            $: { ID: 'DatosEmision' },
            
            // 1. DATOS GENERALES
            'dte:DatosGenerales': {
              $: {
                CodigoMoneda: 'GTQ',
                FechaHoraEmision: fechaHora,
                Tipo: 'FACT'
              }
            },
            
            // 2. EMISOR
            'dte:Emisor': {
              $: {
                AfiliacionIVA: 'GEN',
                CodigoEstablecimiento: '1',
                CorreoEmisor: 'agua@loti.com',
                NITEmisor: FEL_CONFIG.nit,
                NombreComercial: 'AGUA LOTI',
                NombreEmisor: 'ANA SUSANA VASQUEZ ORDONEZ'
              },
              'dte:DireccionEmisor': {
                'dte:Direccion': 'CUIDAD, GUATEMALA, GUATEMALA',
                'dte:CodigoPostal': '01001',
                'dte:Municipio': 'Guatemala',
                'dte:Departamento': 'Guatemala',
                'dte:Pais': 'GT'
              }
            },
            
            // 3. RECEPTOR
            'dte:Receptor': {
              $: {
                CorreoReceptor: factura.clienteId.whatsapp ? `${factura.clienteId.whatsapp}@example.com` : '',
                IDReceptor: factura.clienteId.dpi || 'CF',
                NombreReceptor: factura.clienteId.dpi 
                  ? `${factura.clienteId.nombres} ${factura.clienteId.apellidos}`.toUpperCase()
                  : 'CONSUMIDOR FINAL'
              },
              'dte:DireccionReceptor': {
                'dte:Direccion': `Contador: ${factura.clienteId.contador}, Lote: ${factura.clienteId.lote}`,
                'dte:CodigoPostal': '01001',
                'dte:Municipio': 'Guatemala',
                'dte:Departamento': 'Guatemala',
                'dte:Pais': 'GT'
              }
            },
            
            // 4. FRASES TRIBUTARIAS
            'dte:Frases': {
              'dte:Frase': {
                $: {
                  CodigoEscenario: '2',
                  TipoFrase: '1' // Sujeto a retención definitiva ISR
                }
              }
            },
            
            // 5. ITEMS DE LA FACTURA
            'dte:Items': {
              'dte:Item': {
                $: {
                  BienOServicio: 'S', // S = Servicio
                  NumeroLinea: '1'
                },
                'dte:Cantidad': factura.consumoLitros.toFixed(2),
                'dte:UnidadMedida': 'M3',
                'dte:Descripcion': `Servicio de Agua Potable\\n` +
                  `Contador: ${factura.clienteId.contador}\\n` +
                  `Periodo: ${new Date(factura.fechaEmision).toLocaleDateString('es-GT')}\\n` +
                  `Lectura Anterior: ${factura.lecturaAnterior} m³\\n` +
                  `Lectura Actual: ${factura.lecturaActual} m³\\n` +
                  `Consumo: ${factura.consumoLitros} m³\\n` +
                  `Tarifa Base: Q${factura.tarifaBase.toFixed(2)}\\n` +
                  (factura.excedenteLitros > 0 
                    ? `Excedente: ${factura.excedenteLitros} m³ x Q${factura.costoExcedente.toFixed(2)}` 
                    : ''),
                'dte:PrecioUnitario': factura.montoTotal.toFixed(2),
                'dte:Precio': factura.montoTotal.toFixed(2),
                'dte:Descuento': '0.00',
                'dte:Total': factura.montoTotal.toFixed(2)
              }
            },
            
            // 6. TOTALES
            'dte:Totales': {
              'dte:TotalImpuestos': {
                'dte:TotalImpuesto': {
                  $: {
                    NombreCorto: 'IVA',
                    TotalMontoImpuesto: montoIVA.toFixed(2)
                  },
                  'dte:Monto': montoSinIVA.toFixed(2)
                }
              },
              'dte:GranTotal': factura.montoTotal.toFixed(2)
            }
          }
        }
      }
    }
  };
  
  // Convertir objeto a XML
  const builder = new xml2js.Builder({
    xmldec: { version: '1.0', encoding: 'UTF-8' }
  });
  
  const xml = builder.buildObject(xmlData);
  return xml;
}

// ============================================
// 3. CERTIFICAR FACTURA
// ============================================

/**
 * Certifica una factura con Infile
 * @param {Object} facturaData - Datos de la factura
 * @returns {Promise<Object>} Respuesta de certificación
 */
async function certificarFactura(facturaData) {
  try {
    // 1. Generar UUID único
    const uuid = uuidv4();
    
    // 2. Construir XML
    const xml = await construirXMLFactura(facturaData, uuid);
    
    // 3. Determinar URL según ambiente
    const baseURL = FEL_CONFIG.ambiente === 'produccion'
      ? FEL_CONFIG.urls.produccion
      : FEL_CONFIG.urls.sandbox;
    
    // 4. Enviar a certificar
    const response = await axios.post(
      `${baseURL}/dte/certificar`,
      {
        nit: FEL_CONFIG.nit,
        usuario: FEL_CONFIG.usuario,
        llave: FEL_CONFIG.clave,
        xml: xml
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 segundos
      }
    );
    
    // 5. Procesar respuesta
    if (response.data && response.data.uuid) {
      return {
        success: true,
        uuid: response.data.uuid,
        numeroAutorizacion: response.data.numero_autorizacion,
        serie: response.data.serie,
        numero: response.data.numero,
        fechaCertificacion: response.data.fecha_certificacion,
        xml: xml
      };
    } else {
      throw new Error('Respuesta inválida del servicio de certificación');
    }
    
  } catch (error) {
    console.error('Error en certificación FEL:', error);
    
    return {
      success: false,
      error: error.message,
      details: error.response ? error.response.data : null
    };
  }
}

// ============================================
// 4. CONSULTAR NIT
// ============================================

/**
 * Consulta información de un NIT en SAT
 * @param {String} nit - NIT a consultar (sin guiones)
 * @returns {Promise<Object>} Información del NIT
 */
async function consultarNIT(nit) {
  try {
    // Limpiar NIT (quitar guiones si los tiene)
    const nitLimpio = nit.replace(/-/g, '');
    
    const response = await axios.post(
      FEL_CONFIG.urls.consultaNIT,
      {
        emisor_codigo: FEL_CONFIG.usuario,
        emisor_clave: FEL_CONFIG.clave,
        nit_consulta: nitLimpio
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    if (response.data && response.data.nit) {
      return {
        success: true,
        nit: response.data.nit,
        nombre: response.data.nombre,
        mensaje: response.data.mensaje || ''
      };
    } else {
      return {
        success: false,
        error: 'NIT no encontrado o inválido'
      };
    }
    
  } catch (error) {
    console.error('Error consultando NIT:', error);
    
    return {
      success: false,
      error: error.message,
      details: error.response ? error.response.data : null
    };
  }
}

// ============================================
// 5. CONSULTAR CUI (DPI)
// ============================================

/**
 * Consulta información de un CUI/DPI en RENAP
 * @param {String} cui - CUI/DPI a consultar
 * @returns {Promise<Object>} Información del CUI
 */
async function consultarCUI(cui) {
  try {
    // Paso 1: Obtener token de autorización
    const loginResponse = await axios.post(
      `${FEL_CONFIG.urls.consultaCUI}/login`,
      {
        prefijo: FEL_CONFIG.usuario,
        llave: FEL_CONFIG.clave
      },
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 10000
      }
    );
    
    if (!loginResponse.data || !loginResponse.data.token) {
      throw new Error('No se pudo obtener token de autorización');
    }
    
    const token = loginResponse.data.token;
    
    // Paso 2: Consultar CUI con el token
    const cuiResponse = await axios.post(
      `${FEL_CONFIG.urls.consultaCUI}/cui`,
      {
        cui: cui
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 10000
      }
    );
    
    if (cuiResponse.data && cuiResponse.data.cui) {
      return {
        success: true,
        cui: cuiResponse.data.cui.cui,
        nombre: cuiResponse.data.cui.nombre,
        fallecido: cuiResponse.data.cui.fallecido === 'SI'
      };
    } else {
      return {
        success: false,
        error: 'CUI no encontrado o inválido'
      };
    }
    
  } catch (error) {
    console.error('Error consultando CUI:', error);
    
    return {
      success: false,
      error: error.message,
      details: error.response ? error.response.data : null
    };
  }
}

// ============================================
// 6. ANULAR FACTURA
// ============================================

/**
 * Anula una factura certificada
 * @param {String} uuid - UUID de la factura a anular
 * @param {String} motivo - Motivo de anulación
 * @returns {Promise<Object>} Resultado de la anulación
 */
async function anularFactura(uuid, motivo) {
  try {
    const baseURL = FEL_CONFIG.ambiente === 'produccion'
      ? FEL_CONFIG.urls.produccion
      : FEL_CONFIG.urls.sandbox;
    
    const response = await axios.post(
      `${baseURL}/dte/anular`,
      {
        nit: FEL_CONFIG.nit,
        usuario: FEL_CONFIG.usuario,
        llave: FEL_CONFIG.clave,
        uuid: uuid,
        motivo: motivo
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    if (response.data && response.data.resultado) {
      return {
        success: true,
        mensaje: response.data.descripcion,
        fechaAnulacion: response.data.fecha
      };
    } else {
      throw new Error('No se pudo anular el documento');
    }
    
  } catch (error) {
    console.error('Error anulando factura:', error);
    
    return {
      success: false,
      error: error.message,
      details: error.response ? error.response.data : null
    };
  }
}

// ============================================
// 7. EJEMPLO DE USO COMPLETO
// ============================================

/**
 * Ejemplo de certificación completa de una factura
 */
async function ejemploCertificacionCompleta() {
  // Datos de ejemplo de una factura del sistema de agua
  const factura = {
    numeroFactura: '2024-01-0001',
    clienteId: {
      nombres: 'Juan',
      apellidos: 'Pérez',
      dpi: '1924044582106',
      contador: '001',
      lote: 'A-15',
      proyecto: 'Loti 1',
      whatsapp: '50212345678'
    },
    lecturaAnterior: 100,
    lecturaActual: 115,
    consumoLitros: 15,
    tarifaBase: 25.00,
    excedenteLitros: 5,
    costoExcedente: 10.00,
    subtotal: 75.00,
    montoTotal: 84.00, // Con IVA
    fechaEmision: new Date(),
    fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  };
  
  console.log('=== INICIANDO CERTIFICACIÓN FEL ===\\n');
  
  // 1. Si el cliente tiene DPI, validarlo
  if (factura.clienteId.dpi) {
    console.log('1. Validando CUI del cliente...');
    const cuiValidacion = await consultarCUI(factura.clienteId.dpi);
    
    if (cuiValidacion.success) {
      console.log(`✅ CUI válido: ${cuiValidacion.nombre}`);
      
      if (cuiValidacion.fallecido) {
        console.log('❌ ERROR: El cliente está registrado como fallecido');
        return;
      }
    } else {
      console.log(`⚠️ No se pudo validar el CUI: ${cuiValidacion.error}`);
    }
  }
  
  // 2. Certificar la factura
  console.log('\\n2. Certificando factura...');
  const resultado = await certificarFactura(factura);
  
  if (resultado.success) {
    console.log('✅ FACTURA CERTIFICADA EXITOSAMENTE');
    console.log(`   UUID: ${resultado.uuid}`);
    console.log(`   Número de Autorización: ${resultado.numeroAutorizacion}`);
    console.log(`   Serie: ${resultado.serie}`);
    console.log(`   Número: ${resultado.numero}`);
    console.log(`   Fecha: ${resultado.fechaCertificacion}`);
    
    // 3. Guardar en base de datos
    // await Factura.findByIdAndUpdate(facturaId, {
    //   felUUID: resultado.uuid,
    //   felNumeroAutorizacion: resultado.numeroAutorizacion,
    //   felSerie: resultado.serie,
    //   felNumero: resultado.numero,
    //   felFechaCertificacion: resultado.fechaCertificacion,
    //   felXML: resultado.xml,
    //   estado: 'certificada'
    // });
    
  } else {
    console.log('❌ ERROR EN CERTIFICACIÓN');
    console.log(`   Error: ${resultado.error}`);
    if (resultado.details) {
      console.log(`   Detalles: ${JSON.stringify(resultado.details, null, 2)}`);
    }
  }
}

// ============================================
// 8. EXPORTAR FUNCIONES
// ============================================

module.exports = {
  construirXMLFactura,
  certificarFactura,
  consultarNIT,
  consultarCUI,
  anularFactura,
  ejemploCertificacionCompleta
};

// ============================================
// 9. EJECUTAR EJEMPLO (solo si se ejecuta directamente)
// ============================================

if (require.main === module) {
  console.log('\\n' + '='.repeat(60));
  console.log('EJEMPLO DE CERTIFICACIÓN FEL - SISTEMA DE AGUA LOTI');
  console.log('='.repeat(60) + '\\n');
  
  ejemploCertificacionCompleta()
    .then(() => {
      console.log('\\n' + '='.repeat(60));
      console.log('PROCESO COMPLETADO');
      console.log('='.repeat(60));
    })
    .catch(error => {
      console.error('\\n❌ ERROR FATAL:', error);
    });
}
