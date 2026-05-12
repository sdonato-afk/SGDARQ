import React, { useState } from 'react';
import { Plus, Trash2, Save, ChevronDown, ChevronRight, Edit2, Check, X } from 'lucide-react';
import { useTaxonomia } from '../../lib/useTaxonomia.js';

export default function TaxonomiaManager() {
  const { taxonomia, loading, save } = useTaxonomia();
  const [tree, setTree] = useState(null); // local copy mientras edita
  const [expanded, setExpanded] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Trabajar sobre copia local
  const data = tree ?? taxonomia;

  const toggleExpand = (key) => setExpanded(e => ({ ...e, [key]: !e[key] }));

  // Helpers de mutación (inmutables)
  const updateCat = (catIdx, changes) => {
    const next = data.map((c, i) => i === catIdx ? { ...c, ...changes } : c);
    setTree(next);
  };

  const addRubro = (catIdx) => {
    const id = `rub_${Date.now()}`;
    const next = data.map((c, i) => i === catIdx
      ? { ...c, rubros: [...(c.rubros || []), { id, nombre: 'Nuevo rubro', conceptos: [] }] }
      : c
    );
    setTree(next);
  };

  const updateRubro = (catIdx, rubIdx, changes) => {
    const next = data.map((c, i) => i !== catIdx ? c : {
      ...c,
      rubros: c.rubros.map((r, j) => j === rubIdx ? { ...r, ...changes } : r)
    });
    setTree(next);
  };

  const removeRubro = (catIdx, rubIdx) => {
    const next = data.map((c, i) => i !== catIdx ? c : {
      ...c, rubros: c.rubros.filter((_, j) => j !== rubIdx)
    });
    setTree(next);
  };

  const addConcepto = (catIdx, rubIdx) => {
    const next = data.map((c, i) => i !== catIdx ? c : {
      ...c,
      rubros: c.rubros.map((r, j) => j !== rubIdx ? r : {
        ...r, conceptos: [...(r.conceptos || []), 'Nuevo concepto']
      })
    });
    setTree(next);
  };

  const updateConcepto = (catIdx, rubIdx, conIdx, value) => {
    const next = data.map((c, i) => i !== catIdx ? c : {
      ...c,
      rubros: c.rubros.map((r, j) => j !== rubIdx ? r : {
        ...r, conceptos: r.conceptos.map((con, k) => k === conIdx ? value : con)
      })
    });
    setTree(next);
  };

  const removeConcepto = (catIdx, rubIdx, conIdx) => {
    const next = data.map((c, i) => i !== catIdx ? c : {
      ...c,
      rubros: c.rubros.map((r, j) => j !== rubIdx ? r : {
        ...r, conceptos: r.conceptos.filter((_, k) => k !== conIdx)
      })
    });
    setTree(next);
  };

  const addCategoria = () => {
    const id = `cat_${Date.now()}`;
    setTree([...(tree ?? taxonomia), { id, nombre: 'Nueva categoría', color: '#818cf8', rubros: [] }]);
  };

  const removeCategoria = (catIdx) => {
    setTree(data.filter((_, i) => i !== catIdx));
  };

  const handleSave = async () => {
    setSaving(true);
    await save(data);
    setTree(null);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Cargando taxonomía...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
            Taxonomía de Clasificación
          </h2>
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            Definí las categorías, rubros y conceptos que se usan en toda la gestión de obras.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={addCategoria}>
            <Plus size={12} /> Categoría
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saving || (!tree && !saved)}
          >
            {saved ? <><Check size={12} /> Guardado</> : <><Save size={12} /> {saving ? 'Guardando...' : 'Guardar cambios'}</>}
          </button>
        </div>
      </div>

      {/* Árbol */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.map((cat, catIdx) => {
          const isExpanded = expanded[`cat_${catIdx}`];
          return (
            <div key={cat.id} className="glass" style={{ overflow: 'hidden', borderLeft: `3px solid ${cat.color || '#818cf8'}` }}>
              {/* Header categoría */}
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
                onClick={() => toggleExpand(`cat_${catIdx}`)}>
                {isExpanded ? <ChevronDown size={14} color="#64748b" /> : <ChevronRight size={14} color="#64748b" />}
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color || '#818cf8', flexShrink: 0 }} />
                <InlineEdit
                  value={cat.nombre}
                  onSave={v => updateCat(catIdx, { nombre: v })}
                  style={{ fontWeight: 900, fontSize: 14, color: '#e2e8f0', flex: 1 }}
                  onClick={e => e.stopPropagation()}
                />
                <span style={{ fontSize: 10, color: '#64748b', marginLeft: 'auto' }}>
                  {cat.rubros?.length || 0} rubros · {cat.rubros?.reduce((s, r) => s + (r.conceptos?.length || 0), 0)} conceptos
                </span>
                <button onClick={e => { e.stopPropagation(); removeCategoria(catIdx); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', marginLeft: 8 }}>
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Rubros */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {cat.rubros?.map((rub, rubIdx) => {
                    const rubKey = `cat_${catIdx}_rub_${rubIdx}`;
                    const rubExpanded = expanded[rubKey];
                    return (
                      <div key={rub.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {/* Header rubro */}
                        <div style={{ padding: '10px 20px 10px 32px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                          onClick={() => toggleExpand(rubKey)}>
                          {rubExpanded ? <ChevronDown size={12} color="#64748b" /> : <ChevronRight size={12} color="#64748b" />}
                          <InlineEdit
                            value={rub.nombre}
                            onSave={v => updateRubro(catIdx, rubIdx, { nombre: v })}
                            style={{ fontWeight: 700, fontSize: 12, color: '#cbd5e1', flex: 1 }}
                            onClick={e => e.stopPropagation()}
                          />
                          <span style={{ fontSize: 10, color: '#475569' }}>
                            {rub.conceptos?.length || 0} conceptos
                          </span>
                          <button onClick={e => { e.stopPropagation(); removeRubro(catIdx, rubIdx); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                            <Trash2 size={11} />
                          </button>
                        </div>

                        {/* Conceptos */}
                        {rubExpanded && (
                          <div style={{ padding: '8px 20px 12px 56px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {rub.conceptos?.map((con, conIdx) => (
                              <ConceptoTag
                                key={conIdx}
                                value={con}
                                onSave={v => updateConcepto(catIdx, rubIdx, conIdx, v)}
                                onRemove={() => removeConcepto(catIdx, rubIdx, conIdx)}
                              />
                            ))}
                            <button
                              onClick={() => addConcepto(catIdx, rubIdx)}
                              style={{
                                background: 'rgba(129,140,248,0.08)',
                                border: '1px dashed rgba(129,140,248,0.3)',
                                borderRadius: 20,
                                padding: '4px 12px',
                                fontSize: 10,
                                color: '#818cf8',
                                cursor: 'pointer',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}>
                              <Plus size={10} /> Concepto
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Agregar rubro */}
                  <div style={{ padding: '10px 20px' }}>
                    <button onClick={() => addRubro(catIdx)} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
                      <Plus size={11} /> Agregar rubro
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {tree && (
        <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, fontSize: 11, color: '#fbbf24' }}>
          ⚠ Tenés cambios sin guardar. Hacé click en "Guardar cambios" para confirmar.
        </div>
      )}
    </div>
  );
}

// ── Inline Edit ──────────────────────────────────────────────
function InlineEdit({ value, onSave, style, onClick }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { onSave(draft); setEditing(false); }}
        onKeyDown={e => { if (e.key === 'Enter') { onSave(draft); setEditing(false); } if (e.key === 'Escape') setEditing(false); }}
        onClick={e => e.stopPropagation()}
        style={{ ...style, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(129,140,248,0.4)', borderRadius: 6, padding: '2px 8px', outline: 'none' }}
      />
    );
  }

  return (
    <span
      style={{ ...style, cursor: 'text', borderRadius: 6, padding: '2px 4px' }}
      onClick={e => { if (onClick) onClick(e); setEditing(true); setDraft(value); }}
      title="Clic para editar"
    >
      {value}
    </span>
  );
}

// ── Concepto Tag ─────────────────────────────────────────────
function ConceptoTag({ value, onSave, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => { onSave(draft); setEditing(false); }}
          onKeyDown={e => {
            if (e.key === 'Enter') { onSave(draft); setEditing(false); }
            if (e.key === 'Escape') setEditing(false);
          }}
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(129,140,248,0.4)', borderRadius: 20, padding: '3px 10px', fontSize: 10, color: '#e2e8f0', outline: 'none', minWidth: 80 }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '3px 10px', fontSize: 10, color: '#94a3b8', cursor: 'default' }}>
      <span onClick={() => { setEditing(true); setDraft(value); }} style={{ cursor: 'text' }}>{value}</span>
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', padding: 0, marginLeft: 2 }}>
        <X size={10} />
      </button>
    </div>
  );
}
