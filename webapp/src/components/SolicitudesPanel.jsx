import React, { useState } from 'react';
import { X, Check, Trash2, Edit3, Bell, ChevronRight } from 'lucide-react';
import { doc, updateDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { db, appId } from '../config/firebase';

/**
 * Panel de notificaciones/solicitudes para superadmin.
 * Props:
 *   solicitudes   — array de docs de la colección solicitudes
 *   movimientos   — para mostrar datos del asiento original
 *   userData      — datos del superadmin que aprueba
 *   isOpen        — boolean
 *   onClose       — fn
 */
export default function SolicitudesPanel({ solicitudes, movimientos, userData, isOpen, onClose }) {
  const [procesando, setProcesando] = useState(null);

  const pendientes = solicitudes.filter(s => s.estado === 'pendiente');
  const infoItems   = solicitudes.filter(s => s.estado === 'info').slice(0, 20);
  const resueltas   = solicitudes.filter(s => s.estado !== 'pendiente' && s.estado !== 'info').slice(0, 20);

  const aprobar = async (s) => {
    setProcesando(s.id);
    try {
      if (s.entidad) {
        // Solicitud de borrado de entidad (proveedores, obras, propiedades, clientes, contratos)
        const entidadRef = doc(db, 'artifacts', appId, 'public', 'data', s.entidad, s.entidadId);
        if (s.tipo === 'borrar') {
          await deleteDoc(entidadRef);
        }
      } else if (s.movimientoId) {
        // Solicitud de movimiento (asientos)
        const movRef = doc(db, 'artifacts', appId, 'public', 'data', 'movimientos', s.movimientoId);
        if (s.tipo === 'borrar') {
          await deleteDoc(movRef);
        } else if (s.tipo === 'editar') {
          await updateDoc(movRef, { [s.campo]: s.valorNuevo, updatedAt: new Date().toISOString() });
        }
      }

      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'solicitudes', s.id), {
        estado: 'aprobada',
        resolvedAt: new Date().toISOString(),
        resolvedBy: userData?.nombre || 'superadmin',
      });
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setProcesando(null);
    }
  };

  const rechazar = async (s) => {
    setProcesando(s.id);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'solicitudes', s.id), {
        estado: 'rechazada',
        resolvedAt: new Date().toISOString(),
        resolvedBy: userData?.nombre || 'superadmin',
      });
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setProcesando(null);
    }
  };

  if (!isOpen) return null;

  const getMov = (id) => movimientos.find(m => m.id === id);

  const tipoLabel = (s) => {
    if (s.tipo === 'borrar' && s.entidad) return { label: `Borrar ${s.entidad}`, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', icon: <Trash2 size={12} /> };
    if (s.tipo === 'borrar') return { label: 'Borrar asiento', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', icon: <Trash2 size={12} /> };
    if (s.tipo === 'editar_libre') return { label: 'Edición realizada', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: <Edit3 size={12} /> };
    return { label: 'Editar campo', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: <Edit3 size={12} /> };
  };

  return (
    <div className="fixed inset-0 z-[200] flex" onClick={onClose}>
      {/* Overlay */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" />

      {/* Panel lateral derecho */}
      <div
        className="w-full max-w-md bg-[#1a2235] border-l border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell size={20} className="text-white" />
              {pendientes.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {pendientes.length}
                </span>
              )}
            </div>
            <div>
              <h2 className="darq-h2">Solicitudes</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">{pendientes.length} pendientes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">

          {pendientes.length === 0 && (
            <div className="text-center py-16">
              <Check size={32} className="text-emerald-500/30 mx-auto mb-3" />
              <p className="text-slate-600 text-xs font-black uppercase tracking-widest">Sin solicitudes pendientes</p>
            </div>
          )}

          {pendientes.map(s => {
            const mov = getMov(s.movimientoId);
            const { label, color, bg, icon } = tipoLabel(s);
            const enProceso = procesando === s.id;

            return (
              <div key={s.id} className={`border ${bg} rounded-2xl p-4 space-y-3`}>
                {/* Quién / qué */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className={`flex items-center gap-1.5 ${color} text-[10px] font-black uppercase tracking-widest mb-1`}>
                      {icon} {label}
                    </div>
                    <p className="text-xs font-black text-white">{s.solicitanteNombre}</p>
                    <p className="text-[10px] text-slate-500">{new Date(s.createdAt).toLocaleString('es-AR')}</p>
                  </div>
                  <span className="text-[10px] font-black text-slate-600 bg-white/5 px-2 py-1 rounded-lg uppercase tracking-widest whitespace-nowrap">
                    {s.solicitanteRol}
                  </span>
                </div>

                {/* Datos del asiento */}
                {mov && (
                  <div className="bg-black/20 rounded-xl p-3 text-[10px] font-bold space-y-1">
                    <p className="text-slate-400">
                      <span className="text-slate-600">Asiento:</span> {mov.fecha} · {mov.area} · {mov.tipo}
                    </p>
                    <p className="text-slate-400">
                      <span className="text-slate-600">Monto:</span> {mov.moneda} {Number(mov.monto).toLocaleString('es-AR')}
                    </p>
                    {mov.concepto && <p className="text-slate-400"><span className="text-slate-600">Concepto:</span> {mov.concepto}</p>}
                  </div>
                )}

                {/* Datos de entidad (proveedores, obras, etc.) */}
                {s.entidad && (
                  <div className="bg-black/20 rounded-xl p-3 text-[10px] font-bold space-y-1">
                    <p className="text-slate-400">
                      <span className="text-slate-600">Entidad:</span> <span className="text-amber-400 uppercase">{s.entidad}</span>
                    </p>
                    <p className="text-slate-400">
                      <span className="text-slate-600">Nombre:</span> <span className="text-white">{s.entidadNombre}</span>
                    </p>
                    {s.entidadSnapshot && Object.entries(s.entidadSnapshot).filter(([,v]) => v).map(([k, v]) => (
                      <p key={k} className="text-slate-400"><span className="text-slate-600">{k}:</span> {String(v)}</p>
                    ))}
                  </div>
                )}

                {/* Qué quiere editar */}
                {s.tipo === 'editar' && (
                  <div className="bg-blue-500/5 rounded-xl p-3 text-[10px] space-y-1">
                    <p className="text-slate-500 font-black uppercase tracking-widest">Cambio solicitado</p>
                    <p className="text-slate-400"><span className="text-slate-600">Campo:</span> <span className="text-blue-400 font-black">{s.campo}</span></p>
                    <p className="text-slate-400"><span className="text-slate-600">Valor actual:</span> {String(s.valorActual ?? '-')}</p>
                    <p className="text-slate-400"><span className="text-slate-600">Valor nuevo:</span> <span className="text-emerald-400 font-black">{String(s.valorNuevo ?? '-')}</span></p>
                    {s.motivo && <p className="text-slate-400 italic">&ldquo;{s.motivo}&rdquo;</p>}
                  </div>
                )}

                {s.tipo === 'borrar' && s.motivo && (
                  <p className="text-[10px] text-slate-500 italic">&ldquo;{s.motivo}&rdquo;</p>
                )}

                {/* Acciones */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => aprobar(s)}
                    disabled={enProceso}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    <Check size={12} /> {enProceso ? '...' : 'Aprobar'}
                  </button>
                  <button
                    onClick={() => rechazar(s)}
                    disabled={enProceso}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white/5 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    <X size={12} /> Rechazar
                  </button>
                </div>
              </div>
            );
          })}

          {/* Historial resueltas */}
          {resueltas.length > 0 && (
            <div className="pt-4">
              <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] mb-3">Historial reciente</p>
              <div className="space-y-2">
                {resueltas.map(s => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-2.5 bg-white/[0.02] rounded-xl border border-white/5">
                    <div>
                      <p className="text-[10px] font-black text-slate-400">{s.solicitanteNombre || s.solicitanteRol} · {s.tipo}</p>
                      <p className="text-[10px] text-slate-600">{new Date(s.createdAt).toLocaleDateString('es-AR')}</p>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${s.estado === 'aprobada' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {s.estado}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notificaciones informativas (ediciones libres) */}
          {infoItems.length > 0 && (
            <div className="pt-4">
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.3em] mb-3">Ediciones realizadas por admins</p>
              <div className="space-y-2">
                {infoItems.map(s => {
                  const mov = getMov(s.movimientoId);
                  return (
                    <div key={s.id} className="px-4 py-2.5 bg-emerald-500/[0.03] rounded-xl border border-emerald-500/10">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-black text-emerald-400">{s.solicitanteRol}</p>
                        <p className="text-[10px] text-slate-600">{new Date(s.createdAt).toLocaleString('es-AR')}</p>
                      </div>
                      {mov && <p className="text-[10px] text-slate-500">{mov.fecha} · {mov.area} · {mov.tipo}</p>}
                      <p className="text-[10px] text-slate-400 mt-1">
                        <span className="text-slate-600">{s.campo}:</span>{' '}
                        <span className="line-through text-rose-400/60">{s.valorAnterior || '-'}</span>
                        {' → '}
                        <span className="text-emerald-400 font-black">{s.valorNuevo || '-'}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
