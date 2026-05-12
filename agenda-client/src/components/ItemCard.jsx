/**
 * ItemCard.jsx
 * Card individual de ítem de agenda (tarea manual o automática).
 * Usa exclusivamente el Design System (@darq/ui + tokens Tailwind).
 */
import React from 'react';
import { CheckCircle2, Clock, Zap, Building2, Home, Briefcase, Users } from 'lucide-react';

const AREA_ICON  = { Obras: Building2, Alquileres: Home, Oficina: Briefcase, Directorio: Users };

const AREA_THEME = {
  Obras:      { pill: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   bar: 'bg-amber-400' },
  Alquileres: { pill: 'bg-sky-500/10 text-sky-400 border-sky-500/20',         bar: 'bg-sky-400' },
  Oficina:    { pill: 'bg-violet-500/10 text-violet-400 border-violet-500/20', bar: 'bg-violet-400' },
  Directorio: { pill: 'bg-rose-500/10 text-rose-400 border-rose-500/20',       bar: 'bg-rose-400' },
  default:    { pill: 'bg-white/5 text-white/40 border-white/10',              bar: 'bg-white/20' },
};

const PRIO_BADGE = {
  critica: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  alta:    'bg-amber-500/15 text-amber-300 border-amber-500/30',
  normal:  'bg-white/[0.04] text-white/30 border-white/10',
};

export default function ItemCard({ item, onResolver }) {
  const Icon  = AREA_ICON[item.area] || Briefcase;
  const theme = AREA_THEME[item.area] || AREA_THEME.default;
  const esAuto = item.tipo === 'automatica';

  return (
    <div className="relative rounded-2xl border border-white/[0.07] bg-black/20 backdrop-blur-sm overflow-hidden flex flex-col gap-3 p-5 transition-all hover:bg-white/[0.03] hover:border-white/[0.12] hover:shadow-xl hover:shadow-black/30">

      {/* Accent bar — top */}
      <div className={`absolute top-0 left-0 right-0 h-px opacity-40 ${theme.bar}`} />

      {/* Header: área + prioridad */}
      <div className="flex items-start justify-between gap-2">
        <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${theme.pill}`}>
          <Icon size={10} />
          {item.area}
          {esAuto && (
            <span className="ml-1 text-[9px] font-black uppercase tracking-widest text-white/30 bg-white/[0.06] px-1.5 py-0.5 rounded-md border border-white/10">
              auto
            </span>
          )}
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border shrink-0 ${PRIO_BADGE[item.prioridad] || PRIO_BADGE.normal}`}>
          {item.prioridad}
        </span>
      </div>

      {/* Título y descripción */}
      <div className="flex-1">
        <p className="text-sm font-bold text-white/95 leading-snug">{item.titulo}</p>
        {item.descripcion && (
          <p className="text-[11px] text-white/40 mt-1.5 leading-relaxed">{item.descripcion}</p>
        )}
      </div>

      {/* Footer: fecha + monto + responsable + acción */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.05]">
        <div className="flex items-center gap-3">
          {item.fechaVencimiento && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-white/35">
              <Clock size={11} className="text-white/25"/>
              {item.fechaVencimiento}
            </span>
          )}
          {item.montoPotencial > 0 && (
            <span className="font-mono text-[11px] italic text-emerald-400/70 bg-emerald-500/[0.06] px-2 py-0.5 rounded-lg border border-emerald-500/15">
              ${item.montoPotencial.toLocaleString('es-AR')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {item.responsable && item.responsable !== 'General' && (
            <span className="text-[10px] font-black uppercase tracking-widest text-white/25 bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/10">
              {item.responsable}
            </span>
          )}
          {!esAuto && onResolver && (
            <button
              onClick={() => onResolver(item.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-emerald-400 hover:bg-emerald-400/10 border border-transparent hover:border-emerald-400/20 transition-all"
              title="Marcar como resuelta"
            >
              <CheckCircle2 size={14}/>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
