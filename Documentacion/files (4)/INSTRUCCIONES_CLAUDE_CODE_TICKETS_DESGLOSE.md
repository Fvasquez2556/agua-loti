# 📋 INSTRUCCIONES PARA CLAUDE.CODE - Modificar Servicio de Tickets
## Sistema de Agua LOTI - Desglose por Mes en Tickets de Reconexión

---

## 🎯 OBJETIVO

Modificar el servicio de generación de tickets (`ticketPago.service.js`) para que cuando se genere un ticket de una factura consolidada de reconexión, muestre el **desglose detallado por mes** en lugar de solo mostrar los totales.

---

## 📂 ARCHIVO A MODIFICAR

**Ubicación:** `backend/services/ticketPago.service.js`

**Función específica a modificar:** `generarTicketReconexionConsolidado()`

---

## 🔍 ANÁLISIS DE LA SITUACIÓN ACTUAL

### **Ticket Actual (INCORRECTO):**
```
DETALLE DEL PAGO
Subtotal Factura: Q 1800.00
Mora: Q 161.00
Reconexión: Q 125.00
TOTAL PAGADO: Q 2086.00
```

### **Ticket Deseado (CORRECTO):**
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
═════════════════════════════
```

---

## 📝 INSTRUCCIONES PASO A PASO

### ✅ PASO 1: Localizar la Función

**Acción:** Abre el archivo `backend/services/ticketPago.service.js`

**Busca la función:** `generarTicketReconexionConsolidado`

Esta función debería verse similar a esto:
```javascript
async generarTicketReconexionConsolidado(pagosIds, datosReconexion) {
  // ... código existente ...
}
```

---

### ✅ PASO 2: Localizar la Sección de "DETALLE DEL PAGO"

**Dentro de la función**, busca la sección que dice:

```javascript
// DETALLE DEL PAGO
doc.moveDown(0.5);
doc.text('─'.repeat(32), { align: 'center' });
doc.moveDown(0.5);
doc.font('Courier-Bold').text('DETALLE DEL PAGO');
doc.font('Courier');
```

Esta sección está generando el detalle actual **SIN** desglose por mes.

---

### ✅ PASO 3: Obtener la Factura Consolidada

**Antes de modificar el detalle**, necesitamos obtener la factura consolidada.

**LOCALIZA** esta línea en el código (debería estar cerca del inicio de la función):

```javascript
const primerPago = pagos[0];
```

**AGREGA** inmediatamente después de esa línea:

```javascript
// Obtener la factura consolidada (si existe)
let facturaConsolidada = null;
if (primerPago.facturaId && primerPago.facturaId.tipoFactura === 'reconexion') {
  facturaConsolidada = primerPago.facturaId;
}
```

---

### ✅ PASO 4: Reemplazar la Sección de DETALLE

**BUSCA Y ELIMINA** todo el bloque actual de "DETALLE DEL PAGO" que se ve así:

```javascript
// DETALLE DEL PAGO
doc.moveDown(0.5);
doc.text('─'.repeat(32), { align: 'center' });
doc.moveDown(0.5);
doc.font('Courier-Bold').text('DETALLE DEL PAGO');
doc.font('Courier');
doc.text(`Subtotal Factura:  Q ${totales.totalConsumo.toFixed(2).padStart(8)}`);
doc.text(`Mora:               Q ${totales.totalMora.toFixed(2).padStart(8)}`);
doc.text(`Reconexión:         Q ${totales.totalReconexion.toFixed(2).padStart(8)}`);
doc.moveDown(0.5);
doc.text('═'.repeat(32), { align: 'center' });
doc.fontSize(11).font('Courier-Bold');
doc.text(`TOTAL PAGADO:     Q ${totales.totalPagado.toFixed(2)}`, { align: 'center' });
doc.fontSize(9).font('Courier');
doc.text('═'.repeat(32), { align: 'center' });
```

**REEMPLAZA** con este código nuevo:

```javascript
// DETALLE POR MES (si es factura consolidada)
doc.moveDown(0.5);
doc.text('─'.repeat(32), { align: 'center' });
doc.moveDown(0.5);

