\# 🚀 TASKS FOR CLAUDE CODE - Sistema Agua LOTI



\## 📖 HOW TO USE THIS FILE



\### Preparation:

1\. Save this file as `TAREAS-CLAUDE-CODE.md` in the root of your agua-loti project

2\. Open your terminal in the project folder

3\. Execute: `claude-code`

4\. Follow the instructions phase by phase



\### Workflow:

```

YOU say → "Read TAREAS-CLAUDE-CODE.md and execute Phase 1"

&nbsp;      ↓

CLAUDE CODE → Creates/modifies files

&nbsp;      ↓

YOU review → Verify everything is correct

&nbsp;      ↓

YOU say → "Now execute Phase 2"

&nbsp;      ↓

And so on...

```



\### ⚠️ CRITICAL RULES (Claude Code must follow):

1\. \*\*NEVER duplicate files\*\* - Modify the originals directly

2\. \*\*Nomenclature ALWAYS in Spanish\*\* - clienteId, facturaId, montoMora, etc.

3\. \*\*FEL only base structure\*\* - DO NOT implement real connection with Infile



---



\## 🎯 PHASE 1: MODIFY FACTURA MODEL



\### Objective:

Add fields for FEL, late fees (mora), and document reference to the EXISTING Factura model.



\### Instruction for Claude Code:

```

"Open the file backend/models/factura.model.js and add the following fields at the END of the existing schema. KEEP all fields that already exist. DO NOT create a new file, modify the existing one directly."

```



\### Código a agregar (después de los campos existentes):

```javascript

// ===== AGREGAR ESTOS CAMPOS AL SCHEMA EXISTENTE =====



// Información de Factura Electrónica (FEL)

fel: {

&nbsp; certificada: { type: Boolean, default: false },

&nbsp; uuid: { type: String, default: null },

&nbsp; numeroAutorizacion: { type: String, default: null },

&nbsp; serie: { type: String, default: null },

&nbsp; numero: { type: String, default: null },

&nbsp; fechaCertificacion: { type: Date, default: null },

&nbsp; urlVerificacion: { type: String, default: null },

&nbsp; intentosFallidos: { type: Number, default: 0 },

&nbsp; ultimoError: { type: String, default: null },

&nbsp; tipoDocumento: { 

&nbsp;   type: String, 

&nbsp;   enum: \['FACT', 'NCRE', 'NDEB', 'NABN'],

&nbsp;   default: 'FACT'

&nbsp; }

},



// Referencia a documento original (para NCRE y NDEB)

documentoReferencia: {

&nbsp; tipo: { type: String, enum: \['factura', 'nota'], default: null },

&nbsp; uuid: { type: String, default: null },

&nbsp; numeroDocumento: { type: String, default: null }

},



// Información de mora detallada

detallesMora: {

&nbsp; diasVencidos: { type: Number, default: 0 },

&nbsp; mesesCompletos: { type: Number, default: 0 },

&nbsp; porcentajeMora: { type: Number, default: 0 },

&nbsp; calculadoEn: { type: Date, default: null }

}

```



\### ✅ Validation:

Check that `backend/models/factura.model.js`:

\- Has the 3 new fields (fel, documentoReferencia, detallesMora)

\- Keeps ALL the fields it already had

\- NO file exists like `factura.model.nuevo.js` or similar



---



\## 🎯 PHASE 2: MODIFY CLIENTE MODEL



\### Objective:

Add reconnection and service status fields to the EXISTING Cliente model.



\### Instruction for Claude Code:

```

"Open backend/models/cliente.model.js and add these fields to the existing schema. KEEP all original fields. DO NOT create a new file."

```



\### Código a agregar:

```javascript

// ===== AGREGAR AL SCHEMA EXISTENTE =====



// Información de reconexiones

numeroReconexiones: {

&nbsp; type: Number,

&nbsp; default: 0,

&nbsp; min: 0

},



fechaUltimaReconexion: {

&nbsp; type: Date,

&nbsp; default: null

},



// Estado de servicio

estadoServicio: {

&nbsp; type: String,

&nbsp; enum: \['activo', 'suspendido', 'cortado'],

&nbsp; default: 'activo'

},



// Notas de alerta

alertas: \[{

&nbsp; tipo: { type: String, enum: \['mora', 'corte', 'reconexion'] },

&nbsp; mensaje: { type: String },

&nbsp; fecha: { type: Date, default: Date.now }

}]

```



\### ✅ Validation:

\- `backend/models/cliente.model.js` has the 4 new fields

\- Keeps all original fields

\- NO duplicate file exists



---



\## 🎯 PHASE 3: CREATE MORA SERVICE



\### Objective:

Create the service that calculates accumulated late fees for clients.



\### Instruction for Claude Code:

```

"Create the file backend/services/mora.service.js with the following complete code:"

```



\### Código completo:

