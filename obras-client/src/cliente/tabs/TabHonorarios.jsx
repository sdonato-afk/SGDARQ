import React from 'react';
import { fmt } from '../../lib/calculadora.jsx';

export default function TabHonorarios({ honClienteSafe }) {
  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: '#fff' }}>Liquidaciones de Honorarios</h2>
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <th style={{ padding: '16px', textAlign: 'left',   fontSize: 12, color: '#64748b' }}>Fecha</th>
                <th style={{ padding: '16px', textAlign: 'left',   fontSize: 12, color: '#64748b' }}>Tipo</th>
                <th style={{ padding: '16px', textAlign: 'left',   fontSize: 12, color: '#64748b' }}>Descripción</th>
                <th style={{ padding: '16px', textAlign: 'right',  fontSize: 12, color: '#64748b' }}>A Pagar</th>
                <th style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {honClienteSafe.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No hay honorarios liquidados</td></tr>
              ) : honClienteSafe.map(h => (
                <tr key={h.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '16px', fontSize: 13, color: '#94a3b8' }}>{h.fecha_emision || h.fecha || '—'}</td>
                  <td style={{ padding: '16px', fontSize: 13, fontWeight: 600, color: '#818cf8' }}>{h.tipo?.replace('_', ' ').toUpperCase()}</td>
                  <td style={{ padding: '16px', fontSize: 13, color: '#94a3b8' }}>{h.hito || h.descripcion || '-'}</td>
                  <td style={{ padding: '16px', textAlign: 'right', fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: h.estado === 'cobrado' ? '#34d399' : '#fbbf24' }}>
                    {fmt(h.monto, 'USD')}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span className={`badge ${h.estado === 'cobrado' ? 'badge-green' : 'badge-amber'}`}>
                      {h.estado === 'cobrado' ? 'Cobrado' : 'Emitido'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
