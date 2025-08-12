// backend/controllers/factura.controller.js
const Factura = require('../models/factura.model');
const Lectura = require('../models/lectura.model');
const Cliente = require('../models/cliente.model');
const Pago = require('../models/pago.model');

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

    // Intentar guardar la factura con reintentos en caso de duplicado
    let saved = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (!saved && attempts < maxAttempts) {
      try {
        await factura.save();
        saved = true;
      } catch (saveError) {
        if (saveError.code === 11000 && saveError.keyPattern && saveError.keyPattern.numeroFactura) {
          // Error de duplicado en numeroFactura, generar nuevo número
          console.log(`Intento ${attempts + 1}: Número de factura duplicado, generando nuevo número...`);
          factura.numeroFactura = await Factura.generarNumeroFactura();
          attempts++;
        } else {
          // Otro tipo de error, relanzar
          throw saveError;
        }
      }
    }

    if (!saved) {
      throw new Error('No se pudo generar un número de factura único después de varios intentos');
    }

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
 * Obtener estadísticas generales para el dashboard
 */
exports.getEstadisticasDashboard = async (req, res) => {
  try {
    const Cliente = require('../models/cliente.model');
    const Pago = require('../models/pago.model');

    // Obtener fecha actual para filtros
    const fechaActual = new Date();
    const mesActual = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
    const finMesActual = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0, 23, 59, 59);

    // 1. Total de clientes activos
    const totalClientes = await Cliente.countDocuments({ estado: 'activo' });

    // 2. Facturas del mes actual
    const facturasMes = await Factura.countDocuments({
      fechaEmision: {
        $gte: mesActual,
        $lte: finMesActual
      }
    });

    // 3. Facturas pendientes de pago
    const facturasPendientes = await Factura.countDocuments({
      estado: 'pendiente'
    });

    // 4. Ingresos del mes actual (pagos realizados)
    const ingresosMes = await Pago.aggregate([
      {
        $match: {
          fechaPago: {
            $gte: mesActual,
            $lte: finMesActual
          },
          estado: 'completado'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$monto' }
        }
      }
    ]);

    // 5. Facturas vencidas
    const facturasVencidas = await Factura.obtenerFacturasVencidas();
    
    // 6. Monto total pendiente de cobro
    const montoPendiente = await Factura.aggregate([
      {
        $match: {
          estado: 'pendiente'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$montoTotal' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalClientes,
        facturasMes,
        facturasPendientes,
        facturasVencidas: facturasVencidas.length,
        ingresosMes: ingresosMes[0]?.total || 0,
        montoPendiente: montoPendiente[0]?.total || 0,
        ultimaActualizacion: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error);
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

/**
 * Obtener estadísticas avanzadas para el dashboard
 */
exports.getEstadisticasAvanzadas = async (req, res) => {
  try {
    // Obtener estadísticas básicas reutilizando la lógica existente
    const fechaActual = new Date();
    const primerDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
    const ultimoDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0);

    const [
      totalClientes,
      facturasMes,
      pagosPendientes,
      ingresosMes,
      facturasVencidas,
      ingresosPorMes,
      consumoPorProyecto,
      topConsumidores,
      clientesMorosos,
      pagosRecientes,
      facturasPorEstado,
      tendenciaIngresos
    ] = await Promise.all([
      Cliente.countDocuments(),
      Factura.countDocuments({
        fechaEmision: { $gte: primerDiaMes, $lte: ultimoDiaMes }
      }),
      Factura.countDocuments({ estado: 'pendiente' }),
      Factura.aggregate([
        {
          $match: {
            estado: 'pagada',
            fechaEmision: { $gte: primerDiaMes, $lte: ultimoDiaMes }
          }
        },
        { $group: { _id: null, total: { $sum: '$montoTotal' } } }
      ]),
      Factura.countDocuments({
        estado: 'pendiente',
        fechaVencimiento: { $lt: new Date() }
      }),
      obtenerIngresosPorMes(),
      obtenerConsumoPorProyecto(),
      obtenerTopConsumidores(),
      obtenerClientesMorosos(),
      obtenerPagosRecientes(),
      obtenerFacturasPorEstado(),
      obtenerTendenciaIngresos()
    ]);

    const estadisticasBasicas = {
      totalClientes,
      facturasMes,
      pagosPendientes,
      ingresosMes: ingresosMes[0]?.total || 0,
      facturasVencidas
    };

    res.json({
      success: true,
      data: {
        ...estadisticasBasicas,
        ingresosPorMes,
        consumoPorProyecto,
        topConsumidores,
        clientesMorosos,
        pagosRecientes,
        facturasPorEstado,
        tendenciaIngresos
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas avanzadas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Obtener datos para reportes detallados
 */
exports.getDatosReportes = async (req, res) => {
  try {
    const { tipo, fechaInicio, fechaFin, proyecto } = req.query;

    let filtros = {};
    
    // Aplicar filtros de fecha si se proporcionan
    if (fechaInicio || fechaFin) {
      filtros.createdAt = {};
      if (fechaInicio) filtros.createdAt.$gte = new Date(fechaInicio);
      if (fechaFin) filtros.createdAt.$lte = new Date(fechaFin);
    }

    let datos = {};

    switch (tipo) {
      case 'clientes':
        datos = await obtenerDatosClientes(proyecto);
        break;
      case 'facturas':
        datos = await obtenerDatosFacturas(filtros, proyecto);
        break;
      case 'pagos':
        datos = await obtenerDatosPagos(filtros, proyecto);
        break;
      case 'completo':
        datos = await obtenerReporteCompleto(filtros, proyecto);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Tipo de reporte no válido'
        });
    }

    res.json({
      success: true,
      data: datos
    });

  } catch (error) {
    console.error('Error al obtener datos de reportes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Funciones auxiliares para estadísticas avanzadas

async function obtenerIngresosPorMes() {
  const seiseMesesAtras = new Date();
  seiseMesesAtras.setMonth(seiseMesesAtras.getMonth() - 6);

  const pipeline = [
    {
      $match: {
        estado: 'pagada',
        createdAt: { $gte: seiseMesesAtras }
      }
    },
    {
      $group: {
        _id: {
          año: { $year: '$createdAt' },
          mes: { $month: '$createdAt' }
        },
        totalIngresos: { $sum: '$montoTotal' },
        numeroFacturas: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.año': 1, '_id.mes': 1 }
    }
  ];

  return await Factura.aggregate(pipeline);
}

async function obtenerConsumoPorProyecto() {
  const pipeline = [
    {
      $lookup: {
        from: 'clientes',
        localField: 'clienteId',
        foreignField: '_id',
        as: 'cliente'
      }
    },
    { $unwind: '$cliente' },
    {
      $group: {
        _id: '$cliente.proyecto',
        totalConsumo: { $sum: '$consumoLitros' },
        numeroFacturas: { $sum: 1 },
        totalMonto: { $sum: '$montoTotal' },
        promedioConsumo: { $avg: '$consumoLitros' }
      }
    }
  ];

  return await Factura.aggregate(pipeline);
}

async function obtenerTopConsumidores() {
  const pipeline = [
    {
      $lookup: {
        from: 'clientes',
        localField: 'clienteId',
        foreignField: '_id',
        as: 'cliente'
      }
    },
    { $unwind: '$cliente' },
    {
      $group: {
        _id: '$clienteId',
        nombre: { $first: { $concat: ['$cliente.nombres', ' ', '$cliente.apellidos'] } },
        contador: { $first: '$cliente.contador' },
        proyecto: { $first: '$cliente.proyecto' },
        totalConsumo: { $sum: '$consumoLitros' },
        numeroFacturas: { $sum: 1 },
        totalFacturado: { $sum: '$montoTotal' }
      }
    },
    { $sort: { totalConsumo: -1 } },
    { $limit: 5 }
  ];

  return await Factura.aggregate(pipeline);
}

async function obtenerClientesMorosos() {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - 30); // Facturas vencidas hace 30 días

  const pipeline = [
    {
      $match: {
        estado: 'pendiente',
        fechaVencimiento: { $lt: fechaLimite }
      }
    },
    {
      $lookup: {
        from: 'clientes',
        localField: 'clienteId',
        foreignField: '_id',
        as: 'cliente'
      }
    },
    { $unwind: '$cliente' },
    {
      $group: {
        _id: '$clienteId',
        nombre: { $first: { $concat: ['$cliente.nombres', ' ', '$cliente.apellidos'] } },
        contador: { $first: '$cliente.contador' },
        proyecto: { $first: '$cliente.proyecto' },
        whatsapp: { $first: '$cliente.whatsapp' },
        facturasVencidas: { $sum: 1 },
        montoTotal: { $sum: '$montoTotal' },
        facturasMasAntigua: { $min: '$fechaVencimiento' }
      }
    },
    { $sort: { facturasVencidas: -1, montoTotal: -1 } }
  ];

  return await Factura.aggregate(pipeline);
}

async function obtenerPagosRecientes() {
  return await Pago.find()
    .populate('facturaId', 'numeroFactura')
    .populate('clienteId', 'nombres apellidos contador')
    .sort({ createdAt: -1 })
    .limit(10);
}

async function obtenerFacturasPorEstado() {
  const pipeline = [
    {
      $group: {
        _id: '$estado',
        cantidad: { $sum: 1 },
        montoTotal: { $sum: '$montoTotal' }
      }
    }
  ];

  return await Factura.aggregate(pipeline);
}

async function obtenerTendenciaIngresos() {
  const mesActual = new Date();
  const mesAnterior = new Date();
  mesAnterior.setMonth(mesAnterior.getMonth() - 1);

  const [ingresosActual, ingresosAnterior] = await Promise.all([
    Factura.aggregate([
      {
        $match: {
          estado: 'pagada',
          createdAt: {
            $gte: new Date(mesActual.getFullYear(), mesActual.getMonth(), 1),
            $lt: new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 1)
          }
        }
      },
      { $group: { _id: null, total: { $sum: '$montoTotal' } } }
    ]),
    Factura.aggregate([
      {
        $match: {
          estado: 'pagada',
          createdAt: {
            $gte: new Date(mesAnterior.getFullYear(), mesAnterior.getMonth(), 1),
            $lt: new Date(mesAnterior.getFullYear(), mesAnterior.getMonth() + 1, 1)
          }
        }
      },
      { $group: { _id: null, total: { $sum: '$montoTotal' } } }
    ])
  ]);

  const totalActual = ingresosActual[0]?.total || 0;
  const totalAnterior = ingresosAnterior[0]?.total || 0;
  const porcentajeCambio = totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior) * 100 : 0;

  return {
    mesActual: totalActual,
    mesAnterior: totalAnterior,
    porcentajeCambio: Math.round(porcentajeCambio * 100) / 100
  };
}

// Funciones auxiliares para reportes

async function obtenerDatosClientes(proyecto) {
  let filtros = {};
  if (proyecto) filtros.proyecto = proyecto;

  const clientes = await Cliente.find(filtros);
  
  // Obtener estadísticas por cliente
  const clientesConEstadisticas = await Promise.all(
    clientes.map(async (cliente) => {
      const facturas = await Factura.find({ clienteId: cliente._id });
      const pagos = await Pago.find({ clienteId: cliente._id });
      
      const totalFacturado = facturas.reduce((sum, f) => sum + f.montoTotal, 0);
      const totalPagado = pagos.reduce((sum, p) => sum + p.monto, 0);
      const pendiente = totalFacturado - totalPagado;
      
      return {
        ...cliente.toObject(),
        estadisticas: {
          totalFacturas: facturas.length,
          totalFacturado,
          totalPagado,
          pendiente,
          facturasPendientes: facturas.filter(f => f.estado === 'pendiente').length
        }
      };
    })
  );

  return clientesConEstadisticas;
}

async function obtenerDatosFacturas(filtros, proyecto) {
  if (proyecto) {
    // Obtener IDs de clientes del proyecto
    const clientesProyecto = await Cliente.find({ proyecto }).select('_id');
    const clienteIds = clientesProyecto.map(c => c._id);
    filtros.clienteId = { $in: clienteIds };
  }

  return await Factura.find(filtros)
    .populate('clienteId', 'nombres apellidos contador proyecto')
    .sort({ createdAt: -1 });
}

async function obtenerDatosPagos(filtros, proyecto) {
  if (proyecto) {
    const clientesProyecto = await Cliente.find({ proyecto }).select('_id');
    const clienteIds = clientesProyecto.map(c => c._id);
    filtros.clienteId = { $in: clienteIds };
  }

  return await Pago.find(filtros)
    .populate('clienteId', 'nombres apellidos contador proyecto')
    .populate('facturaId', 'numeroFactura')
    .sort({ createdAt: -1 });
}

async function obtenerReporteCompleto(filtros, proyecto) {
  const [clientes, facturas, pagos] = await Promise.all([
    obtenerDatosClientes(proyecto),
    obtenerDatosFacturas(filtros, proyecto),
    obtenerDatosPagos(filtros, proyecto)
  ]);

  return {
    clientes,
    facturas,
    pagos,
    resumen: {
      totalClientes: clientes.length,
      totalFacturas: facturas.length,
      totalPagos: pagos.length,
      montoTotalFacturado: facturas.reduce((sum, f) => sum + f.montoTotal, 0),
      montoTotalPagado: pagos.reduce((sum, p) => sum + p.monto, 0)
    }
  };
}

module.exports = {
  getFacturas: exports.getFacturas,
  getFacturaById: exports.getFacturaById,
  createFactura: exports.createFactura,
  marcarComoPagada: exports.marcarComoPagada,
  anularFactura: exports.anularFactura,
  getResumenFacturacion: exports.getResumenFacturacion,
  getFacturasVencidas: exports.getFacturasVencidas,
  getEstadisticasDashboard: exports.getEstadisticasDashboard,
  getEstadisticasAvanzadas: exports.getEstadisticasAvanzadas,
  getDatosReportes: exports.getDatosReportes
};
