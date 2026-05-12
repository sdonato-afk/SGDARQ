import React, { useState } from 'react';
import { Modal, CascadeSelect, SearchableSelect } from '@darq/ui';
import { Save } from 'lucide-react';
import { useTaxonomia } from '../../../lib/useTaxonomia.js';
import { useProveedoresMain } from '../../../hooks/useObras.js';

export default function AcopioModal({ initialData, onSave, onClose }) {
  const { taxonomia } = useTaxonomia();
  const { proveedores } = useProveedoresMain();

  const [form, setForm] = useState(initialData || {
    material: '', 
    taxonomia_categoria: '', taxonomia_rubro: '', taxonomia_concepto: '',
    taxonomia_categoria_nombre: '', taxonomia_rubro_nombre: '',
    proveedor: '', proveedorId: '',
    unidad: 'm2',
    moneda: 'ARS', precio_unitario: '',
    cantidad_comprada: '', cantidad_entregada: 0,
    fecha_compra: new Date().toISOString().split('T')[0], notas: '',
  });

  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleTaxonomia = ({ categoria, rubro, concepto }, taxArr) => {
    const cat = taxArr.find(c => c.id === categoria);
    const rubObj = cat?.rubros?.find(r => r.id === rubro);
    setForm(f => ({
      ...f,
      taxonomia_categoria: categoria,
      taxonomia_rubro: rubro,
      taxonomia_concepto: concepto,
      taxonomia_categoria_nombre: cat?.nombre || '',
      taxonomia_rubro_nombre: rubObj?.nombre || '',
    }));
  };

  const handleProveedorChange = (e) => {
    const pId = e.target.value;
    const pObj = proveedores.find(p => p.id === pId);
    setForm(f => ({
      ...f,
      proveedorId: pId,
      proveedor: pObj ? pObj.nombre : '',
    }));
  };

  return (
    <Modal
      title={initialData ? 'Editar Acopio' : 'Nuevo Acopio'}
      onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={async () => { setSaving(true); await onSave(form); setSaving(false); }} disabled={saving || (!form.taxonomia_rubro && !form.material)}>
          <Save size={13} /> {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </>}
    >
      <div className="grid-2" style={{ gap: 14 }}>
        
        {/* Taxonomía */}
        <div style={{ gridColumn: '1 / -1', padding: '12px 14px', background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.12)', borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Categorización del Material</div>
          <CascadeSelect
            taxonomia={taxonomia}
            value={{ categoria: form.taxonomia_categoria, rubro: form.taxonomia_rubro, concepto: form.taxonomia_concepto }}
            onChange={(v) => handleTaxonomia(v, taxonomia)}
          />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label className="label">Descripción / Detalle adicional</label>
          <input className="input" value={form.material} onChange={e => set('material', e.target.value)} placeholder="Ej: Cerámicos 60x60 marca San Lorenzo, Hierro Acindar..." />
        </div>

        <div>
          <label className="label">Proveedor</label>
          <SearchableSelect 
            className="input" 
            value={form.proveedorId || ''} 
            onChange={handleProveedorChange}
            options={proveedores.map(p => ({ value: p.id, label: p.nombre }))}
            placeholder="-- Seleccionar proveedor --"
          />
        </div>

        <div>
          <label className="label">Fecha de compra</label>
          <input className="input" type="date" value={form.fecha_compra} onChange={e => set('fecha_compra', e.target.value)} />
        </div>

        <div>
          <label className="label">Cantidad comprada</label>
          <input className="input" type="number" value={form.cantidad_comprada} onChange={e => set('cantidad_comprada', parseFloat(e.target.value) || 0)} style={{ textAlign: 'right' }} />
        </div>

        <div>
          <label className="label">Unidad</label>
          <SearchableSelect className="input" value={form.unidad} onChange={e => set('unidad', e.target.value)}>
            {['m2', 'm3', 'ml', 'kg', 'tn', 'u', 'lt', 'kg/m', 'gl'].map(u => <option key={u} value={u}>{u}</option>)}
          </SearchableSelect>
        </div>

        <div>
          <label className="label">Precio Unitario</label>
          <input className="input" type="number" value={form.precio_unitario} onChange={e => set('precio_unitario', parseFloat(e.target.value) || 0)} style={{ textAlign: 'right' }} />
        </div>

        <div>
          <label className="label">Moneda</label>
          <SearchableSelect className="input" value={form.moneda} onChange={e => set('moneda', e.target.value)}>
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
          </SearchableSelect>
        </div>
      </div>
    </Modal>
  );
}
