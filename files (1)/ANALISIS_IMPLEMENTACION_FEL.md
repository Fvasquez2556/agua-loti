# 📋 ANÁLISIS E IMPLEMENTACIÓN FEL - SISTEMA DE AGUA LOTI

## 🎯 RESUMEN EJECUTIVO

Análisis completo de los documentos proporcionados por Infile para la implementación de Facturación Electrónica en Línea (FEL) en el sistema de agua potable.

**Cliente:** ANA SUSANA VÁSQUEZ ORDOÑEZ  
**NIT:** 39840360  
**Ticket:** #31914753673  
**Asesora:** Stephanie Montoya (implementaciones10@infile.com)  
**Fecha de análisis:** 27 de octubre de 2025

---

## 🔑 1. CREDENCIALES DE PRUEBA (SANDBOX)

### Credenciales de API
```
NIT EMISOR:       39840360
USUARIO API:      39840360
LLAVE API:        1E6E69845CDFFA02C82246468394408C
```

### Credenciales de Firma Digital
```
USUARIO FIRMA:    39840360
LLAVE FIRMA:      fa113ded48964de0f986089e3f3575ec
```

⚠️ **NOTA IMPORTANTE:** La Llave de Firma tiene una fecha de caducidad aproximada de 2 años desde la descarga en Agencia Virtual SAT.

---

## 🌐 2. URLS Y ENDPOINTS

### Ambientes
```javascript
// PRODUCCIÓN
https://fel.infile.com.gt/api

// PRUEBAS (SANDBOX)
https://fel-sandbox.infile.com.gt/api
```

### Endpoints Principales

#### 2.1 Certificación de Facturas
```
POST https://fel-sandbox.infile.com.gt/api/dte/certificar
```

#### 2.2 Consulta de NIT
```
POST https://consultareceptores.feel.com.gt/rest/action

Body (raw):
{
  "emisor_codigo": "PREFIJO",
  "emisor_clave": "LLAVE_API",
  "nit_consulta": "NIT_A_CONSULTAR"
}

Respuesta:
{
  "nit": "12521337",
  "nombre": "INFILE, SOCIEDAD ANONIMA",
  "mensaje": ""
}
```

#### 2.3 Consulta de CUI (DPI)

**Paso 1: Login (obtener token)**
```
POST https://certificador.feel.com.gt/api/v2/servicios/externos/login

Headers:
  Content-Type: multipart/form-data

Body (form-data):
  prefijo: AQUISUPR EFIJO
  llave: EF01796B0F6B6EF1DB743EE39BBBF939B

Respuesta:
{
  "fecha": "2022-12-15T11:58:17-06:00",
  "resultado": true,
  "descripcion": "OK",
  "token": "eyJhbGciOiJI...",
  "fecha_de_vencimiento": "2022-12-15T13:58:17-06:00"
}
```

**Paso 2: Consulta (con token)**
```
POST https://certificador.feel.com.gt/api/v2/servicios/externos/cui

Headers:
  Authorization: Bearer {TOKEN}
  Content-Type: multipart/form-data

Body (form-data):
  cui: 1924044582106

Respuesta:
{
  "fecha": "2022-12-15T11:30-02-06:00",
  "resultado": true,
  "descripcion": "OK",
  "cui": {
    "cui": "1924044582106",
    "nombre": "NOE INFIEL, RECINOS Y RECIUOS",
    "fallecido": "NO"
  }
}
```

---

## 📊 3. ESTRUCTURA XML DE FACTURA FEL

### 3.1 Estructura Básica del DTE

