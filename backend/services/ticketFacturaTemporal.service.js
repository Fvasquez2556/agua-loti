/**
 * Servicio para generar tickets temporales de facturas pendientes
 * Estos tickets se generan cuando se crea una factura y se eliminan al pagar
 * Sistema de Agua LOTI - Huehuetenango, Guatemala
 */

// Imports
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Models
const Factura = require('../models/factura.model');
const Cliente = require('../models/cliente.model');

class TicketFacturaTemporalService {
  /**
   * Constructor del servicio
   */
  constructor() {
    // Configuración de dimensiones (ticket térmico 80mm)
    this.anchoTicket = 226.77;
    this.margen = 14.17;
    this.anchoContenido = this.anchoTicket - (this.margen * 2);

    // Configuración de fuentes
    this.fuentePrincipal = 'Courier';
    this.tamanoFuenteNormal = 9;
    this.tamanoFuentePequeno = 7;
    this.tamanoFuenteGrande = 11;
    this.tamanoFuenteTitulo = 13;

    // Secreto para hash
    this.secretoHash = process.env.TICKET_SECRET || 'agua-loti-2025-ticket-secret';
  }

  /**
   * Genera un ticket temporal para una factura pendiente
   * @param {string} facturaId - ID de la factura
   * @returns {Promise<Object>} Resultado de la operación
   */
  async generarTicketTemporal(facturaId) {
    try {
      // 1. Obtener datos de la factura
      const factura = await Factura.findById(facturaId)
        .populate('clienteId', 'nombres apellidos dpi contador lote proyecto correoElectronico whatsapp');

      if (!factura) {
        return {
          exitoso: false,
          mensaje: 'Factura no encontrada',
          rutaArchivo: null,
          nombreArchivo: null
        };
      }

      // 2. Validar que la factura está pendiente
      if (factura.estado !== 'pendiente') {
        return {
          exitoso: false,
          mensaje: 'Solo se pueden generar tickets temporales para facturas pendientes',
          rutaArchivo: null,
          nombreArchivo: null
        };
      }

      // 3. Preparar directorio de almacenamiento
      const fechaEmision = new Date(factura.fechaEmision);
      const anio = fechaEmision.getFullYear();
      const mes = String(fechaEmision.getMonth() + 1).padStart(2, '0');
      const directorioTemporales = this.asegurarDirectorioTemporales(anio, mes);

      // 4. Generar nombre de archivo
      const fechaFormateada = `${anio}${mes}${String(fechaEmision.getDate()).padStart(2, '0')}`;
      const nombreArchivo = `FACTURA-TEMP-${factura.numeroFactura}-${fechaFormateada}.pdf`;
      const rutaCompleta = path.join(directorioTemporales, nombreArchivo);

      // 5. Generar código QR con información de la factura
      const datosQR = {
        numeroFactura: factura.numeroFactura,
        fecha: factura.fechaEmision.toISOString(),
        monto: factura.montoTotal,
        estado: factura.estado,
        hash: this.crearHashVerificacion({
          numeroFactura: factura.numeroFactura,
          fecha: factura.fechaEmision,
          monto: factura.montoTotal
        })
      };
      const bufferQR = await this.generarCodigoQR(datosQR);

      // 6. Crear el documento PDF
      const doc = new PDFDocument({
        size: [this.anchoTicket, 841.89],
        margins: {
          top: this.margen,
          bottom: this.margen,
          left: this.margen,
          right: this.margen
        }
      });

      // 7. Crear stream de escritura
      const stream = fs.createWriteStream(rutaCompleta);
      doc.pipe(stream);

      // 8. Generar contenido del ticket
      await this.generarContenidoTicket(doc, factura, bufferQR);

      // 9. Finalizar documento
      doc.end();

      // 10. Esperar a que se complete la escritura
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      console.log(`✅ Ticket temporal generado: ${nombreArchivo}`);

      return {
        exitoso: true,
        mensaje: 'Ticket temporal generado exitosamente',
        rutaArchivo: rutaCompleta,
        nombreArchivo: nombreArchivo
      };

    } catch (error) {
      console.error('Error al generar ticket temporal:', error);
      return {
        exitoso: false,
        mensaje: `Error al generar ticket temporal: ${error.message}`,
        rutaArchivo: null,
        nombreArchivo: null
      };
    }
  }

