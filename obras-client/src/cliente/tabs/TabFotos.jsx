import React from 'react';
import { Camera, Clock } from 'lucide-react';

export default function TabFotos({ fotos }) {
  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: '#fff' }}>Bitácora Visual</h2>
      {fotos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, background: 'rgba(255,255,255,0.02)', borderRadius: 20, border: '1px dashed rgba(255,255,255,0.1)' }}>
          <Camera size={40} style={{ marginBottom: 16, opacity: 0.2, margin: '0 auto' }} color="#fff" />
          <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>Sin fotos publicadas</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>Aún no hay avances visuales registrados en esta obra.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {fotos.map(f => (
            <div key={f.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: '100%', paddingTop: '75%', position: 'relative' }}>
                <img src={f.url} alt={f.descripcion} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
              </div>
              <div style={{ padding: '16px' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0', marginBottom: 6 }}>{f.descripcion}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={11} /> {f.fecha}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
