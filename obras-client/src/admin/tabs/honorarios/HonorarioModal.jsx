import React, { useState } from 'react';
import { Modal, SearchableSelect } from '@darq/ui';
import { Save, Send } from 'lucide-react';
import { fmt } from '../../../lib/calculadora.jsx';
import { TIPOS } from './constants.js';

export default function HonorarioModal({ config, initialData, onSave, onClose }) {
  const moneda = config?.honorarios_moneda || 'USD';
  const isEditing = !!initialData;

  const [form, setForm] = useState({
    tipo:           initialData?.tipo          || 'proyecto',
    hito:           initialData?.hito          || '',
    pct_del_total:  initialData?.pct_del_total || '',
    monto:          initialData?.monto         || '',
    fecha_emision:  initialData?.fecha_emision || '',
    fecha_cobro:    initialData?.fecha_cobro   || '',
    tc_emision:     initialData?.tc_emision    || '',
    estado:         initialData?.estado        || 'pendiente',
    nota:           initialData?.nota          || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const tipoConfig = TIPOS.find(t => t.id === form.tipo);
  const totalTipo = config?.[tipoConfig?.configKey] || 0;
  const montoCalculado = form.pct_del_total && totalTipo
    ? Math.round(totalTipo * parseFloat(form.pct_del_total) / 100 * 100) / 100
    : parseFloat(form.monto) || 0;

  const handlePctChange = (val) => {
    set('pct_del_total', val);
    if (totalTipo && val) {
      set('monto', (Math.round(totalTipo * parseFloat(val) / 100 * 100) / 100).toString());
    }
  };

  const handleSave = async () => {
    if (!form.hito || !montoCalculado) return;
    setSaving(true);
    await onSave({
      ...form,
      monto: montoCalculado,
      pct_del_total: parseFloat(form.pct_del_total) || null,
      tc_emision: parseFloat(form.tc_emision) || null,
      moneda,
    });
    setSaving(false);
  };

  return (
    <Modal
      title={isEditing ? 'Editar Cuota de Honorario' : 'Registrar Cuota de Honorario'}
      onClose={onClose}
      maxWidth={460}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.hito || !montoCalculado}>
          <Save size={13} /> {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="label">Tipo de Honorario</label>
          <SearchableSelect className="input" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
            {TIPOS.map(t => (
              <option key={t.id} value={t.id}>
                {t.label} {config?.[t.configKey] ? `· ${fmt(config[t.configKey], moneda)} total` : '(sin configurar)'}
              </option>
            ))}
          </SearchableSelect>
        </div>
        <div>
          <label className="label">Hito / Descripción</label>
          <input className="input" value={form.hito} onChange={e => set('hito', e.target.value)}
            placeholder="Ej: Anticipo, Al 50% de avance, Entrega final..." />
        </div>
        <div className="grid-2">
          <div>
            <label className="label">% del total</label>
            <p style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>Sobre {fmt(totalTipo, moneda)}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input className="input" type="number" min="0" max="100" step="0.1"
                value={form.pct_del_total} onChange={e => handlePctChange(e.target.value)}
                placeholder="30" style={{ textAlign: 'right' }} />
              <span style={{ fontSize: 11, color: '#64748b' }}>%</span>
            </div>
          </div>
          <div>
            <label className="label">Monto ({moneda})</label>
            <p style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>
              {form.pct_del_total ? 'Calculado automáticamente' : 'O ingresá directo'}
            </p>
            <input className="input" type="number" step="0.01"
              value={form.monto} onChange={e => { set('monto', e.target.value); set('pct_del_total', ''); }}
              placeholder="0.00" style={{ textAlign: 'right' }} />
          </div>
        </div>
        {montoCalculado > 0 && (
          <div style={{ padding: '12px 16px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10 }}>
            <span style={{ fontSize: 11, color: '#818cf8', fontWeight: 700 }}>Monto de esta cuota: </span>
            <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#818cf8', fontSize: 16 }}>{fmt(montoCalculado, moneda)}</span>
          </div>
        )}
        <div>
          <label className="label">Estado</label>
          <SearchableSelect className="input" value={form.estado} onChange={e => set('estado', e.target.value)}>
            <option value="pendiente">Pendiente — aún no certificado</option>
            <option value="emitido">Emitido — certificado enviado al cliente</option>
          </SearchableSelect>
        </div>
        {form.estado === 'emitido' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="grid-2">
              <div>
                <label className="label">Fecha de emisión</label>
                <input className="input" type="date" value={form.fecha_emision} onChange={e => set('fecha_emision', e.target.value)} />
              </div>
              <div>
                <label className="label">TC al emitir (ARS/USD)</label>
                <p style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>Para conversión de referencia</p>
                <input className="input" type="number" step="1" placeholder="Ej: 1320"
                  value={form.tc_emision} onChange={e => set('tc_emision', e.target.value)} style={{ textAlign: 'right' }} />
              </div>
            </div>
            {form.tc_emision && montoCalculado > 0 && (
              <div style={{ padding: '8px 12px', background: 'rgba(99,102,241,0.06)', borderRadius: 8, fontSize: 11, color: '#818cf8' }}>
                Equivalente ARS al TC {form.tc_emision}: {fmt(montoCalculado * parseFloat(form.tc_emision), 'ARS')}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
