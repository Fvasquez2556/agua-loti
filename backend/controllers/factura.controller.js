// backend/controllers/factura.controller.js
const Factura = require('../models/factura.model');
const Lectura = require('../models/lectura.model');
const Cliente = require('../models/cliente.model');

/**
 * Obtener todas las facturas con filtros opcionales
 */
exports.getFacturas = async (req, res) => {
  try {
    const { 
      clienteId,
      estado,
      fechaInicio,
      fechaFin,
      page = 1,
      limit = 50,
      sortBy = 'fechaEmision',
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
      filtros.fechaEmision = {};
      if (fechaInicio) {
        filtros.fechaEmision.$gte = new Date(fechaInicio);
      }
      if (fechaFin) {
        filtros.fechaEmision.$lte = new Date(fechaFin);
      }
    }

    // Configurar paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Ejecutar consulta
    const facturas = await Factura.find(filtros)
      .populate('clienteId', 'nombres apellidos dpi contador lote proyecto whatsapp')
      .populate('creadoPor', 'nombres apellidos')
      .sort(sortConfig)
      .skip(skip)
      .limit(parseInt(limit));

    // Contar total de documentos
    const total = await Factura.countDocuments(filtros);

    // Calcular mora para facturas pendientes
    const facturasConMora = facturas.map(factura => {
      const facturaObj = factura.toObject();
      if (facturaObj.estado === 'pendiente') {
        const mora = factura.calcularMora();
        facturaObj.diasMora = mora.diasMora;
        facturaObj.montoMora = mora.montoMora;
        facturaObj.montoTotalConMora = facturaObj.montoTotal + mora.montoMora;
      }
      return facturaObj;
    });

    res.json({
      success: true,
      data: facturasConMora,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalDocuments: total,
        documentsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener facturas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Obtener una factura por ID
 */
exports.getFacturaById = async (req, res) => {
  try {
    const { id } = req.params;

    const factura = await Factura.findById(id)
      .populate('clienteId', 'nombres apellidos dpi contador lote proyecto direccion whatsapp')
      .populate('creadoPor', 'nombres apellidos')
      .populate('actualizadoPor', 'nombres apellidos');

    if (!factura) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    // Calcular mora si está pendiente
    const facturaObj = factura.toObject();
    if (facturaObj.estado === 'pendiente') {
      const mora = factura.calcularMora();
      facturaObj.diasMora = mora.diasMora;
      facturaObj.montoMora = mora.montoMora;
      facturaObj.montoTotalConMora = facturaObj.montoTotal + mora.montoMora;
    }

    res.json({
      success: true,
      data: facturaObj
    });

  } catch (error) {
    console.error('Error al obtener factura:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID de factura inválido'
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
 * Crear una nueva factura
 */
exports.createFactura = async (req, res) => {
  try {
    const {
      clienteId,
      lecturaAnterior,
      lecturaActual,
      fechaLectura,
      periodoInicio,
      periodoFin,
      observaciones
    } = req.body;

    // Validar que el cliente existe
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Validar lecturas
    if (lecturaActual < lecturaAnterior) {
      return res.status(400).json({
        success: false,
        message: 'La lectura actual no puede ser menor a la anterior'
      });
    }

    // Calcular consumo
    const consumoLitros = lecturaActual - lecturaAnterior;

    // Calcular tarifa según especificaciones técnicas
    const tarifaCalculada = calcularTarifa(consumoLitros);

    // Generar número de factura único
    const numeroFactura = await Factura.generarNumeroFactura();

    // Crear registro de lectura
    const lectura = new Lectura({
      clienteId,
      lecturaAnterior,
      lecturaActual,
      consumoLitros,
      fechaLectura: new Date(fechaLectura),
      periodoInicio: new Date(periodoInicio),
      periodoFin: new Date(periodoFin),
      numeroContador: cliente.contador,
      estado: 'procesada',
      tomadaPor: req.user.id,
      procesadaPor: req.user.id
    });

    await lectura.save();

    // Crear factura
    const fechaEmision = new Date();
    const fechaVencimiento = new Date(fechaEmision);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 30); // 30 días para pagar

    const factura = new Factura({
      numeroFactura,
      clienteId,
      fechaEmision,
      fechaVencimiento,
      periodoInicio: new Date(periodoInicio),
      periodoFin: new Date(periodoFin),
      lecturaAnterior,
      lecturaActual,
      consumoLitros,
      ...tarifaCalculada,
      observaciones,
      creadoPor: req.user.id
    });

    await factura.save();

    // Asociar factura con lectura
    await lectura.asociarFactura(factura._id);

    // Poblar datos para respuesta
    await factura.populate('clienteId', 'nombres apellidos contador lote proyecto');

    res.status(201).json({
      success: true,
      message: 'Factura generada exitosamente',
      data: factura
    });

  } catch (error) {
    console.error('Error al crear factura:', error);

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
 * Marcar factura como pagada
 */
exports.marcarComoPagada = async (req, res) => {
  try {
    const { id } = req.params;
    const { metodoPago, referenciaPago, fechaPago } = req.body;

    const factura = await Factura.findById(id);
    if (!factura) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    if (factura.estado === 'pagada') {
      return res.status(400).json({
        success: false,
        message: 'La factura ya está marcada como pagada'
      });
    }

    if (factura.estado === 'anulada') {
      return res.status(400).json({
        success: false,
        message: 'No se puede marcar como pagada una factura anulada'
      });
    }

    // Marcar como pagada
    factura.estado = 'pagada';
    factura.fechaPago = fechaPago ? new Date(fechaPago) : new Date();
    factura.metodoPago = metodoPago;
    factura.referenciaPago = referenciaPago;
    factura.actualizadoPor = req.user.id;

    await factura.save();

    await factura.populate('clienteId', 'nombres apellidos contador proyecto');

    res.json({
      success: true,
      message: 'Factura marcada como pagada exitosamente',
      data: factura
    });

  } catch (error) {
    console.error('Error al marcar factura como pagada:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Anular factura
 */
exports.anularFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const factura = await Factura.findById(id);
    if (!factura) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    if (factura.estado === 'anulada') {
      return res.status(400).json({
        success: false,
        message: 'La factura ya está anulada'
      });
    }

    if (factura.estado === 'pagada') {
      return res.status(400).json({
        success: false,
        message: 'No se puede anular una factura pagada'
      });
    }

    // Anular factura
    await factura.anular(motivo);
    factura.actualizadoPor = req.user.id;
    await factura.save();

    await factura.populate('clienteId', 'nombres apellidos contador proyecto');

    res.json({
      success: true,
      message: 'Factura anulada exitosamente',
      data: factura
    });

  } catch (error) {
    console.error('Error al anular factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Obtener resumen de facturación
 */
exports.getResumenFacturacion = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    const filtroFecha = {};
    if (fechaInicio) filtroFecha.$gte = new Date(fechaInicio);
    if (fechaFin) filtroFecha.$lte = new Date(fechaFin);

    const resumen = await Factura.aggregate([
      ...(Object.keys(filtroFecha).length > 0 ? [{ $match: { fechaEmision: filtroFecha } }] : []),
      {
        $group: {
          _id: '$estado',
          cantidad: { $sum: 1 },
          montoTotal: { $sum: '$montoTotal' }
        }
      }
    ]);

    // Obtener facturas vencidas
    const facturasVencidas = await Factura.obtenerFacturasVencidas();

    res.json({
      success: true,
      data: {
        resumenPorEstado: resumen,
        facturasVencidas: facturasVencidas.length,
        totalFacturas: resumen.reduce((acc, curr) => acc + curr.cantidad, 0),
        montoTotalGenerado: resumen.reduce((acc, curr) => acc + curr.montoTotal, 0)
      }
    });

  } catch (error) {
    console.error('Error al obtener resumen de facturación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Obtener facturas vencidas
 */
exports.getFacturasVencidas = async (req, res) => {
  try {
    const facturasVencidas = await Factura.obtenerFacturasVencidas();

    // Calcular mora para cada factura
    const facturasConMora = facturasVencidas.map(factura => {
      const facturaObj = factura.toObject();
      const mora = factura.calcularMora();
      facturaObj.diasMora = mora.diasMora;
      facturaObj.montoMora = mora.montoMora;
      facturaObj.montoTotalConMora = facturaObj.montoTotal + mora.montoMora;
      return facturaObj;
    });

    res.json({
      success: true,
      data: facturasConMora
    });

  } catch (error) {
    console.error('Error al obtener facturas vencidas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Función auxiliar para calcular tarifa según especificaciones técnicas
 */
function calcularTarifa(consumoLitros) {
  const TARIFA_BASE = 50.00;
  const LIMITE_BASE = 30000;
  const PRECIO_POR_LITRO = TARIFA_BASE / LIMITE_BASE;
  const RECARGO_EXCEDENTE = 0.075;

  let tarifaBase = TARIFA_BASE;
  let excedenteLitros = 0;
  let costoExcedente = 0;
  let subtotal = tarifaBase;

  // Calcular excedente si supera el límite base
  if (consumoLitros > LIMITE_BASE) {
    excedenteLitros = consumoLitros - LIMITE_BASE;
    const costoBasicoExcedente = excedenteLitros * PRECIO_POR_LITRO;
    costoExcedente = costoBasicoExcedente * (1 + RECARGO_EXCEDENTE);
    subtotal = tarifaBase + costoExcedente;
  }

  // Aplicar sistema de redondeo
  const montoTotal = aplicarSistemaRedondeo(subtotal);

  return {
    tarifaBase,
    excedenteLitros,
    costoExcedente: Math.round(costoExcedente * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    montoTotal
  };
}

/**
 * Función auxiliar para aplicar sistema de redondeo
 */
function aplicarSistemaRedondeo(amount) {
  const integerPart = Math.floor(amount);
  const decimalPart = amount - integerPart;
  
  if (decimalPart === 0) {
    return amount;
  } else if (decimalPart <= 0.25) {
    return integerPart + 0.25;
  } else if (decimalPart <= 0.50) {
    return integerPart + 0.50;
  } else if (decimalPart <= 0.75) {
    return integerPart + 0.75;
  } else {
    return integerPart + 1.00;
  }
}

module.exports = {
  getFacturas: exports.getFacturas,
  getFacturaById: exports.getFacturaById,
  createFactura: exports.createFactura,
  marcarComoPagada: exports.marcarComoPagada,
  anularFactura: exports.anularFactura,
  getResumenFacturacion: exports.getResumenFacturacion,
  getFacturasVencidas: exports.getFacturasVencidas
};
