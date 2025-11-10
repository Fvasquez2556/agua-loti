/**
 * Servicio de Integración con Infile para Certificación FEL
 * Sistema de Agua LOTI - Huehuetenango, Guatemala
 *
 * Tipos de Documentos Implementados:
 * - FACT: Factura Local
 * - NCRE: Nota de Crédito
 * - NDEB: Nota de Débito
 * - RECI: Recibo
 */

const axios = require('axios');
const xml2js = require('xml2js');
const { v4: uuidv4 } = require('uuid');

class InfileService {
  constructor() {
    // Configuración de URLs según ambiente
    this.baseURL = process.env.FEL_AMBIENTE === 'produccion'
      ? 'https://felgttestaws.digifact.com.gt/gt.com.fel.api.v3/api'
      : 'https://felgttestaws.digifact.com.gt/gt.com.fel.api.v3/api';

    // Credenciales de Infile
    this.credentials = {
      nit: process.env.FEL_NIT || null,
      usuario: process.env.FEL_USUARIO || null,
      clave: process.env.FEL_CLAVE || null,
      token: process.env.FEL_TOKEN || null
    };

    // Datos del emisor (Sistema de Agua LOTI)
    this.emisor = {
      nit: process.env.FEL_NIT || null,
      nombre: 'SISTEMA DE AGUA LOTI',
      nombreComercial: 'Agua LOTI',
      direccion: {
        direccion: 'Huehuetenango, Guatemala',
        codigoPostal: '13001',
        municipio: 'Huehuetenango',
        departamento: 'Huehuetenango',
        pais: 'GT'
      }
    };

    // Configuración
    this.maxReintentos = 3;
    this.tiempoEsperaBase = 2000;
    this.habilitado = process.env.INFILE_ENABLED === 'true';

    console.log(`📄 Servicio Infile FEL ${this.habilitado ? 'HABILITADO' : 'DESHABILITADO'}`);
    console.log(`   Ambiente: ${process.env.FEL_AMBIENTE || 'sandbox'}`);
  }

  /**
   * Verifica si el servicio está configurado correctamente
   */
  estaConfigurado() {
    return !!(
      this.credentials.nit &&
      this.credentials.usuario &&
      this.credentials.clave &&
      this.credentials.token &&
      this.habilitado
    );
  }

  /**
   * Autenticarse con Infile
   */
  async autenticar() {
    try {
      const response = await axios.post(`${this.baseURL}/login`, {
        Usuario: this.credentials.usuario,
        Clave: this.credentials.clave
      });

      if (response.data && response.data.Token) {
        return response.data.Token;
      }

      throw new Error('No se recibió token de autenticación');
    } catch (error) {
      console.error('❌ Error al autenticar con Infile:', error.message);
      throw error;
    }
  }

