/**
 * TabCalendario.jsx
 * Design System unificado: estilos inline.
 */
import React, { useState, useMemo } from 'react';
import { Plus, CheckCircle2, Trash2, AlertTriangle, CalendarDays } from 'lucide-react';
import { useEventosData }  from '../../hooks/useEventosData';
import { useUsuariosData } from '../../hooks/useUsuariosData';
import ModalNuevoEvento    from '../../components/ModalNuevoEvento';

const TIPO_META = {
  reunion:        { emoji: '🤝', label: 'Reunión' },
  cita_proveedor: { emoji: '🔧', label: 'Proveedor' },
  facturacion:    { emoji: '🧾', label: 'Facturación' },
  llamada:        { emoji: '📞', label: 'Llamada' },
  visita_obra:    { emoji: '🏗️', label: 'Visita obra' },
  otro:           { emoji: '📌', label: 'Otro' },
};

function SectionLabel({ color, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <div style={{ width: 4, height: 16, borderRadius: 2, background: color, flexShrink: 0 }} />
      <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)' }}>{children}</p>
    </div>
  );
}

function UserAvatar({ usuario }) {
  if (!usuario) return null;
  const initials = usuario.nombre.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
  return (
    <div title={usuario.nombre} style={{
      width: 24, height: 24, borderRadius: 12, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 900, color: '#fff',
      backgroundColor: usuario.color || '#7c3aed',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
    }}>
      {initials}
    </div>
  );
}

