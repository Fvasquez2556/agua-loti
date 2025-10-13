const felService = require('../services/fel.service');

/**
 * Verifica el estado de configuración de FEL
 */
exports.verificarEstado = async (req, res) => {
  try {
    const configurado = felService.estaConfigurado();

    res.json({
      success: true,
      fel: {
        configurado,
        mensaje: configurado
          ? 'FEL configurado correctamente'
          : 'FEL no configurado. Agregue credenciales en .env'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al verificar estado de FEL',
      error: error.message
    });
  }
};

/**
 * Certifica una factura (PENDIENTE DE IMPLEMENTACIÓN)
 */
exports.certificarFactura = async (req, res) => {
  try {
    res.status(501).json({
      success: false,
      message: 'Certificación FEL pendiente de implementación',
      instrucciones: [
        '1. Obtener credenciales de Infile',
        '2. Configurar variables de entorno en .env',
        '3. Implementar métodos en fel.service.js'
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en certificación FEL',
      error: error.message
    });
  }
};
