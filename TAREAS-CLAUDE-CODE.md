# 🚀 TASKS FOR CLAUDE CODE - Sistema Agua LOTI

## 📖 HOW TO USE THIS FILE

### Preparation

1. Save this file as `TAREAS-CLAUDE-CODE.md` in the root of your agua-loti project

2. Open your terminal in the project folder

3. Execute: `claude-code`

4. Follow the instructions phase by phase

### Workflow

```text

YOU say → "Read TAREAS-CLAUDE-CODE.md and execute Phase 1"

        ↓

CLAUDE CODE → Creates/modifies files

        ↓

YOU review → Verify everything is correct

        ↓

YOU say → "Now execute Phase 2"

        ↓

And so on...

```text


### ⚠️ CRITICAL RULES (Claude Code must follow)

1. **NEVER duplicate files** - Modify the originals directly

2. **Nomenclature ALWAYS in Spanish** - clienteId, facturaId, montoMora, etc.

3. **FEL only base structure** - DO NOT implement real connection with Infile


---


## 🎯 PHASE 1: MODIFY FACTURA MODEL


### Objective

Add fields for FEL, late fees (mora), and document reference to the EXISTING Factura model.


### Instruction for Claude Code

```text

"Open the file backend/models/factura.model.js and add the following fields at the END of the existing schema. KEEP all fields that already exist. DO NOT create a new file, modify the existing one directly."

```text


### Código a agregar (después de los campos existentes)

```javascript

// ===== AGREGAR ESTOS CAMPOS AL SCHEMA EXISTENTE =====


// Información de Factura Electrónica (FEL)

fel: {

   certificada: { type: Boolean, default: false },

   uuid: { type: String, default: null },

   numeroAutorizacion: { type: String, default: null },

   serie: { type: String, default: null },

   numero: { type: String, default: null },

   fechaCertificacion: { type: Date, default: null },

   urlVerificacion: { type: String, default: null },

   intentosFallidos: { type: Number, default: 0 },

   ultimoError: { type: String, default: null },

   tipoDocumento: { 

     type: String, 

     enum: \['FACT', 'NCRE', 'NDEB', 'NABN'],

     default: 'FACT'

   }

},


// Referencia a documento original (para NCRE y NDEB)

documentoReferencia: {

   tipo: { type: String, enum: \['factura', 'nota'], default: null },

   uuid: { type: String, default: null },

   numeroDocumento: { type: String, default: null }

},


// Información de mora detallada

detallesMora: {

   diasVencidos: { type: Number, default: 0 },

   mesesCompletos: { type: Number, default: 0 },

   porcentajeMora: { type: Number, default: 0 },

   calculadoEn: { type: Date, default: null }

}

```text


### ✅ Validation

Check that `backend/models/factura.model.js`:

- Has the 3 new fields (fel, documentoReferencia, detallesMora)

- Keeps ALL the fields it already had

- NO file exists like `factura.model.nuevo.js` or similar


---


## 🎯 PHASE 2: MODIFY CLIENTE MODEL


### Objective

Add reconnection and service status fields to the EXISTING Cliente model.


### Instruction for Claude Code

```text

"Open backend/models/cliente.model.js and add these fields to the existing schema. KEEP all original fields. DO NOT create a new file."

```text


### Código a agregar

```javascript

// ===== AGREGAR AL SCHEMA EXISTENTE =====


// Información de reconexiones

numeroReconexiones: {

   type: Number,

   default: 0,

   min: 0

},


fechaUltimaReconexion: {

   type: Date,

   default: null

},


// Estado de servicio

estadoServicio: {

   type: String,

   enum: \['activo', 'suspendido', 'cortado'],

   default: 'activo'

},


// Notas de alerta

alertas: \[{

   tipo: { type: String, enum: \['mora', 'corte', 'reconexion'] },

   mensaje: { type: String },

   fecha: { type: Date, default: Date.now }

}]

```text


### ✅ Validation

- `backend/models/cliente.model.js` has the 4 new fields

- Keeps all original fields

- NO duplicate file exists


---


## 🎯 PHASE 3: CREATE MORA SERVICE


### Objective

Create the service that calculates accumulated late fees for clients.


### Instruction for Claude Code

```text

"Create the file backend/services/mora.service.js with the following complete code:"

```text


### Código completo

