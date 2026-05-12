import React from 'react';
import { Camera, CheckCircle2, Clock } from 'lucide-react';

export default function InboxTickets({ tickets, onContabilizar }) {
  const pending = tickets.filter(t => t.estado === 'pendiente');

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Reciente';
    try {
      const d = timestamp.toDate();
      return d.toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Reciente';
    }
  };

  return (
    <div className="animate-fade-in p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Camera className="text-indigo-400" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-100">Inbox Tickets</h1>
          <p className="text-slate-400 font-medium">Comprobantes subidos desde campo pendientes de carga contable.</p>
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 glass-panel rounded-3xl text-center border border-white/5 shadow-2xl">
          <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={48} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-100 mb-2">Bandeja Vacía</h2>
          <p className="text-slate-400 max-w-sm">No hay tickets pendientes de carga. Los Jefes de Obra no han enviado comprobantes nuevos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {pending.map(ticket => (
            <div key={ticket.id} className="glass-panel rounded-2xl overflow-hidden flex flex-col hover:border-indigo-500/40 transition-all hover:-translate-y-1 shadow-lg shadow-black/20 group">
              <div className="relative aspect-video bg-[#0f172a] overflow-hidden">
                <img 
                  src={ticket.fotoUrl} 
                  alt="Ticket" 
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
                />
                <div className="absolute top-3 right-3 bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 backdrop-blur-md border border-amber-500/30 shadow-lg">
                  <Clock size={12} /> Pendiente
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col relative z-10">
                <div className="flex justify-between items-start mb-3 gap-3">
                  <h3 className="font-bold text-slate-100 truncate flex-1 text-sm">{ticket.obraNombre || 'Obra Desconocida'}</h3>
                  <span className="font-black text-emerald-400 whitespace-nowrap bg-emerald-500/10 px-2 py-1 rounded-lg text-sm border border-emerald-500/20">
                    $ {ticket.monto?.toLocaleString('es-AR')}
                  </span>
                </div>
                
                {ticket.proveedor && (
                  <p className="text-xs text-slate-400 truncate mb-1.5 font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                    {ticket.proveedor}
                  </p>
                )}
                
                {ticket.nota && (
                  <p className="text-xs text-slate-500 truncate italic mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                    "{ticket.nota}"
                  </p>
                )}
                
                <div className="mt-auto pt-5 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">
                    {formatDate(ticket.createdAt)}
                  </span>
                  <button 
                    onClick={() => onContabilizar(ticket)}
                    className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                  >
                    Contabilizar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
