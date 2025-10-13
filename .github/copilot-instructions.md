# 💧 Guía para Asistentes de IA - Sistema de Agua LOTI

## 🎯 Descripción del Proyecto

Sistema de gestión integral para el servicio de agua potable en Huehuetenango, Guatemala. Stack: **Node.js + Express + MongoDB + JavaScript Vanilla**.

## 🏗️ Arquitectura Clave

### Backend (Node.js + Express + MongoDB)
- **Patrón MVC**: `models/` → `controllers/` → `routes/`
- **Autenticación**: JWT con middleware `auth.middleware.js` en TODAS las rutas protegidas
- **Base de datos**: MongoDB con Mongoose ODM, sin schema database.js (conexión directa en server.js)
- **Servidor único**: `backend/server.js` sirve API REST (`/api/*`) y archivos estáticos del frontend

### Frontend (JavaScript Vanilla)
- **Sin frameworks**: HTML5 + CSS3 + JavaScript ES6+ puro
- **Utilidades compartidas**: `auth.js` y `main.js` contienen `AuthUtils` y `PageUtils` usados en TODOS los módulos
- **Patrón de página**: Cada módulo tiene su HTML, CSS y JS dedicado (ej: `factura.html`, `factura.css`, `factura.js`)
- **Comunicación API**: Todas las peticiones DEBEN usar `AuthUtils.authenticatedFetch()` para incluir el token JWT

## 💰 Reglas de Negocio CRÍTICAS

### Sistema de Facturación (NO MODIFICAR sin consultar)
```javascript
// Constantes definidas en frontend/js/factura.js y backend/models/factura.model.js
TARIFA_BASE = 50.00          // Q50.00 por 30,000 litros
LIMITE_BASE = 30000          // 30,000 litros incluidos
PRECIO_POR_LITRO = 0.00167   // Para excedentes
RECARGO_EXCEDENTE = 0.075    // 7.5% adicional en excedentes
MORA_MENSUAL = 0.07          // 7% mensual sobre monto original
COSTO_RECONEXION = 125.00    // Q125.00 fijo
```

### Fórmulas de Cálculo (Ver `factura.model.js` método `calcularMontos()`)
1. **Consumo básico (≤30,000L)**: Q50.00 fijo
2. **Consumo excedente**: `(excedente * PRECIO_POR_LITRO) * (1 + RECARGO_EXCEDENTE)`
3. **Redondeo especial**: Siempre a múltiplo de Q0.50 usando `Math.round(monto * 2) / 2`
4. **Mora**: Se calcula por mes completo, no días proporcionales (ver `mora.service.js`)

## 🔐 Autenticación y Seguridad

### Flujo de Autenticación
1. **Login**: `POST /api/auth/login` → Retorna `{ token, user }`
2. **Almacenamiento**: Token guardado en `localStorage` como `authToken`
3. **Headers**: Todas las peticiones API llevan `Authorization: Bearer ${token}`
4. **Protección páginas**: `pageProtection.js` verifica token en `DOMContentLoaded`

### Middleware Backend
```javascript
// Todas las rutas protegidas usan:
const authMiddleware = require('./middlewares/auth.middleware');
router.use(authMiddleware); // Antes de las rutas
```

## 📁 Estructura de Datos

### Modelo Cliente (`cliente.model.js`)
```javascript
{
  nombres, apellidos, dpi,      // Identificación (DPI validado formato guatemalteco)
  contador, lote, proyecto,     // Ubicación física
  whatsapp,                      // Notificaciones
  estado: 'activo'|'inactivo',  // Eliminación suave
  creadoPor: ObjectId(User)     // Auditoría
}
```

### Modelo Factura (`factura.model.js`)
```javascript
{
  numeroFactura,                 // Generado automáticamente (formato: YYYY-MM-XXXX)
  clienteId: ObjectId(Cliente),
  lecturaAnterior, lecturaActual, consumoLitros,
  tarifaBase, excedenteLitros, costoExcedente,
  subtotal, montoTotal,          // montoTotal incluye redondeo
  estado: 'pendiente'|'pagada'|'vencida'|'anulada',
  fechaEmision, fechaVencimiento,
  metodoPago: {                  // Solo si pagada
    tipo: 'efectivo'|'transferencia'|'deposito',
    referencia, fecha
  }
}
```

## 🔧 Comandos de Desarrollo