```javascript

/**

  \* Servicio de Cálculo de Mora Acumulada

  \* Sistema de Agua LOTI - Huehuetenango, Guatemala

  \*/


const Factura = require('../models/factura.model');


class MoraService {

   constructor() {

     this.MORA\_MENSUAL = 0.07; // 7% mensual

   }


   /**

    \* Calcula mora acumulada para un cliente con múltiples facturas vencidas

    \* @param {String} clienteId - ID del cliente

    \* @returns {Object} Detalle completo de mora

    \*/

   async calcularMoraAcumuladaCliente(clienteId) {

     try {

       // Obtener todas las facturas pendientes del cliente, ordenadas por antigüedad

       const facturasPendientes = await Factura.find({

         clienteId: clienteId,

         estado: 'pendiente'

       }).sort({ fechaEmision: 1 }); // Más antiguas primero

       

       if (facturasPendientes.length === 0) {

         return {

           tieneDeuda: false,

           facturasPendientes: 0,

           mesesAtrasados: 0,

           montoOriginalTotal: 0,

           moraTotal: 0,

           totalAPagar: 0,

           detalleFacturas: \[]

         };

       }

       

       const hoy = new Date();

       let montoOriginalTotal = 0;

       let moraTotal = 0;

       const detalleFacturas = \[];

       

       for (const factura of facturasPendientes) {

         const detalleFactura = this.calcularMoraFactura(factura, hoy);

         detalleFacturas.push(detalleFactura);

         

         montoOriginalTotal += detalleFactura.montoOriginal;

         moraTotal += detalleFactura.montoMora;

       }

       

       const totalAPagar = montoOriginalTotal + moraTotal;

       

       // Determinar nivel de criticidad

       const mesesAtrasados = detalleFacturas.length;

       let nivelCriticidad = 'bajo';

       if (mesesAtrasados >= 3) nivelCriticidad = 'critico';

       else if (mesesAtrasados >= 2) nivelCriticidad = 'alto';

       else if (mesesAtrasados >= 1) nivelCriticidad = 'medio';

       

       // Determinar si requiere reconexión

       const requiereReconexion = mesesAtrasados >= 2;

       

       return {

         tieneDeuda: true,

         facturasPendientes: facturasPendientes.length,

         mesesAtrasados: mesesAtrasados,

         montoOriginalTotal: Math.round(montoOriginalTotal \* 100) / 100,

         moraTotal: Math.round(moraTotal \* 100) / 100,

         totalAPagar: Math.round(totalAPagar \* 100) / 100,

         nivelCriticidad,

         requiereReconexion,

         costoReconexion: requiereReconexion ? 125.00 : 0,

         detalleFacturas,

         facturasMasAntigua: detalleFacturas\[0],

         facturasMasReciente: detalleFacturas\[detalleFacturas.length - 1]

       };

       

     } catch (error) {

       console.error('\[MoraService] Error al calcular mora acumulada:', error);

       throw new Error(`Error al calcular mora: ${error.message}`);

     }

   }


   /**

    \* Calcula mora para una factura individual

    \* @param {Object} factura - Documento de factura

    \* @param {Date} fechaCalculo - Fecha para calcular (default: hoy)

    \*/

   calcularMoraFactura(factura, fechaCalculo = new Date()) {

     const fechaVencimiento = new Date(factura.fechaVencimiento);

     

     // Si no está vencida

     if (fechaCalculo <= fechaVencimiento) {

       return {

         facturaId: factura.\_id,

         numeroFactura: factura.numeroFactura,

         fechaEmision: factura.fechaEmision,

         fechaVencimiento: factura.fechaVencimiento,

         montoOriginal: factura.montoTotal,

         diasVencidos: 0,

         mesesCompletos: 0,

         porcentajeMora: 0,

         montoMora: 0,

         totalConMora: factura.montoTotal,

         estado: 'vigente'

       };

     }

     

     // Calcular días vencidos

     const diasVencidos = Math.floor((fechaCalculo - fechaVencimiento) / (1000 \* 60 \* 60 \* 24));

     

     // Calcular meses completos

     const mesesCompletos = Math.floor(diasVencidos / 30);

     

     // Calcular porcentaje de mora

     const porcentajeMora = mesesCompletos \* this.MORA\_MENSUAL;

     

     // Calcular monto de mora

     const montoMora = factura.montoTotal \* porcentajeMora;

     

     // Total con mora

     const totalConMora = factura.montoTotal + montoMora;

     

     return {

       facturaId: factura.\_id,

       numeroFactura: factura.numeroFactura,

       fechaEmision: factura.fechaEmision,

       fechaVencimiento: factura.fechaVencimiento,

       montoOriginal: factura.montoTotal,

       diasVencidos,

       mesesCompletos,

       porcentajeMora: Math.round(porcentajeMora \* 10000) / 100,

       montoMora: Math.round(montoMora \* 100) / 100,

       totalConMora: Math.round(totalConMora \* 100) / 100,

       estado: mesesCompletos >= 2 ? 'critico' : 'vencido'

     };

   }


   /**

    \* Verifica si un cliente requiere corte de servicio

    \* @param {String} clienteId 

    \*/

   async requiereCorteServicio(clienteId) {

     try {

       const mora = await this.calcularMoraAcumuladaCliente(clienteId);

       

       return {

         requiereCorte: mora.mesesAtrasados >= 2,

         mesesAtrasados: mora.mesesAtrasados,

         montoAdeudado: mora.totalAPagar,

         razon: mora.mesesAtrasados >= 2 

           ? `Cliente con ${mora.mesesAtrasados} meses sin pagar` 

           : 'No requiere corte'

       };

     } catch (error) {

       console.error('\[MoraService] Error al verificar corte:', error);

       throw error;

     }

   }

}


module.exports = new MoraService();

```text


