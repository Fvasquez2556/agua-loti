# Guía de Implementación - Gestión de Fechas de Facturas

## 📋 Resumen

Esta guía te ayudará a implementar funciones administrativas para:
1. **Crear facturas con fechas personalizadas** (para pruebas)
2. **Modificar fechas de vencimiento** con autorización
3. **Generar lotes de facturas de prueba** con diferentes estados de mora

---

## 🚀 Pasos de Instalación

### 1. Copiar los archivos al proyecto

Copia los siguientes archivos a tu proyecto:

```bash
# Controlador administrativo
cp factura_admin_controller.js backend/controllers/factura.admin.controller.js

# Rutas administrativas
cp factura_admin_routes.js backend/routes/factura.admin.routes.js
```

### 2. Instalar dependencias

Asegúrate de tener `bcryptjs` instalado:

```bash
npm install bcryptjs
```

### 3. Configurar variables de entorno

Agrega esta variable a tu archivo `.env`:

```env
# Contraseña hasheada para modificar fechas de facturas
ADMIN_FECHA_PASSWORD=$2a$10$TuHashAqui
```

**Para generar tu hash:**
1. Inicia el servidor en modo desarrollo
2. Usa el endpoint `/api/facturas/admin/generar-hash` (ver ejemplos abajo)
3. Copia el hash generado a tu `.env`

### 4. Registrar las rutas en el servidor

Abre `backend/server.js` (o `app.js`) y agrega:

```javascript
// Importar las rutas administrativas
const facturaAdminRoutes = require('./routes/factura.admin.routes');

// ... otras importaciones ...

// Registrar las rutas (DESPUÉS de las rutas normales de facturas)
app.use('/api/facturas/admin', facturaAdminRoutes);
```

**Ejemplo completo:**

```javascript
// backend/server.js
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
require('dotenv').config();

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const clienteRoutes = require('./routes/cliente.routes');
const facturaRoutes = require('./routes/factura.routes');
const facturaAdminRoutes = require('./routes/factura.admin.routes'); // ← NUEVA

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Conectar a la base de datos
connectDB();

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/facturas', facturaRoutes);
app.use('/api/facturas/admin', facturaAdminRoutes); // ← NUEVA

// ... resto del código ...
```

---

## 🔐 Generar Contraseña Administrativa

### Paso 1: Generar el hash

**Petición:**
```http
POST /api/facturas/admin/generar-hash
Authorization: Bearer TU_TOKEN_AQUI
Content-Type: application/json

{
  "password": "MiContraseñaSegura123!"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Hash generado. Guárdalo en la variable de entorno ADMIN_FECHA_PASSWORD",
  "hash": "$2a$10$abcdef123456...",
  "nota": "Nunca compartas este hash públicamente"
}
```

### Paso 2: Configurar el hash

Copia el hash generado a tu `.env`:

```env
ADMIN_FECHA_PASSWORD=$2a$10$abcdef123456...
```

### Paso 3: Reiniciar el servidor

```bash
# Detén el servidor y vuelve a iniciarlo
npm run dev
```

---

## 📝 Ejemplos de Uso

### 1. Crear Factura con Fecha Personalizada

**Use Case:** Necesitas crear una factura que vence mañana para probar el sistema de pagos.

**Petición:**
```http
POST /api/facturas/admin/crear-con-fecha
Authorization: Bearer TU_TOKEN_AQUI
Content-Type: application/json

{
  "clienteId": "507f1f77bcf86cd799439011",
  "lecturaAnterior": 1000,
  "lecturaActual": 4500,
  "fechaLectura": "2025-10-01",
  "periodoInicio": "2025-09-01",
  "periodoFin": "2025-09-30",
  "fechaEmision": "2025-10-01",
  "fechaVencimiento": "2025-10-28",
  "observaciones": "Factura de prueba",
  "modoPrueba": true
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Factura de prueba creada exitosamente con fecha personalizada",
  "data": {
    "numeroFactura": "FAC-202510-0015",
    "fechaEmision": "2025-10-01T00:00:00.000Z",
    "fechaVencimiento": "2025-10-28T00:00:00.000Z",
    "montoTotal": 800,
    "estado": "pendiente",
    "diasMora": 0,
    "montoMora": 0
  },
  "advertencia": "Esta es una factura de prueba con fecha personalizada"
}
```

