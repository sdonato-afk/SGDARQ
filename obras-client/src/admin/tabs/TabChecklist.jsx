import React, { useState, useMemo } from 'react';
import { Plus, CheckCircle2, Clock, AlertTriangle, Filter, ChevronDown, ChevronRight, Trash2, Edit2, Camera } from 'lucide-react';
import { useTareas } from '../../hooks/useTareas';
import { FASES, TIPOS_TAREA, ESTADOS } from '../../lib/checklistTemplate';
import { SectionHeader } from '@darq/ui';
import TareaModal from './checklist/TareaModal';

// ── Helpers ──
function calcFechaLimite(fechaInstalacion, leadTimeDias) {
  if (!fechaInstalacion || !leadTimeDias) return null;
  const d = new Date(fechaInstalacion + 'T00:00:00');
  d.setDate(d.getDate() - leadTimeDias);
  return d.toISOString().slice(0, 10);
}

function diasHasta(fecha) {
  if (!fecha) return null;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const target = new Date(fecha + 'T00:00:00');
  return Math.floor((target - hoy) / (1000 * 60 * 60 * 24));
}

function getUrgencia(tarea) {
  const fl = tarea.fechaLimite || calcFechaLimite(tarea.fechaInstalacion, tarea.leadTimeDias);
  if (!fl || tarea.estado === 'completada') return null;
  const d = diasHasta(fl);
  if (d === null) return null;
  if (d < 0) return 'vencida';
  if (d <= 7) return 'critica';
  if (d <= 14) return 'alerta';
  return null;
}

