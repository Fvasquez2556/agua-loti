/**
 * Servicio de Reconexión de Servicio de Agua
 * Maneja reconexiones con opciones 80% y 100%
 */

const Factura = require('../models/factura.model');
const Cliente = require('../models/cliente.model');
const Reconexion = require('../models/reconexion.model');
const Pago = require('../models/pago.model');
const moraService = require('./mora.service');
const ticketPagoService = require('./ticketPago.service');
const mongoose = require('mongoose');

class ReconexionService {
  constructor() {
    this.COSTO_RECONEXION = 125.00;
    this.PORCENTAJE_PAGO_PARCIAL = 0.80; // 80%
  }

  /**
   * Calcula las opciones de reconexión disponibles para un cliente
   * @param {String} clienteId - ID del cliente
   */
  async calcularOpcionesReconexion(clienteId) {
    try {
      // Obtener información de mora del cliente
      const mora = await moraService.calcularMoraAcumuladaCliente(clienteId);

      if (!mora.requiereReconexion) {
        return {
          requiereReconexion: false,
          mensaje: 'El cliente no requiere reconexión',
          mesesAtrasados: mora.mesesAtrasados
        };
      }

      // OPCIÓN 1: Pago del 80% + reconexión
      const montoPagoParcial = mora.totalAPagar * this.PORCENTAJE_PAGO_PARCIAL;
      const totalOpcion80 = montoPagoParcial + this.COSTO_RECONEXION;
      const saldoPendienteOpcion80 = mora.totalAPagar - montoPagoParcial;

      // OPCIÓN 2: Pago del 100% + reconexión
      const totalOpcion100 = mora.totalAPagar + this.COSTO_RECONEXION;

      // Determinar qué facturas se pagarían con cada opción
      const facturasOpcion80 = this.determinarFacturasAPagar(
        mora.detalleFacturas,
        montoPagoParcial
      );

      return {
        requiereReconexion: true,
        clienteId,
        mesesAtrasados: mora.mesesAtrasados,
        deudaTotal: mora.totalAPagar,
        costoReconexion: this.COSTO_RECONEXION,

        // OPCIÓN 1: Pago Parcial (80%)
        opcionParcial: {
          descripcion: 'Pago del 80% de la deuda + reconexión',
          porcentajeRequerido: 80,
          montoDeuda: Math.round(montoPagoParcial * 100) / 100,
          costoReconexion: this.COSTO_RECONEXION,
          totalAPagar: Math.round(totalOpcion80 * 100) / 100,
          saldoPendiente: Math.round(saldoPendienteOpcion80 * 100) / 100,
          facturasQueSePagan: facturasOpcion80.pagadas,
          facturasQuedanPendientes: facturasOpcion80.pendientes
        },

        // OPCIÓN 2: Pago Total (100%)
        opcionTotal: {
          descripcion: 'Pago del 100% de la deuda + reconexión',
          porcentajeRequerido: 100,
          montoDeuda: mora.totalAPagar,
          costoReconexion: this.COSTO_RECONEXION,
          totalAPagar: Math.round(totalOpcion100 * 100) / 100,
          saldoPendiente: 0,
          facturasQueSePagan: mora.detalleFacturas.map(f => f.numeroFactura),
          facturasQuedanPendientes: [],
          descuento: this.calcularDescuentoLiquidacion(mora.totalAPagar)
        },

        // Detalles de las facturas
        detalleFacturas: mora.detalleFacturas
      };

    } catch (error) {
      console.error('[ReconexionService] Error al calcular opciones:', error);
      throw new Error(`Error al calcular opciones de reconexión: ${error.message}`);
    }
  }

  /**
   * Determina qué facturas se pueden pagar con un monto específico
   * Estrategia: Pagar las facturas más antiguas primero (FIFO)
   */
  determinarFacturasAPagar(facturas, montoDisponible) {
    const pagadas = [];
    const pendientes = [];
    let montoRestante = montoDisponible;

    for (const factura of facturas) {
      if (montoRestante >= factura.totalConMora) {
        pagadas.push({
          numeroFactura: factura.numeroFactura,
          monto: factura.totalConMora,
          estado: 'se pagará completa'
        });
        montoRestante -= factura.totalConMora;
      } else if (montoRestante > 0) {
        pagadas.push({
          numeroFactura: factura.numeroFactura,
          monto: montoRestante,
          estado: 'pago parcial'
        });
        pendientes.push({
          numeroFactura: factura.numeroFactura,
          montoRestante: factura.totalConMora - montoRestante,
          estado: 'pendiente parcial'
        });
        montoRestante = 0;
      } else {
        pendientes.push({
          numeroFactura: factura.numeroFactura,
          montoRestante: factura.totalConMora,
          estado: 'pendiente completa'
        });
      }
    }

    return { pagadas, pendientes };
  }

