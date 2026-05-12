import React, { useState, useMemo, useCallback } from 'react';
import { X } from 'lucide-react';
import { ColumnFilter } from '@darq/ui';
import { useTableFilter } from '../../hooks/useTableFilter';

/**
 * DataTable v2 — Componente universal de tabla con filtros avanzados tipo Google Sheets.
 *
 * Integra ColumnFilter (dropdown multiselección + sort) de forma nativa.
 * Compatible 100% con la API anterior: filterable / sortable / filterList siguen funcionando,
 * pero ahora usan el dropdown avanzado en vez de un input de texto simple.
 *
 * @prop {Array}  columns          - Definición de columnas (ver abajo)
 * @prop {Array}  data             - Filas de datos
 * @prop {string} emptyMessage     - Texto cuando no hay datos
 * @prop {string} accentColor      - Color Tailwind de acento: 'emerald'|'amber'|'indigo'|'orange'|'sky' (default: 'emerald')
 * @prop {node}   headerAction     - Botón/acción en la cabecera de la tabla (ej: "Nuevo...")
 * @prop {func}   onRowClick       - Callback al hacer clic en una fila
 * @prop {string|func} rowClassName - Clases extra por fila (puede ser función: (row) => string)
 * @prop {number} pageSize         - Filas por página (0 = sin paginación, default: 0)
 * @prop {string} maxHeight        - CSS max-height del contenedor scrollable (default: 'none')
 *
 * Estructura de una columna:
 * {
 *   key: string,           // clave en el objeto data
 *   label: string,         // texto del header
 *   sortable?: boolean,    // habilita sorting por esta columna (default: true si filterable)
 *   filterable?: boolean,  // muestra ColumnFilter con dropdown
 *   filterList?: string[], // (legacy, ignorado — ColumnFilter calcula valores únicos automáticamente)
 *   valueGetter?: (row) => string, // custom getter para ColumnFilter (ej: lookups)
 *   align?: 'left'|'center'|'right',
 *   width?: string,        // ej: 'w-24', 'w-48'
 *   render?: (value, row) => ReactNode, // renderizado custom de la celda
 * }
 */
