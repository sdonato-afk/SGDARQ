/**
 * TabVencimientos.jsx — Diseño aprobado. Inline styles para colores dinámicos.
 */
import React, { useState } from 'react';
import { Plus, CheckCircle2, Trash2, AlertTriangle, Calendar, Clock, Pencil, RefreshCw } from 'lucide-react';
import { useVencimientosData } from '../../hooks/useVencimientosData';
import ModalNuevoVencimiento   from '../../components/ModalNuevoVencimiento';

function KpiCard({ label, value, icon: Icon, active, numColor, bgColor, borderColor }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '16px 20px', borderRadius: 18,
      background: active ? bgColor : 'rgba(255,255,255,0.015)',
      border: `1px solid ${active ? borderColor : 'rgba(255,255,255,0.05)'}`,
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)', color: active ? numColor : 'rgba(255,255,255,0.15)' }}>
        <Icon size={20}/>
      </div>
      <div>
        <p style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{label}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 42, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', color: active ? numColor : 'rgba(255,255,255,0.15)' }}>{value}</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.25)' }}>{value === 1 ? 'ítem' : 'ítems'}</span>
        </div>
      </div>
    </div>
  );
}

function SectionDivider({ label, count, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <div style={{ width: 3, height: 20, borderRadius: 4, background: color, flexShrink: 0 }}/>
      <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.45)' }}>{label}</p>
      <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', padding: '2px 8px', borderRadius: 8 }}>{count}</span>
    </div>
  );
}

