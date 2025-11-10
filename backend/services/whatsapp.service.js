// backend/services/whatsapp.service.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

/**
 * Servicio de WhatsApp para Sistema de Agua LOTI
 */
class WhatsAppService {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.initializationError = null;

    // Solo inicializar si está habilitado en .env
    if (process.env.WHATSAPP_ENABLED === 'true') {
      this.inicializarCliente();
    } else {
      console.log('ℹ️ WhatsApp deshabilitado (WHATSAPP_ENABLED=false o no configurado)');
    }
  }

  /**
   * Inicializar cliente de WhatsApp
   */
  inicializarCliente() {
    try {
      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: './whatsapp-sessions'
        }),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      });

      // Evento: QR Code generado
      this.client.on('qr', (qr) => {
        console.log('\n🔵 Escanea este código QR con WhatsApp:\n');
        qrcode.generate(qr, { small: true });
        console.log('\n📱 Abre WhatsApp > Dispositivos vinculados > Vincular dispositivo');
      });

      // Evento: Cliente listo
      this.client.on('ready', () => {
        console.log('✅ WhatsApp conectado y listo!');
        this.isReady = true;
      });

      // Evento: Autenticación exitosa
      this.client.on('authenticated', () => {
        console.log('✅ WhatsApp autenticado correctamente');
      });

      // Evento: Error de autenticación
      this.client.on('auth_failure', (msg) => {
        console.error('❌ Error de autenticación de WhatsApp:', msg);
        this.initializationError = msg;
      });

      // Evento: Desconexión
      this.client.on('disconnected', (reason) => {
        console.log('⚠️ WhatsApp desconectado:', reason);
        this.isReady = false;
      });

      // Inicializar
      this.client.initialize();

    } catch (error) {
      console.error('❌ Error al inicializar WhatsApp:', error);
      this.initializationError = error.message;
    }
  }

  /**
   * Enviar mensaje de WhatsApp
   * @param {String} numero - Número de WhatsApp (8 dígitos)
   * @param {String} mensaje - Mensaje a enviar
   */
  async enviarMensaje(numero, mensaje) {
    try {
      // Validar que el servicio esté habilitado
      if (process.env.WHATSAPP_ENABLED !== 'true') {
        return {
          exitoso: false,
          mensaje: 'Servicio de WhatsApp deshabilitado'
        };
      }

      // Validar que el cliente esté listo
      if (!this.isReady) {
        return {
          exitoso: false,
          mensaje: 'WhatsApp no está conectado. Escanea el código QR primero.'
        };
      }

      // Validar número
      if (!numero || numero.length !== 8) {
        return {
          exitoso: false,
          mensaje: 'Número de WhatsApp inválido'
        };
      }

      // Formatear número para WhatsApp (código de país Guatemala: 502)
      const numeroFormateado = `502${numero}@c.us`;

      // Enviar mensaje
      await this.client.sendMessage(numeroFormateado, mensaje);

      console.log(`✅ WhatsApp enviado a +502 ${numero}`);

      return {
        exitoso: true,
        mensaje: 'Mensaje de WhatsApp enviado correctamente'
      };

    } catch (error) {
      console.error('❌ Error al enviar WhatsApp:', error);
      return {
        exitoso: false,
        mensaje: `Error al enviar WhatsApp: ${error.message}`
      };
    }
  }

  /**
   * Enviar archivo PDF por WhatsApp
   * @param {String} numero - Número de WhatsApp (8 dígitos)
   * @param {String} rutaPDF - Ruta del archivo PDF
   * @param {String} caption - Texto del mensaje (opcional)
   */
  async enviarPDF(numero, rutaPDF, caption = '') {
    try {
      const fs = require('fs');
      const { MessageMedia } = require('whatsapp-web.js');

      // Validar que el servicio esté habilitado
      if (process.env.WHATSAPP_ENABLED !== 'true') {
        return {
          exitoso: false,
          mensaje: 'Servicio de WhatsApp deshabilitado'
        };
      }

      // Validar que el cliente esté listo
      if (!this.isReady) {
        return {
          exitoso: false,
          mensaje: 'WhatsApp no está conectado. Escanea el código QR primero.'
        };
      }

      // Validar número
      if (!numero || numero.length !== 8) {
        return {
          exitoso: false,
          mensaje: 'Número de WhatsApp inválido'
        };
      }

      // Validar que el archivo existe
      if (!fs.existsSync(rutaPDF)) {
        return {
          exitoso: false,
          mensaje: 'Archivo PDF no encontrado'
        };
      }

      // Formatear número para WhatsApp (código de país Guatemala: 502)
      const numeroFormateado = `502${numero}@c.us`;

      // Leer el archivo y crear MessageMedia
      const media = MessageMedia.fromFilePath(rutaPDF);

      // Enviar PDF con caption
      await this.client.sendMessage(numeroFormateado, media, { caption });

      console.log(`✅ PDF enviado por WhatsApp a +502 ${numero}`);

      return {
        exitoso: true,
        mensaje: 'PDF enviado correctamente por WhatsApp'
      };

    } catch (error) {
      console.error('❌ Error al enviar PDF por WhatsApp:', error);
      return {
        exitoso: false,
        mensaje: `Error al enviar PDF por WhatsApp: ${error.message}`
      };
    }
  }

  /**
   * Enviar notificación de factura por WhatsApp
   * @param {Object} cliente - Datos del cliente
   * @param {Object} factura - Datos de la factura
   * @param {String} rutaPDF - Ruta del PDF de la factura (opcional)
   */
  async enviarNotificacionFactura(cliente, factura, rutaPDF = null) {
    try {
      if (!cliente.whatsapp) {
        return {
          exitoso: false,
          mensaje: 'Cliente sin número de WhatsApp'
        };
      }

      const fechaVencimiento = new Date(factura.fechaVencimiento).toLocaleDateString('es-GT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      // Si hay PDF disponible, enviarlo en lugar del mensaje de texto
      if (rutaPDF) {
        const caption = `
🌊 *SISTEMA DE AGUA LOTI*
Huehuetenango, Guatemala

Hola *${cliente.nombres} ${cliente.apellidos}*

Adjunto encontrarás tu factura de agua:

📄 *Factura:* ${factura.numeroFactura}
💧 *Consumo:* ${factura.consumoLitros} litros
💰 *Monto:* Q${factura.montoTotal.toFixed(2)}
📅 *Vencimiento:* ${fechaVencimiento}

⚠️ *IMPORTANTE:* Esta factura vence a los 7 días de haber sido emitida. Le solicitamos realizar su pago antes de la fecha de vencimiento para evitar cargos adicionales por mora.

¡Gracias por su preferencia! 💙
        `.trim();

        return await this.enviarPDF(cliente.whatsapp, rutaPDF, caption);
      }

      // Si no hay PDF, enviar mensaje de texto (fallback)
      const mensaje = `
🌊 *SISTEMA DE AGUA LOTI*
Huehuetenango, Guatemala

Hola *${cliente.nombres} ${cliente.apellidos}*

Tu factura de agua ha sido generada:

📄 *Factura:* ${factura.numeroFactura}
💧 *Consumo:* ${factura.consumoLitros} litros
💰 *Monto:* Q${factura.montoTotal.toFixed(2)}
📅 *Vencimiento:* ${fechaVencimiento}

📍 *Contador:* ${cliente.contador}
🏘️ *Lote:* ${cliente.lote}

⚠️ *IMPORTANTE:* Esta factura vence a los 7 días de haber sido emitida. Le solicitamos realizar su pago antes de la fecha de vencimiento para evitar cargos adicionales por mora.

¡Gracias por su preferencia! 💙
      `.trim();

      return await this.enviarMensaje(cliente.whatsapp, mensaje);

    } catch (error) {
      console.error('❌ Error al enviar notificación de factura:', error);
      return {
        exitoso: false,
        mensaje: error.message
      };
    }
  }

  /**
   * Enviar confirmación de pago por WhatsApp
   */
  async enviarConfirmacionPago(cliente, pago) {
    try {
      if (!cliente.whatsapp) {
        return { exitoso: false, mensaje: 'Cliente sin WhatsApp' };
      }

      const mensaje = `
🌊 *SISTEMA DE AGUA LOTI*

¡Pago Recibido! ✅

Hola *${cliente.nombres}*

Confirmamos tu pago:

🧾 *Recibo:* ${pago.numeroPago}
💰 *Monto:* Q${pago.montoPagado.toFixed(2)}
💳 *Método:* ${this.capitalizarPrimeraLetra(pago.metodoPago)}
📅 *Fecha:* ${new Date(pago.fechaPago).toLocaleDateString('es-GT')}

¡Gracias por tu pago puntual! 💙
      `.trim();

      return await this.enviarMensaje(cliente.whatsapp, mensaje);

    } catch (error) {
      return { exitoso: false, mensaje: error.message };
    }
  }

  /**
   * Capitaliza la primera letra
   */
  capitalizarPrimeraLetra(texto) {
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  /**
   * Verificar estado del servicio
   */
  obtenerEstado() {
    return {
      habilitado: process.env.WHATSAPP_ENABLED === 'true',
      conectado: this.isReady,
      error: this.initializationError
    };
  }
}

// Exportar instancia única (Singleton)
module.exports = new WhatsAppService();
