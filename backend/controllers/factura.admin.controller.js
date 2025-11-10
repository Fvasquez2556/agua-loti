// backend/controllers/factura.admin.controller.js
/**
 * Controlador para funciones administrativas de facturas
 * Incluye funciones especiales para pruebas y modificación de fechas
 */

const Factura = require('../models/factura.model');
const Cliente = require('../models/cliente.model');
const Lectura = require('../models/lectura.model');
const Auditoria = require('../models/auditoria.model');
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
      fechaVencimiento: fechaVencimientoDate || new Date(fechaEmisionDate.getTime() + 7 * 24 * 60 * 60 * 1000),
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

/**
 * Eliminar facturas selectivas de un cliente específico con registro de auditoría
 * Esta es la función principal para la gestión de facturas por cliente
 */
exports.eliminarFacturasSelectivas = async (req, res) => {
  try {
    console.log('🔍 [ELIMINAR SELECTIVAS] Iniciando proceso...');
    console.log('📦 Body recibido:', JSON.stringify(req.body, null, 2));

    const { clienteId, facturasIds, password, motivo } = req.body;

    // Validaciones de entrada
    if (!clienteId) {
      console.log('❌ [ELIMINAR SELECTIVAS] Falta clienteId');
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del cliente'
      });
    }

    if (!facturasIds || !Array.isArray(facturasIds) || facturasIds.length === 0) {
      console.log('❌ [ELIMINAR SELECTIVAS] facturasIds inválido:', facturasIds);
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs de facturas'
      });
    }

    if (!password) {
      console.log('❌ [ELIMINAR SELECTIVAS] Falta password');
      return res.status(401).json({
        success: false,
        message: 'Se requiere contraseña administrativa'
      });
    }

    if (!motivo || motivo.trim() === '') {
      console.log('❌ [ELIMINAR SELECTIVAS] Falta motivo');
      return res.status(400).json({
        success: false,
        message: 'Se requiere especificar el motivo de la eliminación'
      });
    }

    console.log('🔐 [ELIMINAR SELECTIVAS] Verificando contraseña...');
    console.log('🔑 Hash almacenado:', ADMIN_PASSWORD_HASH ? 'Existe' : 'NO EXISTE');

    // Verificar contraseña administrativa
    const passwordValida = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    console.log('🔐 [ELIMINAR SELECTIVAS] Contraseña válida:', passwordValida);

    if (!passwordValida) {
      console.log('❌ [ELIMINAR SELECTIVAS] Contraseña incorrecta');
      return res.status(401).json({
        success: false,
        message: 'Contraseña administrativa incorrecta'
      });
    }

    console.log('✅ [ELIMINAR SELECTIVAS] Contraseña verificada, continuando...');

    // Verificar que el cliente existe
    console.log('🔍 [ELIMINAR SELECTIVAS] Buscando cliente:', clienteId);
    const cliente = await Cliente.findById(clienteId);

    if (!cliente) {
      console.log('❌ [ELIMINAR SELECTIVAS] Cliente no encontrado');
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }
    console.log('✅ [ELIMINAR SELECTIVAS] Cliente encontrado:', cliente.nombres, cliente.apellidos);

    // Obtener todas las facturas a eliminar
    console.log('🔍 [ELIMINAR SELECTIVAS] Buscando facturas:', facturasIds.length, 'IDs');
    const facturas = await Factura.find({
      _id: { $in: facturasIds },
      clienteId: clienteId // Asegurar que las facturas pertenecen al cliente
    });
    console.log('✅ [ELIMINAR SELECTIVAS] Facturas encontradas:', facturas.length);

    if (facturas.length === 0) {
      console.log('❌ [ELIMINAR SELECTIVAS] No se encontraron facturas');
      return res.status(404).json({
        success: false,
        message: 'No se encontraron facturas válidas para eliminar'
      });
    }

    if (facturas.length !== facturasIds.length) {
      console.log('⚠️ [ELIMINAR SELECTIVAS] Cantidad de facturas no coincide');
      console.log(`   Solicitadas: ${facturasIds.length}, Encontradas: ${facturas.length}`);
      return res.status(400).json({
        success: false,
        message: `Solo se encontraron ${facturas.length} de ${facturasIds.length} facturas solicitadas`,
        facturasEncontradas: facturas.map(f => f.numeroFactura)
      });
    }

    // Guardar información de las facturas antes de eliminarlas
    const facturasEliminadas = facturas.map(factura => ({
      _id: factura._id,
      numeroFactura: factura.numeroFactura,
      montoTotal: factura.montoTotal,
      estado: factura.estado,
      fechaEmision: factura.fechaEmision,
      fechaVencimiento: factura.fechaVencimiento
    }));

    console.log('📋 [ELIMINAR SELECTIVAS] Facturas a eliminar:', facturas.map(f => f.numeroFactura).join(', '));

    // ===== LIMPIEZA EN CASCADA =====

    // 1. Validar que NO sean facturas certificadas por FEL REAL
    console.log('🔍 [ELIMINAR SELECTIVAS] Validando certificación FEL...');
    const infileEnabled = process.env.INFILE_ENABLED === 'true';
    console.log(`   INFILE_ENABLED: ${infileEnabled ? 'true (Producción)' : 'false (Desarrollo)'}`);

    // Solo validar certificación si INFILE está habilitado
    if (infileEnabled) {
      // En producción: validar si tienen autorización de SAT (FEL real)
      const facturasCertificadas = facturas.filter(f =>
        f.fel?.certificada === true && f.fel?.autorizacion
      );

      if (facturasCertificadas.length > 0) {
        console.log('❌ [ELIMINAR SELECTIVAS] Facturas certificadas REALES encontradas:', facturasCertificadas.length);
        return res.status(403).json({
          success: false,
          message: 'No se pueden eliminar facturas certificadas por SAT/FEL. Use la función de Anulación.',
          facturasCertificadas: facturasCertificadas.map(f => ({
            numeroFactura: f.numeroFactura,
            uuid: f.fel.uuid,
            autorizacion: f.fel.autorizacion,
            fechaCertificacion: f.fel.fechaCertificacion
          }))
        });
      }
    } else {
      // En desarrollo: permitir eliminar facturas simuladas
      console.log('   ⚠️  Modo desarrollo: Se permiten eliminar facturas con FEL simulado');
    }
    console.log('✅ [ELIMINAR SELECTIVAS] Validación FEL pasada');

    const Pago = require('../models/pago.model');
    const Reconexion = require('../models/reconexion.model');
    let pagosEliminados = 0;
    let lecturasActualizadas = 0;
    let reconexionesEliminadas = 0;
    let reconexionesActualizadas = 0;
    let facturasConsolidadasActualizadas = 0;

    // 2. Validar y eliminar pagos asociados
    console.log('🔍 [ELIMINAR SELECTIVAS] Validando pagos asociados...');
    for (const factura of facturas) {
      const pagos = await Pago.find({ facturaId: factura._id });
      console.log(`   Factura ${factura.numeroFactura}: ${pagos.length} pagos`);

      // Solo validar si INFILE está habilitado (producción)
      if (infileEnabled) {
        // En producción: verificar si tienen autorización de SAT (pagos reales)
        const pagosCertificados = pagos.filter(p =>
          p.fel?.generado === true && p.fel?.autorizacion
        );

        if (pagosCertificados.length > 0) {
          console.log('❌ [ELIMINAR SELECTIVAS] Pagos certificados REALES encontrados');
          return res.status(403).json({
            success: false,
            message: 'Algunas facturas tienen pagos certificados por SAT/FEL. No se pueden eliminar.',
            pagosCertificados: pagosCertificados.map(p => ({
              numeroPago: p.numeroPago,
              uuid: p.fel.uuid,
              autorizacion: p.fel.autorizacion,
              factura: factura.numeroFactura
            }))
          });
        }
      } else {
        // En desarrollo: informar que se eliminarán pagos simulados
        const pagosSimulados = pagos.filter(p => p.fel?.generado === true);
        if (pagosSimulados.length > 0) {
          console.log(`   ⚠️  ${pagosSimulados.length} pago(s) con FEL simulado serán eliminados`);
        }
      }

      const pagosResult = await Pago.deleteMany({ facturaId: factura._id });
      pagosEliminados += pagosResult.deletedCount;
    }
    console.log(`✅ [ELIMINAR SELECTIVAS] ${pagosEliminados} pagos eliminados`);

    // 3. Actualizar lecturas asociadas (liberar referencia y cambiar estado)
    const lecturasResult = await Lectura.updateMany(
      { facturaId: { $in: facturasIds } },
      {
        $set: {
          facturaId: null,
          estado: 'procesada' // Ya no está facturada
        }
      }
    );
    lecturasActualizadas = lecturasResult.modifiedCount;

    // 4. Limpiar reconexiones
    // Caso A: Eliminar reconexiones donde estas facturas SON la consolidada
    const reconexionesConsolidadasResult = await Reconexion.deleteMany({
      facturaConsolidadaId: { $in: facturasIds }
    });
    reconexionesEliminadas = reconexionesConsolidadasResult.deletedCount;

    // Caso B: Actualizar reconexiones donde estas facturas están en facturasOriginales
    const reconexionesOriginalesResult = await Reconexion.updateMany(
      { facturasOriginales: { $in: facturasIds } },
      { $pull: { facturasOriginales: { $in: facturasIds } } }
    );
    reconexionesActualizadas = reconexionesOriginalesResult.modifiedCount;

    // 5. Limpiar referencias en facturas consolidadas
    // Caso A: Actualizar facturas que tienen a estas como consolidadas dentro de ellas
    await Factura.updateMany(
      { 'facturasConsolidadas.facturaId': { $in: facturasIds } },
      { $pull: { facturasConsolidadas: { facturaId: { $in: facturasIds } } } }
    );

    // Caso B: Actualizar facturas originales que referencian a estas como consolidada
    const facturasOriginalesResult = await Factura.updateMany(
      { facturaConsolidadaRef: { $in: facturasIds } },
      {
        $set: {
          facturaConsolidadaRef: null,
          estadoConsolidacion: 'no_consolidada'
        }
      }
    );
    facturasConsolidadasActualizadas = facturasOriginalesResult.modifiedCount;

    // 6. Finalmente, eliminar todas las facturas
    await Factura.deleteMany({ _id: { $in: facturasIds } });

    // Registrar en el sistema de auditoría
    try {
      await Auditoria.registrarEliminacion({
        usuario: req.user?.id || null,
        clienteAfectado: clienteId,
        facturasEliminadas: facturasEliminadas,
        motivo: motivo,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent')
      });
    } catch (auditoriaError) {
      console.error('Error al registrar en auditoría:', auditoriaError);
      // No fallar la operación si falla la auditoría, solo registrar en consola
    }

    // Registrar en consola
    console.log(`🗑️ [ELIMINACIÓN SELECTIVA DE FACTURAS CON CASCADA COMPLETA]`);
    console.log(`Cliente: ${cliente.nombres} ${cliente.apellidos} (${cliente.dpi})`);
    console.log(`Facturas eliminadas: ${facturasEliminadas.length}`);
    console.log(`Pagos eliminados: ${pagosEliminados}`);
    console.log(`Lecturas actualizadas: ${lecturasActualizadas}`);
    console.log(`Reconexiones eliminadas: ${reconexionesEliminadas}`);
    console.log(`Reconexiones actualizadas: ${reconexionesActualizadas}`);
    console.log(`Facturas consolidadas actualizadas: ${facturasConsolidadasActualizadas}`);
    console.log(`Motivo: ${motivo}`);
    console.log(`Por: ${req.user?.username || 'Administrador'}`);
    console.log(`Fecha: ${new Date().toLocaleString('es-GT')}`);

    console.log('✅ [ELIMINAR SELECTIVAS] Proceso completado exitosamente');

    res.json({
      success: true,
      message: `${facturasEliminadas.length} facturas eliminadas exitosamente con limpieza completa en cascada`,
      data: {
        cantidadEliminada: facturasEliminadas.length,
        facturasEliminadas: facturasEliminadas.map(f => f.numeroFactura),
        limpiezaCascada: {
          pagosEliminados,
          lecturasActualizadas,
          reconexionesEliminadas,
          reconexionesActualizadas,
          facturasConsolidadasActualizadas
        },
        cliente: {
          nombres: cliente.nombres,
          apellidos: cliente.apellidos,
          dpi: cliente.dpi
        },
        motivo: motivo,
        eliminadoPor: req.user?.username || 'Administrador',
        fechaEliminacion: new Date()
      }
    });

  } catch (error) {
    console.error('❌ [ELIMINAR SELECTIVAS] Error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Verificar el estado de las funciones administrativas
 */
exports.verificarEstadoAdmin = async (req, res) => {
  try {
    const enabled = process.env.ENABLE_ADMIN_FUNCTIONS === 'true';
    const environment = process.env.NODE_ENV || 'development';

    let warning = null;
    if (enabled && environment === 'production') {
      warning = 'ADVERTENCIA: Funciones administrativas habilitadas en producción';
    }

    res.json({
      success: true,
      data: {
        enabled,
        environment,
        warning
      }
    });
  } catch (error) {
    console.error('Error al verificar estado admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar estado',
      error: error.message
    });
  }
};

/**
 * Eliminar pagos selectivos de un cliente específico
 * Similar a eliminarFacturasSelectivas pero para pagos
 */
exports.eliminarPagosSelectivos = async (req, res) => {
  try {
    const { clienteId, pagosIds, password, motivo } = req.body;

    // Validaciones de entrada
    if (!clienteId || !pagosIds || !Array.isArray(pagosIds) || pagosIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere clienteId y un array de IDs de pagos'
      });
    }

    if (!password || !motivo || motivo.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Se requiere contraseña administrativa y motivo'
      });
    }

    // Verificar contraseña administrativa
    const passwordValida = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña administrativa incorrecta'
      });
    }

    // Verificar que el cliente existe
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Obtener todos los pagos a eliminar
    const Pago = require('../models/pago.model');
    const pagos = await Pago.find({
      _id: { $in: pagosIds },
      clienteId: clienteId // Asegurar que pertenecen al cliente
    });

    if (pagos.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron pagos válidos para eliminar'
      });
    }

    if (pagos.length !== pagosIds.length) {
      return res.status(400).json({
        success: false,
        message: `Solo se encontraron ${pagos.length} de ${pagosIds.length} pagos solicitados`
      });
    }

    // Validar que NO sean pagos certificados por FEL REAL
    const infileEnabled = process.env.INFILE_ENABLED === 'true';
    console.log(`🔍 INFILE_ENABLED: ${infileEnabled ? 'true (Producción)' : 'false (Desarrollo)'}`);

    // Solo validar si INFILE está habilitado (producción)
    if (infileEnabled) {
      // En producción: verificar si tienen autorización de SAT (pagos reales)
      const pagosCertificados = pagos.filter(p =>
        p.fel?.generado === true && p.fel?.autorizacion
      );

      if (pagosCertificados.length > 0) {
        console.log('❌ Pagos certificados REALES encontrados');
        return res.status(403).json({
          success: false,
          message: 'No se pueden eliminar pagos certificados por SAT/FEL. Use la función de Anulación.',
          pagosCertificados: pagosCertificados.map(p => ({
            numeroPago: p.numeroPago,
            uuid: p.fel.uuid,
            autorizacion: p.fel.autorizacion,
            fechaCertificacion: p.fel.fechaCertificacion
          }))
        });
      }
    } else {
      // En desarrollo: permitir eliminar pagos simulados
      const pagosSimulados = pagos.filter(p => p.fel?.generado === true);
      if (pagosSimulados.length > 0) {
        console.log(`⚠️  Modo desarrollo: ${pagosSimulados.length} pago(s) con FEL simulado serán eliminados`);
      }
    }

    // Guardar información antes de eliminar
    const pagosEliminados = pagos.map(pago => ({
      _id: pago._id,
      numeroPago: pago.numeroPago,
      montoPagado: pago.montoPagado,
      facturaId: pago.facturaId,
      fechaPago: pago.fechaPago
    }));

    // Actualizar estado de facturas asociadas
    const facturasIds = pagos.map(p => p.facturaId);
    let facturasActualizadas = 0;

    for (const facturaId of facturasIds) {
      // Verificar si la factura existe
      const factura = await Factura.findById(facturaId);
      if (factura && factura.estado === 'pagada') {
        // Volver a estado pendiente
        factura.estado = 'pendiente';
        factura.fechaPago = null;
        factura.metodoPago = null;
        factura.referenciaPago = null;
        await factura.save();
        facturasActualizadas++;
      }
    }

    // Eliminar todos los pagos
    await Pago.deleteMany({ _id: { $in: pagosIds } });

    // Registrar en auditoría
    try {
      await Auditoria.create({
        accion: 'eliminacion_pagos',
        usuario: req.user?.id || null,
        clienteAfectado: clienteId,
        detalles: {
          pagosEliminados: pagosEliminados,
          cantidadEliminada: pagosEliminados.length,
          facturasActualizadas,
          motivo: motivo
        },
        timestamp: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent')
      });
    } catch (auditoriaError) {
      console.error('Error al registrar en auditoría:', auditoriaError);
    }

    // Registrar en consola
    console.log(`🗑️ [ELIMINACIÓN SELECTIVA DE PAGOS]`);
    console.log(`Cliente: ${cliente.nombres} ${cliente.apellidos} (${cliente.dpi})`);
    console.log(`Pagos eliminados: ${pagosEliminados.length}`);
    console.log(`Facturas actualizadas: ${facturasActualizadas}`);
    console.log(`Motivo: ${motivo}`);
    console.log(`Por: ${req.user?.username || 'Administrador'}`);
    console.log(`Fecha: ${new Date().toLocaleString('es-GT')}`);

    res.json({
      success: true,
      message: `${pagosEliminados.length} pagos eliminados exitosamente`,
      data: {
        cantidadEliminada: pagosEliminados.length,
        pagosEliminados: pagosEliminados.map(p => p.numeroPago),
        facturasActualizadas,
        cliente: {
          nombres: cliente.nombres,
          apellidos: cliente.apellidos,
          dpi: cliente.dpi
        },
        motivo: motivo,
        eliminadoPor: req.user?.username || 'Administrador',
        fechaEliminacion: new Date()
      }
    });

  } catch (error) {
    console.error('Error al eliminar pagos selectivos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Anular factura certificada por FEL creando Nota de Crédito
 * IMPORTANTE: Solo para facturas YA certificadas
 */
exports.anularFacturaCertificada = async (req, res) => {
  try {
    const { facturaId, password, motivo } = req.body;

    // Validaciones
    if (!facturaId || !password || !motivo || motivo.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Se requiere facturaId, contraseña administrativa y motivo'
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

    // Obtener factura
    const factura = await Factura.findById(facturaId)
      .populate('clienteId', 'nombres apellidos dpi nit');

    if (!factura) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    // Validar que la factura esté certificada
    if (!factura.fel || !factura.fel.certificada) {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden anular facturas certificadas por FEL. Use la función de Eliminación para facturas NO certificadas.'
      });
    }

    // Validar que no esté ya anulada
    if (factura.estado === 'anulada') {
      return res.status(400).json({
        success: false,
        message: 'La factura ya está anulada',
        facturaAnulada: {
          numeroFactura: factura.numeroFactura,
          uuid: factura.fel.uuid,
          observaciones: factura.observaciones
        }
      });
    }

    // TODO: Integración con Infile para generar Nota de Crédito (NCRE)
    // Por ahora, solo marcamos como anulada y registramos

    // Marcar factura como anulada
    factura.estado = 'anulada';
    factura.observaciones = (factura.observaciones || '') +
      `\n[${new Date().toLocaleString('es-GT')}] ANULADA vía FEL - Motivo: ${motivo}. ` +
      `Anulado por: ${req.user?.username || 'Administrador'}`;
    factura.actualizadoPor = req.user?.id;

    await factura.save();

    // Registrar en auditoría
    try {
      await Auditoria.create({
        accion: 'anulacion_factura_fel',
        usuario: req.user?.id || null,
        clienteAfectado: factura.clienteId._id,
        detalles: {
          facturaAnulada: {
            _id: factura._id,
            numeroFactura: factura.numeroFactura,
            uuid: factura.fel.uuid,
            montoTotal: factura.montoTotal
          },
          motivo: motivo
        },
        timestamp: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent')
      });
    } catch (auditoriaError) {
      console.error('Error al registrar en auditoría:', auditoriaError);
    }

    // Registrar en consola
    console.log(`⚠️ [ANULACIÓN DE FACTURA CERTIFICADA FEL]`);
    console.log(`Factura: ${factura.numeroFactura}`);
    console.log(`UUID: ${factura.fel.uuid}`);
    console.log(`Cliente: ${factura.clienteId.nombres} ${factura.clienteId.apellidos}`);
    console.log(`Motivo: ${motivo}`);
    console.log(`Por: ${req.user?.username || 'Administrador'}`);
    console.log(`Fecha: ${new Date().toLocaleString('es-GT')}`);

    res.json({
      success: true,
      message: 'Factura anulada exitosamente. Debe generar Nota de Crédito en Infile.',
      data: {
        facturaAnulada: {
          numeroFactura: factura.numeroFactura,
          uuid: factura.fel.uuid,
          montoTotal: factura.montoTotal,
          fechaCertificacion: factura.fel.fechaCertificacion
        },
        cliente: {
          nombres: factura.clienteId.nombres,
          apellidos: factura.clienteId.apellidos,
          dpi: factura.clienteId.dpi
        },
        motivo: motivo,
        anuladoPor: req.user?.username || 'Administrador',
        fechaAnulacion: new Date(),
        proximoPaso: 'Generar Nota de Crédito (NCRE) en el sistema de Infile'
      }
    });

  } catch (error) {
    console.error('Error al anular factura certificada:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = exports;
