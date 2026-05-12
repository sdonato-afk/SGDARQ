import React from 'react';
import { fmt } from '../../lib/calculadora.jsx';

export default function TabAcopios({ acopios, R }) {
  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: '#fff' }}>Acopios de Materiales</h2>
      <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>Materiales comprados y acopiados en obra antes de su uso.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 20, background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: 16 }}>
          <div style={{ fontSize: 11, color: '#f97316', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Total Acopiado</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#e2e8f0', fontFamily: 'monospace' }}>{fmt(R.acop.totalARS)}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{fmt(R.acop.totalUSD, 'USD')}</div>
        </div>
        <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Ítems registrados</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#e2e8f0' }}>{acopios.length}</div>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left',  fontSize: 12, color: '#64748b' }}>Fecha</th>
                <th style={{ padding: '14px 16px', textAlign: 'left',  fontSize: 12, color: '#64748b' }}>Material</th>
                <th style={{ padding: '14px 16px', textAlign: 'left',  fontSize: 12, color: '#64748b' }}>Proveedor</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: 12, color: '#64748b' }}>Cantidad</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: 12, color: '#64748b' }}>Precio Unit.</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: 12, color: '#64748b' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {acopios.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Sin acopios registrados</td></tr>
              ) : acopios.map(a => {
                const total = (parseFloat(a.cantidad_comprada) || 0) * (parseFloat(a.precio_unitario) || 0);
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{a.fecha_compra || '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{a.material || a.taxonomia_rubro_nombre || '—'}</div>
                      {a.taxonomia_categoria_nombre && <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{a.taxonomia_categoria_nombre}</div>}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#94a3b8' }}>{a.proveedor || '—'}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 13, fontFamily: 'monospace', color: '#94a3b8' }}>{a.cantidad_comprada} {a.unidad || ''}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 13, fontFamily: 'monospace', color: '#94a3b8' }}>{fmt(parseFloat(a.precio_unitario) || 0, a.moneda || 'ARS')}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: '#f97316' }}>{fmt(total, a.moneda || 'ARS')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
