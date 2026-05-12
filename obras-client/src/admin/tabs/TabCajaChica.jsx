import React, { useState, useEffect } from 'react';
import { Plus, Wallet, ChevronDown, ChevronUp, Trash2, RefreshCw } from 'lucide-react';
import { useCajaChica, useMovimientosMain } from '../../hooks/useObras.js';
import { fmt } from '../../lib/calculadora.jsx';
import { KPICard, SectionHeader, SearchableSelect } from '@darq/ui';
import CajaChicaModal from './cajachica/CajaChicaModal.jsx';

export default function TabCajaChica({ obraId, config }) {
  const { rendiciones, loading, add, update, remove } = useCajaChica(obraId);
  const { movimientos: movsMain } = useMovimientosMain(obraId);
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [tc, setTc] = useState(null);
  const [fetchingTc, setFetchingTc] = useState(false);

  const fondoRaw    = config?.caja_chica_fondo ?? config?.caja_chica_fondo_usd ?? 4000;
  const fondoMoneda = config?.caja_chica_moneda ?? 'USD';
  const markupSinComp = config?.caja_chica_sin_comprobante_pct ?? 30;
  const feeMat = config?.fee_gestion_pct ?? 12;
  const logMoneda = config?.logistica_moneda || 'USD';

  // Fetch TC automático (blue venta × 0.95)
  const fetchTc = async () => {
    setFetchingTc(true);
    try {
      const res = await fetch('https://dolarapi.com/v1/dolares/blue');
      const data = await res.json();
      const blueVenta = data.venta;
      setTc(Math.round(blueVenta * 0.95));
    } catch {
      setTc(null);
    }
    setFetchingTc(false);
  };

  useEffect(() => { fetchTc(); }, []);

  // Balance: misma lógica que el KPI de Visión General
  // Logística calculada automáticamente: semanas activas × tarifa del config
  const tcVal = tc || 1;
  const movToUSD = (m) => m.moneda === 'USD' ? (parseFloat(m.monto) || 0) : (parseFloat(m.monto) || 0) / tcVal;
  const movToARS = (m) => m.moneda === 'ARS' ? (parseFloat(m.monto) || 0) : 0;
  const egresosObra    = movsMain.filter(m => m.tipo === 'Egreso');
  const egresosUSD     = egresosObra.reduce((s, m) => s + movToUSD(m), 0);
  const egresosARS     = egresosObra.reduce((s, m) => s + movToARS(m), 0);
  const semanasActivas    = new Set(rendiciones.map(r => r.semana).filter(Boolean)).size;
  const totLogisticaNativo = semanasActivas * (config?.logistica_semanal || 0);
  const totLogistica = logMoneda === 'ARS' ? totLogisticaNativo / tcVal : totLogisticaNativo;
  const totLogARS    = logMoneda === 'ARS' ? totLogisticaNativo : totLogisticaNativo * tcVal;
  const totalAdelantadoUSD = egresosUSD + totLogistica;
  const totalAdelantadoARS = egresosARS + totLogARS;
  const balanceFondo = fondoMoneda === 'ARS'
    ? fondoRaw - totalAdelantadoARS
    : fondoRaw - totalAdelantadoUSD;

  const totalGastado = rendiciones.reduce((s, r) => s + (r.total_precio_cliente || 0), 0);
  const totalReposicion = rendiciones
    .filter(r => r.estado !== 'repuesta')
    .reduce((s, r) => s + (r.reposicion_ars || 0), 0);
  const rendicionesAbiertas = rendiciones.filter(r => r.estado === 'abierta').length;
  const rendicionesRendidas = rendiciones.filter(r => r.estado === 'rendida').length;

  return (
    <div>
      {/* TC Banner */}
      <div style={{ marginBottom: 20, padding: '12px 18px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tipo de cambio efectivo</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>Blue venta (El Cronista) × 0.95</div>
          </div>
          {tc ? (
            <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 22, color: '#fbbf24' }}>
              $ {tc.toLocaleString('es-AR')}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#64748b' }}>{fetchingTc ? 'Consultando...' : 'No disponible'}</div>
          )}
          <button onClick={fetchTc} className="btn btn-ghost btn-sm" disabled={fetchingTc}>
            <RefreshCw size={12} /> Actualizar
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
              {fondoMoneda === 'ARS' ? 'Fondo en ARS' : 'Fondo en USD'}
            </div>
            <div style={{ fontWeight: 800, color: '#e2e8f0', fontFamily: 'monospace' }}>
              {fondoMoneda === 'ARS'
                ? `$ ${fondoRaw.toLocaleString('es-AR')}`
                : `u$d ${fondoRaw.toLocaleString('es-AR')}`}
            </div>
          </div>
          {fondoMoneda === 'USD' && tc && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Equivalente ARS</div>
              <div style={{ fontWeight: 900, color: '#34d399', fontFamily: 'monospace', fontSize: 18 }}>
                $ {(fondoRaw * tc).toLocaleString('es-AR')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <KPICard label="Balance Fondo" value={fmt(balanceFondo, fondoMoneda)} sub={`Fondo: ${fmt(fondoRaw, fondoMoneda)}`} color={balanceFondo >= 0 ? '#34d399' : '#f87171'} borderColor={balanceFondo >= 0 ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'} />
        <KPICard label="Total Gastado" value={fmt(totalGastado)} sub={`${rendiciones.length} rendiciones`} color="#f87171" />
        <KPICard label="Pendiente Reposición" value={fmt(totalReposicion)} sub={`${rendicionesRendidas} rendidas`} color="#fbbf24" borderColor="rgba(251,191,36,0.2)" />
        <KPICard label="Markup sin comprobante" value={`${markupSinComp}%`} sub="Fee gastos informales" color="#34d399" borderColor="rgba(52,211,153,0.2)" />
      </div>

      {/* Toolbar */}
      <SectionHeader
        title="Rendiciones Semanales"
        ActionIcon={Plus}
        actionLabel="Nueva rendición"
        onAction={() => setShowModal(true)}
      />

      {/* Lista de rendiciones */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Cargando...</div>
      ) : rendiciones.length === 0 ? (
        <div className="glass" style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
          <Wallet size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 12 }}>Sin rendiciones. Registrá la primera semana de caja chica.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rendiciones.map(r => {
            const isExpanded = expandedId === r.id;
            const estadoColor = r.estado === 'repuesta' ? '#34d399' : r.estado === 'rendida' ? '#818cf8' : '#fbbf24';
            const estadoLabel = r.estado === 'repuesta' ? 'Repuesta' : r.estado === 'rendida' ? 'Rendida' : 'Abierta';

            return (
              <div key={r.id} className="glass" style={{ overflow: 'hidden' }}>
                {/* Row header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 12 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#e2e8f0' }}>Semana {r.semana}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{r.items?.length || 0} ítems · {r.fecha_rendicion || 'Sin fecha'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Gasto declarado</div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#f87171' }}>{fmt(r.total_precio_cliente)}</div>
                    </div>
                    {r.reposicion_ars > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Reposición</div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 900, color: '#34d399' }}>{fmt(r.reposicion_ars)}</div>
                        {r.tc_rendicion && <div style={{ fontSize: 9, color: '#64748b' }}>TC ${r.tc_rendicion}</div>}
                      </div>
                    )}
                    <SearchableSelect
                      value={r.estado}
                      onChange={e => update(r.id, { estado: e.target.value })}
                      onClick={e => e.stopPropagation()}
                      style={{ background: 'transparent', border: 'none', color: estadoColor, fontSize: 10, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase' }}
                    >
                      <option value="abierta">Abierta</option>
                      <option value="rendida">Rendida</option>
                      <option value="repuesta">Repuesta</option>
                    </SearchableSelect>
                    {isExpanded ? <ChevronUp size={14} color="#64748b" /> : <ChevronDown size={14} color="#64748b" />}
                  </div>
                </div>

                {/* Items expandidos */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {r.items?.length > 0 ? (
                      <table className="table" style={{ margin: 0 }}>
                        <thead>
                          <tr>
                            <th>Descripción</th>
                            <th>Tipo</th>
                            <th>Categoría / Rubro</th>
                            <th style={{ textAlign: 'right', color: '#f87171' }}>Costo real ★</th>
                            <th style={{ textAlign: 'right', color: '#34d399' }}>Precio cliente</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.items.map((item, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 600 }}>{item.descripcion}</td>
                              <td>
                                <span className={`badge ${item.tipo === 'con_factura' ? 'badge-blue' : 'badge-amber'}`}>
                                  {item.tipo === 'con_factura' ? '🧾 Con factura' : '📋 Sin comprobante'}
                                </span>
                              </td>
                              <td style={{ fontSize: 11 }}>
                                {item.taxonomia_rubro_nombre ? (
                                  <div>
                                    <div style={{ color: '#818cf8', fontWeight: 700, fontSize: 10 }}>{item.taxonomia_categoria_nombre}</div>
                                    <div style={{ color: '#94a3b8' }}>{item.taxonomia_rubro_nombre}</div>
                                    {item.taxonomia_concepto && <div style={{ color: '#64748b', fontSize: 10 }}>{item.taxonomia_concepto}</div>}
                                  </div>
                                ) : <span style={{ color: '#334155' }}>—</span>}
                              </td>
                              <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#f87171' }}>{fmt(item.costo_real)}</td>
                              <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#34d399' }}>{fmt(item.precio_cliente)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ padding: 20, color: '#64748b', fontSize: 12 }}>Sin ítems cargados.</div>
                    )}
                    {r.nota && (
                      <div style={{ padding: '10px 20px', fontSize: 12, color: '#64748b', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        Nota: {r.nota}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <CajaChicaModal
          config={config}
          tcSugerido={tc}
          onSave={async (data) => { await add(data); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