### ✅ Validation

- File `backend/services/mora.service.js` exists

- Has 3 methods: calcularMoraAcumuladaCliente, calcularMoraFactura, requiereCorteServicio


---


## 🎯 PHASE 4: CREATE RECONEXION AND LOG FEL MODELS


### Objective

Create models for reconnection history and FEL logs.


### Instruction for Claude Code

```text

"Create these two new files with their complete code:"

```text


### File 1 `backend/models/reconexion.model.js`

```javascript

const mongoose = require('mongoose');


const reconexionSchema = new mongoose.Schema({

   clienteId: {

     type: mongoose.Schema.Types.ObjectId,

     ref: 'Cliente',

     required: true

   },

   tipoOpcion: {

     type: String,

     enum: \['parcial', 'total', 'emergencia'],

     required: true

   },

   montoTotal: {

     type: Number,

     required: true,

     min: 0

   },

   montoDeuda: {

     type: Number,

     required: true,

     min: 0

   },

   costoReconexion: {

     type: Number,

     required: true,

     default: 125.00

   },

   saldoPendiente: {

     type: Number,

     default: 0,

     min: 0

   },

   facturasPagadas: \[{

     type: mongoose.Schema.Types.ObjectId,

     ref: 'Factura'

   }],

   metodoPago: {

     type: String,

     required: true

   },

   referencia: String,

   procesadoPor: {

     type: mongoose.Schema.Types.ObjectId,

     ref: 'User',

     required: true

   },

   fechaReconexion: {

     type: Date,

     default: Date.now

   },

   observaciones: String,

   

   // Campos para reconexión de emergencia

   esEmergencia: {

     type: Boolean,

     default: false

   },

   justificacion: String,

   autorizadoPor: {

     type: mongoose.Schema.Types.ObjectId,

     ref: 'User'

   }

}, {

   timestamps: true

});


reconexionSchema.index({ clienteId: 1, fechaReconexion: -1 });


module.exports = mongoose.model('Reconexion', reconexionSchema);

```text


### File 2 `backend/models/logFel.model.js`

```javascript

const mongoose = require('mongoose');


const logFelSchema = new mongoose.Schema({

   facturaId: {

     type: mongoose.Schema.Types.ObjectId,

     ref: 'Factura',

     required: true

   },

   tipo: {

     type: String,

     enum: \['certificacion', 'anulacion', 'consulta'],

     required: true

   },

   estado: {

     type: String,

     enum: \['exitoso', 'error', 'pendiente'],

     required: true

   },

   intentos: {

     type: Number,

     default: 1

   },

   respuesta: {

     type: mongoose.Schema.Types.Mixed

   },

   error: {

     type: String

   },

   detalles: {

     type: mongoose.Schema.Types.Mixed

   },

   timestamp: {

     type: Date,

     default: Date.now

   }

}, {

   timestamps: true

});


logFelSchema.index({ facturaId: 1, timestamp: -1 });

logFelSchema.index({ estado: 1, timestamp: -1 });


module.exports = mongoose.model('LogFEL', logFelSchema);

```text


### ✅ Validation

- Files `backend/models/reconexion.model.js` and `backend/models/logFel.model.js` exist

- Both export mongoose models


---


## 🎯 PHASE 5: CREATE RECONEXION SERVICE


### Objective

Create the service that handles reconnection options and process.


### Instruction for Claude Code

```text

"Create backend/services/reconexion.service.js with this complete code:"

```text


### Complete code