### 2. Crear Factura Vencida (para pruebas de mora)

**Use Case:** Necesitas una factura vencida hace 30 días para probar el cálculo de mora.

**Petición:**
```http
POST /api/facturas/admin/crear-con-fecha
Authorization: Bearer TU_TOKEN_AQUI
Content-Type: application/json

{
  "clienteId": "507f1f77bcf86cd799439011",
  "lecturaAnterior": 1000,
  "lecturaActual": 5000,
  "fechaLectura": "2025-08-15",
  "periodoInicio": "2025-08-01",
  "periodoFin": "2025-08-31",
  "fechaEmision": "2025-08-15",
  "fechaVencimiento": "2025-09-27",
  "observaciones": "Factura vencida para pruebas",
  "modoPrueba": true
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Factura de prueba creada exitosamente con fecha personalizada",
  "data": {
    "numeroFactura": "FAC-202510-0016",
    "fechaEmision": "2025-08-15T00:00:00.000Z",
    "fechaVencimiento": "2025-09-27T00:00:00.000Z",
    "montoTotal": 1050,
    "estado": "pendiente",
    "diasMora": 30,
    "montoMora": 73.50,
    "montoTotalConMora": 1123.50
  }
}
```

### 3. Modificar Fecha de Vencimiento de Factura Existente

**Use Case:** Una factura se emitió con la fecha incorrecta y necesitas corregirla.

**Petición:**
```http
PUT /api/facturas/admin/507f1f77bcf86cd799439011/modificar-fecha
Authorization: Bearer TU_TOKEN_AQUI
Content-Type: application/json

{
  "nuevaFechaVencimiento": "2025-11-30",
  "password": "MiContraseñaSegura123!",
  "motivo": "Corrección de fecha por error en emisión"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Fecha de vencimiento modificada exitosamente",
  "data": {
    "numeroFactura": "FAC-202510-0010",
    "fechaAnterior": "2025-11-27T00:00:00.000Z",
    "fechaNueva": "2025-11-30T00:00:00.000Z",
    "diasMora": 0,
    "montoMora": 0,
    "modificadoPor": "Admin",
    "motivo": "Corrección de fecha por error en emisión"
  }
}
```

### 4. Crear Lote de Facturas de Prueba

**Use Case:** Necesitas poblar la base de datos con facturas en diferentes estados para pruebas.

**Petición:**
```http
POST /api/facturas/admin/crear-lote-prueba
Authorization: Bearer TU_TOKEN_AQUI
Content-Type: application/json

{
  "clienteId": "507f1f77bcf86cd799439011",
  "cantidadFacturas": 5
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "5 facturas de prueba creadas exitosamente",
  "data": [
    {
      "numeroFactura": "FAC-202510-0017",
      "fechaVencimiento": "2025-10-27T00:00:00.000Z",
      "diasMora": 0,
      "montoMora": 0,
      "estado": "pendiente"
    },
    {
      "numeroFactura": "FAC-202510-0018",
      "fechaVencimiento": "2025-10-17T00:00:00.000Z",
      "diasMora": 10,
      "montoMora": 0,
      "estado": "pendiente"
    },
    {
      "numeroFactura": "FAC-202510-0019",
      "fechaVencimiento": "2025-09-27T00:00:00.000Z",
      "diasMora": 30,
      "montoMora": 56.00,
      "estado": "pendiente"
    }
    // ... más facturas
  ]
}
```

---

## 🧪 Casos de Uso Comunes

### Caso 1: Prueba de Reconexión

```javascript
// 1. Crear factura vencida hace 60 días
POST /api/facturas/admin/crear-con-fecha
{
  "clienteId": "...",
  "lecturaAnterior": 1000,
  "lecturaActual": 4000,
  "fechaLectura": "2025-08-01",
  "periodoInicio": "2025-07-01",
  "periodoFin": "2025-07-31",
  "fechaEmision": "2025-08-01",
  "fechaVencimiento": "2025-08-27",
  "modoPrueba": true
}

// 2. La factura ahora tiene 60 días de mora
// 3. Probar flujo de pago con reconexión
```

### Caso 2: Extender Plazo de Pago