```xml
<?xml version="1.0" encoding="UTF-8"?>
<dte:GTDocumento xmlns:dte="http://www.sat.gob.gt/dte/fel/0.2.0" Version="0.1">
  <dte:SAT ClaseDocumento="dte">
    <dte:DTE ID="DatosCertificados">
      <dte:DatosEmision ID="DatosEmision">
        
        <!-- DATOS DEL EMISOR -->
        <dte:DatosGenerales 
          CodigoMoneda="GTQ" 
          FechaHoraEmision="2024-01-20T10:30:00.000-06:00"
          Tipo="FACT">
        </dte:DatosGenerales>

        <dte:Emisor 
          AfiliacionIVA="GEN"
          CodigoEstablecimiento="1"
          CorreoEmisor="agua@loti.com"
          NITEmisor="39840360"
          NombreComercial="AGUA LOTI"
          NombreEmisor="ANA SUSANA VASQUEZ ORDONEZ">
          <dte:DireccionEmisor>
            <dte:Direccion>CUIDAD, GUATEMALA, GUATEMALA</dte:Direccion>
            <dte:CodigoPostal>01001</dte:CodigoPostal>
            <dte:Municipio>Guatemala</dte:Municipio>
            <dte:Departamento>Guatemala</dte:Departamento>
            <dte:Pais>GT</dte:Pais>
          </dte:DireccionEmisor>
        </dte:Emisor>

        <!-- DATOS DEL RECEPTOR -->
        <dte:Receptor 
          CorreoReceptor="cliente@example.com"
          IDReceptor="CF"
          NombreReceptor="CONSUMIDOR FINAL">
          <dte:DireccionReceptor>
            <dte:Direccion>CIUDAD</dte:Direccion>
            <dte:CodigoPostal>01001</dte:CodigoPostal>
            <dte:Municipio>Guatemala</dte:Municipio>
            <dte:Departamento>Guatemala</dte:Departamento>
            <dte:Pais>GT</dte:Pais>
          </dte:DireccionReceptor>
        </dte:Receptor>

        <!-- FRASES DEL DTE -->
        <dte:Frases>
          <dte:Frase CodigoEscenario="2" TipoFrase="1"/>
          <!-- TipoFrase 1, Escenario 2 = "Sujeto a retención definitiva ISR" -->
        </dte:Frases>

        <!-- ITEMS DE LA FACTURA -->
        <dte:Items>
          <dte:Item BienOServicio="B" NumeroLinea="1">
            <dte:Cantidad>1.00</dte:Cantidad>
            <dte:UnidadMedida>UNI</dte:UnidadMedida>
            <dte:Descripcion>Servicio de Agua Potable - Mes de Enero 2024</dte:Descripcion>
            <dte:PrecioUnitario>100.00</dte:PrecioUnitario>
            <dte:Precio>100.00</dte:Precio>
            <dte:Descuento>0.00</dte:Descuento>
            <dte:Total>100.00</dte:Total>
          </dte:Item>
        </dte:Items>

        <!-- TOTALES -->
        <dte:Totales>
          <dte:TotalImpuestos>
            <dte:TotalImpuesto NombreCorto="IVA" TotalMontoImpuesto="10.72">
              <dte:Monto>89.28</dte:Monto>
            </dte:TotalImpuesto>
          </dte:TotalImpuestos>
          <dte:GranTotal>100.00</dte:GranTotal>
        </dte:Totales>

      </dte:DatosEmision>
    </dte:DTE>
  </dte:SAT>
</dte:GTDocumento>
```

### 3.2 Frases Tributarias Importantes

| Tipo | Código | Descripción | Uso en Agua Potable |
|------|--------|-------------|---------------------|
| 1 | 1 | Sujeto a pagos trimestrales ISR | ✅ Posible |
| 1 | 2 | Sujeto a retención definitiva ISR | ✅ **RECOMENDADO** |
| 4 | 18 | Ventas exentas del IVA | ⚠️ Solo si aplica |

**Para el sistema de agua, se recomienda usar:**
- **Tipo 1, Código 2**: "Sujeto a retención definitiva ISR"

---

## 🎨 4. DISEÑOS DE PLANTILLAS PDF

El catálogo incluye **24 diseños diferentes** (C1 a C16, MC17 a MC20, T22, T23). Para el sistema de agua, se recomiendan los siguientes diseños:

### Diseños Recomendados:

#### 4.1 **Diseño C1** (Clásico)
- ✅ Layout limpio y profesional
- ✅ Código QR visible
- ✅ Información del certificador clara
- ✅ Tabla de items bien estructurada

#### 4.2 **Diseño C4** (Moderno con color)
- ✅ Encabezado con color azul
- ✅ Buena distribución de información
- ✅ Código QR prominente
- ✅ Espacioso y legible

#### 4.3 **Diseño MC17 o MC18** (Ticket/Media Carta)
- ✅ Formato compacto
- ✅ Ideal para recibos rápidos
- ✅ Ahorro de papel
- ✅ Código QR incluido

---

## 🔧 5. PLAN DE IMPLEMENTACIÓN

### Fase 1: Configuración Inicial ✅ (YA COMPLETA)

**Estado:** El sistema ya tiene la estructura base creada

```javascript
// Archivos existentes:
✅ backend/services/fel.service.js (estructura base)
✅ backend/controllers/fel.controller.js
✅ backend/routes/fel.routes.js
✅ backend/models/logFel.model.js
✅ .env (variables FEL configuradas)
```

### Fase 2: Implementación del Servicio FEL

#### 5.1 Instalar Dependencias
```bash
npm install xml2js uuid axios
```

#### 5.2 Configurar Variables de Entorno (.env)