```javascript

/**

  \* Servicio de Reconexión de Servicio de Agua

  \* Maneja reconexiones con opciones 80% y 100%

  \*/


const Factura = require('../models/factura.model');

const Cliente = require('../models/cliente.model');

const Reconexion = require('../models/reconexion.model');

const moraService = require('./mora.service');

const mongoose = require('mongoose');


class ReconexionService {

   constructor() {

     this.COSTO\_RECONEXION = 125.00;

     this.PORCENTAJE\_PAGO\_PARCIAL = 0.80; // 80%

   }


   /**

    \* Calcula las opciones de reconexión disponibles para un cliente

    \* @param {String} clienteId - ID del cliente

    \*/

   async calcularOpcionesReconexion(clienteId) {

     try {

       // Obtener información de mora del cliente

       const mora = await moraService.calcularMoraAcumuladaCliente(clienteId);

       

       if (!mora.requiereReconexion) {

         return {

           requiereReconexion: false,

           mensaje: 'El cliente no requiere reconexión',

           mesesAtrasados: mora.mesesAtrasados

         };

       }

       

       // OPCIÓN 1: Pago del 80% + reconexión

       const montoPagoParcial = mora.totalAPagar \* this.PORCENTAJE\_PAGO\_PARCIAL;

       const totalOpcion80 = montoPagoParcial + this.COSTO\_RECONEXION;

       const saldoPendienteOpcion80 = mora.totalAPagar - montoPagoParcial;

       

       // OPCIÓN 2: Pago del 100% + reconexión

       const totalOpcion100 = mora.totalAPagar + this.COSTO\_RECONEXION;

       

       // Determinar qué facturas se pagarían con cada opción

       const facturasOpcion80 = this.determinarFacturasAPagar(

         mora.detalleFacturas, 

         montoPagoParcial

       );

       

       return {

         requiereReconexion: true,

         clienteId,

         mesesAtrasados: mora.mesesAtrasados,

         deudaTotal: mora.totalAPagar,

         costoReconexion: this.COSTO\_RECONEXION,

         

         // OPCIÓN 1: Pago Parcial (80%)

         opcionParcial: {

           descripcion: 'Pago del 80% de la deuda + reconexión',

           porcentajeRequerido: 80,

           montoDeuda: Math.round(montoPagoParcial \* 100) / 100,

           costoReconexion: this.COSTO\_RECONEXION,

           totalAPagar: Math.round(totalOpcion80 \* 100) / 100,

           saldoPendiente: Math.round(saldoPendienteOpcion80 \* 100) / 100,

           facturasQueSePagan: facturasOpcion80.pagadas,

           facturasQuedanPendientes: facturasOpcion80.pendientes

         },

         

         // OPCIÓN 2: Pago Total (100%)

         opcionTotal: {

           descripcion: 'Pago del 100% de la deuda + reconexión',

           porcentajeRequerido: 100,

           montoDeuda: mora.totalAPagar,

           costoReconexion: this.COSTO\_RECONEXION,

           totalAPagar: Math.round(totalOpcion100 \* 100) / 100,

           saldoPendiente: 0,

           facturasQueSePagan: mora.detalleFacturas.map(f => f.numeroFactura),

           facturasQuedanPendientes: \[],

           descuento: this.calcularDescuentoLiquidacion(mora.totalAPagar)

         },

         

         // Detalles de las facturas

         detalleFacturas: mora.detalleFacturas

       };

       

     } catch (error) {

       console.error('\[ReconexionService] Error al calcular opciones:', error);

       throw new Error(`Error al calcular opciones de reconexión: ${error.message}`);

     }

   }


   /**

    \* Determina qué facturas se pueden pagar con un monto específico

    \* Estrategia: Pagar las facturas más antiguas primero (FIFO)

    \*/

   determinarFacturasAPagar(facturas, montoDisponible) {

     const pagadas = \[];

     const pendientes = \[];

     let montoRestante = montoDisponible;

     

     for (const factura of facturas) {

       if (montoRestante >= factura.totalConMora) {

         pagadas.push({

           numeroFactura: factura.numeroFactura,

           monto: factura.totalConMora,

           estado: 'se pagará completa'

         });

         montoRestante -= factura.totalConMora;

       } else if (montoRestante > 0) {

         pagadas.push({

           numeroFactura: factura.numeroFactura,

           monto: montoRestante,

           estado: 'pago parcial'

         });

         pendientes.push({

           numeroFactura: factura.numeroFactura,

           montoRestante: factura.totalConMora - montoRestante,

           estado: 'pendiente parcial'

         });

         montoRestante = 0;

       } else {

         pendientes.push({

           numeroFactura: factura.numeroFactura,

           montoRestante: factura.totalConMora,

           estado: 'pendiente completa'

         });

       }

     }

     

     return { pagadas, pendientes };

   }


   /**

    \* Calcula descuento por liquidación total

    \*/

   calcularDescuentoLiquidacion(montoTotal) {

     const porcentajeDescuento = 0.05; // 5%

     const montoDescuento = montoTotal \* porcentajeDescuento;

     

     return {

       aplicable: true,

       porcentaje: 5,

       montoDescuento: Math.round(montoDescuento \* 100) / 100,

       totalConDescuento: Math.round((montoTotal - montoDescuento + this.COSTO\_RECONEXION) \* 100) / 100

     };

   }


   /**

    \* Procesa el pago de reconexión

    \*/

   async procesarReconexion(clienteId, opcion, datosPago) {

     const session = await mongoose.startSession();

     session.startTransaction();

     

     try {

       const opciones = await this.calcularOpcionesReconexion(clienteId);

       

       if (!opciones.requiereReconexion) {

         throw new Error('El cliente no requiere reconexión');

       }

       

       const opcionSeleccionada = opcion === 'total' 

         ? opciones.opcionTotal 

         : opciones.opcionParcial;

       

       // Validar monto pagado

       if (Math.abs(datosPago.monto - opcionSeleccionada.totalAPagar) > 0.01) {

         throw new Error(

           `El monto pagado (Q${datosPago.monto}) no coincide con ` +

           `el total requerido (Q${opcionSeleccionada.totalAPagar.toFixed(2)})`

         );

       }

       

       // Marcar facturas como pagadas

       const facturasPagadas = await this.aplicarPagosFacturas(

         clienteId,

         opcionSeleccionada,

         datosPago,

         session

       );

       

       // Actualizar estado del cliente

       await Cliente.findByIdAndUpdate(

         clienteId,

         { 

           estadoServicio: 'activo',

           fechaUltimaReconexion: new Date(),

           $inc: { numeroReconexiones: 1 }

         },

         { session }

       );

       

       // Crear registro de reconexión

       const reconexion = await Reconexion.create(\[{

         clienteId,

         tipoOpcion: opcion,

         montoTotal: datosPago.monto,

         montoDeuda: opcionSeleccionada.montoDeuda,

         costoReconexion: opcionSeleccionada.costoReconexion,

         saldoPendiente: opcionSeleccionada.saldoPendiente,

         facturasPagadas: facturasPagadas.map(f => f.\_id),

         metodoPago: datosPago.metodoPago,

         referencia: datosPago.referencia,

         procesadoPor: datosPago.usuarioId,

         fechaReconexion: new Date()

       }], { session });

       

       await session.commitTransaction();

       

       return {

         exitoso: true,

         mensaje: 'Reconexión procesada exitosamente',

         reconexionId: reconexion\[0].\_id,

         facturasPagadas: facturasPagadas.length,

         saldoPendiente: opcionSeleccionada.saldoPendiente,

         fechaReconexion: new Date()

       };

       

     } catch (error) {

       await session.abortTransaction();

       console.error('\[ReconexionService] Error al procesar reconexión:', error);

       throw error;

     } finally {

       session.endSession();

     }

   }


   /**

    \* Aplica los pagos a las facturas correspondientes

    \*/

   async aplicarPagosFacturas(clienteId, opcionSeleccionada, datosPago, session) {

     const facturasPagadas = \[];

     const facturasPendientes = await Factura.find({

       clienteId,

       estado: 'pendiente'

     }).sort({ fechaEmision: 1 }).session(session);

     

     let montoDisponible = opcionSeleccionada.montoDeuda;

     

     for (const factura of facturasPendientes) {

       const mora = moraService.calcularMoraFactura(factura);

       const totalFactura = mora.totalConMora;

       

       if (montoDisponible >= totalFactura) {

         // Pagar factura completa

         factura.estado = 'pagada';

         factura.fechaPago = new Date();

         factura.metodoPago = datosPago.metodoPago;

         factura.montoMora = mora.montoMora;

         await factura.save({ session });

         

         facturasPagadas.push(factura);

         montoDisponible -= totalFactura;

       } else if (montoDisponible > 0) {

         // Pago parcial

         factura.observaciones = (factura.observaciones || '') + 

           `\\nPago parcial de Q${montoDisponible.toFixed(2)} el ${new Date().toLocaleDateString()}`;

         factura.montoMora = mora.montoMora;

         await factura.save({ session });

         

         montoDisponible = 0;

       }

       

       if (montoDisponible <= 0) break;

     }

     

     return facturasPagadas;

   }

}


module.exports = new ReconexionService();

```text


