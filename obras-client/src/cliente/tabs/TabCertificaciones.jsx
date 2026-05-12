import React from 'react';
import { fmt } from '../../lib/calculadora.jsx';

export default function TabCertificaciones({ certificaciones }) {
  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: '#fff' }}>Certificados de Contratistas</h2>
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <th style={{ padding: '16px', textAlign: 'left',   fontSize: 12, color: '#64748b' }}>Período</th>
                <th style={{ padding: '16px', textAlign: 'left',   fontSize: 12, color: '#64748b' }}>Descripción</th>
                <th style={{ padding: '16px', textAlign: 'right',  fontSize: 12, color: '#64748b' }}>Certificado Base</th>
                <th style={{ padding: '16px', textAlign: 'right',  fontSize: 12, color: '#64748b' }}>Ajuste CAC</th>
                <th style={{ padding: '16px', textAlign: 'right',  fontSize: 12, color: '#64748b' }}>IVA</th>
                <th style={{ padding: '16px', textAlign: 'right',  fontSize: 12, color: '#64748b' }}>Total a Pagar</th>
                <th style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {certificaciones.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No hay certificados generados</td></tr>
              ) : certificaciones.map(c => {
                const certBase   = (parseFloat(c.total_sin_iva) || 0) - (parseFloat(c.monto_cac) || 0);
                const totalAPagar = (parseFloat(c.total_sin_iva) || 0) + (parseFloat(c.iva_monto) || 0);
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '16px', fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>
                      {c.periodo} <span style={{ color: '#64748b', fontSize: 11 }}>(Q{c.quincena})</span>
                    </td>
                    <td style={{ padding: '16px', fontSize: 13, color: '#94a3b8' }}>
                      {c.contratista_nombre || c.descripcion || '-'}
                      {c.factura_numero && <div style={{ fontSize: 10, color: '#818cf8', marginTop: 2 }}>Fact. {c.factura_numero}</div>}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right', fontSize: 13, fontFamily: 'monospace', color: '#94a3b8' }}>{fmt(certBase)}</td>
                    <td style={{ padding: '16px', textAlign: 'right', fontSize: 13, fontFamily: 'monospace', color: '#94a3b8' }}>{fmt(c.monto_cac)}</td>
                    <td style={{ padding: '16px', textAlign: 'right', fontSize: 13, fontFamily: 'monospace', color: '#94a3b8' }}>{fmt(c.iva_monto)}</td>
                    <td style={{ padding: '16px', textAlign: 'right', fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: c.pago_cliente_estado !== 'pagado' ? '#f87171' : '#34d399' }}>{fmt(totalAPagar)}</td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span className={`badge ${c.pago_cliente_estado === 'pagado' ? 'badge-green' : 'badge-amber'}`}>
                        {c.pago_cliente_estado === 'pagado' ? 'Pagado' : 'Pendiente'}
                      </span>
                    </td>
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
