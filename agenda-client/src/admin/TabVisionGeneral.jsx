/**
 * TabVisionGeneral.jsx — Diseño aprobado. Inline styles para colores dinámicos.
 */
import React, { useMemo, useState } from 'react';
import { CheckCircle2, RefreshCw, AlertTriangle, Clock, Banknote, CalendarDays, Activity, Filter, ChevronDown, ChevronUp, Zap, Receipt } from 'lucide-react';
import { useAgendaData }       from '../hooks/useAgendaData';
import { useAgendaAuto }       from '../hooks/useAgendaAuto';
import { useVencimientosData } from '../hooks/useVencimientosData';
import { useEventosData }      from '../hooks/useEventosData';
import { urgenciaScore }       from '../lib/prioridad';

const AREAS = ['Todas', 'Alquileres', 'Obras', 'Oficina', 'Directorio'];
const AREA_BAR = { Alquileres: '#38bdf8', Obras: '#fbbf24', Oficina: '#a78bfa', Directorio: '#60a5fa', default: '#6366f1' };

function diasHasta(s) {
  if (!s) return 999;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const f = new Date((s.length > 10 ? s.slice(0,10) : s) + 'T00:00:00'); f.setHours(0,0,0,0);
  return Math.floor((f - hoy) / 86400000);
}
const fmtARS = n => '$ ' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0 });

// ── KPI Card grande ──────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, active, numColor, bgColor, borderColor }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '16px 20px', borderRadius: 18,
      background: active ? bgColor : 'rgba(255,255,255,0.015)',
      border: `1px solid ${active ? borderColor : 'rgba(255,255,255,0.05)'}`,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 14, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.25)',
        color: active ? numColor : 'rgba(255,255,255,0.15)',
      }}>
        <Icon size={20} />
      </div>
      <div>
        <p style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
          {label}
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 42, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', color: active ? numColor : 'rgba(255,255,255,0.15)' }}>
            {value}
          </span>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.25)' }}>
            {value === 1 ? 'ítem' : 'ítems'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Divisor de sección ────────────────────────────────────────────────────────
function SectionDivider({ label, count, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <div style={{ width: 3, height: 20, borderRadius: 4, background: color, flexShrink: 0 }} />
      <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.45)' }}>
        {label}
      </p>
      <span style={{
        fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.3)',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
        padding: '2px 8px', borderRadius: 8,
      }}>{count}</span>
    </div>
  );
}

