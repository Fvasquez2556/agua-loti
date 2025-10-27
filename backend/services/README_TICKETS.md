# Sistema de Generación de Tickets PDF - Sistema de Agua LOTI

## Descripción General

Este servicio genera tickets de pago en formato PDF de estilo térmico (80mm de ancho) para el Sistema de Agua LOTI en Huehuetenango, Guatemala. Los tickets se generan automáticamente cuando se registra un pago y también pueden regenerarse manualmente a través de la API.

## Características

- **Formato térmico**: Tickets de 80mm de ancho, similares a recibos de POS
- **Código QR de verificación**: Cada ticket incluye un código QR con hash SHA256 para validación
- **Generación automática**: Los tickets se generan automáticamente al crear un pago
- **Regeneración manual**: Los tickets pueden regenerarse a través de un endpoint API
- **Almacenamiento organizado**: Los PDFs se guardan organizados por año y mes
- **Información completa**: Incluye datos del cliente, factura, desglose de pago y método de pago

## Estructura de Archivos

### Servicio Principal
```
backend/services/ticketPago.service.js
```

### Almacenamiento de Tickets
```
backend/uploads/tickets/[AÑO]/[MES]/PAGO-[NUMERO_PAGO]-[FECHA].pdf

Ejemplo:
backend/uploads/tickets/2025/10/PAGO-PAG-202510-0001-20251024.pdf
```

## Formato del Ticket

El ticket PDF contiene las siguientes secciones:

### 1. Header
- Nombre del sistema: "SISTEMA DE AGUA LOTI"
- Ubicación: "Huehuetenango, Guatemala"
- Espacio para logo (60mm x 30mm)

### 2. Información del Ticket
- Etiqueta "RECIBO DE PAGO"
- Número de Pago
- Fecha de Emisión

### 3. Datos del Cliente
- Nombre completo
- DPI
- Número de contador
- Número de lote
- Proyecto

### 4. Datos de la Factura
- Número de factura
- Fecha de emisión
- Fecha de vencimiento
- Período de facturación

### 5. Desglose del Pago
- Subtotal de la factura
- Mora (si aplica)
- Reconexión (si aplica)
- **Total Pagado** (destacado)

### 6. Método de Pago
- Método utilizado (efectivo, transferencia, depósito, cheque)
- Referencia de pago (si existe)
- Datos del cheque (si aplica):
  - Banco
  - Número de cheque

### 7. Código QR de Verificación
- Código QR de 30mm x 30mm
- Contiene: número de pago, fecha, monto y hash de verificación

### 8. Footer
- Mensaje de agradecimiento
- Fecha y hora de impresión
- Versión del sistema

## Uso del Servicio

### Generación Automática

Los tickets se generan automáticamente al crear un pago a través del endpoint:

```http
POST /api/pagos
```

El servicio intenta generar el ticket después de confirmar la transacción. Si falla, el pago se registra de todas formas (el ticket no bloquea el pago).

### Regeneración Manual

Para regenerar un ticket existente:

```http
GET /api/pagos/:id/ticket
```

**Parámetros:**
- `id`: ID del pago (MongoDB ObjectId)

**Autenticación:**
- Requiere token JWT válido

**Respuesta:**
- Descarga directa del archivo PDF
- Nombre del archivo: `PAGO-[NUMERO_PAGO]-[FECHA].pdf`

### Ejemplo de Uso con cURL

```bash
# Regenerar ticket de un pago
curl -X GET \
  'http://localhost:3000/api/pagos/67123abc456def789/ticket' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  --output ticket.pdf
```

### Ejemplo de Uso con JavaScript/Fetch

```javascript
// Regenerar y descargar ticket
async function descargarTicket(pagoId) {
  const token = localStorage.getItem('token');

  const response = await fetch(`/api/pagos/${pagoId}/ticket`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.ok) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-${pagoId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } else {
    console.error('Error al descargar ticket');
  }
}
```

## Código QR de Verificación

### Contenido del QR

El código QR contiene un objeto JSON con la siguiente estructura:

```json
{
  "numeroPago": "PAG-202510-0001",
  "fecha": "2025-10-24T14:30:00.000Z",
  "monto": 150.50,
  "hash": "a1b2c3d4e5f6..."
}
```

### Verificación del Hash

El hash se genera usando SHA256 con el siguiente formato:

```
SHA256(numeroPago|fecha|monto|secreto)
```

**Ejemplo en JavaScript:**
```javascript
const crypto = require('crypto');

function verificarHash(numeroPago, fecha, monto, hashRecibido) {
  const secreto = process.env.TICKET_SECRET || 'agua-loti-2025-ticket-secret';
  const cadena = `${numeroPago}|${fecha}|${monto}|${secreto}`;
  const hashCalculado = crypto.createHash('sha256').update(cadena).digest('hex');

  return hashCalculado === hashRecibido;
}
```

## Configuración

### Variables de Entorno

Puede configurar las siguientes variables en el archivo `.env`:

```env
# Secreto para generación de hash en tickets (opcional)
TICKET_SECRET=su-secreto-personalizado-aqui
```

Si no se especifica, se usa el secreto por defecto: `agua-loti-2025-ticket-secret`

### Dimensiones del Ticket

Las dimensiones están configuradas en `ticketPago.service.js`:

```javascript
this.anchoTicket = 226.77;  // 80mm en puntos
this.margen = 14.17;        // 5mm en puntos
```

### Fuentes y Tamaños

```javascript
this.fuentePrincipal = 'Courier';
this.tamanoFuenteNormal = 9;
this.tamanoFuentePequeno = 7;
this.tamanoFuenteGrande = 11;
this.tamanoFuenteTitulo = 13;
```