### ✅ Validation

- File `backend/services/reconexion.service.js` exists

- Correctly imports `mora.service.js`

- Has methods: calcularOpcionesReconexion, procesarReconexion, etc.


---


## 🎯 PHASE 6: CREATE FEL SERVICE (BASE STRUCTURE)


### Objective

Create FEL base structure without implementing the real connection.


### Instruction for Claude Code

```text

"Create backend/services/fel.service.js as base structure only, without implementing real connection with Infile:"

```text


### Complete code

```javascript

/**

  \* Servicio de Factura Electrónica en Línea (FEL)

  \* Integración con SAT Guatemala a través de Infile

  \* 

  \* ESTADO: ESTRUCTURA BASE - PENDIENTE DE IMPLEMENTACIÓN

  \* 

  \* Para implementar:

  \* 1. Obtener credenciales de Infile (NIT, Usuario, Clave, Token)

  \* 2. Agregar credenciales al archivo .env

  \* 3. Instalar dependencias: npm install xml2js uuid

  \* 4. Implementar los métodos marcados como TODO

  \*/


class FELService {

   constructor() {

     // URLs de Infile

     this.baseURL = process.env.FEL\_AMBIENTE === 'produccion' 

       ? 'https://fel.infile.com.gt/api' 

       : 'https://fel-sandbox.infile.com.gt/api';

     

     // Credenciales (configurar en .env)

     this.credentials = {

       nit: process.env.FEL\_NIT || null,

       usuario: process.env.FEL\_USUARIO || null,

       clave: process.env.FEL\_CLAVE || null,

       token: process.env.FEL\_TOKEN || null

     };

     

     this.maxReintentos = 3;

     this.tiempoEsperaBase = 2000;

   }


   /**

    \* TODO: Implementar certificación de factura

    \* Certifica una factura en el sistema FEL

    \*/

   async certificarFactura(facturaData) {

     throw new Error('FEL no implementado. Pendiente de configuración con Infile.');

   }


   /**

    \* TODO: Implementar construcción de XML

    \* Construye el XML de la factura según formato FEL

    \*/

   construirXMLFactura(factura, uuid) {

     throw new Error('FEL no implementado. Pendiente de configuración con Infile.');

   }


   /**

    \* TODO: Implementar anulación

    \* Anula una factura certificada

    \*/

   async anularFactura(uuid, motivo) {

     throw new Error('FEL no implementado. Pendiente de configuración con Infile.');

   }


   /**

    \* Verifica si FEL está configurado

    \*/

   estaConfigurado() {

     return !!(

       this.credentials.nit \&\&

       this.credentials.usuario \&\&

       this.credentials.clave \&\&

       this.credentials.token

     );

   }

}


module.exports = new FELService();

```text


