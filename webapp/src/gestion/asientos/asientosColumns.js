/**
 * asientosColumns.js
 * Definición de columnas para la tabla Asientos.
 *
 * baseCols   — columnas siempre visibles
 * getCtxCols — columnas contextuales según área activa
 * tailCols   — columnas de cierre (TC, USD equiv.)
 * getColDefs — función conveniente que devuelve el array completo
 */

export const baseCols = [
  { key: 'fecha',           label: 'Fecha',     w: 105 },
  { key: 'area',            label: 'Área',      w: 80  },
  { key: 'tipo',            label: 'Tipo',      w: 72  },
  { key: 'moneda',          label: 'Mon',       w: 52  },
  { key: 'monto',           label: 'Monto',     w: 110 },
  { key: 'caja',            label: 'Caja',      w: 105 },
  { key: 'categoriaEgreso', label: 'Categoría', w: 95  },
  { key: 'rubro',           label: 'Rubro',     w: 95  },
  { key: 'concepto',        label: 'Concepto',  w: 160 },  // antes: key: 'subRubro'
];

export const tailCols = [
  { key: 'tc',    label: 'TC',        w: 60 },
  { key: 'usdEq', label: 'u$d Equiv', w: 95 },
];

/**
 * Devuelve las columnas contextuales que aplican al área seleccionada.
 * @param {string} areaFilter  - 'Todas' | 'Obras' | 'Alquileres' | 'Oficina' | 'Directorio' | 'Tesoreria' | 'Sistema'
 */
export function getCtxCols(areaFilter) {
  const af  = areaFilter;
  const ctx = [];

  if (af === 'Todas' || af === 'Obras')
    ctx.push({ key: 'obraId', label: 'Obra', w: 110 });
  if (af === 'Todas' || af === 'Alquileres')
    ctx.push({ key: 'propiedadId',     label: 'Propiedad', w: 110 });
  if (af === 'Todas' || af === 'Alquileres')
    ctx.push({ key: 'clienteId',       label: 'Inquilino', w: 110 });
  if (af === 'Todas' || af === 'Directorio')
    ctx.push({ key: 'directorId',      label: 'Director',  w: 85  });
  if (af === 'Todas' || af === 'Obras' || af === 'Alquileres' || af === 'Oficina')
    ctx.push({ key: 'proveedorId',     label: 'Proveedor', w: 110 });

  return ctx;
}

/**
 * Array completo de columnas para el área activa.
 */
export function getColDefs(areaFilter) {
  return [...baseCols, ...getCtxCols(areaFilter), ...tailCols];
}
