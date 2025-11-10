// backend/services/email.service.js
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

/**
 * Servicio de envío de emails para Sistema de Agua LOTI
 */
class EmailService {
  constructor() {
    // Configurar transporter de nodemailer
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Verificar configuración
    this.verificarConexion();
  }

  /**
   * Verifica si la configuración de email es válida
   */
  async verificarConexion() {
    try {
      await this.transporter.verify();
      console.log('✅ Servicio de email configurado correctamente');
    } catch (error) {
      console.warn('⚠️ Servicio de email no configurado:', error.message);
    }
  }

  /**
   * Enviar factura por correo electrónico
   * @param {Object} cliente - Datos del cliente
   * @param {Object} factura - Datos de la factura
   * @param {String} rutaPDF - Ruta del archivo PDF (opcional)
   */
  async enviarFacturaPorEmail(cliente, factura, rutaPDF = null) {
    try {
      // Validar que el cliente tenga email
      if (!cliente.correoElectronico) {
        return {
          exitoso: false,
          mensaje: 'El cliente no tiene correo electrónico registrado'
        };
      }

      // Validar variables de entorno
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        return {
          exitoso: false,
          mensaje: 'Credenciales de email no configuradas en .env'
        };
      }

      // Formatear fechas
      const fechaEmision = new Date(factura.fechaEmision).toLocaleDateString('es-GT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      const fechaVencimiento = new Date(factura.fechaVencimiento).toLocaleDateString('es-GT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      // Configurar opciones del email
      const mailOptions = {
        from: {
          name: 'Sistema de Agua LOTI',
          address: process.env.EMAIL_USER
        },
        to: cliente.correoElectronico,
        subject: `Factura ${factura.numeroFactura} - Sistema de Agua LOTI`,
        html: this.generarHTMLFactura(cliente, factura, fechaEmision, fechaVencimiento),
        attachments: []
      };

      // Adjuntar PDF si existe
      if (rutaPDF && fs.existsSync(rutaPDF)) {
        mailOptions.attachments.push({
          filename: `Factura-${factura.numeroFactura}.pdf`,
          path: rutaPDF
        });
      }

      // Enviar email
      const info = await this.transporter.sendMail(mailOptions);

      console.log(`✅ Email enviado a ${cliente.correoElectronico} - ID: ${info.messageId}`);

      return {
        exitoso: true,
        mensaje: 'Email enviado correctamente',
        messageId: info.messageId
      };

    } catch (error) {
      console.error('❌ Error al enviar email:', error);
      return {
        exitoso: false,
        mensaje: `Error al enviar email: ${error.message}`
      };
    }
  }

