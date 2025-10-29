# 🚀 Guía Rápida - Panel de Administración de Facturas

## ✅ Implementación Completada

El sistema de administración de facturas ha sido implementado exitosamente con las siguientes funcionalidades:

### 📦 Archivos Agregados/Modificados:

**Backend:**
- ✅ `backend/controllers/factura.admin.controller.js` - Controlador con funciones admin
- ✅ `backend/routes/factura.admin.routes.js` - Rutas protegidas con seguridad
- ✅ `backend/server.js` - Rutas registradas
- ✅ `.env` - Variables de configuración agregadas

**Frontend:**
- ✅ `frontend/pages/factura.html` - Panel admin agregado
- ✅ `frontend/css/factura.css` - Estilos para panel admin
- ✅ `frontend/js/factura.admin.js` - Lógica de funciones admin (NUEVO)

---

## 🎯 Primeros Pasos

### 1️⃣ Iniciar el Servidor

```bash
# Desde la raíz del proyecto
cd backend
npm run dev
# o
node server.js
```

El servidor debe mostrar: `🚀 Servidor escuchando en el puerto 5000`

### 2️⃣ Abrir el Módulo de Facturas

1. Abre tu navegador en: `http://localhost:5000`
2. Inicia sesión con tu cuenta de administrador
3. Ve al módulo de **Facturas**
4. Verás una nueva sección de color rosa/morado: **⚙️ Panel de Administración**

---

## 🔐 Configuración Inicial (SOLO LA PRIMERA VEZ)

### Paso 1: Generar Contraseña Administrativa

1. En el **Panel de Administración**, haz clic en el botón **"Generar Hash"** (🔐 Generar Contraseña)
2. Se abrirá un modal
3. Ingresa una contraseña segura (mínimo 8 caracteres)
   - Ejemplo: `Admin2025!Agua`
4. Haz clic en **"✅ Generar Hash"**
5. Se mostrará un hash largo (como: `$2a$10$abc123...`)
6. Haz clic en **"📋 Copiar Hash"**

### Paso 2: Configurar el Archivo .env

1. Abre el archivo `.env` en la raíz del proyecto
2. Busca la línea: `ADMIN_FECHA_PASSWORD=`
3. Pega el hash copiado después del `=`:
   ```env
   ADMIN_FECHA_PASSWORD=$2a$10$abc123def456...
   ```
4. Guarda el archivo

### Paso 3: Reiniciar el Servidor

```bash
# Presiona Ctrl+C para detener el servidor
# Luego inicia nuevamente:
npm run dev
```

✅ **¡Listo!** Ya puedes usar todas las funciones administrativas.

---

## 📅 Funcionalidades Disponibles

### 1. Crear Factura con Fecha Personalizada

**Uso:** Para crear facturas de prueba con fechas específicas (ej: facturas vencidas para probar mora)

**Pasos:**
1. Haz clic en **"Crear Factura"** (📅 Factura Personalizada)
2. Selecciona un cliente
3. Ingresa las lecturas (Anterior: 1000, Actual: 5000)
4. **Usa los botones rápidos:**
   - **"Vencida hace 30 días"** → Para probar mora de 1 mes
   - **"Vencida hace 60 días"** → Para probar mora de 2 meses + reconexión
   - **"Vence mañana"** → Para probar factura por vencer
5. O configura manualmente las fechas
6. Haz clic en **"✅ Crear Factura"**

**Ejemplo de Uso:**
- Para probar el cálculo de mora → Usa "Vencida hace 30 días"
- Para probar reconexión → Usa "Vencida hace 60 días"
- Para verificar alertas → Usa "Vence mañana"

---

### 2. Modificar Fecha de Vencimiento

**Uso:** Para extender o cambiar la fecha de vencimiento de una factura existente

**Pasos:**
1. Haz clic en **"Modificar Fecha"** (✏️ Modificar Fecha)
2. Ingresa el número de factura (ej: `FAC-202510-0001`)
3. Selecciona la nueva fecha de vencimiento
4. **Ingresa la contraseña administrativa** (la que creaste en el paso 1)
5. Escribe el motivo del cambio (ej: "Extensión por solicitud del cliente")
6. Haz clic en **"✅ Modificar Fecha"**

**Casos de Uso:**
- Cliente solicita extensión de pago
- Corrección de error en fecha de emisión
- Ajustes por acuerdos especiales

---

### 3. Generar Lote de Facturas de Prueba

**Uso:** Para poblar la base de datos con facturas en diferentes estados de mora

