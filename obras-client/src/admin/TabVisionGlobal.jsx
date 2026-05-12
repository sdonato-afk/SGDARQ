import React from 'react';
import {
  Package, ClipboardList, TrendingUp,
  AlertTriangle, CheckCircle, ArrowRight, Loader
} from 'lucide-react';
import { useGlobalPendientes } from '../hooks/useGlobalPendientes';

// ── Pill de indicador ─────────────────────────────────────────────
function Pill({ icon: Icon, label, count, color, onClick }) {
  if (!count) return null;
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '2px 6px', borderRadius: 6, cursor: onClick ? 'pointer' : 'default',
      background: `${color}15`, border: `1px solid ${color}40`,
      color, fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em',
      transition: 'all 0.1s',
    }}
    >
      <Icon size={8} strokeWidth={3} />
      {count} {label}
    </button>
  );
}

// ── Card de una obra ──────────────────────────────────────────────
function ObraCard({ obra, pendientes, onNavigate }) {
  const reqs   = pendientes?.reqs       || [];
  const certs  = pendientes?.certs      || [];
  const hons   = pendientes?.honorarios || [];
  const urgentes = reqs.filter(r => r.urgencia === 'urgente');
  const sinAtender = reqs.filter(r => r.estado === 'pendiente');

  const tieneAlgo = reqs.length + certs.length + hons.length > 0;

  const estadoColor =
    urgentes.length > 0   ? '#f87171' : // Red
    sinAtender.length > 0 ? '#fbbf24' : // Amber
    tieneAlgo             ? '#38bdf8' : // Light Blue
    '#34d399';                          // Emerald

  return (
    <div style={{
      background: 'rgba(10, 13, 24, 0.4)',
      border: `1px solid ${tieneAlgo ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}`,
      borderLeft: `3px solid ${estadoColor}`,
      borderRadius: 8, padding: '10px 14px',
      display: 'flex', flexDirection: 'column', gap: 6,
      transition: 'all 0.2s', cursor: 'pointer'
    }}
    onClick={() => onNavigate(obra.id, 'requerimientos')}
    onMouseEnter={e => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = 'rgba(10, 13, 24, 0.4)';
      e.currentTarget.style.borderColor = tieneAlgo ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)';
    }}
    >
      {/* Header Compacto */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: estadoColor, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {obra.nombre}
          </span>
        </div>
        <span style={{ fontSize: 9, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
          {obra.estado}
        </span>
      </div>

      {/* Indicadores Compactos */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, minHeight: 20, alignItems: 'center' }}>
        {!tieneAlgo && (
          <span style={{ fontSize: 10, fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <CheckCircle size={12} strokeWidth={2.5} /> Todo al día
          </span>
        )}
        {urgentes.length > 0 && <Pill icon={AlertTriangle} label="URG." count={urgentes.length} color="#f87171" />}
        {sinAtender.length > 0 && <Pill icon={Package} label="reqs." count={sinAtender.length} color="#fbbf24" />}
        {reqs.filter(r => r.estado === 'comprado').length > 0 && <Pill icon={Package} label="entregas" count={reqs.filter(r => r.estado === 'comprado').length} color="#38bdf8" />}
        {certs.length > 0 && <Pill icon={ClipboardList} label="certs." count={certs.length} color="#818cf8" />}
        {hons.length > 0 && <Pill icon={TrendingUp} label="hons." count={hons.length} color="#a78bfa" />}
      </div>
    </div>
  );
}

// ── KPI global ────────────────────────────────────────────────────
function GlobalKPI({ label, value, color, icon: Icon }) {
  return (
    <div style={{
      background: 'rgba(10, 13, 24, 0.6)', 
      border: `1px solid ${color}30`,
      borderRadius: 24, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)', backdropFilter: 'blur(16px)',
      position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: `${color}20`, borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none', marginTop: -20, marginRight: -20 }} />
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `${color}15`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 12px ${color}20`, position: 'relative', zIndex: 10
      }}>
        <Icon size={20} color={color} strokeWidth={2.5} />
      </div>
      <div style={{ position: 'relative', zIndex: 10 }}>
        <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1, letterSpacing: '-0.03em' }}>{value}</div>
        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      </div>
    </div>
  );
}

// ── Tab principal ─────────────────────────────────────────────────
export default function TabVisionGlobal({ obras, onNavigate }) {
  const { byObra, totales, loading } = useGlobalPendientes();

  const obrasActivas = obras.filter(o => o.estado !== 'Finalizada');
  // Obras con algo pendiente primero, luego las limpias
  const obrasSorted = [...obrasActivas].sort((a, b) => {
    const pA = byObra[a.id];
    const pB = byObra[b.id];
    const countA = (pA?.reqs?.length || 0) + (pA?.certs?.length || 0) + (pA?.honorarios?.length || 0);
    const countB = (pB?.reqs?.length || 0) + (pB?.certs?.length || 0) + (pB?.honorarios?.length || 0);
    // Urgentes al tope
    const urgA = pA?.reqs?.filter(r => r.urgencia === 'urgente').length || 0;
    const urgB = pB?.reqs?.filter(r => r.urgencia === 'urgente').length || 0;
    if (urgB !== urgA) return urgB - urgA;
    return countB - countA;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12, color: '#475569' }}>
        <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sincronizando Módulos…</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>

      {/* Hero Title */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.04em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          Panel de Control <span style={{ color: '#6366f1' }}>Global</span>
        </h2>
        <p style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>
          Monitoreo en tiempo real de requerimientos y finanzas en todas las obras activas.
        </p>
      </div>

      {/* KPIs globales en 2 columnas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, marginBottom: 40 }}>
        <GlobalKPI icon={Package}       label="Reqs. activos"      value={totales.reqs}       color="#fbbf24" />
        <GlobalKPI icon={AlertTriangle} label="Urgentes"           value={totales.urgentes}   color="#f87171" />
        <GlobalKPI icon={ClipboardList} label="Certs. sin cobrar"  value={totales.certs}      color="#818cf8" />
        <GlobalKPI icon={TrendingUp}    label="Honor. pendientes"  value={totales.honorarios} color="#a78bfa" />
      </div>

      {/* Obras */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 10px #6366f1' }} />
          {obrasActivas.length} Obras en Curso
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {obrasSorted.map(obra => (
          <ObraCard
            key={obra.id}
            obra={obra}
            pendientes={byObra[obra.id]}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      {obrasActivas.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', marginTop: 20 }}>
          <Package size={48} color="#475569" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <div style={{ color: '#94a3b8', fontSize: 15, fontWeight: 600 }}>No hay obras activas registradas.</div>
          <div style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>Creá una nueva obra desde el módulo principal.</div>
        </div>
      )}
    </div>
  );
}

