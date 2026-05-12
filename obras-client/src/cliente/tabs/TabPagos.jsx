import React from 'react';
import { FileText, Download } from 'lucide-react';
import { fmt } from '../../lib/calculadora.jsx';
import { openPDF, downloadPDF } from '../../components/ComprobanteUploader.jsx';

export default function TabPagos({ factSinContrat }) {
  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, color: '#fff' }}>Facturas de Proveedores</h2>
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>Fecha</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>Proveedor</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>Descripción</th>
                <th style={{ padding: '16px', textAlign: 'right', fontSize: 12, color: '#64748b' }}>Monto</th>
                <th style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>Estado</th>
                <th style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>PDF</th>
              </tr>
            </thead>
            <tbody>
              {factSinContrat.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No hay pagos directos registrados</td></tr>
              ) : factSinContrat.map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '16px', fontSize: 13, color: '#94a3b8' }}>{f.fecha}</td>
                  <td style={{ padding: '16px', fontSize: 14, fontWeight: 600 }}>{f.razon_social || f.proveedor || '—'}</td>
                  <td style={{ padding: '16px', fontSize: 13, color: '#94a3b8' }}>{f.notas || f.categoria || '—'}</td>
                  <td style={{ padding: '16px', textAlign: 'right', fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: !f.pagado ? '#f87171' : '#34d399' }}>
                    {fmt(parseFloat(f.monto) || 0, f.moneda || 'ARS')}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span className={`badge ${f.pagado ? 'badge-green' : 'badge-amber'}`}>{f.pagado ? 'Pagado' : 'Pendiente'}</span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    {f.pdf_b64 ? (
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button onClick={() => openPDF(f.pdf_b64)} style={{ background: 'rgba(56,189,248,0.1)', border: 'none', cursor: 'pointer', color: '#38bdf8', borderRadius: 6, padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <FileText size={11} /> Ver
                        </button>
                        <button onClick={() => downloadPDF(f.pdf_b64, f.pdf_name)} style={{ background: 'rgba(52,211,153,0.1)', border: 'none', cursor: 'pointer', color: '#34d399', borderRadius: 6, padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Download size={11} /> Bajar
                        </button>
                      </div>
                    ) : <span style={{ color: '#334155', fontSize: 10 }}>—</span>}
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
