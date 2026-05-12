/**
 * TabRequerimientos.jsx
 * Solicitudes de materiales/servicios desde inspeccion-client.
 * Flujo: pendiente → recibido → comprado → entregado | rechazado
 */
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Package, Wrench, Clock, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { KPICard } from '@darq/ui';

const APP_ID = 'sg-darq';

const ESTADO_CONFIG = {
  pendiente:             { label: 'Pendiente',         color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
  pendiente_aprobacion:  { label: 'Esperando aprob.',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  aprobado:              { label: 'Aprobado',          color: '#818cf8', bg: 'rgba(129,140,248,0.1)' },
  ejecutado:             { label: '\u2713 Ejecutado',    color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
  recibido:              { label: 'Recibido',          color: '#818cf8', bg: 'rgba(129,140,248,0.1)' },
  comprado:              { label: 'Comprado',          color: '#38bdf8', bg: 'rgba(56,189,248,0.1)'  },
  entregado:             { label: 'Entregado',         color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
  rechazado:             { label: 'Rechazado',         color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
};

const TIPO_ICON  = { material: Package, servicio: Wrench };
const TIPO_COLOR = { material: '#fbbf24', servicio: '#818cf8' };

function EstadoBadge({ estado }) {
  const cfg = ESTADO_CONFIG[estado] || ESTADO_CONFIG.pendiente;
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
      padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}

// ── Botones de acción disponibles por estado ──────────────────────────────────────
const ACCIONES = {
  // Flujo materiales/servicios
  pendiente: [
    { id: 'comprado', label: '🛒 Marcar Comprado',    color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',   border: 'rgba(56,189,248,0.25)' },
    { id: 'rechazar', label: 'Rechazar',               color: '#f87171', bg: 'rgba(248,113,113,0.06)', border: 'rgba(248,113,113,0.15)' },
  ],
  comprado: [
    { id: 'entregado', label: '✓ Confirmar Recibido en Obra', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)' },
    { id: 'rechazar',  label: 'Cancelar',                    color: '#f87171', bg: 'rgba(248,113,113,0.06)', border: 'rgba(248,113,113,0.15)' },
  ],
  // Flujo solicitudes de pago
  pendiente_aprobacion: [
    { id: 'aprobar',  label: '✓ Aprobar Pago',  color: '#818cf8', bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.3)' },
    { id: 'rechazar', label: 'Rechazar',             color: '#f87171', bg: 'rgba(248,113,113,0.06)', border: 'rgba(248,113,113,0.15)' },
  ],
  aprobado: [
    { id: 'ejecutado', label: '💸 Marcar como Pagado', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)' },
    { id: 'rechazar',  label: 'Cancelar',                     color: '#f87171', bg: 'rgba(248,113,113,0.06)', border: 'rgba(248,113,113,0.15)' },
  ],
};

function RequerimientoCard({ req, proveedores }) {
  const [expanded, setExpanded] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [accion,   setAccion]   = useState(null);

  // Campos por formulario
  const [lugar,     setLugar]     = useState('deposito');
  const [proveedor, setProveedor] = useState('');
  const [montoReal, setMontoReal] = useState('');
  const [motivo,    setMotivo]    = useState('');

  const Icon  = TIPO_ICON[req.tipo]  || Package;
  const color = TIPO_COLOR[req.tipo] || '#64748b';

  const cambiarEstado = async (nuevoEstado, extra = {}) => {
    setSaving(true);
    try {
      await updateDoc(
        doc(db, 'artifacts', APP_ID, 'public', 'data', 'requerimientos', req.id),
        { estado: nuevoEstado, updatedAt: serverTimestamp(), resolvedAt: serverTimestamp(), ...extra }
      );
      setAccion(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const confirmar = () => {
    if (accion === 'comprado')  cambiarEstado('comprado',  { proveedor_compra: proveedor, monto_real: montoReal ? parseFloat(montoReal) : null });
    if (accion === 'rechazar')  cambiarEstado('rechazado', { motivoRechazo: motivo });
    if (accion === 'entregado') cambiarEstado('entregado', { lugar_recepcion: lugar });
    if (accion === 'aprobar')   cambiarEstado('aprobado',  { aprobadoFecha: new Date().toISOString() });
    if (accion === 'ejecutado') cambiarEstado('ejecutado', {
      ejecutadoFecha: new Date().toISOString(),
      monto_real: montoReal ? parseFloat(montoReal) : (req.monto || null),
    });
  };

  const botonesEstado = ACCIONES[req.estado] || [];

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>

      {/* ── Header ── */}
      <div onClick={() => setExpanded(v => !v)}
        style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{req.descripcion}</span>
            {req.urgencia === 'urgente' && (
              <span style={{ fontSize: 9, fontWeight: 800, color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '2px 6px', borderRadius: 6 }}>⚡ URGENTE</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
            {req.obraNombre} · {req.solicitanteNombre} · {req.createdAt?.toDate?.()?.toLocaleDateString('es-AR') || ''}
          </div>
        </div>
        <EstadoBadge estado={req.estado} />
        {expanded ? <ChevronUp size={14} color="#475569" /> : <ChevronDown size={14} color="#475569" />}
      </div>

      {/* ── Detalle expandido ── */}
      {expanded && (
        <div style={{ padding: '0 18px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>

          {/* Items */}
          {req.items?.filter(it => it.descripcion)?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
                {req.tipo === 'material' ? 'Materiales' : 'Detalle'}
              </div>
              {req.items.filter(it => it.descripcion).map((it, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#94a3b8', marginBottom: 3 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{it.descripcion}</span>
                  {it.cantidad && <span style={{ color: '#64748b', fontFamily: 'monospace' }}>{it.cantidad} {it.unidad}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Nota */}
          {req.nota && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
              {req.nota}
            </div>
          )}

          {/* Foto */}
          {req.fotoUrl && (
            <div style={{ marginTop: 12 }}>
              <a href={req.fotoUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#818cf8', fontWeight: 700 }}>
                <ImageIcon size={13} /> Ver foto de referencia
              </a>
            </div>
          )}

          {/* Info pago solicitado */}
          {req.tipo === 'pago' && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#34d399', textTransform: 'uppercase', marginBottom: 6 }}>Solicitud de Pago</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Proveedor: <strong style={{ color: '#e2e8f0' }}>{req.proveedor || '—'}</strong></div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>Monto solicitado: <strong style={{ color: '#34d399', fontFamily: 'monospace' }}>{req.moneda === 'USD' ? 'u$d ' : '$ '}{(req.monto || 0).toLocaleString('es-AR')}</strong></div>
              {req.ejecutadoFecha && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#64748b' }}>
                  \u2713 Pagado el {new Date(req.ejecutadoFecha).toLocaleDateString('es-AR')}
                  {req.monto_real && req.monto_real !== req.monto && <span style={{ color: '#38bdf8', marginLeft: 6 }}>(real: $ {req.monto_real.toLocaleString('es-AR')})</span>}
                </div>
              )}
              {req.aprobadoFecha && !req.ejecutadoFecha && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#818cf8' }}>\u2713 Aprobado el {new Date(req.aprobadoFecha).toLocaleDateString('es-AR')} · Pendiente de ejecución</div>
              )}
            </div>
          )}
          {req.lugar_recepcion && (
            <div style={{ marginTop: 10, fontSize: 11, color: '#64748b' }}>
              📍 Recibido en: <strong style={{ color: '#94a3b8' }}>{req.lugar_recepcion === 'deposito' ? 'Depósito' : 'Obra'}</strong>
            </div>
          )}
          {req.proveedor_compra && (
            <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>
              🏪 Proveedor: <strong style={{ color: '#94a3b8' }}>{req.proveedor_compra}</strong>
              {req.monto_real && <span style={{ color: '#38bdf8', marginLeft: 8, fontWeight: 700 }}>$ {req.monto_real.toLocaleString('es-AR')}</span>}
            </div>
          )}
          {req.estado === 'rechazado' && req.motivoRechazo && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 8, fontSize: 12, color: '#f87171' }}>
              Motivo: {req.motivoRechazo}
            </div>
          )}

          {/* ── Botones de acción ── */}
          {botonesEstado.length > 0 && !accion && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {botonesEstado.map(btn => (
                <button key={btn.id} onClick={() => setAccion(btn.id)} disabled={saving}
                  style={{ flex: 1, padding: '9px 0', background: btn.bg, border: `1px solid ${btn.border}`, borderRadius: 10, color: btn.color, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                  {btn.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Form: COMPRADO ── */}
          {accion === 'comprado' && (
            <div style={{ marginTop: 14, padding: 14, background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', marginBottom: 10 }}>Datos de la compra</div>
              <select value={proveedor} onChange={e => setProveedor(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 8, color: proveedor ? '#e2e8f0' : '#64748b', fontSize: 12, marginBottom: 8, boxSizing: 'border-box' }}>
                <option value="">Seleccionar proveedor...</option>
                {proveedores.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
              </select>
              <input type="number" placeholder="Monto real (opcional)" value={montoReal} onChange={e => setMontoReal(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 8, color: '#e2e8f0', fontSize: 12, marginBottom: 10, boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={confirmar} disabled={saving}
                  style={{ flex: 1, padding: '10px 0', background: 'rgba(56,189,248,0.2)', border: '1px solid rgba(56,189,248,0.4)', borderRadius: 10, color: '#38bdf8', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                  {saving ? '...' : '🛒 Confirmar Compra'}
                </button>
                <button onClick={() => setAccion(null)} style={{ padding: '10px 16px', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* ── Form: RECHAZAR ── */}
          {accion === 'rechazar' && (
            <div style={{ marginTop: 14, padding: 14, background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#f87171', textTransform: 'uppercase', marginBottom: 10 }}>Motivo del rechazo</div>
              <input type="text" placeholder="Opcional" value={motivo} onChange={e => setMotivo(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, color: '#e2e8f0', fontSize: 12, marginBottom: 8, boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={confirmar} disabled={saving}
                  style={{ flex: 1, padding: '10px 0', background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, color: '#f87171', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                  {saving ? '...' : 'Confirmar Rechazo'}
                </button>
                <button onClick={() => setAccion(null)} style={{ padding: '10px 16px', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* ── Form: APROBAR (pago) ── */}
          {accion === 'aprobar' && (
            <div style={{ marginTop: 14, padding: 14, background: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.2)', borderRadius: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', marginBottom: 10 }}>Aprobación de Pago</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                Se notificará al solicitante que el pago fue aprobado y estará disponible para ejecución.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={confirmar} disabled={saving}
                  style={{ flex: 1, padding: '10px 0', background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.3)', borderRadius: 10, color: '#818cf8', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                  {saving ? '...' : '\u2713 Confirmar Aprobación'}
                </button>
                <button onClick={() => setAccion(null)} style={{ padding: '10px 16px', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#64748b', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
              </div>
            </div>
          )}

          {/* ── Form: EJECUTADO (pago) ── */}
          {accion === 'ejecutado' && (
            <div style={{ marginTop: 14, padding: 14, background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#34d399', textTransform: 'uppercase', marginBottom: 10 }}>Registrar Pago Ejecutado</div>
              <input type="number" placeholder={`Monto real (solicitado: ${(req.monto || 0).toLocaleString('es-AR')})`} value={montoReal} onChange={e => setMontoReal(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 8, color: '#e2e8f0', fontSize: 12, marginBottom: 10, boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={confirmar} disabled={saving}
                  style={{ flex: 1, padding: '10px 0', background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 10, color: '#34d399', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                  {saving ? '...' : '\uD83D\uDCB8 Confirmar Pago'}
                </button>
                <button onClick={() => setAccion(null)} style={{ padding: '10px 16px', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#64748b', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
              </div>
            </div>
          )}

          {/* ── Form: ENTREGADO ── */}
          {accion === 'entregado' && (
            <div style={{ marginTop: 14, padding: 14, background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#34d399', textTransform: 'uppercase', marginBottom: 10 }}>¿Dónde se recibe?</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {[{ v: 'deposito', l: '🏭 Depósito' }, { v: 'obra', l: '🏗️ En Obra' }].map(opt => (
                  <button key={opt.v} type="button" onClick={() => setLugar(opt.v)}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontWeight: 800, fontSize: 12, cursor: 'pointer', border: '2px solid',
                      background: lugar === opt.v ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.03)',
                      borderColor: lugar === opt.v ? '#34d399' : 'rgba(255,255,255,0.08)',
                      color: lugar === opt.v ? '#34d399' : '#475569',
                    }}>
                    {opt.l}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={confirmar} disabled={saving}
                  style={{ flex: 1, padding: '10px 0', background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 10, color: '#34d399', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                  {saving ? '...' : '✓ Confirmar Recepción'}
                </button>
                <button onClick={() => setAccion(null)} style={{ padding: '10px 16px', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ── Tab principal ────────────────────────────────────────────────────
export default function TabRequerimientos({ obraId }) {
  const [requerimientos, setRequerimientos] = useState([]);
  const [proveedores,    setProveedores]    = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [filtroEstado,   setFiltroEstado]   = useState('en_curso');

  useEffect(() => {
    if (!obraId) return;
    const q = query(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'requerimientos'),
      where('obraId', '==', obraId)
    );
    const unsub = onSnapshot(q, snap => {
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          if (a.urgencia === 'urgente' && b.urgencia !== 'urgente') return -1;
          if (b.urgencia === 'urgente' && a.urgencia !== 'urgente') return 1;
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        });
      setRequerimientos(lista);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [obraId]);

  useEffect(() => {
    getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'proveedores'))
      .then(snap => {
        setProveedores(
          snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .filter(p => p.nombre)
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
        );
      }).catch(() => {});
  }, []);

  // Grupos
  const sinAtender = requerimientos.filter(r => ['pendiente', 'pendiente_aprobacion'].includes(r.estado));
  const enProceso  = requerimientos.filter(r => ['comprado', 'aprobado'].includes(r.estado));
  const enCurso    = requerimientos.filter(r => ['pendiente', 'pendiente_aprobacion', 'comprado', 'aprobado'].includes(r.estado));
  const entregados = requerimientos.filter(r => ['entregado', 'ejecutado'].includes(r.estado));
  const rechazados = requerimientos.filter(r => r.estado === 'rechazado');
  const comprados  = requerimientos.filter(r => r.estado === 'comprado');

  const filtrados =
    filtroEstado === 'en_curso'  ? enCurso    :
    filtroEstado === 'entregado' ? entregados :
    filtroEstado === 'rechazado' ? rechazados :
    requerimientos;

  const FILTROS = [
    { id: 'en_curso',  label: `En curso (${enCurso.length})`      },
    { id: 'entregado', label: `Entregados (${entregados.length})`  },
    { id: 'rechazado', label: `Rechazados (${rechazados.length})`  },
    { id: 'todos',     label: 'Todos'                              },
  ];

  if (loading) return <div style={{ padding: 40, color: '#64748b', textAlign: 'center' }}>Cargando...</div>;

  return (
    <div style={{ padding: '24px 28px' }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <KPICard label="Sin atender"
          value={<span style={{ fontSize: 24, fontWeight: 900, color: sinAtender.length > 0 ? '#fbbf24' : '#34d399' }}>{sinAtender.length}</span>}
          color="#fbbf24" />
        <KPICard label="Comprados"
          value={<span style={{ fontSize: 24, fontWeight: 900, color: '#38bdf8' }}>{comprados.length}</span>}
          color="#38bdf8" />
        <KPICard label="Entregados"
          value={<span style={{ fontSize: 24, fontWeight: 900, color: '#34d399' }}>{entregados.length}</span>}
          color="#34d399" />
        <KPICard label="Rechazados"
          value={<span style={{ fontSize: 24, fontWeight: 900, color: '#f87171' }}>{rechazados.length}</span>}
          color="#f87171" />
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTROS.map(f => (
          <button key={f.id} onClick={() => setFiltroEstado(f.id)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 800,
              cursor: 'pointer', border: 'none', transition: 'all 0.15s',
              background: filtroEstado === f.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
              color: filtroEstado === f.id ? '#818cf8' : '#64748b',
              outline: filtroEstado === f.id ? '1px solid rgba(99,102,241,0.4)' : 'none',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.01)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.05)' }}>
          <Clock size={32} style={{ opacity: 0.15, margin: '0 auto 12px', display: 'block' }} color="#fff" />
          <div style={{ fontSize: 13, color: '#475569' }}>
            {filtroEstado === 'en_curso' ? 'Sin solicitudes activas para esta obra.' : 'Sin registros en esta categoría.'}
          </div>
        </div>
      ) : (
        <div>
          {filtrados.map(req => (
            <RequerimientoCard key={req.id} req={req} proveedores={proveedores} />
          ))}
        </div>
      )}

    </div>
  );
}