```javascript

/\*\*

&nbsp;\* Servicio de Cálculo de Mora Acumulada

&nbsp;\* Sistema de Agua LOTI - Huehuetenango, Guatemala

&nbsp;\*/



const Factura = require('../models/factura.model');



class MoraService {

&nbsp; constructor() {

&nbsp;   this.MORA\_MENSUAL = 0.07; // 7% mensual

&nbsp; }



&nbsp; /\*\*

&nbsp;  \* Calcula mora acumulada para un cliente con múltiples facturas vencidas

&nbsp;  \* @param {String} clienteId - ID del cliente

&nbsp;  \* @returns {Object} Detalle completo de mora

&nbsp;  \*/

&nbsp; async calcularMoraAcumuladaCliente(clienteId) {

&nbsp;   try {

&nbsp;     // Obtener todas las facturas pendientes del cliente, ordenadas por antigüedad

&nbsp;     const facturasPendientes = await Factura.find({

&nbsp;       clienteId: clienteId,

&nbsp;       estado: 'pendiente'

&nbsp;     }).sort({ fechaEmision: 1 }); // Más antiguas primero

&nbsp;     

&nbsp;     if (facturasPendientes.length === 0) {

&nbsp;       return {

&nbsp;         tieneDeuda: false,

&nbsp;         facturasPendientes: 0,

&nbsp;         mesesAtrasados: 0,

&nbsp;         montoOriginalTotal: 0,

&nbsp;         moraTotal: 0,

&nbsp;         totalAPagar: 0,

&nbsp;         detalleFacturas: \[]

&nbsp;       };

&nbsp;     }

&nbsp;     

&nbsp;     const hoy = new Date();

&nbsp;     let montoOriginalTotal = 0;

&nbsp;     let moraTotal = 0;

&nbsp;     const detalleFacturas = \[];

&nbsp;     

&nbsp;     for (const factura of facturasPendientes) {

&nbsp;       const detalleFactura = this.calcularMoraFactura(factura, hoy);

&nbsp;       detalleFacturas.push(detalleFactura);

&nbsp;       

&nbsp;       montoOriginalTotal += detalleFactura.montoOriginal;

&nbsp;       moraTotal += detalleFactura.montoMora;

&nbsp;     }

&nbsp;     

&nbsp;     const totalAPagar = montoOriginalTotal + moraTotal;

&nbsp;     

&nbsp;     // Determinar nivel de criticidad

&nbsp;     const mesesAtrasados = detalleFacturas.length;

&nbsp;     let nivelCriticidad = 'bajo';

&nbsp;     if (mesesAtrasados >= 3) nivelCriticidad = 'critico';

&nbsp;     else if (mesesAtrasados >= 2) nivelCriticidad = 'alto';

&nbsp;     else if (mesesAtrasados >= 1) nivelCriticidad = 'medio';

&nbsp;     

&nbsp;     // Determinar si requiere reconexión

&nbsp;     const requiereReconexion = mesesAtrasados >= 2;

&nbsp;     

&nbsp;     return {

&nbsp;       tieneDeuda: true,

&nbsp;       facturasPendientes: facturasPendientes.length,

&nbsp;       mesesAtrasados: mesesAtrasados,

&nbsp;       montoOriginalTotal: Math.round(montoOriginalTotal \* 100) / 100,

&nbsp;       moraTotal: Math.round(moraTotal \* 100) / 100,

&nbsp;       totalAPagar: Math.round(totalAPagar \* 100) / 100,

&nbsp;       nivelCriticidad,

&nbsp;       requiereReconexion,

&nbsp;       costoReconexion: requiereReconexion ? 125.00 : 0,

&nbsp;       detalleFacturas,

&nbsp;       facturasMasAntigua: detalleFacturas\[0],

&nbsp;       facturasMasReciente: detalleFacturas\[detalleFacturas.length - 1]

&nbsp;     };

&nbsp;     

&nbsp;   } catch (error) {

&nbsp;     console.error('\[MoraService] Error al calcular mora acumulada:', error);

&nbsp;     throw new Error(`Error al calcular mora: ${error.message}`);

&nbsp;   }

&nbsp; }



&nbsp; /\*\*

&nbsp;  \* Calcula mora para una factura individual

&nbsp;  \* @param {Object} factura - Documento de factura

&nbsp;  \* @param {Date} fechaCalculo - Fecha para calcular (default: hoy)

&nbsp;  \*/

&nbsp; calcularMoraFactura(factura, fechaCalculo = new Date()) {

&nbsp;   const fechaVencimiento = new Date(factura.fechaVencimiento);

&nbsp;   

&nbsp;   // Si no está vencida

&nbsp;   if (fechaCalculo <= fechaVencimiento) {

&nbsp;     return {

&nbsp;       facturaId: factura.\_id,

&nbsp;       numeroFactura: factura.numeroFactura,

&nbsp;       fechaEmision: factura.fechaEmision,

&nbsp;       fechaVencimiento: factura.fechaVencimiento,

&nbsp;       montoOriginal: factura.montoTotal,

&nbsp;       diasVencidos: 0,

&nbsp;       mesesCompletos: 0,

&nbsp;       porcentajeMora: 0,

&nbsp;       montoMora: 0,

&nbsp;       totalConMora: factura.montoTotal,

&nbsp;       estado: 'vigente'

&nbsp;     };

&nbsp;   }

&nbsp;   

&nbsp;   // Calcular días vencidos

&nbsp;   const diasVencidos = Math.floor((fechaCalculo - fechaVencimiento) / (1000 \* 60 \* 60 \* 24));

&nbsp;   

&nbsp;   // Calcular meses completos

&nbsp;   const mesesCompletos = Math.floor(diasVencidos / 30);

&nbsp;   

&nbsp;   // Calcular porcentaje de mora

&nbsp;   const porcentajeMora = mesesCompletos \* this.MORA\_MENSUAL;

&nbsp;   

&nbsp;   // Calcular monto de mora

&nbsp;   const montoMora = factura.montoTotal \* porcentajeMora;

&nbsp;   

&nbsp;   // Total con mora

&nbsp;   const totalConMora = factura.montoTotal + montoMora;

&nbsp;   

&nbsp;   return {

&nbsp;     facturaId: factura.\_id,

&nbsp;     numeroFactura: factura.numeroFactura,

&nbsp;     fechaEmision: factura.fechaEmision,

&nbsp;     fechaVencimiento: factura.fechaVencimiento,

&nbsp;     montoOriginal: factura.montoTotal,

&nbsp;     diasVencidos,

&nbsp;     mesesCompletos,

&nbsp;     porcentajeMora: Math.round(porcentajeMora \* 10000) / 100,

&nbsp;     montoMora: Math.round(montoMora \* 100) / 100,

&nbsp;     totalConMora: Math.round(totalConMora \* 100) / 100,

&nbsp;     estado: mesesCompletos >= 2 ? 'critico' : 'vencido'

&nbsp;   };

&nbsp; }



&nbsp; /\*\*

&nbsp;  \* Verifica si un cliente requiere corte de servicio

&nbsp;  \* @param {String} clienteId 

&nbsp;  \*/

&nbsp; async requiereCorteServicio(clienteId) {

&nbsp;   try {

&nbsp;     const mora = await this.calcularMoraAcumuladaCliente(clienteId);

&nbsp;     

&nbsp;     return {

&nbsp;       requiereCorte: mora.mesesAtrasados >= 2,

&nbsp;       mesesAtrasados: mora.mesesAtrasados,

&nbsp;       montoAdeudado: mora.totalAPagar,

&nbsp;       razon: mora.mesesAtrasados >= 2 

&nbsp;         ? `Cliente con ${mora.mesesAtrasados} meses sin pagar` 

&nbsp;         : 'No requiere corte'

&nbsp;     };

&nbsp;   } catch (error) {

&nbsp;     console.error('\[MoraService] Error al verificar corte:', error);

&nbsp;     throw error;

&nbsp;   }

&nbsp; }

}



module.exports = new MoraService();

```



