# 🔧 Correcciones Implementadas - Módulo de Facturación

**Fecha:** 28 de Octubre de 2025
**Sistema:** Agua LOTI - Módulo de Facturación y Reconexión

---

## 📋 Resumen de Problemas Identificados y Solucionados

### ✅ 1. **Error de Transacciones MongoDB (CRÍTICO)**
**Problema:** El servicio de reconexión usaba transacciones de MongoDB que solo funcionan en replica sets, pero el sistema usa MongoDB standalone.

**Solución Implementada:**
- Eliminadas las transacciones (sessions) del servicio de reconexión
- Archivo modificado: `backend/services/reconexion.service.js`
- Ahora las operaciones se ejecutan secuencialmente sin transacciones
- Compatible con MongoDB standalone

**Líneas modificadas:**
- Línea 151-216: Método `procesarReconexion`
- Línea 221-260: Método `aplicarPagosFacturas`

---

### ✅ 2. **Validación de 2+ Facturas Vencidas**
**Problema:** No había validación para obligar a usar el módulo de reconexión cuando un cliente tiene 2 o más facturas vencidas.

**Solución Implementada:**
- Agregada validación en el controlador de pagos
- Archivo modificado: `backend/controllers/pago.controller.js`
- Bloquea pagos normales si hay 2+ facturas vencidas
- Retorna error 403 con mensaje claro indicando que debe usar reconexión

**Código agregado (líneas 216-231):**
```javascript
const facturasVencidas = await Factura.countDocuments({
  clienteId: factura.clienteId._id,
  estado: { $in: ['pendiente', 'vencida'] },
  fechaVencimiento: { $lt: new Date() }
});

if (facturasVencidas >= 2) {
  return res.status(403).json({
    success: false,
    message: 'El cliente tiene 2 o más facturas vencidas. Debe procesar el pago a través del módulo de Reconexión.',
    requiereReconexion: true,
    facturasVencidas: facturasVencidas,
    clienteId: factura.clienteId._id
  });
}
```

---

### ✅ 3. **Especificación del Costo de Reconexión**
**Problema:** Al pagar facturas vencidas, no se especificaba el costo de reconexión (Q125.00) automáticamente.

**Solución Implementada:**
- Agregada lógica automática para detectar si requiere reconexión
- Archivo modificado: `backend/controllers/pago.controller.js`
- Se agrega Q125.00 automáticamente cuando:
  - Hay 1 factura vencida con más de 60 días
- Se actualiza el registro de pago con el detalle

**Código agregado (líneas 236-248):**
```javascript
let costoReconexion = 0;
let requiereReconexion = false;

if (facturasVencidas === 1 && mora.diasMora > 60) {
  costoReconexion = 125.00;
  requiereReconexion = true;

  // Actualizar la factura con el costo de reconexión
  factura.requiereReconexion = true;
  factura.costoReconexion = costoReconexion;
  await factura.save();
}
```

---

### ✅ 4. **Función de Eliminación de Facturas**
**Problema:** No existía función para eliminar facturas (ni pendientes ni pagadas).

**Solución Implementada:**
- Creadas 2 nuevas funciones administrativas:
  1. `eliminarFactura` - Elimina una factura individual
  2. `eliminarFacturasMultiples` - Elimina múltiples facturas a la vez

**Archivos modificados:**
- `backend/controllers/factura.admin.controller.js` (líneas 407-607)
- `backend/routes/factura.admin.routes.js` (líneas 149-175)

**Características:**
- ✅ Requiere contraseña administrativa
- ✅ Protección contra eliminación accidental de facturas pagadas
- ✅ Flag `forzarEliminacion` para casos especiales
- ✅ Elimina automáticamente pagos asociados si se fuerza
- ✅ Registro completo en logs para auditoría
- ✅ Validación de permisos (solo admin)

**Endpoints creados:**
```
DELETE /api/facturas/admin/:facturaId/eliminar
POST   /api/facturas/admin/eliminar-multiples
```

---

