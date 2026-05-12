import React from 'react';
import { Wallet, TrendingUp, ClipboardList } from 'lucide-react';
import { fmt } from '../../lib/calculadora.jsx';

export default function TabResumen({ R, tc, obraMain, showPagos, setShowPagos, historialPagos, certificaciones }) {
  const totalDeudaActual  = R.jueves.totalARS;
  const totalHonPendARS   = R.jueves.honARS;
  const totalCertPendARS  = R.jueves.certUSD * tc;
  const totalPdPendARS    = R.jueves.pdUSD * tc;
  const totalAdicPendARS  = R.jueves.adicUSD * tc;
  const fondoReparo       = R.cert.fondoReparo;

  return (
    <div className="fade-in">
      <h1 style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em', color: '#e2e8f0', marginBottom: 20 }}>Resumen Ejecutivo</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>

        {/* Deuda */}
        <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Wallet size={12} color="#f87171" /> Pendiente de Pago
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{fmt(totalDeudaActual)}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace' }}>{fmt(R.jueves.totalUSD, 'USD')}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { lbl: 'Pagos Directos', ars: totalPdPendARS,   usd: R.jueves.pdUSD },
              { lbl: 'Certificados',   ars: totalCertPendARS, usd: R.jueves.certUSD },
              { lbl: 'Honorarios',     ars: totalHonPendARS,  usd: totalHonPendARS / tc },
              ...(totalAdicPendARS > 0 ? [{ lbl: 'Adicionales', ars: totalAdicPendARS, usd: R.jueves.adicUSD }] : []),
            ].map(({ lbl, ars, usd }) => (
              <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>{lbl}</span>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontFamily: 'monospace', fontSize: 11 }}>{fmt(usd, 'USD')}</span>
                  <span style={{ color: '#e2e8f0', fontFamily: 'monospace', fontWeight: 600, minWidth: 90, textAlign: 'right' }}>{fmt(ars)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Avance */}
        <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={12} color="#818cf8" /> Avance Físico
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ position: 'relative', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `conic-gradient(#818cf8 ${obraMain?.porcentajeAvance || 0}%, rgba(255,255,255,0.05) 0)`, borderRadius: '50%' }}>
              <div style={{ position: 'absolute', width: 66, height: 66, background: '#030408', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{obraMain?.porcentajeAvance || 0}%</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Fondo de Reparo</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fbbf24', fontFamily: 'monospace' }}>{fmt(fondoReparo)}</div>
              <p style={{ fontSize: 10, color: '#475569', marginTop: 4, lineHeight: 1.3 }}>Retención por garantía</p>
            </div>
          </div>
        </div>
      </div>

      {/* Historial de Inversión */}
      <div style={{ padding: 24, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ClipboardList size={12} color="#34d399" /> Historial de Inversión
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
          <div>
            <button
              onClick={() => setShowPagos(s => !s)}
              style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Total Pagado a la Fecha</span>
                <span style={{ fontSize: 10, color: showPagos ? '#34d399' : '#475569', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.15s' }}>
                  {showPagos ? 'Ocultar' : 'Ver historial'}
                  <span style={{ display: 'inline-block', transform: showPagos ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                </span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#e2e8f0', fontFamily: 'monospace', letterSpacing: '-0.02em', marginBottom: 2 }}>
                {fmt(R.cert.certPagadasSinIva + certificaciones.filter(c => c.pago_cliente_estado === 'pagado').reduce((s, c) => s + (parseFloat(c.monto_cac) || 0) + (parseFloat(c.iva_monto) || 0), 0) + R.prov.pagadoARS + R.hon.cobradoARS + R.adic.pagadoTotal + R.acop.totalARS)}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace', marginBottom: 4 }}>
                {fmt(R.cert.certPagadasConIvaUSD + R.adic.pagadoUSD + R.prov.pagadoUSD + R.acop.totalUSD + R.hon.cobradoUSD, 'USD')}
              </div>
              <div style={{ fontSize: 10, color: showPagos ? '#34d399' : '#334155', fontWeight: 700, marginTop: 4, transition: 'color 0.2s' }}>
                {historialPagos.length} pagos registrados
              </div>
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#64748b' }}>Contratistas (Certificados)</span>
              <span style={{ color: '#e2e8f0', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(R.cert.certPagadasSinIva + certificaciones.filter(c => c.pago_cliente_estado === 'pagado').reduce((s, c) => s + (parseFloat(c.monto_cac) || 0) + (parseFloat(c.iva_monto) || 0), 0))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#64748b' }}>Proveedores (Compras)</span>
              <span style={{ color: '#e2e8f0', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(R.prov.pagadoARS)}</span>
            </div>
            {R.acop.totalARS > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#64748b' }}>Acopios de Materiales</span>
                <span style={{ color: '#e2e8f0', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(R.acop.totalARS)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#64748b' }}>Honorarios D+ARQ</span>
              <span style={{ color: '#e2e8f0', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(R.hon.cobradoARS)}</span>
            </div>
            {R.adic.pagadoTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#64748b' }}>Adicionales</span>
                <span style={{ color: '#e2e8f0', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(R.adic.pagadoTotal)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historial de pagos desplegable */}
      {showPagos && (
        <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Historial de Pagos</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#475569', background: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: '2px 8px' }}>{historialPagos.length} registros</span>
            </div>
            <button onClick={() => setShowPagos(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
          </div>
          {historialPagos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#475569', fontSize: 13 }}>Sin pagos registrados aún</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {['Fecha', 'Tipo', 'Detalle', 'Monto'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Monto' ? 'right' : 'left', fontSize: 9, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historialPagos.map((p, i) => (
                    <tr key={p.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.025)', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{p.fecha || '—'}</td>
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: p.color, textTransform: 'uppercase', letterSpacing: '0.06em', background: `${p.color}18`, borderRadius: 20, padding: '2px 8px' }}>{p.tipo}</span>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.detalle}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color: '#e2e8f0', whiteSpace: 'nowrap' }}>{fmt(p.monto, p.moneda)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
