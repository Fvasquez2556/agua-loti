// backend/controllers/pago.controller.js
const Pago = require('../models/pago.model');
const Factura = require('../models/factura.model');
const Cliente = require('../models/cliente.model');
const mongoose = require('mongoose');
const ticketPagoService = require('../services/ticketPago.service');

/**
 * Obtener todos los pagos con filtros opcionales
 */
exports.getPagos = async (req, res) => {
  try {
    const {
      clienteId,
      facturaId,
      metodoPago,
      estado,
      fechaInicio,
      fechaFin,
      page = 1,
      limit = 50,
      sortBy = 'fechaPago',
      sortOrder = 'desc'
    } = req.query;

    // Construir filtros
    const filtros = {};
    
    if (clienteId) filtros.clienteId = clienteId;
    if (facturaId) filtros.facturaId = facturaId;
    if (metodoPago) filtros.metodoPago = metodoPago;
    if (estado) filtros.estado = estado;
    
    // Filtro por rango de fechas
    if (fechaInicio || fechaFin) {
      filtros.fechaPago = {};
      if (fechaInicio) filtros.fechaPago.$gte = new Date(fechaInicio);
      if (fechaFin) filtros.fechaPago.$lte = new Date(fechaFin);
    }

    // Configurar paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Ejecutar consulta
    const pagos = await Pago.find(filtros)
      .populate('clienteId', 'nombres apellidos dpi contador lote proyecto whatsapp')
      .populate('facturaId', 'numeroFactura fechaEmision fechaVencimiento montoTotal estado')
      .populate('registradoPor', 'nombres apellidos email')
      .sort(sortConfig)
      .skip(skip)
      .limit(parseInt(limit));

    // Contar total de documentos
    const total = await Pago.countDocuments(filtros);

    res.json({
      success: true,
      data: pagos,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalDocuments: total,
        documentsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener pagos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Obtener un pago por ID
 */
exports.getPagoById = async (req, res) => {
  try {
    const { id } = req.params;

    const pago = await Pago.findById(id)
      .populate('clienteId', 'nombres apellidos dpi contador lote proyecto whatsapp email')
      .populate('facturaId')
      .populate('registradoPor', 'nombres apellidos email')
      .populate('modificadoPor', 'nombres apellidos email');

    if (!pago) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    res.json({
      success: true,
      data: pago
    });

  } catch (error) {
    console.error('Error al obtener pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Obtener facturas pendientes de un cliente
 */
exports.getFacturasPendientesCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;

    // Verificar que el cliente existe
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Obtener facturas pendientes del cliente
    const facturas = await Factura.find({
      clienteId: clienteId,
      estado: { $in: ['pendiente', 'vencida'] }
    })
    .sort({ fechaVencimiento: 1 });

    // Calcular mora para cada factura
    const facturasConMora = facturas.map(factura => {
      const facturaObj = factura.toObject();
      const mora = factura.calcularMora();
      facturaObj.diasMora = mora.diasMora;
      facturaObj.montoMora = mora.montoMora;
      facturaObj.montoTotalConMora = facturaObj.montoTotal + mora.montoMora;
      
      // Actualizar estado si está vencida
      if (mora.diasMora > 0 && facturaObj.estado === 'pendiente') {
        facturaObj.estado = 'vencida';
      }
      
      return facturaObj;
    });

    res.json({
      success: true,
      data: facturasConMora,
      cliente: {
        id: cliente._id,
        nombres: cliente.nombres,
        apellidos: cliente.apellidos,
        contador: cliente.contador,
        proyecto: cliente.proyecto
      }
    });

  } catch (error) {
    console.error('Error al obtener facturas pendientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Registrar un nuevo pago
 */
exports.registrarPago = async (req, res) => {
  try {
    const {
      facturaId,
      fechaPago,
      metodoPago,
      referenciaPago,
      bancoCheque,
      numeroCheque,
      observaciones
    } = req.body;

    // Validaciones básicas
    if (!facturaId || !metodoPago) {
      return res.status(400).json({
        success: false,
        message: 'Factura y método de pago son requeridos'
      });
    }

    // Obtener la factura y verificar que existe y está pendiente
    const factura = await Factura.findById(facturaId)
      .populate('clienteId');

    if (!factura) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    if (factura.estado !== 'pendiente' && factura.estado !== 'vencida') {
      return res.status(400).json({
        success: false,
        message: 'La factura no está pendiente de pago'
      });
    }

    // Calcular mora actual
    const mora = factura.calcularMora();

    // Verificar si hay pagos previos para esta factura
    const pagoExistente = await Pago.findOne({ facturaId });
    if (pagoExistente) {
      return res.status(400).json({
        success: false,
        message: 'Esta factura ya tiene un pago registrado'
      });
    }

    // Generar número de pago
    const numeroPago = await Pago.generarNumeroPago();

    // Crear el objeto de pago
    const datosPago = {
      numeroPago,
      facturaId: factura._id,
      clienteId: factura.clienteId._id,
      fechaPago: fechaPago ? new Date(fechaPago) : new Date(),
      montoOriginal: factura.montoTotal,
      montoMora: mora.montoMora,
      montoReconexion: factura.costoReconexion || 0,
      montoPagado: factura.montoTotal + mora.montoMora + (factura.costoReconexion || 0),
      metodoPago,
      referenciaPago,
      bancoCheque: metodoPago === 'cheque' ? bancoCheque : null,
      numeroCheque: metodoPago === 'cheque' ? numeroCheque : null,
      observaciones,
      registradoPor: req.user.id,
      facturaSnapshot: {
        numeroFactura: factura.numeroFactura,
        fechaEmision: factura.fechaEmision,
        fechaVencimiento: factura.fechaVencimiento,
        diasMora: mora.diasMora,
        periodoInicio: factura.periodoInicio,
        periodoFin: factura.periodoFin
      }
    };

    // Crear el pago
    const pago = new Pago(datosPago);
    await pago.save();

    // Actualizar la factura como pagada
    await Factura.findByIdAndUpdate(
      facturaId,
      {
        estado: 'pagada',
        fechaPago: pago.fechaPago,
        metodoPago: pago.metodoPago,
        referenciaPago: pago.referenciaPago,
        diasMora: mora.diasMora,
        montoMora: mora.montoMora
      }
    );

    // Generar DTE (Documento Tributario Electrónico)
    try {
      await pago.generarDTE();
    } catch (dteError) {
      console.error('Error al generar DTE:', dteError);
      // No fallamos el registro por errores de DTE
      // El pago se registra pero sin DTE
    }

    // Generar ticket automáticamente
    try {
      const ticketResultado = await ticketPagoService.generarTicketPago(pago._id);

      if (ticketResultado.exitoso) {
        console.log('✅ Ticket generado:', ticketResultado.nombreArchivo);
      } else {
        console.warn('⚠️ No se pudo generar el ticket:', ticketResultado.mensaje);
      }
    } catch (ticketError) {
      console.error('❌ Error al generar ticket automáticamente:', ticketError);
      // No fallar la creación del pago si el ticket falla
    }

    // Obtener el pago completo para la respuesta
    const pagoCompleto = await Pago.findById(pago._id)
      .populate('clienteId', 'nombres apellidos contador proyecto')
      .populate('facturaId', 'numeroFactura fechaEmision fechaVencimiento')
      .populate('registradoPor', 'nombres apellidos');

    res.status(201).json({
      success: true,
      message: 'Pago registrado exitosamente',
      data: pagoCompleto
    });

  } catch (error) {
    console.error('Error al registrar pago:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: Object.values(error.errors).map(err => err.message)
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
 * Obtener resumen de facturas pendientes
 */
exports.getResumenFacturasPendientes = async (req, res) => {
  try {
    const { clienteId, proyecto } = req.query;

    // Construir filtros
    const filtros = {
      estado: { $in: ['pendiente', 'vencida'] }
    };

    if (clienteId) filtros.clienteId = clienteId;

    // Obtener facturas pendientes
    const facturas = await Factura.find(filtros)
      .populate('clienteId', 'nombres apellidos contador proyecto');

    // Filtrar por proyecto si se especifica
    let facturasFiltradas = facturas;
    if (proyecto) {
      facturasFiltradas = facturas.filter(f => 
        f.clienteId && f.clienteId.proyecto === proyecto
      );
    }

    // Calcular estadísticas
    let totalPendientes = 0;
    let montoPendiente = 0;
    let facturasVencidas = 0;
    let montoMora = 0;

    const facturasConMora = facturasFiltradas.map(factura => {
      const facturaObj = factura.toObject();
      const mora = factura.calcularMora();
      
      facturaObj.diasMora = mora.diasMora;
      facturaObj.montoMora = mora.montoMora;
      facturaObj.montoTotalConMora = facturaObj.montoTotal + mora.montoMora;

      totalPendientes++;
      montoPendiente += facturaObj.montoTotalConMora;
      
      if (mora.diasMora > 0) {
        facturasVencidas++;
        montoMora += mora.montoMora;
        facturaObj.estado = 'vencida';
      }

      return facturaObj;
    });

    res.json({
      success: true,
      data: facturasConMora,
      resumen: {
        totalFacturas: totalPendientes,
        montoPendiente: Math.round(montoPendiente * 100) / 100,
        facturasVencidas,
        montoMora: Math.round(montoMora * 100) / 100
      }
    });

  } catch (error) {
    console.error('Error al obtener resumen de facturas pendientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Obtener historial de pagos
 */
exports.getHistorialPagos = async (req, res) => {
  try {
    const {
      clienteId,
      metodoPago,
      fechaInicio,
      fechaFin,
      page = 1,
      limit = 20
    } = req.query;

    // Construir filtros
    const filtros = { estado: { $ne: 'cancelado' } };
    
    if (clienteId) filtros.clienteId = clienteId;
    if (metodoPago) filtros.metodoPago = metodoPago;
    
    if (fechaInicio || fechaFin) {
      filtros.fechaPago = {};
      if (fechaInicio) filtros.fechaPago.$gte = new Date(fechaInicio);
      if (fechaFin) filtros.fechaPago.$lte = new Date(fechaFin);
    }

    // Configurar paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Obtener pagos
    const pagos = await Pago.find(filtros)
      .populate('clienteId', 'nombres apellidos contador proyecto')
      .populate('facturaId', 'numeroFactura fechaEmision')
      .populate('registradoPor', 'nombres apellidos')
      .sort({ fechaPago: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Contar total
    const total = await Pago.countDocuments(filtros);

    res.json({
      success: true,
      data: pagos,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalDocuments: total,
        documentsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener historial de pagos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Cancelar un pago
 */
exports.cancelarPago = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const pago = await Pago.findById(id);

    if (!pago) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    if (pago.estado === 'cancelado') {
      return res.status(400).json({
        success: false,
        message: 'El pago ya está cancelado'
      });
    }

    // Cancelar el pago
    await pago.cancelar(motivo);

    // Restaurar el estado de la factura a pendiente
    await Factura.findByIdAndUpdate(
      pago.facturaId,
      {
        estado: 'pendiente',
        fechaPago: null,
        metodoPago: null,
        referenciaPago: null,
        diasMora: 0,
        montoMora: 0
      }
    );

    res.json({
      success: true,
      message: 'Pago cancelado exitosamente',
      data: pago
    });

  } catch (error) {
    console.error('Error al cancelar pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Obtener resumen de pagos (estadísticas)
 */
exports.getResumenPagos = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, proyecto } = req.query;

    // Construir filtros
    const filtros = { estado: { $ne: 'cancelado' } };
    
    if (fechaInicio || fechaFin) {
      filtros.fechaPago = {};
      if (fechaInicio) filtros.fechaPago.$gte = new Date(fechaInicio);
      if (fechaFin) filtros.fechaPago.$lte = new Date(fechaFin);
    }

    // Obtener resumen usando el método estático del modelo
    const resumen = await Pago.obtenerResumenPagos(filtros);

    // Si se especifica proyecto, filtrar por cliente
    if (proyecto) {
      const clientes = await Cliente.find({ proyecto }).select('_id');
      const clienteIds = clientes.map(c => c._id);
      filtros.clienteId = { $in: clienteIds };
      
      const resumenProyecto = await Pago.obtenerResumenPagos(filtros);
      resumen.proyecto = proyecto;
      Object.assign(resumen, resumenProyecto);
    }

    res.json({
      success: true,
      data: resumen
    });

  } catch (error) {
    console.error('Error al obtener resumen de pagos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Regenerar DTE para un pago
 */
exports.regenerarDTE = async (req, res) => {
  try {
    const { id } = req.params;

    const pago = await Pago.findById(id);

    if (!pago) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    if (pago.estado === 'cancelado') {
      return res.status(400).json({
        success: false,
        message: 'No se puede generar DTE para un pago cancelado'
      });
    }

    // Regenerar DTE
    const resultado = await pago.generarDTE();

    res.json({
      success: true,
      message: 'DTE regenerado exitosamente',
      data: {
        pago: pago,
        dte: resultado.dte
      }
    });

  } catch (error) {
    console.error('Error al regenerar DTE:', error);
    res.status(500).json({
      success: false,
      message: 'Error al regenerar DTE',
      error: error.message
    });
  }
};

/**
 * Generar ticket PDF para un pago
 */
exports.generarTicketPago = async (req, res) => {
  try {
    const { id } = req.params;

    // Llamar al servicio
    const resultado = await ticketPagoService.generarTicketPago(id);

    if (resultado.exitoso) {
      // Enviar el archivo PDF
      res.download(resultado.rutaArchivo, resultado.nombreArchivo, (err) => {
        if (err) {
          console.error('Error al enviar ticket:', err);
          res.status(500).json({
            success: false,
            message: 'Error al descargar el ticket'
          });
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: resultado.mensaje
      });
    }

  } catch (error) {
    console.error('Error al generar ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};