```bash
# Iniciar servidor (puerto 5000)
npm start

# Crear usuario administrador (primera vez)
npm run crear-admin

# Inicializar sistema de facturación (setup contadores)
npm run init-facturacion

# Datos de prueba
npm run init-facturacion-test
```

### Acceso a la Aplicación
- **Frontend**: `http://localhost:5000/pages/login.html` (servido por Express)
- **API REST**: `http://localhost:5000/api/*`

## 🎨 Convenciones de Código

### Backend
- **Respuestas API**: Siempre formato `{ success: boolean, data/message: any, error?: string }`
- **Manejo errores**: Try-catch en todos los controllers, log con console.error + emoji ❌
- **Validaciones**: Mongoose schema + validaciones adicionales en controllers
- **Populate**: Siempre popular `clienteId` y `creadoPor` en queries de facturas/lecturas

### Frontend
- **Mensajes usuario**: Usar `PageUtils.showSuccess(msg)` o `PageUtils.showError(msg)` (nunca alert)
- **Fetch API**: SIEMPRE usar `AuthUtils.authenticatedFetch(url, options)`
- **Formateo moneda**: Usar `.toFixed(2)` para mostrar valores
- **Fechas**: Formato ISO 8601 para enviar al backend, convertir a local para mostrar

### Estilos CSS
- **Variables CSS**: Definidas en `styles.css` (`:root { --color-primary, --color-success, etc }`)
- **Responsive**: Mobile-first con breakpoints `768px` (tablet) y `1024px` (desktop)
- **Clases utilitarias**: `.hidden { display: none }`, `.message.success`, `.message.error`

## ⚠️ Puntos de Atención

### Al Modificar Facturas
- ✅ NUNCA cambiar fórmulas de cálculo sin actualizar AMBOS frontend (`factura.js`) y backend (`factura.model.js`)
- ✅ Validar que redondeo a Q0.50 se mantenga consistente
- ✅ Facturas pagadas NO pueden editarse (validar `estado !== 'pagada'`)

### Al Modificar Clientes
- ✅ Validar DPI guatemalteco: 13 dígitos exactos
- ✅ NO eliminar físicamente, solo marcar `estado: 'inactivo'` y `fechaEliminacion`
- ✅ Cliente inactivo NO puede tener nuevas facturas

### Al Agregar Rutas API
- ✅ SIEMPRE aplicar `authMiddleware` a rutas protegidas
- ✅ Agregar logging de requests (ver pattern en `server.js`)
- ✅ Registrar ruta en `server.js` bajo el prefijo `/api`

### Al Agregar Páginas Frontend
- ✅ Incluir `<script src="../js/main.js">` y `<script src="../js/auth.js">` ANTES del script específico
- ✅ Agregar protección de página: `checkAuth()` al inicio del JavaScript
- ✅ Importar estilos base: `<link rel="stylesheet" href="../css/styles.css">`

## 🔍 Debugging

### Ver logs del servidor
- Console logs tienen emojis: ✅ (éxito), ❌ (error), 🚀 (inicio), 📊 (datos)
- Requests logueados automáticamente en modo desarrollo

### Testing autenticación
- Página de pruebas: `frontend/pages/auth-test.html`
- Inspeccionar token: `localStorage.getItem('authToken')`

## 📊 Scripts de Utilidad

### `backend/scripts/`
- **`createAdmin.js`**: Setup inicial, crear primer usuario admin
- **`initFacturacion.js`**: Inicializar contadores de facturación (necesario antes de facturar)
- **`seedDatabase.js`**: Datos de prueba para desarrollo

## 🌐 Proyectos Soportados

Sistema multi-proyecto para diferentes comunidades:
- San Miguel
- Santa Clara Fase 1 y 2
- Cabañas Fase 1 y 2

Cada cliente pertenece a UN proyecto (campo `proyecto` en modelo Cliente).

## 🚀 Flujo de Trabajo Típico

### Crear nueva funcionalidad:
1. Definir modelo en `backend/models/` (si aplica)
2. Crear controller en `backend/controllers/`
3. Definir rutas en `backend/routes/` con authMiddleware
4. Registrar rutas en `server.js`
5. Crear HTML en `frontend/pages/`
6. Crear CSS específico en `frontend/css/`
7. Crear JavaScript en `frontend/js/` usando `AuthUtils` y `PageUtils`

---

**Última actualización**: Octubre 2025 | **Estado**: ✅ Sistema operativo en producción
