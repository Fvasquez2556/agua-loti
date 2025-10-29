# 📋 PLAN DE IMPLEMENTACIÓN - FACTURA CONSOLIDADA DE RECONEXIÓN
## Sistema de Agua LOTI - Huehuetenango, Guatemala

**Fecha:** 28 de Octubre de 2025  
**Objetivo:** Generar UNA SOLA factura consolidada al procesar reconexiones con múltiples facturas vencidas

---

## 🎯 REQUERIMIENTO CONFIRMADO

### **Situación Actual (NO DESEADA):**
```
Cliente con 3 meses vencidos:
├── FAC-202507-0001 (Julio)    → Q 50.00 [pendiente]
├── FAC-202508-0002 (Agosto)   → Q 50.00 [pendiente]
└── FAC-202509-0003 (Septiembre) → Q 50.00 [pendiente]

Al procesar reconexión:
├── Se pagan 3 facturas por separado
├── Se crean 3 registros de pago
├── Cada factura queda marcada individualmente
└── Ticket consolidado (solo visual)
```

### **Situación Nueva (REQUERIDA):**
```
Cliente con 3 meses vencidos:
├── FAC-202507-0001 (Julio)      → Q 50.00 [pendiente]
├── FAC-202508-0002 (Agosto)     → Q 50.00 [pendiente]
└── FAC-202509-0003 (Septiembre) → Q 50.00 [pendiente]

Al procesar reconexión:
├── Se crea NUEVA FACTURA CONSOLIDADA:
│   └── FAC-RECON-202510-0001
│       ├── Julio 2025:   Q 50.00 + Q 3.50 mora = Q 53.50
│       ├── Agosto 2025:  Q 50.00 + Q 3.50 mora = Q 53.50
│       ├── Sept 2025:    Q 50.00 + Q 3.50 mora = Q 53.50
│       ├── Reconexión:                         Q 125.00
│       └── TOTAL:                              Q 285.50
│
├── Las 3 facturas originales cambian a estado: "consolidada"
├── Se crea 1 SOLO PAGO contra la factura consolidada
├── Se genera 1 ticket de la factura consolidada
└── La factura consolidada se certifica con FEL (Infile)
```

---

## 🗂️ ARCHIVOS A MODIFICAR/CREAR

### 1️⃣ **Modelo de Factura** (`backend/models/factura.model.js`)

**Modificaciones necesarias:**

```javascript
// Agregar nuevo campo al schema
const facturaSchema = new mongoose.Schema({
  // ... campos existentes ...
  
  // ✅ NUEVOS CAMPOS PARA FACTURA CONSOLIDADA
  tipoFactura: {
    type: String,
    enum: ['normal', 'reconexion'],
    default: 'normal'
  },
  
  // Array de facturas que fueron consolidadas
  facturasConsolidadas: [{
    facturaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Factura'
    },
    numeroFactura: String,
    mesNombre: String,        // "Enero", "Febrero", etc.
    periodo: {
      inicio: Date,
      fin: Date
    },
    montoOriginal: Number,
    montoMora: Number,
    diasMora: Number,
    subtotal: Number          // Original + Mora
  }],
  
  // Costo de reconexión (solo para tipo 'reconexion')
  costoReconexion: {
    type: Number,
    default: 0
  },
  
  // Estado de la factura original (si fue consolidada)
  estadoConsolidacion: {
    type: String,
    enum: ['no_consolidada', 'consolidada'],
    default: 'no_consolidada'
  },
  
  // Referencia a la factura consolidada que la incluye
  facturaConsolidadaRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Factura',
    default: null
  }
});

// ✅ NUEVO MÉTODO ESTÁTICO: Generar número de factura de reconexión
facturaSchema.statics.generarNumeroFacturaReconexion = async function() {
  const fechaActual = new Date();
  const year = fechaActual.getFullYear();
  const month = String(fechaActual.getMonth() + 1).padStart(2, '0');
  const prefijo = `FAC-RECON-${year}${month}`;
  
  const ultimaFactura = await this.findOne({
    numeroFactura: { $regex: `^${prefijo}` }
  })
  .sort({ numeroFactura: -1 })
  .limit(1);
  
  let correlativo = 1;
  if (ultimaFactura) {
    const partes = ultimaFactura.numeroFactura.split('-');
    correlativo = parseInt(partes[partes.length - 1]) + 1;
  }
  
  return `${prefijo}-${String(correlativo).padStart(4, '0')}`;
  // Ejemplo: FAC-RECON-202510-0001
};

// ✅ NUEVO MÉTODO DE INSTANCIA: Obtener nombre del mes
facturaSchema.methods.obtenerNombreMes = function() {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const mes = this.periodoInicio.getMonth();
  return meses[mes];
};
```

