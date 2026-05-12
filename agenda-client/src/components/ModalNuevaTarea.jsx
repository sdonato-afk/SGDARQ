import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

const AREAS        = ['Obras', 'Alquileres', 'Oficina', 'Directorio'];
const RESPONSABLES = ['General', 'Santiago', 'Sebastián', 'Emiliano'];
const PRIORIDADES  = ['normal', 'alta', 'critica'];

export default function ModalNuevaTarea({ onGuardar, onClose }) {
  const [form, setForm] = useState({
    titulo: '', descripcion: '',
    area: 'Obras', prioridad: 'normal',
    responsable: 'General', fechaVencimiento: '',
    montoPotencial: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    onGuardar({
      ...form,
      montoPotencial: Number(form.montoPotencial) || 0,
      fechaVencimiento: form.fechaVencimiento || null,
    });
    onClose();
  };

  const inputCls = "w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-500/60 transition-colors";
  const labelCls = "darq-label text-white/40 mb-1 block";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#060811]/40 w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-violet-700/80 border-b border-white/10 flex justify-between items-center">
          <div>
            <p className="text-violet-300 darq-label mb-0.5">Agenda de Gestión</p>
            <h3 className="text-lg font-black italic text-white uppercase tracking-tight">Nueva Tarea</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Título *</label>
            <input className={inputCls} placeholder="Ej: Revisar presupuesto OHIGGINS" value={form.titulo} onChange={e => set('titulo', e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>Descripción</label>
            <textarea className={inputCls + " resize-none"} rows={2} placeholder="Contexto adicional..." value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Área</label>
              <select className={inputCls} value={form.area} onChange={e => set('area', e.target.value)}>
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Prioridad</label>
              <select className={inputCls} value={form.prioridad} onChange={e => set('prioridad', e.target.value)}>
                {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Responsable</label>
              <select className={inputCls} value={form.responsable} onChange={e => set('responsable', e.target.value)}>
                {RESPONSABLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Vencimiento</label>
              <input type="date" className={inputCls} value={form.fechaVencimiento} onChange={e => set('fechaVencimiento', e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Monto en riesgo (ARS)</label>
            <input type="number" className={inputCls} placeholder="0" value={form.montoPotencial} onChange={e => set('montoPotencial', e.target.value)} />
          </div>

          <button type="submit" className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-xl text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2">
            <Plus size={16} /> Agregar Tarea
          </button>
        </form>
      </div>
    </div>
  );
}
