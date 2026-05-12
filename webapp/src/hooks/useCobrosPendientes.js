import { useMemo } from 'react';

/**
 * Hook de dominio: detecta contratos activos sin cobro en el mes actual.
 * Solo activo cuando el área seleccionada es 'Alquileres' y ya pasó el día 7.
 *
 * @param {Array}  movimientos           - todos los movimientos
 * @param {Array}  contratos             - lista de contratos
 * @param {Array}  propiedades           - lista de propiedades
 * @param {Array}  clientes              - lista de clientes
 * @param {string} areaSeleccionada      - área activa del dashboard
 * @returns {Array} array de { contrato, propiedad, cliente }
 */
export function useCobrosPendientes(movimientos, contratos, propiedades, clientes, areaSeleccionada) {
  return useMemo(() => {
    if (areaSeleccionada !== 'Alquileres') return [];

    const hoy       = new Date();
    const diaActual = hoy.getDate();
    // No alertar antes del día 8 del mes (período de gracia)
    if (diaActual <= 7) return [];

    const mesActual  = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    const contratosActivos = contratos.filter(
      c => new Date(c.fechaFin) >= hoy && new Date(c.fechaInicio) <= hoy
    );

    return contratosActivos.reduce((pendientes, contrato) => {
      const tieneCobro = movimientos.some(m => {
        if (
          m.area      !== 'Alquileres'   ||
          m.tipo      !== 'Ingreso'       ||
          m.clienteId !== contrato.clienteId ||
          m.propiedadId !== contrato.propiedadId ||
          !m.fecha
        ) return false;

        const fechaMov = new Date(m.fecha + 'T12:00:00Z');
        return fechaMov.getMonth() === mesActual && fechaMov.getFullYear() === anioActual;
      });

      if (!tieneCobro) {
        pendientes.push({
          contrato,
          propiedad: propiedades.find(p => p.id === contrato.propiedadId),
          cliente:   clientes.find(c => c.id === contrato.clienteId),
        });
      }
      return pendientes;
    }, []);
  }, [movimientos, contratos, propiedades, clientes, areaSeleccionada]);
}