---

### 2️⃣ **Servicio de Reconexión** (`backend/services/reconexion.service.js`)

**Modificación del método `procesarReconexion`:**

```javascript
async procesarReconexion(clienteId, opcion, datosPago) {
  try {
    // ... código existente para validaciones ...
    
    // Obtener todas las facturas pendientes
    const facturasPendientes = await Factura.find({
      clienteId,
      estado: { $in: ['pendiente', 'vencida'] }
    }).sort({ fechaEmision: 1 });
    
    if (facturasPendientes.length === 0) {
      throw new Error('No hay facturas pendientes para este cliente');
    }
    
    // ✅ CREAR FACTURA CONSOLIDADA DE RECONEXIÓN
    const facturaConsolidada = await this.crearFacturaConsolidada(
      clienteId,
      facturasPendientes,
      opcionSeleccionada,
      datosPago
    );
    
    // ✅ MARCAR FACTURAS ORIGINALES COMO CONSOLIDADAS
    await this.marcarFacturasComoConsolidadas(
      facturasPendientes,
      facturaConsolidada._id
    );
    
    // Actualizar estado del cliente
    await Cliente.findByIdAndUpdate(clienteId, {
      estadoServicio: 'activo',
      fechaUltimaReconexion: new Date(),
      $inc: { numeroReconexiones: 1 }
    });
    
    // Crear registro de reconexión
    const reconexion = await Reconexion.create({
      clienteId,
      tipoOpcion: opcion,
      montoTotal: datosPago.monto,
      facturaConsolidadaId: facturaConsolidada._id,
      facturasOriginales: facturasPendientes.map(f => f._id),
      metodoPago: datosPago.metodoPago,
      procesadoPor: datosPago.usuarioId,
      fechaReconexion: new Date()
    });
    
    // Generar ticket
    const ticketResultado = await ticketPagoService.generarTicketFacturaConsolidada(
      facturaConsolidada._id
    );
    
    return {
      exitoso: true,
      mensaje: 'Reconexión procesada exitosamente',
      facturaConsolidada: facturaConsolidada.numeroFactura,
      facturasOriginales: facturasPendientes.length,
      ticketConsolidado: ticketResultado
    };
    
  } catch (error) {
    throw error;
  }
}

// ✅ NUEVO MÉTODO: Crear factura consolidada
async crearFacturaConsolidada(clienteId, facturasPendientes, opcionSeleccionada, datosPago) {
  const moraService = require('./mora.service');
  
  // Preparar detalles de cada factura
  const detallesFacturas = [];
  let totalConsumo = 0;
  let totalMora = 0;
  
  for (const factura of facturasPendientes) {
    const mora = moraService.calcularMoraFactura(factura);
    
    detallesFacturas.push({
      facturaId: factura._id,
      numeroFactura: factura.numeroFactura,
      mesNombre: factura.obtenerNombreMes(),
      periodo: {
        inicio: factura.periodoInicio,
        fin: factura.periodoFin
      },
      montoOriginal: factura.montoTotal,
      montoMora: mora.montoMora,
      diasMora: mora.diasMora,
      subtotal: mora.totalConMora
    });
    
    totalConsumo += factura.montoTotal;
    totalMora += mora.montoMora;
  }
  
  // Generar número de factura consolidada
  const numeroFacturaConsolidada = await Factura.generarNumeroFacturaReconexion();
  
  // Crear la factura consolidada
  const facturaConsolidada = await Factura.create({
    numeroFactura: numeroFacturaConsolidada,
    tipoFactura: 'reconexion',
    clienteId: clienteId,
    
    // Fechas
    fechaEmision: new Date(),
    fechaVencimiento: new Date(), // Vence hoy (ya se está pagando)
    
    // Período (desde la primera hasta la última factura)
    periodoInicio: facturasPendientes[0].periodoInicio,
    periodoFin: facturasPendientes[facturasPendientes.length - 1].periodoFin,
    
    // Montos
    montoBase: totalConsumo,
    montoMora: totalMora,
    costoReconexion: opcionSeleccionada.costoReconexion,
    montoTotal: totalConsumo + totalMora + opcionSeleccionada.costoReconexion,
    
    // Detalles consolidados
    facturasConsolidadas: detallesFacturas,
    
    // Estado
    estado: 'pagada', // Se marca como pagada inmediatamente
    fechaPago: new Date(),
    metodoPago: datosPago.metodoPago,
    
    // Observaciones
    observaciones: `Factura consolidada de reconexión. Incluye ${facturasPendientes.length} facturas: ${facturasPendientes.map(f => f.numeroFactura).join(', ')}`,
    
    // Usuario
    creadoPor: datosPago.usuarioId
  });
  
  // Crear el pago único
  const numeroPago = await Pago.generarNumeroPago();
  await Pago.create({
    numeroPago,
    facturaId: facturaConsolidada._id,
    clienteId: clienteId,
    fechaPago: new Date(),
    montoOriginal: totalConsumo,
    montoMora: totalMora,
    montoReconexion: opcionSeleccionada.costoReconexion,
    montoPagado: facturaConsolidada.montoTotal,
    metodoPago: datosPago.metodoPago,
    referenciaPago: datosPago.referencia,
    observaciones: `Pago de factura consolidada de reconexión: ${numeroFacturaConsolidada}`,
    registradoPor: datosPago.usuarioId
  });
  
  return facturaConsolidada;
}

// ✅ NUEVO MÉTODO: Marcar facturas como consolidadas
async marcarFacturasComoConsolidadas(facturas, facturaConsolidadaId) {
  for (const factura of facturas) {
    factura.estadoConsolidacion = 'consolidada';
    factura.facturaConsolidadaRef = facturaConsolidadaId;
    factura.estado = 'pagada'; // También marcar como pagada
    factura.fechaPago = new Date();
    factura.observaciones = (factura.observaciones || '') + 
      `\n[CONSOLIDADA] Incluida en factura consolidada ${facturaConsolidadaId} el ${new Date().toLocaleDateString()}`;
    
    await factura.save();
  }
}
```

