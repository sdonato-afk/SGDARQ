import React from 'react';
import { fmt } from '../../lib/calculadora.jsx';

export default function TabCajaChica({ rendiciones, R }) {
  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: '#fff' }}>Rendiciones de Caja Chica</h2>
      <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>Gastos menores realizados en obra que requieren reposición.</p>

      {/* KPI Balance — mismo cálculo que el admin */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 24 }}>
        <div style={{ padding: 20, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: 16 }}>
          <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Fondo Asignado</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#e2e8f0', fontFamily: 'monospace' }}>{fmt(R.cajaChica.fondoRaw, R.cajaChica.moneda)}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{rendiciones.length} rendiciones registradas</div>
        </div>
        <div style={{ padding: 20, background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.1)', borderRadius: 16 }}>
          <div style={{ fontSize: 11, color: '#f87171', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Total Adelantado</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#e2e8f0', fontFamily: 'monospace' }}>
            {fmt(R.cajaChica.moneda === 'ARS' ? R.adelantados.totalARS : R.adelantados.totalUSD, R.cajaChica.moneda)}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Egresos + logística acumulada</div>
        </div>
        <div style={{
          padding: 20,
          background: R.cajaChica.balance >= 0 ? 'rgba(52,211,153,0.05)' : 'rgba(248,113,113,0.05)',
          border: `1px solid ${R.cajaChica.balance >= 0 ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)'}`,
          borderRadius: 16,
        }}>
          <div style={{ fontSize: 11, color: R.cajaChica.balance >= 0 ? '#34d399' : '#f87171', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Balance Disponible</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: R.cajaChica.balance >= 0 ? '#34d399' : '#f87171', fontFamily: 'monospace' }}>
            {fmt(R.cajaChica.balance, R.cajaChica.moneda)}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            {rendiciones.filter(r => r.estado !== 'repuesta' && r.estado !== 'liquidada').length} rendiciones pendientes de reposición
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <th style={{ padding: '16px', textAlign: 'left',   fontSize: 12, color: '#64748b' }}>Semana/Período</th>
                <th style={{ padding: '16px', textAlign: 'left',   fontSize: 12, color: '#64748b' }}>Responsable</th>
                <th style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>Cant. Tickets</th>
                <th style={{ padding: '16px', textAlign: 'right',  fontSize: 12, color: '#64748b' }}>A Reponer</th>
                <th style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rendiciones.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No hay rendiciones de caja chica</td></tr>
              ) : rendiciones.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '16px', fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{r.semana}</td>
                  <td style={{ padding: '16px', fontSize: 13, color: '#94a3b8' }}>{r.responsable || 'Estudio'}</td>
                  <td style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>{r.items?.length || 0}</td>
                  <td style={{ padding: '16px', textAlign: 'right', fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: (r.estado !== 'reintegrada' && r.estado !== 'liquidada') ? '#f87171' : '#34d399' }}>
                    {fmt(r.total_precio_cliente || r.reposicion_ars || 0)}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span className={`badge ${r.estado === 'reintegrada' || r.estado === 'liquidada' ? 'badge-green' : 'badge-amber'}`}>
                      {r.estado === 'reintegrada' || r.estado === 'liquidada' ? 'Repuesto' : 'Pendiente'}
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
