// backend/controllers/factura.admin.controller.js
/**
 * Controlador para funciones administrativas de facturas
 * Incluye funciones especiales para pruebas y modificación de fechas
 */

const Factura = require('../models/factura.model');
const Cliente = require('../models/cliente.model');
const Lectura = require('../models/lectura.model');
const bcrypt = require('bcryptjs');

// Contraseña administrativa para modificar fechas (se recomienda usar variables de entorno)
const ADMIN_PASSWORD_HASH = process.env.ADMIN_FECHA_PASSWORD || '$2a$10$example'; // Cambiar por hash real

/**
 * Crear factura con fecha de vencimiento personalizada (para pruebas)
 * Esta función permite especificar manualmente las fechas de emisión y vencimiento
 */
exports.createFacturaConFechaPersonalizada = async (req, res) => {
  try {
    const {
      clienteId,
      lecturaAnterior,
      lecturaActual,
      fechaLectura,
      periodoInicio,
      periodoFin,
      observaciones,
      // Nuevos campos para personalización
      fechaEmision,
      fechaVencimiento,
      modoPrueba = true // Flag de seguridad
    } = req.body;

    // Validación de seguridad: solo en modo prueba
    if (!modoPrueba) {
      return res.status(403).json({
        success: false,
        message: 'Esta función solo está disponible en modo de prueba'
      });
    }

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

    // Validar fechas personalizadas
    const fechaEmisionDate = fechaEmision ? new Date(fechaEmision) : new Date();
    const fechaVencimientoDate = fechaVencimiento ? new Date(fechaVencimiento) : null;

    if (fechaVencimientoDate && fechaVencimientoDate <= fechaEmisionDate) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de vencimiento debe ser posterior a la fecha de emisión'
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

    // Crear factura con fechas personalizadas
    const factura = new Factura({
      numeroFactura,
      clienteId,
      fechaEmision: fechaEmisionDate,
      fechaVencimiento: fechaVencimientoDate || new Date(fechaEmisionDate.getTime() + 30 * 24 * 60 * 60 * 1000),
      periodoInicio: new Date(periodoInicio),
      periodoFin: new Date(periodoFin),
      lecturaAnterior,
      lecturaActual,
      consumoLitros,
      ...tarifaCalculada,
      observaciones: (observaciones || '') + ' [MODO PRUEBA - FECHA PERSONALIZADA]',
      creadoPor: req.user.id
    });

    await factura.save();

    // Poblar datos del cliente
    const facturaPopulada = await Factura.findById(factura._id)
      .populate('clienteId', 'nombres apellidos contador proyecto whatsapp');

    // Calcular mora si la factura está vencida
    const facturaObj = facturaPopulada.toObject();
    if (facturaObj.estado === 'pendiente') {
      const mora = facturaPopulada.calcularMora();
      facturaObj.diasMora = mora.diasMora;
      facturaObj.montoMora = mora.montoMora;
      facturaObj.montoTotalConMora = facturaObj.montoTotal + mora.montoMora;
    }

    res.status(201).json({
      success: true,
      message: 'Factura de prueba creada exitosamente con fecha personalizada',
      data: facturaObj,
      advertencia: 'Esta es una factura de prueba con fecha personalizada'
    });

  } catch (error) {
    console.error('Error al crear factura con fecha personalizada:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una factura con ese número'
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
 * Modificar fecha de vencimiento de una factura existente
 * Requiere contraseña administrativa
 */
exports.modificarFechaVencimiento = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { nuevaFechaVencimiento, password, motivo } = req.body;

    // Validar contraseña administrativa
    if (!password) {
      return res.status(401).json({
        success: false,
        message: 'Se requiere contraseña administrativa'
      });
    }

    // Verificar contraseña (en producción, usar hash desde base de datos)
    const passwordValida = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña administrativa incorrecta'
      });
    }

    // Validar que la factura existe
    const factura = await Factura.findById(facturaId);
    if (!factura) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    // No permitir modificar facturas pagadas o anuladas
    if (factura.estado === 'pagada' || factura.estado === 'anulada') {
      return res.status(400).json({
        success: false,
        message: `No se puede modificar la fecha de una factura ${factura.estado}`
      });
    }

    // Validar nueva fecha
    const nuevaFecha = new Date(nuevaFechaVencimiento);
    if (isNaN(nuevaFecha.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Fecha de vencimiento inválida'
      });
    }

    if (nuevaFecha <= factura.fechaEmision) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de vencimiento debe ser posterior a la fecha de emisión'
      });
    }

    // Guardar fecha anterior para registro
    const fechaAnterior = factura.fechaVencimiento;

    // Modificar fecha de vencimiento
    factura.fechaVencimiento = nuevaFecha;
    factura.actualizadoPor = req.user.id;
    
    // Agregar nota en observaciones
    const nota = `\n[${new Date().toLocaleString('es-GT')}] Fecha de vencimiento modificada por ${req.user.username || 'Administrador'}. Fecha anterior: ${fechaAnterior.toLocaleDateString('es-GT')}, Nueva fecha: ${nuevaFecha.toLocaleDateString('es-GT')}. Motivo: ${motivo || 'No especificado'}`;
    factura.observaciones = (factura.observaciones || '') + nota;

    await factura.save();

    // Calcular nueva mora con la fecha modificada
    const mora = factura.calcularMora();

    res.json({
      success: true,
      message: 'Fecha de vencimiento modificada exitosamente',
      data: {
        numeroFactura: factura.numeroFactura,
        fechaAnterior: fechaAnterior,
        fechaNueva: nuevaFecha,
        diasMora: mora.diasMora,
        montoMora: mora.montoMora,
        modificadoPor: req.user.username || 'Administrador',
        motivo: motivo || 'No especificado'
      }
    });

  } catch (error) {
    console.error('Error al modificar fecha de vencimiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Crear lote de facturas de prueba con diferentes estados de mora
 * Útil para poblar la base de datos con datos de prueba
 */
exports.crearLoteFacturasPrueba = async (req, res) => {
  try {
    const { clienteId, cantidadFacturas = 5 } = req.body;

    // Validar que el cliente existe
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    const facturasCreadas = [];
    const fechaActual = new Date();

    for (let i = 0; i < cantidadFacturas; i++) {
      // Crear facturas con diferentes rangos de vencimiento
      const diasVencimiento = [0, 10, 30, 60, 90]; // Vencer hoy, hace 10 días, hace 30, etc.
      const dias = diasVencimiento[i % diasVencimiento.length];

      const fechaEmision = new Date(fechaActual);
      fechaEmision.setDate(fechaEmision.getDate() - (dias + 30)); // Emisión hace X días + 30

      const fechaVencimiento = new Date(fechaActual);
      fechaVencimiento.setDate(fechaVencimiento.getDate() - dias);

      const periodoInicio = new Date(fechaEmision);
      periodoInicio.setDate(periodoInicio.getDate() - 30);

      const periodoFin = new Date(fechaEmision);
      periodoFin.setDate(periodoFin.getDate() - 1);

      // Lecturas de prueba
      const lecturaAnterior = 1000 + (i * 50);
      const lecturaActual = lecturaAnterior + 3000 + (i * 200);
      const consumoLitros = lecturaActual - lecturaAnterior;

      // Calcular tarifa
      const tarifaCalculada = calcularTarifa(consumoLitros);

      // Generar número de factura
      const numeroFactura = await Factura.generarNumeroFactura();

      // Crear factura de prueba
      const factura = new Factura({
        numeroFactura,
        clienteId,
        fechaEmision,
        fechaVencimiento,
        periodoInicio,
        periodoFin,
        lecturaAnterior,
        lecturaActual,
        consumoLitros,
        ...tarifaCalculada,
        observaciones: `[FACTURA DE PRUEBA ${i + 1}] Creada para pruebas de sistema`,
        creadoPor: req.user.id
      });

      await factura.save();

      // Calcular mora
      const mora = factura.calcularMora();
      const facturaObj = factura.toObject();
      facturaObj.diasMora = mora.diasMora;
      facturaObj.montoMora = mora.montoMora;
      facturaObj.montoTotalConMora = facturaObj.montoTotal + mora.montoMora;

      facturasCreadas.push(facturaObj);
    }

    res.status(201).json({
      success: true,
      message: `${cantidadFacturas} facturas de prueba creadas exitosamente`,
      data: facturasCreadas
    });

  } catch (error) {
    console.error('Error al crear lote de facturas de prueba:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Generar contraseña hash para uso administrativo
 * Solo debe ejecutarse en desarrollo para generar el hash
 */
exports.generarHashPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere la contraseña'
      });
    }

    const hash = await bcrypt.hash(password, 10);

    res.json({
      success: true,
      message: 'Hash generado. Guárdalo en la variable de entorno ADMIN_FECHA_PASSWORD',
      hash: hash,
      nota: 'Nunca compartas este hash públicamente'
    });

  } catch (error) {
    console.error('Error al generar hash:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar hash',
      error: error.message
    });
  }
};