\### ✅ Validation:

\- File `backend/services/mora.service.js` exists

\- Has 3 methods: calcularMoraAcumuladaCliente, calcularMoraFactura, requiereCorteServicio



---



\## 🎯 PHASE 4: CREATE RECONEXION AND LOG FEL MODELS



\### Objective:

Create models for reconnection history and FEL logs.



\### Instruction for Claude Code:

```

"Create these two new files with their complete code:"

```



\### File 1: `backend/models/reconexion.model.js`

```javascript

const mongoose = require('mongoose');



const reconexionSchema = new mongoose.Schema({

&nbsp; clienteId: {

&nbsp;   type: mongoose.Schema.Types.ObjectId,

&nbsp;   ref: 'Cliente',

&nbsp;   required: true

&nbsp; },

&nbsp; tipoOpcion: {

&nbsp;   type: String,

&nbsp;   enum: \['parcial', 'total', 'emergencia'],

&nbsp;   required: true

&nbsp; },

&nbsp; montoTotal: {

&nbsp;   type: Number,

&nbsp;   required: true,

&nbsp;   min: 0

&nbsp; },

&nbsp; montoDeuda: {

&nbsp;   type: Number,

&nbsp;   required: true,

&nbsp;   min: 0

&nbsp; },

&nbsp; costoReconexion: {

&nbsp;   type: Number,

&nbsp;   required: true,

&nbsp;   default: 125.00

&nbsp; },

&nbsp; saldoPendiente: {

&nbsp;   type: Number,

&nbsp;   default: 0,

&nbsp;   min: 0

&nbsp; },

&nbsp; facturasPagadas: \[{

&nbsp;   type: mongoose.Schema.Types.ObjectId,

&nbsp;   ref: 'Factura'

&nbsp; }],

&nbsp; metodoPago: {

&nbsp;   type: String,

&nbsp;   required: true

&nbsp; },

&nbsp; referencia: String,

&nbsp; procesadoPor: {

&nbsp;   type: mongoose.Schema.Types.ObjectId,

&nbsp;   ref: 'User',

&nbsp;   required: true

&nbsp; },

&nbsp; fechaReconexion: {

&nbsp;   type: Date,

&nbsp;   default: Date.now

&nbsp; },

&nbsp; observaciones: String,

&nbsp; 

&nbsp; // Campos para reconexión de emergencia

&nbsp; esEmergencia: {

&nbsp;   type: Boolean,

&nbsp;   default: false

&nbsp; },

&nbsp; justificacion: String,

&nbsp; autorizadoPor: {

&nbsp;   type: mongoose.Schema.Types.ObjectId,

&nbsp;   ref: 'User'

&nbsp; }

}, {

&nbsp; timestamps: true

});



reconexionSchema.index({ clienteId: 1, fechaReconexion: -1 });



module.exports = mongoose.model('Reconexion', reconexionSchema);

```



\### File 2: `backend/models/logFel.model.js`

```javascript

const mongoose = require('mongoose');



const logFelSchema = new mongoose.Schema({

&nbsp; facturaId: {

&nbsp;   type: mongoose.Schema.Types.ObjectId,

&nbsp;   ref: 'Factura',

&nbsp;   required: true

&nbsp; },

&nbsp; tipo: {

&nbsp;   type: String,

&nbsp;   enum: \['certificacion', 'anulacion', 'consulta'],

&nbsp;   required: true

&nbsp; },

&nbsp; estado: {

&nbsp;   type: String,

&nbsp;   enum: \['exitoso', 'error', 'pendiente'],

&nbsp;   required: true

&nbsp; },

&nbsp; intentos: {

&nbsp;   type: Number,

&nbsp;   default: 1

&nbsp; },

&nbsp; respuesta: {

&nbsp;   type: mongoose.Schema.Types.Mixed

&nbsp; },

&nbsp; error: {

&nbsp;   type: String

&nbsp; },

&nbsp; detalles: {

&nbsp;   type: mongoose.Schema.Types.Mixed

&nbsp; },

&nbsp; timestamp: {

&nbsp;   type: Date,

&nbsp;   default: Date.now

&nbsp; }

}, {

&nbsp; timestamps: true

});



logFelSchema.index({ facturaId: 1, timestamp: -1 });

logFelSchema.index({ estado: 1, timestamp: -1 });



module.exports = mongoose.model('LogFEL', logFelSchema);

```



\### ✅ Validation:

\- Files `backend/models/reconexion.model.js` and `backend/models/logFel.model.js` exist

\- Both export mongoose models



---



\## 🎯 PHASE 5: CREATE RECONEXION SERVICE



\### Objective:

Create the service that handles reconnection options and process.



\### Instruction for Claude Code:

```

"Create backend/services/reconexion.service.js with this complete code:"

```



\### Complete code:

