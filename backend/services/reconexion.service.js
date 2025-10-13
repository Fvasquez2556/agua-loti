/**
 * Servicio de Reconexión de Servicio de Agua
 * Maneja reconexiones con opciones 80% y 100%
 */

const Factura = require('../models/factura.model');
const Cliente = require('../models/cliente.model');
const Reconexion = require('../models/reconexion.model');
const moraService = require('./mora.service');
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
   * Procesa el pago de reconexión
   */
  async procesarReconexion(clienteId, opcion, datosPago) {
    const session = await mongoose.startSession();
    session.startTransaction();

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

      // Marcar facturas como pagadas
      const facturasPagadas = await this.aplicarPagosFacturas(
        clienteId,
        opcionSeleccionada,
        datosPago,
        session
      );

      // Actualizar estado del cliente
      await Cliente.findByIdAndUpdate(
        clienteId,
        {
          estadoServicio: 'activo',
          fechaUltimaReconexion: new Date(),
          $inc: { numeroReconexiones: 1 }
        },
        { session }
      );

      // Crear registro de reconexión
      const reconexion = await Reconexion.create([{
        clienteId,
        tipoOpcion: opcion,
        montoTotal: datosPago.monto,
        montoDeuda: opcionSeleccionada.montoDeuda,
        costoReconexion: opcionSeleccionada.costoReconexion,
        saldoPendiente: opcionSeleccionada.saldoPendiente,
        facturasPagadas: facturasPagadas.map(f => f._id),
        metodoPago: datosPago.metodoPago,
        referencia: datosPago.referencia,
        procesadoPor: datosPago.usuarioId,
        fechaReconexion: new Date()
      }], { session });

      await session.commitTransaction();

      return {
        exitoso: true,
        mensaje: 'Reconexión procesada exitosamente',
        reconexionId: reconexion[0]._id,
        facturasPagadas: facturasPagadas.length,
        saldoPendiente: opcionSeleccionada.saldoPendiente,
        fechaReconexion: new Date()
      };

    } catch (error) {
      await session.abortTransaction();
      console.error('[ReconexionService] Error al procesar reconexión:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Aplica los pagos a las facturas correspondientes
   */
  async aplicarPagosFacturas(clienteId, opcionSeleccionada, datosPago, session) {
    const facturasPagadas = [];
    const facturasPendientes = await Factura.find({
      clienteId,
      estado: 'pendiente'
    }).sort({ fechaEmision: 1 }).session(session);

    let montoDisponible = opcionSeleccionada.montoDeuda;

    for (const factura of facturasPendientes) {
      const mora = moraService.calcularMoraFactura(factura);
      const totalFactura = mora.totalConMora;

      if (montoDisponible >= totalFactura) {
        // Pagar factura completa
        factura.estado = 'pagada';
        factura.fechaPago = new Date();
        factura.metodoPago = datosPago.metodoPago;
        factura.montoMora = mora.montoMora;
        await factura.save({ session });

        facturasPagadas.push(factura);
        montoDisponible -= totalFactura;
      } else if (montoDisponible > 0) {
        // Pago parcial
        factura.observaciones = (factura.observaciones || '') +
          `\nPago parcial de Q${montoDisponible.toFixed(2)} el ${new Date().toLocaleDateString()}`;
        factura.montoMora = mora.montoMora;
        await factura.save({ session });

        montoDisponible = 0;
      }

      if (montoDisponible <= 0) break;
    }

    return facturasPagadas;
  }
}

module.exports = new ReconexionService();