export function DataTable({
  columns = [],
  data = [],
  emptyMessage = 'No hay registros.',
  accentColor = 'emerald',
  headerAction,
  onRowClick,
  rowClassName,
  pageSize = 0,
  maxHeight = 'none',
}) {
  const { filters, sort, setFilter, setSort, filterRows, sortRows } = useTableFilter();
  const [page, setPage] = useState(0);

  const accentMap = {
    emerald: { hover: 'hover:bg-emerald-500/10', header: 'text-emerald-400' },
    amber:   { hover: 'hover:bg-amber-500/10',   header: 'text-amber-400' },
    indigo:  { hover: 'hover:bg-indigo-500/10',  header: 'text-indigo-400' },
    orange:  { hover: 'hover:bg-orange-500/10',  header: 'text-orange-400' },
    sky:     { hover: 'hover:bg-sky-500/10',     header: 'text-sky-400' },
    rose:    { hover: 'hover:bg-rose-500/10',    header: 'text-rose-400' },
    blue:    { hover: 'hover:bg-blue-500/10',    header: 'text-blue-400' },
  };
  const accent = accentMap[accentColor] || accentMap.emerald;

  // ── Build valueGetters map for filterRows/sortRows ─────────────────────
  const valueGetters = useMemo(() => {
    const map = {};
    columns.forEach(col => {
      if (col.filterable || col.sortable) {
        map[col.key] = col.valueGetter
          ? col.valueGetter
          : (row) => String(row[col.key] ?? '');
      }
    });
    return map;
  }, [columns]);

  // ── Filter & Sort ──────────────────────────────────────────────────────
  const processed = useMemo(() => {
    let rows = filterRows(data, valueGetters);
    rows = sortRows(rows, valueGetters);
    return rows;
  }, [data, filters, sort, valueGetters]);

  // ── Pagination ─────────────────────────────────────────────────────────
  const totalPages = pageSize > 0 ? Math.ceil(processed.length / pageSize) : 1;
  const displayed  = pageSize > 0
    ? processed.slice(page * pageSize, (page + 1) * pageSize)
    : processed;

  // Reset page when filters change
  const prevFilterRef = React.useRef(filters);
  React.useEffect(() => {
    if (prevFilterRef.current !== filters) {
      setPage(0);
      prevFilterRef.current = filters;
    }
  }, [filters]);

  const hasFilters = Object.values(filters).some(v => v !== undefined && v !== null);

  const clearAllFilters = useCallback(() => {
    columns.forEach(col => {
      if (col.filterable) setFilter(col.key, null);
    });
  }, [columns, setFilter]);

  const alignClass = (align) =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  // ──────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      {/* Header action slot */}
      {headerAction && (
        <div className="flex justify-end">{headerAction}</div>
      )}

      <div className="bg-[#1a2235] rounded-2xl border border-white/10 shadow-xl overflow-hidden">
        <div
          className="overflow-x-auto overflow-y-auto custom-scrollbar"
          style={{ maxHeight: maxHeight !== 'none' ? maxHeight : undefined }}
        >
          <table className="w-full text-left border-collapse text-[10px]">

            {/* ── THEAD ── */}
            <thead className="bg-white/[0.03] border-b border-white/10 sticky top-0 z-10">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`
                      p-0 border-r border-white/5 last:border-r-0
                      ${col.width || ''}
                      ${alignClass(col.align)}
                    `}
                  >
                    {col.filterable || col.sortable ? (
                      <div className="px-2 py-2">
                        <ColumnFilter
                          label={col.label}
                          colKey={col.key}
                          rows={data}
                          valueGetter={col.valueGetter || (row => String(row[col.key] ?? ''))}
                          filterState={filters[col.key]}
                          onFilterChange={setFilter}
                          sortDir={sort.key === col.key ? sort.dir : null}
                          onSortChange={setSort}
                        />
                      </div>
                    ) : (
                      <div className="px-3 py-2 darq-label">
                        {col.label}
                      </div>
                    )}
                  </th>
                ))}

                {/* Columna clear filters */}
                <th className="px-2 py-2 w-10 text-center">
                  {hasFilters && (
                    <button
                      onClick={clearAllFilters}
                      title="Limpiar todos los filtros"
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    >
                      <X size={11} />
                    </button>
                  )}
                </th>
              </tr>
            </thead>

            {/* ── TBODY ── */}
            <tbody className="divide-y divide-white/5">
              {displayed.map((row, i) => {
                const extraCls = typeof rowClassName === 'function' ? rowClassName(row) : rowClassName || '';
                return (
                  <tr
                    key={row.id || i}
                    onClick={() => onRowClick?.(row)}
                    className={`
                      font-bold text-slate-300 transition-colors
                      ${accent.hover}
                      ${onRowClick ? 'cursor-pointer' : ''}
                      ${extraCls}
                    `}
                  >
                    {columns.map(col => (
                      <td
                        key={col.key}
                        className={`px-3 py-2 border-r border-white/5 last:border-r-0 ${alignClass(col.align)} ${col.width || ''}`}
                      >
                        {col.render
                          ? col.render(row[col.key], row)
                          : <span className="truncate block max-w-[200px]">{row[col.key] ?? '—'}</span>
                        }
                      </td>
                    ))}
                    {/* Slot vacío de acciones */}
                    <td className="px-2 py-1 text-center w-10" />
                  </tr>
                );
              })}

              {processed.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="py-10 text-center text-slate-500 font-bold text-[11px]"
                  >
                    {hasFilters
                      ? `Sin resultados · ${data.length} ${data.length === 1 ? 'registro total' : 'registros totales'}`
                      : emptyMessage
                    }
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>

        {/* Footer con conteo */}
        {data.length > 0 && (
          <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
            <span className="darq-label">
              {hasFilters
                ? `${processed.length} de ${data.length} registros`
                : `${data.length} ${data.length === 1 ? 'registro' : 'registros'}`
              }
            </span>
            {sort.key && (
              <button
                onClick={() => setSort(sort.key, null)}
                className="text-[10px] font-black text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-widest"
              >
                Quitar orden ×
              </button>
            )}
          </div>
        )}
      </div>

      {/* Paginación */}
      {pageSize > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
          <span className="darq-label">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, processed.length)} de {processed.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(0)} disabled={page === 0}
              className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-white/5 transition-colors">⟨⟨</button>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-white/5 transition-colors">⟨ Anterior</button>
            <span className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-white/5 transition-colors">Siguiente ⟩</button>
            <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-white/5 transition-colors">⟩⟩</button>
          </div>
        </div>
      )}
    </div>
  );
}
