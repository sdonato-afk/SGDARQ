import React, { useState } from 'react';
import { X, CalendarClock, RefreshCw } from 'lucide-react';
import { useUsuariosData } from '../hooks/useUsuariosData';

const TIPOS_EVENTO = [
  { value: 'reunion',         label: '🤝 Reunión' },
  { value: 'cita_proveedor',  label: '🔧 Cita con proveedor' },
  { value: 'facturacion',     label: '🧾 Recordatorio de facturación' },
  { value: 'llamada',         label: '📞 Llamada / seguimiento' },
  { value: 'visita_obra',     label: '🏗️ Visita de obra' },
  { value: 'otro',            label: '📌 Otro' },
];

const PERIODICIDAD = [
  { value: 'ninguna',   label: 'Sin repetición' },
  { value: 'semanal',   label: '↻ Semanal' },
  { value: 'quincenal', label: '↻ Quincenal' },
  { value: 'mensual',   label: '↻ Mensual' },
  { value: 'diaria',    label: '↻ Diaria' },
];

const NOTIFICACION = [
  { value: 'app',       label: '📱 Solo en la app' },
  { value: 'whatsapp',  label: '💬 WhatsApp' },
  { value: 'email',     label: '📧 Email' },
  { value: 'todos',     label: '🔔 Todos los medios' },
];

const AREAS = ['Obras', 'Alquileres', 'Oficina', 'Directorio'];

const DEFAULT = {
  titulo:        '',
  tipoEvento:    'reunion',
  fechaHora:     '',
  contacto:      '',
  lugar:         '',
  area:          'Oficina',
  asignadoA:     '',       // ID del usuario
  notificacion:  'app',
  periodicidad:  'ninguna',
  descripcion:   '',
};

const inp = 'w-full bg-[#060811] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/60 transition-colors';
const lbl = 'block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1.5';

export default function ModalNuevoEvento({ onGuardar, onClose }) {
  const { usuariosActivos, loading: loadU } = useUsuariosData();
  const [form, setForm] = useState(DEFAULT);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));
  const setV = (field, value) => setForm(p => ({ ...p, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.fechaHora) return;
    setSaving(true);
    await onGuardar(form);
    setSaving(false);
    onClose();
  };

  const minDate = new Date().toISOString().slice(0, 16);
  const usuarioSel = usuariosActivos.find(u => u.id === form.asignadoA);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#060811]/40 w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden my-4">

        {/* Header */}
        <div className="px-6 py-4 bg-indigo-700/80 border-b border-white/10 flex justify-between items-center">
          <div>
            <p className="text-indigo-300 darq-label mb-0.5">Agenda de Gestión</p>
            <h3 className="text-lg font-black italic text-white uppercase tracking-tight flex items-center gap-2">
              <CalendarClock size={16} /> Nuevo Evento
            </h3>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all hover:rotate-90">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Tipo de evento */}
          <div>
            <label className={lbl}>Tipo de evento</label>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS_EVENTO.map(t => (
                <button key={t.value} type="button"
                  onClick={() => setV('tipoEvento', t.value)}
                  className={`px-2 py-2 rounded-xl darq-value border transition-all text-left ${
                    form.tipoEvento === t.value
                      ? 'border-indigo-500/70 bg-indigo-500/15 text-white'
                      : 'border-white/8 bg-white/3 text-white/40 hover:text-white/70'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Título + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={lbl}>Título *</label>
              <input className={inp} placeholder="Ej: Reunión con Nak Berisha" value={form.titulo} onChange={set('titulo')} required />
            </div>
            <div>
              <label className={lbl}>Fecha y hora *</label>
              <input type="datetime-local" className={inp} min={minDate} value={form.fechaHora} onChange={set('fechaHora')} required />
            </div>
            <div>
              <label className={lbl + ' flex items-center gap-1'}><RefreshCw size={9} /> Repetición</label>
              <select className={inp} value={form.periodicidad} onChange={set('periodicidad')}>
                {PERIODICIDAD.map(p => (
                  <option key={p.value} value={p.value} className="bg-slate-900">{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Contacto y lugar */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Contacto / empresa</label>
              <input className={inp} placeholder="Nombre o empresa" value={form.contacto} onChange={set('contacto')} />
            </div>
            <div>
              <label className={lbl}>Lugar (opcional)</label>
              <input className={inp} placeholder="Ej: Obra MO 2325" value={form.lugar} onChange={set('lugar')} />
            </div>
          </div>

          {/* Asignar a + Área */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Asignar a</label>
              {loadU ? (
                <div className={inp + ' text-white/25 text-xs'}>Cargando equipo...</div>
              ) : usuariosActivos.length === 0 ? (
                <div className={inp + ' text-white/25 text-xs'}>Sin miembros — agregar en "Equipo"</div>
              ) : (
                <select className={inp} value={form.asignadoA} onChange={set('asignadoA')}>
                  <option value="" className="bg-slate-900">— Sin asignar</option>
                  {usuariosActivos.map(u => (
                    <option key={u.id} value={u.id} className="bg-slate-900">{u.nombre}</option>
                  ))}
                </select>
              )}
              {/* Avatar preview del seleccionado */}
              {usuarioSel && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                    style={{ backgroundColor: usuarioSel.color }}>
                    {usuarioSel.nombre.split(' ').map(w => w[0]).join('').slice(0,2)}
                  </div>
                  <span className="text-[10px] text-white/40">{usuarioSel.email || usuarioSel.whatsapp || 'Sin contacto registrado'}</span>
                </div>
              )}
            </div>
            <div>
              <label className={lbl}>Área</label>
              <select className={inp} value={form.area} onChange={set('area')}>
                {AREAS.map(a => <option key={a} value={a} className="bg-slate-900">{a}</option>)}
              </select>
            </div>
          </div>

          {/* Notificación */}
          <div>
            <label className={lbl}>Canal de notificación</label>
            <div className="grid grid-cols-2 gap-2">
              {NOTIFICACION.map(n => (
                <button key={n.value} type="button"
                  onClick={() => setV('notificacion', n.value)}
                  className={`px-3 py-2 rounded-xl darq-value border transition-all text-left ${
                    form.notificacion === n.value
                      ? 'border-indigo-500/70 bg-indigo-500/15 text-white'
                      : 'border-white/8 bg-white/3 text-white/40 hover:text-white/70'
                  }`}>
                  {n.label}
                </button>
              ))}
            </div>
            {(form.notificacion === 'whatsapp' || form.notificacion === 'todos') && usuarioSel && !usuarioSel.whatsapp && (
              <p className="text-[10px] text-amber-400/70 mt-1.5">⚠️ {usuarioSel.nombre} no tiene WhatsApp registrado</p>
            )}
            {(form.notificacion === 'email' || form.notificacion === 'todos') && usuarioSel && !usuarioSel.email && (
              <p className="text-[10px] text-amber-400/70 mt-1">⚠️ {usuarioSel.nombre} no tiene email registrado</p>
            )}
            <p className="text-[10px] text-white/20 mt-1.5">Los avisos de WhatsApp y email se activan manualmente desde la vista del evento</p>
          </div>

          {/* Descripción */}
          <div>
            <label className={lbl}>Descripción / notas</label>
            <textarea className={inp + ' resize-none h-16'}
              placeholder="Detalles adicionales..."
              value={form.descripcion} onChange={set('descripcion')} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white/40 border border-white/10 hover:border-white/20 hover:text-white/70 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-900/40 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
