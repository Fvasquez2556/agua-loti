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

    // Log de éxito con detalles
    console.log('✅ Reconexión procesada exitosamente:');
    console.log(`   - Facturas pagadas: ${resultado.facturasPagadas}`);
    console.log(`   - Pagos generados: ${resultado.pagosGenerados}`);
    if (resultado.ticketConsolidado) {
      console.log(`   - Ticket consolidado: ${resultado.ticketConsolidado.nombreArchivo}`);
    }

    res.json({
      success: true,
      message: 'Reconexión procesada exitosamente',
      data: {
        ...resultado,
        mensaje: `Se procesó la reconexión. ${resultado.pagosGenerados} pago(s) registrado(s) y ticket consolidado generado.`
      }
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