**Pasos:**
1. Haz clic en **"Generar Lote"** (📦 Lote de Prueba)
2. Selecciona un cliente
3. Selecciona cantidad (1-10 facturas)
4. Haz clic en **"✅ Generar Lote"**

**Qué se Crea:**
- Factura 1: Sin mora (vence hoy)
- Factura 2: 10 días de mora
- Factura 3: 30 días de mora (~7%)
- Factura 4: 60 días de mora (~14% + reconexión)
- Factura 5: 90 días de mora

**Ideal Para:**
- Poblar base de datos de prueba
- Probar vistas de facturas vencidas
- Verificar cálculos de mora
- Probar sistema de reconexión

---

## 🎯 Escenarios de Prueba Recomendados

### Escenario 1: Probar Sistema de Mora
```
1. Generar lote de 5 facturas para un cliente
2. Ir al módulo de Mora
3. Verificar cálculos de mora
4. Verificar que las facturas con 60+ días muestren reconexión
```

### Escenario 2: Probar Reconexión
```
1. Crear factura vencida hace 60 días
2. Ir al módulo de Reconexión
3. Verificar que el cliente aparezca como "Requiere Reconexión"
4. Procesar pago + reconexión
```

### Escenario 3: Extender Fecha de Pago
```
1. Cliente solicita extensión
2. Usar "Modificar Fecha"
3. Ingresar nueva fecha de vencimiento
4. Verificar que la mora se recalcula
```

---

## ⚠️ Advertencias y Notas Importantes

### 🔒 Seguridad:
- ✅ Las funciones solo funcionan si `ENABLE_ADMIN_FUNCTIONS=true` en `.env`
- ✅ Se requiere autenticación JWT (estar logueado)
- ✅ Se requiere rol de administrador
- ✅ Modificar fechas requiere contraseña adicional
- ✅ Todas las acciones se registran en logs

### 📝 Facturas de Prueba:
- ✅ Se marcan automáticamente como **"MODO PRUEBA"** en observaciones
- ✅ Son facturas reales en la base de datos
- ✅ Funcionan igual que facturas normales
- ✅ Se pueden pagar, anular, etc.

### 🚫 Limitaciones:
- ❌ No se pueden modificar facturas pagadas o anuladas
- ❌ La fecha de vencimiento debe ser posterior a la de emisión
- ❌ Requiere contraseña para modificar fechas

---

## 🔧 Solución de Problemas

### Problema: "Estado actual: ❌ Deshabilitadas"
**Solución:** Verifica que en `.env` esté: `ENABLE_ADMIN_FUNCTIONS=true` y reinicia el servidor.

### Problema: "Contraseña administrativa incorrecta"
**Solución:**
1. Verifica que hayas copiado el hash completo en `.env`
2. Reinicia el servidor después de modificar `.env`
3. Usa la misma contraseña que usaste para generar el hash

### Problema: "Error al conectar con el servidor"
**Solución:**
1. Verifica que el servidor backend esté corriendo
2. Verifica que la URL sea `http://localhost:5000`
3. Revisa la consola del navegador (F12) para más detalles

### Problema: No aparece el Panel de Administración
**Solución:**
1. Limpia la caché del navegador (Ctrl+Shift+R)
2. Verifica que el archivo `factura.admin.js` se esté cargando
3. Revisa la consola del navegador por errores

---

## 📊 Verificación de Instalación

Ejecuta estos pasos para verificar que todo funciona:

```bash
# 1. Verificar archivos backend
ls backend/controllers/factura.admin.controller.js
ls backend/routes/factura.admin.routes.js

# 2. Verificar archivo frontend
ls frontend/js/factura.admin.js

# 3. Verificar variable en .env
grep ENABLE_ADMIN_FUNCTIONS .env

# 4. Iniciar servidor
cd backend
npm run dev
```

**Deberías ver:**
- ✅ Servidor corriendo en puerto 5000
- ✅ Panel de Administración visible en módulo de facturas
- ✅ Estado: "✅ Habilitadas (development)"

---

## 🎉 ¡Todo Listo!

Ahora puedes:
- ✅ Crear facturas con fechas personalizadas para pruebas
- ✅ Probar el sistema de mora con facturas vencidas
- ✅ Probar el sistema de reconexión
- ✅ Modificar fechas de vencimiento cuando sea necesario
- ✅ Generar datos de prueba realistas

---

## 📞 Soporte

Si tienes problemas:
1. Revisa esta guía completa
2. Verifica los logs del servidor
3. Revisa la consola del navegador (F12)
4. Verifica que todas las variables de entorno estén configuradas

---

**Desarrollado para Sistema de Agua LOTI - Huehuetenango, Guatemala**
**Octubre 2025**