  /**
   * Certificar documento con Infile (genérico para todos los tipos)
   * @param {String} tipoDocumento - FACT, NCRE, NDEB, RECI
   * @param {Object} datos - Datos del documento
   * @returns {Promise<Object>} Resultado de la certificación
   */
  async certificarDocumento(tipoDocumento, datos) {
    if (!this.estaConfigurado()) {
      return {
        exitoso: false,
        mensaje: 'Servicio FEL no configurado. Configura credenciales en .env'
      };
    }

    try {
      console.log(`📄 Certificando documento tipo: ${tipoDocumento}`);

      // 1. Generar UUID único
      const uuid = uuidv4();

      // 2. Generar XML según tipo de documento
      let xml;
      switch (tipoDocumento) {
        case 'FACT':
          xml = this.generarXMLFactura(datos, uuid);
          break;
        case 'NCRE':
          xml = this.generarXMLNotaCredito(datos, uuid);
          break;
        case 'NDEB':
          xml = this.generarXMLNotaDebito(datos, uuid);
          break;
        case 'RECI':
          xml = this.generarXMLRecibo(datos, uuid);
          break;
        default:
          throw new Error(`Tipo de documento no soportado: ${tipoDocumento}`);
      }

      // 3. Autenticar con Infile
      const token = await this.autenticar();

      // 4. Enviar XML para certificación
      const response = await axios.post(
        `${this.baseURL}/FelRequest`,
        {
          NIT: this.credentials.nit,
          TIPO: tipoDocumento,
          XML: xml,
          USUARIO: this.credentials.usuario
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // 5. Procesar respuesta
      if (response.data && response.data.Resultado === true) {
        console.log(`✅ Documento ${tipoDocumento} certificado exitosamente`);

        return {
          exitoso: true,
          uuid: response.data.UUID || uuid,
          numeroAutorizacion: response.data.Autorizacion,
          serie: response.data.Serie,
          numero: response.data.Numero,
          fechaCertificacion: new Date(response.data.Fecha),
          xmlCertificado: response.data.XML_CERTIFICADO
        };
      } else {
        throw new Error(response.data.Descripcion || 'Error desconocido en certificación');
      }

    } catch (error) {
      console.error(`❌ Error al certificar documento ${tipoDocumento}:`, error.message);
      return {
        exitoso: false,
        mensaje: error.message,
        detalles: error.response?.data || null
      };
    }
  }

  /**
   * Generar XML para Factura Local (FACT)
   */
  generarXMLFactura(factura, uuid) {
    const fechaEmision = new Date(factura.fechaEmision);
    const fechaISO = fechaEmision.toISOString();

    // Cliente
    const cliente = factura.clienteId;
    const nitCliente = cliente.dpi || 'CF'; // Si no tiene NIT/DPI, usar CF (Consumidor Final)

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dte:GTDocumento xmlns:dte="http://www.sat.gob.gt/dte/fel/0.2.0" Version="0.1">
  <dte:SAT ClaseDocumento="dte">
    <dte:DTE ID="DatosCertificados">
      <dte:DatosEmision ID="DatosEmision">
        <dte:DatosGenerales Tipo="FACT" FechaHoraEmision="${fechaISO}" CodigoMoneda="GTQ"/>
        <dte:Emisor NITEmisor="${this.emisor.nit}" NombreEmisor="${this.emisor.nombre}" CodigoEstablecimiento="1" NombreComercial="${this.emisor.nombreComercial}" AfiliacionIVA="GEN">
          <dte:DireccionEmisor>
            <dte:Direccion>${this.emisor.direccion.direccion}</dte:Direccion>
            <dte:CodigoPostal>${this.emisor.direccion.codigoPostal}</dte:CodigoPostal>
            <dte:Municipio>${this.emisor.direccion.municipio}</dte:Municipio>
            <dte:Departamento>${this.emisor.direccion.departamento}</dte:Departamento>
            <dte:Pais>${this.emisor.direccion.pais}</dte:Pais>
          </dte:DireccionEmisor>
        </dte:Emisor>
        <dte:Receptor IDReceptor="${nitCliente}" NombreReceptor="${cliente.nombres} ${cliente.apellidos}">
          <dte:DireccionReceptor>
            <dte:Direccion>Proyecto ${cliente.proyecto}, Lote ${cliente.lote}</dte:Direccion>
            <dte:CodigoPostal>13001</dte:CodigoPostal>
            <dte:Municipio>Huehuetenango</dte:Municipio>
            <dte:Departamento>Huehuetenango</dte:Departamento>
            <dte:Pais>GT</dte:Pais>
          </dte:DireccionReceptor>
        </dte:Receptor>
        <dte:Items>
          <dte:Item NumeroLinea="1" BienOServicio="S">
            <dte:Cantidad>1</dte:Cantidad>
            <dte:UnidadMedida>UND</dte:UnidadMedida>
            <dte:Descripcion>Servicio de Agua - Contador ${cliente.contador} - Periodo ${this.formatearPeriodo(factura)}</dte:Descripcion>
            <dte:PrecioUnitario>${factura.subtotalSinIVA.toFixed(2)}</dte:PrecioUnitario>
            <dte:Precio>${factura.subtotalSinIVA.toFixed(2)}</dte:Precio>
            <dte:Descuento>0.00</dte:Descuento>
            <dte:Impuestos>
              <dte:Impuesto>
                <dte:NombreCorto>IVA</dte:NombreCorto>
                <dte:CodigoUnidadGravable>1</dte:CodigoUnidadGravable>
                <dte:MontoGravable>${factura.subtotalSinIVA.toFixed(2)}</dte:MontoGravable>
                <dte:MontoImpuesto>${factura.montoIVA.toFixed(2)}</dte:MontoImpuesto>
              </dte:Impuesto>
            </dte:Impuestos>
            <dte:Total>${factura.montoTotal.toFixed(2)}</dte:Total>
          </dte:Item>
        </dte:Items>
        <dte:Totales>
          <dte:TotalImpuestos>
            <dte:TotalImpuesto NombreCorto="IVA" TotalMontoImpuesto="${factura.montoIVA.toFixed(2)}"/>
          </dte:TotalImpuestos>
          <dte:GranTotal>${factura.montoTotal.toFixed(2)}</dte:GranTotal>
        </dte:Totales>
      </dte:DatosEmision>
    </dte:DTE>
  </dte:SAT>
</dte:GTDocumento>`;

    return xml;
  }

  /**
   * Generar XML para Nota de Crédito (NCRE)
   */
  generarXMLNotaCredito(nota, uuid) {
    const fechaEmision = new Date(nota.fechaEmision);
    const fechaISO = fechaEmision.toISOString();

    const cliente = nota.clienteId;
    const nitCliente = cliente.dpi || 'CF';

    // Nota de crédito siempre referencia a una factura original
    const facturaOriginal = nota.facturaReferenciaId;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dte:GTDocumento xmlns:dte="http://www.sat.gob.gt/dte/fel/0.2.0" Version="0.1">
  <dte:SAT ClaseDocumento="dte">
    <dte:DTE ID="DatosCertificados">
      <dte:DatosEmision ID="DatosEmision">
        <dte:DatosGenerales Tipo="NCRE" FechaHoraEmision="${fechaISO}" CodigoMoneda="GTQ"/>
        <dte:Emisor NITEmisor="${this.emisor.nit}" NombreEmisor="${this.emisor.nombre}" CodigoEstablecimiento="1" NombreComercial="${this.emisor.nombreComercial}" AfiliacionIVA="GEN">
          <dte:DireccionEmisor>
            <dte:Direccion>${this.emisor.direccion.direccion}</dte:Direccion>
            <dte:CodigoPostal>${this.emisor.direccion.codigoPostal}</dte:CodigoPostal>
            <dte:Municipio>${this.emisor.direccion.municipio}</dte:Municipio>
            <dte:Departamento>${this.emisor.direccion.departamento}</dte:Departamento>
            <dte:Pais>${this.emisor.direccion.pais}</dte:Pais>
          </dte:DireccionEmisor>
        </dte:Emisor>
        <dte:Receptor IDReceptor="${nitCliente}" NombreReceptor="${cliente.nombres} ${cliente.apellidos}">
          <dte:DireccionReceptor>
            <dte:Direccion>Proyecto ${cliente.proyecto}, Lote ${cliente.lote}</dte:Direccion>
            <dte:CodigoPostal>13001</dte:CodigoPostal>
            <dte:Municipio>Huehuetenango</dte:Municipio>
            <dte:Departamento>Huehuetenango</dte:Departamento>
            <dte:Pais>GT</dte:Pais>
          </dte:DireccionReceptor>
        </dte:Receptor>
        <dte:Items>
          <dte:Item NumeroLinea="1" BienOServicio="S">
            <dte:Cantidad>1</dte:Cantidad>
            <dte:UnidadMedida>UND</dte:UnidadMedida>
            <dte:Descripcion>Nota de Crédito - ${nota.observaciones || 'Anulación/Devolución'}</dte:Descripcion>
            <dte:PrecioUnitario>${Math.abs(nota.subtotalSinIVA).toFixed(2)}</dte:PrecioUnitario>
            <dte:Precio>${Math.abs(nota.subtotalSinIVA).toFixed(2)}</dte:Precio>
            <dte:Descuento>0.00</dte:Descuento>
            <dte:Impuestos>
              <dte:Impuesto>
                <dte:NombreCorto>IVA</dte:NombreCorto>
                <dte:CodigoUnidadGravable>1</dte:CodigoUnidadGravable>
                <dte:MontoGravable>${Math.abs(nota.subtotalSinIVA).toFixed(2)}</dte:MontoGravable>
                <dte:MontoImpuesto>${Math.abs(nota.montoIVA).toFixed(2)}</dte:MontoImpuesto>
              </dte:Impuesto>
            </dte:Impuestos>
            <dte:Total>${Math.abs(nota.montoTotal).toFixed(2)}</dte:Total>
          </dte:Item>
        </dte:Items>
        <dte:Totales>
          <dte:TotalImpuestos>
            <dte:TotalImpuesto NombreCorto="IVA" TotalMontoImpuesto="${Math.abs(nota.montoIVA).toFixed(2)}"/>
          </dte:TotalImpuestos>
          <dte:GranTotal>${Math.abs(nota.montoTotal).toFixed(2)}</dte:GranTotal>
        </dte:Totales>
        ${facturaOriginal ? `
        <dte:Complementos>
          <dte:Complemento IDComplemento="ReferenciasNota" NombreComplemento="Nota de Credito" URIComplemento="http://www.sat.gob.gt/fel/notas.xsd">
            <cno:ReferenciasNota xmlns:cno="http://www.sat.gob.gt/face2/ComplementoReferenciaNota/0.1.0" FechaEmisionDocumentoOrigen="${facturaOriginal.fechaEmision}" MotivoAjuste="Anulación/Devolución" NumeroAutorizacionDocumentoOrigen="${facturaOriginal.numeroAutorizacionFEL || 'N/A'}" NumeroDocumentoOrigen="${facturaOriginal.numeroFactura}" Serie="A" Version="0.0"/>
          </dte:Complemento>
        </dte:Complementos>
        ` : ''}
      </dte:DatosEmision>
    </dte:DTE>
  </dte:SAT>
</dte:GTDocumento>`;

    return xml;
  }

  /**
   * Generar XML para Nota de Débito (NDEB)
   */
  generarXMLNotaDebito(nota, uuid) {
    const fechaEmision = new Date(nota.fechaEmision);
    const fechaISO = fechaEmision.toISOString();

    const cliente = nota.clienteId;
    const nitCliente = cliente.dpi || 'CF';

    const facturaOriginal = nota.facturaReferenciaId;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dte:GTDocumento xmlns:dte="http://www.sat.gob.gt/dte/fel/0.2.0" Version="0.1">
  <dte:SAT ClaseDocumento="dte">
    <dte:DTE ID="DatosCertificados">
      <dte:DatosEmision ID="DatosEmision">
        <dte:DatosGenerales Tipo="NDEB" FechaHoraEmision="${fechaISO}" CodigoMoneda="GTQ"/>
        <dte:Emisor NITEmisor="${this.emisor.nit}" NombreEmisor="${this.emisor.nombre}" CodigoEstablecimiento="1" NombreComercial="${this.emisor.nombreComercial}" AfiliacionIVA="GEN">
          <dte:DireccionEmisor>
            <dte:Direccion>${this.emisor.direccion.direccion}</dte:Direccion>
            <dte:CodigoPostal>${this.emisor.direccion.codigoPostal}</dte:CodigoPostal>
            <dte:Municipio>${this.emisor.direccion.municipio}</dte:Municipio>
            <dte:Departamento>${this.emisor.direccion.departamento}</dte:Departamento>
            <dte:Pais>${this.emisor.direccion.pais}</dte:Pais>
          </dte:DireccionEmisor>
        </dte:Emisor>
        <dte:Receptor IDReceptor="${nitCliente}" NombreReceptor="${cliente.nombres} ${cliente.apellidos}">
          <dte:DireccionReceptor>
            <dte:Direccion>Proyecto ${cliente.proyecto}, Lote ${cliente.lote}</dte:Direccion>
            <dte:CodigoPostal>13001</dte:CodigoPostal>
            <dte:Municipio>Huehuetenango</dte:Municipio>
            <dte:Departamento>Huehuetenango</dte:Departamento>
            <dte:Pais>GT</dte:Pais>
          </dte:DireccionReceptor>
        </dte:Receptor>
        <dte:Items>
          <dte:Item NumeroLinea="1" BienOServicio="S">
            <dte:Cantidad>1</dte:Cantidad>
            <dte:UnidadMedida>UND</dte:UnidadMedida>
            <dte:Descripcion>Nota de Débito - ${nota.observaciones || 'Cargo adicional'}</dte:Descripcion>
            <dte:PrecioUnitario>${nota.subtotalSinIVA.toFixed(2)}</dte:PrecioUnitario>
            <dte:Precio>${nota.subtotalSinIVA.toFixed(2)}</dte:Precio>
            <dte:Descuento>0.00</dte:Descuento>
            <dte:Impuestos>
              <dte:Impuesto>
                <dte:NombreCorto>IVA</dte:NombreCorto>
                <dte:CodigoUnidadGravable>1</dte:CodigoUnidadGravable>
                <dte:MontoGravable>${nota.subtotalSinIVA.toFixed(2)}</dte:MontoGravable>
                <dte:MontoImpuesto>${nota.montoIVA.toFixed(2)}</dte:MontoImpuesto>
              </dte:Impuesto>
            </dte:Impuestos>
            <dte:Total>${nota.montoTotal.toFixed(2)}</dte:Total>
          </dte:Item>
        </dte:Items>
        <dte:Totales>
          <dte:TotalImpuestos>
            <dte:TotalImpuesto NombreCorto="IVA" TotalMontoImpuesto="${nota.montoIVA.toFixed(2)}"/>
          </dte:TotalImpuestos>
          <dte:GranTotal>${nota.montoTotal.toFixed(2)}</dte:GranTotal>
        </dte:Totales>
        ${facturaOriginal ? `
        <dte:Complementos>
          <dte:Complemento IDComplemento="ReferenciasNota" NombreComplemento="Nota de Debito" URIComplemento="http://www.sat.gob.gt/fel/notas.xsd">
            <cno:ReferenciasNota xmlns:cno="http://www.sat.gob.gt/face2/ComplementoReferenciaNota/0.1.0" FechaEmisionDocumentoOrigen="${facturaOriginal.fechaEmision}" MotivoAjuste="Cargo adicional" NumeroAutorizacionDocumentoOrigen="${facturaOriginal.numeroAutorizacionFEL || 'N/A'}" NumeroDocumentoOrigen="${facturaOriginal.numeroFactura}" Serie="A" Version="0.0"/>
          </dte:Complemento>
        </dte:Complementos>
        ` : ''}
      </dte:DatosEmision>
    </dte:DTE>
  </dte:SAT>
</dte:GTDocumento>`;

    return xml;
  }

  /**
   * Generar XML para Recibo (RECI)
   */
  generarXMLRecibo(pago, uuid) {
    const fechaPago = new Date(pago.fechaPago);
    const fechaISO = fechaPago.toISOString();

    const cliente = pago.clienteId;
    const nitCliente = cliente.dpi || 'CF';

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dte:GTDocumento xmlns:dte="http://www.sat.gob.gt/dte/fel/0.2.0" Version="0.1">
  <dte:SAT ClaseDocumento="dte">
    <dte:DTE ID="DatosCertificados">
      <dte:DatosEmision ID="DatosEmision">
        <dte:DatosGenerales Tipo="RECI" FechaHoraEmision="${fechaISO}" CodigoMoneda="GTQ"/>
        <dte:Emisor NITEmisor="${this.emisor.nit}" NombreEmisor="${this.emisor.nombre}" CodigoEstablecimiento="1" NombreComercial="${this.emisor.nombreComercial}" AfiliacionIVA="GEN">
          <dte:DireccionEmisor>
            <dte:Direccion>${this.emisor.direccion.direccion}</dte:Direccion>
            <dte:CodigoPostal>${this.emisor.direccion.codigoPostal}</dte:CodigoPostal>
            <dte:Municipio>${this.emisor.direccion.municipio}</dte:Municipio>
            <dte:Departamento>${this.emisor.direccion.departamento}</dte:Departamento>
            <dte:Pais>${this.emisor.direccion.pais}</dte:Pais>
          </dte:DireccionEmisor>
        </dte:Emisor>
        <dte:Receptor IDReceptor="${nitCliente}" NombreReceptor="${cliente.nombres} ${cliente.apellidos}">
          <dte:DireccionReceptor>
            <dte:Direccion>Proyecto ${cliente.proyecto}, Lote ${cliente.lote}</dte:Direccion>
            <dte:CodigoPostal>13001</dte:CodigoPostal>
            <dte:Municipio>Huehuetenango</dte:Municipio>
            <dte:Departamento>Huehuetenango</dte:Departamento>
            <dte:Pais>GT</dte:Pais>
          </dte:DireccionReceptor>
        </dte:Receptor>
        <dte:Items>
          <dte:Item NumeroLinea="1" BienOServicio="S">
            <dte:Cantidad>1</dte:Cantidad>
            <dte:UnidadMedida>UND</dte:UnidadMedida>
            <dte:Descripcion>Pago Recibido - Recibo ${pago.numeroPago}${pago.facturaId ? ` - Factura ${pago.facturaId.numeroFactura}` : ''}</dte:Descripcion>
            <dte:PrecioUnitario>${(pago.montoPagado / 1.12).toFixed(2)}</dte:PrecioUnitario>
            <dte:Precio>${(pago.montoPagado / 1.12).toFixed(2)}</dte:Precio>
            <dte:Descuento>0.00</dte:Descuento>
            <dte:Impuestos>
              <dte:Impuesto>
                <dte:NombreCorto>IVA</dte:NombreCorto>
                <dte:CodigoUnidadGravable>1</dte:CodigoUnidadGravable>
                <dte:MontoGravable>${(pago.montoPagado / 1.12).toFixed(2)}</dte:MontoGravable>
                <dte:MontoImpuesto>${(pago.montoPagado - (pago.montoPagado / 1.12)).toFixed(2)}</dte:MontoImpuesto>
              </dte:Impuesto>
            </dte:Impuestos>
            <dte:Total>${pago.montoPagado.toFixed(2)}</dte:Total>
          </dte:Item>
        </dte:Items>
        <dte:Totales>
          <dte:TotalImpuestos>
            <dte:TotalImpuesto NombreCorto="IVA" TotalMontoImpuesto="${(pago.montoPagado - (pago.montoPagado / 1.12)).toFixed(2)}"/>
          </dte:TotalImpuestos>
          <dte:GranTotal>${pago.montoPagado.toFixed(2)}</dte:GranTotal>
        </dte:Totales>
      </dte:DatosEmision>
    </dte:DTE>
  </dte:SAT>
</dte:GTDocumento>`;

    return xml;
  }

  /**
   * Anular documento FEL
   */
  async anularDocumento(uuid, numeroAutorizacion, motivo) {
    if (!this.estaConfigurado()) {
      return {
        exitoso: false,
        mensaje: 'Servicio FEL no configurado'
      };
    }

    try {
      console.log(`🗑️ Anulando documento FEL: ${uuid}`);

      const token = await this.autenticar();

      const response = await axios.post(
        `${this.baseURL}/AnularDocumento`,
        {
          NIT: this.credentials.nit,
          UUID: uuid,
          MOTIVO: motivo,
          USUARIO: this.credentials.usuario
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.Resultado === true) {
        console.log(`✅ Documento anulado exitosamente: ${uuid}`);
        return {
          exitoso: true,
          mensaje: 'Documento anulado correctamente',
          fechaAnulacion: new Date()
        };
      } else {
        throw new Error(response.data.Descripcion || 'Error al anular documento');
      }

    } catch (error) {
      console.error('❌ Error al anular documento:', error.message);
      return {
        exitoso: false,
        mensaje: error.message,
        detalles: error.response?.data || null
      };
    }
  }

  /**
   * Obtener estado de un documento FEL
   */
  async consultarEstadoDocumento(uuid) {
    if (!this.estaConfigurado()) {
      return {
        exitoso: false,
        mensaje: 'Servicio FEL no configurado'
      };
    }

    try {
      const token = await this.autenticar();

      const response = await axios.get(
        `${this.baseURL}/ConsultarDocumento`,
        {
          params: {
            NIT: this.credentials.nit,
            UUID: uuid
          },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data) {
        return {
          exitoso: true,
          estado: response.data.Estado,
          datos: response.data
        };
      }

      throw new Error('No se pudo consultar el estado del documento');

    } catch (error) {
      console.error('❌ Error al consultar estado:', error.message);
      return {
        exitoso: false,
        mensaje: error.message
      };
    }
  }

  /**
   * Formatear período de factura
   */
  formatearPeriodo(factura) {
    const inicio = new Date(factura.periodoInicio);
    const fin = new Date(factura.periodoFin);

    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    return `${meses[inicio.getMonth()]} ${inicio.getFullYear()}`;
  }

  /**
   * Obtener estado del servicio
   */
  obtenerEstado() {
    return {
      configurado: this.estaConfigurado(),
      habilitado: this.habilitado,
      ambiente: process.env.FEL_AMBIENTE || 'sandbox',
      nit: this.credentials.nit || 'No configurado'
    };
  }
}

module.exports = new InfileService();