## Gestión de Archivos

### Creación Automática de Directorios

El servicio crea automáticamente la estructura de directorios necesaria:

```
backend/uploads/tickets/
├── 2025/
│   ├── 01/
│   ├── 02/
│   └── 10/
│       ├── PAGO-PAG-202510-0001-20251024.pdf
│       └── PAGO-PAG-202510-0002-20251024.pdf
```

### Limpieza de Archivos Antiguos

**Nota:** Actualmente no hay limpieza automática de archivos antiguos. Se recomienda implementar un job programado para eliminar tickets más antiguos de cierta fecha si es necesario.

**Ejemplo de script de limpieza (a implementar):**
```javascript
// Eliminar tickets de más de 2 años
const fechaLimite = new Date();
fechaLimite.setFullYear(fechaLimite.getFullYear() - 2);
```

## Manejo de Errores

### Errores Comunes

1. **Pago no encontrado**
   ```json
   {
     "exitoso": false,
     "mensaje": "Pago no encontrado"
   }
   ```

2. **Pago sin cliente o factura**
   ```json
   {
     "exitoso": false,
     "mensaje": "El pago no tiene cliente o factura asociada"
   }
   ```

3. **Error al generar PDF**
   ```json
   {
     "exitoso": false,
     "mensaje": "Error al generar ticket: [detalle del error]"
   }
   ```

### Logging

El servicio registra logs en la consola:

- ✅ **Éxito**: `Ticket generado: PAGO-PAG-202510-0001-20251024.pdf`
- ⚠️ **Advertencia**: `No se pudo generar el ticket: [mensaje]`
- ❌ **Error**: `Error al generar ticket automáticamente: [error]`

## Dependencias

El servicio requiere los siguientes paquetes npm:

```json
{
  "pdfkit": "^0.17.2",
  "qrcode": "^1.5.4"
}
```

### Instalación

```bash
npm install pdfkit qrcode --save
```

## Métodos Principales

### `generarTicketPago(pagoId)`

Genera un ticket PDF para un pago específico.

**Parámetros:**
- `pagoId` (string): ID del pago en MongoDB

**Retorna:**
```javascript
{
  exitoso: boolean,
  mensaje: string,
  rutaArchivo: string | null,
  nombreArchivo: string | null
}
```

### `generarCodigoQR(datosQR)`

Genera un código QR con los datos del pago.

**Parámetros:**
- `datosQR` (object): Objeto con numeroPago, fecha, monto y hash

**Retorna:**
- `Promise<Buffer>`: Buffer del código QR en formato PNG

### `crearHashVerificacion(datosPago)`

Crea un hash SHA256 para verificación del ticket.

**Parámetros:**
- `datosPago` (object): Objeto con numeroPago, fecha y monto

**Retorna:**
- `string`: Hash en hexadecimal

### `asegurarDirectorioTickets(anio, mes)`

Crea el directorio para almacenar tickets si no existe.

**Parámetros:**
- `anio` (number): Año
- `mes` (number): Mes (01-12)

**Retorna:**
- `string`: Ruta completa del directorio

## Seguridad

### Consideraciones de Seguridad Implementadas

1. **Autenticación JWT**: Todos los endpoints requieren autenticación
2. **Hash de verificación**: Cada ticket tiene un hash único
3. **Validación de rutas**: Se previene path traversal
4. **No expone información sensible**: Los errores no revelan detalles internos

### Mejoras de Seguridad Recomendadas

1. **Autorización por roles**: Verificar que el usuario tiene permisos para ver ese pago
2. **Rate limiting**: Limitar generación de PDFs por usuario/IP
3. **Rotación de secretos**: Cambiar el `TICKET_SECRET` periódicamente
4. **Encriptación**: Considerar encriptar PDFs sensibles

## Testing

### Prueba Manual

1. Crear un pago a través de la API
2. Verificar que el ticket se generó en `backend/uploads/tickets/[año]/[mes]/`
3. Abrir el PDF y verificar que contiene todos los datos
4. Escanear el código QR y verificar el JSON
5. Intentar regenerar el ticket con `GET /api/pagos/:id/ticket`

### Prueba del Hash

```javascript
const ticketService = require('./backend/services/ticketPago.service');

const datosPrueba = {
  numeroPago: 'PAG-202510-0001',
  fecha: new Date('2025-10-24'),
  monto: 150.50
};

const hash = ticketService.crearHashVerificacion(datosPrueba);
console.log('Hash generado:', hash);
```

## Próximas Mejoras

- [ ] Agregar logo del sistema en el header
- [ ] Implementar limpieza automática de archivos antiguos
- [ ] Agregar opción de envío por WhatsApp
- [ ] Agregar opción de envío por correo electrónico
- [ ] Implementar caché de tickets generados
- [ ] Agregar watermark para tickets de prueba
- [ ] Soporte para diferentes tamaños de papel

## Soporte

Para problemas o preguntas:

1. Verificar que todas las dependencias estén instaladas
2. Revisar permisos de escritura en `backend/uploads/`
3. Verificar conexión a MongoDB
4. Revisar logs de la consola del servidor
5. Asegurar que el pago existe y tiene cliente y factura asociados

## Changelog

### v1.0.0 (2025-10-24)
- ✅ Implementación inicial del servicio de tickets
- ✅ Generación automática al crear pagos
- ✅ Endpoint de regeneración manual
- ✅ Código QR de verificación
- ✅ Almacenamiento organizado por año/mes
- ✅ Documentación completa

---

**Sistema de Agua LOTI v2.0**
Huehuetenango, Guatemala
© 2025