  /**
   * Genera el contenido del ticket temporal
   * @private
   */
  async generarContenidoTicket(doc, factura, bufferQR) {
    let y = doc.y;
    const cliente = factura.clienteId;

    // HEADER
    doc.font(this.fuentePrincipal)
       .fontSize(this.tamanoFuenteTitulo)
       .text('SISTEMA DE AGUA LOTI', this.margen, y, {
         width: this.anchoContenido,
         align: 'center'
       });

    y = doc.y + 5;
    doc.fontSize(this.tamanoFuenteNormal)
       .text('Huehuetenango, Guatemala', this.margen, y, {
         width: this.anchoContenido,
         align: 'center'
       });

    y = doc.y + 15;
    doc.moveTo(this.margen, y).lineTo(this.anchoTicket - this.margen, y).stroke();
    y += 15;

    // TÍTULO
    doc.fontSize(this.tamanoFuenteGrande)
       .text('FACTURA PENDIENTE DE PAGO', this.margen, y, {
         width: this.anchoContenido,
         align: 'center'
       });

    y = doc.y + 5;

    doc.fontSize(this.tamanoFuentePequeno)
       .text('(Documento Temporal)', this.margen, y, {
         width: this.anchoContenido,
         align: 'center'
       });

    y = doc.y + 10;

    // Información de la factura
    doc.fontSize(this.tamanoFuenteNormal);
    doc.text(`No. Factura: ${factura.numeroFactura}`, this.margen, y);
    y = doc.y + 3;

    const fechaEmision = this.formatearFecha(factura.fechaEmision);
    doc.text(`Fecha Emisión: ${fechaEmision}`, this.margen, y);
    y = doc.y + 3;

    const fechaVencimiento = this.formatearFecha(factura.fechaVencimiento);
    doc.text(`Vencimiento: ${fechaVencimiento}`, this.margen, y);
    y = doc.y + 10;

    doc.moveTo(this.margen, y).lineTo(this.anchoTicket - this.margen, y).stroke();
    y += 12;

    // DATOS DEL CLIENTE
    doc.fontSize(this.tamanoFuenteNormal).text('DATOS DEL CLIENTE', this.margen, y);
    y = doc.y + 5;

    doc.text(`Cliente: ${cliente.nombres} ${cliente.apellidos}`, this.margen, y);
    y = doc.y + 3;
    doc.text(`DPI: ${cliente.dpi}`, this.margen, y);
    y = doc.y + 3;
    doc.text(`Contador: ${cliente.contador}`, this.margen, y);
    y = doc.y + 3;
    doc.text(`Lote: ${cliente.lote}`, this.margen, y);
    y = doc.y + 3;
    doc.text(`Proyecto: ${this.formatearNombreProyecto(cliente.proyecto)}`, this.margen, y);
    y = doc.y + 10;

    // DETALLE DE CONSUMO
    doc.fontSize(this.tamanoFuenteNormal).text('DETALLE DE CONSUMO', this.margen, y);
    y = doc.y + 5;

    const periodo = `${this.formatearFecha(factura.periodoInicio)} - ${this.formatearFecha(factura.periodoFin)}`;
    doc.text(`Período: ${periodo}`, this.margen, y);
    y = doc.y + 3;

    doc.text(`Lectura Anterior: ${factura.lecturaAnterior} L`, this.margen, y);
    y = doc.y + 3;
    doc.text(`Lectura Actual: ${factura.lecturaActual} L`, this.margen, y);
    y = doc.y + 3;
    doc.text(`Consumo: ${factura.consumoLitros} L`, this.margen, y);
    y = doc.y + 10;

    // DESGLOSE DEL MONTO
    doc.fontSize(this.tamanoFuenteNormal).text('DESGLOSE DEL MONTO', this.margen, y);
    y = doc.y + 5;

    this.imprimirLineaConValor(doc, 'Tarifa Base:', `Q ${this.formatearMonto(factura.tarifaBase)}`, y);
    y = doc.y + 3;

    if (factura.excedenteLitros > 0) {
      this.imprimirLineaConValor(doc, 'Excedente:', `Q ${this.formatearMonto(factura.costoExcedente)}`, y);
      y = doc.y + 3;
    }

    y = doc.y + 5;

    // Línea doble
    doc.moveTo(this.margen, y).lineTo(this.anchoTicket - this.margen, y).stroke();
    doc.moveTo(this.margen, y + 2).lineTo(this.anchoTicket - this.margen, y + 2).stroke();
    y += 10;

    // TOTAL A PAGAR
    doc.fontSize(this.tamanoFuenteGrande);
    this.imprimirLineaConValor(doc, 'TOTAL A PAGAR:', `Q ${this.formatearMonto(factura.montoTotal)}`, y);

    y = doc.y + 12;

    // Advertencia de documento temporal
    doc.fontSize(this.tamanoFuentePequeno);
    doc.fillColor('#CC0000');
    doc.text('⚠ ADVERTENCIA:', this.margen, y, {
      width: this.anchoContenido,
      align: 'center'
    });
    y = doc.y + 3;

    doc.text('Este es un documento temporal.', this.margen, y, {
      width: this.anchoContenido,
      align: 'center'
    });
    y = doc.y + 3;

    doc.text('Se generará recibo oficial al realizar el pago.', this.margen, y, {
      width: this.anchoContenido,
      align: 'center'
    });

    doc.fillColor('#000000');
    y = doc.y + 10;

    // CÓDIGO QR
    doc.fontSize(this.tamanoFuentePequeno)
       .text('CÓDIGO DE VERIFICACIÓN', this.margen, y, {
         width: this.anchoContenido,
         align: 'center'
       });

    y = doc.y + 5;

    const tamanoQR = 84.92;
    const xQR = (this.anchoTicket - tamanoQR) / 2;

    doc.image(bufferQR, xQR, y, {
      width: tamanoQR,
      height: tamanoQR
    });

    y += tamanoQR + 10;

    // FOOTER
    doc.moveTo(this.margen, y).lineTo(this.anchoTicket - this.margen, y).stroke();
    y += 10;

    doc.fontSize(this.tamanoFuenteNormal)
       .text('Por favor, conserve este documento', this.margen, y, {
         width: this.anchoContenido,
         align: 'center'
       });

    y = doc.y + 5;

    const fechaHora = this.formatearFechaHora(new Date());
    doc.fontSize(this.tamanoFuentePequeno)
       .text(`Generado: ${fechaHora}`, this.margen, y, {
         width: this.anchoContenido,
         align: 'center'
       });

    y = doc.y + 3;

    doc.text('Sistema de Agua LOTI v2.0', this.margen, y, {
      width: this.anchoContenido,
      align: 'center'
    });
  }

