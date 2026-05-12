import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../../../config/firebase';
import { X, History, ArrowRight } from 'lucide-react';

export default function PanelHistorial({ open, onClose }) {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'movimientos_historial'),
      orderBy('fechaCambio', 'desc'),
      limit(50)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      setHistorial(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-end animate-in fade-in duration-200">
      <div className="bg-[#0f172a] w-full max-w-xl h-full border-l border-white/10 shadow-2xl flex flex-col slide-in-from-right-full animate-in duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 bg-black/40 border-b border-white/10 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <History size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-widest uppercase">Historial de Cambios</h3>
              <p className="text-[10px] text-slate-500 uppercase font-bold mt-0.5">Últimos 50 registros modificados</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
          ) : historial.length === 0 ? (
            <p className="text-center text-sm text-slate-500 font-bold py-10">No hay registros en el historial.</p>
          ) : (
            historial.map(record => {
              const ant = record.estadoAnterior || {};
              const nue = record.estadoNuevo || {};
              
              // Find changed keys
              const changedKeys = [];
              const allKeys = new Set([...Object.keys(ant), ...Object.keys(nue)]);
              allKeys.forEach(k => {
                if (k !== 'updatedAt' && k !== 'createdAt' && String(ant[k]) !== String(nue[k])) {
                  changedKeys.push(k);
                }
              });

              return (
                <div key={record.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:bg-white/[0.04] transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                        {new Date(record.fechaCambio).toLocaleString('es-AR')}
                      </p>
                      <p className="text-xs font-bold text-slate-300">
                        {nue.concepto || ant.concepto || 'Sin Concepto'}
                      </p>
                    </div>
                    <span className="text-[9px] font-black bg-white/10 text-white/60 px-2 py-1 rounded-md">ID: {record.movimientoId?.slice(0,6)}...</span>
                  </div>
                  
                  {changedKeys.length > 0 ? (
                    <div className="space-y-2 mt-3 bg-black/40 rounded-xl p-3 border border-white/[0.02]">
                      {changedKeys.map(k => (
                        <div key={k} className="flex items-center gap-2 text-[11px]">
                          <span className="font-bold text-slate-500 w-24 text-right">{k}:</span>
                          <span className="text-rose-300/80 line-through truncate max-w-[120px]">{String(ant[k] || 'null')}</span>
                          <ArrowRight size={10} className="text-slate-600" />
                          <span className="text-emerald-400 truncate max-w-[120px]">{String(nue[k] || 'null')}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 italic mt-2">Guardado sin cambios detectables.</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
