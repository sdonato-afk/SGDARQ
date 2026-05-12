import React from 'react';
import SearchableSelect from './SearchableSelect.jsx';

/**
 * Selector en cascada de 3 niveles: Categoría → Rubro → Concepto
 * Props:
 *   taxonomia: array de categorías (de useTaxonomia)
 *   value: { categoria, rubro, concepto }
 *   onChange: fn({ categoria, rubro, concepto })
 *   filtrarCats: array de IDs de categorías a mostrar (opcional)
 *   disabled: bool
 *   required: bool
 */
export default function CascadeSelect({
  taxonomia = [],
  value = {},
  onChange,
  filtrarCats = null,
  disabled = false,
  required = false,
}) {
  const cats = filtrarCats
    ? taxonomia.filter(c => filtrarCats.includes(c.id))
    : taxonomia;

  const catActual = taxonomia.find(c => c.id === value.categoria);
  const rubros = catActual?.rubros || [];
  const rubActual = rubros.find(r => r.id === value.rubro);
  const conceptos = rubActual?.conceptos || [];

  const handleCat = (e) => {
    onChange({ categoria: e.target.value, rubro: '', concepto: '' });
  };

  const handleRub = (e) => {
    onChange({ ...value, rubro: e.target.value, concepto: '' });
  };

  const handleCon = (e) => {
    onChange({ ...value, concepto: e.target.value });
  };

  const selectStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#e2e8f0',
    fontSize: 12,
    padding: '9px 12px',
    width: '100%',
    outline: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Nivel 1: Categoría */}
      <div>
        <label className="label">Categoría {required && <span style={{ color: '#f87171' }}>*</span>}</label>
        <SearchableSelect
          style={{ borderColor: value.categoria ? 'rgba(129,140,248,0.3)' : 'rgba(255,255,255,0.1)' }}
          value={value.categoria || ''}
          onChange={handleCat}
          disabled={disabled}
          required={required}
          options={cats.map(c => ({ value: c.id, label: c.nombre }))}
          placeholder="— Seleccionar categoría —"
        />
      </div>

      {/* Nivel 2: Rubro */}
      <div>
        <label className="label">Rubro {required && <span style={{ color: '#f87171' }}>*</span>}</label>
        <SearchableSelect
          style={{ borderColor: value.rubro ? 'rgba(129,140,248,0.3)' : 'rgba(255,255,255,0.1)' }}
          value={value.rubro || ''}
          onChange={handleRub}
          disabled={disabled || !value.categoria}
          required={required}
          options={rubros.map(r => ({ value: r.id, label: r.nombre }))}
          placeholder={!value.categoria ? '— Primero elegí categoría —' : '— Seleccionar rubro —'}
        />
      </div>

      {/* Nivel 3: Concepto */}
      <div>
        <label className="label">Concepto {required && <span style={{ color: '#f87171' }}>*</span>}</label>
        <SearchableSelect
          style={{ borderColor: value.concepto ? 'rgba(129,140,248,0.3)' : 'rgba(255,255,255,0.1)' }}
          value={value.concepto || ''}
          onChange={handleCon}
          disabled={disabled || !value.rubro}
          required={required}
          options={conceptos.map(con => ({ value: con, label: con }))}
          placeholder={!value.rubro ? '— Primero elegí rubro —' : '— Seleccionar concepto —'}
        />
      </div>

      {/* Breadcrumb visual */}
      {(value.categoria || value.rubro || value.concepto) && (
        <div style={{ fontSize: 10, color: '#64748b', display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          {value.categoria && (
            <span style={{ background: 'rgba(129,140,248,0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
              {catActual?.nombre}
            </span>
          )}
          {value.rubro && <>
            <span style={{ color: '#334155' }}>›</span>
            <span style={{ background: 'rgba(129,140,248,0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
              {rubActual?.nombre}
            </span>
          </>}
          {value.concepto && <>
            <span style={{ color: '#334155' }}>›</span>
            <span style={{ background: 'rgba(129,140,248,0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
              {value.concepto}
            </span>
          </>}
        </div>
      )}
    </div>
  );
}
