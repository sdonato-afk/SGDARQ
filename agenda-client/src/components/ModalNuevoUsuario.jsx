import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';

const COLORES = [
  '#7c3aed', '#2563eb', '#0891b2', '#059669',
  '#d97706', '#dc2626', '#db2777', '#0f766e',
];

const DEFAULT = { nombre: '', email: '', whatsapp: '', color: COLORES[0] };

const inp = 'w-full bg-[#060811] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/60 transition-colors';
const lbl = 'block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1.5';

export default function ModalNuevoUsuario({ onGuardar, usuarioEditar, onClose }) {
  const isEdit = Boolean(usuarioEditar);
  const [form, setForm] = useState(usuarioEditar || DEFAULT);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setSaving(true);
    await onGuardar(form);
    setSaving(false);
    onClose();
  };

  // Avatar preview
  const initials = form.nombre
    .split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#060811]/40 w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 bg-violet-800/60 border-b border-white/10 flex justify-between items-center">
          <div>
            <p className="text-violet-300 darq-label mb-0.5">Agenda de Gestión</p>
            <h3 className="text-lg font-black italic text-white uppercase tracking-tight flex items-center gap-2">
              <UserPlus size={16} /> {isEdit ? 'Editar miembro' : 'Nuevo miembro'}
            </h3>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all hover:rotate-90">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Avatar preview + color */}
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white flex-shrink-0 shadow-lg"
              style={{ backgroundColor: form.color }}
            >
              {initials || '?'}
            </div>
            <div className="flex-1">
              <label className={lbl}>Color de avatar</label>
              <div className="flex gap-2 flex-wrap">
                {COLORES.map(c => (
                  <button
                    key={c} type="button"
                    onClick={() => setForm(p => ({ ...p, color: c }))}
                    className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111827] scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className={lbl}>Nombre *</label>
            <input className={inp} placeholder="Ej: Santiago Pérez" value={form.nombre} onChange={set('nombre')} required />
          </div>

          {/* Email */}
          <div>
            <label className={lbl}>Email (para notificaciones)</label>
            <input type="email" className={inp} placeholder="nombre@estudio.com" value={form.email} onChange={set('email')} />
          </div>

          {/* WhatsApp */}
          <div>
            <label className={lbl}>WhatsApp (formato internacional)</label>
            <input className={inp} placeholder="+549XXXXXXXXXX" value={form.whatsapp} onChange={set('whatsapp')} />
            <p className="text-[10px] text-white/20 mt-1.5 font-mono">Ej: +5491155555555 (sin espacios ni guiones)</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white/40 border border-white/10 hover:border-white/20 hover:text-white/70 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-lg shadow-violet-900/40 disabled:opacity-50">
              {saving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Agregar miembro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
