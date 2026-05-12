import React from 'react';
import { Package, Check, X } from 'lucide-react';
import { fmt } from '../../lib/calculadora.jsx';

export default function TabAdicionales({ ordenes, aprobar }) {
  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: '#fff' }}>Órdenes de Cambio (Adicionales)</h2>
      {ordenes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, background: 'rgba(255,255,255,0.02)', borderRadius: 20, border: '1px dashed rgba(255,255,255,0.1)' }}>
          <Package size={40} style={{ marginBottom: 16, opacity: 0.2, margin: '0 auto' }} color="#fff" />
          <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>Sin órdenes de cambio</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>No hay solicitudes de adicionales para esta obra.</div>
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th style={{ padding: '16px', textAlign: 'left',   fontSize: 12, color: '#64748b', width: 80 }}>Nº</th>
                  <th style={{ padding: '16px', textAlign: 'left',   fontSize: 12, color: '#64748b' }}>Descripción</th>
                  <th style={{ padding: '16px', textAlign: 'right',  fontSize: 12, color: '#64748b' }}>Impacto Económico</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>Estado</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '16px', fontSize: 13, fontWeight: 800, color: '#818cf8', fontFamily: 'monospace' }}>{o.numero}</td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{o.descripcion}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        Motivo: {o.motivo?.replace('_', ' ')}
                        {o.aprobacion_fecha && <span style={{ marginLeft: 8, color: '#34d399' }}>✓ {new Date(o.aprobacion_fecha).toLocaleDateString('es-AR')}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right', fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: '#f87171' }}>
                      {fmt(o.monto_adicional, o.moneda)}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span className={`badge ${o.estado === 'aprobada_cliente' ? 'badge-green' : o.estado === 'rechazada' ? 'badge-red' : 'badge-amber'}`}>
                        {o.estado?.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      {o.estado === 'pendiente' ? (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button onClick={() => aprobar(o.id)} style={{ padding: '6px 12px', background: '#34d399', color: '#000', fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Check size={12} /> Aprobar
                          </button>
                          <button style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <X size={12} /> Rechazar
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: '#64748b' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