```javascript

/\*\*

&nbsp;\* Servicio de Reconexión de Servicio de Agua

&nbsp;\* Maneja reconexiones con opciones 80% y 100%

&nbsp;\*/



const Factura = require('../models/factura.model');

const Cliente = require('../models/cliente.model');

const Reconexion = require('../models/reconexion.model');

const moraService = require('./mora.service');

const mongoose = require('mongoose');



class ReconexionService {

&nbsp; constructor() {

&nbsp;   this.COSTO\_RECONEXION = 125.00;

&nbsp;   this.PORCENTAJE\_PAGO\_PARCIAL = 0.80; // 80%

&nbsp; }



&nbsp; /\*\*

&nbsp;  \* Calcula las opciones de reconexión disponibles para un cliente

&nbsp;  \* @param {String} clienteId - ID del cliente

&nbsp;  \*/

&nbsp; async calcularOpcionesReconexion(clienteId) {

&nbsp;   try {

&nbsp;     // Obtener información de mora del cliente

&nbsp;     const mora = await moraService.calcularMoraAcumuladaCliente(clienteId);

&nbsp;     

&nbsp;     if (!mora.requiereReconexion) {

&nbsp;       return {

&nbsp;         requiereReconexion: false,

&nbsp;         mensaje: 'El cliente no requiere reconexión',

&nbsp;         mesesAtrasados: mora.mesesAtrasados

&nbsp;       };

&nbsp;     }

&nbsp;     

&nbsp;     // OPCIÓN 1: Pago del 80% + reconexión

&nbsp;     const montoPagoParcial = mora.totalAPagar \* this.PORCENTAJE\_PAGO\_PARCIAL;

&nbsp;     const totalOpcion80 = montoPagoParcial + this.COSTO\_RECONEXION;

&nbsp;     const saldoPendienteOpcion80 = mora.totalAPagar - montoPagoParcial;

&nbsp;     

&nbsp;     // OPCIÓN 2: Pago del 100% + reconexión

&nbsp;     const totalOpcion100 = mora.totalAPagar + this.COSTO\_RECONEXION;

&nbsp;     

&nbsp;     // Determinar qué facturas se pagarían con cada opción

&nbsp;     const facturasOpcion80 = this.determinarFacturasAPagar(

&nbsp;       mora.detalleFacturas, 

&nbsp;       montoPagoParcial

&nbsp;     );

&nbsp;     

&nbsp;     return {

&nbsp;       requiereReconexion: true,

&nbsp;       clienteId,

&nbsp;       mesesAtrasados: mora.mesesAtrasados,

&nbsp;       deudaTotal: mora.totalAPagar,

&nbsp;       costoReconexion: this.COSTO\_RECONEXION,

&nbsp;       

&nbsp;       // OPCIÓN 1: Pago Parcial (80%)

&nbsp;       opcionParcial: {

&nbsp;         descripcion: 'Pago del 80% de la deuda + reconexión',

&nbsp;         porcentajeRequerido: 80,

&nbsp;         montoDeuda: Math.round(montoPagoParcial \* 100) / 100,

&nbsp;         costoReconexion: this.COSTO\_RECONEXION,

&nbsp;         totalAPagar: Math.round(totalOpcion80 \* 100) / 100,

&nbsp;         saldoPendiente: Math.round(saldoPendienteOpcion80 \* 100) / 100,

&nbsp;         facturasQueSePagan: facturasOpcion80.pagadas,

&nbsp;         facturasQuedanPendientes: facturasOpcion80.pendientes

&nbsp;       },

&nbsp;       

&nbsp;       // OPCIÓN 2: Pago Total (100%)

&nbsp;       opcionTotal: {

&nbsp;         descripcion: 'Pago del 100% de la deuda + reconexión',

&nbsp;         porcentajeRequerido: 100,

&nbsp;         montoDeuda: mora.totalAPagar,

&nbsp;         costoReconexion: this.COSTO\_RECONEXION,

&nbsp;         totalAPagar: Math.round(totalOpcion100 \* 100) / 100,

&nbsp;         saldoPendiente: 0,

&nbsp;         facturasQueSePagan: mora.detalleFacturas.map(f => f.numeroFactura),

&nbsp;         facturasQuedanPendientes: \[],

&nbsp;         descuento: this.calcularDescuentoLiquidacion(mora.totalAPagar)

&nbsp;       },

&nbsp;       

&nbsp;       // Detalles de las facturas

&nbsp;       detalleFacturas: mora.detalleFacturas

&nbsp;     };

&nbsp;     

&nbsp;   } catch (error) {

&nbsp;     console.error('\[ReconexionService] Error al calcular opciones:', error);

&nbsp;     throw new Error(`Error al calcular opciones de reconexión: ${error.message}`);

&nbsp;   }

&nbsp; }



&nbsp; /\*\*

&nbsp;  \* Determina qué facturas se pueden pagar con un monto específico

&nbsp;  \* Estrategia: Pagar las facturas más antiguas primero (FIFO)

&nbsp;  \*/

&nbsp; determinarFacturasAPagar(facturas, montoDisponible) {

&nbsp;   const pagadas = \[];

&nbsp;   const pendientes = \[];

&nbsp;   let montoRestante = montoDisponible;

&nbsp;   

&nbsp;   for (const factura of facturas) {

&nbsp;     if (montoRestante >= factura.totalConMora) {

&nbsp;       pagadas.push({

&nbsp;         numeroFactura: factura.numeroFactura,

&nbsp;         monto: factura.totalConMora,

&nbsp;         estado: 'se pagará completa'

&nbsp;       });

&nbsp;       montoRestante -= factura.totalConMora;

&nbsp;     } else if (montoRestante > 0) {

&nbsp;       pagadas.push({

&nbsp;         numeroFactura: factura.numeroFactura,

&nbsp;         monto: montoRestante,

&nbsp;         estado: 'pago parcial'

&nbsp;       });

&nbsp;       pendientes.push({

&nbsp;         numeroFactura: factura.numeroFactura,

&nbsp;         montoRestante: factura.totalConMora - montoRestante,

&nbsp;         estado: 'pendiente parcial'

&nbsp;       });

&nbsp;       montoRestante = 0;

&nbsp;     } else {

&nbsp;       pendientes.push({

&nbsp;         numeroFactura: factura.numeroFactura,

&nbsp;         montoRestante: factura.totalConMora,

&nbsp;         estado: 'pendiente completa'

&nbsp;       });

&nbsp;     }

&nbsp;   }

&nbsp;   

&nbsp;   return { pagadas, pendientes };

&nbsp; }



&nbsp; /\*\*

&nbsp;  \* Calcula descuento por liquidación total

&nbsp;  \*/

&nbsp; calcularDescuentoLiquidacion(montoTotal) {

&nbsp;   const porcentajeDescuento = 0.05; // 5%

&nbsp;   const montoDescuento = montoTotal \* porcentajeDescuento;

&nbsp;   

&nbsp;   return {

&nbsp;     aplicable: true,

&nbsp;     porcentaje: 5,

&nbsp;     montoDescuento: Math.round(montoDescuento \* 100) / 100,

&nbsp;     totalConDescuento: Math.round((montoTotal - montoDescuento + this.COSTO\_RECONEXION) \* 100) / 100

&nbsp;   };

&nbsp; }



&nbsp; /\*\*

&nbsp;  \* Procesa el pago de reconexión

&nbsp;  \*/

&nbsp; async procesarReconexion(clienteId, opcion, datosPago) {

&nbsp;   const session = await mongoose.startSession();

&nbsp;   session.startTransaction();

&nbsp;   

&nbsp;   try {

&nbsp;     const opciones = await this.calcularOpcionesReconexion(clienteId);

&nbsp;     

&nbsp;     if (!opciones.requiereReconexion) {

&nbsp;       throw new Error('El cliente no requiere reconexión');

&nbsp;     }

&nbsp;     

&nbsp;     const opcionSeleccionada = opcion === 'total' 

&nbsp;       ? opciones.opcionTotal 

&nbsp;       : opciones.opcionParcial;

&nbsp;     

&nbsp;     // Validar monto pagado

&nbsp;     if (Math.abs(datosPago.monto - opcionSeleccionada.totalAPagar) > 0.01) {

&nbsp;       throw new Error(

&nbsp;         `El monto pagado (Q${datosPago.monto}) no coincide con ` +

&nbsp;         `el total requerido (Q${opcionSeleccionada.totalAPagar.toFixed(2)})`

&nbsp;       );

&nbsp;     }

&nbsp;     

&nbsp;     // Marcar facturas como pagadas

&nbsp;     const facturasPagadas = await this.aplicarPagosFacturas(

&nbsp;       clienteId,

&nbsp;       opcionSeleccionada,

&nbsp;       datosPago,

&nbsp;       session

&nbsp;     );

&nbsp;     

&nbsp;     // Actualizar estado del cliente

&nbsp;     await Cliente.findByIdAndUpdate(

&nbsp;       clienteId,

&nbsp;       { 

&nbsp;         estadoServicio: 'activo',

&nbsp;         fechaUltimaReconexion: new Date(),

&nbsp;         $inc: { numeroReconexiones: 1 }

&nbsp;       },

&nbsp;       { session }

&nbsp;     );

&nbsp;     

&nbsp;     // Crear registro de reconexión

&nbsp;     const reconexion = await Reconexion.create(\[{

&nbsp;       clienteId,

&nbsp;       tipoOpcion: opcion,

&nbsp;       montoTotal: datosPago.monto,

&nbsp;       montoDeuda: opcionSeleccionada.montoDeuda,

&nbsp;       costoReconexion: opcionSeleccionada.costoReconexion,

&nbsp;       saldoPendiente: opcionSeleccionada.saldoPendiente,

&nbsp;       facturasPagadas: facturasPagadas.map(f => f.\_id),

&nbsp;       metodoPago: datosPago.metodoPago,

&nbsp;       referencia: datosPago.referencia,

&nbsp;       procesadoPor: datosPago.usuarioId,

&nbsp;       fechaReconexion: new Date()

&nbsp;     }], { session });

&nbsp;     

&nbsp;     await session.commitTransaction();

&nbsp;     

&nbsp;     return {

&nbsp;       exitoso: true,

&nbsp;       mensaje: 'Reconexión procesada exitosamente',

&nbsp;       reconexionId: reconexion\[0].\_id,

&nbsp;       facturasPagadas: facturasPagadas.length,

&nbsp;       saldoPendiente: opcionSeleccionada.saldoPendiente,

&nbsp;       fechaReconexion: new Date()

&nbsp;     };

&nbsp;     

&nbsp;   } catch (error) {

&nbsp;     await session.abortTransaction();

&nbsp;     console.error('\[ReconexionService] Error al procesar reconexión:', error);

&nbsp;     throw error;

&nbsp;   } finally {

&nbsp;     session.endSession();

&nbsp;   }

&nbsp; }



&nbsp; /\*\*

&nbsp;  \* Aplica los pagos a las facturas correspondientes

&nbsp;  \*/

&nbsp; async aplicarPagosFacturas(clienteId, opcionSeleccionada, datosPago, session) {

&nbsp;   const facturasPagadas = \[];

&nbsp;   const facturasPendientes = await Factura.find({

&nbsp;     clienteId,

&nbsp;     estado: 'pendiente'

&nbsp;   }).sort({ fechaEmision: 1 }).session(session);

&nbsp;   

&nbsp;   let montoDisponible = opcionSeleccionada.montoDeuda;

&nbsp;   

&nbsp;   for (const factura of facturasPendientes) {

&nbsp;     const mora = moraService.calcularMoraFactura(factura);

&nbsp;     const totalFactura = mora.totalConMora;

&nbsp;     

&nbsp;     if (montoDisponible >= totalFactura) {

&nbsp;       // Pagar factura completa

&nbsp;       factura.estado = 'pagada';

&nbsp;       factura.fechaPago = new Date();

&nbsp;       factura.metodoPago = datosPago.metodoPago;

&nbsp;       factura.montoMora = mora.montoMora;

&nbsp;       await factura.save({ session });

&nbsp;       

&nbsp;       facturasPagadas.push(factura);

&nbsp;       montoDisponible -= totalFactura;

&nbsp;     } else if (montoDisponible > 0) {

&nbsp;       // Pago parcial

&nbsp;       factura.observaciones = (factura.observaciones || '') + 

&nbsp;         `\\nPago parcial de Q${montoDisponible.toFixed(2)} el ${new Date().toLocaleDateString()}`;

&nbsp;       factura.montoMora = mora.montoMora;

&nbsp;       await factura.save({ session });

&nbsp;       

&nbsp;       montoDisponible = 0;

&nbsp;     }

&nbsp;     

&nbsp;     if (montoDisponible <= 0) break;

&nbsp;   }

&nbsp;   

&nbsp;   return facturasPagadas;

&nbsp; }

}



module.exports = new ReconexionService();

```



