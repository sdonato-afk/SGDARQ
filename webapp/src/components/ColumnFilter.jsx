import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ArrowUp, ArrowDown, Search, X } from 'lucide-react';

/**
 * ColumnFilter — dropdown de filtro estilo Google Sheets para <th> de tabla.
 *
 * Props:
 *   label          — texto del header
 *   colKey         — key del campo (para llamar onFilterChange / onSortChange)
 *   rows           — array COMPLETO sin filtrar (para calcular valores únicos)
 *   valueGetter    — opcional (row) => string para campos computados o lookups
 *   filterState    — Set<string> | null  (null = sin filtro activo)
 *   onFilterChange(colKey, Set | null)
 *   sortDir        — 'asc' | 'desc' | null  (sort activo en esta columna)
 *   onSortChange(colKey, dir)
 */
export default function ColumnFilter({
  label, colKey, rows, valueGetter,
  filterState, onFilterChange,
  sortDir, onSortChange,
}) {
  const [open, setOpen]       = useState(false);
  const [pos, setPos]         = useState({ top: 0, left: 0 });
  const [search, setSearch]   = useState('');
  const [localSel, setLocalSel] = useState(null); // Set mientras está abierto

  const triggerRef = useRef(null);
  const dropRef    = useRef(null);

  const isActive = filterState !== null && filterState !== undefined;

  // ── Valores únicos de la columna ──────────────────────────────────────────
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

  // ── Abrir dropdown ────────────────────────────────────────────────────────
  const openDropdown = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dropW = 228;
    let left = rect.left;
    if (left + dropW > window.innerWidth - 8) left = window.innerWidth - dropW - 8;
    if (left < 4) left = 4;
    setPos({ top: rect.bottom + 4, left });
    setLocalSel(filterState ? new Set(filterState) : new Set(allValues));
    setSearch('');
    setOpen(true);
  }, [filterState, allValues]);

  // ── Cerrar al click externo ───────────────────────────────────────────────
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

  // ── Valores filtrados por búsqueda ────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Trigger en el header */}
      <div className="flex items-center gap-0.5 min-w-0 w-full">
        <button
          ref={triggerRef}
          onClick={openDropdown}
          className={`flex items-center gap-1 flex-1 min-w-0 group transition-colors ${
            isActive   ? 'text-blue-400' :
            sortDir    ? 'text-blue-300' :
            'text-slate-500 hover:text-white'
          }`}
        >
          {sortDir === 'asc'  && <ArrowUp   size={9} className="shrink-0 text-blue-400" />}
          {sortDir === 'desc' && <ArrowDown size={9} className="shrink-0 text-blue-400" />}
          <span className="truncate flex-1 uppercase tracking-widest font-black text-[9px] text-left">
            {label}
          </span>
          <ChevronDown
            size={9}
            className={`shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''} ${
              isActive || sortDir
                ? 'opacity-100 text-blue-400'
                : 'opacity-0 group-hover:opacity-50'
            }`}
          />
        </button>

        {/* Botón X rápido cuando hay filtro activo */}
        {isActive && (
          <button
            onClick={clearThis}
            title="Limpiar filtro"
            className="shrink-0 p-0.5 rounded transition-colors text-blue-400 hover:text-rose-400 hover:bg-rose-500/10"
          >
            <X size={8} />
          </button>
        )}
      </div>

      {/* Dropdown (portal para evitar z-index/overflow de la tabla) */}
      {open && createPortal(
        <div
          ref={dropRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: 228, zIndex: 9999 }}
          className="bg-slate-800 border border-slate-600/80 rounded-xl shadow-2xl shadow-black/70 overflow-hidden"
        >
          {/* Ordenar */}
          <div className="p-1.5 flex gap-1 border-b border-white/10">
            <button
              onClick={() => onSortChange(colKey, sortDir === 'asc' ? null : 'asc')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${
                sortDir === 'asc'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <ArrowUp size={9} /> A → Z
            </button>
            <button
              onClick={() => onSortChange(colKey, sortDir === 'desc' ? null : 'desc')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${
                sortDir === 'desc'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <ArrowDown size={9} /> Z → A
            </button>
          </div>

          {/* Buscador */}
          <div className="px-2 py-1.5 border-b border-white/10">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-lg">
              <Search size={9} className="text-slate-500 shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Buscar valores..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 min-w-0 bg-transparent outline-none text-[10px] text-slate-200 placeholder-slate-600"
              />
              {search && (
                <button onClick={() => setSearch('')} className="shrink-0">
                  <X size={9} className="text-slate-500 hover:text-white" />
                </button>
              )}
            </div>
          </div>

          {/* Lista de valores con checkboxes */}
          <div className="max-h-48 overflow-y-auto">
            {/* Seleccionar todo */}
            <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 cursor-pointer border-b border-white/5">
              <input
                type="checkbox"
                checked={allChecked}
                ref={el => { if (el) el.indeterminate = !allChecked && someChecked; }}
                onChange={toggleAll}
                className="accent-blue-500 w-3 h-3 shrink-0"
              />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Seleccionar todo ({filteredVals.length})
              </span>
            </label>

            {filteredVals.map(v => (
              <label key={v} className="flex items-center gap-2 px-3 py-[3px] hover:bg-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSel ? localSel.has(v) : true}
                  onChange={() => toggleVal(v)}
                  className="accent-blue-500 w-3 h-3 shrink-0"
                />
                <span className="text-[10px] text-slate-300 truncate">{v}</span>
              </label>
            ))}

            {filteredVals.length === 0 && (
              <p className="text-center text-[9px] text-slate-600 italic py-3">Sin resultados</p>
            )}
          </div>

          {/* Botones OK / Cancelar */}
          <div className="p-1.5 border-t border-white/10 flex gap-1">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              className="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 transition-colors"
            >
              OK
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
