import { useMemo } from 'react';

/**
 * Normaliza el nombre de un director para agrupar variantes de texto.
 */
function normalizarDirector(raw = '') {
  if (!raw.trim()) return 'Sin Director';
  const l = raw.trim().toLowerCase();
  if (l.startsWith('sebast')) return 'Sebastián';
  if (l.startsWith('emilia')) return 'Emiliano';
  if (l.startsWith('santia')) return 'Santiago';
  if (l.startsWith('floren')) return 'Florencia';
  return raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1).toLowerCase();
}

/**
 * Hook de dominio: KPIs financieros por área de negocio con drill-down.
 * Agrupa movimientos por rubro, edificio, obra, director u categoría de oficina.
 *
 * @param {Array}  movimientos              - todos los movimientos
 * @param {Array}  propiedades              - lista de propiedades (para edificio MO/VO)
 * @param {string} area                     - área seleccionada ('Obras'|'Alquileres'|'Oficina'|'Directorio')
 * @param {number} cotizacionBlue           - tipo de cambio blue
 * @param {string} subNivel                 - 'Edificios' | 'Detalle'
 * @param {string|null} itemSeleccionado    - ID del item en drill-down
 * @param {string|null} edificioSeleccionado - 'MO' | 'VO' | null
 */
export function useFinanzasArea(
  movimientos,
  propiedades,
  area,
  cotizacionBlue,
  subNivel,
  itemSeleccionado,
  edificioSeleccionado
) {
  return useMemo(() => {
    const movsArea = movimientos.filter(m => m.area === area);

    const agrupar = {
      ars: { ingresos: 0, egresos: 0 },
      usd: { ingresos: 0, egresos: 0 },
      rubros: {},
      edificios: {
        MO: { ingresos: 0, egresos: 0 },
        VO: { ingresos: 0, egresos: 0 },
      },
      obras: {},
      directores: {},
      oficinaCategorias: {},
    };

    movsArea.forEach(m => {
      const monto      = parseFloat(m.monto) || 0;
      const keyMoneda  = (m.moneda || 'ars').toLowerCase();
      const montoARS   = m.moneda === 'USD' ? monto * cotizacionBlue : monto;
      const esIngreso  = m.tipo === 'Ingreso';

      // Acumulado bimonetario
      if (esIngreso) agrupar[keyMoneda].ingresos += monto;
      else           agrupar[keyMoneda].egresos  += monto;

      // Por rubro
      const rubro = m.rubro || 'Varios';
      if (!agrupar.rubros[rubro]) agrupar.rubros[rubro] = { ingresos: 0, egresos: 0 };
      if (esIngreso) agrupar.rubros[rubro].ingresos += montoARS;
      else           agrupar.rubros[rubro].egresos  += montoARS;

      // Agrupaciones específicas por área
      if (area === 'Obras') {
        const oId = m.obraId || 'Sin Obra';
        if (!agrupar.obras[oId]) agrupar.obras[oId] = { ingresos: 0, egresos: 0 };
        if (esIngreso) agrupar.obras[oId].ingresos += montoARS;
        else           agrupar.obras[oId].egresos  += montoARS;
      }

      if (area === 'Directorio') {
        const dId = normalizarDirector(m.directorId);
        if (!agrupar.directores[dId]) agrupar.directores[dId] = { ingresos: 0, egresos: 0 };
        if (esIngreso) agrupar.directores[dId].ingresos += montoARS;
        else           agrupar.directores[dId].egresos  += montoARS;
      }

      if (area === 'Oficina') {
        const cat = m.categoriaEgreso || 'VARIOS';
        if (!agrupar.oficinaCategorias[cat]) agrupar.oficinaCategorias[cat] = { ingresos: 0, egresos: 0 };
        if (esIngreso) agrupar.oficinaCategorias[cat].ingresos += montoARS;
        else           agrupar.oficinaCategorias[cat].egresos  += montoARS;
      }

      if (area === 'Alquileres' && m.propiedadId) {
        const prop      = propiedades.find(p => p.id === m.propiedadId);
        const nombreUp  = (prop?.nombre || '').toUpperCase();
        const edificio  = nombreUp.startsWith('MO') ? 'MO' : nombreUp.startsWith('VO') ? 'VO' : null;
        if (edificio) {
          if (esIngreso) agrupar.edificios[edificio].ingresos += montoARS;
          else           agrupar.edificios[edificio].egresos  += montoARS;
        }
      }

      // Gastos compartidos de consorcio sin propiedadId
      if (area === 'Alquileres' && !m.propiedadId && !esIngreso) {
        const ref = ((m.concepto || '') + ' ' + (m.rubro || '')).toUpperCase();
        if (ref.includes('VO-') || ref.includes('CONSORCIO VO'))
          agrupar.edificios.VO.egresos += montoARS;
        else if (ref.includes('MO-') || ref.includes('GENERAL MO'))
          agrupar.edificios.MO.egresos += montoARS;
      }
    });

    // ── Drill-down: filtrado de movimientos según nivel activo
    let movsFiltrados = movsArea;
    if (subNivel === 'Detalle') {
      if (area === 'Obras')
        movsFiltrados = movsArea.filter(m => (m.obraId || 'Sin Obra') === itemSeleccionado);

      if (area === 'Oficina')
        movsFiltrados = movsArea.filter(m => (m.categoriaEgreso || 'VARIOS') === itemSeleccionado);

      if (area === 'Directorio')
        movsFiltrados = movsArea.filter(m => normalizarDirector(m.directorId) === itemSeleccionado);

      if (area === 'Alquileres' && edificioSeleccionado) {
        movsFiltrados = movsArea.filter(m => {
          const prop    = propiedades.find(p => p.id === m.propiedadId);
          const match   = prop?.nombre.toUpperCase().startsWith(edificioSeleccionado);
          if (match) return true;
          if (!m.propiedadId) {
            const ref = ((m.concepto || '') + ' ' + (m.rubro || '')).toUpperCase();
            return (
              (edificioSeleccionado === 'VO' && (ref.includes('VO-') || ref.includes('CONSORCIO VO'))) ||
              (edificioSeleccionado === 'MO' && (ref.includes('MO-') || ref.includes('GENERAL MO')))
            );
          }
          return false;
        });
      }
    }

    return { movs: movsFiltrados, agrupar };
  }, [movimientos, propiedades, area, cotizacionBlue, subNivel, itemSeleccionado, edificioSeleccionado]);
}