---

### 3️⃣ **Modelo de Reconexión** (`backend/models/reconexion.model.js`)

**Agregar campos:**

```javascript
const reconexionSchema = new mongoose.Schema({
  // ... campos existentes ...
  
  // ✅ NUEVO: Referencia a la factura consolidada
  facturaConsolidadaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Factura',
    required: true
  },
  
  // ✅ NUEVO: Referencias a las facturas originales
  facturasOriginales: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Factura'
  }]
});
```

---

### 4️⃣ **Servicio de Tickets** (`backend/services/ticketPago.service.js`)

**Nuevo método para ticket de factura consolidada:**

```javascript
/**
 * Generar ticket para factura consolidada de reconexión
 */
async generarTicketFacturaConsolidada(facturaConsolidadaId) {
  try {
    // Obtener factura consolidada con población completa
    const factura = await Factura.findById(facturaConsolidadaId)
      .populate('clienteId')
      .populate('facturasConsolidadas.facturaId');
    
    if (!factura) {
      return {
        exitoso: false,
        mensaje: 'Factura consolidada no encontrada'
      };
    }
    
    if (factura.tipoFactura !== 'reconexion') {
      return {
        exitoso: false,
        mensaje: 'Esta factura no es de tipo reconexión'
      };
    }
    
    // Crear documento PDF
    const doc = new PDFDocument({
      size: [226.77, 'auto'], // 80mm de ancho
      margins: {
        top: 14.17,
        bottom: 14.17,
        left: 14.17,
        right: 14.17
      }
    });
    
    // Generar nombre de archivo
    const nombreArchivo = `RECONEXION-${factura.numeroFactura}-${new Date().toISOString().split('T')[0]}.pdf`;
    const rutaArchivo = path.join(this.directorioBase, nombreArchivo);
    
    // Stream de escritura
    const stream = fs.createWriteStream(rutaArchivo);
    doc.pipe(stream);
    
    // ═══════════════════════════════════════
    // CONTENIDO DEL TICKET
    // ═══════════════════════════════════════
    
    // HEADER
    doc.fontSize(13).font('Courier-Bold').text('SISTEMA DE AGUA LOTI', { align: 'center' });
    doc.fontSize(9).font('Courier').text('Huehuetenango, Guatemala', { align: 'center' });
    doc.moveDown(0.5);
    doc.text('═'.repeat(32), { align: 'center' });
    doc.moveDown(0.5);
    
    // TÍTULO
    doc.fontSize(11).font('Courier-Bold').text('RECIBO DE RECONEXIÓN', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(9).font('Courier').text(`No. ${factura.numeroFactura}`, { align: 'center' });
    doc.text(`Fecha: ${factura.fechaEmision.toLocaleDateString('es-GT')}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.text('─'.repeat(32), { align: 'center' });
    doc.moveDown(0.5);
    
    // DATOS DEL CLIENTE
    doc.fontSize(9).font('Courier-Bold').text('DATOS DEL CLIENTE');
    doc.font('Courier');
    doc.text(`Cliente: ${factura.clienteId.nombres} ${factura.clienteId.apellidos}`);
    doc.text(`DPI: ${factura.clienteId.dpi}`);
    doc.text(`Contador: ${factura.clienteId.contador}`);
    doc.text(`Lote: ${factura.clienteId.lote}`);
    doc.text(`Proyecto: ${this.formatearProyecto(factura.clienteId.proyecto)}`);
    doc.moveDown(0.5);
    doc.text('─'.repeat(32), { align: 'center' });
    doc.moveDown(0.5);
    
    // DETALLE POR MES
    doc.font('Courier-Bold').text('DETALLE POR MES');
    doc.moveDown(0.3);
    
    for (const detalle of factura.facturasConsolidadas) {
      doc.font('Courier-Bold').text(detalle.mesNombre + ' ' + detalle.periodo.inicio.getFullYear());
      doc.font('Courier');
      doc.text(`  Consumo:      Q ${detalle.montoOriginal.toFixed(2).padStart(8)}`);
      doc.text(`  Mora (7%):    Q ${detalle.montoMora.toFixed(2).padStart(8)}`);
      doc.text(`  Subtotal:     Q ${detalle.subtotal.toFixed(2).padStart(8)}`);
      doc.moveDown(0.3);
    }
    
    doc.moveDown(0.2);
    doc.text('─'.repeat(32), { align: 'center' });
    doc.moveDown(0.5);
    
    // RESUMEN DE TOTALES
    doc.font('Courier-Bold').text('RESUMEN DE PAGO');
    doc.font('Courier');
    doc.text(`Total Consumo:    Q ${factura.montoBase.toFixed(2).padStart(8)}`);
    doc.text(`Total Mora:       Q ${factura.montoMora.toFixed(2).padStart(8)}`);
    doc.text(`Costo Reconexión: Q ${factura.costoReconexion.toFixed(2).padStart(8)}`);
    doc.moveDown(0.3);
    doc.text('═'.repeat(32), { align: 'center' });
    doc.fontSize(11).font('Courier-Bold');
    doc.text(`TOTAL PAGADO:   Q ${factura.montoTotal.toFixed(2)}`, { align: 'center' });
    doc.fontSize(9).font('Courier');
    doc.text('═'.repeat(32), { align: 'center' });
    doc.moveDown(0.5);
    
    // MÉTODO DE PAGO
    doc.text(`Método de pago: ${factura.metodoPago.toUpperCase()}`);
    doc.moveDown(0.5);
    
    // QR CODE
    const qrData = {
      tipo: 'reconexion',
      numeroFactura: factura.numeroFactura,
      fecha: factura.fechaEmision.toISOString(),
      totalPagado: factura.montoTotal,
      cantidadFacturas: factura.facturasConsolidadas.length,
      hash: this.crearHashVerificacion(factura)
    };
    
    const qrBuffer = await this.generarCodigoQR(qrData);
    doc.image(qrBuffer, doc.page.width / 2 - 42.52, doc.y, {
      width: 85.04, // 30mm
      height: 85.04
    });
    doc.moveDown(3);
    
    // FOOTER
    doc.fontSize(7).text('Gracias por su pago', { align: 'center' });
    doc.text('Servicio de agua restaurado', { align: 'center' });
    doc.moveDown(0.3);
    doc.text(`Impreso: ${new Date().toLocaleString('es-GT')}`, { align: 'center' });
    doc.text('Sistema Agua LOTI v1.0', { align: 'center' });
    
    // Finalizar documento
    doc.end();
    
    // Esperar a que termine
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
    
    return {
      exitoso: true,
      nombreArchivo,
      rutaArchivo,
      mensaje: 'Ticket de reconexión generado exitosamente'
    };
    
  } catch (error) {
    console.error('Error al generar ticket de reconexión:', error);
    return {
      exitoso: false,
      mensaje: `Error: ${error.message}`
    };
  }
}
```

---

### 5️⃣ **Integración con FEL** (`backend/services/fel.service.js`)

**Modificar método `construirXMLFactura` para soportar facturas consolidadas:**

```javascript
construirXMLFactura(factura, uuid) {
  // ... código existente ...
  
  // ✅ SI ES FACTURA CONSOLIDADA, AGREGAR ITEMS POR MES
  if (factura.tipoFactura === 'reconexion') {
    // Item por cada mes
    for (let i = 0; i < factura.facturasConsolidadas.length; i++) {
      const detalle = factura.facturasConsolidadas[i];
      
      xml += `
        <dte:Item BienOServicio="S" NumeroLinea="${i + 1}">
          <dte:Cantidad>1</dte:Cantidad>
          <dte:UnidadMedida>UNI</dte:UnidadMedida>
          <dte:Descripcion>Servicio de agua - ${detalle.mesNombre} ${detalle.periodo.inicio.getFullYear()}</dte:Descripcion>
          <dte:PrecioUnitario>${detalle.montoOriginal.toFixed(2)}</dte:PrecioUnitario>
          <dte:Precio>${detalle.montoOriginal.toFixed(2)}</dte:Precio>
          <dte:Descuento>0.00</dte:Descuento>
          <dte:Total>${detalle.montoOriginal.toFixed(2)}</dte:Total>
        </dte:Item>
        <dte:Item BienOServicio="S" NumeroLinea="${i + 2}">
          <dte:Cantidad>1</dte:Cantidad>
          <dte:UnidadMedida>UNI</dte:UnidadMedida>
          <dte:Descripcion>Mora ${detalle.mesNombre} - ${detalle.diasMora} días</dte:Descripcion>
          <dte:PrecioUnitario>${detalle.montoMora.toFixed(2)}</dte:PrecioUnitario>
          <dte:Precio>${detalle.montoMora.toFixed(2)}</dte:Precio>
          <dte:Descuento>0.00</dte:Descuento>
          <dte:Total>${detalle.montoMora.toFixed(2)}</dte:Total>
        </dte:Item>
      `;
    }
    
    // Item de reconexión
    xml += `
      <dte:Item BienOServicio="S" NumeroLinea="${factura.facturasConsolidadas.length * 2 + 1}">
        <dte:Cantidad>1</dte:Cantidad>
        <dte:UnidadMedida>UNI</dte:UnidadMedida>
        <dte:Descripcion>Costo de Reconexión de Servicio</dte:Descripcion>
        <dte:PrecioUnitario>${factura.costoReconexion.toFixed(2)}</dte:PrecioUnitario>
        <dte:Precio>${factura.costoReconexion.toFixed(2)}</dte:Precio>
        <dte:Descuento>0.00</dte:Descuento>
        <dte:Total>${factura.costoReconexion.toFixed(2)}</dte:Total>
      </dte:Item>
    `;
  }
  
  // ... resto del código XML ...
}
```

---

## 📊 FLUJO COMPLETO

```
1. Usuario abre módulo de Reconexión