export default function TabChecklist({ obraId }) {
  const { tareas, loading, add, update, remove, initFromTemplate } = useTareas(obraId);
  const [showModal, setShowModal] = useState(false);
  const [editingTarea, setEditing] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [fasesAbiertas, setFasesAbiertas] = useState({});
  const [initializing, setInitializing] = useState(false);

  // Toggle fase abierta/cerrada
  const toggleFase = (num) => setFasesAbiertas(p => ({ ...p, [num]: !p[num] }));

  // Filtrar tareas
  const tareasFiltradas = useMemo(() => {
    let t = [...tareas];
    if (filtroEstado !== 'todos') t = t.filter(x => x.estado === filtroEstado);
    if (filtroTipo !== 'todos') t = t.filter(x => x.tipo === filtroTipo);
    return t;
  }, [tareas, filtroEstado, filtroTipo]);

  // Agrupar por fase
  const porFase = useMemo(() => {
    const map = {};
    FASES.forEach(f => { map[f.num] = []; });
    tareasFiltradas.forEach(t => {
      if (map[t.faseNum]) map[t.faseNum].push(t);
    });
    return map;
  }, [tareasFiltradas]);

  // KPIs
  const total = tareas.length;
  const completadas = tareas.filter(t => t.estado === 'completada').length;
  const enProceso = tareas.filter(t => t.estado === 'en_proceso').length;
  const alertas = tareas.filter(t => getUrgencia(t)).length;
  const pctCompleto = total > 0 ? ((completadas / total) * 100).toFixed(0) : 0;

  // Init handler
  const handleInit = async () => {
    if (!window.confirm('¿Cargar el template completo de tareas? Se agregarán ~80 tareas predefinidas.')) return;
    setInitializing(true);
    await initFromTemplate();
    setInitializing(false);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Cargando checklist...</div>;

  // Estado vacío
  if (total === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 20 }}>
        <div style={{ width: 80, height: 80, borderRadius: 20, background: 'rgba(236,72,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>📋</div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#e2e8f0' }}>Checklist de Obra</h2>
        <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', maxWidth: 400 }}>
          Esta obra aún no tiene tareas cargadas. Podés cargar el template completo con ~80 tareas organizadas por fase, o agregar tareas manualmente.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <button className="btn btn-primary" onClick={handleInit} disabled={initializing} style={{ gap: 8 }}>
            📋 {initializing ? 'Cargando template...' : 'Cargar template completo'}
          </button>
          <button className="btn btn-ghost" onClick={() => { setEditing(null); setShowModal(true); }} style={{ gap: 8 }}>
            <Plus size={14} /> Agregar tarea manual
          </button>
        </div>
        {showModal && (
          <TareaModal
            onSave={async (data) => { await add(data); setShowModal(false); }}
            onClose={() => setShowModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KPI label="Progreso" value={`${pctCompleto}%`} color="#22c55e" sub={`${completadas} de ${total}`} />
        <KPI label="En Proceso" value={enProceso} color="#3b82f6" />
        <KPI label="Pendientes" value={total - completadas - enProceso} color="#64748b" />
        <KPI label="Alertas" value={alertas} color={alertas > 0 ? '#ef4444' : '#64748b'} />
      </div>

      {/* ── Barra de progreso global ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pctCompleto}%`, background: 'linear-gradient(90deg, #22c55e, #34d399)', borderRadius: 6, transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <FilterPill label="Estado" value={filtroEstado} onChange={setFiltroEstado}
            options={[{ v: 'todos', l: 'Todos' }, ...Object.entries(ESTADOS).map(([k, v]) => ({ v: k, l: v.label }))]} />
          <FilterPill label="Tipo" value={filtroTipo} onChange={setFiltroTipo}
            options={[{ v: 'todos', l: 'Todos' }, ...Object.entries(TIPOS_TAREA).map(([k, v]) => ({ v: k, l: v.label }))]} />
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowModal(true); }} style={{ gap: 6 }}>
          <Plus size={13} /> Nueva tarea
        </button>
      </div>

      {/* ── Fases (acordeón) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FASES.map(fase => {
          const items = porFase[fase.num] || [];
          if (items.length === 0) return null;
          const isOpen = fasesAbiertas[fase.num] !== false; // abiertas por defecto
          const completadasFase = items.filter(t => t.estado === 'completada').length;
          const pctFase = items.length > 0 ? ((completadasFase / items.length) * 100).toFixed(0) : 0;

          return (
            <div key={fase.num} className="glass" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Header de fase */}
              <button
                onClick={() => toggleFase(fase.num)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
                  background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
              >
                {isOpen ? <ChevronDown size={14} color={fase.color} /> : <ChevronRight size={14} color={fase.color} />}
                <div style={{ width: 4, height: 20, borderRadius: 2, background: fase.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: fase.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Fase {fase.num}: {fase.label}
                </span>
                <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginLeft: 'auto' }}>
                  {completadasFase}/{items.length} · {pctFase}%
                </span>
                <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${pctFase}%`, height: '100%', background: fase.color, borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
              </button>

              {/* Tareas de la fase */}
              {isOpen && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {items.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '', undefined, { numeric: true })).map(tarea => (
                    <TareaRow
                      key={tarea.id}
                      tarea={tarea}
                      onToggle={() => {
                        const next = tarea.estado === 'completada' ? 'pendiente' : tarea.estado === 'pendiente' ? 'en_proceso' : 'completada';
                        const upd = { estado: next };
                        if (next === 'completada') {
                          upd.completadaFecha = new Date().toISOString().slice(0, 10);
                        }
                        update(tarea.id, upd);
                      }}
                      onEdit={() => { setEditing(tarea); setShowModal(true); }}
                      onDelete={() => {
                        if (window.confirm(`¿Eliminar "${tarea.titulo}"?`)) remove(tarea.id);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <TareaModal
          initialData={editingTarea}
          onSave={async (data) => {
            if (editingTarea) {
              await update(editingTarea.id, data);
            } else {
              await add(data);
            }
            setShowModal(false);
            setEditing(null);
          }}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────

function KPI({ label, value, color, sub }) {
  return (
    <div style={{ padding: '14px 16px', background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#e2e8f0' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function FilterPill({ label, value, onChange, options }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Filter size={11} color="#64748b" />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '5px 10px', color: '#e2e8f0', fontSize: 11,
          fontWeight: 700, cursor: 'pointer', outline: 'none',
        }}
      >
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function TareaRow({ tarea, onToggle, onEdit, onDelete }) {
  const tipoMeta = TIPOS_TAREA[tarea.tipo] || TIPOS_TAREA.ejecucion;
  const estadoMeta = ESTADOS[tarea.estado] || ESTADOS.pendiente;
  const urgencia = getUrgencia(tarea);
  const fl = tarea.fechaLimite || calcFechaLimite(tarea.fechaInstalacion, tarea.leadTimeDias);
  const diasRestantes = fl ? diasHasta(fl) : null;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        background: urgencia === 'vencida' ? 'rgba(239,68,68,0.04)' : urgencia === 'critica' ? 'rgba(251,191,36,0.03)' : 'transparent',
        opacity: tarea.estado === 'completada' ? 0.5 : 1,
        transition: 'all 0.15s',
      }}
    >
      {/* Toggle estado */}
      <button
        onClick={onToggle}
        style={{
          width: 22, height: 22, borderRadius: 6, border: `2px solid ${estadoMeta.color}`,
          background: tarea.estado === 'completada' ? estadoMeta.color : 'transparent',
          cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
      >
        {tarea.estado === 'completada' && <CheckCircle2 size={12} color="#fff" />}
        {tarea.estado === 'en_proceso' && <Clock size={10} color={estadoMeta.color} />}
      </button>

      {/* Código */}
      <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', fontFamily: 'monospace', minWidth: 36 }}>
        {tarea.codigo}
      </span>

      {/* Tipo badge */}
      <span style={{
        fontSize: 8, fontWeight: 800, color: tipoMeta.color, background: `${tipoMeta.color}15`,
        padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.05em',
        flexShrink: 0,
      }}>
        {tipoMeta.icon} {tipoMeta.label}
      </span>

      {/* Titulo */}
      <span style={{
        flex: 1, fontSize: 12, fontWeight: 600, color: '#e2e8f0',
        textDecoration: tarea.estado === 'completada' ? 'line-through' : 'none',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {tarea.titulo}
      </span>

      {/* Responsable */}
      {tarea.responsable && (
        <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, flexShrink: 0 }}>
          {tarea.responsable}
        </span>
      )}

      {/* Lead time / Alerta */}
      {tarea.leadTimeDias > 0 && tarea.estado !== 'completada' && (
        <span style={{
          fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 6, flexShrink: 0,
          color: urgencia === 'vencida' ? '#ef4444' : urgencia === 'critica' ? '#fbbf24' : '#64748b',
          background: urgencia === 'vencida' ? 'rgba(239,68,68,0.1)' : urgencia === 'critica' ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.05)',
        }}>
          {urgencia === 'vencida' ? `⚠ Venció hace ${Math.abs(diasRestantes)}d` :
           diasRestantes !== null ? `${diasRestantes}d` : `${tarea.leadTimeDias}d lead`}
        </span>
      )}

      {/* Acciones */}
      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
        <button className="btn btn-ghost btn-sm" style={{ padding: '0 5px', color: '#94a3b8' }} onClick={onEdit}><Edit2 size={12} /></button>
        <button className="btn btn-ghost btn-sm" style={{ padding: '0 5px', color: '#f87171' }} onClick={onDelete}><Trash2 size={12} /></button>
      </div>
    </div>
  );
}