```bash
# ===== CONFIGURACIÓN FEL =====
FEL_AMBIENTE=sandbox
FEL_NIT=39840360
FEL_USUARIO=39840360
FEL_CLAVE=1E6E69845CDFFA02C82246468394408C
FEL_TOKEN=fa113ded48964de0f986089e3f3575ec

# URLs
FEL_URL_SANDBOX=https://fel-sandbox.infile.com.gt/api
FEL_URL_PRODUCCION=https://fel.infile.com.gt/api
FEL_URL_CONSULTA_NIT=https://consultareceptores.feel.com.gt/rest/action
FEL_URL_CONSULTA_CUI=https://certificador.feel.com.gt/api/v2/servicios/externos
```

#### 5.3 Implementar Métodos del Servicio

Los métodos a implementar en `fel.service.js`:

1. **`construirXMLFactura(factura, uuid)`** - Construir XML del DTE
2. **`certificarFactura(facturaData)`** - Enviar a certificar
3. **`consultarNIT(nit)`** - Validar NIT del receptor
4. **`consultarCUI(cui)`** - Validar DPI del receptor
5. **`anularFactura(uuid, motivo)`** - Anular documento certificado
6. **`generarPDF(uuid)`** - Generar representación gráfica

---

## 📝 6. FLUJO DE CERTIFICACIÓN

```
┌─────────────────────────────────────────────┐
│ 1. Usuario genera factura en sistema       │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ 2. Sistema valida datos del cliente        │
│    - Si tiene NIT → consultarNIT()          │
│    - Si tiene DPI → consultarCUI()          │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ 3. Construir XML del DTE                    │
│    - Datos emisor (NIT 39840360)            │
│    - Datos receptor (validados)             │
│    - Items (servicio de agua)               │
│    - Totales                                │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ 4. Certificar con Infile                    │
│    POST /api/dte/certificar                 │
│    - Enviar XML                             │
│    - Recibir UUID de certificación          │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ 5. Guardar en base de datos                │
│    - UUID                                   │
│    - Número de autorización                 │
│    - Fecha de certificación                 │
│    - Serie y número                         │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ 6. Generar PDF con diseño seleccionado     │
│    - Incluir código QR                      │
│    - Incluir datos de certificación         │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ 7. Enviar PDF al cliente (email/WhatsApp)  │
└─────────────────────────────────────────────┘
```

---

## 🚨 7. CONSIDERACIONES CRÍTICAS

### 7.1 Seguridad
- ✅ Las credenciales ya están en `.env`
- ✅ Nunca exponer credenciales en código
- ✅ Usar HTTPS en todas las peticiones
- ⚠️ La llave de firma expira en ~2 años

### 7.2 Validaciones Obligatorias
- ✅ Validar formato de NIT (sin guiones)
- ✅ Validar formato de CUI/DPI
- ✅ Verificar que el cliente no esté fallecido (CUI)
- ✅ Validar montos y totales
- ✅ Incluir frases tributarias correctas

### 7.3 Manejo de Errores
- ✅ Reintentos automáticos (máx 3)
- ✅ Log de todas las certificaciones
- ✅ Modo contingencia (cuando SAT no responda)
- ✅ Notificaciones de errores

### 7.4 Contingencia
- Cuando el servicio de SAT no esté disponible
- Se debe usar un **Número de Acceso** especial
- Notificar a SAT después en Agencia Virtual

---

## 📚 8. CAMPOS IMPORTANTES DEL SISTEMA DE AGUA

### 8.1 Mapeo Factura → DTE

| Campo Factura | Campo XML DTE | Ejemplo |
|---------------|---------------|---------|
| `numeroFactura` | `NumeroDocumento` | 2024-01-0001 |
| `clienteId.nombres + apellidos` | `NombreReceptor` | Juan Pérez |
| `clienteId.dpi` | Consultar con `consultarCUI()` | 1924044582106 |
| `consumoLitros` | `Cantidad` | 15.5 |
| `montoTotal` | `GranTotal` | 100.00 |
| `fechaEmision` | `FechaHoraEmision` | 2024-01-20T10:30:00 |

### 8.2 Descripción del Item

Para facturas de agua, la descripción puede incluir:

```
Servicio de Agua Potable
Periodo: Enero 2024
Lectura Anterior: 1500 m³
Lectura Actual: 1515 m³
Consumo: 15 m³
Tarifa base: Q25.00
Excedente: Q75.00
```

---

## 🎯 9. PRÓXIMOS PASOS

### Inmediatos (Esta Semana)
1. ✅ Revisar documentación (COMPLETADO)
2. ⏳ Implementar método `construirXMLFactura()`
3. ⏳ Implementar método `certificarFactura()`
4. ⏳ Probar certificación con factura de prueba

### Corto Plazo (Próximas 2 Semanas)
5. ⏳ Implementar consulta de NIT
6. ⏳ Implementar consulta de CUI
7. ⏳ Seleccionar y configurar diseño de PDF
8. ⏳ Integrar con módulo de facturas existente