## 🔐 Configuración Requerida

### **Generar Contraseña Administrativa**

Para usar las funciones administrativas (modificar fechas, eliminar facturas), primero debes generar un hash de contraseña:

#### **Paso 1: Generar el Hash**
Desde el frontend en `factura.html`, usa el panel de administración:
1. Ve a la sección "⚙️ Panel de Administración"
2. Haz clic en "Generar Hash"
3. Ingresa una contraseña segura
4. Copia el hash generado

#### **Paso 2: Configurar en .env**
```bash
# En el archivo .env
ADMIN_FECHA_PASSWORD=<hash_generado_aqui>
```

#### **Paso 3: Reiniciar el Servidor**
```bash
npm start
```

---

## 🧪 Instrucciones para Pruebas

### **1. Probar Corrección de Transacciones MongoDB**

**Objetivo:** Verificar que el módulo de reconexión funciona sin errores de transacciones.

**Pasos:**
1. Crear 2 facturas vencidas para un cliente
2. Ir al módulo de Reconexión
3. Procesar reconexión (opción 80% o 100%)
4. **Resultado esperado:** ✅ Se procesa sin error de "Transaction numbers"

**Comando para verificar logs:**
```bash
# El servidor NO debe mostrar este error:
# "Transaction numbers are only allowed on a replica set member or mongos"
```

---

### **2. Probar Validación de 2+ Facturas Vencidas**

**Objetivo:** Verificar que no se puede pagar por módulo normal si hay 2+ facturas vencidas.

**Pasos:**
1. Crear 2 facturas vencidas para un cliente
2. Ir al módulo de **Pagos** (no reconexión)
3. Intentar pagar UNA de las facturas
4. **Resultado esperado:** ❌ Error 403 con mensaje:
   ```json
   {
     "success": false,
     "message": "El cliente tiene 2 o más facturas vencidas. Debe procesar el pago a través del módulo de Reconexión.",
     "requiereReconexion": true,
     "facturasVencidas": 2
   }
   ```

---

### **3. Probar Costo de Reconexión Automático**

**Objetivo:** Verificar que se agrega Q125.00 automáticamente cuando hay 1 factura vencida > 60 días.

**Pasos:**
1. Crear UNA factura vencida hace 61+ días
2. Ir al módulo de **Pagos**
3. Intentar pagar la factura
4. **Resultado esperado:** ✅ El total incluye automáticamente:
   - Monto original de la factura
   - Mora (7% por mes)
   - **+ Q125.00 de reconexión**

**Verificación en la respuesta:**
```json
{
  "montoPagado": "XXX.XX",
  "montoReconexion": 125.00,
  "observaciones": "Incluye costo de reconexión: Q125.00"
}
```

---

### **4. Probar Generación de Tickets en Reconexión** (NUEVO)

**Objetivo:** Verificar que se generan tickets PDF y registros de pago al procesar reconexión.

**Pasos:**
1. Crear 2 facturas vencidas para un cliente
2. Ir al módulo de **Reconexión**
3. Seleccionar el cliente y ver las opciones de reconexión
4. Procesar reconexión (opción 80% o 100%)
5. Observar los logs del servidor

**Resultado esperado en logs:**
```bash
✅ Reconexión procesada exitosamente:
   - Facturas pagadas: 2
   - Pagos generados: 2
   - Tickets generados: 2
✅ Ticket generado para pago PAG-202510-0001: PAGO-PAG-202510-0001-20251028.pdf
✅ Ticket generado para pago PAG-202510-0002: PAGO-PAG-202510-0002-20251028.pdf
```

**Verificaciones adicionales:**
1. **Verificar carpeta de tickets:**
   ```bash
   ls backend/uploads/tickets/2025/10/
   # Deben aparecer los archivos PDF generados
   ```

2. **Verificar en base de datos:**
   - Los registros de Pago deben existir
   - Las facturas deben tener estado 'pagada'
   - El registro de Reconexión debe estar creado

