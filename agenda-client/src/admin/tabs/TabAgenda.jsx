/**
 * TabAgenda.jsx — Diseño Kanban aprobado con inline styles.
 */
import React, { useState, useMemo } from 'react';
import { Plus, RefreshCw, Zap, ChevronDown, ChevronUp, Filter, Activity, CheckCircle2 } from 'lucide-react';
import { useAgendaData }   from '../../hooks/useAgendaData';
import { useAgendaAuto }   from '../../hooks/useAgendaAuto';
import { columnaItem, urgenciaScore } from '../../lib/prioridad';
import ModalNuevaTarea     from '../../components/ModalNuevaTarea';

const AREAS = ['Todas', 'Obras', 'Alquileres', 'Oficina', 'Directorio'];
const AREA_BAR = { Alquileres: '#38bdf8', Obras: '#fbbf24', Oficina: '#a78bfa', Directorio: '#60a5fa', default: '#6366f1' };

const COL_CONFIG = [
  { id: 'urgente',   label: 'Urgente',     sub: 'Vence en ≤ 3 días o crítica', border: 'rgba(248,113,113,0.2)', bg: 'rgba(239,68,68,0.03)',  accent: '#f87171' },
  { id: 'semana',    label: 'Esta semana', sub: '4 – 7 días',                  border: 'rgba(251,191,36,0.2)',  bg: 'rgba(245,158,11,0.03)', accent: '#fbbf24' },
  { id: 'pendiente', label: 'Pendiente',   sub: 'Sin fecha o a futuro',        border: 'rgba(255,255,255,0.08)',bg: 'rgba(255,255,255,0.01)',accent: '#64748b' },
];

function diasHasta(s) {
  if (!s) return 999;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const f = new Date((s.length > 10 ? s.slice(0,10) : s) + 'T00:00:00'); f.setHours(0,0,0,0);
  return Math.floor((f - hoy) / 86400000);
}
const fmtARS = n => '$ ' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0 });

