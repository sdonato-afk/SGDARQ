import React from 'react';
import { SearchableSelect } from '@darq/ui';
import { ShoppingBag } from 'lucide-react';
import { fmt } from '../../lib/calculadora.jsx';

const CATS_GASTO = ['Materiales', 'Mano de obra', 'Equipamiento', 'Servicios', 'Otros'];
const EMPTY_GASTO = { fecha: new Date().toISOString().slice(0, 10), descripcion: '', monto: '', moneda: 'ARS', categoria: 'Materiales' };

export default function TabMisGastos({ gastosCliente, addGasto, removeGasto, tc }) {
  const [form, setForm] = React.useState(EMPTY_GASTO);
  const [saving, setSaving] = React.useState(false);
  const [confirmId, setConfirmId] = React.useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const totalARS = gastosCliente.reduce((s, g) => {
    if (g.moneda === 'ARS') return s + (parseFloat(g.monto) || 0);
    return s + ((parseFloat(g.monto) || 0) * (tc || 1));
  }, 0);

  const handleAdd = async () => {
    if (!form.descripcion || !form.monto) return;
    setSaving(true);
    await addGasto({ ...form, monto: parseFloat(form.monto) });
    setForm(EMPTY_GASTO);
    setSaving(false);
  };

  const estadoBadge = (estado) => {
    if (estado === 'validado')  return { label: 'Validado',  bg: 'rgba(52,211,153,0.12)', color: '#34d399' };
    if (estado === 'rechazado') return { label: 'Rechazado', bg: 'rgba(248,113,113,0.12)', color: '#f87171' };
    return { label: 'Pendiente', bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' };
  };

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6, color: '#fff' }}>Mis Gastos</h2>
      <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>
        Registrá compras o gastos que realizaste directamente, sin pasar por D+ARQ.
        El equipo los revisará para incluirlos en el total de inversión.
      </p>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 20, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 16 }}>
          <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Total registrado</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#e2e8f0', fontFamily: 'monospace' }}>{fmt(totalARS)}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{gastosCliente.length} gastos · equiv. ARS</div>
        </div>
        <div style={{ padding: 20, background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.1)', borderRadius: 16 }}>
          <div style={{ fontSize: 11, color: '#34d399', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Validados</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#e2e8f0' }}>{gastosCliente.filter(g => g.estado === 'validado').length}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>confirmados por D+ARQ</div>
        </div>
        <div style={{ padding: 20, background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.1)', borderRadius: 16 }}>
          <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Pendientes</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#e2e8f0' }}>{gastosCliente.filter(g => g.estado === 'pendiente').length}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>en revisión</div>
        </div>
      </div>

      {/* Formulario */}
      <div style={{ padding: 20, background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 16, marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Registrar nuevo gasto</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 4 }}>Fecha</label>
            <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)}
              style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 4 }}>Descripción</label>
            <input type="text" placeholder="Ej: Cerámicos, herrajes, plomero..." value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
              style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 4 }}>Monto</label>
            <input type="number" placeholder="0" value={form.monto} onChange={e => set('monto', e.target.value)}
              style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: 13, textAlign: 'right', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 4 }}>Moneda</label>
            <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', height: 36 }}>
              {['ARS', 'USD'].map(m => (
                <button key={m} onClick={() => set('moneda', m)} style={{
                  flex: 1, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  background: form.moneda === m ? 'rgba(99,102,241,0.3)' : 'transparent',
                  color: form.moneda === m ? '#818cf8' : '#64748b', transition: 'all 0.12s',
                }}>{m}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 4 }}>Categoría</label>
            <SearchableSelect value={form.categoria} onChange={e => set('categoria', e.target.value)}
              style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }}>
              {CATS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
            </SearchableSelect>
          </div>
        </div>
        <button onClick={handleAdd} disabled={saving || !form.descripcion || !form.monto}
          style={{ padding: '10px 24px', background: '#6366f1', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', opacity: (saving || !form.descripcion || !form.monto) ? 0.4 : 1, transition: 'opacity 0.15s' }}>
          {saving ? 'Guardando...' : '+ Registrar gasto'}
        </button>
      </div>

      {/* Lista */}
      {gastosCliente.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.01)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.06)' }}>
          <ShoppingBag size={36} style={{ opacity: 0.15, margin: '0 auto 12px', display: 'block' }} color="#fff" />
          <div style={{ fontSize: 14, color: '#475569' }}>No hay gastos registrados todavía</div>
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Fecha', 'Descripción', 'Categoría', 'Monto', 'Estado', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: h === 'Monto' ? 'right' : 'left', fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gastosCliente.map(g => {
                  const badge = estadoBadge(g.estado);
                  return (
                    <tr key={g.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{g.fecha}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{g.descripcion}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{g.categoria}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                        {fmt(parseFloat(g.monto) || 0, g.moneda)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: badge.color, background: badge.bg, borderRadius: 20, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{badge.label}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {g.estado !== 'validado' && (
                          confirmId === g.id ? (
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                              <button onClick={() => { removeGasto(g.id); setConfirmId(null); }}
                                style={{ padding: '4px 10px', background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 6, color: '#f87171', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                Confirmar
                              </button>
                              <button onClick={() => setConfirmId(null)}
                                style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, color: '#64748b', fontSize: 11, cursor: 'pointer' }}>
                                No
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmId(g.id)}
                              style={{ padding: '4px 10px', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#475569', fontSize: 11, cursor: 'pointer' }}>
                              Eliminar
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
