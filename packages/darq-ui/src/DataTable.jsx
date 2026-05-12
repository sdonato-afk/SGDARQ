import React, { useState, useMemo, useCallback } from 'react';
import { X } from 'lucide-react';
import ColumnFilter from './ColumnFilter.jsx';
import { useTableFilter } from './hooks/useTableFilter.js';

/**
 * DataTable v2 — Tabla universal con filtros avanzados.
 * Estilo inline coherente con el design system D+ARQ.
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

  // ── Colores del sistema ──
  const C = {
    bg: '#111827',
    bgHeader: 'rgba(255,255,255,0.025)',
    border: 'rgba(255,255,255,0.08)',
    borderDim: 'rgba(255,255,255,0.04)',
    text: '#e2e8f0',
    textDim: '#64748b',
    textMuted: '#334155',
    hoverBg: 'rgba(255,255,255,0.03)',
    accent: '#818cf8',
  };

  // ── ValueGetters ──
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

  // ── Filter & Sort ──
  const processed = useMemo(() => {
    let rows = filterRows(data, valueGetters);
    rows = sortRows(rows, valueGetters);
    return rows;
  }, [data, filters, sort, valueGetters]);

  // ── Pagination ──
  const totalPages = pageSize > 0 ? Math.ceil(processed.length / pageSize) : 1;
  const displayed  = pageSize > 0
    ? processed.slice(page * pageSize, (page + 1) * pageSize)
    : processed;

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

  const alignStyle = (align) => ({ textAlign: align || 'left' });

  // ──────────────────────────────────────────────────────────────────────
  return (
    <div>
      {headerAction && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>{headerAction}</div>
      )}

      <div style={{
        background: C.bg, borderRadius: 16,
        border: `1px solid ${C.border}`, overflow: 'hidden',
      }}>
        <div style={{
          overflowX: 'auto', overflowY: 'auto',
          maxHeight: maxHeight !== 'none' ? maxHeight : undefined,
        }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 10 }}>

            {/* THEAD */}
            <thead>
              <tr style={{ background: C.bgHeader, borderBottom: `1px solid ${C.border}` }}>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      padding: 0,
                      borderRight: `1px solid ${C.borderDim}`,
                      ...alignStyle(col.align),
                    }}
                  >
                    {col.filterable || col.sortable ? (
                      <div style={{ padding: '8px 8px' }}>
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
                      <div className="darq-label" style={{ padding: '8px 12px', color: C.textDim }}>
                        {col.label}
                      </div>
                    )}
                  </th>
                ))}

                {/* Clear all */}
                <th style={{ padding: '8px', width: 36, textAlign: 'center' }}>
                  {hasFilters && (
                    <button
                      onClick={clearAllFilters}
                      title="Limpiar todos los filtros"
                      style={{
                        padding: 3, borderRadius: 6, border: 'none', cursor: 'pointer',
                        background: 'none', color: C.textDim, transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                      onMouseLeave={e => e.currentTarget.style.color = C.textDim}
                    >
                      <X size={11} />
                    </button>
                  )}
                </th>
              </tr>
            </thead>

            {/* TBODY */}
            <tbody>
              {displayed.map((row, i) => {
                const extraCls = typeof rowClassName === 'function' ? rowClassName(row) : rowClassName || '';
                return (
                  <tr
                    key={row.id || i}
                    onClick={() => onRowClick?.(row)}
                    className={extraCls}
                    style={{
                      borderBottom: `1px solid ${C.borderDim}`,
                      color: C.text, fontWeight: 700, fontSize: 11,
                      cursor: onRowClick ? 'pointer' : 'default',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = C.hoverBg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {columns.map(col => (
                      <td
                        key={col.key}
                        style={{
                          padding: '8px 12px',
                          borderRight: `1px solid ${C.borderDim}`,
                          ...alignStyle(col.align),
                        }}
                      >
                        {col.render
                          ? col.render(row[col.key], row)
                          : <span style={{ display: 'block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row[col.key] ?? '—'}</span>
                        }
                      </td>
                    ))}
                    <td style={{ padding: '4px 8px', textAlign: 'center', width: 36 }} />
                  </tr>
                );
              })}

              {processed.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    style={{ padding: 40, textAlign: 'center', color: C.textDim, fontWeight: 700, fontSize: 11 }}
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

        {/* Footer */}
        {data.length > 0 && (
          <div style={{
            padding: '8px 16px', borderTop: `1px solid ${C.borderDim}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.01)',
          }}>
            <span style={{ fontSize: 9, fontWeight: 900, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {hasFilters
                ? `${processed.length} de ${data.length} registros`
                : `${data.length} ${data.length === 1 ? 'registro' : 'registros'}`
              }
            </span>
            {sort.key && (
              <button
                onClick={() => setSort(sort.key, null)}
                style={{
                  fontSize: 9, fontWeight: 900, color: C.textMuted, textTransform: 'uppercase',
                  letterSpacing: '0.1em', background: 'none', border: 'none', cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = C.text}
                onMouseLeave={e => e.currentTarget.style.color = C.textMuted}
              >
                Quitar orden ×
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pageSize > 0 && totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 16px', marginTop: 8,
          background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 12,
        }}>
          <span style={{ fontSize: 9, fontWeight: 900, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, processed.length)} de {processed.length}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {[
              { label: '⟨⟨', action: () => setPage(0), disabled: page === 0 },
              { label: '⟨ Anterior', action: () => setPage(p => Math.max(0, p - 1)), disabled: page === 0 },
            ].map(({ label, action, disabled }) => (
              <button key={label} onClick={action} disabled={disabled} style={{
                padding: '4px 10px', borderRadius: 8, border: 'none', cursor: disabled ? 'default' : 'pointer',
                fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em',
                color: disabled ? C.textMuted : C.textDim, background: 'none', opacity: disabled ? 0.3 : 1,
                transition: 'color 0.15s',
              }}>{label}</button>
            ))}
            <span style={{
              padding: '4px 12px', background: '#6366f1', color: '#fff', borderRadius: 8,
              fontSize: 9, fontWeight: 900,
            }}>
              {page + 1} / {totalPages}
            </span>
            {[
              { label: 'Siguiente ⟩', action: () => setPage(p => Math.min(totalPages - 1, p + 1)), disabled: page >= totalPages - 1 },
              { label: '⟩⟩', action: () => setPage(totalPages - 1), disabled: page >= totalPages - 1 },
            ].map(({ label, action, disabled }) => (
              <button key={label} onClick={action} disabled={disabled} style={{
                padding: '4px 10px', borderRadius: 8, border: 'none', cursor: disabled ? 'default' : 'pointer',
                fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em',
                color: disabled ? C.textMuted : C.textDim, background: 'none', opacity: disabled ? 0.3 : 1,
                transition: 'color 0.15s',
              }}>{label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