// Función auxiliar para calcular tarifa (copiada del controlador principal)
function calcularTarifa(consumoLitros) {
  const TARIFA_BASE = 50.00;
  const LIMITE_BASE = 3000; // 3000 litros incluidos
  const TARIFA_EXCEDENTE_POR_LITRO = 0.50;

  let tarifaBase = TARIFA_BASE;
  let excedenteLitros = 0;
  let costoExcedente = 0;
  let subtotal = TARIFA_BASE;

  if (consumoLitros > LIMITE_BASE) {
    excedenteLitros = consumoLitros - LIMITE_BASE;
    costoExcedente = excedenteLitros * TARIFA_EXCEDENTE_POR_LITRO;
    subtotal = TARIFA_BASE + costoExcedente;
  }

  // Redondear al entero más cercano
  const montoTotal = Math.round(subtotal);

  return {
    tarifaBase,
    excedenteLitros,
    costoExcedente: Math.round(costoExcedente * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    montoTotal
  };
}

/**
 * Eliminar una factura con autenticación administrativa
 * Requiere contraseña y puede eliminar facturas pendientes o pagadas
 */
exports.eliminarFactura = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { password, motivo, forzarEliminacion = false } = req.body;

    // Validar contraseña administrativa
    if (!password) {
      return res.status(401).json({
        success: false,
        message: 'Se requiere contraseña administrativa para eliminar facturas'
      });
    }

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña administrativa incorrecta'
      });
    }

    // Validar que la factura existe
    const factura = await Factura.findById(facturaId)
      .populate('clienteId', 'nombres apellidos contador proyecto');

    if (!factura) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    // Validar si la factura está pagada
    if (factura.estado === 'pagada' && !forzarEliminacion) {
      return res.status(403).json({
        success: false,
        message: 'No se puede eliminar una factura pagada. Use forzarEliminacion:true si realmente desea hacerlo.',
        requiereConfirmacion: true,
        factura: {
          numeroFactura: factura.numeroFactura,
          estado: factura.estado,
          montoTotal: factura.montoTotal,
          fechaPago: factura.fechaPago
        }
      });
    }

    // Guardar información antes de eliminar
    const facturaInfo = {
      numeroFactura: factura.numeroFactura,
      cliente: factura.clienteId ? `${factura.clienteId.nombres} ${factura.clienteId.apellidos}` : 'N/A',
      contador: factura.clienteId?.contador || 'N/A',
      montoTotal: factura.montoTotal,
      estado: factura.estado,
      fechaEmision: factura.fechaEmision,
      eliminadoPor: req.user?.username || req.user?.nombres || 'Administrador',
      motivo: motivo || 'No especificado',
      fechaEliminacion: new Date()
    };

    // Verificar si hay pagos asociados
    const Pago = require('../models/pago.model');
    const pagosAsociados = await Pago.find({ facturaId: factura._id });

    if (pagosAsociados.length > 0 && !forzarEliminacion) {
      return res.status(403).json({
        success: false,
        message: 'Esta factura tiene pagos asociados. Use forzarEliminacion:true para eliminar de todas formas.',
        requiereConfirmacion: true,
        pagosAsociados: pagosAsociados.length
      });
    }

    // Si hay pagos asociados y se fuerza la eliminación, también eliminarlos
    if (pagosAsociados.length > 0 && forzarEliminacion) {
      await Pago.deleteMany({ facturaId: factura._id });
      console.log(`⚠️ Se eliminaron ${pagosAsociados.length} pago(s) asociado(s) a la factura ${factura.numeroFactura}`);
    }

    // Eliminar la factura
    await Factura.findByIdAndDelete(facturaId);

    // Registrar en consola la eliminación
    console.log(`🗑️ [ELIMINACIÓN DE FACTURA]`);
    console.log(JSON.stringify(facturaInfo, null, 2));

    res.json({
      success: true,
      message: 'Factura eliminada exitosamente',
      data: facturaInfo,
      pagosEliminados: pagosAsociados.length
    });

  } catch (error) {
    console.error('Error al eliminar factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Eliminar múltiples facturas a la vez (para limpieza masiva de pruebas)
 */
exports.eliminarFacturasMultiples = async (req, res) => {
  try {
    const { facturaIds, password, motivo } = req.body;

    // Validar contraseña administrativa
    if (!password) {
      return res.status(401).json({
        success: false,
        message: 'Se requiere contraseña administrativa para eliminar facturas'
      });
    }

    const passwordValida = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña administrativa incorrecta'
      });
    }

    if (!Array.isArray(facturaIds) || facturaIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs de facturas'
      });
    }

    const resultados = {
      exitosas: [],
      fallidas: [],
      pagosEliminados: 0
    };

    for (const facturaId of facturaIds) {
      try {
        const factura = await Factura.findById(facturaId);

        if (!factura) {
          resultados.fallidas.push({
            facturaId,
            razon: 'Factura no encontrada'
          });
          continue;
        }

        // Eliminar pagos asociados
        const Pago = require('../models/pago.model');
        const pagosResult = await Pago.deleteMany({ facturaId: factura._id });
        resultados.pagosEliminados += pagosResult.deletedCount;

        // Eliminar factura
        await Factura.findByIdAndDelete(facturaId);

        resultados.exitosas.push({
          numeroFactura: factura.numeroFactura,
          montoTotal: factura.montoTotal,
          estado: factura.estado
        });

      } catch (error) {
        resultados.fallidas.push({
          facturaId,
          razon: error.message
        });
      }
    }

    // Registrar en consola
    console.log(`🗑️ [ELIMINACIÓN MASIVA DE FACTURAS]`);
    console.log(`Eliminadas: ${resultados.exitosas.length}`);
    console.log(`Fallidas: ${resultados.fallidas.length}`);
    console.log(`Pagos eliminados: ${resultados.pagosEliminados}`);
    console.log(`Motivo: ${motivo || 'No especificado'}`);
    console.log(`Por: ${req.user?.username || 'Administrador'}`);

    res.json({
      success: true,
      message: `Proceso completado: ${resultados.exitosas.length} facturas eliminadas, ${resultados.fallidas.length} fallidas`,
      data: resultados
    });

  } catch (error) {
    console.error('Error al eliminar facturas múltiples:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = exports;