\### ✅ Validation:

\- File `backend/services/reconexion.service.js` exists

\- Correctly imports `mora.service.js`

\- Has methods: calcularOpcionesReconexion, procesarReconexion, etc.



---



\## 🎯 PHASE 6: CREATE FEL SERVICE (BASE STRUCTURE)



\### Objective:

Create FEL base structure without implementing the real connection.



\### Instruction for Claude Code:

```

"Create backend/services/fel.service.js as base structure only, without implementing real connection with Infile:"

```



\### Complete code:

```javascript

/\*\*

&nbsp;\* Servicio de Factura Electrónica en Línea (FEL)

&nbsp;\* Integración con SAT Guatemala a través de Infile

&nbsp;\* 

&nbsp;\* ESTADO: ESTRUCTURA BASE - PENDIENTE DE IMPLEMENTACIÓN

&nbsp;\* 

&nbsp;\* Para implementar:

&nbsp;\* 1. Obtener credenciales de Infile (NIT, Usuario, Clave, Token)

&nbsp;\* 2. Agregar credenciales al archivo .env

&nbsp;\* 3. Instalar dependencias: npm install xml2js uuid

&nbsp;\* 4. Implementar los métodos marcados como TODO

&nbsp;\*/



class FELService {

&nbsp; constructor() {

&nbsp;   // URLs de Infile

&nbsp;   this.baseURL = process.env.FEL\_AMBIENTE === 'produccion' 

&nbsp;     ? 'https://fel.infile.com.gt/api' 

&nbsp;     : 'https://fel-sandbox.infile.com.gt/api';

&nbsp;   

&nbsp;   // Credenciales (configurar en .env)

&nbsp;   this.credentials = {

&nbsp;     nit: process.env.FEL\_NIT || null,

&nbsp;     usuario: process.env.FEL\_USUARIO || null,

&nbsp;     clave: process.env.FEL\_CLAVE || null,

&nbsp;     token: process.env.FEL\_TOKEN || null

&nbsp;   };

&nbsp;   

&nbsp;   this.maxReintentos = 3;

&nbsp;   this.tiempoEsperaBase = 2000;

&nbsp; }



&nbsp; /\*\*

&nbsp;  \* TODO: Implementar certificación de factura

&nbsp;  \* Certifica una factura en el sistema FEL

&nbsp;  \*/

&nbsp; async certificarFactura(facturaData) {

&nbsp;   throw new Error('FEL no implementado. Pendiente de configuración con Infile.');

&nbsp; }



&nbsp; /\*\*

&nbsp;  \* TODO: Implementar construcción de XML

&nbsp;  \* Construye el XML de la factura según formato FEL

&nbsp;  \*/

&nbsp; construirXMLFactura(factura, uuid) {

&nbsp;   throw new Error('FEL no implementado. Pendiente de configuración con Infile.');

&nbsp; }



&nbsp; /\*\*

&nbsp;  \* TODO: Implementar anulación

&nbsp;  \* Anula una factura certificada

&nbsp;  \*/

&nbsp; async anularFactura(uuid, motivo) {

&nbsp;   throw new Error('FEL no implementado. Pendiente de configuración con Infile.');

&nbsp; }



&nbsp; /\*\*

&nbsp;  \* Verifica si FEL está configurado

&nbsp;  \*/

&nbsp; estaConfigurado() {

&nbsp;   return !!(

&nbsp;     this.credentials.nit \&\&

&nbsp;     this.credentials.usuario \&\&

&nbsp;     this.credentials.clave \&\&

&nbsp;     this.credentials.token

&nbsp;   );

&nbsp; }

}



module.exports = new FELService();

```