  /**
   * Calcula descuento por liquidación total
   */
  calcularDescuentoLiquidacion(montoTotal) {
    const porcentajeDescuento = 0.05; // 5%
    const montoDescuento = montoTotal * porcentajeDescuento;

    return {
      aplicable: true,
      porcentaje: 5,
      montoDescuento: Math.round(montoDescuento * 100) / 100,
      totalConDescuento: Math.round((montoTotal - montoDescuento + this.COSTO_RECONEXION) * 100) / 100
    };
  }

  /**
   * Procesa el pago de reconexión CREANDO UNA FACTURA CONSOLIDADA
   * NOTA: No se usan transacciones para compatibilidad con MongoDB standalone
   */
  async procesarReconexion(clienteId, opcion, datosPago) {
    try {
      const opciones = await this.calcularOpcionesReconexion(clienteId);

      if (!opciones.requiereReconexion) {
        throw new Error('El cliente no requiere reconexión');
      }

      const opcionSeleccionada = opcion === 'total'
        ? opciones.opcionTotal
        : opciones.opcionParcial;

      // Validar monto pagado
      if (Math.abs(datosPago.monto - opcionSeleccionada.totalAPagar) > 0.01) {
        throw new Error(
          `El monto pagado (Q${datosPago.monto}) no coincide con ` +
          `el total requerido (Q${opcionSeleccionada.totalAPagar.toFixed(2)})`
        );
      }

      // Obtener todas las facturas pendientes
      const facturasPendientes = await Factura.find({
        clienteId,
        estado: { $in: ['pendiente', 'vencida'] }
      }).sort({ fechaEmision: 1 });

      if (facturasPendientes.length === 0) {
        throw new Error('No hay facturas pendientes para este cliente');
      }

      console.log(`📋 Procesando reconexión para ${facturasPendientes.length} factura(s)...`);

      // ✅ CREAR FACTURA CONSOLIDADA DE RECONEXIÓN
      const facturaConsolidada = await this.crearFacturaConsolidada(
        clienteId,
        facturasPendientes,
        opcionSeleccionada,
        datosPago
      );

      console.log(`✅ Factura consolidada creada: ${facturaConsolidada.numeroFactura}`);

      // ✅ MARCAR FACTURAS ORIGINALES COMO CONSOLIDADAS
      await this.marcarFacturasComoConsolidadas(
        facturasPendientes,
        facturaConsolidada._id
      );

      console.log(`✅ ${facturasPendientes.length} factura(s) marcadas como consolidadas`);

      // Actualizar estado del cliente
      await Cliente.findByIdAndUpdate(
        clienteId,
        {
          estadoServicio: 'activo',
          fechaUltimaReconexion: new Date(),
          $inc: { numeroReconexiones: 1 }
        }
      );

      // Crear registro de reconexión
      const reconexion = await Reconexion.create({
        clienteId,
        tipoOpcion: opcion,
        montoTotal: datosPago.monto,
        montoDeuda: opcionSeleccionada.montoDeuda,
        costoReconexion: opcionSeleccionada.costoReconexion,
        saldoPendiente: opcionSeleccionada.saldoPendiente,
        facturaConsolidadaId: facturaConsolidada._id,
        facturasOriginales: facturasPendientes.map(f => f._id),
        facturasPagadas: [facturaConsolidada._id], // Ahora solo la consolidada
        metodoPago: datosPago.metodoPago,
        referencia: datosPago.referencia,
        procesadoPor: datosPago.usuarioId,
        fechaReconexion: new Date()
      });

      // Generar ticket usando el método existente de ticket consolidado
      let ticketConsolidado = null;
      try {
        const ticketResultado = await ticketPagoService.generarTicketFacturaConsolidada(
          facturaConsolidada._id
        );

        if (ticketResultado.exitoso) {
          console.log(`✅ Ticket de factura consolidada generado:`, ticketResultado.nombreArchivo);
          console.log(`   - Factura: ${facturaConsolidada.numeroFactura}`);
          console.log(`   - Incluye ${facturasPendientes.length} mes(es)`);
          console.log(`   - Ruta: ${ticketResultado.rutaArchivo}`);

          ticketConsolidado = {
            nombreArchivo: ticketResultado.nombreArchivo,
            rutaArchivo: ticketResultado.rutaArchivo,
            facturaConsolidada: facturaConsolidada.numeroFactura,
            facturasOriginales: facturasPendientes.map(f => f.numeroFactura)
          };
        } else {
          console.warn(`⚠️ No se pudo generar ticket:`, ticketResultado.mensaje);
        }
      } catch (ticketError) {
        console.error(`❌ Error al generar ticket:`, ticketError);
        // No fallar la reconexión si falla la generación del ticket
      }

      return {
        exitoso: true,
        mensaje: 'Reconexión procesada exitosamente',
        reconexionId: reconexion._id,
        facturaConsolidada: facturaConsolidada.numeroFactura,
        facturaConsolidadaId: facturaConsolidada._id,
        facturasOriginales: facturasPendientes.length,
        ticketConsolidado: ticketConsolidado,
        saldoPendiente: opcionSeleccionada.saldoPendiente,
        fechaReconexion: new Date()
      };

    } catch (error) {
      console.error('[ReconexionService] Error al procesar reconexión:', error);
      throw error;
    }
  }