// ── ItemCard espaciosa ────────────────────────────────────────────────────────
function ItemCard({ item, onResolver, onPagar, onCompletar }) {
  const [hovered, setHovered] = useState(false);
  const isVencido = item.dias < 0;
  const isHoy     = item.dias === 0;
  const bar       = isVencido ? '#f87171' : isHoy ? '#fbbf24' : (AREA_BAR[item.area] || AREA_BAR.default);
  const OriginIcon = item.origen === 'vencimiento' ? Banknote : item.origen === 'ticket_inbox' ? Receipt : item.origen === 'evento' ? CalendarDays : item.origen === 'agenda_auto' ? RefreshCw : Activity;

  const daysBadge = isVencido
    ? { bg: 'rgba(248,113,113,0.15)', color: '#f87171', text: `Hace ${Math.abs(item.dias)}d` }
    : isHoy
    ? { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', text: 'Hoy' }
    : { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', text: item.dias === 1 ? 'Mañana' : `${item.dias}d` };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', borderRadius: 16, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minHeight: 64,
        background: isVencido ? 'rgba(220,38,38,0.07)' : hovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${isVencido ? 'rgba(248,113,113,0.25)' : isHoy ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.07)'}`,
        transition: 'all 0.15s',
      }}>
      {/* Accent bar */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: bar, borderRadius: '16px 0 0 16px' }} />

      {/* Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px 12px 20px', flex: 1, minWidth: 0 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: isVencido ? '#fecaca' : 'rgba(255,255,255,0.92)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.titulo}
            </p>
            <span style={{
              fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em',
              padding: '2px 6px', borderRadius: 6,
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc',
              display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
            }}>
              <OriginIcon size={8} />{item.area}
            </span>
          </div>
          <p style={{ fontSize: 10, color: isVencido ? 'rgba(248,113,113,0.55)' : 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>
            {item.descripcion}
          </p>
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 12px 8px', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 900, padding: '4px 10px', borderRadius: 10, background: daysBadge.bg, color: daysBadge.color }}>
          {daysBadge.text}
        </span>
        {item.monto > 0 && (
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 700, color: '#34d399', letterSpacing: '-0.02em' }}>
            {fmtARS(item.monto)}
          </span>
        )}
        <div style={{ display: 'flex', gap: 6, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
          {item.origen === 'agenda_manual' && <button onClick={() => onResolver(item.raw.id)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(52,211,153,0.3)', background: 'transparent', color: '#34d399', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={14}/></button>}
          {item.origen === 'vencimiento'   && <button onClick={() => onPagar(item.raw.id, item.raw)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(52,211,153,0.3)', background: 'transparent', color: '#34d399', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={14}/></button>}
          {item.origen === 'evento'         && <button onClick={() => onCompletar(item.raw.id)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(99,102,241,0.3)', background: 'transparent', color: '#818cf8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={14}/></button>}
        </div>
      </div>
    </div>
  );
}

// ── GroupCard ─────────────────────────────────────────────────────────────────
function GroupCard({ titulo, items, onResolver, onPagar, onCompletar }) {
  const [open, setOpen] = useState(false);
  const bar   = AREA_BAR[items[0]?.area] || AREA_BAR.default;
  const total = items.reduce((s, i) => s + (i.monto || 0), 0);
  return (
    <div style={{ borderRadius: 18, overflow: 'hidden', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: bar, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>{items.length}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 3 }}>{titulo}</p>
          {total > 0 && <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'rgba(52,211,153,0.7)', fontStyle: 'italic' }}>{fmtARS(total)} total</p>}
        </div>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>{open ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}</span>
      </button>
      <div style={{ height: 1, background: bar, opacity: 0.3 }} />
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
          {items.map(i => <ItemCard key={i.id} item={i} onResolver={onResolver} onPagar={onPagar} onCompletar={onCompletar}/>)}
        </div>
      )}
    </div>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────
export default function TabVisionGeneral() {
  const { items: manuales,    loading: loadM, resolverItem }    = useAgendaData();
  const { items: automaticos, loading: loadA }                  = useAgendaAuto();
  const { vencimientos,       loading: loadV, marcarPagado }    = useVencimientosData();
  const { eventos,            loading: loadE, completarEvento } = useEventosData();

  const masterList = useMemo(() => {
    const list = [];
    [...manuales, ...automaticos].forEach(i => {
      const d = diasHasta(i.fechaVencimiento);
      list.push({ id: i.id, origen: i.tipo === 'automatica' ? 'agenda_auto' : 'agenda_manual',
        titulo: i.titulo, descripcion: i.descripcion || `Prioridad: ${i.prioridad}`,
        area: i.area || 'Oficina', monto: i.montoPotencial || 0, raw: i,
        dias: d === 999 ? (i.prioridad === 'critica' ? 0 : i.prioridad === 'alta' ? 2 : 10) : d,
        score: urgenciaScore(i),
      });
    });
    vencimientos.filter(v => !v.pagado && !v.autoPagado).forEach(v => {
      const d = diasHasta(v.fecha);
      list.push({ id: v.id, origen: v.esTicketInbox ? 'ticket_inbox' : 'vencimiento', titulo: v.concepto,
        descripcion: v.esTicketInbox ? `Ticket subido por Jefe de Obra · ${v.proveedorNombre}` : `${v.categoria}${v.periodicidad && v.periodicidad !== 'unica' ? ' · ↻ ' + v.periodicidad : ''}`,
        area: v.esTicketInbox ? 'Obras' : 'Oficina', dias: d, monto: v.monto || 0, raw: v,
        score: d < 0 ? 100 : d === 0 ? 90 : d <= 3 ? 70 : 30,
      });
    });
    eventos.filter(e => !e.completado).forEach(e => {
      const d = diasHasta(e.fechaHora);
      list.push({ id: e.id, origen: 'evento', titulo: e.titulo,
        descripcion: `${e.fechaHora?.slice(11,16)}hs${e.lugar ? ` · ${e.lugar}` : ''}`,
        area: 'Oficina', dias: d, monto: 0, raw: e,
        score: d < 0 ? 95 : d === 0 ? 85 : d <= 2 ? 65 : 25,
      });
    });
    return list.sort((a, b) => { if (a.dias < 0 && b.dias >= 0) return -1; if (b.dias < 0 && a.dias >= 0) return 1; return a.dias !== b.dias ? a.dias - b.dias : b.score - a.score; });
  }, [manuales, automaticos, vencimientos, eventos]);

  const criticos = masterList.filter(i => i.dias <= 0);
  const semana   = masterList.filter(i => i.dias > 0 && i.dias <= 7);
  const futuro   = masterList.filter(i => i.dias > 7);

  const semanaGrupos = useMemo(() => {
    const g = {};
    semana.forEach(i => { if (!g[i.titulo]) g[i.titulo] = []; g[i.titulo].push(i); });
    return Object.entries(g);
  }, [semana]);

  if (loadM || loadA || loadV || loadE) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, gap: 10, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
      <RefreshCw size={16} className="animate-spin" style={{ color: '#818cf8' }}/> Sincronizando...
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 64, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 16, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={20} style={{ color: '#818cf8' }}/>
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.03em', color: '#fff', lineHeight: 1 }}>
              Radar de Tareas
            </h1>
            <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
              Control de tráfico unificado
            </p>
          </div>
        </div>

      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
        <KpiCard label="Críticos" value={criticos.length} icon={AlertTriangle}
          active={criticos.length > 0} numColor="#f87171"
          bgColor="rgba(239,68,68,0.07)" borderColor="rgba(248,113,113,0.25)" />
        <KpiCard label="Esta semana" value={semana.length} icon={Clock}
          active={semana.length > 0} numColor="#fbbf24"
          bgColor="rgba(245,158,11,0.07)" borderColor="rgba(251,191,36,0.25)" />
        <KpiCard label="Más adelante" value={futuro.length} icon={CalendarDays}
          active={futuro.length > 0} numColor="#818cf8"
          bgColor="rgba(99,102,241,0.07)" borderColor="rgba(129,140,248,0.25)" />
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      {masterList.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', background: 'rgba(255,255,255,0.015)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.04)', gap: 12 }}>
          <CheckCircle2 size={48} style={{ color: 'rgba(99,102,241,0.2)' }}/>
          <p style={{ fontSize: 15, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>Todo despejado</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 24, alignItems: 'start' }}>

          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {criticos.length > 0 && (
              <section>
                <SectionDivider label="Hoy / Atrasado" count={criticos.length} color="#f87171"/>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                  {criticos.map(i => <ItemCard key={i.id} item={i} onResolver={resolverItem} onPagar={marcarPagado} onCompletar={completarEvento}/>)}
                </div>
              </section>
            )}
            {futuro.length > 0 && (
              <section>
                <SectionDivider label="Más adelante" count={futuro.length} color="#818cf8"/>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                  {futuro.map(i => <ItemCard key={i.id} item={i} onResolver={resolverItem} onPagar={marcarPagado} onCompletar={completarEvento}/>)}
                </div>
              </section>
            )}
          </div>

          {/* RIGHT */}
          <div>
            {semana.length > 0 ? (
              <section>
                <SectionDivider label="Esta semana" count={semana.length} color="#fbbf24"/>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                  {semanaGrupos.map(([titulo, group]) =>
                    group.length === 1
                      ? <ItemCard key={group[0].id} item={group[0]} onResolver={resolverItem} onPagar={marcarPagado} onCompletar={completarEvento}/>
                      : <GroupCard key={titulo} titulo={titulo} items={group} onResolver={resolverItem} onPagar={marcarPagado} onCompletar={completarEvento}/>
                  )}
                </div>
              </section>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.04)', gap: 10 }}>
                <CheckCircle2 size={28} style={{ color: 'rgba(255,255,255,0.1)' }}/>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>Sin vencimientos esta semana</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