  /**
   * Generar HTML del email
   */
  generarHTMLFactura(cliente, factura, fechaEmision, fechaVencimiento) {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
          }
          .info-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #667eea;
          }
          .info-item {
            margin: 10px 0;
          }
          .label {
            font-weight: bold;
            color: #667eea;
          }
          .amount {
            font-size: 32px;
            color: #667eea;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
          }
          .footer {
            background: #333;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 0 0 10px 10px;
            font-size: 12px;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>💧 Sistema de Agua LOTI</h1>
          <p>Huehuetenango, Guatemala</p>
        </div>

        <div class="content">
          <h2>Hola, ${cliente.nombres} ${cliente.apellidos}</h2>

          <p>Se ha generado tu factura de servicio de agua. A continuación, los detalles:</p>

          <div class="info-box">
            <div class="info-item">
              <span class="label">📄 Número de Factura:</span> ${factura.numeroFactura}
            </div>
            <div class="info-item">
              <span class="label">📅 Fecha de Emisión:</span> ${fechaEmision}
            </div>
            <div class="info-item">
              <span class="label">⏰ Fecha de Vencimiento:</span> ${fechaVencimiento}
            </div>
            <div class="info-item">
              <span class="label">📍 Contador:</span> ${cliente.contador}
            </div>
            <div class="info-item">
              <span class="label">🏘️ Lote:</span> ${cliente.lote}
            </div>
            <div class="info-item">
              <span class="label">🏗️ Proyecto:</span> ${this.formatearNombreProyecto(cliente.proyecto)}
            </div>
          </div>

          <div class="info-box">
            <h3 style="margin-top: 0; color: #667eea;">💰 Detalles del Consumo</h3>
            <div class="info-item">
              <span class="label">Lectura Anterior:</span> ${factura.lecturaAnterior} L
            </div>
            <div class="info-item">
              <span class="label">Lectura Actual:</span> ${factura.lecturaActual} L
            </div>
            <div class="info-item">
              <span class="label">Consumo:</span> ${factura.consumoLitros} L
            </div>
          </div>

          <div class="amount">
            Q ${factura.montoTotal.toFixed(2)}
          </div>

          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #856404; font-weight: bold;">⚠️ IMPORTANTE</p>
            <p style="margin: 10px 0 0 0; color: #856404;">
              Esta factura vence a los <strong>10 días</strong> de haber sido emitida. Le solicitamos realizar su pago antes de la fecha de vencimiento para evitar cargos adicionales por mora.
            </p>
          </div>
        </div>

        <div class="footer">
          <p><strong>Sistema de Agua LOTI</strong></p>
          <p>Huehuetenango, Guatemala</p>
          <p style="margin-top: 15px; font-size: 11px;">
            Este es un mensaje automático, por favor no responder a este correo.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Enviar notificación de pago recibido
   */
  async enviarConfirmacionPago(cliente, pago, rutaPDF = null) {
    try {
      if (!cliente.correoElectronico) {
        return { exitoso: false, mensaje: 'Cliente sin email' };
      }

      // Validar variables de entorno
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        return {
          exitoso: false,
          mensaje: 'Credenciales de email no configuradas en .env'
        };
      }

      const mailOptions = {
        from: {
          name: 'Sistema de Agua LOTI',
          address: process.env.EMAIL_USER
        },
        to: cliente.correoElectronico,
        subject: `Confirmación de Pago ${pago.numeroPago} - Sistema de Agua LOTI`,
        html: this.generarHTMLConfirmacionPago(cliente, pago),
        attachments: rutaPDF && fs.existsSync(rutaPDF) ? [{
          filename: `Recibo-${pago.numeroPago}.pdf`,
          path: rutaPDF
        }] : []
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Confirmación de pago enviada a ${cliente.correoElectronico}`);

      return { exitoso: true, mensaje: 'Confirmación enviada' };

    } catch (error) {
      console.error('❌ Error al enviar confirmación de pago:', error);
      return { exitoso: false, mensaje: error.message };
    }
  }

  /**
   * Generar HTML de confirmación de pago
   */
  generarHTMLConfirmacionPago(cliente, pago) {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
          }
          .info-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #28a745;
          }
          .info-item {
            margin: 10px 0;
          }
          .label {
            font-weight: bold;
            color: #28a745;
          }
          .amount {
            font-size: 32px;
            color: #28a745;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
          }
          .footer {
            background: #333;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 0 0 10px 10px;
            font-size: 12px;
          }
          .success-badge {
            background: #28a745;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            display: inline-block;
            margin: 10px 0;
            font-size: 14px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>✅ ¡Pago Recibido!</h1>
          <p>Sistema de Agua LOTI</p>
        </div>

        <div class="content">
          <h2>Estimado/a ${cliente.nombres} ${cliente.apellidos}</h2>

          <p>Confirmamos que hemos recibido tu pago:</p>

          <div class="success-badge">
            ✓ PAGO PROCESADO EXITOSAMENTE
          </div>

          <div class="info-box">
            <div class="info-item">
              <span class="label">🧾 Número de Pago:</span> ${pago.numeroPago}
            </div>
            <div class="info-item">
              <span class="label">📅 Fecha:</span> ${new Date(pago.fechaPago).toLocaleDateString('es-GT')}
            </div>
            <div class="info-item">
              <span class="label">💳 Método:</span> ${this.capitalizarPrimeraLetra(pago.metodoPago)}
            </div>
            ${pago.referenciaPago ? `
            <div class="info-item">
              <span class="label">📝 Referencia:</span> ${pago.referenciaPago}
            </div>
            ` : ''}
          </div>

          <div class="amount">
            Q ${pago.montoPagado.toFixed(2)}
          </div>

          <p style="text-align: center; color: #666;">
            Gracias por tu pago puntual. Tu recibo ha sido adjuntado a este correo.
          </p>
        </div>

        <div class="footer">
          <p><strong>Sistema de Agua LOTI</strong></p>
          <p>Huehuetenango, Guatemala</p>
          <p style="margin-top: 15px; font-size: 11px;">
            Este es un mensaje automático, por favor no responder a este correo.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Formatea el nombre del proyecto
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
   * Capitaliza la primera letra
   */
  capitalizarPrimeraLetra(texto) {
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
}

// Exportar instancia única (Singleton)
module.exports = new EmailService();