// ── ItemCard ──────────────────────────────────────────────────────────────
function ItemCard({ item, onResolver }) {
  const [hovered, setHovered] = useState(false);
  const d = diasHasta(item.fechaVencimiento);
  const dias = d === 999 ? (item.prioridad === 'critica' ? 0 : item.prioridad === 'alta' ? 2 : 10) : d;
  
  const isVencido = dias < 0;
  const isHoy     = dias === 0;
  const bar       = isVencido ? '#f87171' : isHoy ? '#fbbf24' : (AREA_BAR[item.area] || AREA_BAR.default);

  const daysBadge = isVencido
    ? { bg: 'rgba(248,113,113,0.15)', color: '#f87171', text: `Hace ${Math.abs(dias)}d` }
    : isHoy
    ? { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', text: 'Hoy' }
    : { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', text: dias === 1 ? 'Mañana' : `${dias}d` };

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
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: bar, borderRadius: '16px 0 0 16px' }} />
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
              {item.tipo === 'automatica' ? <RefreshCw size={8}/> : <Activity size={8}/>} {item.area}
            </span>
          </div>
          <p style={{ fontSize: 10, color: isVencido ? 'rgba(248,113,113,0.55)' : 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>
            {item.descripcion || `Prioridad: ${item.prioridad}`}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 12px 8px', flexShrink: 0 }}>
        {dias !== 999 && (
          <span style={{ fontSize: 10, fontWeight: 900, padding: '4px 10px', borderRadius: 10, background: daysBadge.bg, color: daysBadge.color, whiteSpace: 'nowrap' }}>
            {daysBadge.text}
          </span>
        )}
        {item.montoPotencial > 0 && (
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 700, color: '#34d399', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
            {fmtARS(item.montoPotencial)}
          </span>
        )}
        <div style={{ display: 'flex', gap: 6, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
          {onResolver && (
            <button onClick={() => onResolver(item.id)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(52,211,153,0.3)', background: 'transparent', color: '#34d399', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={14}/>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── GroupCard ─────────────────────────────────────────────────────────────
function GroupCard({ titulo, items, onResolver }) {
  const [open, setOpen] = useState(false);
  const bar   = AREA_BAR[items[0]?.area] || AREA_BAR.default;
  const total = items.reduce((s, i) => s + (i.montoPotencial || 0), 0);
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: bar, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>{items.length}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 2 }}>{titulo}</p>
          {total > 0 && <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(52,211,153,0.7)', fontStyle: 'italic' }}>{fmtARS(total)} total</p>}
        </div>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>{open ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</span>
      </button>
      <div style={{ height: 1, background: bar, opacity: 0.3 }} />
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10 }}>
          {items.map(i => <ItemCard key={i.id} item={i} onResolver={i.tipo === 'manual' ? onResolver : null}/>)}
        </div>
      )}
    </div>
  );
}

// ── Shell ──────────────────────────────────────────────────────────────────
export default function TabAgenda() {
  const { items: manuales, loading: loadM, agregarItem, resolverItem } = useAgendaData();
  const { items: automaticos, loading: loadA }                         = useAgendaAuto();
  const [modalOpen,  setModalOpen]  = useState(false);
  const [filtroArea, setFiltroArea] = useState('Todas');
  const [soloAuto,   setSoloAuto]   = useState(false);
  const loading = loadM || loadA;

  const todos = useMemo(() => {
    return [...manuales, ...automaticos]
      .filter(i => filtroArea === 'Todas' || i.area === filtroArea)
      .filter(i => !soloAuto || i.tipo === 'automatica')
      .sort((a, b) => urgenciaScore(b) - urgenciaScore(a));
  }, [manuales, automaticos, filtroArea, soloAuto]);

  const byCol = (colId) => todos.filter(i => columnaItem(i) === colId);

  const renderColItems = (colId, items) => {
    if (colId !== 'pendiente') {
      return items.map(item => (
        <ItemCard key={item.id} item={item} onResolver={item.tipo === 'manual' ? resolverItem : null}/>
      ));
    }
    const groups = {};
    items.forEach(i => { if (!groups[i.titulo]) groups[i.titulo] = []; groups[i.titulo].push(i); });
    return Object.entries(groups).map(([titulo, group]) =>
      group.length === 1
        ? <ItemCard key={group[0].id} item={group[0]} onResolver={group[0].tipo === 'manual' ? resolverItem : null}/>
        : <GroupCard key={titulo} titulo={titulo} items={group} onResolver={resolverItem}/>
    );
  };

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
              Agenda de Gestión
            </h1>
            <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
              Tablero de tareas
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Filtro área */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <Filter size={10}/> Área:
            </span>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 14, gap: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
              {AREAS.map(a => (
                <button key={a} onClick={() => setFiltroArea(a)} style={{
                  padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em',
                  background: filtroArea === a ? '#4f46e5' : 'transparent',
                  color: filtroArea === a ? '#fff' : 'rgba(255,255,255,0.35)',
                  boxShadow: filtroArea === a ? '0 4px 16px rgba(79,70,229,0.35)' : 'none',
                  transition: 'all 0.15s',
                }}>{a}</button>
              ))}
            </div>
          </div>

          {/* Toggle Automáticas */}
          <button onClick={() => setSoloAuto(s => !s)} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 12, cursor: 'pointer',
            fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'all 0.15s',
            border: `1px solid ${soloAuto ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.07)'}`,
            background: soloAuto ? 'rgba(99,102,241,0.1)' : 'transparent',
            color: soloAuto ? '#a5b4fc' : 'rgba(255,255,255,0.35)',
            boxShadow: soloAuto ? '0 4px 16px rgba(79,70,229,0.2)' : 'none',
          }}>
            <RefreshCw size={12}/> Solo automáticas
          </button>

          <button onClick={() => setModalOpen(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8, background: '#4f46e5', color: '#fff',
            fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '10px 20px', borderRadius: 14, border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(79,70,229,0.4)', transition: 'all 0.15s',
          }}>
            <Plus size={15} strokeWidth={2.5}/> Nueva tarea
          </button>
        </div>
      </div>

      {/* ── Kanban ───────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, gap: 10, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
          <RefreshCw size={16} className="animate-spin" style={{ color: '#818cf8' }}/> Cargando agenda...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {COL_CONFIG.map(col => {
            const colItems = byCol(col.id);
            return (
              <div key={col.id} style={{ borderRadius: 24, border: `1px solid ${col.border}`, background: col.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Column header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 4, background: col.accent }}/>
                      <h2 style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.8)' }}>
                        {col.label}
                      </h2>
                    </div>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 500, marginLeft: 16 }}>{col.sub}</p>
                  </div>
                  <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'rgba(255,255,255,0.25)', background: 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                    {colItems.length}
                  </span>
                </div>

                {/* Items */}
                {colItems.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: 500 }}>
                    Sin ítems
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16 }}>
                    {renderColItems(col.id, colItems)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && <ModalNuevaTarea onGuardar={agregarItem} onClose={() => setModalOpen(false)}/>}
    </div>
  );
}
