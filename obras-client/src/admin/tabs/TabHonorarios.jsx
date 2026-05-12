import React, { useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { useHonorarios, useMovimientosMain } from '../../hooks/useObras.js';
import { fmt, sumarEquiv } from '../../lib/calculadora.jsx';
import { DualAmt, SectionHeader, SearchableSelect } from '@darq/ui';
import HonorarioModal from './honorarios/HonorarioModal.jsx';
import { TIPOS, ESTADO_META, esCobroHonorarios, movToUSD } from './honorarios/constants.js';

export default function TabHonorarios({ obraId, config }) {
  const { honorarios, loading, add, update, remove } = useHonorarios(obraId);
  const { movimientos: movsMain }                    = useMovimientosMain(obraId);
  const [showModal, setShowModal]                    = useState(false);
  const [editingHonorario, setEditing]               = useState(null);

  const moneda = config?.honorarios_moneda || 'USD';

  // ── Cobros desde asientos del sistema principal ──────────────────
  // Ingresos de Obras: subRubro = "Honorarios"
  const cobrosAsientos = movsMain.filter(esCobroHonorarios);

  // Cada cobro ARS se convierte a USD con su propio TC histórico
  const cobradoAsientosUSD = cobrosAsientos.reduce((s, m) => s + movToUSD(m, 1300), 0);
  const cobradoAsientosARS = cobrosAsientos
    .filter(m => m.moneda === 'ARS')
    .reduce((s, m) => s + (parseFloat(m.monto) || 0), 0);

  // ── Stats por tipo (cuotas manuales) ────────────────────────────
  const stats = TIPOS.reduce((acc, t) => {
    const del_tipo = honorarios.filter(h => h.tipo === t.id);
    acc[t.id] = {
      total:    config?.[t.configKey] || 0,
      cobrado:  del_tipo.filter(h => h.estado === 'cobrado').reduce((s, h) => s + (h.monto || 0), 0),
      emitido:  del_tipo.filter(h => h.estado === 'emitido').reduce((s, h) => s + (h.monto || 0), 0),
      pendiente: del_tipo.filter(h => h.estado === 'pendiente').reduce((s, h) => s + (h.monto || 0), 0),
      cuotas:   del_tipo,
    };
    return acc;
  }, {});

  const grandTotal   = TIPOS.reduce((s, t) => s + (config?.[t.configKey] || 0), 0);
  // Cobrado real: prioriza asientos del sistema; fallback a toggles manuales
  const totalCobrado = cobradoAsientosUSD > 0
    ? cobradoAsientosUSD
    : TIPOS.reduce((s, t) => s + stats[t.id].cobrado, 0);
  const totalEmitido = TIPOS.reduce((s, t) => s + stats[t.id].emitido, 0);
  const saldoPendiente = grandTotal - totalCobrado;

  return (
    <div>
      {/* KPI compuesto — una sola card con toda la info */}
      <div className="glass" style={{ padding: 0, overflow: 'hidden', marginBottom: 28 }}>
        {/* Header */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(129,140,248,0.2)', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(129,140,248,0.06)' }}>
          <div style={{ width: 3, height: 16, borderRadius: 2, background: '#818cf8', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Honorarios D+ARQ</span>
          {cobradoAsientosUSD > 0 && (
            <span style={{ fontSize: 9, color: '#34d399', fontWeight: 700, marginLeft: 'auto' }}>● desde asientos</span>
          )}
        </div>

        {/* Filas de datos */}
        <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Pactado */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Pactado total</span>
            <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: '#818cf8' }}>{fmt(grandTotal, moneda)}</span>
          </div>

          {/* Emitido */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Certificados emitidos</span>
            <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#818cf8' }}>{fmt(totalEmitido, moneda)}</span>
          </div>

          {/* Cobrado */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Cobrado</span>
            <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#34d399' }}>
              {fmt(totalCobrado, moneda)}
              {cobradoAsientosARS > 0 && (
                <span style={{ fontSize: 9, color: '#475569', fontWeight: 600, marginLeft: 6 }}>({fmt(cobradoAsientosARS)} ARS)</span>
              )}
            </span>
          </div>

          {/* Separador */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '2px 0' }} />

          {/* Pendiente s/certificados emitidos */}
          {totalEmitido > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Pendiente s/certificados</span>
              <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>
                {fmt(Math.max(0, totalEmitido - totalCobrado), moneda)}
              </span>
            </div>
          )}

          {/* Saldo total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>Saldo total a cobrar</span>
            <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 900, color: saldoPendiente > 0 ? '#fbbf24' : '#34d399' }}>
              {fmt(saldoPendiente, moneda)}
            </span>
          </div>

          {/* Barra de progreso */}
          {grandTotal > 0 && (
            <div style={{ marginTop: 4 }}>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min((totalEmitido / grandTotal) * 100, 100)}%`, background: 'rgba(129,140,248,0.3)', borderRadius: 4 }} />
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min((totalCobrado / grandTotal) * 100, 100)}%`, background: '#34d399', borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: 9, color: '#475569', textAlign: 'right', marginTop: 3 }}>
                {grandTotal > 0 ? ((totalCobrado / grandTotal) * 100).toFixed(0) : 0}% cobrado
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <SectionHeader
        title="Honorarios · Cuotas por Hito"
        ActionIcon={Plus}
        actionLabel="Registrar cuota"
        onAction={() => { setEditing(null); setShowModal(true); }}
        style={{ marginBottom: 20 }}
      />

      {/* Una tarjeta por tipo */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {TIPOS.map(tipo => {
          const s = stats[tipo.id];
          const pctCobrado = s.total > 0 ? (s.cobrado / s.total) * 100 : 0;
          const pctEmitido = s.total > 0 ? ((s.cobrado + s.emitido) / s.total) * 100 : 0;

          return (
            <div key={tipo.id} className="glass" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Header del tipo */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: tipo.color }} />
                  <span style={{ fontWeight: 800, fontSize: 14, color: '#e2e8f0' }}>{tipo.label}</span>
                  {!config?.[tipo.configKey] && (
                    <span className="badge badge-amber" style={{ fontSize: 9 }}>Sin configurar</span>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 18, color: tipo.color }}>
                    {fmt(s.total, moneda)}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>
                    {fmt(s.cobrado, moneda)} cobrado · {fmt(s.emitido, moneda)} emitido
                  </div>
                </div>
              </div>

              {/* Barra de progreso doble */}
              <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                    {/* emitido (background) */}
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(pctEmitido, 100)}%`, background: `${tipo.color}40`, borderRadius: 4 }} />
                    {/* cobrado (foreground) */}
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(pctCobrado, 100)}%`, background: tipo.color, borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 11, color: tipo.color, fontWeight: 800, minWidth: 36, textAlign: 'right' }}>
                    {pctCobrado.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Tabla de cuotas */}
              {s.cuotas.length > 0 ? (
                <table className="table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Hito</th>
                      <th style={{ textAlign: 'right' }}>% del total</th>
                      <th style={{ textAlign: 'right', color: tipo.color }}>Monto</th>
                      <th>Fecha emisión</th>
                      <th>Fecha cobro</th>
                      <th>Estado</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.cuotas.map(h => {
                      const meta = ESTADO_META[h.estado] || ESTADO_META.pendiente;
                      return (
                        <tr key={h.id}>
                          <td style={{ fontWeight: 600, fontSize: 13 }}>{h.hito}</td>
                          <td style={{ textAlign: 'right', fontSize: 12, color: '#64748b' }}>
                            {h.pct_del_total ? `${h.pct_del_total}%` : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: tipo.color, fontSize: 14 }}>
                            {fmt(h.monto, moneda)}
                          </td>
                          <td style={{ fontSize: 11, color: '#64748b' }}>
                            {h.estado !== 'pendiente' ? (h.fecha_emision || '—') : '—'}
                          </td>
                          <td style={{ fontSize: 11, color: '#64748b' }}>
                            {h.estado === 'cobrado' ? (h.fecha_cobro || '—') : '—'}
                          </td>
                          <td>
                            <SearchableSelect
                              value={h.estado === 'cobrado' ? 'emitido' : h.estado}
                              onChange={e => {
                                const nuevoEstado = e.target.value;
                                const cambios = { estado: nuevoEstado };
                                if (nuevoEstado === 'emitido' && !h.fecha_emision)
                                  cambios.fecha_emision = new Date().toISOString().slice(0, 10);
                                update(h.id, cambios);
                              }}
                              style={{
                                background: 'transparent', border: 'none',
                                color: meta.color, fontSize: 10, fontWeight: 800,
                                cursor: 'pointer', textTransform: 'uppercase'
                              }}
                            >
                              <option value="pendiente">Pendiente</option>
                              <option value="emitido">Emitido</option>
                            </SearchableSelect>
                          </td>
                          {/* Acciones */}
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '0 6px', color: '#94a3b8' }}
                                onClick={() => { setEditing(h); setShowModal(true); }}
                                title="Editar"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '0 6px', color: '#f87171' }}
                                onClick={() => {
                                  if (window.confirm(`¿Eliminás la cuota "${h.hito}"?`))
                                    remove(h.id);
                                }}
                                title="Eliminar"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '20px 20px', color: '#475569', fontSize: 12, fontStyle: 'italic' }}>
                  Sin cuotas registradas. Hacé click en "Registrar cuota" para agregar.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!config?.honorarios_proyecto_total && !config?.honorarios_direccion_total && !config?.honorarios_admin_total && (
        <div style={{ marginTop: 20, padding: '14px 18px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, fontSize: 12, color: '#fbbf24' }}>
          ⚙ Los montos totales de honorarios no están configurados. Ir a <strong>Config</strong> para definirlos.
        </div>
      )}

      {showModal && (
        <HonorarioModal
          config={config}
          initialData={editingHonorario}
          onSave={async (data) => {
            if (editingHonorario) {
              await update(editingHonorario.id, data);
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

