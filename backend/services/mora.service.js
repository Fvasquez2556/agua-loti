/**
 * Servicio de Cálculo de Mora Acumulada
 * Sistema de Agua LOTI - Huehuetenango, Guatemala
 */

const Factura = require('../models/factura.model');

class MoraService {
  constructor() {
    this.MORA_MENSUAL = 0.07; // 7% mensual
  }

  /**
   * Calcula mora acumulada para un cliente con múltiples facturas vencidas
   * @param {String} clienteId - ID del cliente
   * @returns {Object} Detalle completo de mora
   */
  async calcularMoraAcumuladaCliente(clienteId) {
    try {
      // Obtener todas las facturas pendientes del cliente, ordenadas por antigüedad
      const facturasPendientes = await Factura.find({
        clienteId: clienteId,
        estado: 'pendiente'
      }).sort({ fechaEmision: 1 }); // Más antiguas primero

      if (facturasPendientes.length === 0) {
        return {
          tieneDeuda: false,
          facturasPendientes: 0,
          mesesAtrasados: 0,
          montoOriginalTotal: 0,
          moraTotal: 0,
          totalAPagar: 0,
          detalleFacturas: []
        };
      }

      const hoy = new Date();
      let montoOriginalTotal = 0;
      let moraTotal = 0;
      const detalleFacturas = [];

      for (const factura of facturasPendientes) {
        const detalleFactura = this.calcularMoraFactura(factura, hoy);
        detalleFacturas.push(detalleFactura);

        montoOriginalTotal += detalleFactura.montoOriginal;
        moraTotal += detalleFactura.montoMora;
      }

      const totalAPagar = montoOriginalTotal + moraTotal;

      // Determinar nivel de criticidad
      const mesesAtrasados = detalleFacturas.length;
      let nivelCriticidad = 'bajo';
      if (mesesAtrasados >= 3) nivelCriticidad = 'critico';
      else if (mesesAtrasados >= 2) nivelCriticidad = 'alto';
      else if (mesesAtrasados >= 1) nivelCriticidad = 'medio';

      // Determinar si requiere reconexión
      const requiereReconexion = mesesAtrasados >= 2;

      return {
        tieneDeuda: true,
        facturasPendientes: facturasPendientes.length,
        mesesAtrasados: mesesAtrasados,
        montoOriginalTotal: Math.round(montoOriginalTotal * 100) / 100,
        moraTotal: Math.round(moraTotal * 100) / 100,
        totalAPagar: Math.round(totalAPagar * 100) / 100,
        nivelCriticidad,
        requiereReconexion,
        costoReconexion: requiereReconexion ? 125.00 : 0,
        detalleFacturas,
        facturasMasAntigua: detalleFacturas[0],
        facturasMasReciente: detalleFacturas[detalleFacturas.length - 1]
      };

    } catch (error) {
      console.error('[MoraService] Error al calcular mora acumulada:', error);
      throw new Error(`Error al calcular mora: ${error.message}`);
    }
  }

  /**
   * Calcula mora para una factura individual
   * @param {Object} factura - Documento de factura
   * @param {Date} fechaCalculo - Fecha para calcular (default: hoy)
   */
  calcularMoraFactura(factura, fechaCalculo = new Date()) {
    const fechaVencimiento = new Date(factura.fechaVencimiento);

    // Si no está vencida
    if (fechaCalculo <= fechaVencimiento) {
      return {
        facturaId: factura._id,
        numeroFactura: factura.numeroFactura,
        fechaEmision: factura.fechaEmision,
        fechaVencimiento: factura.fechaVencimiento,
        montoOriginal: factura.montoTotal,
        diasVencidos: 0,
        mesesCompletos: 0,
        porcentajeMora: 0,
        montoMora: 0,
        totalConMora: factura.montoTotal,
        estado: 'vigente'
      };
    }

    // Calcular días vencidos
    const diasVencidos = Math.floor((fechaCalculo - fechaVencimiento) / (1000 * 60 * 60 * 24));

    // Calcular meses completos
    const mesesCompletos = Math.floor(diasVencidos / 30);

    // Calcular porcentaje de mora
    const porcentajeMora = mesesCompletos * this.MORA_MENSUAL;

    // Calcular monto de mora
    const montoMora = factura.montoTotal * porcentajeMora;

    // Total con mora
    const totalConMora = factura.montoTotal + montoMora;

    return {
      facturaId: factura._id,
      numeroFactura: factura.numeroFactura,
      fechaEmision: factura.fechaEmision,
      fechaVencimiento: factura.fechaVencimiento,
      montoOriginal: factura.montoTotal,
      diasVencidos,
      mesesCompletos,
      porcentajeMora: Math.round(porcentajeMora * 10000) / 100,
      montoMora: Math.round(montoMora * 100) / 100,
      totalConMora: Math.round(totalConMora * 100) / 100,
      estado: mesesCompletos >= 2 ? 'critico' : 'vencido'
    };
  }

  /**
   * Verifica si un cliente requiere corte de servicio
   * @param {String} clienteId
   */
  async requiereCorteServicio(clienteId) {
    try {
      const mora = await this.calcularMoraAcumuladaCliente(clienteId);

      return {
        requiereCorte: mora.mesesAtrasados >= 2,
        mesesAtrasados: mora.mesesAtrasados,
        montoAdeudado: mora.totalAPagar,
        razon: mora.mesesAtrasados >= 2
          ? `Cliente con ${mora.mesesAtrasados} meses sin pagar`
          : 'No requiere corte'
      };
    } catch (error) {
      console.error('[MoraService] Error al verificar corte:', error);
      throw error;
    }
  }
}

module.exports = new MoraService();
