import { useState } from 'react';

/**
 * useTableFilter — hook para filtrado y ordenamiento de tablas.
 *
 * Estado:
 *   filters  — { [colKey]: Set<string> | null }  (null = sin filtro)
 *   sort     — { key: string|null, dir: 'asc'|'desc'|null }
 *
 * Métodos:
 *   setFilter(colKey, Set | null)
 *   setSort(colKey, dir)        — pasar dir=null para quitar el sort
 *   clearAll()                  — limpiar todos los filtros y el sort
 *   filterRows(rows, getters)   — filtrar un array según los filtros activos
 *   sortRows(rows, getters, defaultSortFn)  — ordenar (defaultSortFn si no hay sort activo)
 *   activeCount                 — número de columnas con filtro activo
 *   hasActiveFilters            — booleano
 */
export function useTableFilter() {
  const [filters, setFilters] = useState({});
  const [sort, setSort_]      = useState({ key: null, dir: null });

  const setFilter = (colKey, selectedSet) => {
    setFilters(prev => ({ ...prev, [colKey]: selectedSet ?? null }));
  };

  const setSort = (colKey, dir) => {
    setSort_({ key: dir ? colKey : null, dir: dir || null });
  };

  const clearAll = () => {
    setFilters({});
    setSort_({ key: null, dir: null });
  };

  const activeCount      = Object.values(filters).filter(v => v !== null && v !== undefined).length;
  const hasActiveFilters = activeCount > 0;
  const hasSortActive    = sort.key !== null;

  /**
   * Filtra rows según los filtros activos.
   * valueGetters: { [colKey]: (row) => string }  — opcionales, para campos compuestos
   */
  const filterRows = (rows, valueGetters = {}) => {
    if (!hasActiveFilters) return rows;
    return rows.filter(row =>
      Object.entries(filters).every(([colKey, selectedSet]) => {
        if (!selectedSet) return true;
        const getter = valueGetters[colKey];
        const raw    = getter ? getter(row) : String(row[colKey] ?? '');
        const v      = raw.trim() || '(vacío)';
        return selectedSet.has(v);
      })
    );
  };

  /**
   * Ordena rows.
   * Si hay un sort activo lo usa; si no, usa defaultSortFn (optional).
   * valueGetters: mismo objeto que en filterRows
   */
  const sortRows = (rows, valueGetters = {}, defaultSortFn = null) => {
    if (!sort.key || !sort.dir) {
      return defaultSortFn ? [...rows].sort(defaultSortFn) : rows;
    }
    const getter = valueGetters[sort.key];
    return [...rows].sort((a, b) => {
      const va = getter ? getter(a) : String(a[sort.key] ?? '');
      const vb = getter ? getter(b) : String(b[sort.key] ?? '');
      const na = Number(va), nb = Number(vb);
      const cmp = (!isNaN(na) && !isNaN(nb))
        ? na - nb
        : va.localeCompare(vb, 'es', { sensitivity: 'base' });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  };

  return {
    filters,
    sort,
    setFilter,
    setSort,
    clearAll,
    activeCount,
    hasActiveFilters,
    hasSortActive,
    filterRows,
    sortRows,
  };
}