\### ✅ Validation:

\- File `backend/services/fel.service.js` exists

\- Methods throw Error indicating "pending"

\- Has `estaConfigurado()` method



---



\## 🎯 PHASE 7: CREATE CONTROLLERS



\### Objective:

Create the 3 controllers for mora, reconexion, and FEL.



\### Instruction for Claude Code:

```

"Create these three new controllers:"

```



\### File 1: `backend/controllers/mora.controller.js`

```javascript

const moraService = require('../services/mora.service');



/\*\*

&nbsp;\* Obtiene la mora acumulada de un cliente

&nbsp;\*/

exports.obtenerMoraCliente = async (req, res) => {

&nbsp; try {

&nbsp;   const { clienteId } = req.params;

&nbsp;   

&nbsp;   const mora = await moraService.calcularMoraAcumuladaCliente(clienteId);

&nbsp;   

&nbsp;   res.json({

&nbsp;     success: true,

&nbsp;     data: mora

&nbsp;   });

&nbsp;   

&nbsp; } catch (error) {

&nbsp;   console.error('\[MoraController] Error:', error);

&nbsp;   res.status(500).json({

&nbsp;     success: false,

&nbsp;     message: 'Error al calcular mora',

&nbsp;     error: error.message

&nbsp;   });

&nbsp; }

};



/\*\*

&nbsp;\* Verifica si un cliente requiere corte de servicio

&nbsp;\*/

exports.verificarCorteServicio = async (req, res) => {

&nbsp; try {

&nbsp;   const { clienteId } = req.params;

&nbsp;   

&nbsp;   const resultado = await moraService.requiereCorteServicio(clienteId);

&nbsp;   

&nbsp;   res.json({

&nbsp;     success: true,

&nbsp;     data: resultado

&nbsp;   });

&nbsp;   

&nbsp; } catch (error) {

&nbsp;   console.error('\[MoraController] Error:', error);

&nbsp;   res.status(500).json({

&nbsp;     success: false,

&nbsp;     message: 'Error al verificar corte',

&nbsp;     error: error.message

&nbsp;   });

&nbsp; }

};

```