```javascript
// Cliente solicita extensión de 15 días
PUT /api/facturas/admin/{facturaId}/modificar-fecha
{
  "nuevaFechaVencimiento": "2025-11-12", // +15 días
  "password": "tu_contraseña",
  "motivo": "Extensión solicitada por el cliente debido a emergencia familiar"
}
```

### Caso 3: Poblar Base de Datos para Demostración

```javascript
// Crear 10 facturas en diferentes estados
POST /api/facturas/admin/crear-lote-prueba
{
  "clienteId": "...",
  "cantidadFacturas": 10
}

// Resultado: facturas al día, vencidas hace 10, 30, 60 y 90 días
```

---

## ⚠️ Consideraciones de Seguridad

### 1. Protección de Endpoints

- ✅ Todos los endpoints requieren autenticación
- ✅ Solo usuarios con rol `admin` o `encargado` pueden acceder
- ✅ Modificación de fechas requiere contraseña adicional

### 2. Auditoría

- ✅ Todas las modificaciones se registran en el campo `observaciones`
- ✅ Se guarda quién hizo la modificación y cuándo
- ✅ Se registra el motivo de la modificación

### 3. Restricciones

- ❌ No se pueden modificar facturas pagadas o anuladas
- ❌ La fecha de vencimiento debe ser posterior a la fecha de emisión
- ❌ Solo funciona en modo de prueba (flag de seguridad)

### 4. Producción

```javascript
// En producción, considera:
// 1. Deshabilitar el endpoint de generación de hash
// 2. Usar variables de entorno seguras
// 3. Implementar logs de auditoría adicionales
// 4. Limitar intentos de contraseña incorrecta
```

---

## 🐛 Solución de Problemas

### Error: "Contraseña administrativa incorrecta"

**Causa:** El hash en `.env` no coincide con la contraseña

**Solución:**
1. Verifica que copiaste el hash completo
2. Reinicia el servidor después de modificar `.env`
3. Genera un nuevo hash si es necesario

### Error: "Esta función solo está disponible en modo de prueba"

**Causa:** El flag `modoPrueba` no está en `true`

**Solución:**
```json
{
  "modoPrueba": true,  // ← Asegúrate de incluir esto
  // ... otros campos
}
```

### Error: "Ya existe una factura con ese número"

**Causa:** Conflicto en numeración secuencial

**Solución:**
- El sistema reintentará automáticamente con un nuevo número
- Si persiste, verifica el modelo `Contador` en la base de datos

---

## 📚 Documentación Adicional

### Campos del Modelo Factura

```javascript
{
  numeroFactura: String,        // Generado automáticamente
  clienteId: ObjectId,          // Referencia al cliente
  fechaEmision: Date,           // Fecha de creación de la factura
  fechaVencimiento: Date,       // Fecha límite de pago
  periodoInicio: Date,          // Inicio del período facturado
  periodoFin: Date,             // Fin del período facturado
  lecturaAnterior: Number,      // Lectura del mes anterior
  lecturaActual: Number,        // Lectura del mes actual
  consumoLitros: Number,        // Calculado automáticamente
  montoTotal: Number,           // Total a pagar
  estado: String,               // pendiente | pagada | anulada
  observaciones: String         // Notas y auditoría
}
```

### Cálculo de Mora

```javascript
// 7% mensual sobre el monto total
diasMora = diasDesdeVencimiento
mesesMora = Math.floor(diasMora / 30)
montoMora = montoTotal * (0.07 * mesesMora)
```

---

## 📞 Soporte

Si tienes problemas con la implementación:

1. Verifica los logs del servidor para errores específicos
2. Asegúrate de que todas las dependencias estén instaladas
3. Confirma que las rutas estén registradas correctamente
4. Revisa que el token de autenticación sea válido

---

## ✅ Checklist de Implementación

- [ ] Archivos copiados al proyecto
- [ ] `bcryptjs` instalado
- [ ] Hash de contraseña generado
- [ ] `.env` configurado con el hash
- [ ] Rutas registradas en el servidor
- [ ] Servidor reiniciado
- [ ] Probado endpoint de crear factura con fecha personalizada
- [ ] Probado endpoint de modificar fecha de vencimiento
- [ ] Probado endpoint de crear lote de prueba

---

**¡Listo!** Ahora puedes crear facturas con fechas personalizadas y modificar fechas de vencimiento según sea necesario para tus pruebas. 🎉
