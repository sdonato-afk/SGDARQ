import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '@darq/ui';
import { FASES, TIPOS_TAREA } from '../../../lib/checklistTemplate';

export default function TareaModal({ initialData, onSave, onClose }) {
  const [form, setForm] = useState({
    codigo: '', titulo: '', faseNum: 7, tipo: 'definicion',
    leadTimeDias: 0, responsable: '', responsableTipo: 'Proyecto',
    fechaInstalacion: '', notas: '', prioridad: 'normal',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        codigo: initialData.codigo || '',
        titulo: initialData.titulo || '',
        faseNum: initialData.faseNum || 7,
        tipo: initialData.tipo || 'definicion',
        leadTimeDias: initialData.leadTimeDias || 0,
        responsable: initialData.responsable || '',
        responsableTipo: initialData.responsableTipo || 'Proyecto',
        fechaInstalacion: initialData.fechaInstalacion || '',
        notas: initialData.notas || '',
        prioridad: initialData.prioridad || 'normal',
      });
    }
  }, [initialData]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Calcular fecha límite automáticamente
  const fechaLimite = (() => {
    if (!form.fechaInstalacion || !form.leadTimeDias) return '';
    const d = new Date(form.fechaInstalacion + 'T00:00:00');
    d.setDate(d.getDate() - form.leadTimeDias);
    return d.toISOString().slice(0, 10);
  })();

  const handleSave = async () => {
    if (!form.titulo.trim()) return alert('Ingresá un título');
    setSaving(true);
    await onSave({ ...form, fechaLimite });
    setSaving(false);
  };

  return (
    <Modal
      title={initialData ? 'Editar Tarea' : 'Nueva Tarea'}
      onClose={onClose}
      maxWidth={520}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={13} /> {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </>}
    >
      {/* Código + Título */}
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label className="label">Código</label>
          <input className="input" value={form.codigo} onChange={e => set('codigo', e.target.value)} placeholder="7.1" />
        </div>
        <div>
          <label className="label">Título</label>
          <input className="input" value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Definir muebles de cocina" />
        </div>
      </div>

      {/* Fase + Tipo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label className="label">Fase</label>
          <select className="input" value={form.faseNum} onChange={e => set('faseNum', parseInt(e.target.value))}>
            {FASES.map(f => <option key={f.num} value={f.num}>{f.num}. {f.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Tipo</label>
          <select className="input" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
            {Object.entries(TIPOS_TAREA).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Responsable + Tipo responsable */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label className="label">Responsable</label>
          <input className="input" value={form.responsable} onChange={e => set('responsable', e.target.value)} placeholder="Emiliano" />
        </div>
        <div>
          <label className="label">Área responsable</label>
          <select className="input" value={form.responsableTipo} onChange={e => set('responsableTipo', e.target.value)}>
            {['Director','Proyecto','Admin','Campo','Contratista','Electricista','Plomero','Gasista','Climatización','Mueblero','Marmolero','Pintor','Paisajista','Pilero'].map(r =>
              <option key={r} value={r}>{r}</option>
            )}
          </select>
        </div>
      </div>

      {/* Lead time + Fecha instalación */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label className="label">Lead Time (días anticipación)</label>
          <input className="input" type="number" min="0" value={form.leadTimeDias} onChange={e => set('leadTimeDias', parseInt(e.target.value) || 0)} />
        </div>
        <div>
          <label className="label">Fecha necesaria en obra</label>
          <input className="input" type="date" value={form.fechaInstalacion} onChange={e => set('fechaInstalacion', e.target.value)} />
        </div>
      </div>

      {/* Fecha límite calculada */}
      {fechaLimite && (
        <div style={{
          padding: '10px 16px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)',
          borderRadius: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 700 }}>⚠ Fecha límite para decidir/comprar</span>
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fbbf24', fontFamily: 'monospace' }}>{fechaLimite}</span>
        </div>
      )}

      {/* Prioridad */}
      <div style={{ marginBottom: 16 }}>
        <label className="label">Prioridad</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { v: 'normal', l: 'Normal', c: '#64748b' },
            { v: 'urgente', l: 'Urgente', c: '#fbbf24' },
            { v: 'critica', l: 'Crítica', c: '#ef4444' },
          ].map(p => (
            <button
              key={p.v}
              type="button"
              onClick={() => set('prioridad', p.v)}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 10, border: `1px solid ${form.prioridad === p.v ? p.c : 'rgba(255,255,255,0.1)'}`,
                background: form.prioridad === p.v ? `${p.c}20` : 'transparent',
                color: form.prioridad === p.v ? p.c : '#64748b', fontSize: 11, fontWeight: 800,
                textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className="label">Notas</label>
        <textarea className="input" rows={2} value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Observaciones, especificaciones..." style={{ resize: 'vertical' }} />
      </div>
    </Modal>
  );
}
