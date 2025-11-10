// backend/services/notificaciones.service.js
const emailService = require('./email.service');
const whatsappService = require('./whatsapp.service');

/**
 * Servicio orquestador de notificaciones
 * Maneja el envío de notificaciones por múltiples canales
 */
class NotificacionesService {

  /**
   * Enviar todas las notificaciones para una nueva factura
   * @param {Object} cliente - Datos del cliente
   * @param {Object} factura - Datos de la factura
   * @param {String} rutaPDF - Ruta del PDF de la factura (opcional)
   */
  async notificarNuevaFactura(cliente, factura, rutaPDF = null) {
    console.log(`\n📨 Enviando notificaciones de factura ${factura.numeroFactura}...`);

    const resultados = {
      email: { enviado: false, mensaje: '' },
      whatsapp: { enviado: false, mensaje: '' }
    };

    // Intentar enviar por email
    if (cliente.correoElectronico) {
      try {
        const resultadoEmail = await emailService.enviarFacturaPorEmail(
          cliente,
          factura,
          rutaPDF
        );
        resultados.email = {
          enviado: resultadoEmail.exitoso,
          mensaje: resultadoEmail.mensaje
        };
      } catch (error) {
        console.error('Error en notificación por email:', error);
        resultados.email = {
          enviado: false,
          mensaje: error.message
        };
      }
    } else {
      resultados.email = {
        enviado: false,
        mensaje: 'Cliente sin correo electrónico'
      };
    }

    // Intentar enviar por WhatsApp
    if (cliente.whatsapp) {
      try {
        const resultadoWhatsApp = await whatsappService.enviarNotificacionFactura(
          cliente,
          factura,
          rutaPDF // Pasar el PDF al servicio de WhatsApp
        );
        resultados.whatsapp = {
          enviado: resultadoWhatsApp.exitoso,
          mensaje: resultadoWhatsApp.mensaje
        };
      } catch (error) {
        console.error('Error en notificación por WhatsApp:', error);
        resultados.whatsapp = {
          enviado: false,
          mensaje: error.message
        };
      }
    } else {
      resultados.whatsapp = {
        enviado: false,
        mensaje: 'Cliente sin número de WhatsApp'
      };
    }

    // Log de resumen
    console.log('📊 Resumen de notificaciones:');
    console.log(`  📧 Email: ${resultados.email.enviado ? '✅' : '❌'} - ${resultados.email.mensaje}`);
    console.log(`  📱 WhatsApp: ${resultados.whatsapp.enviado ? '✅' : '❌'} - ${resultados.whatsapp.mensaje}`);

    return resultados;
  }

  /**
   * Enviar notificaciones de confirmación de pago
   */
  async notificarPagoRecibido(cliente, pago, rutaPDF = null) {
    console.log(`\n📨 Enviando confirmación de pago ${pago.numeroPago}...`);

    const resultados = {
      email: { enviado: false, mensaje: '' },
      whatsapp: { enviado: false, mensaje: '' }
    };

    // Email
    if (cliente.correoElectronico) {
      try {
        const resultadoEmail = await emailService.enviarConfirmacionPago(
          cliente,
          pago,
          rutaPDF
        );
        resultados.email = {
          enviado: resultadoEmail.exitoso,
          mensaje: resultadoEmail.mensaje
        };
      } catch (error) {
        resultados.email = {
          enviado: false,
          mensaje: error.message
        };
      }
    }

    // WhatsApp
    if (cliente.whatsapp) {
      try {
        const resultadoWhatsApp = await whatsappService.enviarConfirmacionPago(
          cliente,
          pago
        );
        resultados.whatsapp = {
          enviado: resultadoWhatsApp.exitoso,
          mensaje: resultadoWhatsApp.mensaje
        };
      } catch (error) {
        resultados.whatsapp = {
          enviado: false,
          mensaje: error.message
        };
      }
    }

    // Log de resumen
    console.log('📊 Resumen de confirmación de pago:');
    console.log(`  📧 Email: ${resultados.email.enviado ? '✅' : '❌'} - ${resultados.email.mensaje}`);
    console.log(`  📱 WhatsApp: ${resultados.whatsapp.enviado ? '✅' : '❌'} - ${resultados.whatsapp.mensaje}`);

    return resultados;
  }

  /**
   * Verificar estado de los servicios de notificación
   */
  verificarEstado() {
    const estadoWhatsApp = whatsappService.obtenerEstado();

    return {
      email: {
        habilitado: !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD),
        configurado: !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD)
      },
      whatsapp: estadoWhatsApp
    };
  }
}

module.exports = new NotificacionesService();
