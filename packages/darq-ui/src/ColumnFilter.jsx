import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ArrowUp, ArrowDown, Search, X } from 'lucide-react';

/**
 * ColumnFilter — dropdown de filtro para <th> de tabla.
 * Estilo coherente con el design system D+ARQ (inline styles, paleta oscura).
 */
export default function ColumnFilter({
  label, colKey, rows, valueGetter,
  filterState, onFilterChange,
  sortDir, onSortChange,
}) {
  const [open, setOpen]       = useState(false);
  const [pos, setPos]         = useState({ top: 0, left: 0 });
  const [search, setSearch]   = useState('');
  const [localSel, setLocalSel] = useState(null);

  const triggerRef = useRef(null);
  const dropRef    = useRef(null);

  const isActive = filterState !== null && filterState !== undefined;

  // ── Valores únicos ──
  const allValues = useMemo(() => {
    const seen = new Map();
    rows.forEach(row => {
      const raw = valueGetter ? valueGetter(row) : String(row[colKey] ?? '');
      const key = raw.trim() || '(vacío)';
      seen.set(key, (seen.get(key) || 0) + 1);
    });
    return Array.from(seen.keys()).sort((a, b) => {
      if (a === '(vacío)') return 1;
      if (b === '(vacío)') return -1;
      const na = Number(a), nb = Number(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b, 'es', { sensitivity: 'base' });
    });
  }, [rows, colKey, valueGetter]);

  // ── Abrir ──
  const openDropdown = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dropW = 220;
    let left = rect.left;
    if (left + dropW > window.innerWidth - 8) left = window.innerWidth - dropW - 8;
    if (left < 4) left = 4;
    setPos({ top: rect.bottom + 4, left });
    setLocalSel(filterState ? new Set(filterState) : new Set(allValues));
    setSearch('');
    setOpen(true);
  }, [filterState, allValues]);

  // ── Cerrar click externo ──
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [open]);

  // ── Filtrado por búsqueda ──
  const filteredVals = useMemo(() =>
    search
      ? allValues.filter(v => v.toLowerCase().includes(search.toLowerCase()))
      : allValues,
    [allValues, search]
  );

  const allChecked  = localSel ? filteredVals.every(v => localSel.has(v)) : true;
  const someChecked = localSel ? filteredVals.some(v => localSel.has(v))  : false;

  const toggleAll = () => {
    const next = new Set(localSel || allValues);
    if (allChecked) filteredVals.forEach(v => next.delete(v));
    else            filteredVals.forEach(v => next.add(v));
    setLocalSel(next);
  };

  const toggleVal = (v) => {
    const next = new Set(localSel || allValues);
    if (next.has(v)) next.delete(v); else next.add(v);
    setLocalSel(next);
  };

  const handleApply = () => {
    const allSel = localSel && allValues.every(v => localSel.has(v));
    onFilterChange(colKey, allSel ? null : new Set(localSel));
    setOpen(false);
  };

  const clearThis = (e) => {
    e.stopPropagation();
    onFilterChange(colKey, null);
  };

  // ── Colores del sistema ──
  const C = {
    accent: '#818cf8',     // indigo principal
    accentDim: '#6366f1',
    bg: '#0f172a',
    bgDrop: '#111827',
    border: 'rgba(255,255,255,0.08)',
    borderLight: 'rgba(255,255,255,0.05)',
    text: '#e2e8f0',
    textDim: '#64748b',
    textMuted: '#334155',
    hoverBg: 'rgba(255,255,255,0.04)',
    activeBg: 'rgba(129,140,248,0.12)',
    dangerText: '#f87171',
  };

  // ── Render ──
  return (
    <>
      {/* Trigger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, width: '100%' }}>
        <button
          ref={triggerRef}
          onClick={openDropdown}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            color: isActive ? C.accent : sortDir ? C.accent : C.textDim,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => { if (!isActive && !sortDir) e.currentTarget.style.color = C.text; }}
          onMouseLeave={e => { if (!isActive && !sortDir) e.currentTarget.style.color = C.textDim; }}
        >
          {sortDir === 'asc'  && <ArrowUp   size={9} color={C.accent} style={{ flexShrink: 0 }} />}
          {sortDir === 'desc' && <ArrowDown size={9} color={C.accent} style={{ flexShrink: 0 }} />}
          <span className="darq-label" style={{
            margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left',
          }}>
            {label}
          </span>
          {isActive && (
            <span style={{
              width: 5, height: 5, borderRadius: '50%', background: C.accent, flexShrink: 0,
            }} />
          )}
          <ChevronDown
            size={9}
            style={{
              flexShrink: 0, transition: 'transform 0.15s, opacity 0.15s',
              transform: open ? 'rotate(180deg)' : 'none',
              opacity: isActive || sortDir ? 0.8 : 0.3,
              color: C.accent,
            }}
          />
        </button>

        {isActive && (
          <button
            onClick={clearThis}
            title="Limpiar filtro"
            style={{
              flexShrink: 0, padding: 2, borderRadius: 4, border: 'none', cursor: 'pointer',
              background: 'none', color: C.textDim, transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = C.dangerText}
            onMouseLeave={e => e.currentTarget.style.color = C.textDim}
          >
            <X size={8} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && createPortal(
        <div
          ref={dropRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left, width: 220, zIndex: 9999,
            background: C.bgDrop, border: `1px solid ${C.border}`, borderRadius: 14,
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)', overflow: 'hidden',
          }}
        >
          {/* Sort */}
          <div style={{ padding: 6, display: 'flex', gap: 4, borderBottom: `1px solid ${C.borderLight}` }}>
            {[
              { dir: 'asc', icon: <ArrowUp size={9} />, text: 'A → Z' },
              { dir: 'desc', icon: <ArrowDown size={9} />, text: 'Z → A' },
            ].map(({ dir, icon, text }) => (
              <button
                key={dir}
                onClick={() => onSortChange(colKey, sortDir === dir ? null : dir)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  padding: '5px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em',
                  background: sortDir === dir ? C.accentDim : 'transparent',
                  color: sortDir === dir ? '#fff' : C.textDim,
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => { if (sortDir !== dir) { e.currentTarget.style.background = C.hoverBg; e.currentTarget.style.color = C.text; }}}
                onMouseLeave={e => { if (sortDir !== dir) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textDim; }}}
              >
                {icon} {text}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ padding: '6px 8px', borderBottom: `1px solid ${C.borderLight}` }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
              background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.borderLight}`, borderRadius: 8,
            }}>
              <Search size={9} color={C.textDim} style={{ flexShrink: 0 }} />
              <input
                autoFocus
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  flex: 1, minWidth: 0, background: 'transparent', outline: 'none', border: 'none',
                  fontSize: 10, color: C.text, fontFamily: 'inherit',
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <X size={9} color={C.textDim} />
                </button>
              )}
            </div>
          </div>

          {/* Checkbox list */}
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {/* Select all */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', cursor: 'pointer',
              borderBottom: `1px solid ${C.borderLight}`,
            }}
              onMouseEnter={e => e.currentTarget.style.background = C.hoverBg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <input
                type="checkbox"
                checked={allChecked}
                ref={el => { if (el) el.indeterminate = !allChecked && someChecked; }}
                onChange={toggleAll}
                style={{ accentColor: C.accentDim, width: 12, height: 12, flexShrink: 0 }}
              />
              <span style={{ fontSize: 9, fontWeight: 800, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Todos ({filteredVals.length})
              </span>
            </label>

            {filteredVals.map(v => (
              <label
                key={v}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '3px 12px', cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = C.hoverBg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <input
                  type="checkbox"
                  checked={localSel ? localSel.has(v) : true}
                  onChange={() => toggleVal(v)}
                  style={{ accentColor: C.accentDim, width: 12, height: 12, flexShrink: 0 }}
                />
                <span style={{ fontSize: 10, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
              </label>
            ))}

            {filteredVals.length === 0 && (
              <p style={{ textAlign: 'center', fontSize: 9, color: C.textMuted, fontStyle: 'italic', padding: 12 }}>Sin resultados</p>
            )}
          </div>

          {/* OK / Cancelar */}
          <div style={{ padding: 6, borderTop: `1px solid ${C.borderLight}`, display: 'flex', gap: 4 }}>
            <button
              onClick={() => setOpen(false)}
              style={{
                flex: 1, padding: '5px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                background: 'rgba(255,255,255,0.04)', color: C.textDim, transition: 'all 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = C.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = C.textDim; }}
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              style={{
                flex: 1, padding: '5px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                background: C.accentDim, color: '#fff', transition: 'all 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.accent}
              onMouseLeave={e => e.currentTarget.style.background = C.accentDim}
            >
              Aplicar
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
