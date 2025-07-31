// backend/controllers/lectura.controller.js
const Lectura = require('../models/lectura.model');
const Cliente = require('../models/cliente.model');

/**
 * Obtener todas las lecturas con filtros opcionales
 */
exports.getLecturas = async (req, res) => {
  try {
    const { 
      clienteId,
      estado,
      fechaInicio,
      fechaFin,
      page = 1,
      limit = 50,
      sortBy = 'fechaLectura',
      sortOrder = 'desc'
    } = req.query;

    // Construir filtros
    const filtros = {};
    
    if (clienteId) {
      filtros.clienteId = clienteId;
    }
    
    if (estado) {
      filtros.estado = estado;
    }
    
    // Filtro por rango de fechas
    if (fechaInicio || fechaFin) {
      filtros.fechaLectura = {};
      if (fechaInicio) {
        filtros.fechaLectura.$gte = new Date(fechaInicio);
      }
      if (fechaFin) {
        filtros.fechaLectura.$lte = new Date(fechaFin);
      }
    }

    // Configurar paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Ejecutar consulta
    const lecturas = await Lectura.find(filtros)
      .populate('clienteId', 'nombres apellidos contador lote proyecto')
      .populate('tomadaPor', 'nombres apellidos')
      .populate('procesadaPor', 'nombres apellidos')
      .populate('facturaId', 'numeroFactura estado montoTotal')
      .sort(sortConfig)
      .skip(skip)
      .limit(parseInt(limit));

    // Contar total de documentos
    const total = await Lectura.countDocuments(filtros);

    res.json({
      success: true,
      data: lecturas,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalDocuments: total,
        documentsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener lecturas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Obtener una lectura por ID
 */
exports.getLecturaById = async (req, res) => {
  try {
    const { id } = req.params;

    const lectura = await Lectura.findById(id)
      .populate('clienteId', 'nombres apellidos contador lote proyecto direccion')
      .populate('tomadaPor', 'nombres apellidos')
      .populate('procesadaPor', 'nombres apellidos')
      .populate('facturaId', 'numeroFactura estado montoTotal fechaEmision');

    if (!lectura) {
      return res.status(404).json({
        success: false,
        message: 'Lectura no encontrada'
      });
    }

    res.json({
      success: true,
      data: lectura
    });

  } catch (error) {
    console.error('Error al obtener lectura:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID de lectura inválido'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Crear una nueva lectura
 */
exports.createLectura = async (req, res) => {
  try {
    const {
      clienteId,
      lecturaAnterior,
      lecturaActual,
      fechaLectura,
      periodoInicio,
      periodoFin,
      observaciones,
      esEstimada,
      motivoEstimacion,
      tipoLectura = 'normal'
    } = req.body;

    // Validar que el cliente existe
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Validar lecturas (excepto para estimadas)
    if (!esEstimada && lecturaActual < lecturaAnterior) {
      return res.status(400).json({
        success: false,
        message: 'La lectura actual no puede ser menor a la anterior'
      });
    }

    // Calcular consumo
    const consumoLitros = lecturaActual - lecturaAnterior;

    // Detectar anomalías automáticamente
    const anomaliasDetectadas = await Lectura.detectarAnomalias(clienteId, consumoLitros);

    // Crear lectura
    const lectura = new Lectura({
      clienteId,
      lecturaAnterior,
      lecturaActual,
      consumoLitros,
      fechaLectura: new Date(fechaLectura),
      periodoInicio: new Date(periodoInicio),
      periodoFin: new Date(periodoFin),
      numeroContador: cliente.contador,
      observaciones,
      esEstimada: esEstimada || false,
      motivoEstimacion,
      tipoLectura,
      anomalias: anomaliasDetectadas,
      tomadaPor: req.user.id
    });

    await lectura.save();

    // Poblar datos para respuesta
    await lectura.populate('clienteId', 'nombres apellidos contador lote proyecto');
    await lectura.populate('tomadaPor', 'nombres apellidos');

    res.status(201).json({
      success: true,
      message: 'Lectura registrada exitosamente',
      data: lectura
    });

  } catch (error) {
    console.error('Error al crear lectura:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Obtener la última lectura de un cliente
 */
exports.getUltimaLectura = async (req, res) => {
  try {
    const { clienteId } = req.params;

    const ultimaLectura = await Lectura.obtenerUltimaLectura(clienteId);

    if (!ultimaLectura) {
      return res.json({
        success: true,
        data: null,
        message: 'No hay lecturas registradas para este cliente'
      });
    }

    res.json({
      success: true,
      data: ultimaLectura
    });

  } catch (error) {
    console.error('Error al obtener última lectura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Procesar lectura (marcar como procesada)
 */
exports.procesarLectura = async (req, res) => {
  try {
    const { id } = req.params;

    const lectura = await Lectura.findById(id);
    if (!lectura) {
      return res.status(404).json({
        success: false,
        message: 'Lectura no encontrada'
      });
    }

    if (lectura.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        message: 'La lectura ya ha sido procesada'
      });
    }

    await lectura.marcarComoProcesada(req.user.id);
    await lectura.populate('clienteId', 'nombres apellidos contador proyecto');

    res.json({
      success: true,
      message: 'Lectura procesada exitosamente',
      data: lectura
    });

  } catch (error) {
    console.error('Error al procesar lectura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Corregir una lectura
 */
exports.corregirLectura = async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevaLecturaActual, motivo } = req.body;

    if (!nuevaLecturaActual || !motivo) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere la nueva lectura y el motivo de corrección'
      });
    }

    const lectura = await Lectura.findById(id);
    if (!lectura) {
      return res.status(404).json({
        success: false,
        message: 'Lectura no encontrada'
      });
    }

    if (lectura.estado === 'facturada') {
      return res.status(400).json({
        success: false,
        message: 'No se puede corregir una lectura que ya ha sido facturada'
      });
    }

    await lectura.corregirLectura(nuevaLecturaActual, motivo, req.user.id);
    await lectura.populate('clienteId', 'nombres apellidos contador proyecto');

    res.json({
      success: true,
      message: 'Lectura corregida exitosamente',
      data: lectura
    });

  } catch (error) {
    console.error('Error al corregir lectura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Agregar anomalía a una lectura
 */
exports.agregarAnomalia = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, descripcion } = req.body;

    if (!tipo || !descripcion) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere tipo y descripción de la anomalía'
      });
    }

    const lectura = await Lectura.findById(id);
    if (!lectura) {
      return res.status(404).json({
        success: false,
        message: 'Lectura no encontrada'
      });
    }

    await lectura.agregarAnomalia(tipo, descripcion);
    await lectura.populate('clienteId', 'nombres apellidos contador proyecto');

    res.json({
      success: true,
      message: 'Anomalía agregada exitosamente',
      data: lectura
    });

  } catch (error) {
    console.error('Error al agregar anomalía:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Obtener lecturas pendientes
 */
exports.getLecturasPendientes = async (req, res) => {
  try {
    const lecturasPendientes = await Lectura.obtenerLecturasPendientes();

    res.json({
      success: true,
      data: lecturasPendientes
    });

  } catch (error) {
    console.error('Error al obtener lecturas pendientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Obtener estadísticas de consumo de un cliente
 */
exports.getEstadisticasConsumo = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { meses = 6 } = req.query;

    const estadisticas = await Lectura.obtenerConsumoPromedio(clienteId, parseInt(meses));

    res.json({
      success: true,
      data: estadisticas
    });

  } catch (error) {
    console.error('Error al obtener estadísticas de consumo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Obtener lecturas por período
 */
exports.getLecturasPorPeriodo = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, clienteId } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren fecha de inicio y fin'
      });
    }

    const lecturas = await Lectura.obtenerLecturasPorPeriodo(fechaInicio, fechaFin, clienteId);

    res.json({
      success: true,
      data: lecturas
    });

  } catch (error) {
    console.error('Error al obtener lecturas por período:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getLecturas: exports.getLecturas,
  getLecturaById: exports.getLecturaById,
  createLectura: exports.createLectura,
  getUltimaLectura: exports.getUltimaLectura,
  procesarLectura: exports.procesarLectura,
  corregirLectura: exports.corregirLectura,
  agregarAnomalia: exports.agregarAnomalia,
  getLecturasPendientes: exports.getLecturasPendientes,
  getEstadisticasConsumo: exports.getEstadisticasConsumo,
  getLecturasPorPeriodo: exports.getLecturasPorPeriodo
};
