const reconexionService = require('../services/reconexion.service');

/**
 * Obtiene las opciones de reconexión para un cliente
 */
exports.obtenerOpcionesReconexion = async (req, res) => {
  try {
    const { clienteId } = req.params;

    const opciones = await reconexionService.calcularOpcionesReconexion(clienteId);

    res.json({
      success: true,
      data: opciones
    });

  } catch (error) {
    console.error('[ReconexionController] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al calcular opciones de reconexión',
      error: error.message
    });
  }
};

/**
 * Procesa una reconexión
 */
exports.procesarReconexion = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { opcion, metodoPago, monto, referencia } = req.body;

    // Validar datos requeridos
    if (!opcion || !metodoPago || !monto) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos: opcion, metodoPago, monto'
      });
    }

    if (!['parcial', 'total'].includes(opcion)) {
      return res.status(400).json({
        success: false,
        message: 'Opción inválida. Debe ser "parcial" o "total"'
      });
    }

    const datosPago = {
      monto: parseFloat(monto),
      metodoPago,
      referencia: referencia || null,
      usuarioId: req.user.id // Del middleware de autenticación
    };

    const resultado = await reconexionService.procesarReconexion(
      clienteId,
      opcion,
      datosPago
    );

    res.json({
      success: true,
      message: 'Reconexión procesada exitosamente',
      data: resultado
    });

  } catch (error) {
    console.error('[ReconexionController] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar reconexión',
      error: error.message
    });
  }
};
