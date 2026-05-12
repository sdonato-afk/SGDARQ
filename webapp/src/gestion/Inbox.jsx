import React, { useState } from 'react';
import { Receipt, Check, Trash2, ExternalLink, Filter, Calendar } from 'lucide-react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, appId } from '../config/firebase';

export default function Inbox({ inboxTickets, onProcesar }) {
  const [filter, setFilter] = useState('pendiente'); // pendiente, aprobado, todos
  
  const handleRechazar = async (id) => {
    if (window.confirm("¿Estás seguro de que querés descartar y eliminar este ticket?")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inbox_movimientos', id));
      } catch (error) {
        console.error("Error eliminando ticket:", error);
        alert("Hubo un error al eliminar el ticket.");
      }
    }
  };

  const filteredTickets = inboxTickets.filter(t => {
    if (filter === 'todos') return true;
    return t.estado === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 italic uppercase tracking-tighter">Tickets en Espera</h2>
          <p className="text-sm font-medium text-slate-400 mt-1">
            Gastos enviados desde campo pendientes de registro contable.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/50 p-1.5 rounded-xl border border-slate-700/50">
          {['pendiente', 'aprobado', 'todos'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filter === f ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filteredTickets.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center p-12 text-center rounded-2xl border-dashed border-2 border-slate-700/50">
          <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
            <Check size={32} className="text-emerald-500/50" />
          </div>
          <h3 className="text-lg font-bold text-slate-300">No hay tickets pendientes</h3>
          <p className="text-sm text-slate-500 mt-2">¡Todo el trabajo de campo está contabilizado!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTickets.map(ticket => (
            <div key={ticket.id} className="glass-card rounded-2xl overflow-hidden flex flex-col group border border-slate-700/50 hover:border-indigo-500/50 transition-colors">
              {/* Image Preview */}
              <div className="relative aspect-[4/3] bg-black">
                <img 
                  src={ticket.fotoUrl} 
                  alt="Ticket" 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  onClick={() => window.open(ticket.fotoUrl, '_blank')}
                  style={{ cursor: 'zoom-in' }}
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-lg ${ticket.estado === 'pendiente' ? 'bg-amber-500/80 text-white' : 'bg-emerald-500/80 text-white'}`}>
                    {ticket.estado}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  <button 
                    onClick={() => window.open(ticket.fotoUrl, '_blank')}
                    className="p-2 rounded-lg bg-black/50 backdrop-blur-md text-white/80 hover:text-white transition-colors"
                    title="Abrir imagen original"
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>
                
                {/* Monto Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Monto Declarado</p>
                      <p className="text-2xl font-black text-white leading-none">
                        $ {Number(ticket.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Body */}
              <div className="p-5 flex-1 flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-200 uppercase tracking-wide truncate">
                    Obra: {ticket.obraNombre}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-2 font-medium">
                    <Calendar size={12} />
                    {new Date(ticket.createdAt).toLocaleString('es-AR')}
                  </div>
                </div>

                {(ticket.proveedor || ticket.nota) && (
                  <div className="bg-slate-800/30 rounded-xl p-3 text-xs space-y-2 border border-slate-700/30">
                    {ticket.proveedor && (
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 uppercase">Prov:</span>
                        <span className="text-slate-300 font-medium">{ticket.proveedor}</span>
                      </div>
                    )}
                    {ticket.nota && (
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 uppercase">Nota:</span>
                        <span className="text-slate-300 italic">{ticket.nota}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {ticket.estado === 'pendiente' && (
                  <div className="mt-auto grid grid-cols-2 gap-3 pt-2">
                    <button 
                      onClick={() => handleRechazar(ticket.id)}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
                    >
                      <Trash2 size={16} />
                      Descartar
                    </button>
                    <button 
                      onClick={() => onProcesar(ticket)}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/50 transition-colors"
                    >
                      <Receipt size={16} />
                      Contabilizar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