\### File 2: `backend/controllers/reconexion.controller.js`

```javascript

const reconexionService = require('../services/reconexion.service');



/\*\*

&nbsp;\* Obtiene las opciones de reconexión para un cliente

&nbsp;\*/

exports.obtenerOpcionesReconexion = async (req, res) => {

&nbsp; try {

&nbsp;   const { clienteId } = req.params;

&nbsp;   

&nbsp;   const opciones = await reconexionService.calcularOpcionesReconexion(clienteId);

&nbsp;   

&nbsp;   res.json({

&nbsp;     success: true,

&nbsp;     data: opciones

&nbsp;   });

&nbsp;   

&nbsp; } catch (error) {

&nbsp;   console.error('\[ReconexionController] Error:', error);

&nbsp;   res.status(500).json({

&nbsp;     success: false,

&nbsp;     message: 'Error al calcular opciones de reconexión',

&nbsp;     error: error.message

&nbsp;   });

&nbsp; }

};



/\*\*

&nbsp;\* Procesa una reconexión

&nbsp;\*/

exports.procesarReconexion = async (req, res) => {

&nbsp; try {

&nbsp;   const { clienteId } = req.params;

&nbsp;   const { opcion, metodoPago, monto, referencia } = req.body;

&nbsp;   

&nbsp;   // Validar datos requeridos

&nbsp;   if (!opcion || !metodoPago || !monto) {

&nbsp;     return res.status(400).json({

&nbsp;       success: false,

&nbsp;       message: 'Faltan datos requeridos: opcion, metodoPago, monto'

&nbsp;     });

&nbsp;   }

&nbsp;   

&nbsp;   if (!\['parcial', 'total'].includes(opcion)) {

&nbsp;     return res.status(400).json({

&nbsp;       success: false,

&nbsp;       message: 'Opción inválida. Debe ser "parcial" o "total"'

&nbsp;     });

&nbsp;   }

&nbsp;   

&nbsp;   const datosPago = {

&nbsp;     monto: parseFloat(monto),

&nbsp;     metodoPago,

&nbsp;     referencia: referencia || null,

&nbsp;     usuarioId: req.user.id // Del middleware de autenticación

&nbsp;   };

&nbsp;   

&nbsp;   const resultado = await reconexionService.procesarReconexion(

&nbsp;     clienteId,

&nbsp;     opcion,

&nbsp;     datosPago

&nbsp;   );

&nbsp;   

&nbsp;   res.json({

&nbsp;     success: true,

&nbsp;     message: 'Reconexión procesada exitosamente',

&nbsp;     data: resultado

&nbsp;   });

&nbsp;   

&nbsp; } catch (error) {

&nbsp;   console.error('\[ReconexionController] Error:', error);

&nbsp;   res.status(500).json({

&nbsp;     success: false,

&nbsp;     message: 'Error al procesar reconexión',

&nbsp;     error: error.message

&nbsp;   });

&nbsp; }

};

```



\### File 3: `backend/controllers/fel.controller.js`

```javascript

const felService = require('../services/fel.service');



/\*\*

&nbsp;\* Verifica el estado de configuración de FEL

&nbsp;\*/

exports.verificarEstado = async (req, res) => {

&nbsp; try {

&nbsp;   const configurado = felService.estaConfigurado();

&nbsp;   

&nbsp;   res.json({

&nbsp;     success: true,

&nbsp;     fel: {

&nbsp;       configurado,

&nbsp;       mensaje: configurado 

&nbsp;         ? 'FEL configurado correctamente' 

&nbsp;         : 'FEL no configurado. Agregue credenciales en .env'

&nbsp;     }

&nbsp;   });

&nbsp; } catch (error) {

&nbsp;   res.status(500).json({

&nbsp;     success: false,

&nbsp;     message: 'Error al verificar estado de FEL',

&nbsp;     error: error.message

&nbsp;   });

&nbsp; }

};



/\*\*

&nbsp;\* Certifica una factura (PENDIENTE DE IMPLEMENTACIÓN)

&nbsp;\*/

exports.certificarFactura = async (req, res) => {

&nbsp; try {

&nbsp;   res.status(501).json({

&nbsp;     success: false,

&nbsp;     message: 'Certificación FEL pendiente de implementación',

&nbsp;     instrucciones: \[

&nbsp;       '1. Obtener credenciales de Infile',

&nbsp;       '2. Configurar variables de entorno en .env',

&nbsp;       '3. Implementar métodos en fel.service.js'

&nbsp;     ]

&nbsp;   });

&nbsp; } catch (error) {

&nbsp;   res.status(500).json({

&nbsp;     success: false,

&nbsp;     message: 'Error en certificación FEL',

&nbsp;     error: error.message

&nbsp;   });

&nbsp; }

};

```



\### ✅ Validation:

\- All 3 controllers exist in `backend/controllers/`

\- Each one imports its corresponding service

\- Have error handling with try-catch



---



\## 🎯 PHASE 8: CREATE ROUTES



\### Objective:

Create routes for the 3 modules.



\### Instruction for Claude Code:

```

"Create these three new routes:"

```



\### File 1: `backend/routes/mora.routes.js`

```javascript

const express = require('express');

const router = express.Router();

const moraController = require('../controllers/mora.controller');

const { authMiddleware } = require('../middlewares/auth.middleware');



router.use(authMiddleware);



/\*\*

&nbsp;\* @route GET /api/mora/cliente/:clienteId

&nbsp;\* @desc Obtener mora acumulada de un cliente

&nbsp;\*/

router.get('/cliente/:clienteId', moraController.obtenerMoraCliente);



/\*\*

&nbsp;\* @route GET /api/mora/cliente/:clienteId/verificar-corte

&nbsp;\* @desc Verificar si el cliente requiere corte de servicio

&nbsp;\*/

router.get('/cliente/:clienteId/verificar-corte', moraController.verificarCorteServicio);



module.exports = router;

```



\### File 2: `backend/routes/reconexion.routes.js`