function VencimientoRow({ v, onMarcar, onEditar, onEliminar }) {
  const [hovered, setHovered] = useState(false);
  const hoy       = new Date().toISOString().slice(0, 10);
  const isVencido = v.fecha < hoy;
  const dias      = Math.ceil((new Date(v.fecha) - new Date()) / 86400000);
  const fmtFecha  = f => f?.split('-').reverse().join('/');
  const fmtMonto  = v => v.monto > 0
    ? `${v.moneda === 'USD' ? 'u$d' : '$'} ${Number(v.monto).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
    : null;
  const bar = isVencido ? '#f87171' : dias <= 3 ? '#fbbf24' : '#6366f1';

  const daysBadge = isVencido
    ? { bg: 'rgba(248,113,113,0.15)', color: '#f87171', text: `Vencido hace ${Math.abs(dias)}d` }
    : dias === 0 ? { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', text: 'Hoy' }
    : dias === 1 ? { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', text: 'Mañana' }
    : { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', text: `${dias}d` };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', borderRadius: 16, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minHeight: 64,
        background: isVencido ? 'rgba(220,38,38,0.07)' : hovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${isVencido ? 'rgba(248,113,113,0.25)' : 'rgba(255,255,255,0.07)'}`,
        transition: 'all 0.15s',
      }}>
      {/* Bar lateral */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: bar }}/>

      {/* Checkbox + info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px 12px 20px', flex: 1, minWidth: 0 }}>
        <button
          onClick={() => onMarcar(v.id, v)}
          style={{
            width: 20, height: 20, borderRadius: 6, flexShrink: 0,
            border: `2px solid ${isVencido ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.2)'}`,
            background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isVencido ? '#f87171' : 'rgba(255,255,255,0.2)',
          }}
          title="Marcar como pagado">
          <CheckCircle2 size={10} strokeWidth={2.5}/>
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: isVencido ? '#fecaca' : 'rgba(255,255,255,0.92)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
            {v.concepto}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: isVencido ? 'rgba(248,113,113,0.6)' : 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{fmtFecha(v.fecha)}</span>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
            <span style={{ fontSize: 10, color: isVencido ? 'rgba(248,113,113,0.6)' : 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{v.categoria}</span>
            {v.periodicidad && v.periodicidad !== 'unica' && (
              <span style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 6px', borderRadius: 6, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                ↻ {v.periodicidad}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Derecha */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 12px 8px', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 900, padding: '4px 10px', borderRadius: 10, background: daysBadge.bg, color: daysBadge.color, whiteSpace: 'nowrap' }}>
          {daysBadge.text}
        </span>
        {fmtMonto(v) && (
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: '#34d399', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
            {fmtMonto(v)}
          </span>
        )}
        <div style={{ display: 'flex', gap: 6, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
          <button onClick={() => onEditar(v)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(99,102,241,0.3)', background: 'transparent', color: '#818cf8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={14}/></button>
          <button onClick={() => onEliminar(v.id)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(248,113,113,0.3)', background: 'transparent', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14}/></button>
        </div>
      </div>
    </div>
  );
}

export default function TabVencimientos() {
  const { vencimientos, loading, agregarVencimiento, actualizarVencimiento, marcarPagado, eliminarVencimiento } = useVencimientosData();
  const [modalOpen, setModalOpen]               = useState(false);
  const [vencimientoEditar, setVencimientoEditar] = useState(null);

  const handleGuardar = async (data) => {
    if (vencimientoEditar) await actualizarVencimiento(vencimientoEditar.id, data);
    else                   await agregarVencimiento(data);
    setVencimientoEditar(null); setModalOpen(false);
  };

  const hoy      = new Date().toISOString().slice(0, 10);
  const vencidos = vencimientos.filter(v => !v.pagado && !v.autoPagado && v.fecha <  hoy);
  const proximos = vencimientos.filter(v => !v.pagado && !v.autoPagado && v.fecha >= hoy);
  const pagados  = vencimientos.filter(v => v.pagado || v.autoPagado)
    .sort((a, b) => (b.fechaPagoAuto||b.fecha).localeCompare(a.fechaPagoAuto||a.fecha)).slice(0, 20);

  const fmtFecha = f => f?.split('-').reverse().join('/');
  const fmtMonto = v => v.monto > 0 ? `${v.moneda === 'USD' ? 'u$d' : '$'} ${Number(v.monto).toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : '';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, gap: 10, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
      <RefreshCw size={16} className="animate-spin" style={{ color: '#818cf8' }}/> Cargando vencimientos...
    </div>
  );

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 64, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 16, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Calendar size={20} style={{ color: '#818cf8' }}/>
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.03em', color: '#fff', lineHeight: 1 }}>Vencimientos</h1>
            <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>Compromisos y pagos regulatorios</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {vencidos.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', padding: '8px 16px', borderRadius: 14, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <AlertTriangle size={13}/> {vencidos.length} vencido{vencidos.length > 1 ? 's' : ''}
            </div>
          )}
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.2)', padding: '8px 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
            {proximos.length} próximos
          </span>
          <button onClick={() => { setVencimientoEditar(null); setModalOpen(true); }} style={{
            display: 'flex', alignItems: 'center', gap: 8, background: '#4f46e5', color: '#fff',
            fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '10px 20px', borderRadius: 14, border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(79,70,229,0.4)', transition: 'all 0.15s',
          }}>
            <Plus size={15} strokeWidth={2.5}/> Nuevo vencimiento
          </button>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
        <KpiCard label="Vencidos"  value={vencidos.length} icon={AlertTriangle}
          active={vencidos.length > 0} numColor="#f87171" bgColor="rgba(239,68,68,0.07)" borderColor="rgba(248,113,113,0.25)"/>
        <KpiCard label="Próximos"  value={proximos.length} icon={Clock}
          active={proximos.length > 0} numColor="#fbbf24" bgColor="rgba(245,158,11,0.07)" borderColor="rgba(251,191,36,0.25)"/>
        <KpiCard label="Pagados"   value={pagados.length}  icon={CheckCircle2}
          active={pagados.length > 0}  numColor="#34d399" bgColor="rgba(52,211,153,0.07)" borderColor="rgba(52,211,153,0.25)"/>
      </div>

      {/* ── Secciones ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>

        {vencidos.length > 0 && (
          <section>
            <SectionDivider label="Vencidos" count={vencidos.length} color="#f87171"/>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
              {vencidos.map(v => <VencimientoRow key={v.id} v={v} onMarcar={marcarPagado} onEditar={v => { setVencimientoEditar(v); setModalOpen(true); }} onEliminar={eliminarVencimiento}/>)}
            </div>
          </section>
        )}

        <section>
          <SectionDivider label="Próximos vencimientos" count={proximos.length} color="#fbbf24"/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {proximos.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', background: 'rgba(255,255,255,0.015)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.04)', gap: 10 }}>
                <CheckCircle2 size={32} style={{ color: 'rgba(255,255,255,0.1)' }}/>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>Sin compromisos pendientes</p>
              </div>
            ) : (
              proximos.map(v => <VencimientoRow key={v.id} v={v} onMarcar={marcarPagado} onEditar={v => { setVencimientoEditar(v); setModalOpen(true); }} onEliminar={eliminarVencimiento}/>)
            )}
          </div>
        </section>

        {pagados.length > 0 && (
          <section>
            <SectionDivider label="Historial de pagos" count={pagados.length} color="#34d399"/>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
              {pagados.map(v => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderRadius: 14, background: v.autoPagado ? 'rgba(99,102,241,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${v.autoPagado ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)'}`, opacity: 0.65 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CheckCircle2 size={15} style={{ color: v.autoPagado ? '#818cf8' : '#34d399' }}/>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{v.concepto}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 7 }}>{fmtFecha(v.fecha)}</span>
                    <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 7, background: v.autoPagado ? 'rgba(99,102,241,0.12)' : 'rgba(52,211,153,0.12)', border: `1px solid ${v.autoPagado ? 'rgba(99,102,241,0.25)' : 'rgba(52,211,153,0.25)'}`, color: v.autoPagado ? '#a5b4fc' : '#34d399' }}>
                      ✓ {v.autoPagado ? 'Conciliado' : 'Pagado'}
                    </span>
                  </div>
                  {v.monto > 0 && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>{fmtMonto(v)}</span>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {modalOpen && (
        <ModalNuevoVencimiento
          onGuardar={handleGuardar}
          onClose={() => { setModalOpen(false); setVencimientoEditar(null); }}
          vencimientoEditar={vencimientoEditar}
        />
      )}
    </>
  );
}