export default function TabCalendario() {
  const { eventos, loading, agregarEvento, completarEvento, eliminarEvento } = useEventosData();
  const { usuariosActivos } = useUsuariosData();
  const [modalOpen, setModalOpen] = useState(false);

  const getUsuario = (id) => usuariosActivos?.find(u => u.id === id);

  const hoy    = new Date();
  const hoyStr = hoy.toISOString().slice(0, 10);

  const diasHasta = (fh) => Math.floor((new Date(fh) - hoy) / (1000 * 60 * 60 * 24));
  const fmtHora   = (fh) => fh ? new Date(fh).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '';
  const dayLabel  = (dateStr) => {
    if (dateStr === hoyStr) return '🟢 Hoy';
    const tom = new Date(hoy); tom.setDate(tom.getDate() + 1);
    if (dateStr === tom.toISOString().slice(0, 10)) return '🟡 Mañana';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const proximos = eventos.filter(e => !e.completado && e.fechaHora >= hoyStr);
  const vencidos = eventos.filter(e => !e.completado && e.fechaHora <  hoyStr);
  const pasados  = eventos.filter(e =>  e.completado).slice(-5);

  const grouped = useMemo(() => {
    const map = new Map();
    proximos.forEach(e => {
      const day = e.fechaHora?.slice(0, 10) || 'sin-fecha';
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(e);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [proximos]);

  const waLink   = (u, e) => `https://wa.me/${(u.whatsapp||'').replace(/[^0-9]/g,'')}?text=${encodeURIComponent(`Recordatorio: ${e.titulo} — ${e.fechaHora?.replace('T',' ')}${e.lugar ? ` en ${e.lugar}` : ''}`)}`;
  const mailLink = (u, e) => `mailto:${u.email}?subject=${encodeURIComponent(`Recordatorio: ${e.titulo}`)}&body=${encodeURIComponent(`Hola ${u.nombre},\n\n${e.titulo}\nFecha: ${e.fechaHora?.replace('T',' ')}${e.lugar ? `\nLugar: ${e.lugar}` : ''}`)}`;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, gap: 10, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
      <div style={{ width: 16, height: 16, border: '2px solid rgba(129,140,248,0.4)', borderTopColor: '#818cf8', borderRadius: '50%', animation: 'spin 1s linear infinite' }}/>
      Cargando calendario...
    </div>
  );

  // ── Fila de evento ────────────────────────────────────────────────────────
  const EventRow = ({ e, isToday, isOverdue }) => {
    const [hovered, setHovered] = useState(false);
    const meta    = TIPO_META[e.tipoEvento] || TIPO_META.otro;
    const usuario = getUsuario(e.asignadoA);
    const d       = diasHasta(e.fechaHora);

    return (
      <div 
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderRadius: 16, padding: '12px 16px 12px 20px', minHeight: 64,
          background: isOverdue ? 'rgba(220,38,38,0.07)' : isToday ? 'rgba(99,102,241,0.07)' : hovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.025)',
          border: `1px solid ${isOverdue ? 'rgba(248,113,113,0.25)' : isToday ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.07)'}`,
          transition: 'all 0.15s'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
          <button onClick={() => completarEvento(e.id)} style={{
            width: 20, height: 20, borderRadius: 6, flexShrink: 0,
            border: `2px solid ${isOverdue ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.2)'}`,
            background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isOverdue ? '#f87171' : 'rgba(255,255,255,0.2)'
          }} title="Marcar completado">
            <CheckCircle2 size={10} strokeWidth={2.5}/>
          </button>
          
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: isOverdue ? '#fecaca' : 'rgba(255,255,255,0.92)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {meta.emoji} {e.titulo}
              </p>
              {e.periodicidad && e.periodicidad !== 'ninguna' && (
                <span style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a5b4fc', background: 'rgba(99,102,241,0.08)', padding: '2px 6px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.2)' }}>
                  ↻ {e.periodicidad}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: 6 }}>
                {fmtHora(e.fechaHora)}
              </span>
              {e.contacto && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{e.contacto}</span>}
              {e.lugar    && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{e.lugar}</span>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {usuario && <UserAvatar usuario={usuario}/>}
          {usuario?.whatsapp && (e.notificacion === 'whatsapp' || e.notificacion === 'todos') && (
            <a href={waLink(usuario, e)} target="_blank" rel="noreferrer" style={{ fontSize: 9, fontWeight: 900, textDecoration: 'none', padding: '4px 8px', borderRadius: 8, background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>WA</a>
          )}
          {usuario?.email && (e.notificacion === 'email' || e.notificacion === 'todos') && (
            <a href={mailLink(usuario, e)} style={{ fontSize: 9, fontWeight: 900, textDecoration: 'none', padding: '4px 8px', borderRadius: 8, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }}>✉️</a>
          )}
          {!isOverdue && (
            <span style={{ fontSize: 10, fontWeight: 900, padding: '4px 10px', borderRadius: 10, background: d === 0 ? 'rgba(99,102,241,0.15)' : d <= 2 ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.05)', color: d === 0 ? '#818cf8' : d <= 2 ? '#fbbf24' : 'rgba(255,255,255,0.3)' }}>
              {d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : `${d}d`}
            </span>
          )}
          <div style={{ display: 'flex', gap: 6, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
            <button onClick={() => eliminarEvento(e.id)} style={{ width: 28, height: 28, borderRadius: 8, background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={14}/>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 64, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 16, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CalendarDays size={20} style={{ color: '#818cf8' }}/>
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.03em', color: '#fff', lineHeight: 1 }}>
              Calendario
            </h1>
            <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
              Reuniones, citas y eventos
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {vencidos.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', padding: '8px 16px', borderRadius: 14, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <AlertTriangle size={13}/> {vencidos.length} sin cerrar
            </div>
          )}
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.2)', padding: '8px 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
            {proximos.length} próximos
          </span>
          <button onClick={() => setModalOpen(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8, background: '#4f46e5', color: '#fff',
            fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '10px 20px', borderRadius: 14, border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(79,70,229,0.4)', transition: 'all 0.15s',
          }}>
            <Plus size={15} strokeWidth={2.5}/> Nuevo evento
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
        {/* Sin resolver */}
        {vencidos.length > 0 && (
          <div>
            <SectionLabel color="#f87171">Sin resolver ({vencidos.length})</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {vencidos.map(e => <EventRow key={e.id} e={e} isOverdue/>)}
            </div>
          </div>
        )}

        {/* Próximos agrupados */}
        {grouped.length === 0 && vencidos.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', background: 'rgba(255,255,255,0.015)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.04)', gap: 10 }}>
            <CalendarDays size={32} style={{ color: 'rgba(255,255,255,0.1)' }}/>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>No hay eventos próximos agendados</p>
          </div>
        ) : (
          grouped.map(([day, items]) => (
            <div key={day}>
              <SectionLabel color="#818cf8">{dayLabel(day)}</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map(e => (
                  <EventRow key={e.id} e={e} isToday={day === hoyStr}/>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Completados recientes */}
        {pasados.length > 0 && (
          <div>
            <SectionLabel color="#34d399">Completados recientemente</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.55 }}>
              {pasados.map(e => {
                const meta = TIPO_META[e.tipoEvento] || TIPO_META.otro;
                return (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <CheckCircle2 size={14} style={{ color: '#34d399' }}/>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{meta.emoji} {e.titulo}</span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 7 }}>
                        {e.fechaHora?.slice(0, 10).split('-').reverse().join('/')}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{e.contacto}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {modalOpen && <ModalNuevoEvento onGuardar={agregarEvento} onClose={() => setModalOpen(false)}/>}
    </>
  );
}