2. Busca cliente con 2+ facturas vencidas

3. Sistema muestra:
   - Facturas vencidas encontradas (3)
   - Detalles por mes
   - Opciones 80% / 100%

4. Usuario selecciona opción y procesa

5. Backend:
   ├─ Crea factura consolidada (FAC-RECON-202510-0001)
   ├─ Marca facturas originales como "consolidada"
   ├─ Crea 1 solo registro de pago
   ├─ Genera ticket PDF
   └─ Certifica con FEL (Infile)

6. Frontend muestra:
   - Mensaje de éxito
   - Botón para descargar ticket
   - Link a factura consolidada
```

---

## ✅ VENTAJAS DE ESTA IMPLEMENTACIÓN

1. ✅ **Una sola factura** para reconexión completa
2. ✅ **Detalle claro** mes por mes con mora
3. ✅ **Compatible con FEL** - se certifica normalmente
4. ✅ **Trazabilidad** - facturas originales marcadas como consolidadas
5. ✅ **Ticket claro** con desglose completo
6. ✅ **Auditoría** - se puede rastrear qué facturas se consolidaron
7. ✅ **Reportes** - más fácil analizar reconexiones

---

## 🧪 CASOS DE PRUEBA

### **Caso 1: Reconexión con 2 meses**
```
Facturas:
- Julio:   Q 50.00 + Q 3.50 mora
- Agosto:  Q 50.00 + Q 3.50 mora