if (facturaConsolidada && facturaConsolidada.facturasConsolidadas && facturaConsolidada.facturasConsolidadas.length > 0) {
  // ═══════════════════════════════════════════════
  // MOSTRAR DESGLOSE POR MES
  // ═══════════════════════════════════════════════
  
  doc.font('Courier-Bold').text('DETALLE POR MES');
  doc.moveDown(0.3);
  
  // Agrupar facturas por mes (para combinar si hay varias del mismo mes)
  const facturasPorMes = {};
  
  for (const detalle of facturaConsolidada.facturasConsolidadas) {
    const mesKey = detalle.mesNombre;
    
    if (!facturasPorMes[mesKey]) {
      facturasPorMes[mesKey] = {
        mesNombre: detalle.mesNombre,
        year: new Date(detalle.periodo.inicio).getFullYear(),
        montoOriginal: 0,
        montoMora: 0,
        subtotal: 0,
        facturas: []
      };
    }
    
    facturasPorMes[mesKey].montoOriginal += detalle.montoOriginal;
    facturasPorMes[mesKey].montoMora += detalle.montoMora || 0;
    facturasPorMes[mesKey].subtotal += detalle.subtotal;
    facturasPorMes[mesKey].facturas.push(detalle.numeroFactura);
  }
  
  // Ordenar por mes (Mayo, Junio, Julio, etc.)
  const mesesOrden = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const mesesOrdenados = Object.values(facturasPorMes).sort((a, b) => {
    return mesesOrden.indexOf(a.mesNombre) - mesesOrden.indexOf(b.mesNombre);
  });
  
  // Mostrar cada mes
  for (const mes of mesesOrdenados) {
    doc.font('Courier-Bold').text(`${mes.mesNombre} ${mes.year}`);
    doc.font('Courier');
    doc.text(`  Consumo:      Q ${mes.montoOriginal.toFixed(2).padStart(8)}`);
    doc.text(`  Mora (7%):    Q ${mes.montoMora.toFixed(2).padStart(8)}`);
    doc.text(`  Subtotal:     Q ${mes.subtotal.toFixed(2).padStart(8)}`);
    doc.moveDown(0.3);
  }
  
  doc.moveDown(0.2);
  doc.text('─'.repeat(32), { align: 'center' });
  doc.moveDown(0.5);
  
  // RESUMEN DE TOTALES
  doc.font('Courier-Bold').text('RESUMEN DE PAGO');
  doc.font('Courier');
  doc.text(`Total Consumo + Mora: Q ${(totales.totalConsumo + totales.totalMora).toFixed(2).padStart(8)}`);
  doc.text(`Costo Reconexión:     Q ${totales.totalReconexion.toFixed(2).padStart(8)}`);
  doc.moveDown(0.3);
  doc.text('═'.repeat(32), { align: 'center' });
  doc.fontSize(11).font('Courier-Bold');
  doc.text(`TOTAL PAGADO:   Q ${totales.totalPagado.toFixed(2)}`, { align: 'center' });
  doc.fontSize(9).font('Courier');
  doc.text('═'.repeat(32), { align: 'center' });
  
} else {
  // ═══════════════════════════════════════════════
  // MOSTRAR DETALLE SIMPLE (sin desglose por mes)
  // ═══════════════════════════════════════════════
  
  doc.font('Courier-Bold').text('DETALLE DEL PAGO');
  doc.font('Courier');
  doc.text(`Subtotal Factura:  Q ${totales.totalConsumo.toFixed(2).padStart(8)}`);
  doc.text(`Mora:               Q ${totales.totalMora.toFixed(2).padStart(8)}`);
  doc.text(`Reconexión:         Q ${totales.totalReconexion.toFixed(2).padStart(8)}`);
  doc.moveDown(0.5);
  doc.text('═'.repeat(32), { align: 'center' });
  doc.fontSize(11).font('Courier-Bold');
  doc.text(`TOTAL PAGADO:     Q ${totales.totalPagado.toFixed(2)}`, { align: 'center' });
  doc.fontSize(9).font('Courier');
  doc.text('═'.repeat(32), { align: 'center' });
}
```

---

### ✅ PASO 5: Verificar el Orden de las Líneas

**IMPORTANTE:** Asegúrate de que después de este cambio, el código siga en este orden:

1. ✅ Header del ticket
2. ✅ Datos del cliente
3. ✅ **DETALLE POR MES** (recién modificado)
4. ✅ Método de pago
5. ✅ Código QR
6. ✅ Footer

---

## 🧪 VALIDACIONES

Después de hacer los cambios, verifica:

### ✅ Validación 1: Sintaxis
```bash
# Ejecuta el servidor para verificar que no hay errores de sintaxis
npm start

