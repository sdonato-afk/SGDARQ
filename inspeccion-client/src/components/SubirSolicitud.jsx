import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Plus, Trash2, Loader2, SendHorizonal,
  Package, Wrench, Camera, X, DollarSign
} from 'lucide-react';
import { collection, getDocs, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { SearchableSelect } from '@darq/ui';
import { db } from '../config/firebase';
import { dropboxUpload, dropboxCreateSharedLink, dropboxCreateFolder } from '../hooks/useDropbox';

const TIPOS = [
  { id: 'material', label: 'Materiales', icon: Package,    color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
  { id: 'servicio', label: 'Servicios',  icon: Wrench,     color: '#818cf8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.25)' },
  { id: 'pago',     label: 'Pago',       icon: DollarSign, color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)' },
];

const URGENCIAS = [
  { id: 'normal',  label: 'Normal',      color: '#64748b' },
  { id: 'urgente', label: '⚡ Urgente',  color: '#f87171' },
];

export default function SubirSolicitud({ onBack, user, selectedObra }) {
  const [tipo,         setTipo]         = useState('material');
  const obraId = selectedObra?.id;
  const [descripcion,  setDescripcion]  = useState('');
  const [urgencia,     setUrgencia]     = useState('normal');
  const [nota,         setNota]         = useState('');
  const [items,        setItems]        = useState([{ descripcion: '', cantidad: '', unidad: '' }]);
  // Campos exclusivos para tipo 'pago'
  const [proveedor,    setProveedor]    = useState('');
  const [monto,        setMonto]        = useState('');
  const [moneda,       setMoneda]       = useState('ARS');
  const [foto,         setFoto]         = useState(null);
  const [fotoPreview,  setFotoPreview]  = useState(null);
  const [subiendo,     setSubiendo]     = useState(false);
  const [exito,        setExito]        = useState(false);
  const fileRef = useRef();



  const addItem    = () => setItems(prev => [...prev, { descripcion: '', cantidad: '', unidad: '' }]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => setItems(prev =>
    prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it)
  );

  const handleFoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!obraId || !descripcion.trim()) {
      alert('Completá la obra y la descripción.');
      return;
    }
    setSubiendo(true);
    try {
      const obraSelected = selectedObra;
      let fotoUrl = null;
      if (foto) {
        await dropboxCreateFolder(obraId, obraSelected?.nombre);
        const meta = await dropboxUpload(obraId, obraSelected?.nombre, foto, 'Solicitud_ref', 'Solicitudes');
        fotoUrl = await dropboxCreateSharedLink(meta.path_display);
      }
      const itemsValidos = items.filter(it => it.descripcion.trim());
      const docData = {
        tipo,
        obraId,
        obraNombre:        obraSelected?.nombre || '',
        descripcion:       descripcion.trim(),
        items:             tipo !== 'pago' ? itemsValidos : [],
        urgencia,
        nota:              nota.trim(),
        fotoUrl,
        estado:            tipo === 'pago' ? 'pendiente_aprobacion' : 'pendiente',
        solicitanteUid:    user?.uid    || '',
        solicitanteEmail:  user?.email  || '',
        solicitanteNombre: user?.displayName || user?.email?.split('@')[0] || 'Campo',
        createdAt:         serverTimestamp(),
        updatedAt:         serverTimestamp(),
        resolvedAt:        null,
        movimientoId:      null,
      };
      // Campos adicionales para solicitud de pago
      if (tipo === 'pago') {
        docData.proveedor = proveedor.trim();
        docData.monto = parseFloat(monto) || 0;
        docData.moneda = moneda;
        docData.requiereAprobacion = true;
        docData.aprobadoPor = null;
        docData.aprobadoFecha = null;
        docData.ejecutadoPor = null;
        docData.ejecutadoFecha = null;
      }
      await addDoc(collection(db, 'artifacts', 'sg-darq', 'public', 'data', 'requerimientos'), docData);
      setExito(true);
      setTimeout(() => onBack(), 2500);
    } catch (err) {
      console.error('Error enviando solicitud:', err);
      alert('Error al enviar. Intentá de nuevo.');
    } finally {
      setSubiendo(false);
    }
  };

  if (exito) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}>
          <SendHorizonal size={40} color="#fbbf24" />
        </div>
        <h2 className="text-2xl font-black text-slate-100 mb-2">¡Solicitud enviada!</h2>
        <p className="text-slate-400">La administración recibirá el pedido y lo procesará.</p>
      </div>
    );
  }

  const tipoActual = TIPOS.find(t => t.id === tipo);

  return (
    <div className="p-4 max-w-md mx-auto pb-16">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full active:bg-slate-800 text-slate-400">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold text-slate-100">Nueva Solicitud</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* TIPO */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tipo</label>
          <div className="grid grid-cols-3 gap-3">
            {TIPOS.map(t => {
              const Icon = t.icon;
              const active = tipo === t.id;
              return (
                <button key={t.id} type="button" onClick={() => setTipo(t.id)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95"
                  style={{ background: active ? t.bg : 'rgba(255,255,255,0.03)', border: `2px solid ${active ? t.border : 'rgba(255,255,255,0.06)'}` }}>
                  <Icon size={28} color={active ? t.color : '#475569'} />
                  <span className="text-sm font-bold" style={{ color: active ? t.color : '#64748b' }}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* UBICACIÓN ACTUAL */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-0.5">Ubicación Actual</p>
            <p className="text-sm font-bold text-slate-200">{selectedObra?.nombre || 'Obra no seleccionada'}</p>
          </div>
        </div>

        {/* DESCRIPCIÓN */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Descripción General *</label>
          <input type="text" required
            placeholder={tipo === 'material' ? 'Ej: Materiales para losa' : 'Ej: Plomero baño principal'}
            value={descripcion} onChange={e => setDescripcion(e.target.value)}
            className="w-full p-4 rounded-xl glass-input font-medium" />
        </div>

        {/* PROVEEDOR + MONTO (solo para tipo pago) */}
        {tipo === 'pago' && (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Proveedor / Contratista *</label>
              <input type="text" required
                placeholder="Ej: Juan Pérez (Electricista)"
                value={proveedor} onChange={e => setProveedor(e.target.value)}
                className="w-full p-4 rounded-xl glass-input font-medium" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Monto *</label>
                <input type="number" step="0.01" required
                  placeholder="200000"
                  value={monto} onChange={e => setMonto(e.target.value)}
                  className="w-full p-4 rounded-xl glass-input font-medium text-lg" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Moneda</label>
                <div className="flex gap-2">
                  {['ARS', 'USD'].map(m => (
                    <button key={m} type="button" onClick={() => setMoneda(m)}
                      className="flex-1 py-4 rounded-xl text-sm font-bold transition-all active:scale-95"
                      style={{
                        background: moneda === m ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.03)',
                        border: `2px solid ${moneda === m ? '#34d399' : 'rgba(255,255,255,0.06)'}`,
                        color: moneda === m ? '#34d399' : '#475569',
                      }}>{m}</button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ITEMS (solo para material/servicio) */}
        {tipo !== 'pago' && <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {tipo === 'material' ? 'Lista de Materiales' : 'Detalle del Servicio'}
            </label>
            <button type="button" onClick={addItem}
              className="flex items-center gap-1 text-xs font-bold active:opacity-70"
              style={{ color: tipoActual?.color }}>
              <Plus size={14} /> Agregar
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="rounded-2xl p-3 space-y-2"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {/* Descripción — textarea multilinea */}
                <textarea
                  placeholder={tipo === 'material' ? 'Ej: Hierro 8mm corrugado, Cemento Portland...' : 'Descripción de la tarea o servicio...'}
                  value={item.descripcion}
                  onChange={e => updateItem(i, 'descripcion', e.target.value)}
                  rows={2}
                  className="w-full p-3 rounded-xl glass-input text-sm resize-none"
                  style={{ lineHeight: '1.5' }}
                />
                {/* Cantidad y Unidad — solo para materiales */}
                {tipo === 'material' && (
                  <div className="flex gap-2 items-center">
                    <input type="text" placeholder="Cantidad"
                      value={item.cantidad} onChange={e => updateItem(i, 'cantidad', e.target.value)}
                      className="flex-1 p-3 rounded-xl glass-input text-sm text-center" />
                    <input type="text" placeholder="Unidad (m, kg, u...)"
                      value={item.unidad} onChange={e => updateItem(i, 'unidad', e.target.value)}
                      className="flex-1 p-3 rounded-xl glass-input text-sm text-center" />
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} className="p-2 text-slate-600 active:text-rose-400 flex-shrink-0">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )}
                {/* Botón quitar para servicios */}
                {tipo === 'servicio' && items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)}
                    className="w-full py-1.5 text-xs font-bold text-rose-400/70 active:text-rose-400">
                    — Quitar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>}

        {/* URGENCIA */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Urgencia</label>
          <div className="flex gap-3">
            {URGENCIAS.map(u => (
              <button key={u.id} type="button" onClick={() => setUrgencia(u.id)}
                className="flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                style={{
                  background: urgencia === u.id ? `${u.color}20` : 'rgba(255,255,255,0.03)',
                  border: `2px solid ${urgencia === u.id ? u.color : 'rgba(255,255,255,0.06)'}`,
                  color: urgencia === u.id ? u.color : '#475569',
                }}>
                {u.label}
              </button>
            ))}
          </div>
        </div>

        {/* FOTO REFERENCIA */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Foto de Referencia (Opcional)</label>
          {fotoPreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-[4/3] bg-black">
              <img src={fotoPreview} alt="Ref" className="w-full h-full object-cover" />
              <button type="button" onClick={() => { setFoto(null); setFotoPreview(null); }}
                className="absolute top-3 right-3 bg-black/60 backdrop-blur text-white p-2 rounded-full">
                <X size={18} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full py-5 rounded-2xl flex items-center justify-center gap-3 border-2 border-dashed active:opacity-70"
              style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
              <Camera size={22} className="text-slate-500" />
              <span className="text-sm font-bold text-slate-500">Agregar foto</span>
            </button>
          )}
          <input type="file" accept="image/*" capture="environment" ref={fileRef} className="hidden" onChange={handleFoto} />
        </div>

        {/* NOTA */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nota Adicional (Opcional)</label>
          <textarea rows={2} placeholder="Contexto, instrucciones especiales..."
            value={nota} onChange={e => setNota(e.target.value)}
            className="w-full p-4 rounded-xl glass-input font-medium text-sm resize-none" />
        </div>

        {/* SUBMIT */}
        <div className="pt-2 pb-8">
          <button type="submit" disabled={subiendo || !obraId || !descripcion.trim()}
            className="w-full p-4 rounded-xl text-white font-black text-lg flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
            style={{ background: tipo === 'material' ? '#d97706' : '#6366f1' }}>
            {subiendo ? <Loader2 className="animate-spin" size={24} /> : <SendHorizonal size={24} />}
            {subiendo ? 'Enviando...' : 'Enviar Solicitud'}
          </button>
        </div>

      </form>
    </div>
  );
}
