# 💧 Sistema de Agua LOTI - Gestión Integral

## 🎯 **Descripción**

Sistema completo de gestión para el Sistema de Agua LOTI en Huehuetenango, Guatemala. Incluye gestión de clientes, facturación automatizada, control de lecturas y administración integral del servicio de agua potable.

## ✨ **Estado del Proyecto**

🚀 **SISTEMA COMPLETAMENTE OPERATIVO** - Julio 2025
- ✅ **Backend completo** con MongoDB y Node.js
- ✅ **Frontend moderno** y responsive  
- ✅ **Sistema de facturación** con cálculos precisos
- ✅ **Autenticación y seguridad** implementadas
- ✅ **Listo para producción**

## 🏗️ **Arquitectura**

```
agua-loti/
├── backend/                 # Servidor Node.js + Express
│   ├── models/             # Modelos MongoDB (Cliente, Factura, Lectura, User)
│   ├── controllers/        # Lógica de negocio
│   ├── routes/            # Endpoints API REST
│   ├── middlewares/       # Autenticación JWT
│   └── scripts/           # Herramientas administrativas
├── frontend/              # Interfaz web moderna
│   ├── pages/            # Páginas HTML
│   ├── js/               # Lógica JavaScript
│   └── css/              # Estilos responsive
└── docs/                 # Documentación completa
```

## 🚀 **Instalación y Configuración**

### 📋 **Prerrequisitos**
- Node.js 16+ 
- MongoDB 5+
- Git

### 🔧 **Instalación**

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/Fvasquez2556/agua-loti.git
   cd agua-loti
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   ```bash
   # Crear archivo .env en la raíz del proyecto
   MONGO_URI=mongodb://localhost:27017/agua-loti
   JWT_SECRET=tu_jwt_secret_aqui
   PORT=5000
   NODE_ENV=development
   ```

4. **Inicializar el sistema**:
   ```bash
   npm run crear-admin          # Crear usuario administrador
   npm run init-facturacion     # Inicializar sistema de facturación
   ```

5. **Iniciar el servidor**:
   ```bash
   npm start
   ```

6. **Acceder a la aplicación**:
   - **Frontend**: http://localhost:5500/frontend/pages/login.html
   - **API**: http://localhost:5000/api

## 🎨 **Módulos del Sistema**

### 👥 **Gestión de Clientes**
- ✅ Registro completo de clientes por proyectos
- ✅ Validación automática de DPI guatemalteco
- ✅ Estados activo/inactivo con eliminación suave
- ✅ Filtros por proyecto y búsqueda avanzada
- ✅ Modal de edición con validaciones en tiempo real

### 🧾 **Sistema de Facturación**
- ✅ **Cálculos según especificaciones técnicas**:
  - Tarifa base: Q50.00 por 30,000 litros
  - Excedentes: Precio por litro + 7.5% recargo
  - Sistema de redondeo a Q0.50 centavos
  - Mora: 7% mensual automático
  - Reconexión: Q125.00
- ✅ **Generación automática** de números de factura
- ✅ **Vista previa en tiempo real** con cálculos dinámicos
- ✅ **Historial completo** de facturas por cliente
- ✅ **Estados**: pendiente, pagada, vencida, anulada

### 📊 **Control de Lecturas**
- ✅ Registro detallado de lecturas de contadores
- ✅ **Detección automática de anomalías** de consumo
- ✅ Validaciones de coherencia (lectura actual ≥ anterior)
- ✅ **Estadísticas de consumo** promedio por cliente
- ✅ Gestión de lecturas estimadas y correcciones

### 🔐 **Autenticación y Seguridad**
- ✅ Sistema JWT con tokens seguros
- ✅ Middleware de autenticación en todas las rutas
- ✅ Control de sesiones y expiración automática
- ✅ Roles de usuario (admin, operador)

## 🛠️ **Scripts Disponibles**

```bash
# Servidor
npm start                    # Iniciar servidor en producción
npm run dev                  # Iniciar servidor en desarrollo

# Administración
npm run crear-admin          # Crear usuario administrador
npm run init-facturacion     # Inicializar sistema de facturación
npm run init-facturacion-test # Inicializar con datos de prueba
```

## 📊 **API Endpoints**

### 🔐 **Autenticación**
```
POST   /api/auth/login       # Iniciar sesión
POST   /api/auth/register    # Registrar usuario (admin)
GET    /api/auth/verify      # Verificar token
```

