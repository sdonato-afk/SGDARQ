import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';

export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar...',
  disabled = false,
  required = false,
  style = {},
  className = '',
  name = '',
  children,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const dropRef = useRef(null);

  // Abrir popover
  const openDropdown = useCallback(() => {
    if (disabled) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    let top = rect.bottom + 4;
    let left = rect.left;
    let width = rect.width;
    
    // Ajustar si se va de pantalla hacia abajo
    if (top + 250 > window.innerHeight) {
      top = rect.top - 250 - 4;
    }
    
    setPos({ top, left, width });
    setSearch('');
    setOpen(true);
  }, [disabled]);

  // Cerrar al clickear afuera
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

  // Normalización
  const normOptions = useMemo(() => {
    const childOpts = [];
    React.Children.forEach(children, child => {
      if (!child) return;
      if (child.type === 'option') {
        childOpts.push({ value: child.props.value, label: child.props.children });
      } else if (child.type === 'optgroup') {
        React.Children.forEach(child.props.children, sub => {
          if (sub && sub.type === 'option') {
            childOpts.push({ value: sub.props.value, label: sub.props.children });
          }
        });
      } else if (Array.isArray(child)) {
        child.forEach(c => {
          if (c && c.type === 'option') {
             childOpts.push({ value: c.props.value, label: c.props.children });
          }
        });
      }
    });
    
    const combined = [...options, ...childOpts];
    return combined.map(o => (typeof o === 'string' || typeof o === 'number') ? { value: o, label: String(o) } : o);
  }, [options, children]);

  // Filtrado
  const filteredOpts = useMemo(() => {
    if (!search) return normOptions;
    const lower = search.toLowerCase();
    return normOptions.filter(o => 
      String(o.label).toLowerCase().includes(lower) || 
      String(o.value).toLowerCase().includes(lower)
    );
  }, [normOptions, search]);

  const handleSelect = (val) => {
    // Mock event like native select
    if (onChange) {
      onChange({ target: { name, value: val } });
    }
    setOpen(false);
  };

  const selectedOpt = normOptions.find(o => o.value === value);

  // Colores del sistema D+ARQ (glassmorphism)
  const C = {
    bg: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.1)',
    bgDrop: '#111827',
    borderDrop: 'rgba(255,255,255,0.08)',
    text: '#e2e8f0',
    textDim: '#64748b',
    hoverBg: 'rgba(255,255,255,0.04)',
    accent: '#818cf8',
  };

  const triggerStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: C.bg,
    border: `1px solid ${value ? 'rgba(129,140,248,0.3)' : C.border}`,
    borderRadius: 10,
    color: value ? '#fff' : C.textDim,
    fontSize: 12,
    padding: '9px 12px',
    width: '100%',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    outline: 'none',
    minHeight: 36,
    ...style
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={openDropdown}
        style={triggerStyle}
        className={className}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOpt ? selectedOpt.label : placeholder}
        </span>
        <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && createPortal(
        <div
          ref={dropRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999,
            background: C.bgDrop, border: `1px solid ${C.borderDrop}`, borderRadius: 12,
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column'
          }}
        >
          {/* Search */}
          <div style={{ padding: '8px', borderBottom: `1px solid ${C.borderDrop}` }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
              background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.borderDrop}`, borderRadius: 8,
            }}>
              <Search size={12} color={C.textDim} style={{ flexShrink: 0 }} />
              <input
                autoFocus
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  flex: 1, minWidth: 0, background: 'transparent', outline: 'none', border: 'none',
                  fontSize: 12, color: C.text, fontFamily: 'inherit',
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} type="button" style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <X size={12} color={C.textDim} />
                </button>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="custom-scrollbar" style={{ maxHeight: 200, overflowY: 'auto', padding: '4px 0' }}>
            {!search && !required && (
               <button
                type="button"
                onClick={() => handleSelect('')}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none',
                  cursor: 'pointer', color: C.textDim, fontSize: 12, fontStyle: 'italic',
                }}
                onMouseEnter={e => e.currentTarget.style.background = C.hoverBg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
               >
                 {placeholder}
               </button>
            )}

            {filteredOpts.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => handleSelect(o.value)}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: o.value === value ? C.accent : C.text,
                  background: o.value === value ? 'rgba(129,140,248,0.1)' : 'transparent',
                  fontWeight: o.value === value ? 700 : 400,
                  display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}
                onMouseEnter={e => { if (o.value !== value) e.currentTarget.style.background = C.hoverBg; }}
                onMouseLeave={e => { if (o.value !== value) e.currentTarget.style.background = 'transparent'; }}
              >
                {o.label}
              </button>
            ))}

            {filteredOpts.length === 0 && (
              <p style={{ textAlign: 'center', fontSize: 11, color: C.textDim, fontStyle: 'italic', padding: 16 }}>
                No se encontraron opciones
              </p>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
