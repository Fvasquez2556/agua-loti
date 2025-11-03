/**
 * Servicio para generar tickets de pago en PDF
 * Genera tickets térmicos de 80mm de ancho
 * Sistema de Agua LOTI - Huehuetenango, Guatemala
 */

// Imports
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Models
const Pago = require('../models/pago.model');
const Factura = require('../models/factura.model');
const Cliente = require('../models/cliente.model');

class TicketPagoService {
  /**
   * Constructor del servicio de tickets
   */
  constructor() {
    // Configuración de dimensiones (conversión de mm a puntos: 1mm = 2.83465 puntos)
    this.anchoTicket = 226.77; // 80mm en puntos
    this.margen = 14.17; // 5mm en puntos
    this.anchoContenido = this.anchoTicket - (this.margen * 2); // Área de contenido

    // Configuración de fuentes
    this.fuentePrincipal = 'Courier';
    this.tamanoFuenteNormal = 9;
    this.tamanoFuentePequeno = 7;
    this.tamanoFuenteGrande = 11;
    this.tamanoFuenteTitulo = 13;

    // Secreto para hash de verificación (debería estar en variables de entorno)
    this.secretoHash = process.env.TICKET_SECRET || 'agua-loti-2025-ticket-secret';
  }

  /**
   * Genera un ticket PDF para un pago específico
   * @async
   * @param {string} pagoId - ID del pago en MongoDB
   * @returns {Promise<Object>} Resultado de la operación
   * @returns {boolean} resultado.exitoso - Si la operación fue exitosa
   * @returns {string} resultado.rutaArchivo - Ruta completa del archivo PDF
   * @returns {string} resultado.nombreArchivo - Nombre del archivo generado
   * @returns {string} resultado.mensaje - Mensaje descriptivo
   * @throws {Error} Si el pago no existe o hay error al generar el PDF
   * @example
   * const resultado = await ticketPagoService.generarTicketPago('67123abc...');
   */
  async generarTicketPago(pagoId) {
    try {
      // 1. Obtener datos del pago con todas las relaciones pobladas
      const pago = await Pago.findById(pagoId)
        .populate('clienteId', 'nombres apellidos dpi contador lote proyecto')
        .populate('facturaId');  // Poblar TODA la factura para verificar el tipo

      if (!pago) {
        return {
          exitoso: false,
          mensaje: 'Pago no encontrado',
          rutaArchivo: null,
          nombreArchivo: null
        };
      }

      // 2. Validar que existen los datos necesarios
      if (!pago.clienteId || !pago.facturaId) {
        return {
          exitoso: false,
          mensaje: 'El pago no tiene cliente o factura asociada',
          rutaArchivo: null,
          nombreArchivo: null
        };
      }

      // 3. VERIFICAR SI ES UNA FACTURA DE RECONEXIÓN
      // Si es de reconexión, usar el método especializado que muestra desglose por mes
      if (pago.facturaId.tipoFactura === 'reconexion') {
        console.log(`🔄 Detectada factura de reconexión: ${pago.facturaId.numeroFactura}`);
        console.log(`   Redirigiendo a generarTicketFacturaConsolidada()...`);

        // Delegar al método especializado para facturas consolidadas
        return await this.generarTicketFacturaConsolidada(pago.facturaId._id);
      }

      // 4. Preparar el directorio de almacenamiento (para pagos normales)
      const fechaPago = new Date(pago.fechaPago);
      const anio = fechaPago.getFullYear();
      const mes = String(fechaPago.getMonth() + 1).padStart(2, '0');
      const directorioTickets = this.asegurarDirectorioTickets(anio, mes);

      // 5. Generar nombre de archivo
      const fechaFormateada = `${anio}${mes}${String(fechaPago.getDate()).padStart(2, '0')}`;
      const nombreArchivo = `PAGO-${pago.numeroPago}-${fechaFormateada}.pdf`;
      const rutaCompleta = path.join(directorioTickets, nombreArchivo);

      // 6. Generar código QR
      const datosQR = {
        numeroPago: pago.numeroPago,
        fecha: pago.fechaPago.toISOString(),
        monto: pago.montoPagado,
        hash: this.crearHashVerificacion({
          numeroPago: pago.numeroPago,
          fecha: pago.fechaPago,
          monto: pago.montoPagado
        })
      };
      const bufferQR = await this.generarCodigoQR(datosQR);

      // 7. Crear el documento PDF
      const doc = new PDFDocument({
        size: [this.anchoTicket, 841.89], // Ancho fijo, alto variable
        margins: {
          top: this.margen,
          bottom: this.margen,
          left: this.margen,
          right: this.margen
        }
      });

      // 8. Crear stream de escritura
      const stream = fs.createWriteStream(rutaCompleta);
      doc.pipe(stream);

      // 9. Generar contenido del ticket
      await this.generarContenidoTicket(doc, pago, bufferQR);

      // 10. Finalizar documento
      doc.end();

      // 11. Esperar a que se complete la escritura
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      return {
        exitoso: true,
        mensaje: 'Ticket generado exitosamente',
        rutaArchivo: rutaCompleta,
        nombreArchivo: nombreArchivo
      };

    } catch (error) {
      console.error('Error al generar ticket de pago:', error);
      return {
        exitoso: false,
        mensaje: `Error al generar ticket: ${error.message}`,
        rutaArchivo: null,
        nombreArchivo: null
      };
    }
  }