Resultado:
- Factura consolidada: FAC-RECON-202510-0001
- Total: Q 107.00 + Q 125.00 = Q 232.00
- Facturas originales: estado "consolidada"
```

### **Caso 2: Reconexión con 5 meses**
```
Facturas:
- Mayo a Septiembre (5 meses)
- Cada una con mora acumulada

Resultado:
- Factura consolidada con 5 detalles
- Ticket con desglose de 5 meses
- FEL con 11 items (5 consumo + 5 mora + 1 reconexión)
```

---

## 📝 NOTAS IMPORTANTES

1. **Numeración:** Las facturas consolidadas usan prefijo `FAC-RECON-` para diferenciarlas
2. **Estados:** Las facturas originales quedan como "pagada" Y "consolidada"
3. **FEL:** La factura consolidada SÍ se certifica ante SAT
4. **Reversión:** Si se necesita anular, se debe anular la factura consolidada (revisar implicaciones con SAT)
5. **Reportes:** Los reportes deben considerar facturas consolidadas para evitar duplicar montos

---

## 🚀 SIGUIENTE PASO

¿Quieres que proceda a implementar estos cambios paso a paso, o prefieres revisar primero alguna parte específica del plan?

También puedo:
1. Crear el código completo de las modificaciones
2. Crear scripts de migración para facturas existentes
3. Actualizar el frontend para mostrar correctamente las facturas consolidadas
4. Crear documentación para el usuario final

**¿Por dónde empezamos?** 🎯
