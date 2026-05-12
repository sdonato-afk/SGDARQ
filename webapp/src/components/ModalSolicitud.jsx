import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db, appId } from '../config/firebase';

/**
 * Modal para que admins soliciten edición o borrado de un asiento.
 * Props:
 *   mov          — movimiento afectado
 *   tipo         — 'borrar' | 'editar'
 *   campo        — campo a editar (solo si tipo='editar')
 *   valorActual  — valor actual del campo
 *   userData     — { nombre, rol } del solicitante
 *   userUid      — uid del solicitante
 *   onClose      — fn
 */
export default function ModalSolicitud({ mov, tipo, campo, valorActual, userData, userUid, onClose }) {
  const [valorNuevo, setValorNuevo] = useState('');
  const [motivo, setMotivo]         = useState('');
  const [enviando, setEnviando]     = useState(false);
  const [enviado, setEnviado]       = useState(false);

  const handleEnviar = async () => {
    if (tipo === 'editar' && !valorNuevo.trim()) return alert('Ingresá el valor nuevo.');
    setEnviando(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'solicitudes'), {
        tipo,
        movimientoId: mov.id,
        movimientoSnapshot: {
          fecha: mov.fecha, area: mov.area, tipo: mov.tipo,
          moneda: mov.moneda, monto: mov.monto, concepto: mov.concepto || ''
        },
        campo: campo || null,
        valorActual: valorActual ?? null,
        valorNuevo: tipo === 'editar' ? valorNuevo.trim() : null,
        motivo: motivo.trim() || null,
        solicitanteUid: userUid,
        solicitanteNombre: userData?.nombre || 'Admin',
        solicitanteRol: userData?.rol || 'admin',
        estado: 'pendiente',
        createdAt: new Date().toISOString(),
      });
      setEnviado(true);
      setTimeout(onClose, 1800);
    } catch (e) {
      alert('Error al enviar: ' + e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1a2235] w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-5 flex items-center justify-between ${tipo === 'borrar' ? 'bg-rose-600/80' : 'bg-blue-600/80'}`}>
          <div>
            <h3 className="darq-h2">
              {tipo === 'borrar' ? 'Solicitar eliminación' : 'Solicitar edición'}
            </h3>
            <p className="text-[10px] text-white/60 uppercase tracking-widest mt-0.5">
              Requiere aprobación del administrador
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X size={16} className="text-white" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Datos del asiento */}
          <div className="bg-white/[0.03] rounded-xl p-3 text-[10px] font-bold space-y-1 border border-white/5">
            <p className="text-slate-400"><span className="text-slate-600">Asiento:</span> {mov.fecha} · {mov.area} · {mov.tipo}</p>
            <p className="text-slate-400"><span className="text-slate-600">Monto:</span> {mov.moneda} {Number(mov.monto).toLocaleString('es-AR')}</p>
            {mov.concepto && <p className="text-slate-400"><span className="text-slate-600">Concepto:</span> {mov.concepto}</p>}
          </div>

          {/* Campo a editar */}
          {tipo === 'editar' && (
            <div className="space-y-2">
              <p className="darq-label">
                Campo: <span className="text-blue-400">{campo}</span>
              </p>
              <p className="text-[10px] text-slate-600">Valor actual: <span className="text-slate-400 font-bold">{String(valorActual ?? '-')}</span></p>
              <label className="block darq-label mb-1">Valor nuevo</label>
              <input
                type="text"
                value={valorNuevo}
                onChange={e => setValorNuevo(e.target.value)}
                placeholder="Ingresá el nuevo valor..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          )}

          {/* Motivo (opcional) */}
          <div>
            <label className="block darq-label mb-1">
              Motivo <span className="text-slate-700 normal-case">(opcional)</span>
            </label>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="¿Por qué solicitar este cambio?"
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-white/20 transition-colors resize-none"
            />
          </div>

          {/* Botón */}
          {enviado ? (
            <div className="py-3 text-center text-[10px] font-black text-emerald-400 uppercase tracking-widest">
              ✅ Solicitud enviada
            </div>
          ) : (
            <button
              onClick={handleEnviar}
              disabled={enviando}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all
                ${tipo === 'borrar' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-blue-600 hover:bg-blue-500'} text-white disabled:opacity-50`}
            >
              <Send size={13} /> {enviando ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