  /**
   * Crea una factura consolidada de reconexión
   */
  async crearFacturaConsolidada(clienteId, facturasPendientes, opcionSeleccionada, datosPago) {
    // Preparar detalles de cada factura
    const detallesFacturas = [];
    let totalConsumo = 0;
    let totalMora = 0;

    for (const factura of facturasPendientes) {
      const mora = moraService.calcularMoraFactura(factura);

      detallesFacturas.push({
        facturaId: factura._id,
        numeroFactura: factura.numeroFactura,
        mesNombre: factura.obtenerNombreMes(),
        periodo: {
          inicio: factura.periodoInicio,
          fin: factura.periodoFin
        },
        montoOriginal: factura.montoTotal,
        montoMora: mora.montoMora,
        diasMora: mora.diasMora,
        subtotal: mora.totalConMora
      });

      totalConsumo += factura.montoTotal;
      totalMora += mora.montoMora;
    }

    // Generar número de factura consolidada
    const numeroFacturaConsolidada = await Factura.generarNumeroFacturaReconexion();

    // Crear la factura consolidada
    const facturaConsolidada = await Factura.create({
      numeroFactura: numeroFacturaConsolidada,
      tipoFactura: 'reconexion',
      clienteId: clienteId,

      // Fechas
      fechaEmision: new Date(),
      fechaVencimiento: new Date(), // Vence hoy (ya se está pagando)

      // Período (desde la primera hasta la última factura)
      periodoInicio: facturasPendientes[0].periodoInicio,
      periodoFin: facturasPendientes[facturasPendientes.length - 1].periodoFin,

      // Datos de lectura (promedio o total)
      lecturaAnterior: facturasPendientes[0].lecturaAnterior,
      lecturaActual: facturasPendientes[facturasPendientes.length - 1].lecturaActual,
      consumoLitros: facturasPendientes.reduce((sum, f) => sum + f.consumoLitros, 0),

      // Montos
      montoBase: totalConsumo,
      montoMora: totalMora,
      costoReconexion: opcionSeleccionada.costoReconexion,
      tarifaBase: totalConsumo, // Usamos montoBase para mantener compatibilidad
      montoTotal: totalConsumo + totalMora + opcionSeleccionada.costoReconexion,
      subtotal: totalConsumo + totalMora,

      // Detalles consolidados
      facturasConsolidadas: detallesFacturas,

      // Estado
      estado: 'pagada', // Se marca como pagada inmediatamente
      fechaPago: new Date(),
      metodoPago: datosPago.metodoPago,

      // Observaciones
      observaciones: `Factura consolidada de reconexión. Incluye ${facturasPendientes.length} factura(s): ${facturasPendientes.map(f => f.numeroFactura).join(', ')}`,

      // Usuario
      creadoPor: datosPago.usuarioId
    });

    // Crear el pago único
    const numeroPago = await Pago.generarNumeroPago();
    await Pago.create({
      numeroPago,
      facturaId: facturaConsolidada._id,
      clienteId: clienteId,
      fechaPago: new Date(),
      montoOriginal: totalConsumo,
      montoMora: totalMora,
      montoReconexion: opcionSeleccionada.costoReconexion,
      montoPagado: facturaConsolidada.montoTotal,
      metodoPago: datosPago.metodoPago,
      referenciaPago: datosPago.referencia,
      observaciones: `Pago de factura consolidada de reconexión: ${numeroFacturaConsolidada}. Incluye ${facturasPendientes.length} factura(s).`,
      registradoPor: datosPago.usuarioId,
      facturaSnapshot: {
        numeroFactura: numeroFacturaConsolidada,
        fechaEmision: facturaConsolidada.fechaEmision,
        fechaVencimiento: facturaConsolidada.fechaVencimiento,
        diasMora: 0,
        periodoInicio: facturaConsolidada.periodoInicio,
        periodoFin: facturaConsolidada.periodoFin,
        requiereReconexion: true,
        costoReconexion: opcionSeleccionada.costoReconexion
      }
    });

    return facturaConsolidada;
  }

  /**
   * Marca las facturas originales como consolidadas
   */
  async marcarFacturasComoConsolidadas(facturas, facturaConsolidadaId) {
    for (const factura of facturas) {
      factura.estadoConsolidacion = 'consolidada';
      factura.facturaConsolidadaRef = facturaConsolidadaId;
      factura.estado = 'pagada'; // También marcar como pagada
      factura.fechaPago = new Date();
      factura.observaciones = (factura.observaciones || '') +
        `\n[CONSOLIDADA] Incluida en factura consolidada ${facturaConsolidadaId} el ${new Date().toLocaleDateString()}`;

      await factura.save();
    }
  }
}

module.exports = new ReconexionService();