3. **Verificar en frontend:**
   - Ir al módulo de Pagos
   - Buscar pagos del cliente
   - Deben aparecer los pagos con:
     - Número de pago
     - Monto total (original + mora + reconexión proporcional)
     - Observaciones: "Pago procesado vía reconexión..."
   - Botón para descargar ticket PDF

**Si falla la generación del ticket:**
```bash
⚠️ No se pudo generar ticket para pago PAG-202510-0001: [razón]
# La reconexión se completa pero sin ticket
# Revisar permisos de carpeta backend/uploads/tickets/
```

---

### **5. Probar Eliminación de Facturas**

**Objetivo:** Verificar que se pueden eliminar facturas con autenticación.

#### **5.1 Eliminar factura pendiente:**
```bash
curl -X DELETE http://localhost:5000/api/facturas/admin/{facturaId}/eliminar \
  -H "Authorization: Bearer {tu_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "tu_contraseña_admin",
    "motivo": "Factura de prueba"
  }'
```

**Resultado esperado:** ✅ Factura eliminada

#### **5.2 Eliminar factura pagada (sin forzar):**
```bash
curl -X DELETE http://localhost:5000/api/facturas/admin/{facturaId}/eliminar \
  -H "Authorization: Bearer {tu_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "tu_contraseña_admin",
    "motivo": "Prueba"
  }'
```

**Resultado esperado:** ❌ Error 403:
```json
{
  "success": false,
  "message": "No se puede eliminar una factura pagada. Use forzarEliminacion:true...",
  "requiereConfirmacion": true
}
```

#### **5.3 Eliminar factura pagada (forzando):**
```bash
curl -X DELETE http://localhost:5000/api/facturas/admin/{facturaId}/eliminar \
  -H "Authorization: Bearer {tu_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "tu_contraseña_admin",
    "motivo": "Eliminar factura de prueba pagada",
    "forzarEliminacion": true
  }'
```

**Resultado esperado:** ✅ Factura y pagos asociados eliminados

---

## 📊 Prueba del Flujo Completo

### **Escenario 1: Cliente con 1 Factura Vencida (60+ días)**
1. ✅ Crear factura vencida hace 65 días
2. ✅ Ir a Pagos e intentar pagar
3. ✅ Verificar que el total incluye Q125.00 de reconexión
4. ✅ Procesar el pago
5. ✅ Verificar en logs que el pago se registró con reconexión

### **Escenario 2: Cliente con 2+ Facturas Vencidas**
1. ✅ Crear 2 facturas vencidas
2. ❌ Intentar pagar en módulo de Pagos → Debe rechazar
3. ✅ Ir al módulo de Reconexión
4. ✅ Procesar reconexión (80% o 100%)
5. ✅ Verificar que se procesan sin error de transacciones
6. ✅ **NUEVO:** Verificar que se generen tickets PDF automáticamente
7. ✅ **NUEVO:** Verificar en módulo de Pagos que aparecen los registros

**Verificación de Tickets:**
- Los tickets se guardan en: `backend/uploads/tickets/YYYY/MM/`
- Formato: `PAGO-PAG-YYYYMM-XXXX-YYYYMMDD.pdf`
- En consola debe aparecer: `✅ Ticket generado para pago PAG-XXXXXX-XXXX: PAGO-...pdf`

**Verificación de Pagos:**
- Ir al módulo de Pagos
- Filtrar por el cliente
- Debe aparecer un pago por cada factura pagada en la reconexión
- Cada pago debe incluir:
  - Monto original
  - Mora calculada
  - Costo de reconexión (proporcional)
  - Observaciones: "Pago procesado vía reconexión..."

### **Escenario 3: Limpieza de Facturas de Prueba**
1. ✅ Generar hash de contraseña admin
2. ✅ Configurar en .env
3. ✅ Reiniciar servidor
4. ✅ Eliminar facturas de prueba con contraseña
5. ✅ Verificar en logs que se registró la eliminación

---

## 🚨 Advertencias y Seguridad

