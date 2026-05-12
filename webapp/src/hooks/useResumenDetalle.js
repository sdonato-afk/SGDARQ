import { useMemo } from 'react';

/**
 * Hook de dominio: tabla de resumen financiero en USD por área.
 * Para Obras → agrupa por obra, para Alquileres → por propiedad,
 * para Oficina/Directorio → por rubro.
 *
 * @param {Array}  movimientos    - todos los movimientos
 * @param {Array}  obras          - lista de obras
 * @param {Array}  propiedades    - lista de propiedades
 * @param {string} area           - área seleccionada
 * @param {number} cotizacionBlue - tipo de cambio blue
 * @returns {Array} rows ordenadas por saldo descendente
 */
export function useResumenDetalle(movimientos, obras, propiedades, area, cotizacionBlue) {
  return useMemo(() => {
    const movs = movimientos.filter(m => m.area === area);
    const data = [];

    const toUSD = (m) =>
      m.moneda === 'USD'
        ? Number(m.monto)
        : Number(m.monto) / (m.cotizacionHistorica || m.tipoCambioReferencia || cotizacionBlue || 1);

    if (area === 'Obras') {
      obras.forEach(o => {
        let ingresos = 0, egresos = 0;
        movs.filter(m => m.obraId === o.id).forEach(m => {
          const val = toUSD(m);
          if (m.tipo === 'Ingreso') ingresos += val;
          else egresos += val;
        });
        if (ingresos > 0 || egresos > 0)
          data.push({ id: o.id, nombre: o.nombre, ingresos, egresos, saldo: ingresos - egresos, subDetails: o.estado });
      });

    } else if (area === 'Alquileres') {
      propiedades.forEach(p => {
        let ingresos = 0, egresos = 0;
        movs.filter(m => m.propiedadId === p.id).forEach(m => {
          const val = toUSD(m);
          if (m.tipo === 'Ingreso') ingresos += val;
          else egresos += val;
        });
        if (ingresos > 0 || egresos > 0)
          data.push({ id: p.id, nombre: p.nombre, ingresos, egresos, saldo: ingresos - egresos, subDetails: p.direccion });
      });

    } else {
      // Oficina y Directorio → agrupar por rubro
      const rubroMap = {};
      movs.forEach(m => {
        const val = toUSD(m);
        const r   = m.rubro || 'Varios';
        if (!rubroMap[r]) rubroMap[r] = { ingresos: 0, egresos: 0 };
        if (m.tipo === 'Ingreso') rubroMap[r].ingresos += val;
        else rubroMap[r].egresos += val;
      });
      Object.entries(rubroMap).forEach(([r, acc]) =>
        data.push({ id: r, nombre: r, ...acc, saldo: acc.ingresos - acc.egresos, subDetails: 'Rubro agrupado' })
      );
    }

    return data.sort((a, b) => b.saldo - a.saldo);
  }, [movimientos, obras, propiedades, area, cotizacionBlue]);
}
