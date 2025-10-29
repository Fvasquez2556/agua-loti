# 🚀 Inicio Rápido - Facturas con Fechas Personalizadas

## ¿Qué incluye esta solución?

✅ **Crear facturas con fechas personalizadas** para pruebas
✅ **Modificar fechas de vencimiento** con autorización por contraseña
✅ **Generar lotes de facturas de prueba** con diferentes estados de mora
✅ **Auditoría completa** de todas las modificaciones

---

## 📦 Archivos Incluidos

1. **factura_admin_controller.js** - Controlador con todas las funciones administrativas
2. **factura_admin_routes.js** - Rutas de la API
3. **GUIA_IMPLEMENTACION.md** - Guía completa de implementación
4. **ejemplos_uso_facturas_admin.js** - Scripts de ejemplo listos para usar

---

## ⚡ Instalación en 5 Pasos

### 1️⃣ Copia los archivos

```bash
# Backend
cp factura_admin_controller.js backend/controllers/factura.admin.controller.js
cp factura_admin_routes.js backend/routes/factura.admin.routes.js
```

### 2️⃣ Instala dependencia

```bash
npm install bcryptjs
```

### 3️⃣ Registra las rutas

Edita `backend/server.js`:

```javascript
const facturaAdminRoutes = require('./routes/factura.admin.routes');
app.use('/api/facturas/admin', facturaAdminRoutes);
```

### 4️⃣ Genera tu contraseña

Usa Postman o tu cliente HTTP favorito:

```http
POST http://localhost:5000/api/facturas/admin/generar-hash
Authorization: Bearer TU_TOKEN
Content-Type: application/json

{
  "password": "TuContraseñaSegura123!"
}
```

Copia el hash que te devuelva.

### 5️⃣ Configura el .env

Agrega a tu archivo `.env`:

```env
ADMIN_FECHA_PASSWORD=$2a$10$...tu_hash_aqui...
```

**¡Listo!** Reinicia el servidor y ya puedes usar las funciones.

---

## 🎯 Casos de Uso Rápidos

### Crear factura vencida (para pruebas de mora)

```javascript
POST /api/facturas/admin/crear-con-fecha

{
  "clienteId": "TU_CLIENTE_ID",
  "lecturaAnterior": 1000,
  "lecturaActual": 5000,
  "fechaLectura": "2025-08-01",
  "periodoInicio": "2025-07-01",
  "periodoFin": "2025-07-31",
  "fechaEmision": "2025-08-01",
  "fechaVencimiento": "2025-09-27",  // ← 30 días de mora
  "modoPrueba": true
}
```

### Modificar fecha de vencimiento

```javascript
PUT /api/facturas/admin/{facturaId}/modificar-fecha

{
  "nuevaFechaVencimiento": "2025-11-30",
  "password": "TuContraseñaSegura123!",
  "motivo": "Extensión por solicitud del cliente"
}
```

### Crear lote de facturas de prueba

```javascript
POST /api/facturas/admin/crear-lote-prueba

{
  "clienteId": "TU_CLIENTE_ID",
  "cantidadFacturas": 5
}
```

---

## 🔐 Seguridad

- ✅ Requiere autenticación (token JWT)
- ✅ Requiere rol de administrador
- ✅ Contraseña adicional para modificar fechas
- ✅ Auditoría de todos los cambios
- ✅ No se pueden modificar facturas pagadas/anuladas

---

## 📝 Notas Importantes

1. **Modo Prueba:** Las facturas creadas con fecha personalizada se marcan claramente como "MODO PRUEBA"

2. **Auditoría:** Toda modificación se registra en el campo `observaciones` con:
   - Fecha y hora del cambio
   - Usuario que hizo el cambio
   - Fecha anterior y nueva
   - Motivo del cambio

3. **Validaciones:**
   - Fecha de vencimiento debe ser posterior a fecha de emisión
   - No se pueden modificar facturas pagadas o anuladas
   - Contraseña obligatoria para modificar fechas

---

## 🧪 Pruebas Sugeridas

### Test 1: Factura vencida hace 30 días
- Vencimiento: hace 30 días
- Esperado: mora de aproximadamente 7% del monto

### Test 2: Factura vencida hace 60 días
- Vencimiento: hace 60 días
- Esperado: mora de aproximadamente 14% + reconexión

### Test 3: Factura que vence mañana
- Vencimiento: mañana
- Esperado: estado pendiente, sin mora

### Test 4: Modificar fecha
- Extender 15 días el vencimiento
- Esperado: nueva fecha, registro en observaciones

---

## 📞 Solución de Problemas

### ❌ Error: "Contraseña incorrecta"
**Solución:** Verifica que el hash en `.env` sea correcto y reinicia el servidor

### ❌ Error: "Esta función solo está disponible en modo de prueba"
**Solución:** Asegúrate de incluir `"modoPrueba": true` en el body

### ❌ Error: "No se puede modificar factura pagada"
**Solución:** Solo puedes modificar facturas en estado `pendiente`

---

## 📚 Documentación Completa

Para más detalles, ejemplos y casos de uso avanzados, consulta:
- **GUIA_IMPLEMENTACION.md** - Documentación completa
- **ejemplos_uso_facturas_admin.js** - Scripts de ejemplo

---

## 🎉 ¡Ya estás listo!

Ahora puedes:
- ✅ Crear facturas con cualquier fecha para pruebas
- ✅ Modificar fechas de vencimiento cuando sea necesario
- ✅ Probar flujos de reconexión y pagos con mora
- ✅ Poblar tu base de datos con datos de prueba realistas

**¿Necesitas ayuda?** Revisa los ejemplos en `ejemplos_uso_facturas_admin.js`

---

*Desarrollado para Sistema de Agua LOTI - Huehuetenango, Guatemala*