  /**
   * Genera el contenido completo del ticket en el PDF
   * @private
   * @param {PDFDocument} doc - Documento PDF de pdfkit
   * @param {Object} pago - Objeto de pago con datos poblados
   * @param {Buffer} bufferQR - Buffer del código QR
   */
  async generarContenidoTicket(doc, pago, bufferQR) {
    let y = doc.y;

    // SECCIÓN 1: HEADER
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

    // Línea separadora
    doc.moveTo(this.margen, y)
       .lineTo(this.anchoTicket - this.margen, y)
       .stroke();

    y += 15;

    // SECCIÓN 2: TICKET INFO
    doc.fontSize(this.tamanoFuenteGrande)
       .text('RECIBO DE PAGO', this.margen, y, {
         width: this.anchoContenido,
         align: 'center'
       });

    y = doc.y + 10;

    doc.fontSize(this.tamanoFuenteNormal);
    doc.text(`Número de Pago: ${pago.numeroPago}`, this.margen, y);

    y = doc.y + 3;
    const fechaEmision = this.formatearFecha(pago.fechaPago);
    doc.text(`Fecha de Emisión: ${fechaEmision}`, this.margen, y);

    y = doc.y + 10;

    // Línea separadora
    doc.moveTo(this.margen, y)
       .lineTo(this.anchoTicket - this.margen, y)
       .stroke();

    y += 12;

    // SECCIÓN 3: DATOS DEL CLIENTE
    doc.fontSize(this.tamanoFuenteNormal)
       .text('DATOS DEL CLIENTE', this.margen, y);

    y = doc.y + 5;

    const cliente = pago.clienteId;
    doc.text(`Cliente: ${cliente.nombres} ${cliente.apellidos}`, this.margen, y);

    y = doc.y + 3;
    doc.text(`DPI: ${cliente.dpi}`, this.margen, y);

    y = doc.y + 3;
    doc.text(`Contador: ${cliente.contador}`, this.margen, y);

    y = doc.y + 3;
    doc.text(`Lote: ${cliente.lote}`, this.margen, y);

    y = doc.y + 3;
    const nombreProyecto = this.formatearNombreProyecto(cliente.proyecto);
    doc.text(`Proyecto: ${nombreProyecto}`, this.margen, y);

    y = doc.y + 10;

    // SECCIÓN 4: DATOS DE LA FACTURA
    doc.fontSize(this.tamanoFuenteNormal)
       .text('FACTURA PAGADA', this.margen, y);

    y = doc.y + 5;

    const factura = pago.facturaId;
    doc.text(`No. Factura: ${factura.numeroFactura}`, this.margen, y);

    y = doc.y + 3;
    doc.text(`Fecha Emisión: ${this.formatearFecha(factura.fechaEmision)}`, this.margen, y);

    y = doc.y + 3;
    doc.text(`Fecha Vencimiento: ${this.formatearFecha(factura.fechaVencimiento)}`, this.margen, y);

    y = doc.y + 3;
    doc.text(`Período: ${this.formatearFecha(factura.periodoInicio)} - ${this.formatearFecha(factura.periodoFin)}`, this.margen, y);

    y = doc.y + 10;

    // SECCIÓN 5: DETALLE DEL PAGO
    doc.fontSize(this.tamanoFuenteNormal)
       .text('DETALLE DEL PAGO', this.margen, y);

    y = doc.y + 5;

    // Subtotal Factura
    this.imprimirLineaConValor(doc, 'Subtotal Factura:', `Q ${this.formatearMonto(pago.montoOriginal)}`, y);
    y = doc.y + 3;

    // Mora (si aplica)
    if (pago.montoMora > 0) {
      this.imprimirLineaConValor(doc, 'Mora:', `Q ${this.formatearMonto(pago.montoMora)}`, y);
      y = doc.y + 3;
    }

    // Reconexión (si aplica)
    if (pago.montoReconexion > 0) {
      this.imprimirLineaConValor(doc, 'Reconexión:', `Q ${this.formatearMonto(pago.montoReconexion)}`, y);
      y = doc.y + 3;
    }

    y = doc.y + 5;

    // Línea doble separadora
    doc.moveTo(this.margen, y)
       .lineTo(this.anchoTicket - this.margen, y)
       .stroke();
    doc.moveTo(this.margen, y + 2)
       .lineTo(this.anchoTicket - this.margen, y + 2)
       .stroke();

    y += 10;

    // Total Pagado (destacado)
    doc.fontSize(this.tamanoFuenteGrande);
    this.imprimirLineaConValor(doc, 'TOTAL PAGADO:', `Q ${this.formatearMonto(pago.montoPagado)}`, y);

    y = doc.y + 12;

    // SECCIÓN 6: MÉTODO DE PAGO
    doc.fontSize(this.tamanoFuenteNormal)
       .text('MÉTODO DE PAGO', this.margen, y);

    y = doc.y + 5;

    const metodoPagoCapitalizado = this.capitalizarPrimeraLetra(pago.metodoPago);
    doc.text(`Método: ${metodoPagoCapitalizado}`, this.margen, y);

    y = doc.y + 3;

    if (pago.referenciaPago) {
      doc.text(`Referencia: ${pago.referenciaPago}`, this.margen, y);
      y = doc.y + 3;
    }

    if (pago.metodoPago === 'cheque') {
      if (pago.bancoCheque) {
        doc.text(`Banco: ${pago.bancoCheque}`, this.margen, y);
        y = doc.y + 3;
      }
      if (pago.numeroCheque) {
        doc.text(`No. Cheque: ${pago.numeroCheque}`, this.margen, y);
        y = doc.y + 3;
      }
    }

    y = doc.y + 10;

    // SECCIÓN 7: CÓDIGO QR
    doc.fontSize(this.tamanoFuentePequeno)
       .text('CÓDIGO DE VERIFICACIÓN', this.margen, y, {
         width: this.anchoContenido,
         align: 'center'
       });

    y = doc.y + 5;

    // Centrar el QR (30mm x 30mm = 84.92 puntos)
    const tamanoQR = 84.92;
    const xQR = (this.anchoTicket - tamanoQR) / 2;

    doc.image(bufferQR, xQR, y, {
      width: tamanoQR,
      height: tamanoQR
    });

    y += tamanoQR + 10;

    // SECCIÓN 8: FOOTER
    doc.moveTo(this.margen, y)
       .lineTo(this.anchoTicket - this.margen, y)
       .stroke();

    y += 10;

    doc.fontSize(this.tamanoFuenteNormal)
       .text('Gracias por su pago', this.margen, y, {
         width: this.anchoContenido,
         align: 'center'
       });

    y = doc.y + 5;

    const fechaHoraImpresion = this.formatearFechaHora(new Date());
    doc.fontSize(this.tamanoFuentePequeno)
       .text(`Fecha y hora de impresión: ${fechaHoraImpresion}`, this.margen, y, {
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
   * Imprime una línea con etiqueta y valor alineados
   * @private
   * @param {PDFDocument} doc - Documento PDF
   * @param {string} etiqueta - Texto de la etiqueta
   * @param {string} valor - Valor a alinear a la derecha
   * @param {number} y - Posición Y
   */
  imprimirLineaConValor(doc, etiqueta, valor, y) {
    doc.text(etiqueta, this.margen, y, { continued: false });

    // Calcular posición para alinear valor a la derecha
    const anchoValor = doc.widthOfString(valor);
    const xValor = this.anchoTicket - this.margen - anchoValor;

    doc.text(valor, xValor, y, { width: anchoValor, align: 'right' });
  }

  /**
   * Genera el código QR de verificación
   * @async
   * @param {Object} datosQR - Datos para el QR
   * @param {string} datosQR.numeroPago - Número del pago
   * @param {string} datosQR.fecha - Fecha en formato ISO
   * @param {number} datosQR.monto - Monto pagado
   * @param {string} datosQR.hash - Hash de verificación
   * @returns {Promise<Buffer>} Buffer del código QR generado
   * @throws {Error} Si hay error al generar el QR
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
   * Crea el hash de verificación para el ticket
   * @param {Object} datosPago - Datos del pago
   * @param {string} datosPago.numeroPago - Número del pago
   * @param {Date} datosPago.fecha - Fecha del pago
   * @param {number} datosPago.monto - Monto pagado
   * @returns {string} Hash SHA256 en hexadecimal
   */
  crearHashVerificacion(datosPago) {
    const cadena = `${datosPago.numeroPago}|${datosPago.fecha.toISOString()}|${datosPago.monto}|${this.secretoHash}`;

    const hash = crypto.createHash('sha256')
      .update(cadena)
      .digest('hex');

    return hash;
  }

  /**
   * Asegura que el directorio de tickets existe
   * @param {number} anio - Año
   * @param {number} mes - Mes (01-12)
   * @returns {string} Ruta completa del directorio
   */
  asegurarDirectorioTickets(anio, mes) {
    const directorioBase = path.join(__dirname, '..', 'uploads', 'tickets', String(anio), String(mes));

    if (!fs.existsSync(directorioBase)) {
      fs.mkdirSync(directorioBase, { recursive: true });
    }

    return directorioBase;
  }

  /**
   * Formatea el nombre del proyecto para visualización
   * @param {string} proyectoKey - Clave del proyecto
   * @returns {string} Nombre formateado del proyecto
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
   * Formatea una fecha al formato DD/MM/YYYY
   * @param {Date} fecha - Fecha a formatear
   * @returns {string} Fecha formateada
   */
  formatearFecha(fecha) {
    const f = new Date(fecha);
    const dia = String(f.getDate()).padStart(2, '0');
    const mes = String(f.getMonth() + 1).padStart(2, '0');
    const anio = f.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  /**
   * Formatea una fecha con hora al formato DD/MM/YYYY HH:MM:SS
   * @param {Date} fecha - Fecha a formatear
   * @returns {string} Fecha y hora formateada
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
   * Formatea un monto con 2 decimales
   * @param {number} monto - Monto a formatear
   * @returns {string} Monto formateado
   */
  formatearMonto(monto) {
    return Number(monto).toFixed(2);
  }

  /**
   * Capitaliza la primera letra de un texto
   * @param {string} texto - Texto a capitalizar
   * @returns {string} Texto con primera letra mayúscula
   */
  capitalizarPrimeraLetra(texto) {
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  /**
   * Genera un ticket consolidado para reconexión con múltiples facturas
   * @async
   * @param {Array<string>} pagosIds - Array de IDs de pagos
   * @param {Object} datosReconexion - Datos adicionales de la reconexión
   * @returns {Promise<Object>} Resultado de la operación
   */
  async generarTicketReconexionConsolidado(pagosIds, datosReconexion = {}) {
    try {
      // 1. Obtener todos los pagos con datos poblados
      const pagos = await Pago.find({ _id: { $in: pagosIds } })
        .populate('clienteId', 'nombres apellidos dpi contador lote proyecto')
        .populate('facturaId', 'numeroFactura fechaEmision fechaVencimiento periodoInicio periodoFin')
        .sort({ createdAt: 1 }); // Ordenar por fecha de creación

      if (!pagos || pagos.length === 0) {
        return {
          exitoso: false,
          mensaje: 'No se encontraron pagos',
          rutaArchivo: null,
          nombreArchivo: null
        };
      }

      // 2. Validar que todos los pagos son del mismo cliente
      const clienteId = pagos[0].clienteId._id.toString();
      const todosDelMismoCliente = pagos.every(p => p.clienteId._id.toString() === clienteId);

      if (!todosDelMismoCliente) {
        return {
          exitoso: false,
          mensaje: 'Los pagos deben ser del mismo cliente',
          rutaArchivo: null,
          nombreArchivo: null
        };
      }

      // 3. Preparar directorio
      const fechaPago = new Date(pagos[0].fechaPago);
      const anio = fechaPago.getFullYear();
      const mes = String(fechaPago.getMonth() + 1).padStart(2, '0');
      const directorioTickets = this.asegurarDirectorioTickets(anio, mes);

      // 4. Generar nombre de archivo consolidado
      const fechaFormateada = `${anio}${mes}${String(fechaPago.getDate()).padStart(2, '0')}`;
      const nombreArchivo = `RECONEXION-${datosReconexion.reconexionId?.toString().slice(-8) || 'CONS'}-${fechaFormateada}.pdf`;
      const rutaCompleta = path.join(directorioTickets, nombreArchivo);

      // 5. Calcular totales
      const totales = this.calcularTotalesConsolidados(pagos);

      // 6. Generar código QR consolidado
      const datosQR = {
        tipo: 'reconexion',
        numerosPago: pagos.map(p => p.numeroPago),
        fecha: fechaPago.toISOString(),
        totalPagado: totales.totalGeneral,
        cantidadFacturas: pagos.length,
        hash: this.crearHashVerificacion({
          numeroPago: `RECON-${pagos.length}`,
          fecha: fechaPago,
          monto: totales.totalGeneral
        })
      };
      const bufferQR = await this.generarCodigoQR(datosQR);

      // 7. Crear documento PDF
      const doc = new PDFDocument({
        size: [this.anchoTicket, 841.89],
        margins: {
          top: this.margen,
          bottom: this.margen,
          left: this.margen,
          right: this.margen
        }
      });

      // 8. Crear stream
      const stream = fs.createWriteStream(rutaCompleta);
      doc.pipe(stream);

      // 9. Generar contenido consolidado
      await this.generarContenidoTicketConsolidado(doc, pagos, totales, datosReconexion, bufferQR);

      // 10. Finalizar
      doc.end();

      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      return {
        exitoso: true,
        mensaje: 'Ticket consolidado generado exitosamente',
        rutaArchivo: rutaCompleta,
        nombreArchivo: nombreArchivo
      };

    } catch (error) {
      console.error('Error al generar ticket consolidado:', error);
      return {
        exitoso: false,
        mensaje: `Error al generar ticket consolidado: ${error.message}`,
        rutaArchivo: null,
        nombreArchivo: null
      };
    }
  }

  /**
   * Calcula los totales consolidados de múltiples pagos
   * @private
   */
  calcularTotalesConsolidados(pagos) {
    const totales = {
      subtotalFacturas: 0,
      totalMora: 0,
      costoReconexion: 0,
      totalGeneral: 0
    };

    pagos.forEach(pago => {
      totales.subtotalFacturas += pago.montoOriginal;
      totales.totalMora += pago.montoMora;
      totales.costoReconexion += pago.montoReconexion;
      totales.totalGeneral += pago.montoPagado;
    });

    return totales;
  }

  /**
   * Genera el contenido del ticket consolidado
   * @private
   */
  async generarContenidoTicketConsolidado(doc, pagos, totales, datosReconexion, bufferQR) {
    let y = doc.y;
    const cliente = pagos[0].clienteId;

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
       .text('RECIBO DE RECONEXIÓN', this.margen, y, {
         width: this.anchoContenido,
         align: 'center'
       });

    y = doc.y + 10;

    doc.fontSize(this.tamanoFuenteNormal);
    doc.text(`Fecha: ${this.formatearFecha(pagos[0].fechaPago)}`, this.margen, y);
    y = doc.y + 3;
    doc.text(`Facturas Pagadas: ${pagos.length}`, this.margen, y);

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

    // DESGLOSE DE FACTURAS
    doc.fontSize(this.tamanoFuenteNormal).text('DETALLE DE FACTURAS PAGADAS', this.margen, y);
    y = doc.y + 8;

    doc.fontSize(this.tamanoFuentePequeno);

    // Tabla de facturas
    pagos.forEach((pago, index) => {
      const factura = pago.facturaId;

      // Encabezado de factura
      doc.fontSize(this.tamanoFuenteNormal);
      doc.text(`Factura ${index + 1}: ${factura.numeroFactura}`, this.margen, y);
      y = doc.y + 3;

      doc.fontSize(this.tamanoFuentePequeno);
      doc.text(`Período: ${this.formatearFecha(factura.periodoInicio)} - ${this.formatearFecha(factura.periodoFin)}`, this.margen + 10, y);
      y = doc.y + 3;

      // Desglose de montos
      this.imprimirLineaConValor(doc, '  Consumo:', `Q ${this.formatearMonto(pago.montoOriginal)}`, y);
      y = doc.y + 3;

      if (pago.montoMora > 0) {
        this.imprimirLineaConValor(doc, '  Mora:', `Q ${this.formatearMonto(pago.montoMora)}`, y);
        y = doc.y + 3;
      }

      if (pago.montoReconexion > 0) {
        this.imprimirLineaConValor(doc, '  Reconexión:', `Q ${this.formatearMonto(pago.montoReconexion)}`, y);
        y = doc.y + 3;
      }

      // Subtotal de esta factura
      doc.fontSize(this.tamanoFuenteNormal);
      this.imprimirLineaConValor(doc, '  Subtotal:', `Q ${this.formatearMonto(pago.montoPagado)}`, y);
      y = doc.y + 6;
    });

    y += 5;

    // TOTALES
    doc.moveTo(this.margen, y).lineTo(this.anchoTicket - this.margen, y).stroke();
    y += 10;

    doc.fontSize(this.tamanoFuenteNormal).text('RESUMEN DE PAGO', this.margen, y);
    y = doc.y + 5;

    this.imprimirLineaConValor(doc, 'Total Consumo:', `Q ${this.formatearMonto(totales.subtotalFacturas)}`, y);
    y = doc.y + 3;

    this.imprimirLineaConValor(doc, 'Total Mora:', `Q ${this.formatearMonto(totales.totalMora)}`, y);
    y = doc.y + 3;

    this.imprimirLineaConValor(doc, 'Total Reconexión:', `Q ${this.formatearMonto(totales.costoReconexion)}`, y);
    y = doc.y + 5;

    // Línea doble
    doc.moveTo(this.margen, y).lineTo(this.anchoTicket - this.margen, y).stroke();
    doc.moveTo(this.margen, y + 2).lineTo(this.anchoTicket - this.margen, y + 2).stroke();
    y += 10;

    // TOTAL GENERAL
    doc.fontSize(this.tamanoFuenteGrande);
    this.imprimirLineaConValor(doc, 'TOTAL PAGADO:', `Q ${this.formatearMonto(totales.totalGeneral)}`, y);

    y = doc.y + 12;

    // MÉTODO DE PAGO
    doc.fontSize(this.tamanoFuenteNormal).text('MÉTODO DE PAGO', this.margen, y);
    y = doc.y + 5;

    const metodoPago = this.capitalizarPrimeraLetra(pagos[0].metodoPago);
    doc.text(`Método: ${metodoPago}`, this.margen, y);
    y = doc.y + 3;

    if (pagos[0].referenciaPago) {
      doc.text(`Referencia: ${pagos[0].referenciaPago}`, this.margen, y);
      y = doc.y + 3;
    }

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
       .text('Gracias por su pago', this.margen, y, {
         width: this.anchoContenido,
         align: 'center'
       });

    y = doc.y + 3;

    doc.fontSize(this.tamanoFuentePequeno)
       .text('Servicio de reconexión activado', this.margen, y, {
         width: this.anchoContenido,
         align: 'center'
       });

    y = doc.y + 5;

    const fechaHora = this.formatearFechaHora(new Date());
    doc.text(`Fecha de impresión: ${fechaHora}`, this.margen, y, {
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
   * Genera ticket para factura consolidada de reconexión
   * @param {string} facturaConsolidadaId - ID de la factura consolidada
   * @returns {Promise<Object>} Resultado de la operación
   */
  async generarTicketFacturaConsolidada(facturaConsolidadaId) {
    try {
      // Obtener factura consolidada con población completa
      const factura = await Factura.findById(facturaConsolidadaId)
        .populate('clienteId', 'nombres apellidos dpi contador lote proyecto');

      if (!factura) {
        return {
          exitoso: false,
          mensaje: 'Factura consolidada no encontrada',
          rutaArchivo: null,
          nombreArchivo: null
        };
      }

      if (factura.tipoFactura !== 'reconexion') {
        return {
          exitoso: false,
          mensaje: 'Esta factura no es de tipo reconexión',
          rutaArchivo: null,
          nombreArchivo: null
        };
      }

      // Preparar directorio
      const fechaPago = new Date(factura.fechaPago || factura.fechaEmision);
      const anio = fechaPago.getFullYear();
      const mes = String(fechaPago.getMonth() + 1).padStart(2, '0');
      const directorioTickets = this.asegurarDirectorioTickets(anio, mes);

      // Generar nombre de archivo
      const fechaFormateada = `${anio}${mes}${String(fechaPago.getDate()).padStart(2, '0')}`;
      const nombreArchivo = `RECONEXION-${factura.numeroFactura}-${fechaFormateada}.pdf`;
      const rutaCompleta = path.join(directorioTickets, nombreArchivo);

      // Generar código QR
      const datosQR = {
        tipo: 'reconexion',
        numeroFactura: factura.numeroFactura,
        fecha: factura.fechaEmision.toISOString(),
        totalPagado: factura.montoTotal,
        cantidadFacturas: factura.facturasConsolidadas.length,
        hash: this.crearHashVerificacion({
          numeroPago: factura.numeroFactura,
          fecha: factura.fechaEmision,
          monto: factura.montoTotal
        })
      };
      const bufferQR = await this.generarCodigoQR(datosQR);

      // Crear documento PDF
      const doc = new PDFDocument({
        size: [this.anchoTicket, 841.89],
        margins: {
          top: this.margen,
          bottom: this.margen,
          left: this.margen,
          right: this.margen
        }
      });

      // Stream
      const stream = fs.createWriteStream(rutaCompleta);
      doc.pipe(stream);

      // Generar contenido
      await this.generarContenidoTicketFacturaConsolidada(doc, factura, bufferQR);

      // Finalizar
      doc.end();

      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      return {
        exitoso: true,
        mensaje: 'Ticket de reconexión generado exitosamente',
        rutaArchivo: rutaCompleta,
        nombreArchivo: nombreArchivo
      };

    } catch (error) {
      console.error('Error al generar ticket de reconexión:', error);
      return {
        exitoso: false,
        mensaje: `Error: ${error.message}`,
        rutaArchivo: null,
        nombreArchivo: null
      };
    }
  }

  /**
   * Genera el contenido del ticket para factura consolidada
   * @private
   */
  async generarContenidoTicketFacturaConsolidada(doc, factura, bufferQR) {
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
       .text('RECIBO DE RECONEXIÓN', this.margen, y, {
         width: this.anchoContenido,
         align: 'center'
       });

    y = doc.y + 10;

    doc.fontSize(this.tamanoFuenteNormal);
    doc.text(`No. ${factura.numeroFactura}`, this.margen, y);
    y = doc.y + 3;
    doc.text(`Fecha: ${this.formatearFecha(factura.fechaEmision)}`, this.margen, y);
    y = doc.y + 3;

    // Contar meses únicos (agrupando por mes-año)
    const mesesUnicos = new Set();
    factura.facturasConsolidadas.forEach(detalle => {
      const year = new Date(detalle.periodo.inicio).getFullYear();
      mesesUnicos.add(`${detalle.mesNombre}-${year}`);
    });

    doc.text(`Meses Incluidos: ${mesesUnicos.size}`, this.margen, y);

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

    // VERIFICAR SI TIENE FACTURAS CONSOLIDADAS PARA MOSTRAR DESGLOSE
    if (factura.facturasConsolidadas && factura.facturasConsolidadas.length > 0) {
      // ═══════════════════════════════════════════════
      // MOSTRAR DESGLOSE POR MES
      // ═══════════════════════════════════════════════

      doc.fontSize(this.tamanoFuenteNormal).text('DETALLE POR MES', this.margen, y);
      y = doc.y + 8;

      doc.fontSize(this.tamanoFuentePequeno);

      // Agrupar facturas por mes (para combinar si hay varias del mismo mes)
      const facturasPorMes = {};

      for (const detalle of factura.facturasConsolidadas) {
        const year = new Date(detalle.periodo.inicio).getFullYear();
        const mesKeyConYear = `${detalle.mesNombre}-${year}`;  // Clave única: "Mayo-2025"

        if (!facturasPorMes[mesKeyConYear]) {
          facturasPorMes[mesKeyConYear] = {
            mesNombre: detalle.mesNombre,
            year: year,
            montoOriginal: 0,
            montoMora: 0,
            subtotal: 0,
            facturas: []
          };
        }

        facturasPorMes[mesKeyConYear].montoOriginal += detalle.montoOriginal;
        facturasPorMes[mesKeyConYear].montoMora += detalle.montoMora || 0;
        facturasPorMes[mesKeyConYear].subtotal += detalle.subtotal;
        facturasPorMes[mesKeyConYear].facturas.push(detalle.numeroFactura);
      }

      // Ordenar por año y luego por mes
      const mesesOrden = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const mesesOrdenados = Object.values(facturasPorMes).sort((a, b) => {
        // Primero ordenar por año
        if (a.year !== b.year) {
          return a.year - b.year;
        }
        // Luego ordenar por mes
        return mesesOrden.indexOf(a.mesNombre) - mesesOrden.indexOf(b.mesNombre);
      });

      // Mostrar cada mes con formato mejorado
      for (const mes of mesesOrdenados) {
        doc.fontSize(this.tamanoFuenteNormal);
        doc.text(`${mes.mesNombre} ${mes.year}`, this.margen, y);
        y = doc.y + 4;

        doc.fontSize(this.tamanoFuentePequeno);
        this.imprimirLineaConValor(doc, '  Consumo:', `Q ${this.formatearMonto(mes.montoOriginal)}`, y);
        y = doc.y + 3;

        this.imprimirLineaConValor(doc, '  Mora (7%):', `Q ${this.formatearMonto(mes.montoMora)}`, y);
        y = doc.y + 3;

        this.imprimirLineaConValor(doc, '  Subtotal:', `Q ${this.formatearMonto(mes.subtotal)}`, y);
        y = doc.y + 7;
      }

      y += 3;

      // Línea separadora
      doc.moveTo(this.margen, y).lineTo(this.anchoTicket - this.margen, y).stroke();
      y += 10;

      // RESUMEN DE TOTALES
      doc.fontSize(this.tamanoFuenteNormal).text('RESUMEN DE PAGO', this.margen, y);
      y = doc.y + 5;

      this.imprimirLineaConValor(doc, 'Total Consumo + Mora:', `Q ${this.formatearMonto(factura.montoBase + factura.montoMora)}`, y);
      y = doc.y + 3;

      this.imprimirLineaConValor(doc, 'Costo Reconexión:', `Q ${this.formatearMonto(factura.costoReconexion)}`, y);
      y = doc.y + 5;

      // Línea doble
      doc.moveTo(this.margen, y).lineTo(this.anchoTicket - this.margen, y).stroke();
      doc.moveTo(this.margen, y + 2).lineTo(this.anchoTicket - this.margen, y + 2).stroke();
      y += 10;

      // TOTAL GENERAL
      doc.fontSize(this.tamanoFuenteGrande);
      this.imprimirLineaConValor(doc, 'TOTAL PAGADO:', `Q ${this.formatearMonto(factura.montoTotal)}`, y);

      y = doc.y + 12;

    } else {
      // ═══════════════════════════════════════════════
      // MOSTRAR DETALLE SIMPLE (sin desglose por mes)
      // ═══════════════════════════════════════════════

      doc.fontSize(this.tamanoFuenteNormal).text('DETALLE DEL PAGO', this.margen, y);
      y = doc.y + 8;

      doc.fontSize(this.tamanoFuentePequeno);

      this.imprimirLineaConValor(doc, 'Subtotal Factura:', `Q ${this.formatearMonto(factura.montoBase)}`, y);
      y = doc.y + 3;

      this.imprimirLineaConValor(doc, 'Mora:', `Q ${this.formatearMonto(factura.montoMora)}`, y);
      y = doc.y + 3;

      this.imprimirLineaConValor(doc, 'Reconexión:', `Q ${this.formatearMonto(factura.costoReconexion)}`, y);
      y = doc.y + 5;

      // Línea doble
      doc.moveTo(this.margen, y).lineTo(this.anchoTicket - this.margen, y).stroke();
      doc.moveTo(this.margen, y + 2).lineTo(this.anchoTicket - this.margen, y + 2).stroke();
      y += 10;

      // TOTAL GENERAL
      doc.fontSize(this.tamanoFuenteGrande);
      this.imprimirLineaConValor(doc, 'TOTAL PAGADO:', `Q ${this.formatearMonto(factura.montoTotal)}`, y);

      y = doc.y + 12;
    }

    // MÉTODO DE PAGO
    doc.fontSize(this.tamanoFuenteNormal).text('MÉTODO DE PAGO', this.margen, y);
    y = doc.y + 5;

    const metodoPago = this.capitalizarPrimeraLetra(factura.metodoPago);
    doc.text(`Método: ${metodoPago}`, this.margen, y);
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
       .text('Gracias por su pago', this.margen, y, {
         width: this.anchoContenido,
         align: 'center'
       });

    y = doc.y + 3;

    doc.fontSize(this.tamanoFuentePequeno)
       .text('Servicio de agua restaurado', this.margen, y, {
         width: this.anchoContenido,
         align: 'center'
       });

    y = doc.y + 5;

    const fechaHora = this.formatearFechaHora(new Date());
    doc.text(`Fecha de impresión: ${fechaHora}`, this.margen, y, {
      width: this.anchoContenido,
      align: 'center'
    });

    y = doc.y + 3;

    doc.text('Sistema de Agua LOTI v2.0', this.margen, y, {
      width: this.anchoContenido,
      align: 'center'
    });
  }
}

module.exports = new TicketPagoService();
