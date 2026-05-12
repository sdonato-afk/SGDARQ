import React, { useState } from 'react';
import { Modal, SearchableSelect } from '@darq/ui';
import { Save } from 'lucide-react';
import { calcularMargenMO } from '../../../lib/calculadora.jsx';

const RUBROS = ['Albañilería', 'Electricidad', 'Plomería', 'Yesería', 'Pintura', 'Carpintería', 'Herrería', 'Sanitaria', 'Gas', 'Climatización', 'Excavaciones', 'Estructura', 'Varios'];

export default function ContratistasModal({ proveedores, onSave, onClose, initialData }) {
  const [form, setForm] = useState(initialData || {
    proveedor_id: '',
    contratista: '',
    rubro: 'Albañilería',
    moneda: 'ARS',
    presupuesto_cliente: '',
    costo_real: '',
    estado: 'presupuestado',
    fecha_inicio: '',
    fecha_fin: '',
    notas: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const pc = parseFloat(form.presupuesto_cliente) || 0;
  const cr = parseFloat(form.costo_real) || 0;
  const { margen, margen_pct } = calcularMargenMO(pc, cr);

  const handleSave = async () => {
    if (!form.contratista || !pc) return;
    setSaving(true);
    await onSave({
      ...form,
      presupuesto_cliente: pc,
      costo_real: cr,
      margen_operativo: margen,
      margen_pct,
    });
    setSaving(false);
  };

  return (
    <Modal
      title={initialData ? 'Editar Contratista' : 'Nuevo Contratista'}
      onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.contratista || !pc}>
          <Save size={13} />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </>}
    >
      <div className="grid-2" style={{ gap: 14 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="label">Asignar Contratista desde Sistema Central</label>
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              placeholder="Buscar proveedor..."
              value={form.contratista}
              onChange={e => { setForm(f => ({ ...f, contratista: e.target.value, proveedor_id: '' })); }}
              onFocus={() => document.getElementById('prov-list').style.display = 'block'}
              onBlur={() => setTimeout(() => document.getElementById('prov-list').style.display = 'none', 200)}
            />
            <div id="prov-list" style={{
                display: 'none', position: 'absolute', top: '100%', left: 0, right: 0,
                background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                maxHeight: 200, overflowY: 'auto', zIndex: 10, borderRadius: 8, marginTop: 4
              }}>
              {[...new Map(proveedores.map(p => [(p.nombre || '').toLowerCase().trim(), p])).values()]
               .filter(p => !form.contratista || (p.nombre || '').toLowerCase().includes(form.contratista.toLowerCase()))
               .map(p => (
                <div
                  key={p.id}
                  style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setForm(f => ({ ...f, proveedor_id: p.id, contratista: p.nombre, rubro: p.rubro || f.rubro }));
                    document.getElementById('prov-list').style.display = 'none';
                  }}
                  className="hover:bg-slate-700 text-slate-200"
                >
                  {p.nombre} {p.rubro ? <span style={{fontSize:10, color:'#64748b'}}>({p.rubro})</span> : ''}
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 6 }}>
            Al hacer clic en un proveedor oficial de la lista, todos los pagos realizados desde tesorería se vincularán automáticamente a este presupuesto.
          </div>
        </div>

        {!form.proveedor_id && (
          <div style={{ gridColumn: '1 / -1', padding: 12, background: 'rgba(245,158,11,0.1)', border: '1px dashed rgba(245,158,11,0.3)', borderRadius: 8 }}>
            <label className="label" style={{ color: '#f59e0b' }}>Nombre Manual (No Sincronizado)</label>
            <input className="input" value={form.contratista} onChange={e => set('contratista', e.target.value)} placeholder="Sólo si no figura en el listado..." />
          </div>
        )}

        <div>
          <label className="label">Rubro Especialidad</label>
          <SearchableSelect className="input" value={form.rubro} onChange={e => set('rubro', e.target.value)}>
            {RUBROS.map(r => <option key={r} value={r}>{r}</option>)}
          </SearchableSelect>
        </div>
        <div>
          <label className="label">Moneda</label>
          <SearchableSelect className="input" value={form.moneda} onChange={e => set('moneda', e.target.value)}>
            <option value="ARS">ARS $</option>
            <option value="USD">USD u$d</option>
          </SearchableSelect>
        </div>
        <div>
          <label className="label">Presupuesto al Cliente</label>
          <input className="input" type="number" step="0.01" value={form.presupuesto_cliente} onChange={e => set('presupuesto_cliente', e.target.value)} placeholder="Lo que paga el cliente" style={{ textAlign: 'right' }} />
        </div>
        <div>
          <label className="label">Costo Real Subcontratista ★</label>
          <input className="input" type="number" step="0.01" value={form.costo_real} onChange={e => set('costo_real', e.target.value)} placeholder="Lo que cobrará el contratista" style={{ textAlign: 'right' }} />
        </div>
        <div>
          <label className="label">Inicio estimado</label>
          <input className="input" type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} />
        </div>
        <div>
          <label className="label">Fin estimado</label>
          <input className="input" type="date" value={form.fecha_fin} onChange={e => set('fecha_fin', e.target.value)} />
        </div>
      </div>

      {pc > 0 && cr > 0 && (
        <div style={{ marginTop: 20, padding: '16px 20px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Margen Operativo D+ARQ ★ (Privado)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Margen</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: margen >= 0 ? '#818cf8' : '#f87171', fontFamily: 'monospace' }}>
                {form.moneda === 'USD' ? 'u$d' : '$'} {margen.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Margen %</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: margen_pct >= 0 ? '#818cf8' : '#f87171' }}>
                {margen_pct.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