### ✅ Validation

- File `backend/services/fel.service.js` exists

- Methods throw Error indicating "pending"

- Has `estaConfigurado()` method


---


## 🎯 PHASE 7: CREATE CONTROLLERS


### Objective

Create the 3 controllers for mora, reconexion, and FEL.


### Instruction for Claude Code

```text

"Create these three new controllers:"

```text


### File 1 `backend/controllers/mora.controller.js`

```javascript

const moraService = require('../services/mora.service');


/**

  \* Obtiene la mora acumulada de un cliente

  \*/

exports.obtenerMoraCliente = async (req, res) => {

   try {

     const { clienteId } = req.params;

     

     const mora = await moraService.calcularMoraAcumuladaCliente(clienteId);

     

     res.json({

       success: true,

       data: mora

     });

     

   } catch (error) {

     console.error('\[MoraController] Error:', error);

     res.status(500).json({

       success: false,

       message: 'Error al calcular mora',

       error: error.message

     });

   }

};


/**

  \* Verifica si un cliente requiere corte de servicio

  \*/

exports.verificarCorteServicio = async (req, res) => {

   try {

     const { clienteId } = req.params;

     

     const resultado = await moraService.requiereCorteServicio(clienteId);

     

     res.json({

       success: true,

       data: resultado

     });

     

   } catch (error) {

     console.error('\[MoraController] Error:', error);

     res.status(500).json({

       success: false,

       message: 'Error al verificar corte',

       error: error.message

     });

   }

};

```text


### File 2 `backend/controllers/reconexion.controller.js`