  /**
   * Eliminar ticket temporal de una factura
   * @param {string} facturaId - ID de la factura
   * @returns {Promise<Object>} Resultado de la operación
   */
  async eliminarTicketTemporal(facturaId) {
    try {
      const factura = await Factura.findById(facturaId);

      if (!factura) {
        return {
          exitoso: false,
          mensaje: 'Factura no encontrada'
        };
      }

      // Buscar archivo temporal
      const fechaEmision = new Date(factura.fechaEmision);
      const anio = fechaEmision.getFullYear();
      const mes = String(fechaEmision.getMonth() + 1).padStart(2, '0');
      const directorioTemporales = this.asegurarDirectorioTemporales(anio, mes);

      const fechaFormateada = `${anio}${mes}${String(fechaEmision.getDate()).padStart(2, '0')}`;
      const nombreArchivo = `FACTURA-TEMP-${factura.numeroFactura}-${fechaFormateada}.pdf`;
      const rutaCompleta = path.join(directorioTemporales, nombreArchivo);

      // Verificar si el archivo existe
      if (fs.existsSync(rutaCompleta)) {
        // Eliminar archivo
        fs.unlinkSync(rutaCompleta);
        console.log(`🗑️ Ticket temporal eliminado: ${nombreArchivo}`);

        return {
          exitoso: true,
          mensaje: 'Ticket temporal eliminado correctamente'
        };
      } else {
        return {
          exitoso: false,
          mensaje: 'Ticket temporal no encontrado'
        };
      }

    } catch (error) {
      console.error('Error al eliminar ticket temporal:', error);
      return {
        exitoso: false,
        mensaje: `Error al eliminar ticket temporal: ${error.message}`
      };
    }
  }