# NO debe haber errores al iniciar
```

### ✅ Validación 2: Generar Ticket de Prueba

**Crea una reconexión y genera el ticket:**

1. Genera 3-6 facturas con el módulo admin
2. Procesa una reconexión en el módulo de reconexión
3. Descarga el ticket generado
4. **Verifica** que el ticket muestre:
   - ✅ Título "DETALLE POR MES"
   - ✅ Cada mes listado (Mayo, Junio, Julio, etc.)
   - ✅ Consumo, Mora y Subtotal por cada mes
   - ✅ Sección "RESUMEN DE PAGO" con totales
   - ✅ Total pagado correcto

### ✅ Validación 3: Logs en Consola

Cuando generes el ticket, deberías ver en la consola:

```
✅ Ticket consolidado de reconexión generado: RECONEXION-{id}-{fecha}.pdf
   - Incluye X factura(s) pagada(s)
   - Ruta: {ruta del archivo}
```

---

## 📊 EJEMPLO DE SALIDA ESPERADA

Después de la modificación, el ticket debe verse así:

```
════════════════════════════════
RECIBO DE RECONEXIÓN
════════════════════════════════

DATOS DEL CLIENTE
Cliente: FELIX ANTONIO VASQUEZ ORTEGA
DPI: 1234567890123
Contador: CTR-002
Lote: LT-002
Proyecto: San Miguel

────────────────────────────────

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

────────────────────────────────

RESUMEN DE PAGO
Total Consumo + Mora: Q 1961.00
Costo Reconexión:     Q  125.00
════════════════════════════════
TOTAL PAGADO:        Q 2086.00
════════════════════════════════

MÉTODO DE PAGO
Método: Efectivo
Referencia: 000

[CÓDIGO QR]

Gracias por su pago
Fecha y hora de impresión: 28/10/2025 13:10:41
Sistema de Agua LOTI v2.0
```

---

## 🚨 PUNTOS CRÍTICOS

### ⚠️ **NO MODIFIQUES:**
- La función `generarTicketPago()` normal (para pagos individuales)
- Los cálculos de totales
- La generación del código QR
- El formato del PDF

### ✅ **SÍ MODIFICA:**
- Solo la sección de "DETALLE DEL PAGO" en `generarTicketReconexionConsolidado()`
- Agregar la obtención de `facturaConsolidada`
- El condicional para mostrar desglose por mes

---

## 📝 NOTAS ADICIONALES

1. **Agrupación por mes:** El código agrupa automáticamente si hay varias facturas del mismo mes (ejemplo: 3 facturas de Agosto se suman en una sola línea)

2. **Orden cronológico:** Los meses se ordenan cronológicamente (Enero → Diciembre)

3. **Compatibilidad:** El código mantiene compatibilidad con tickets antiguos que no tienen `facturasConsolidadas`

4. **Mora 0:** Si un mes no tiene mora, se muestra Q 0.00 correctamente

---

## ✅ CHECKLIST FINAL

Antes de considerar completada la tarea, verifica:

- [ ] Archivo `backend/services/ticketPago.service.js` modificado
- [ ] Variable `facturaConsolidada` agregada correctamente
- [ ] Sección de DETALLE reemplazada con el nuevo código
- [ ] Servidor arranca sin errores
- [ ] Ticket generado muestra "DETALLE POR MES"
- [ ] Cada mes aparece con su desglose
- [ ] Los totales son correctos
- [ ] El formato del ticket es legible

---

## 🎯 RESULTADO ESPERADO

Después de esta modificación:

✅ Los tickets de reconexión mostrarán el desglose completo por mes  
✅ Cada mes mostrará: Consumo + Mora + Subtotal  
✅ Los totales finales seguirán siendo correctos  
✅ El ticket será más informativo y claro para el cliente  
✅ Compatible con FEL (cuando se implemente)  

---

**¿Listo para implementar? ¡Adelante!** 🚀

---

*Última actualización: 28 de Octubre de 2025*  
*Sistema de Agua LOTI - Huehuetenango, Guatemala*