```javascript

const reconexionService = require('../services/reconexion.service');


/**

  \* Obtiene las opciones de reconexión para un cliente

  \*/

exports.obtenerOpcionesReconexion = async (req, res) => {

   try {

     const { clienteId } = req.params;

     

     const opciones = await reconexionService.calcularOpcionesReconexion(clienteId);

     

     res.json({

       success: true,

       data: opciones

     });

     

   } catch (error) {

     console.error('\[ReconexionController] Error:', error);

     res.status(500).json({

       success: false,

       message: 'Error al calcular opciones de reconexión',

       error: error.message

     });

   }

};


/**

  \* Procesa una reconexión

  \*/

exports.procesarReconexion = async (req, res) => {

   try {

     const { clienteId } = req.params;

     const { opcion, metodoPago, monto, referencia } = req.body;

     

     // Validar datos requeridos

     if (!opcion || !metodoPago || !monto) {

       return res.status(400).json({

         success: false,

         message: 'Faltan datos requeridos: opcion, metodoPago, monto'

       });

     }

     

     if (!\['parcial', 'total'].includes(opcion)) {

       return res.status(400).json({

         success: false,

         message: 'Opción inválida. Debe ser "parcial" o "total"'

       });

     }

     

     const datosPago = {

       monto: parseFloat(monto),

       metodoPago,

       referencia: referencia || null,

       usuarioId: req.user.id // Del middleware de autenticación

     };

     

     const resultado = await reconexionService.procesarReconexion(

       clienteId,

       opcion,

       datosPago

     );

     

     res.json({

       success: true,

       message: 'Reconexión procesada exitosamente',

       data: resultado

     });

     

   } catch (error) {

     console.error('\[ReconexionController] Error:', error);

     res.status(500).json({

       success: false,

       message: 'Error al procesar reconexión',

       error: error.message

     });

   }

};

```text


### File 3 `backend/controllers/fel.controller.js`

```javascript

const felService = require('../services/fel.service');


/**

  \* Verifica el estado de configuración de FEL

  \*/

exports.verificarEstado = async (req, res) => {

   try {

     const configurado = felService.estaConfigurado();

     

     res.json({

       success: true,

       fel: {

         configurado,

         mensaje: configurado 

           ? 'FEL configurado correctamente' 

           : 'FEL no configurado. Agregue credenciales en .env'

       }

     });

   } catch (error) {

     res.status(500).json({

       success: false,

       message: 'Error al verificar estado de FEL',

       error: error.message

     });

   }

};


/**

  \* Certifica una factura (PENDIENTE DE IMPLEMENTACIÓN)

  \*/

exports.certificarFactura = async (req, res) => {

   try {

     res.status(501).json({

       success: false,

       message: 'Certificación FEL pendiente de implementación',

       instrucciones: \[

         '1. Obtener credenciales de Infile',

         '2. Configurar variables de entorno en .env',

         '3. Implementar métodos en fel.service.js'

       ]

     });

   } catch (error) {

     res.status(500).json({

       success: false,

       message: 'Error en certificación FEL',

       error: error.message

     });

   }

};

```text


### ✅ Validation

- All 3 controllers exist in `backend/controllers/`

- Each one imports its corresponding service

- Have error handling with try-catch


---


## 🎯 PHASE 8: CREATE ROUTES


### Objective

Create routes for the 3 modules.


### Instruction for Claude Code

```text

"Create these three new routes:"

```text


### File 1 `backend/routes/mora.routes.js`

```javascript

const express = require('express');

const router = express.Router();

const moraController = require('../controllers/mora.controller');

const { authMiddleware } = require('../middlewares/auth.middleware');


router.use(authMiddleware);


/**

  \* @route GET /api/mora/cliente/:clienteId

  \* @desc Obtener mora acumulada de un cliente

  \*/

router.get('/cliente/:clienteId', moraController.obtenerMoraCliente);


/**

  \* @route GET /api/mora/cliente/:clienteId/verificar-corte

  \* @desc Verificar si el cliente requiere corte de servicio

  \*/

router.get('/cliente/:clienteId/verificar-corte', moraController.verificarCorteServicio);


module.exports = router;

```text


### File 2 `backend/routes/reconexion.routes.js`

```javascript

const express = require('express');

const router = express.Router();

const reconexionController = require('../controllers/reconexion.controller');

const { authMiddleware } = require('../middlewares/auth.middleware');


router.use(authMiddleware);


/**

  \* @route GET /api/reconexion/opciones/:clienteId

  \* @desc Obtener opciones de reconexión para un cliente

  \*/

router.get('/opciones/:clienteId', reconexionController.obtenerOpcionesReconexion);


/**

  \* @route POST /api/reconexion/procesar/:clienteId

  \* @desc Procesar reconexión de un cliente

  \*/

router.post('/procesar/:clienteId', reconexionController.procesarReconexion);


module.exports = router;

```text


### File 3 `backend/routes/fel.routes.js`

