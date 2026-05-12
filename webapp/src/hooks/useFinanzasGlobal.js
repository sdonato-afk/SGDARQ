import { useMemo } from 'react';
import { convertToUSD } from '../helpers/financieros';

const AREAS = ['Obras', 'Alquileres', 'Oficina', 'Directorio'];
const CAJAS = ['Caja Dólares', 'Caja Pesos', 'Banco Amecon', 'Banco Blue', 'MP Amecon', 'MP Blue'];
const EXCLUIR_ACTIVOS = ['MO GENERAL', 'VO CONSORCIO', 'CONSORCIO VO', 'GENERAL MO'];

/**
 * Hook de dominio: KPIs financieros globales del sistema.
 * Calcula: ingresos/egresos totales en USD, saldo, ROI, saldos por caja,
 * saldos por área, cash-flow semanal estimado y métricas operativas.
 *
 * @param {Array}  movimientos      - todos los movimientos de Firebase
 * @param {Array}  obras            - lista de obras
 * @param {Array}  contratos        - lista de contratos
 * @param {Array}  propiedades      - lista de propiedades
 * @param {number} cotizacionBlue   - tipo de cambio blue actual
 */
export function useFinanzasGlobal(movimientos, obras, contratos, propiedades, cotizacionBlue) {
  return useMemo(() => {
    let ingresosUSD_Equiv = 0;
    let egresosUSD_Equiv  = 0;

    const saldosCajas    = Object.fromEntries(CAJAS.map(c => [c, 0]));
    const areaSaldosEquiv = Object.fromEntries(AREAS.map(a => [a, 0]));

    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

    // ── Cash-flow semanal (4 semanas)
    const hoy = new Date();
    const hace4Semanas = new Date(hoy);
    hace4Semanas.setDate(hoy.getDate() - 28);
    const egresosSemanas = [0, 0, 0, 0];

    movimientos.forEach(m => {
      const monto    = Number(m.monto) || 0;
      const montoUSD = convertToUSD(monto, m.moneda, m.cotizacionHistorica || m.tipoCambioReferencia, cotizacionBlue);
      const isIngreso = m.tipo === 'Ingreso';
      const factor    = isIngreso ? 1 : -1;

      if (isIngreso) ingresosUSD_Equiv += montoUSD;
      else           egresosUSD_Equiv  += montoUSD;

      if (AREAS.includes(m.area))
        areaSaldosEquiv[m.area] = (areaSaldosEquiv[m.area] || 0) + montoUSD * factor;

      if (CAJAS.includes(m.caja))
        saldosCajas[m.caja] = (saldosCajas[m.caja] || 0) + montoUSD * factor;

      // Cash-flow semanal (solo egresos, en ARS)
      if (!isIngreso) {
        const fechaMov = new Date(m.fecha);
        if (fechaMov >= hace4Semanas && fechaMov <= hoy) {
          const diasDesde = Math.floor((hoy - fechaMov) / (1000 * 60 * 60 * 24));
          const semIdx    = Math.min(Math.floor(diasDesde / 7), 3);
          const montoARS  = m.moneda === 'USD'
            ? monto * (m.cotizacionHistorica || m.tipoCambioReferencia || cotizacionBlue)
            : monto;
          egresosSemanas[semIdx] += montoARS;
        }
      }
    });

    const saldoUSD_Equiv = ingresosUSD_Equiv - egresosUSD_Equiv;
    const roiGlobal      = egresosUSD_Equiv > 0 ? (saldoUSD_Equiv / egresosUSD_Equiv) * 100 : 0;

    // Participación % de cada área sobre el saldo total positivo
    const sumSaldosPositivos = AREAS.reduce((acc, a) => acc + Math.max(0, areaSaldosEquiv[a]), 0);
    const areaShares = Object.fromEntries(
      AREAS.map(a => [
        a,
        sumSaldosPositivos > 0 && areaSaldosEquiv[a] > 0
          ? (areaSaldosEquiv[a] / sumSaldosPositivos) * 100
          : 0,
      ])
    );

    // Próximo viernes
    const diaHoy = hoy.getDay();
    const diasParaViernes = diaHoy <= 5 ? 5 - diaHoy : 12 - diaHoy;
    const proximoViernes = new Date(hoy);
    proximoViernes.setDate(hoy.getDate() + diasParaViernes);

    // Cash-flow estimado (promedio semanal)
    const semanasConDatos      = egresosSemanas.filter(s => s > 0).length || 1;
    const cashFlowEstimadoARS  = egresosSemanas.reduce((a, b) => a + b, 0) / semanasConDatos;

    // Métricas operativas
    const obrasActivas     = obras.filter(o => o.estado !== 'Finalizada').length;
    const contratosActivos = contratos.filter(c => new Date(c.fechaFin) >= hoy).length;
    const totalActivosUSD  = propiedades
      .filter(p => !p.esCentroCostos && !EXCLUIR_ACTIVOS.includes(p.nombre?.toUpperCase()))
      .reduce((acc, p) => acc + (Number(p.valorActualUSD) || 0), 0);

    return {
      ingresosUSD_Equiv,
      egresosUSD_Equiv,
      saldoUSD_Equiv,
      roiGlobal,
      areaSaldosEquiv,
      areaShares,
      saldosCajas,
      cashFlowEstimadoARS,
      proximoViernes: proximoViernes.toISOString().split('T')[0],
      obrasActivas,
      contratosActivos,
      totalActivosUSD,
    };
  }, [movimientos, obras, contratos, propiedades, cotizacionBlue]);
}
