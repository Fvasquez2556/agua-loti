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
    console.log(`   - Factura consolidada: ${resultado.facturaConsolidada}`);
    console.log(`   - Facturas originales: ${resultado.facturasOriginales}`);
    if (resultado.ticketConsolidado) {
      console.log(`   - Ticket: ${resultado.ticketConsolidado.nombreArchivo}`);
    }

    res.json({
      success: true,
      message: 'Reconexión procesada exitosamente',
      data: {
        ...resultado,
        mensaje: `Se procesó la reconexión. Factura consolidada: ${resultado.facturaConsolidada}. Incluye ${resultado.facturasOriginales} mes(es).`
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

/**
 * Obtiene la lista priorizada de clientes que requieren reconexión
 * (≥2 meses de mora)
 */
exports.obtenerListaPriorizada = async (req, res) => {
  try {
    const moraService = require('../services/mora.service');
    const Cliente = require('../models/cliente.model');
    const Factura = require('../models/factura.model');

    console.log('📋 Generando lista priorizada de clientes con mora...');

    // Obtener todos los clientes activos o suspendidos
    const clientes = await Cliente.find({
      estado: { $in: ['activo', 'suspendido'] }
    }).select('_id nombres apellidos dpi contador lote proyecto estadoServicio');

    const clientesPriorizados = [];

    // Analizar cada cliente
    for (const cliente of clientes) {
      try {
        // Calcular mora del cliente
        const mora = await moraService.calcularMoraAcumuladaCliente(cliente._id);

        // Solo incluir clientes con 2 o más meses de atraso
        if (mora.mesesAtrasados >= 2) {
          clientesPriorizados.push({
            clienteId: cliente._id.toString(),
            nombreCompleto: `${cliente.nombres} ${cliente.apellidos}`,
            dpi: cliente.dpi,
            contador: cliente.contador,
            lote: cliente.lote,
            proyecto: cliente.proyecto || 'Sin proyecto',
            estadoServicio: cliente.estadoServicio,
            mesesAtraso: mora.mesesAtrasados,
            deudaTotal: mora.totalAPagar,
            montoOriginal: mora.montoOriginalTotal,
            montoMora: mora.moraTotal,
            facturasPendientes: mora.facturasPendientes,
            // Datos completos del cliente para usar después
            clienteData: cliente
          });
        }
      } catch (error) {
        console.error(`❌ Error al calcular mora de cliente ${cliente._id}:`, error.message);
        // Continuar con el siguiente cliente
        continue;
      }
    }

    console.log(`✅ Lista generada: ${clientesPriorizados.length} clientes requieren reconexión`);

    res.json({
      success: true,
      message: `Se encontraron ${clientesPriorizados.length} clientes que requieren reconexión`,
      data: clientesPriorizados,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[ReconexionController] Error al generar lista priorizada:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar lista de clientes priorizados',
      error: error.message
    });
  }
};
