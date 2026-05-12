import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';

export default function SearchableSelect({ value, onChange, options, placeholder = "Seleccionar...", disabled = false, className = '' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0, width: 228 });
  const triggerRef = useRef(null);
  const dropRef = useRef(null);

  const selectedOpt = options.find(o => String(o.value) === String(value));
  const displayLabel = selectedOpt ? selectedOpt.label : placeholder;

  const openDropdown = (e) => {
    e.preventDefault();
    if (disabled) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width > 228 ? rect.width : 228 });
    setSearch('');
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target) &&
          triggerRef.current && !triggerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return options;
    const s = search.toLowerCase();
    return options.filter(o => String(o.label).toLowerCase().includes(s));
  }, [options, search]);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={openDropdown}
        disabled={disabled}
        className={`flex items-center justify-between text-left ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={`truncate font-bold ${!selectedOpt ? 'text-white/25' : 'text-white'}`}>
          {displayLabel}
        </span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180 text-violet-400' : 'text-white/40'}`} />
      </button>

      {open && createPortal(
        <div
          ref={dropRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className="bg-slate-800 border border-slate-600/80 rounded-xl shadow-2xl shadow-black/70 overflow-hidden"
        >
          {/* Buscador (Estilo Google Sheets) */}
          <div className="px-2 py-1.5 border-b border-white/10">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-lg">
              <Search size={11} className="text-slate-500 shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 min-w-0 bg-transparent outline-none darq-value text-slate-200 placeholder-slate-600"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="shrink-0 p-0.5 hover:bg-white/10 rounded">
                  <X size={11} className="text-slate-400 hover:text-white" />
                </button>
              )}
            </div>
          </div>

          {/* Opciones */}
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.map(opt => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    isSelected ? 'bg-violet-600 text-white font-black' : 'text-slate-300 hover:bg-white/5 hover:text-white font-medium'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-[10px] text-slate-500 italic py-3">Sin resultados</p>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
