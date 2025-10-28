# 🚀 IMPLEMENTACIÓN FEL - GUÍA RÁPIDA

## 📌 CREDENCIALES (SANDBOX)

```
NIT EMISOR:       39840360
USUARIO API:      39840360
LLAVE API:        1E6E69845CDFFA02C82246468394408C
USUARIO FIRMA:    39840360
LLAVE FIRMA:      fa113ded48964de0f986089e3f3575ec
```

## 🌐 URLS

```
Sandbox:          https://fel-sandbox.infile.com.gt/api
Producción:       https://fel.infile.com.gt/api
Consulta NIT:     https://consultareceptores.feel.com.gt/rest/action
Consulta CUI:     https://certificador.feel.com.gt/api/v2/servicios/externos
```

## 📋 PASOS INMEDIATOS

### 1. Configurar .env
```bash
FEL_AMBIENTE=sandbox
FEL_NIT=39840360
FEL_USUARIO=39840360
FEL_CLAVE=1E6E69845CDFFA02C82246468394408C
FEL_TOKEN=fa113ded48964de0f986089e3f3575ec
FEL_URL_SANDBOX=https://fel-sandbox.infile.com.gt/api
FEL_URL_PRODUCCION=https://fel.infile.com.gt/api
```

### 2. Instalar Dependencias
```bash
npm install xml2js uuid axios
```

### 3. Métodos a Implementar en fel.service.js

```javascript
// 1. Construir XML de la factura
async construirXMLFactura(factura, uuid) {
  // Generar XML según estructura FEL
  // Ver estructura completa en ANALISIS_IMPLEMENTACION_FEL.md
}

// 2. Certificar factura
async certificarFactura(facturaData) {
  const xml = this.construirXMLFactura(facturaData, uuid);
  
  const response = await axios.post(
    `${this.baseURL}/dte/certificar`,
    {
      nit: this.credentials.nit,
      usuario: this.credentials.usuario,
      llave: this.credentials.clave,
      xml: xml
    }
  );
  
  return response.data;
}

// 3. Consultar NIT del receptor
async consultarNIT(nit) {
  const response = await axios.post(
    'https://consultareceptores.feel.com.gt/rest/action',
    {
      emisor_codigo: this.credentials.usuario,
      emisor_clave: this.credentials.clave,
      nit_consulta: nit.replace(/-/g, '')
    }
  );
  
  return response.data;
}

// 4. Consultar CUI (DPI) del receptor
async consultarCUI(cui) {
  // Paso 1: Obtener token
  const loginRes = await axios.post(
    'https://certificador.feel.com.gt/api/v2/servicios/externos/login',
    {
      prefijo: this.credentials.usuario,
      llave: this.credentials.clave
    }
  );
  
  const token = loginRes.data.token;
  
  // Paso 2: Consultar CUI
  const cuiRes = await axios.post(
    'https://certificador.feel.com.gt/api/v2/servicios/externos/cui',
    { cui: cui },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  return cuiRes.data;
}

// 5. Anular factura
async anularFactura(uuid, motivo) {
  const response = await axios.post(
    `${this.baseURL}/dte/anular`,
    {
      nit: this.credentials.nit,
      usuario: this.credentials.usuario,
      llave: this.credentials.clave,
      uuid: uuid,
      motivo: motivo
    }
  );
  
  return response.data;
}
```

### 4. Estructura XML Básica

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gte:GTDocumento xmlns:dte="http://www.sat.gob.gt/dte/fel/0.2.0" Version="0.1">
  <dte:SAT ClaseDocumento="dte">
    <dte:DTE ID="DatosCertificados">
      <dte:DatosEmision ID="DatosEmision">
        
        <dte:DatosGenerales 
          CodigoMoneda="GTQ" 
          FechaHoraEmision="2024-01-20T10:30:00.000-06:00"
          Tipo="FACT">
        </dte:DatosGenerales>

        <dte:Emisor 
          NITEmisor="39840360"
          NombreEmisor="ANA SUSANA VASQUEZ ORDONEZ"
          NombreComercial="AGUA LOTI"
          AfiliacionIVA="GEN"
          CodigoEstablecimiento="1">
          <dte:DireccionEmisor>
            <dte:Direccion>CUIDAD, GUATEMALA, GUATEMALA</dte:Direccion>
            <dte:CodigoPostal>01001</dte:CodigoPostal>
            <dte:Municipio>Guatemala</dte:Municipio>
            <dte:Departamento>Guatemala</dte:Departamento>
            <dte:Pais>GT</dte:Pais>
          </dte:DireccionEmisor>
        </dte:Emisor>

        <dte:Receptor 
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

        <dte:Frases>
          <dte:Frase CodigoEscenario="2" TipoFrase="1"/>
        </dte:Frases>

        <dte:Items>
          <dte:Item BienOServicio="B" NumeroLinea="1">
            <dte:Cantidad>1.00</dte:Cantidad>
            <dte:UnidadMedida>UNI</dte:UnidadMedida>
            <dte:Descripcion>Servicio de Agua Potable</dte:Descripcion>
            <dte:PrecioUnitario>100.00</dte:PrecioUnitario>
            <dte:Precio>100.00</dte:Precio>
            <dte:Descuento>0.00</dte:Descuento>
            <dte:Total>100.00</dte:Total>
          </dte:Item>
        </dte:Items>

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
</gte:GTDocumento>
```

### 5. Frases Tributarias para Agua

**Recomendado:**
```xml
<dte:Frase CodigoEscenario="2" TipoFrase="1"/>
<!-- "Sujeto a retención definitiva ISR" -->
```

### 6. Diseños de PDF Recomendados

- **Diseño C1**: Clásico, profesional
- **Diseño C4**: Moderno con color
- **Diseño MC17/MC18**: Formato ticket

Ver catálogo completo en `Catálogo_Plantillas_FEL_Guatemala_2024.pdf`

## 📞 CONTACTO

**Asesora:** Stephanie Montoya  
**Email:** implementaciones10@infile.com  
**Ticket:** #31914753673

## ✅ CHECKLIST RÁPIDO

```
[ ] Configurar .env con credenciales
[ ] Instalar xml2js, uuid, axios
[ ] Implementar construirXMLFactura()
[ ] Implementar certificarFactura()
[ ] Probar certificación con factura de prueba
[ ] Implementar consultarNIT()
[ ] Implementar consultarCUI()
[ ] Seleccionar diseño de PDF
[ ] Pruebas exhaustivas
[ ] Solicitar credenciales de producción
```

## 🎯 PRIMER OBJETIVO

**Certificar tu primera factura de prueba esta semana:**

1. Implementar `construirXMLFactura()` con los datos de ejemplo
2. Implementar `certificarFactura()` usando las credenciales de sandbox
3. Probar con una factura simple de Q100.00
4. Verificar que recibas UUID de certificación

## 📚 DOCUMENTACIÓN COMPLETA

Ver archivo: `ANALISIS_IMPLEMENTACION_FEL.md`