### **Variables de Entorno Críticas**
```bash
# EN DESARROLLO
ENABLE_ADMIN_FUNCTIONS=true
NODE_ENV=development

# EN PRODUCCIÓN
ENABLE_ADMIN_FUNCTIONS=false  # ⚠️ IMPORTANTE: Deshabilitar en producción
NODE_ENV=production
```

### **Protecciones Implementadas**
- ✅ Contraseña administrativa requerida para eliminar
- ✅ Logs de auditoría para todas las operaciones admin
- ✅ Validación de permisos (solo rol admin)
- ✅ Confirmación doble para facturas pagadas
- ✅ Registro de quién eliminó y por qué

---

## 📝 Notas Adicionales

### **Actualización en Tiempo Real**
Para la actualización en tiempo real de datos en el frontend, considera implementar:
- **Opción 1:** Polling cada X segundos
- **Opción 2:** WebSockets para actualizaciones en tiempo real
- **Opción 3:** Server-Sent Events (SSE)

### **Frontend - factura.js vs factura.admin.js**
El HTML actualmente carga ambos archivos:
```html
<script src="../js/factura.js"></script>
<script src="../js/factura.admin.js"></script>
```

Esto permite tener:
- `factura.js`: Funciones normales de facturación
- `factura.admin.js`: Funciones administrativas y de prueba

---

## 🎯 Próximos Pasos Recomendados

1. **Generar hash de contraseña administrativa**
2. **Probar todos los escenarios descritos arriba**
3. **Verificar logs del servidor durante las pruebas**
4. **Implementar actualización automática en frontend** (polling o WebSockets)
5. **Considerar agregar UI para eliminación de facturas en el frontend**

---

### ✅ 5. **Generación de Tickets PDF en Reconexión** (NUEVA)
**Problema:** Al procesar pagos a través del módulo de reconexión, no se generaban tickets de pago ni registros de Pago, solo se actualizaban las facturas.

**Solución Implementada:**
- Modificado el servicio de reconexión para crear registros de Pago
- Agregada generación automática de tickets PDF para cada factura pagada
- Distribución proporcional del costo de reconexión entre facturas

**Archivos modificados:**
- `backend/services/reconexion.service.js` (líneas 6-12, 153-243, 248-323)
- `backend/controllers/reconexion.controller.js` (líneas 57-76)

**Características agregadas:**
- ✅ Crea un registro de Pago por cada factura pagada en reconexión
- ✅ Genera ticket PDF automáticamente para cada pago
- ✅ Distribuye el costo de reconexión (Q125) proporcionalmente
- ✅ Logs detallados de pagos y tickets generados
- ✅ Manejo de errores: si falla la generación del ticket, no falla la reconexión

**Respuesta mejorada:**
```json
{
  "success": true,
  "message": "Reconexión procesada exitosamente",
  "data": {
    "exitoso": true,
    "reconexionId": "...",
    "facturasPagadas": 2,
    "pagosGenerados": 2,
    "ticketsGenerados": 2,
    "tickets": [
      {
        "pagoId": "...",
        "numeroPago": "PAG-202510-0001",
        "nombreArchivo": "PAGO-PAG-202510-0001-20251028.pdf",
        "rutaArchivo": "backend/uploads/tickets/2025/10/..."
      }
    ],
    "mensaje": "Se procesó la reconexión. 2 pago(s) registrado(s) y 2 ticket(s) generado(s)."
  }
}
```

---

## 🐛 Bugs Conocidos Restantes

- [ ] Los datos no se actualizan en tiempo real en el frontend (requiere F5)
- [ ] No hay UI en el frontend para la función de eliminación (solo API)

---

## 📞 Soporte

Si encuentras algún problema adicional:
1. Revisa los logs del servidor (`npm start`)
2. Verifica que las variables de entorno estén configuradas
3. Confirma que el hash de contraseña esté generado y en .env
4. Revisa que MongoDB esté corriendo

---

**¡Listo para probar! 🚀**
