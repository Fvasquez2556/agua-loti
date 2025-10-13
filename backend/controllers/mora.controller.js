const moraService = require('../services/mora.service');

/**
 * Obtiene la mora acumulada de un cliente
 */
exports.obtenerMoraCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;

    const mora = await moraService.calcularMoraAcumuladaCliente(clienteId);

    res.json({
      success: true,
      data: mora
    });

  } catch (error) {
    console.error('[MoraController] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al calcular mora',
      error: error.message
    });
  }
};

/**
 * Verifica si un cliente requiere corte de servicio
 */
exports.verificarCorteServicio = async (req, res) => {
  try {
    const { clienteId } = req.params;

    const resultado = await moraService.requiereCorteServicio(clienteId);

    res.json({
      success: true,
      data: resultado
    });

  } catch (error) {
    console.error('[MoraController] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar corte',
      error: error.message
    });
  }
};
