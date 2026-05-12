import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Database } from 'lucide-react';
import { useMovimientosMain, useProveedoresMain } from '../hooks/useObras.js';
import { fmt } from '../lib/calculadora.jsx';

/**
 * Panel de solo lectura que muestra los movimientos del sistema principal
 * para una obra, agrupados por proveedor.
 * Muestra: Proveedor + Total ARS + Total USD (colapsable)
 */
export default function MovimientosPrincipalPanel({ obraId }) {
  const { movimientos, loading, error } = useMovimientosMain(obraId);
  const { proveedores } = useProveedoresMain();
  const [expanded, setExpanded] = useState({});


  const provNombre = (id) => proveedores.find(p => p.id === id)?.nombre || id || 'Sin proveedor';

  // Agrupar egresos por proveedor
  const porProveedor = useMemo(() => {
    const egresos = movimientos.filter(m => m.tipo === 'Egreso');
    const map = {};

    egresos.forEach(m => {
      const key = m.proveedorId || '__sin_prov__';
      if (!map[key]) map[key] = { movimientos: [], totalARS: 0, totalUSD: 0 };
      const monto = Number(m.monto) || 0;
      if (m.moneda === 'USD') {
        map[key].totalUSD += monto;
      } else {
        map[key].totalARS += monto;
      }
      map[key].movimientos.push(m);
    });

    return Object.entries(map)
      .map(([provId, data]) => ({ provId, nombre: provNombre(provId), ...data }))
      .sort((a, b) => (b.totalARS + b.totalUSD * 1000) - (a.totalARS + a.totalUSD * 1000));
  }, [movimientos, proveedores]);

  // Ingresos del sistema principal
  const ingresos = useMemo(() => {
    return movimientos
      .filter(m => m.tipo === 'Ingreso')
      .reduce((acc, m) => {
        const monto = Number(m.monto) || 0;
        if (m.moneda === 'USD') acc.usd += monto; else acc.ars += monto;
        return acc;
      }, { ars: 0, usd: 0 });
  }, [movimientos]);

  if (loading) return (
    <div style={{ marginTop: 28, padding: '14px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Database size={13} color="#6366f1" />
        <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Sistema principal · Cargando...
        </span>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ marginTop: 28, padding: '14px 20px', background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Database size={13} color="#f87171" />
        <span style={{ fontSize: 11, fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Sistema principal · Error de acceso
        </span>
      </div>
      <div style={{ fontSize: 10, color: '#64748b', marginTop: 6, fontFamily: 'monospace' }}>{error}</div>
    </div>
  );

  const toggle = (key) => setExpanded(e => ({ ...e, [key]: !e[key] }));


  return (
    <div style={{ marginTop: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Database size={13} color="#6366f1" />
        <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Sistema principal · Movimientos sincronizados
        </span>
        <span style={{ fontSize: 10, color: '#334155', marginLeft: 4 }}>
          ({movimientos.length} registros · solo lectura)
        </span>
      </div>

      {movimientos.length === 0 && (
        <div style={{ padding: '20px 20px', background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: 12, color: '#475569', fontSize: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Sin movimientos vinculados</div>
          <div style={{ fontSize: 11, lineHeight: 1.6 }}>
            No hay movimientos registrados en el sistema principal para esta obra.<br />
            Cargalos desde <strong>Área Obras → Tesorería</strong> usando el campo <strong>Obra</strong> en cada movimiento.
          </div>
        </div>
      )}


      {/* KPI ingresos rápidos */}
      {(ingresos.ars > 0 || ingresos.usd > 0) && (
        <div style={{ marginBottom: 12, padding: '8px 14px', background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 10, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#34d399', textTransform: 'uppercase' }}>Ingresos registrados</span>
          {ingresos.ars > 0 && <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#34d399' }}>{fmt(ingresos.ars)}</span>}
          {ingresos.usd > 0 && <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#34d399' }}>u$d {ingresos.usd.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>}
        </div>
      )}

      {/* Lista por proveedor */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {porProveedor.map(({ provId, nombre, movimientos: movs, totalARS, totalUSD }) => {
          const isOpen = expanded[provId];
          return (
            <div key={provId} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
              {/* Row colapsable */}
              <div
                onClick={() => toggle(provId)}
                style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
              >
                {isOpen
                  ? <ChevronDown size={13} color="#475569" />
                  : <ChevronRight size={13} color="#475569" />
                }
                <span style={{ fontWeight: 700, fontSize: 13, color: '#cbd5e1', flex: 1 }}>{nombre}</span>
                <span style={{ fontSize: 10, color: '#475569', marginRight: 12 }}>{movs.length} mov.</span>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {totalARS > 0 && (
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#f87171', fontSize: 13 }}>
                      {fmt(totalARS)}
                    </span>
                  )}
                  {totalUSD > 0 && (
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#f87171', fontSize: 13 }}>
                      u$d {totalUSD.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>

              {/* Detalle expandido */}
              {isOpen && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ padding: '6px 16px', textAlign: 'left', color: '#475569', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fecha</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: '#475569', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Concepto</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: '#475569', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rubro</th>
                        <th style={{ padding: '6px 16px', textAlign: 'right', color: '#475569', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movs.map(m => (
                        <tr key={m.id} style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '6px 16px', color: '#64748b', fontSize: 11 }}>{m.fecha}</td>
                          <td style={{ padding: '6px 8px', color: '#94a3b8', fontSize: 11 }}>{m.concepto || '—'}</td>
                          <td style={{ padding: '6px 8px', color: '#64748b', fontSize: 10 }}>{m.rubro || '—'}</td>
                          <td style={{ padding: '6px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#f87171', fontSize: 11 }}>
                            {m.moneda === 'USD' ? 'u$d ' : '$ '}
                            {Number(m.monto).toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
