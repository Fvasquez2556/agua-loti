# 🌊 Sistema de Agua LOTI

Sistema de gestión de facturación y pagos para el servicio de agua potable en Huehuetenango, Guatemala.

## 📋 Características Principales

- ✅ **Gestión de Clientes**: Registro completo de usuarios con datos de contacto
- 💧 **Control de Lecturas**: Registro de consumo mensual de agua
- 📄 **Facturación Automática**: Generación de facturas con tarifas personalizadas
- 📧 **Notificaciones**: Envío automático por Email y WhatsApp
- 💰 **Gestión de Pagos**: Control de pagos con tickets PDF
- 📊 **Mora Automática**: Cálculo de mora al 7% mensual
- 🔌 **Reconexión**: Gestión de cortes y reconexiones (2 facturas vencidas)
- 🧾 **Factura Electrónica (FEL)**: Integración con Infile/SAT Guatemala
- 📱 **WhatsApp**: Envío de facturas en PDF por WhatsApp
- 🎨 **Dashboard**: Estadísticas y reportes en tiempo real

---

## 🚀 Instalación Rápida

### Requisitos Previos

Antes de instalar, asegúrate de tener:

1. **Node.js** (versión 18 o superior)
   [Descargar Node.js](https://nodejs.org/)

2. **MongoDB** (versión 6 o superior)
   [Descargar MongoDB Community](https://www.mongodb.com/try/download/community)

3. **Git** (opcional, para clonar el repositorio)
   [Descargar Git](https://git-scm.com/)

---

### Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/agua-loti.git
cd agua-loti
```

O descarga el ZIP y extráelo en tu computadora.

---

### Paso 2: Instalar Dependencias

```bash
npm install
```

Este comando instalará todas las librerías necesarias listadas en `package.json`.

---

### Paso 3: Configurar Variables de Entorno

1. **Copiar el archivo de ejemplo:**
   ```bash
   cp .env.example .env
   ```

2. **Editar el archivo `.env`** con tus credenciales:

   ```env
   # Base de datos MongoDB
   MONGO_URI=mongodb://localhost:27017/agua-loti

   # Clave secreta para JWT (cambiar)
   JWT_SECRET=tu_clave_secreta_cambiar_en_produccion

   # Email (Gmail)
   EMAIL_USER=tucorreo@gmail.com
   EMAIL_PASSWORD=tu_password_de_aplicacion

   # WhatsApp (opcional)
   WHATSAPP_ENABLED=true

   # FEL - Factura Electrónica (opcional)
   INFILE_ENABLED=false
   ```

**Notas importantes:**
- Para **Email**: Necesitas una contraseña de aplicación de Gmail (no tu contraseña normal)
  - Ve a: [https://myaccount.google.com/](https://myaccount.google.com/) → Seguridad → Contraseñas de aplicaciones
- Para **WhatsApp**: Se requiere escanear código QR la primera vez
- Para **FEL**: Necesitas cuenta en [Infile](https://infile.com.gt)

---

### Paso 4: Iniciar MongoDB

Asegúrate de que MongoDB esté corriendo:

**Windows:**
```bash
# Iniciar servicio MongoDB
net start MongoDB
```

**Linux/Mac:**
```bash
sudo systemctl start mongod
```

---

### Paso 5: Crear Usuario Administrador

```bash
npm run crear-admin
```

Este comando creará el primer usuario administrador. Sigue las instrucciones en pantalla.

---

### Paso 6: Iniciar el Sistema

```bash
npm start
```

El sistema estará disponible en:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:3000/api](http://localhost:3000/api)

---

## 📁 Estructura del Proyecto

```
agua-loti/
├── backend/
│   ├── config/           # Configuración de base de datos
│   ├── controllers/      # Lógica de negocio
│   ├── models/          # Modelos de MongoDB
│   ├── routes/          # Rutas de la API
│   ├── services/        # Servicios (email, WhatsApp, FEL)
│   ├── middlewares/     # Middleware de autenticación
│   ├── scripts/         # Scripts de utilidad
│   ├── uploads/         # Archivos generados (PDFs)
│   └── server.js        # Punto de entrada
├── frontend/
│   ├── pages/           # Páginas HTML
│   ├── js/              # JavaScript del frontend
│   ├── css/             # Estilos
│   └── assets/          # Recursos estáticos
├── .env.example         # Ejemplo de configuración
├── .gitignore           # Archivos ignorados por Git
├── package.json         # Dependencias del proyecto
└── README.md            # Este archivo
```

---

## 🔧 Scripts Disponibles

```bash
# Iniciar el servidor
npm start

# Iniciar en modo desarrollo
npm run dev

# Crear usuario administrador
npm run crear-admin

# Inicializar datos de facturación (opcional)
npm run init-facturacion

# Inicializar con datos de prueba
npm run init-facturacion-test
```

---

## 📱 Configuración de WhatsApp

Para habilitar las notificaciones por WhatsApp:

1. **Establecer en `.env`:**
   ```env
   WHATSAPP_ENABLED=true
   ```

2. **Iniciar el servidor:**
   ```bash
   npm start
   ```

3. **Escanear el código QR:**
   - Se mostrará un código QR en la consola
   - Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo
   - Escanea el código QR

4. **¡Listo!** El sistema ahora puede enviar PDFs por WhatsApp

---

## 📧 Configuración de Email

Para enviar facturas por correo electrónico:

1. **Obtener contraseña de aplicación de Gmail:**
   - Ve a: [https://myaccount.google.com/](https://myaccount.google.com/)
   - Seguridad → Verificación en 2 pasos (activar si no está)
   - Contraseñas de aplicaciones → Generar
   - Copia la contraseña de 16 caracteres

2. **Configurar en `.env`:**
   ```env
   EMAIL_USER=tucorreo@gmail.com
   EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
   ```

---

## 🧾 Configuración de FEL (Factura Electrónica)

Para certificar facturas electrónicas con SAT Guatemala:

1. **Obtener credenciales en Infile:**
   - Registrarse en [https://infile.com.gt](https://infile.com.gt)
   - Obtener NIT, Usuario, Clave y Token

2. **Configurar en `.env`:**
   ```env
   INFILE_ENABLED=true
   FEL_AMBIENTE=sandbox
   FEL_NIT=tu_nit
   FEL_USUARIO=tu_usuario
   FEL_CLAVE=tu_clave
   FEL_TOKEN=tu_token
   ```

3. **Para producción:**
   ```env
   FEL_AMBIENTE=produccion
   INFILE_ENABLED=true
   ```

---

## 🚢 Despliegue en Producción

### Opción 1: Servidor Tradicional

1. **Instalar dependencias en el servidor:**
   ```bash
   npm install --production
   ```

2. **Configurar variables de entorno:**
   ```bash
   NODE_ENV=production
   ```

3. **Usar PM2 para mantener el servicio activo:**
   ```bash
   npm install -g pm2
   pm2 start backend/server.js --name agua-loti
   pm2 save
   pm2 startup
   ```

### Opción 2: Docker

```bash
# Construir imagen
docker build -t agua-loti .

# Ejecutar contenedor
docker run -d -p 3000:3000 --name agua-loti agua-loti
```

---

## 🛠️ Solución de Problemas

### Error: "Cannot connect to MongoDB"
- Verifica que MongoDB esté corriendo
- Verifica la URL en `MONGO_URI` del archivo `.env`

### Error: "WhatsApp no conecta"
- Asegúrate de escanear el código QR
- Verifica que `WHATSAPP_ENABLED=true`
- Elimina la carpeta `whatsapp-sessions/` y vuelve a escanear

### Error: "Email no se envía"
- Verifica que uses contraseña de aplicación (no contraseña normal)
- Verifica que la verificación en 2 pasos esté activa en Gmail

---

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

---

## 👥 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-caracteristica`)
3. Commit tus cambios (`git commit -m 'Agregar nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Abre un Pull Request

---

## 📞 Soporte

Para reportar bugs o solicitar nuevas características:
- Abrir un issue en GitHub
- Email: soporte@agua-loti.com

---

## 🙏 Agradecimientos

Desarrollado para el Sistema de Agua LOTI en Huehuetenango, Guatemala.

---

**Versión:** 1.0.0
**Última actualización:** Noviembre 2025
