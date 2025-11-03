# 📋 PLAN DE IMPLEMENTACIÓN COMPLETO - FEL INFILE SAT
## Sistema de Agua LOTI - Huehuetenango, Guatemala

**Fecha de creación:** 29 de octubre de 2025
**Versión del sistema:** 2.0
**Estado:** LISTO PARA IMPLEMENTAR

---

## 📊 ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Estado Actual del Sistema](#estado-actual-del-sistema)
3. [Cambios Recientes Implementados](#cambios-recientes-implementados)
4. [Arquitectura de Datos para FEL](#arquitectura-de-datos-para-fel)
5. [Pasos de Implementación](#pasos-de-implementación)
6. [Código a Implementar](#código-a-implementar)
7. [Estructura XML de Facturas](#estructura-xml-de-facturas)
8. [Pruebas y Validación](#pruebas-y-validación)
9. [Checklist de Implementación](#checklist-de-implementación)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 RESUMEN EJECUTIVO

### ✅ Lo que YA está implementado:

1. **Módulo de reconexión completo y funcional**
   - Sistema de opciones 80% y 100%
   - Cálculo automático de mora (7% mensual)
   - Facturas consolidadas con desglose por mes
   - Generación automática de tickets con formato correcto

2. **Sistema de tickets mejorado**
   - Detección automática de facturas de reconexión
   - Desglose mensual: Consumo + Mora + Subtotal
   - Agrupación inteligente por mes-año
   - Códigos QR con hash de verificación SHA256

3. **Modelos de base de datos actualizados**
   - Campo `fel` en modelos Factura y Pago
   - Campo `facturasConsolidadas[]` en Factura
   - Campo `tipoFactura` ('normal' | 'reconexion')
   - Modelo LogFEL para auditoría

4. **Estructura base de servicios FEL**
   - `backend/services/fel.service.js` (estructura)
   - `backend/controllers/fel.controller.js`
   - `backend/routes/fel.routes.js`
   - Variables de entorno configuradas

### 🔧 Lo que FALTA implementar:

1. Métodos de certificación en `fel.service.js`
2. Construcción de XML del DTE
3. Consultas de NIT y CUI
4. Integración con API de Infile
5. Manejo de errores y reintentos
6. Generación de PDF certificado

---

## 📦 ESTADO ACTUAL DEL SISTEMA

### Archivos Modificados Recientemente (29/10/2025)

#### `backend/services/ticketPago.service.js`
**Cambios realizados:**
- ✅ Líneas 81-87: Detección automática de facturas de reconexión
- ✅ Línea 1039: Agrupación por mes-año único
- ✅ Líneas 995-1002: Contador correcto de meses únicos

```javascript
// CAMBIO CRÍTICO: Detecta facturas de reconexión automáticamente
if (pago.facturaId.tipoFactura === 'reconexion') {
  return await this.generarTicketFacturaConsolidada(pago.facturaId._id);
}
```

#### `backend/services/reconexion.service.js`
**Cambios realizados:**
- ✅ Líneas 230-233: Eliminada generación manual de ticket (ahora es automática)
- ✅ Línea 336: Array `facturasConsolidadas` se llena correctamente

### Base de Datos - Colecciones Relevantes

#### Factura (facturas)
```javascript
{
  tipoFactura: 'reconexion',  // 'normal' | 'reconexion'
  facturasConsolidadas: [
    {
      facturaId: ObjectId,
      numeroFactura: String,
      mesNombre: String,        // "Mayo", "Junio", etc.
      periodo: { inicio: Date, fin: Date },
      montoOriginal: Number,
      montoMora: Number,
      diasMora: Number,
      subtotal: Number
    }
  ],
  fel: {
    certificada: Boolean,
    uuid: String,              // UUID asignado por SAT
    numeroAutorizacion: String,
    serie: String,
    numero: String,
    fechaCertificacion: Date,
    urlVerificacion: String,
    intentosFallidos: Number,
    ultimoError: String,
    tipoDocumento: String      // 'FACT', 'NCRE', etc.
  }
}
```

### Credenciales FEL (Sandbox)

```bash
# Ambiente de pruebas
FEL_AMBIENTE=sandbox
FEL_NIT=39840360
FEL_USUARIO=39840360
FEL_CLAVE=1E6E69845CDFFA02C82246468394408C
FEL_USUARIO_FIRMA=39840360
FEL_LLAVE_FIRMA=fa113ded48964de0f986089e3f3575ec

# URLs
FEL_URL_SANDBOX=https://fel-sandbox.infile.com.gt/api
FEL_URL_PRODUCCION=https://fel.infile.com.gt/api
```

**NOTA:** Estas credenciales están en el archivo `.env` pero VACÍAS. Debes agregarlas antes de implementar.

---

## 🔄 CAMBIOS RECIENTES IMPLEMENTADOS

### Problema Solucionado: Tickets de Reconexión

**Antes (Formato incorrecto):**
```
DETALLE DEL PAGO
 Subtotal Factura: Q 1800.00
 Mora:             Q  161.00
 Reconexión:       Q  125.00
 TOTAL PAGADO:     Q 2086.00
```

**Después (Formato correcto):**
```
DETALLE POR MES

Mayo 2025
  Consumo:      Q  450.00
  Mora (7%):    Q   94.50
  Subtotal:     Q  544.50

Junio 2025
  Consumo:      Q  350.00
  Mora (7%):    Q   49.00
  Subtotal:     Q  399.00

Julio 2025
  Consumo:      Q  250.00
  Mora (7%):    Q   17.50
  Subtotal:     Q  267.50

Agosto 2025
  Consumo:      Q  750.00
  Mora (7%):    Q    0.00
  Subtotal:     Q  750.00

─────────────────────────────
Total Consumo + Mora: Q 1961.00
Costo Reconexión:     Q  125.00
═════════════════════════════
TOTAL PAGADO:        Q 2086.00
```

### Flujo Actual del Sistema

```
┌─────────────────────────────────────────┐
│ Usuario procesa reconexión              │
│ POST /api/reconexion/procesar/:clienteId│
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ reconexion.service.js                   │
│ - Crea factura consolidada              │
│ - Llena array facturasConsolidadas[]    │
│ - Crea pago único                       │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ pago.controller.js                      │
│ - Llama a generarTicketPago()           │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ ticketPago.service.js                   │
│ - Detecta tipoFactura === 'reconexion'  │
│ - Redirige a generarTicket...Consolidada│
│ - Agrupa por mes-año                    │
│ - Genera PDF con desglose completo      │
└─────────────────────────────────────────┘
```

---

## 🏗️ ARQUITECTURA DE DATOS PARA FEL

### Mapeo: Factura Consolidada → DTE FEL

| Campo Sistema | Campo XML DTE | Ejemplo | Notas |
|---------------|---------------|---------|-------|
| `numeroFactura` | `NumeroDocumento` | FAC-RECON-202510-0001 | Número de factura consolidada |
| `clienteId.nombres + apellidos` | `NombreReceptor` | FELIX ANTONIO VASQUEZ ORTEGA | Nombre completo |
| `clienteId.dpi` | Requiere consulta CUI | 1234567890123 | Validar con API SAT |
| `fechaEmision` | `FechaHoraEmision` | 2025-10-28T10:30:00-06:00 | Formato ISO 8601 |
| `montoTotal` | `GranTotal` | 2086.00 | Total incluyendo reconexión |
| `facturasConsolidadas[].mesNombre` | `Descripcion` Item | Servicio de Agua - Mayo 2025 | Un item por mes |
| `costoReconexion` | `Total` Item final | 125.00 | Item separado de reconexión |

### Estructura de Items para Factura Consolidada

Una factura consolidada de reconexión con **4 meses** generaría **5 items** en el XML:

```xml
<dte:Items>
  <!-- ITEM 1: Mayo 2025 -->
  <dte:Item BienOServicio="S" NumeroLinea="1">
    <dte:Cantidad>1.00</dte:Cantidad>
    <dte:UnidadMedida>UNI</dte:UnidadMedida>
    <dte:Descripcion>Servicio de Agua Potable - Mayo 2025
Consumo: Q450.00
Mora (7%): Q94.50</dte:Descripcion>
    <dte:PrecioUnitario>544.50</dte:PrecioUnitario>
    <dte:Precio>544.50</dte:Precio>
    <dte:Total>544.50</dte:Total>
  </dte:Item>

  <!-- ITEM 2: Junio 2025 -->
  <dte:Item BienOServicio="S" NumeroLinea="2">
    <!-- ... similar estructura ... -->
  </dte:Item>

  <!-- ITEM 3: Julio 2025 -->
  <dte:Item BienOServicio="S" NumeroLinea="3">
    <!-- ... similar estructura ... -->
  </dte:Item>

  <!-- ITEM 4: Agosto 2025 -->
  <dte:Item BienOServicio="S" NumeroLinea="4">
    <!-- ... similar estructura ... -->
  </dte:Item>

  <!-- ITEM 5: Reconexión -->
  <dte:Item BienOServicio="S" NumeroLinea="5">
    <dte:Cantidad>1.00</dte:Cantidad>
    <dte:UnidadMedida>UNI</dte:UnidadMedida>
    <dte:Descripcion>Costo de Reconexión de Servicio</dte:Descripcion>
    <dte:PrecioUnitario>125.00</dte:PrecioUnitario>
    <dte:Precio>125.00</dte:Precio>
    <dte:Total>125.00</dte:Total>
  </dte:Item>
</dte:Items>
```

---

## 🚀 PASOS DE IMPLEMENTACIÓN

### Fase 1: Preparación del Entorno

#### 1.1 Instalar Dependencias Faltantes

```bash
cd D:\agua-loti
npm install xml2js uuid axios
```

**Paquetes necesarios:**
- `xml2js`: Para construir y parsear XML
- `uuid`: Para generar UUIDs únicos
- `axios`: Para peticiones HTTP a API de Infile

#### 1.2 Configurar Variables de Entorno

Editar `D:\agua-loti\.env`:

```bash
# ===== CONFIGURACIÓN FEL (Factura Electrónica) =====
FEL_AMBIENTE=sandbox
FEL_NIT=39840360
FEL_USUARIO=39840360
FEL_CLAVE=1E6E69845CDFFA02C82246468394408C
FEL_USUARIO_FIRMA=39840360
FEL_LLAVE_FIRMA=fa113ded48964de0f986089e3f3575ec

# URLs
FEL_URL_SANDBOX=https://fel-sandbox.infile.com.gt/api
FEL_URL_PRODUCCION=https://fel.infile.com.gt/api

# Consulta de receptores
FEL_URL_CONSULTA_NIT=https://consultareceptores.feel.com.gt/rest/action
FEL_URL_CONSULTA_CUI=https://certificador.feel.com.gt/api/v2/servicios/externos

# Datos del emisor
FEL_EMISOR_NOMBRE=SISTEMA DE AGUA LOTI
FEL_EMISOR_NOMBRE_COMERCIAL=Agua LOTI
FEL_EMISOR_DIRECCION=Huehuetenango, Guatemala
FEL_EMISOR_CODIGO_POSTAL=13001
FEL_EMISOR_MUNICIPIO=Huehuetenango
FEL_EMISOR_DEPARTAMENTO=Huehuetenango
FEL_EMISOR_PAIS=GT

# Configuración de facturación
FEL_CODIGO_ESTABLECIMIENTO=1
FEL_TIPO_MONEDA=GTQ
FEL_AFILIACION_IVA=GEN
```

#### 1.3 Verificar Estructura de Archivos

```bash
D:\agua-loti\backend\
├── services\
│   ├── fel.service.js          # ⚠️ REQUIERE IMPLEMENTACIÓN
│   ├── ticketPago.service.js   # ✅ YA IMPLEMENTADO
│   └── reconexion.service.js   # ✅ YA IMPLEMENTADO
├── controllers\
│   ├── fel.controller.js       # ⚠️ REQUIERE ACTUALIZACIÓN
│   └── pago.controller.js      # ✅ YA IMPLEMENTADO
├── models\
│   ├── factura.model.js        # ✅ YA TIENE CAMPOS FEL
│   ├── pago.model.js           # ✅ YA TIENE CAMPOS FEL
│   └── logFel.model.js         # ✅ YA EXISTE
└── routes\
    └── fel.routes.js           # ⚠️ REQUIERE ACTUALIZACIÓN
```

### Fase 2: Implementación del Servicio FEL

#### 2.1 Estructura Completa de `fel.service.js`

**Ubicación:** `D:\agua-loti\backend\services\fel.service.js`

El archivo actual tiene la estructura base. Necesitas implementar los siguientes métodos:

```javascript
class FELService {
  // ✅ YA EXISTE
  constructor() { ... }

  // ⚠️ IMPLEMENTAR
  async construirXMLFactura(factura, uuid) { ... }

  // ⚠️ IMPLEMENTAR
  async construirXMLFacturaConsolidada(facturaConsolidada, uuid) { ... }

  // ⚠️ IMPLEMENTAR
  async certificarFactura(facturaId) { ... }

  // ⚠️ IMPLEMENTAR
  async consultarNIT(nit) { ... }

  // ⚠️ IMPLEMENTAR
  async consultarCUI(cui) { ... }

  // ⚠️ IMPLEMENTAR
  async anularFactura(uuid, motivo) { ... }

  // ✅ YA EXISTE
  estaConfigurado() { ... }
}
```

#### 2.2 Método Principal: `certificarFactura()`

**Flujo de certificación:**

```javascript
async certificarFactura(facturaId) {
  try {
    // 1. Obtener factura de la BD
    const factura = await Factura.findById(facturaId)
      .populate('clienteId');

    // 2. Validar que no esté ya certificada
    if (factura.fel.certificada) {
      throw new Error('Factura ya certificada');
    }

    // 3. Validar datos del receptor (NIT o CUI)
    let datosReceptor;
    if (factura.clienteId.nit) {
      datosReceptor = await this.consultarNIT(factura.clienteId.nit);
    } else if (factura.clienteId.dpi) {
      datosReceptor = await this.consultarCUI(factura.clienteId.dpi);
    } else {
      // Consumidor final
      datosReceptor = { nit: 'CF', nombre: 'CONSUMIDOR FINAL' };
    }

    // 4. Generar UUID único
    const uuid = require('uuid').v4();

    // 5. Construir XML del DTE
    let xmlDTE;
    if (factura.tipoFactura === 'reconexion') {
      xmlDTE = await this.construirXMLFacturaConsolidada(factura, uuid, datosReceptor);
    } else {
      xmlDTE = await this.construirXMLFactura(factura, uuid, datosReceptor);
    }

    // 6. Enviar a certificar
    const response = await axios.post(
      `${this.baseURL}/dte/certificar`,
      {
        nit: this.credentials.nit,
        usuario: this.credentials.usuario,
        clave: this.credentials.clave,
        xml: xmlDTE
      }
    );

    // 7. Procesar respuesta
    if (response.data.resultado === true) {
      // Actualizar factura con datos de certificación
      factura.fel.certificada = true;
      factura.fel.uuid = response.data.uuid;
      factura.fel.numeroAutorizacion = response.data.autorizacion;
      factura.fel.fechaCertificacion = new Date();
      await factura.save();

      // Crear log
      await LogFEL.create({
        facturaId: factura._id,
        tipo: 'certificacion',
        estado: 'exitoso',
        respuesta: response.data
      });

      return { exitoso: true, uuid: response.data.uuid };
    } else {
      throw new Error(response.data.descripcion);
    }

  } catch (error) {
    // Registrar error
    await LogFEL.create({
      facturaId,
      tipo: 'certificacion',
      estado: 'error',
      error: error.message
    });

    throw error;
  }
}
```

#### 2.3 Construcción de XML para Factura Consolidada

**Método clave para reconexiones:**

```javascript
async construirXMLFacturaConsolidada(factura, uuid, datosReceptor) {
  const builder = new xml2js.Builder({
    xmldec: { version: '1.0', encoding: 'UTF-8' }
  });

  // Construir items (uno por cada mes + reconexión)
  const items = [];
  let numeroLinea = 1;

  // Agrupar facturas por mes (igual que en el ticket)
  const facturasPorMes = {};

  for (const detalle of factura.facturasConsolidadas) {
    const year = new Date(detalle.periodo.inicio).getFullYear();
    const mesKey = `${detalle.mesNombre}-${year}`;

    if (!facturasPorMes[mesKey]) {
      facturasPorMes[mesKey] = {
        mesNombre: detalle.mesNombre,
        year: year,
        montoOriginal: 0,
        montoMora: 0,
        subtotal: 0
      };
    }

    facturasPorMes[mesKey].montoOriginal += detalle.montoOriginal;
    facturasPorMes[mesKey].montoMora += detalle.montoMora || 0;
    facturasPorMes[mesKey].subtotal += detalle.subtotal;
  }

  // Ordenar por mes
  const mesesOrden = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const mesesOrdenados = Object.values(facturasPorMes).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return mesesOrden.indexOf(a.mesNombre) - mesesOrden.indexOf(b.mesNombre);
  });

  // Crear un item por cada mes
  for (const mes of mesesOrdenados) {
    items.push({
      'dte:Item': {
        '$': {
          BienOServicio: 'S',  // Servicio
          NumeroLinea: numeroLinea++
        },
        'dte:Cantidad': '1.00',
        'dte:UnidadMedida': 'UNI',
        'dte:Descripcion': `Servicio de Agua Potable - ${mes.mesNombre} ${mes.year}\nConsumo: Q${mes.montoOriginal.toFixed(2)}\nMora (7%): Q${mes.montoMora.toFixed(2)}`,
        'dte:PrecioUnitario': mes.subtotal.toFixed(2),
        'dte:Precio': mes.subtotal.toFixed(2),
        'dte:Descuento': '0.00',
        'dte:Total': mes.subtotal.toFixed(2)
      }
    });
  }

  // Agregar item de reconexión
  items.push({
    'dte:Item': {
      '$': {
        BienOServicio: 'S',
        NumeroLinea: numeroLinea
      },
      'dte:Cantidad': '1.00',
      'dte:UnidadMedida': 'UNI',
      'dte:Descripcion': 'Costo de Reconexión de Servicio de Agua',
      'dte:PrecioUnitario': factura.costoReconexion.toFixed(2),
      'dte:Precio': factura.costoReconexion.toFixed(2),
      'dte:Descuento': '0.00',
      'dte:Total': factura.costoReconexion.toFixed(2)
    }
  });

  // Calcular totales
  const totalSinImpuestos = factura.montoTotal; // El agua puede estar exenta de IVA

  // Construir estructura XML completa
  const obj = {
    'dte:GTDocumento': {
      '$': {
        'xmlns:dte': 'http://www.sat.gob.gt/dte/fel/0.2.0',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        Version: '0.1'
      },
      'dte:SAT': {
        '$': { ClaseDocumento: 'dte' },
        'dte:DTE': {
          '$': { ID: 'DatosCertificados' },
          'dte:DatosEmision': {
            '$': { ID: 'DatosEmision' },
            'dte:DatosGenerales': {
              '$': {
                CodigoMoneda: 'GTQ',
                FechaHoraEmision: new Date().toISOString(),
                Tipo: 'FACT'
              }
            },
            'dte:Emisor': {
              '$': {
                AfiliacionIVA: process.env.FEL_AFILIACION_IVA,
                CodigoEstablecimiento: process.env.FEL_CODIGO_ESTABLECIMIENTO,
                CorreoEmisor: '',
                NITEmisor: this.credentials.nit,
                NombreComercial: process.env.FEL_EMISOR_NOMBRE_COMERCIAL,
                NombreEmisor: process.env.FEL_EMISOR_NOMBRE
              },
              'dte:DireccionEmisor': {
                'dte:Direccion': process.env.FEL_EMISOR_DIRECCION,
                'dte:CodigoPostal': process.env.FEL_EMISOR_CODIGO_POSTAL,
                'dte:Municipio': process.env.FEL_EMISOR_MUNICIPIO,
                'dte:Departamento': process.env.FEL_EMISOR_DEPARTAMENTO,
                'dte:Pais': process.env.FEL_EMISOR_PAIS
              }
            },
            'dte:Receptor': {
              '$': {
                CorreoReceptor: factura.clienteId.correoElectronico || '',
                IDReceptor: datosReceptor.nit,
                NombreReceptor: datosReceptor.nombre
              },
              'dte:DireccionReceptor': {
                'dte:Direccion': factura.clienteId.direccion || 'Ciudad',
                'dte:CodigoPostal': '01001',
                'dte:Municipio': 'Huehuetenango',
                'dte:Departamento': 'Huehuetenango',
                'dte:Pais': 'GT'
              }
            },
            'dte:Frases': {
              'dte:Frase': {
                '$': {
                  CodigoEscenario: '2',
                  TipoFrase: '1'
                }
              }
            },
            'dte:Items': items,
            'dte:Totales': {
              'dte:TotalImpuestos': {
                'dte:TotalImpuesto': {
                  '$': {
                    NombreCorto: 'IVA',
                    TotalMontoImpuesto: '0.00'
                  },
                  'dte:Monto': totalSinImpuestos.toFixed(2)
                }
              },
              'dte:GranTotal': totalSinImpuestos.toFixed(2)
            }
          }
        }
      }
    }
  };

  return builder.buildObject(obj);
}
```

### Fase 3: Actualizar Controladores

#### 3.1 Actualizar `fel.controller.js`

```javascript
const felService = require('../services/fel.service');

/**
 * Certificar una factura ante la SAT
 */
exports.certificarFactura = async (req, res) => {
  try {
    const { id } = req.params; // ID de la factura

    const resultado = await felService.certificarFactura(id);

    res.status(200).json({
      mensaje: 'Factura certificada exitosamente',
      uuid: resultado.uuid
    });

  } catch (error) {
    console.error('Error al certificar factura:', error);
    res.status(500).json({
      mensaje: 'Error al certificar factura',
      error: error.message
    });
  }
};

/**
 * Consultar estado de certificación FEL
 */
exports.verificarEstado = async (req, res) => {
  try {
    const estado = felService.estaConfigurado();

    res.status(200).json({
      configurado: estado,
      ambiente: process.env.FEL_AMBIENTE || 'no configurado'
    });

  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al verificar estado FEL',
      error: error.message
    });
  }
};
```

#### 3.2 Actualizar `pago.controller.js`

**Integrar certificación automática después de crear el pago:**

```javascript
// Después de crear el pago exitosamente (línea ~325)

// Generar ticket automáticamente
try {
  const ticketResultado = await ticketPagoService.generarTicketPago(pago._id);

  if (ticketResultado.exitoso) {
    console.log('✅ Ticket generado:', ticketResultado.nombreArchivo);
  }
} catch (ticketError) {
  console.warn('⚠️ Error al generar ticket:', ticketError.message);
}

// NUEVO: Certificar con FEL si está configurado
if (process.env.FEL_AMBIENTE && factura.fel && !factura.fel.certificada) {
  try {
    const felService = require('../services/fel.service');

    if (felService.estaConfigurado()) {
      console.log('🔐 Iniciando certificación FEL...');

      const resultadoFEL = await felService.certificarFactura(factura._id);

      if (resultadoFEL.exitoso) {
        console.log('✅ Factura certificada con UUID:', resultadoFEL.uuid);

        // Actualizar el pago con datos FEL
        pago.fel = {
          generado: true,
          uuid: resultadoFEL.uuid,
          fechaCertificacion: new Date()
        };
        await pago.save();
      }
    } else {
      console.log('⚠️ FEL no configurado, saltando certificación');
    }
  } catch (felError) {
    console.error('❌ Error en certificación FEL:', felError.message);
    // No fallar el pago si falla FEL
  }
}
```

### Fase 4: Rutas de API

#### 4.1 Actualizar `fel.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const felController = require('../controllers/fel.controller');
const auth = require('../middlewares/auth');

/**
 * @route GET /api/fel/estado
 * @desc Verificar configuración de FEL
 * @access Private
 */
router.get('/estado', auth, felController.verificarEstado);

/**
 * @route POST /api/fel/certificar/:id
 * @desc Certificar factura ante la SAT
 * @param {string} id - ID de la factura
 * @access Private
 */
router.post('/certificar/:id', auth, felController.certificarFactura);

/**
 * @route POST /api/fel/anular/:uuid
 * @desc Anular factura certificada
 * @param {string} uuid - UUID de la factura
 * @access Private
 */
router.post('/anular/:uuid', auth, felController.anularFactura);

/**
 * @route GET /api/fel/logs/:facturaId
 * @desc Obtener logs de certificación de una factura
 * @param {string} facturaId - ID de la factura
 * @access Private
 */
router.get('/logs/:facturaId', auth, felController.obtenerLogs);

module.exports = router;
```

### Fase 5: Scripts de Prueba

#### 5.1 Script de Prueba de Certificación

**Crear:** `D:\agua-loti\backend\scripts\test-certificacion-fel.js`

```javascript
/**
 * Script de prueba para certificación FEL
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Factura = require('../models/factura.model');
const felService = require('../services/fel.service');

async function testCertificacion() {
  try {
    // Conectar a MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/agua-loti';
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB\n');

    // Verificar configuración FEL
    console.log('🔍 Verificando configuración FEL...');
    if (!felService.estaConfigurado()) {
      console.log('❌ FEL no está configurado. Verifica las variables de entorno.');
      return;
    }
    console.log('✅ FEL configurado correctamente\n');

    // Buscar una factura consolidada de prueba
    const factura = await Factura.findOne({
      tipoFactura: 'reconexion',
      'fel.certificada': false
    }).populate('clienteId');

    if (!factura) {
      console.log('❌ No se encontró una factura de reconexión sin certificar');
      return;
    }

    console.log('📄 Factura encontrada:');
    console.log(`   Número: ${factura.numeroFactura}`);
    console.log(`   Cliente: ${factura.clienteId.nombres} ${factura.clienteId.apellidos}`);
    console.log(`   Monto: Q${factura.montoTotal}`);
    console.log(`   Meses: ${factura.facturasConsolidadas.length}\n`);

    // Intentar certificación
    console.log('🔐 Iniciando certificación...\n');
    const resultado = await felService.certificarFactura(factura._id);

    if (resultado.exitoso) {
      console.log('\n✅ CERTIFICACIÓN EXITOSA:');
      console.log(`   UUID: ${resultado.uuid}`);
      console.log(`   Autorización: ${resultado.autorizacion}`);
      console.log(`   Fecha: ${new Date().toLocaleString()}`);
    } else {
      console.log('\n❌ CERTIFICACIÓN FALLIDA:');
      console.log(`   Error: ${resultado.error}`);
    }

  } catch (error) {
    console.error('\n❌ Error en prueba:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Desconectado de MongoDB');
  }
}

testCertificacion();
```

**Ejecutar:**
```bash
cd D:\agua-loti\backend
node scripts/test-certificacion-fel.js
```

---

## 📊 ESTRUCTURA XML DE FACTURAS

### Factura Normal (Un Solo Mes)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<dte:GTDocumento xmlns:dte="http://www.sat.gob.gt/dte/fel/0.2.0" Version="0.1">
  <dte:SAT ClaseDocumento="dte">
    <dte:DTE ID="DatosCertificados">
      <dte:DatosEmision ID="DatosEmision">

        <dte:DatosGenerales
          CodigoMoneda="GTQ"
          FechaHoraEmision="2025-10-29T10:30:00.000-06:00"
          Tipo="FACT"/>

        <dte:Emisor
          AfiliacionIVA="GEN"
          CodigoEstablecimiento="1"
          NITEmisor="39840360"
          NombreEmisor="SISTEMA DE AGUA LOTI"
          NombreComercial="Agua LOTI">
          <dte:DireccionEmisor>
            <dte:Direccion>Huehuetenango, Guatemala</dte:Direccion>
            <dte:CodigoPostal>13001</dte:CodigoPostal>
            <dte:Municipio>Huehuetenango</dte:Municipio>
            <dte:Departamento>Huehuetenango</dte:Departamento>
            <dte:Pais>GT</dte:Pais>
          </dte:DireccionEmisor>
        </dte:Emisor>

        <dte:Receptor
          IDReceptor="1234567890123"
          NombreReceptor="FELIX ANTONIO VASQUEZ ORTEGA">
          <dte:DireccionReceptor>
            <dte:Direccion>Huehuetenango</dte:Direccion>
            <dte:CodigoPostal>13001</dte:CodigoPostal>
            <dte:Municipio>Huehuetenango</dte:Municipio>
            <dte:Departamento>Huehuetenango</dte:Departamento>
            <dte:Pais>GT</dte:Pais>
          </dte:DireccionReceptor>
        </dte:Receptor>

        <dte:Frases>
          <dte:Frase CodigoEscenario="2" TipoFrase="1"/>
        </dte:Frases>

        <dte:Items>
          <dte:Item BienOServicio="S" NumeroLinea="1">
            <dte:Cantidad>1.00</dte:Cantidad>
            <dte:UnidadMedida>UNI</dte:UnidadMedida>
            <dte:Descripcion>Servicio de Agua Potable - Octubre 2025
Lectura Anterior: 1200
Lectura Actual: 1500
Consumo: 300 litros</dte:Descripcion>
            <dte:PrecioUnitario>50.00</dte:PrecioUnitario>
            <dte:Precio>50.00</dte:Precio>
            <dte:Descuento>0.00</dte:Descuento>
            <dte:Total>50.00</dte:Total>
          </dte:Item>
        </dte:Items>

        <dte:Totales>
          <dte:TotalImpuestos>
            <dte:TotalImpuesto NombreCorto="IVA" TotalMontoImpuesto="0.00">
              <dte:Monto>50.00</dte:Monto>
            </dte:TotalImpuesto>
          </dte:TotalImpuestos>
          <dte:GranTotal>50.00</dte:GranTotal>
        </dte:Totales>

      </dte:DatosEmision>
    </dte:DTE>
  </dte:SAT>
</dte:GTDocumento>
```

### Factura Consolidada (Reconexión)

```xml
<!-- Similar estructura pero con múltiples items -->
<dte:Items>
  <dte:Item BienOServicio="S" NumeroLinea="1">
    <!-- Mayo 2025 -->
  </dte:Item>
  <dte:Item BienOServicio="S" NumeroLinea="2">
    <!-- Junio 2025 -->
  </dte:Item>
  <dte:Item BienOServicio="S" NumeroLinea="3">
    <!-- Julio 2025 -->
  </dte:Item>
  <dte:Item BienOServicio="S" NumeroLinea="4">
    <!-- Agosto 2025 -->
  </dte:Item>
  <dte:Item BienOServicio="S" NumeroLinea="5">
    <!-- Reconexión -->
  </dte:Item>
</dte:Items>

<dte:Totales>
  <dte:GranTotal>2086.00</dte:GranTotal>
</dte:Totales>
```

---

## 🧪 PRUEBAS Y VALIDACIÓN

### Checklist de Pruebas

#### Pruebas en Sandbox

- [ ] **Prueba 1:** Certificar factura normal (un solo mes)
  - Cliente con NIT válido
  - Verificar UUID generado
  - Validar XML enviado

- [ ] **Prueba 2:** Certificar factura con consumidor final (CF)
  - Sin NIT ni CUI
  - Debe usar CF como receptor

- [ ] **Prueba 3:** Certificar factura consolidada de reconexión
  - 2-6 meses consolidados
  - Verificar items en XML
  - Validar totales

- [ ] **Prueba 4:** Consulta de NIT
  - NIT válido debe retornar nombre
  - NIT inválido debe fallar gracefully

- [ ] **Prueba 5:** Consulta de CUI/DPI
  - DPI válido debe retornar datos
  - DPI inválido debe fallar

- [ ] **Prueba 6:** Manejo de errores
  - Factura sin cliente
  - Factura con datos incompletos
  - Error de conexión con Infile

- [ ] **Prueba 7:** Logs de auditoría
  - Verificar creación de LogFEL
  - Intentos fallidos registrados
  - Éxitos registrados

#### Validaciones de Datos

```javascript
// Validaciones necesarias antes de certificar
function validarFacturaParaFEL(factura) {
  const errores = [];

  // Cliente
  if (!factura.clienteId) {
    errores.push('Factura sin cliente asociado');
  }

  // Monto
  if (factura.montoTotal <= 0) {
    errores.push('Monto total debe ser mayor a 0');
  }

  // Fecha
  if (!factura.fechaEmision) {
    errores.push('Falta fecha de emisión');
  }

  // Para reconexión
  if (factura.tipoFactura === 'reconexion') {
    if (!factura.facturasConsolidadas || factura.facturasConsolidadas.length === 0) {
      errores.push('Factura de reconexión sin facturas consolidadas');
    }
  }

  return {
    valido: errores.length === 0,
    errores
  };
}
```

### Comandos de Prueba

```bash
# 1. Verificar configuración
curl http://localhost:3000/api/fel/estado

# 2. Certificar factura (reemplazar ID)
curl -X POST http://localhost:3000/api/fel/certificar/67123abc...

# 3. Ver logs de una factura
curl http://localhost:3000/api/fel/logs/67123abc...
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Pre-Implementación
- [ ] Copiar documentos de Infile a `D:\agua-loti\Documentacion\files (1)\`
- [ ] Revisar y entender documentación de Infile
- [ ] Verificar que las modificaciones de frontend estén completas

### Instalación y Configuración
- [ ] Instalar dependencias: `npm install xml2js uuid axios`
- [ ] Actualizar `.env` con credenciales de sandbox
- [ ] Verificar que el servidor arranca sin errores

### Implementación de Código
- [ ] Implementar `construirXMLFactura()` en `fel.service.js`
- [ ] Implementar `construirXMLFacturaConsolidada()` en `fel.service.js`
- [ ] Implementar `certificarFactura()` en `fel.service.js`
- [ ] Implementar `consultarNIT()` en `fel.service.js`
- [ ] Implementar `consultarCUI()` en `fel.service.js`
- [ ] Actualizar `fel.controller.js`
- [ ] Integrar certificación en `pago.controller.js`
- [ ] Actualizar rutas en `fel.routes.js`

### Pruebas en Sandbox
- [ ] Ejecutar `test-certificacion-fel.js`
- [ ] Certificar factura normal exitosamente
- [ ] Certificar factura consolidada exitosamente
- [ ] Probar con consumidor final (CF)
- [ ] Probar consulta de NIT
- [ ] Probar consulta de CUI
- [ ] Verificar logs en MongoDB (colección `logfels`)

### Integración con Frontend
- [ ] Agregar botón "Certificar con FEL" en interfaz de facturas
- [ ] Mostrar estado de certificación (UUID, fecha)
- [ ] Mostrar errores de certificación al usuario
- [ ] Agregar indicador visual de facturas certificadas

### Preparación para Producción
- [ ] Completar formulario de Infile con detalles de facturación
- [ ] Enviar formulario a asesora de Infile
- [ ] Solicitar credenciales de producción
- [ ] Actualizar `.env` con credenciales de producción
- [ ] Cambiar `FEL_AMBIENTE=produccion`
- [ ] Realizar certificación de prueba en producción
- [ ] Capacitar usuarios finales

---

## 🔧 TROUBLESHOOTING

### Problemas Comunes

#### Error: "The uri parameter must be a string"
**Causa:** Variable `MONGO_URI` no está definida en `.env`
**Solución:** Verificar que existe `MONGO_URI=mongodb://localhost:27017/agua-loti` en `.env`

#### Error: "FEL no configurado"
**Causa:** Variables FEL vacías o incorrectas
**Solución:**
1. Verificar que existen las credenciales en `.env`
2. Ejecutar: `node -e "console.log(require('dotenv').config()); console.log(process.env.FEL_NIT)"`

#### Error: "Factura ya certificada"
**Causa:** Intentando re-certificar una factura
**Solución:** Las facturas certificadas no se pueden modificar. Solo certificar facturas con `fel.certificada = false`

#### Error de conexión a Infile API
**Causa:** Problemas de red o credenciales incorrectas
**Solución:**
1. Verificar conexión a internet
2. Probar endpoint manualmente con Postman
3. Verificar que estás usando sandbox: `https://fel-sandbox.infile.com.gt/api`

#### XML mal formado
**Causa:** Errores en construcción del DTE
**Solución:**
1. Validar XML con herramienta online
2. Revisar que todos los campos requeridos existen
3. Verificar encoding UTF-8

### Scripts de Diagnóstico

#### Verificar Configuración
```bash
node -e "
require('dotenv').config();
console.log('FEL_AMBIENTE:', process.env.FEL_AMBIENTE);
console.log('FEL_NIT:', process.env.FEL_NIT ? 'Configurado' : 'NO configurado');
console.log('FEL_CLAVE:', process.env.FEL_CLAVE ? 'Configurado' : 'NO configurado');
"
```

#### Verificar Dependencias
```bash
npm list xml2js uuid axios
```

#### Test de Conexión a MongoDB
```bash
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/agua-loti')
  .then(() => { console.log('✅ MongoDB conectado'); process.exit(0); })
  .catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
"
```

---

## 📚 RECURSOS Y REFERENCIAS

### Documentación Oficial

1. **SAT Guatemala - FEL:**
   https://portal.sat.gob.gt/portal/factura-electronica-en-linea-fel/

2. **Infile - Portal de Certificador:**
   https://fel.infile.com.gt

3. **Especificación XML DTE:**
   http://www.sat.gob.gt/dte/fel/

### Archivos del Proyecto

- `D:\agua-loti\Documentacion\ANALISIS_IMPLEMENTACION_FEL.md` - Análisis completo
- `D:\agua-loti\Documentacion\GUIA_RAPIDA_FEL.md` - Guía rápida
- `D:\agua-loti\backend\services\fel.service.js` - Servicio FEL
- `D:\agua-loti\backend\models\factura.model.js` - Modelo con campos FEL

### Contactos de Soporte

**Asesora de Infile:**
- Nombre: Stephanie Montoya
- Email: implementaciones10@infile.com
- Ticket: #31914753673

**Cliente:**
- Nombre: ANA SUSANA VÁSQUEZ ORDOÑEZ
- NIT: 39840360

---

## 🎯 PRÓXIMOS PASOS INMEDIATOS

### Cuando Retomes la Implementación:

1. **Leer este documento completo** (15-20 minutos)

2. **Verificar que las modificaciones de frontend estén completas**

3. **Copiar documentos de Infile** a la carpeta de documentación

4. **Instalar dependencias:**
   ```bash
   cd D:\agua-loti
   npm install xml2js uuid axios
   ```

5. **Configurar credenciales en `.env`** (copiar del Excel de Infile)

6. **Implementar métodos en `fel.service.js`** siguiendo los ejemplos de este documento

7. **Ejecutar script de prueba:**
   ```bash
   node backend/scripts/test-certificacion-fel.js
   ```

8. **Revisar logs y ajustar** según errores encontrados

9. **Integrar con frontend** cuando backend esté funcionando

10. **Documentar cualquier cambio** en este archivo

---

## 📝 NOTAS FINALES

### Consideraciones Importantes

1. **Backup antes de producción:** Siempre respaldar la base de datos antes de habilitar FEL en producción

2. **Certificación irreversible:** Una vez certificada, una factura NO se puede modificar

3. **Anulaciones:** Si necesitas corregir una factura certificada, debes generar una NOTA DE CRÉDITO

4. **IVA en servicios de agua:** Verificar con contador si el servicio está exento o no

5. **Modo de contingencia:** Implementar sistema de contingencia para cuando Infile esté caído

6. **Almacenamiento de XML:** Guardar XML de cada factura certificada por auditoría

### Mejoras Futuras (Opcional)

- [ ] Generación automática de notas de crédito
- [ ] Panel de administración de facturas certificadas
- [ ] Reporte de facturas certificadas por período
- [ ] Notificaciones por email con factura PDF
- [ ] Integración con WhatsApp Business API
- [ ] Sistema de recordatorios de facturas vencidas

---

**Documento generado:** 29 de octubre de 2025
**Última actualización:** 29 de octubre de 2025
**Versión:** 1.0
**Autor:** Claude Code Assistant

---

## ✅ ESTE DOCUMENTO CONTIENE:

- ✅ Estado actual completo del sistema
- ✅ Cambios implementados recientemente
- ✅ Pasos detallados de implementación
- ✅ Ejemplos de código completos
- ✅ Scripts de prueba
- ✅ Checklist de tareas
- ✅ Solución de problemas
- ✅ Referencias y contactos

**¡Todo listo para retomar cuando termines las modificaciones del frontend!** 🚀
