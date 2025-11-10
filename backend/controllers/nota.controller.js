// backend/controllers/nota.controller.js
const Factura = require('../models/factura.model');
const Cliente = require('../models/cliente.model');
const InfileService = require('../services/infile.service');

/**
 * Obtener todas las notas (crédito y débito) con filtros opcionales
 */
exports.getNotas = async (req, res) => {
  try {
    const {
      clienteId,
      tipoFactura, // 'nota-credito' o 'nota-debito'
      fechaInicio,
      fechaFin,
      page = 1,
      limit = 50,
      sortBy = 'fechaEmision',
      sortOrder = 'desc'
    } = req.query;

    // Construir filtros - solo notas de crédito y débito
    const filtros = {
      tipoFactura: { $in: ['nota-credito', 'nota-debito'] }
    };

    if (clienteId) {
      filtros.clienteId = clienteId;
    }

    if (tipoFactura && (tipoFactura === 'nota-credito' || tipoFactura === 'nota-debito')) {
      filtros.tipoFactura = tipoFactura;
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
    const notas = await Factura.find(filtros)
      .populate('clienteId', 'nombres apellidos dpi contador lote proyecto')
      .populate('facturaReferenciaId', 'numeroFactura fechaEmision montoTotal')
      .populate('creadoPor', 'nombres apellidos')
      .sort(sortConfig)
      .skip(skip)
      .limit(parseInt(limit));

    // Contar total de documentos
    const total = await Factura.countDocuments(filtros);

    res.json({
      success: true,
      data: notas,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalDocuments: total,
        documentsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener notas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Obtener una nota por ID
 */
exports.getNotaById = async (req, res) => {
  try {
    const { id } = req.params;

    const nota = await Factura.findById(id)
      .populate('clienteId', 'nombres apellidos dpi contador lote proyecto direccion')
      .populate('facturaReferenciaId')
      .populate('creadoPor', 'nombres apellidos')
      .populate('actualizadoPor', 'nombres apellidos');

    if (!nota) {
      return res.status(404).json({
        success: false,
        message: 'Nota no encontrada'
      });
    }

    // Verificar que sea una nota (no una factura normal)
    if (nota.tipoFactura !== 'nota-credito' && nota.tipoFactura !== 'nota-debito') {
      return res.status(400).json({
        success: false,
        message: 'El documento solicitado no es una nota de crédito ni de débito'
      });
    }

    res.json({
      success: true,
      data: nota
    });

  } catch (error) {
    console.error('Error al obtener nota:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID de nota inválido'
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
 * Crear una nota de crédito (NCRE)
 * Se usa para reducir o anular el monto de una factura
 */
exports.crearNotaCredito = async (req, res) => {
  try {
    const {
      facturaReferenciaId,
      montoNota,
      motivo,
      observaciones
    } = req.body;

    // Validar que la factura de referencia existe
    const facturaOriginal = await Factura.findById(facturaReferenciaId)
      .populate('clienteId', 'nombres apellidos dpi nit contador lote proyecto direccion correoElectronico');

    if (!facturaOriginal) {
      return res.status(404).json({
        success: false,
        message: 'Factura de referencia no encontrada'
      });
    }

    // Validar que no sea una nota haciendo referencia a otra nota
    if (facturaOriginal.tipoFactura === 'nota-credito' || facturaOriginal.tipoFactura === 'nota-debito') {
      return res.status(400).json({
        success: false,
        message: 'No se puede crear una nota que haga referencia a otra nota'
      });
    }

    // Validar que el monto de la nota no sea mayor al monto de la factura
    if (montoNota > facturaOriginal.montoTotal) {
      return res.status(400).json({
        success: false,
        message: 'El monto de la nota de crédito no puede ser mayor al monto de la factura original'
      });
    }

    // Generar número de nota
    const numeroNota = await Factura.generarNumeroFactura();

    // Crear la nota de crédito como una factura especial
    const notaCredito = new Factura({
      numeroFactura: numeroNota,
      clienteId: facturaOriginal.clienteId._id,
      tipoFactura: 'nota-credito',
      facturaReferenciaId: facturaOriginal._id,
      fechaEmision: new Date(),
      fechaVencimiento: new Date(), // Las notas no tienen vencimiento real
      periodoInicio: facturaOriginal.periodoInicio,
      periodoFin: facturaOriginal.periodoFin,
      lecturaAnterior: 0,
      lecturaActual: 0,
      consumoLitros: 0,
      tarifaBase: 0,
      excedenteLitros: 0,
      costoExcedente: 0,
      subtotal: montoNota,
      montoTotal: montoNota,
      subtotalSinIVA: montoNota / 1.12, // Calcular sin IVA
      montoIVA: montoNota - (montoNota / 1.12), // 12% de IVA
      porcentajeIVA: 12,
      estado: 'pagada', // Las notas se consideran procesadas inmediatamente
      observaciones: `NOTA DE CRÉDITO - Motivo: ${motivo}\n${observaciones || ''}`,
      creadoPor: req.user.id,
      fel: {
        tipoDocumento: 'NCRE'
      }
    });

    await notaCredito.save();

    // ========================================
    // CERTIFICACIÓN FEL TIPO NCRE
    // ========================================
    let certificacionFEL = null;
    const infileEnabled = process.env.INFILE_ENABLED === 'true';

    if (infileEnabled) {
      try {
        console.log(`📄 Iniciando certificación FEL (NCRE) para nota ${notaCredito.numeroFactura}...`);

        const infileService = new InfileService();

        // La nota ya tiene el cliente poblado de la consulta anterior
        notaCredito.clienteId = facturaOriginal.clienteId;
        notaCredito.facturaReferenciaId = facturaOriginal;

        // Certificar documento tipo NCRE
        const resultado = await infileService.certificarDocumento('NCRE', notaCredito);

        if (resultado.success) {
          // Actualizar nota con información de certificación
          notaCredito.fel.certificada = true;
          notaCredito.fel.uuid = resultado.uuid;
          notaCredito.fel.numeroAutorizacion = resultado.numeroAutorizacion;
          notaCredito.fel.serie = resultado.serie;
          notaCredito.fel.numero = resultado.numero;
          notaCredito.fel.fechaCertificacion = new Date();
          notaCredito.fel.xmlCertificado = resultado.xml;
          notaCredito.fel.urlVerificacion = resultado.urlVerificacion;
          notaCredito.fel.tipoDocumento = 'NCRE';

          await notaCredito.save();

          certificacionFEL = {
            certificada: true,
            uuid: resultado.uuid,
            numeroAutorizacion: resultado.numeroAutorizacion,
            mensaje: 'Nota de crédito certificada exitosamente con FEL'
          };

          console.log(`✅ Nota de crédito certificada FEL: ${resultado.uuid}`);
        } else {
          // Registrar intento fallido
          notaCredito.fel.intentosFallidos = (notaCredito.fel.intentosFallidos || 0) + 1;
          notaCredito.fel.ultimoError = resultado.mensaje || 'Error desconocido';
          await notaCredito.save();

          certificacionFEL = {
            certificada: false,
            mensaje: resultado.mensaje,
            error: resultado.error
          };

          console.error(`❌ Error en certificación FEL: ${resultado.mensaje}`);
        }
      } catch (felError) {
        // Registrar error en el intento de certificación
        notaCredito.fel.intentosFallidos = (notaCredito.fel.intentosFallidos || 0) + 1;
        notaCredito.fel.ultimoError = felError.message;
        await notaCredito.save();

        certificacionFEL = {
          certificada: false,
          mensaje: 'Error al intentar certificar con FEL',
          error: felError.message
        };

        console.error('❌ Excepción en certificación FEL:', felError);
      }
    } else {
      console.log('ℹ️ Certificación FEL deshabilitada (INFILE_ENABLED=false)');
      certificacionFEL = {
        certificada: false,
        mensaje: 'Certificación FEL deshabilitada en configuración'
      };
    }

    // Poblar datos para respuesta
    await notaCredito.populate('clienteId', 'nombres apellidos contador lote proyecto');
    await notaCredito.populate('facturaReferenciaId', 'numeroFactura fechaEmision montoTotal');
    await notaCredito.populate('creadoPor', 'nombres apellidos');

    res.status(201).json({
      success: true,
      message: 'Nota de crédito creada exitosamente',
      data: notaCredito,
      certificacionFEL: certificacionFEL
    });

  } catch (error) {
    console.error('Error al crear nota de crédito:', error);

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
 * Crear una nota de débito (NDEB)
 * Se usa para aumentar el monto de una factura
 */
exports.crearNotaDebito = async (req, res) => {
  try {
    const {
      facturaReferenciaId,
      montoNota,
      motivo,
      observaciones
    } = req.body;

    // Validar que la factura de referencia existe
    const facturaOriginal = await Factura.findById(facturaReferenciaId)
      .populate('clienteId', 'nombres apellidos dpi nit contador lote proyecto direccion correoElectronico');

    if (!facturaOriginal) {
      return res.status(404).json({
        success: false,
        message: 'Factura de referencia no encontrada'
      });
    }

    // Validar que no sea una nota haciendo referencia a otra nota
    if (facturaOriginal.tipoFactura === 'nota-credito' || facturaOriginal.tipoFactura === 'nota-debito') {
      return res.status(400).json({
        success: false,
        message: 'No se puede crear una nota que haga referencia a otra nota'
      });
    }

    // Generar número de nota
    const numeroNota = await Factura.generarNumeroFactura();

    // Crear la nota de débito como una factura especial
    const notaDebito = new Factura({
      numeroFactura: numeroNota,
      clienteId: facturaOriginal.clienteId._id,
      tipoFactura: 'nota-debito',
      facturaReferenciaId: facturaOriginal._id,
      fechaEmision: new Date(),
      fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
      periodoInicio: facturaOriginal.periodoInicio,
      periodoFin: facturaOriginal.periodoFin,
      lecturaAnterior: 0,
      lecturaActual: 0,
      consumoLitros: 0,
      tarifaBase: 0,
      excedenteLitros: 0,
      costoExcedente: 0,
      subtotal: montoNota,
      montoTotal: montoNota,
      subtotalSinIVA: montoNota / 1.12, // Calcular sin IVA
      montoIVA: montoNota - (montoNota / 1.12), // 12% de IVA
      porcentajeIVA: 12,
      estado: 'pendiente', // Las notas de débito quedan pendientes de pago
      observaciones: `NOTA DE DÉBITO - Motivo: ${motivo}\n${observaciones || ''}`,
      creadoPor: req.user.id,
      fel: {
        tipoDocumento: 'NDEB'
      }
    });

    await notaDebito.save();

    // ========================================
    // CERTIFICACIÓN FEL TIPO NDEB
    // ========================================
    let certificacionFEL = null;
    const infileEnabled = process.env.INFILE_ENABLED === 'true';

    if (infileEnabled) {
      try {
        console.log(`📄 Iniciando certificación FEL (NDEB) para nota ${notaDebito.numeroFactura}...`);

        const infileService = new InfileService();

        // La nota ya tiene el cliente poblado de la consulta anterior
        notaDebito.clienteId = facturaOriginal.clienteId;
        notaDebito.facturaReferenciaId = facturaOriginal;

        // Certificar documento tipo NDEB
        const resultado = await infileService.certificarDocumento('NDEB', notaDebito);

        if (resultado.success) {
          // Actualizar nota con información de certificación
          notaDebito.fel.certificada = true;
          notaDebito.fel.uuid = resultado.uuid;
          notaDebito.fel.numeroAutorizacion = resultado.numeroAutorizacion;
          notaDebito.fel.serie = resultado.serie;
          notaDebito.fel.numero = resultado.numero;
          notaDebito.fel.fechaCertificacion = new Date();
          notaDebito.fel.xmlCertificado = resultado.xml;
          notaDebito.fel.urlVerificacion = resultado.urlVerificacion;
          notaDebito.fel.tipoDocumento = 'NDEB';

          await notaDebito.save();

          certificacionFEL = {
            certificada: true,
            uuid: resultado.uuid,
            numeroAutorizacion: resultado.numeroAutorizacion,
            mensaje: 'Nota de débito certificada exitosamente con FEL'
          };

          console.log(`✅ Nota de débito certificada FEL: ${resultado.uuid}`);
        } else {
          // Registrar intento fallido
          notaDebito.fel.intentosFallidos = (notaDebito.fel.intentosFallidos || 0) + 1;
          notaDebito.fel.ultimoError = resultado.mensaje || 'Error desconocido';
          await notaDebito.save();

          certificacionFEL = {
            certificada: false,
            mensaje: resultado.mensaje,
            error: resultado.error
          };

          console.error(`❌ Error en certificación FEL: ${resultado.mensaje}`);
        }
      } catch (felError) {
        // Registrar error en el intento de certificación
        notaDebito.fel.intentosFallidos = (notaDebito.fel.intentosFallidos || 0) + 1;
        notaDebito.fel.ultimoError = felError.message;
        await notaDebito.save();

        certificacionFEL = {
          certificada: false,
          mensaje: 'Error al intentar certificar con FEL',
          error: felError.message
        };

        console.error('❌ Excepción en certificación FEL:', felError);
      }
    } else {
      console.log('ℹ️ Certificación FEL deshabilitada (INFILE_ENABLED=false)');
      certificacionFEL = {
        certificada: false,
        mensaje: 'Certificación FEL deshabilitada en configuración'
      };
    }

    // Poblar datos para respuesta
    await notaDebito.populate('clienteId', 'nombres apellidos contador lote proyecto');
    await notaDebito.populate('facturaReferenciaId', 'numeroFactura fechaEmision montoTotal');
    await notaDebito.populate('creadoPor', 'nombres apellidos');

    res.status(201).json({
      success: true,
      message: 'Nota de débito creada exitosamente',
      data: notaDebito,
      certificacionFEL: certificacionFEL
    });

  } catch (error) {
    console.error('Error al crear nota de débito:', error);

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
 * Anular una nota (crédito o débito)
 */
exports.anularNota = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const nota = await Factura.findById(id);

    if (!nota) {
      return res.status(404).json({
        success: false,
        message: 'Nota no encontrada'
      });
    }

    // Verificar que sea una nota
    if (nota.tipoFactura !== 'nota-credito' && nota.tipoFactura !== 'nota-debito') {
      return res.status(400).json({
        success: false,
        message: 'El documento no es una nota de crédito ni de débito'
      });
    }

    if (nota.estado === 'anulada') {
      return res.status(400).json({
        success: false,
        message: 'La nota ya está anulada'
      });
    }

    // Anular la nota
    await nota.anular(motivo);

    // Si estaba certificada con FEL, anular en Infile
    if (nota.fel.certificada && process.env.INFILE_ENABLED === 'true') {
      try {
        const infileService = new InfileService();
        await infileService.anularDocumento(
          nota.fel.uuid,
          nota.fel.numeroAutorizacion,
          motivo || 'Anulación de nota'
        );
        console.log(`✅ Nota anulada en FEL: ${nota.fel.uuid}`);
      } catch (felError) {
        console.error('❌ Error al anular nota en FEL:', felError);
        // No fallar la anulación local si falla la anulación en FEL
      }
    }

    await nota.populate('clienteId', 'nombres apellidos contador proyecto');
    await nota.populate('facturaReferenciaId', 'numeroFactura fechaEmision montoTotal');

    res.json({
      success: true,
      message: 'Nota anulada exitosamente',
      data: nota
    });

  } catch (error) {
    console.error('Error al anular nota:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};