  /**
   * Imprime una línea con etiqueta y valor alineados
   * @private
   */
  imprimirLineaConValor(doc, etiqueta, valor, y) {
    doc.text(etiqueta, this.margen, y, { continued: false });
    const anchoValor = doc.widthOfString(valor);
    const xValor = this.anchoTicket - this.margen - anchoValor;
    doc.text(valor, xValor, y, { width: anchoValor, align: 'right' });
  }

  /**
   * Genera código QR
   * @private
   */
  async generarCodigoQR(datosQR) {
    try {
      const jsonQR = JSON.stringify(datosQR);
      const buffer = await QRCode.toBuffer(jsonQR, {
        errorCorrectionLevel: 'M',
        type: 'png',
        margin: 1,
        width: 200
      });
      return buffer;
    } catch (error) {
      console.error('Error al generar código QR:', error);
      throw new Error(`Error al generar código QR: ${error.message}`);
    }
  }

  /**
   * Crea hash de verificación
   * @private
   */
  crearHashVerificacion(datosPago) {
    const cadena = `${datosPago.numeroFactura}|${datosPago.fecha.toISOString()}|${datosPago.monto}|${this.secretoHash}`;
    const hash = crypto.createHash('sha256')
      .update(cadena)
      .digest('hex');
    return hash;
  }

  /**
   * Asegura que el directorio existe
   * @private
   */
  asegurarDirectorioTemporales(anio, mes) {
    const directorioBase = path.join(__dirname, '..', 'uploads', 'facturas-temporales', String(anio), String(mes));

    if (!fs.existsSync(directorioBase)) {
      fs.mkdirSync(directorioBase, { recursive: true });
    }

    return directorioBase;
  }

  /**
   * Formatea el nombre del proyecto
   * @private
   */
  formatearNombreProyecto(proyectoKey) {
    const proyectos = {
      'san-miguel': 'San Miguel',
      'santa-clara-1': 'Santa Clara Fase 1',
      'santa-clara-2': 'Santa Clara Fase 2',
      'cabanas-1': 'Cabañas Fase 1',
      'cabanas-2': 'Cabañas Fase 2'
    };
    return proyectos[proyectoKey] || proyectoKey;
  }

  /**
   * Formatea fecha
   * @private
   */
  formatearFecha(fecha) {
    const f = new Date(fecha);
    const dia = String(f.getDate()).padStart(2, '0');
    const mes = String(f.getMonth() + 1).padStart(2, '0');
    const anio = f.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  /**
   * Formatea fecha con hora
   * @private
   */
  formatearFechaHora(fecha) {
    const f = new Date(fecha);
    const dia = String(f.getDate()).padStart(2, '0');
    const mes = String(f.getMonth() + 1).padStart(2, '0');
    const anio = f.getFullYear();
    const horas = String(f.getHours()).padStart(2, '0');
    const minutos = String(f.getMinutes()).padStart(2, '0');
    const segundos = String(f.getSeconds()).padStart(2, '0');
    return `${dia}/${mes}/${anio} ${horas}:${minutos}:${segundos}`;
  }

  /**
   * Formatea monto
   * @private
   */
  formatearMonto(monto) {
    return Number(monto).toFixed(2);
  }
}

module.exports = new TicketFacturaTemporalService();