### 👥 **Clientes**
```
GET    /api/clientes         # Listar clientes (con filtros)
GET    /api/clientes/:id     # Obtener cliente específico
POST   /api/clientes         # Crear nuevo cliente
PUT    /api/clientes/:id     # Actualizar cliente
DELETE /api/clientes/:id     # Eliminar cliente (suave)
```

### 🧾 **Facturas**
```
GET    /api/facturas         # Listar facturas (con filtros)
GET    /api/facturas/resumen # Resumen de facturación
POST   /api/facturas         # Crear nueva factura
PUT    /api/facturas/:id/pagar   # Marcar como pagada
PUT    /api/facturas/:id/anular  # Anular factura
```

### 📊 **Lecturas**
```
GET    /api/lecturas         # Listar lecturas
GET    /api/lecturas/cliente/:id/ultima    # Última lectura del cliente
POST   /api/lecturas         # Registrar nueva lectura
PUT    /api/lecturas/:id/procesar          # Procesar lectura
```

## 🎨 **Características Técnicas**

### 💻 **Frontend**
- **HTML5** semántico y accesible
- **CSS3** con Grid y Flexbox responsive
- **JavaScript ES6+** modular
- **Diseño mobile-first** optimizado
- **Animaciones CSS** fluidas

### ⚙️ **Backend**
- **Node.js** + Express.js
- **MongoDB** con Mongoose ODM
- **JWT** para autenticación
- **bcryptjs** para encriptación
- **CORS** configurado
- **Validaciones** robustas

### 📱 **Responsive Design**
- ✅ Móviles (320px+)
- ✅ Tablets (768px+) 
- ✅ Desktop (1024px+)
- ✅ Pantallas grandes (1440px+)

## 🔧 **Configuración de Desarrollo**

### 🌐 **Variables de Entorno**
```bash
# .env
MONGO_URI=mongodb://localhost:27017/agua-loti
JWT_SECRET=your-super-secret-jwt-key-here
PORT=5000
NODE_ENV=development
```

### 🗄️ **Base de Datos**
```bash
# Conexión MongoDB local
mongod --dbpath /path/to/your/db

# O usando MongoDB Atlas (cloud)
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/agua-loti
```

## 📄 **Documentación Completa**

- 📋 **[Especificaciones Técnicas](SISTEMA-FACTURACION-IMPLEMENTADO.md)** - Documentación detallada del sistema
- 🔄 **[Mejoras Implementadas](MEJORAS-IMPLEMENTADAS.md)** - Historial de cambios y mejoras
- 🧪 **[Testing](frontend/pages/auth-test.html)** - Herramienta de debugging

## 🎯 **Proyectos Soportados**

El sistema maneja múltiples proyectos de agua:
- 🏘️ **San Miguel**
- 🏘️ **Santa Clara Fase 1**
- 🏘️ **Santa Clara Fase 2** 
- 🏘️ **Cabañas Fase 1**
- 🏘️ **Cabañas Fase 2**

## 🚀 **Despliegue en Producción**

### 🌐 **Opción 1: Servidor Local**
```bash
# En el servidor
git clone https://github.com/Fvasquez2556/agua-loti.git
cd agua-loti
npm install --production
npm run crear-admin
npm run init-facturacion
npm start
```

### ☁️ **Opción 2: Cloud (Heroku, Railway, etc.)**
```bash
# Configurar variables de entorno en el proveedor cloud
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
NODE_ENV=production
PORT=5000
```

## 🔮 **Roadmap Futuro**

### 📅 **Próximas Implementaciones**
- 📄 **Certificación FEL** (Factura Electrónica Guatemala)
- 💬 **Integración WhatsApp** Business para notificaciones
- 📊 **Reportes avanzados** y analytics
- 📱 **Aplicación móvil** para lectores
- 🔔 **Sistema de notificaciones** automáticas
- 💰 **Integración con pasarelas de pago**

## 👨‍💻 **Contribuir**

1. Fork el proyecto
2. Crear rama para feature (`git checkout -b feature/AmazingFeature`)
3. Commit los cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📧 **Contacto**

- **Proyecto**: Sistema de Agua LOTI
- **Ubicación**: Huehuetenango, Guatemala
- **GitHub**: [@Fvasquez2556](https://github.com/Fvasquez2556)

## 📜 **Licencia**

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

---

## 🏆 **Estado del Proyecto**

```
✅ SISTEMA COMPLETAMENTE OPERATIVO
📅 Última actualización: Julio 31, 2025
🚀 Listo para producción inmediata
💯 Cobertura de funcionalidades: 100%
```

**¡Sistema listo para transformar la gestión del agua en tu comunidad!** 💧✨