### Mediano Plazo (Mes)
9. ⏳ Pruebas exhaustivas en sandbox
10. ⏳ Capacitación de usuarios
11. ⏳ Solicitar credenciales de producción
12. ⏳ Migración a producción

---

## 📞 10. CONTACTOS Y SOPORTE

### Infile - Equipo de Implementación
- **Asesora:** Stephanie Montoya
- **Email:** implementaciones10@infile.com
- **Ticket:** #31914753673
- **Horario:** Lunes a Viernes, 8:00 AM - 5:00 PM

### Soporte Técnico Infile
- **Email:** aux_implementacion1@infile.com (Marlene Ramírez)
- **Teléfono:** +(502) 2208-2208

### Documentación Adicional
- Portal SAT: https://portal.sat.gob.gt
- Documentación FEL: https://portal.sat.gob.gt/portal/fel
- Agencia Virtual SAT: Para gestión de credenciales

---

## 📊 11. RESUMEN DE ARCHIVOS ANALIZADOS

| Archivo | Tipo | Contenido Principal | Estado |
|---------|------|---------------------|--------|
| `CREDENCIALES_DE_PRUEBA_ANA_SUSANA.xlsx` | Excel | Credenciales API y Firma | ✅ Revisado |
| `DETALLES_DE_FACTURACIÓN.xlsx` | Excel | Formatos y frases tributarias | ✅ Revisado |
| `Catálogo_Plantillas_FEL_Guatemala_2024.pdf` | PDF | 24 diseños de facturas | ✅ Revisado |
| `API_Consulta_de_CUI.pdf` | PDF | Documentación API CUI | ✅ Revisado |
| `MANUAL_CONSUMO_WEB_SERVICE_DE_CONSULTA_DE_NIT__5_.pdf` | PDF | Documentación API NIT | ✅ Revisado |
| Correo de Marlene Ramírez | Email | Inicio de implementación | ✅ Revisado |
| Correo de Stephanie Montoya | Email | Instrucciones detalladas | ✅ Revisado |

---

## ✅ 12. CHECKLIST DE IMPLEMENTACIÓN

### Pre-Implementación
- [x] Obtener credenciales de prueba
- [x] Revisar documentación
- [x] Analizar estructura XML
- [x] Seleccionar diseño de PDF
- [ ] Completar archivo DETALLES_DE_FACTURACIÓN.xlsx
- [ ] Enviar a asesora de Infile

### Desarrollo
- [ ] Instalar dependencias (xml2js, uuid, axios)
- [ ] Configurar variables de entorno
- [ ] Implementar `construirXMLFactura()`
- [ ] Implementar `certificarFactura()`
- [ ] Implementar `consultarNIT()`
- [ ] Implementar `consultarCUI()`
- [ ] Implementar `anularFactura()`
- [ ] Implementar generación de PDF

### Pruebas
- [ ] Certificar factura con consumidor final (CF)
- [ ] Certificar factura con NIT
- [ ] Certificar factura con DPI
- [ ] Probar anulación
- [ ] Validar PDF generado
- [ ] Probar modo contingencia

### Producción
- [ ] Solicitar credenciales de producción
- [ ] Cambiar FEL_AMBIENTE a 'produccion'
- [ ] Actualizar URLs
- [ ] Capacitar usuarios
- [ ] Monitoreo por 1 semana

---

## 📖 13. GLOSARIO

- **FEL**: Facturación Electrónica en Línea
- **DTE**: Documento Tributario Electrónico
- **UUID**: Identificador único universal del documento certificado
- **NIT**: Número de Identificación Tributaria
- **CUI/DPI**: Código Único de Identificación / Documento Personal de Identificación
- **SAT**: Superintendencia de Administración Tributaria
- **RTU**: Registro Tributario Unificado
- **CF**: Consumidor Final (cuando el cliente no tiene NIT)

---

## 🎓 CONCLUSIÓN

La implementación de FEL en el sistema de agua está bien encaminada:

✅ **Fortalezas:**
- Estructura base ya creada en el sistema
- Credenciales de prueba obtenidas
- Documentación completa disponible
- Asesora asignada y disponible

⚠️ **Pendientes:**
- Implementar métodos de certificación
- Seleccionar diseño de PDF
- Realizar pruebas exhaustivas
- Completar formulario de detalles

🎯 **Recomendación:**
Comenzar con la implementación de `construirXMLFactura()` y `certificarFactura()` esta semana, usando las credenciales de sandbox proporcionadas.

---

**Documento generado:** 27 de octubre de 2025  
**Próxima revisión:** Después de primera certificación exitosa