```javascript

const express = require('express');

const router = express.Router();

const reconexionController = require('../controllers/reconexion.controller');

const { authMiddleware } = require('../middlewares/auth.middleware');



router.use(authMiddleware);



/\*\*

&nbsp;\* @route GET /api/reconexion/opciones/:clienteId

&nbsp;\* @desc Obtener opciones de reconexión para un cliente

&nbsp;\*/

router.get('/opciones/:clienteId', reconexionController.obtenerOpcionesReconexion);



/\*\*

&nbsp;\* @route POST /api/reconexion/procesar/:clienteId

&nbsp;\* @desc Procesar reconexión de un cliente

&nbsp;\*/

router.post('/procesar/:clienteId', reconexionController.procesarReconexion);



module.exports = router;

```



\### File 3: `backend/routes/fel.routes.js`

```javascript

const express = require('express');

const router = express.Router();

const felController = require('../controllers/fel.controller');

const { authMiddleware } = require('../middlewares/auth.middleware');



router.use(authMiddleware);



/\*\*

&nbsp;\* @route GET /api/fel/estado

&nbsp;\* @desc Verifica el estado de configuración de FEL

&nbsp;\*/

router.get('/estado', felController.verificarEstado);



/\*\*

&nbsp;\* @route POST /api/fel/certificar/:facturaId

&nbsp;\* @desc Certifica una factura (PENDIENTE DE IMPLEMENTACIÓN)

&nbsp;\*/

router.post('/certificar/:facturaId', felController.certificarFactura);



module.exports = router;

```



\### ✅ Validation:

\- All 3 routes exist in `backend/routes/`

\- All use authMiddleware

\- Correctly import their controllers



---



\## 🎯 PHASE 9: REGISTER ROUTES IN SERVER.JS



\### Objective:

Modify server.js to register the new routes.



\### Instruction for Claude Code:

```

"Open backend/server.js and:

1\. LOCATE where the route imports are (example: const clienteRoutes = require...)

2\. ADD these two lines AFTER the existing imports:

&nbsp;  const moraRoutes = require('./routes/mora.routes');

&nbsp;  const reconexionRoutes = require('./routes/reconexion.routes');

3\. LOCATE where routes are registered (example: app.use('/api/clientes'...)

4\. ADD these two lines AFTER the existing routes:

&nbsp;  app.use('/api/mora', moraRoutes);

&nbsp;  app.use('/api/reconexion', reconexionRoutes);

5\. DO NOT modify anything else in the file."

```



\### ✅ Validation:

\- `backend/server.js` has the 2 new imports

\- `backend/server.js` has the 2 new app.use

\- NO file like `server.nuevo.js` or similar exists

\- The server still starts correctly



---



\## 🎯 PHASE 10: UPDATE .ENV WITH FEL VARIABLES



\### Objective:

Add environment variables for FEL (empty for now).



\### Instruction for Claude Code:

```

"Open the .env file in the project root and ADD these lines at the END of the existing file. KEEP all variables that already exist:"

```



\### Code to add:

```env



\# ===== CONFIGURACIÓN FEL (Factura Electrónica) =====

\# Ambiente: 'sandbox' para pruebas, 'produccion' para uso real

FEL\_AMBIENTE=sandbox



\# Credenciales de Infile (obtener en https://infile.com.gt)

FEL\_NIT=

FEL\_USUARIO=

FEL\_CLAVE=

FEL\_TOKEN=



\# NOTA: Dejar vacío hasta obtener credenciales reales de Infile

```



\### ✅ Validation:

\- `.env` has the 5 new FEL\_\* variables

\- Variables are empty (no value after the =)

\- All previous variables remain intact



---



\## 🎉 IMPLEMENTATION COMPLETED



\### ✅ Summary of what was implemented:



\*\*Files created (13):\*\*

\- ✅ `backend/services/mora.service.js`

\- ✅ `backend/services/reconexion.service.js`

\- ✅ `backend/services/fel.service.js`

\- ✅ `backend/models/reconexion.model.js`

\- ✅ `backend/models/logFel.model.js`

\- ✅ `backend/controllers/mora.controller.js`

\- ✅ `backend/controllers/reconexion.controller.js`

\- ✅ `backend/controllers/fel.controller.js`

\- ✅ `backend/routes/mora.routes.js`

\- ✅ `backend/routes/reconexion.routes.js`

\- ✅ `backend/routes/fel.routes.js`



\*\*Files modified (3):\*\*

\- ✅ `backend/models/factura.model.js`

\- ✅ `backend/models/cliente.model.js`

\- ✅ `backend/server.js`

\- ✅ `.env`



\### 🧪 FINAL TESTS



Execute these commands to test:



```bash

\# 1. Start the server

npm start



\# 2. Test mora endpoint (replace {clienteId} and {token})

curl http://localhost:5000/api/mora/cliente/{clienteId} \\

&nbsp; -H "Authorization: Bearer {token}"



\# 3. Test reconnection options

curl http://localhost:5000/api/reconexion/opciones/{clienteId} \\

&nbsp; -H "Authorization: Bearer {token}"



\# 4. Verify FEL status

curl http://localhost:5000/api/fel/estado \\

&nbsp; -H "Authorization: Bearer {token}"

```



\### 📊 Available endpoints:



\*\*Mora:\*\*

\- `GET /api/mora/cliente/:clienteId` - Calculate late fees

\- `GET /api/mora/cliente/:clienteId/verificar-corte` - Verify service cut



\*\*Reconexion:\*\*

\- `GET /api/reconexion/opciones/:clienteId` - View options

\- `POST /api/reconexion/procesar/:clienteId` - Process reconnection



\*\*FEL:\*\*

\- `GET /api/fel/estado` - Configuration status

\- `POST /api/fel/certificar/:facturaId` - Certify (pending)



\### 🎯 Next steps:



1\. \*\*Functional testing\*\* with Postman or similar

2\. \*\*Create frontend\*\* to consume these endpoints

3\. \*\*Implement FEL\*\* when you have Infile credentials

4\. \*\*Document\*\* use cases and examples



---



\*\*Implementation complete! 🚀\*\*

