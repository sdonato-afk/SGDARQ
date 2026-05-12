import React, { useState, useMemo } from 'react';
import { Database, TrendingUp, TrendingDown, X, RefreshCw, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useMovimientosMain, useProveedoresMain } from '../../hooks/useObras.js';
import { fmt } from '../../lib/calculadora.jsx';
import { ColumnFilter, useTableFilter, SearchableSelect } from '@darq/ui';

/**
 * Tab REGISTROS
 * Muestra los asientos (movimientos) registrados en el SISTEMA PRINCIPAL
 * para esta obra. Es de solo lectura — la fuente de verdad es el sistema contable.
 */
export default function TabTransacciones({ obraId }) {
  const { movimientos, loading, error, refresh } = useMovimientosMain(obraId);
  const { proveedores } = useProveedoresMain();

  const [filtroTipo, setFiltroTipo]         = useState('');   // '' | 'Ingreso' | 'Egreso'
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroMoneda, setFiltroMoneda]      = useState('');   // '' | 'ARS' | 'USD'

  const { filters, sort, setFilter, setSort, filterRows, sortRows } = useTableFilter();

  // Resolución de nombre de proveedor por ID
  const provNombre = (id) => proveedores.find(p => p.id === id)?.nombre || id || '—';

  // Categorías únicas presentes en los datos
  const categorias = useMemo(() =>
    [...new Set(movimientos.map(m => m.taxonomia_categoria_nombre || m.categoriaEgreso || m.categoria).filter(Boolean))].sort()
  , [movimientos]);

  // Movimientos filtrados
  const movFiltrados = useMemo(() => {
    let base = movimientos.filter(m => {
      const cat = m.taxonomia_categoria_nombre || m.categoriaEgreso || m.categoria;
      if (filtroTipo && m.tipo !== filtroTipo) return false;
      if (filtroCategoria && cat !== filtroCategoria) return false;
      if (filtroMoneda && m.moneda !== filtroMoneda) return false;
      return true;
    });

    const valueGetters = {
      fecha: m => m.fecha || '',
      tipo: m => m.tipo || '',
      cat: m => m.taxonomia_categoria_nombre || m.categoriaEgreso || m.categoria || m.tipoObraIngreso || '',
      rubro: m => m.taxonomia_rubro_nombre || m.rubro || '',
      concepto: m => m.taxonomia_concepto || m.concepto || '',
      prov: m => m.proveedorId ? provNombre(m.proveedorId) : (m.descripcion || m.entidad || '—')
    };

    base = filterRows(base, valueGetters);
    return sortRows(base, valueGetters, (a, b) => b.fecha.localeCompare(a.fecha));
  }, [movimientos, filtroTipo, filtroCategoria, filtroMoneda, filters, sort, proveedores]);

  // KPIs agrupados por moneda
  const kpis = useMemo(() => {
    const sum = (arr, moneda) => arr
      .filter(m => m.moneda === moneda)
      .reduce((s, m) => s + (m.monto || 0), 0);
    const ing = movFiltrados.filter(m => m.tipo === 'Ingreso');
    const egr = movFiltrados.filter(m => m.tipo === 'Egreso');
    return {
      ing_ars: sum(ing, 'ARS'), ing_usd: sum(ing, 'USD'),
      egr_ars: sum(egr, 'ARS'), egr_usd: sum(egr, 'USD'),
      bal_ars: sum(ing, 'ARS') - sum(egr, 'ARS'),
      bal_usd: sum(ing, 'USD') - sum(egr, 'USD'),
      total: movFiltrados.length,
      ingresos: ing.length,
      egresos:  egr.length,
    };
  }, [movFiltrados]);

  const fmtFecha = (iso) => {
    if (!iso) return '—';
    const p = iso.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
  };

  const hayFiltros = filtroTipo || filtroCategoria || filtroMoneda;
  const limpiarFiltros = () => { setFiltroTipo(''); setFiltroCategoria(''); setFiltroMoneda(''); };

  // ── LOADING ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
      <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ fontSize: 13 }}>Cargando asientos del sistema principal…</div>
    </div>
  );

  // ── ERROR ─────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{ padding: '32px 24px', background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Database size={16} color="#f87171" />
        <span style={{ fontWeight: 800, color: '#f87171', fontSize: 13 }}>Error al leer el sistema principal</span>
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>{error}</div>
    </div>
  );

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── HEADER ── */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#e2e8f0', letterSpacing: '-0.03em', marginBottom: 4 }}>
            📋 Registros de la obra
          </h2>
          <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Database size={11} />
            Asientos del sistema principal · solo lectura
            <span style={{ padding: '1px 8px', background: 'rgba(99,102,241,0.12)', borderRadius: 20, color: '#818cf8', fontSize: 10, fontWeight: 700 }}>
              {movimientos.length} movimientos
            </span>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="btn btn-ghost btn-sm"
          title="Forzar actualización desde el servidor (ignora caché local)"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualizar
        </button>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {/* Ingresos */}
        <div className="kpi" style={{ borderColor: 'rgba(52,211,153,0.2)', background: 'rgba(52,211,153,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <ArrowUpCircle size={14} color="#34d399" />
            <span className="kpi-label">Ingresos</span>
          </div>
          {kpis.ing_ars > 0 && <div className="kpi-value" style={{ color: '#34d399', fontSize: 20 }}>{fmt(kpis.ing_ars)}</div>}
          {kpis.ing_usd > 0 && <div style={{ fontFamily: 'monospace', fontWeight: 900, color: '#34d399', fontSize: kpis.ing_ars > 0 ? 14 : 20 }}>{fmt(kpis.ing_usd, 'USD')}</div>}
          {kpis.ing_ars === 0 && kpis.ing_usd === 0 && <div style={{ color: '#475569', fontSize: 13 }}>—</div>}
          <div className="kpi-sub">{kpis.ingresos} asiento{kpis.ingresos !== 1 ? 's' : ''}</div>
        </div>

        {/* Egresos */}
        <div className="kpi" style={{ borderColor: 'rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <ArrowDownCircle size={14} color="#f87171" />
            <span className="kpi-label">Egresos</span>
          </div>
          {kpis.egr_ars > 0 && <div className="kpi-value" style={{ color: '#f87171', fontSize: 20 }}>{fmt(kpis.egr_ars)}</div>}
          {kpis.egr_usd > 0 && <div style={{ fontFamily: 'monospace', fontWeight: 900, color: '#f87171', fontSize: kpis.egr_ars > 0 ? 14 : 20 }}>{fmt(kpis.egr_usd, 'USD')}</div>}
          {kpis.egr_ars === 0 && kpis.egr_usd === 0 && <div style={{ color: '#475569', fontSize: 13 }}>—</div>}
          <div className="kpi-sub">{kpis.egresos} asiento{kpis.egresos !== 1 ? 's' : ''}</div>
        </div>

        {/* Balance ARS */}
        <div className="kpi">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <TrendingUp size={14} color="#818cf8" />
            <span className="kpi-label">Balance</span>
          </div>
          {kpis.bal_ars !== 0 && (
            <div className="kpi-value" style={{ color: kpis.bal_ars >= 0 ? '#34d399' : '#f87171', fontSize: 20 }}>
              {fmt(kpis.bal_ars)}
            </div>
          )}
          {kpis.bal_usd !== 0 && (
            <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: kpis.bal_ars !== 0 ? 14 : 20, color: kpis.bal_usd >= 0 ? '#34d399' : '#f87171' }}>
              {fmt(kpis.bal_usd, 'USD')}
            </div>
          )}
          {kpis.bal_ars === 0 && kpis.bal_usd === 0 && <div style={{ color: '#475569', fontSize: 13 }}>—</div>}
          <div className="kpi-sub">ARS {kpis.bal_ars >= 0 ? '▲' : '▼'}</div>
        </div>
      </div>

      {/* ── FILTROS ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Tipo */}
        <div style={{ display: 'flex', gap: 4 }}>
          {['', 'Ingreso', 'Egreso'].map(tipo => (
            <button key={tipo} onClick={() => setFiltroTipo(tipo)}
              style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid',
                borderColor: filtroTipo === tipo ? (tipo === 'Ingreso' ? 'rgba(52,211,153,0.5)' : tipo === 'Egreso' ? 'rgba(248,113,113,0.5)' : 'rgba(99,102,241,0.4)') : 'rgba(255,255,255,0.07)',
                background: filtroTipo === tipo ? (tipo === 'Ingreso' ? 'rgba(52,211,153,0.1)' : tipo === 'Egreso' ? 'rgba(248,113,113,0.1)' : 'rgba(99,102,241,0.1)') : 'transparent',
                color: filtroTipo === tipo ? (tipo === 'Ingreso' ? '#34d399' : tipo === 'Egreso' ? '#f87171' : '#818cf8') : '#64748b',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
              }}>
              {tipo || 'Todos'}
            </button>
          ))}
        </div>

        {/* Moneda */}
        <div style={{ display: 'flex', gap: 4 }}>
          {['', 'ARS', 'USD'].map(m => (
            <button key={m} onClick={() => setFiltroMoneda(m)}
              style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid',
                borderColor: filtroMoneda === m ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.07)',
                background: filtroMoneda === m ? 'rgba(251,191,36,0.08)' : 'transparent',
                color: filtroMoneda === m ? '#fbbf24' : '#64748b',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
              }}>
              {m || '$ + u$d'}
            </button>
          ))}
        </div>

        {/* Categoría */}
        {categorias.length > 0 && (
          <SearchableSelect value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 12px', color: filtroCategoria ? '#e2e8f0' : '#64748b', fontSize: 11, fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </SearchableSelect>
        )}

        {/* Limpiar */}
        {hayFiltros && (
          <button onClick={limpiarFiltros}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <X size={11} /> Limpiar
          </button>
        )}

        {hayFiltros && (
          <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>
            Mostrando {movFiltrados.length} de {movimientos.length}
          </span>
        )}
      </div>

      {/* ── TABLA ── */}
      {movimientos.length === 0 ? (
        <div className="glass" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <Database size={32} style={{ marginBottom: 12, opacity: 0.2, margin: '0 auto 12px' }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>
            Sin movimientos en el sistema principal
          </div>
          <div style={{ fontSize: 12, color: '#475569', maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
            Para que aparezcan registros aquí, cargá movimientos en el área <strong style={{ color: '#818cf8' }}>Obras</strong> del sistema principal
            vinculándolos a esta obra.
          </div>
        </div>
      ) : (
        <div className="glass" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: 800 }}>
              <thead>
                <tr>
                  <th style={{ width: 90, padding: 0 }}>
                    <ColumnFilter label="Fecha" colKey="fecha" rows={movimientos} valueGetter={m => m.fecha || ''} filterState={filters.fecha} onFilterChange={setFilter} sortDir={sort.key === 'fecha' ? sort.dir : null} onSortChange={setSort} />
                  </th>
                  <th style={{ width: 80, padding: 0 }}>
                    <ColumnFilter label="Tipo" colKey="tipo" rows={movimientos} valueGetter={m => m.tipo || ''} filterState={filters.tipo} onFilterChange={setFilter} sortDir={sort.key === 'tipo' ? sort.dir : null} onSortChange={setSort} />
                  </th>
                  <th style={{ padding: 0 }}>
                    <ColumnFilter label="Categoría" colKey="cat" rows={movimientos} valueGetter={m => m.categoriaEgreso || m.categoria || m.tipoObraIngreso || ''} filterState={filters.cat} onFilterChange={setFilter} sortDir={sort.key === 'cat' ? sort.dir : null} onSortChange={setSort} />
                  </th>
                  <th style={{ padding: 0 }}>
                    <ColumnFilter label="Rubro" colKey="rubro" rows={movimientos} valueGetter={m => m.rubro || ''} filterState={filters.rubro} onFilterChange={setFilter} sortDir={sort.key === 'rubro' ? sort.dir : null} onSortChange={setSort} />
                  </th>
                  <th style={{ padding: 0 }}>
                    <ColumnFilter label="Concepto" colKey="concepto" rows={movimientos} valueGetter={m => m.concepto || ''} filterState={filters.concepto} onFilterChange={setFilter} sortDir={sort.key === 'concepto' ? sort.dir : null} onSortChange={setSort} />
                  </th>
                  <th style={{ padding: 0 }}>
                    <ColumnFilter label="Proveedor / Desc." colKey="prov" rows={movimientos} valueGetter={m => m.proveedorId ? provNombre(m.proveedorId) : (m.descripcion || m.entidad || '—')} filterState={filters.prov} onFilterChange={setFilter} sortDir={sort.key === 'prov' ? sort.dir : null} onSortChange={setSort} />
                  </th>
                  <th style={{ textAlign: 'right', width: 130 }}>Monto ARS</th>
                  <th style={{ textAlign: 'right', width: 120 }}>Monto USD</th>
                </tr>
              </thead>
              <tbody>
                {movFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                      Sin resultados para el filtro aplicado
                    </td>
                  </tr>
                ) : movFiltrados.map(m => {
                  const esIngreso = m.tipo === 'Ingreso';
                  const montoARS = m.moneda === 'ARS' ? m.monto : null;
                  const montoUSD = m.moneda === 'USD' ? m.monto : null;
                  const cat = m.taxonomia_categoria_nombre || m.categoriaEgreso || m.categoria || m.tipoObraIngreso || '';
                  const rubro = m.taxonomia_rubro_nombre || m.rubro || '';
                  const concepto = m.taxonomia_concepto || m.concepto || '';
                  const prov = m.proveedorId ? provNombre(m.proveedorId) : (m.descripcion || m.entidad || '—');
                  return (
                    <tr key={m.id} style={{ opacity: 1 }}>
                      <td style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {fmtFecha(m.fecha)}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800,
                          background: esIngreso ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                          color: esIngreso ? '#34d399' : '#f87171',
                        }}>
                          {esIngreso ? '▲' : '▼'} {m.tipo}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cat || '—'}
                      </td>
                      <td style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {rubro || '—'}
                      </td>
                      <td style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {concepto || '—'}
                      </td>
                      <td style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {prov}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                        {montoARS != null ? (
                          <span style={{ color: esIngreso ? '#34d399' : '#f87171' }}>{fmt(montoARS)}</span>
                        ) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                        {montoUSD != null ? (
                          <span style={{ color: esIngreso ? '#34d399' : '#f87171' }}>{fmt(montoUSD, 'USD')}</span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {movFiltrados.length > 0 && (
                <tfoot style={{ borderTop: '2px solid rgba(255,255,255,0.08)' }}>
                  <tr>
                    <td colSpan={6} style={{ padding: '10px 12px', fontSize: 11, color: '#64748b', fontWeight: 700 }}>
                      SUBTOTAL ({movFiltrados.length} mov.)
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      {kpis.ing_ars > 0 && <div style={{ color: '#34d399', fontSize: 12 }}>{fmt(kpis.ing_ars)}</div>}
                      {kpis.egr_ars > 0 && <div style={{ color: '#f87171', fontSize: 12 }}>{fmt(kpis.egr_ars)}</div>}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      {kpis.ing_usd > 0 && <div style={{ color: '#34d399', fontSize: 12 }}>{fmt(kpis.ing_usd, 'USD')}</div>}
                      {kpis.egr_usd > 0 && <div style={{ color: '#f87171', fontSize: 12 }}>{fmt(kpis.egr_usd, 'USD')}</div>}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