```javascript

const express = require('express');

const router = express.Router();

const felController = require('../controllers/fel.controller');

const { authMiddleware } = require('../middlewares/auth.middleware');


router.use(authMiddleware);


/**

  \* @route GET /api/fel/estado

  \* @desc Verifica el estado de configuración de FEL

  \*/

router.get('/estado', felController.verificarEstado);


/**

  \* @route POST /api/fel/certificar/:facturaId

  \* @desc Certifica una factura (PENDIENTE DE IMPLEMENTACIÓN)

  \*/

router.post('/certificar/:facturaId', felController.certificarFactura);


module.exports = router;

```text


### ✅ Validation

- All 3 routes exist in `backend/routes/`

- All use authMiddleware

- Correctly import their controllers


---


## 🎯 PHASE 9: REGISTER ROUTES IN SERVER.JS


### Objective

Modify server.js to register the new routes.


### Instruction for Claude Code

```text

"Open backend/server.js and:

1. LOCATE where the route imports are (example: const clienteRoutes = require...)

2. ADD these two lines AFTER the existing imports:

    const moraRoutes = require('./routes/mora.routes');

    const reconexionRoutes = require('./routes/reconexion.routes');

3. LOCATE where routes are registered (example: app.use('/api/clientes'...)

4. ADD these two lines AFTER the existing routes:

    app.use('/api/mora', moraRoutes);

    app.use('/api/reconexion', reconexionRoutes);

5. DO NOT modify anything else in the file."

```text


### ✅ Validation

- `backend/server.js` has the 2 new imports

- `backend/server.js` has the 2 new app.use

- NO file like `server.nuevo.js` or similar exists

- The server still starts correctly


---


## 🎯 PHASE 10: UPDATE .ENV WITH FEL VARIABLES


### Objective

Add environment variables for FEL (empty for now).


### Instruction for Claude Code

```text

"Open the .env file in the project root and ADD these lines at the END of the existing file. KEEP all variables that already exist:"

```text


### Code to add

```env


# ===== CONFIGURACIÓN FEL (Factura Electrónica) =====

# Ambiente: 'sandbox' para pruebas, 'produccion' para uso real

FEL\_AMBIENTE=sandbox


# Credenciales de Infile (obtener en https://infile.com.gt)

FEL\_NIT=

FEL\_USUARIO=

FEL\_CLAVE=

FEL\_TOKEN=


# NOTA: Dejar vacío hasta obtener credenciales reales de Infile

```text


### ✅ Validation

- `.env` has the 5 new FEL\_\* variables

- Variables are empty (no value after the =)

- All previous variables remain intact


---


## 🎉 IMPLEMENTATION COMPLETED


### ✅ Summary of what was implemented


**Files created (13):**

- ✅ `backend/services/mora.service.js`

- ✅ `backend/services/reconexion.service.js`

- ✅ `backend/services/fel.service.js`

- ✅ `backend/models/reconexion.model.js`

- ✅ `backend/models/logFel.model.js`

- ✅ `backend/controllers/mora.controller.js`

- ✅ `backend/controllers/reconexion.controller.js`

- ✅ `backend/controllers/fel.controller.js`

- ✅ `backend/routes/mora.routes.js`

- ✅ `backend/routes/reconexion.routes.js`

- ✅ `backend/routes/fel.routes.js`


**Files modified (3):**

- ✅ `backend/models/factura.model.js`

- ✅ `backend/models/cliente.model.js`

- ✅ `backend/server.js`

- ✅ `.env`


### 🧪 FINAL TESTS


Execute these commands to test:


```bash

# 1. Start the server

npm start


# 2. Test mora endpoint (replace {clienteId} and {token})

curl http://localhost:5000/api/mora/cliente/{clienteId} \\

   -H "Authorization: Bearer {token}"


# 3. Test reconnection options

curl http://localhost:5000/api/reconexion/opciones/{clienteId} \\

   -H "Authorization: Bearer {token}"


# 4. Verify FEL status

curl http://localhost:5000/api/fel/estado \\

   -H "Authorization: Bearer {token}"

```text


### 📊 Available endpoints


**Mora:**

- `GET /api/mora/cliente/:clienteId` - Calculate late fees

- `GET /api/mora/cliente/:clienteId/verificar-corte` - Verify service cut


**Reconexion:**

- `GET /api/reconexion/opciones/:clienteId` - View options

- `POST /api/reconexion/procesar/:clienteId` - Process reconnection


**FEL:**

- `GET /api/fel/estado` - Configuration status

- `POST /api/fel/certificar/:facturaId` - Certify (pending)


### 🎯 Next steps


1. **Functional testing** with Postman or similar

2. **Create frontend** to consume these endpoints

3. **Implement FEL** when you have Infile credentials

4. **Document** use cases and examples


---


**Implementation complete! 🚀**

