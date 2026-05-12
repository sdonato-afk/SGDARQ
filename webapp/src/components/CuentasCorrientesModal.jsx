import React, { useState, useMemo } from 'react';
import { SearchableSelect } from '@darq/ui';
import { X, Plus, Wallet, ShieldAlert, CheckCircle2 } from 'lucide-react';


export default function CuentasCorrientesModal({ 
  isOpen, 
  onClose, 
  obra, 
  presupuestos, 
  movimientos, 
  proveedores, 
  categorias,
  onSavePresupuesto,
  onDeletePresupuesto 
}) {
  const [form, setForm] = useState({ proveedorId: '', categoria: '', rubro: '', montoUSD: '' });

  // Calculate stats for this specific Obra
  const proveedorStats = useMemo(() => {
    if (!obra) return [];
    
    // 1. Group budgets by provider
    const stats = {};
    const obraPresupuestos = presupuestos.filter(p => p.obraId === obra.id);
    
    obraPresupuestos.forEach(p => {
      if (!stats[p.proveedorId]) {
        stats[p.proveedorId] = { 
          proveedorId: p.proveedorId, 
          presupuestosTotales: 0, 
          pagado: 0, 
          detalles: [] 
        };
      }
      stats[p.proveedorId].presupuestosTotales += Number(p.montoUSD);
      stats[p.proveedorId].detalles.push({ ...p, type: 'presupuesto' });
    });

    // 2. Sum payments (Egresos for this Obra)
    const obraPagos = movimientos.filter(m => m.obraId === obra.id && m.tipo === 'Egreso' && m.proveedorId);
    
    obraPagos.forEach(m => {
      if (!stats[m.proveedorId]) {
        // If they have payments but no budget, still show them.
        stats[m.proveedorId] = { 
          proveedorId: m.proveedorId, 
          presupuestosTotales: 0, 
          pagado: 0, 
          detalles: [] 
        };
      }
      const valUSD = m.moneda === 'USD' ? m.monto : (m.monto / (m.cotizacionHistorica || m.tipoCambioReferencia || 1250));
      stats[m.proveedorId].pagado += valUSD;
      stats[m.proveedorId].detalles.push({ ...m, montoUSD: valUSD, type: 'pago' });
    });

    // 3. Compute balances
    return Object.values(stats).map(s => {
      s.saldoPendiente = s.presupuestosTotales - s.pagado;
      s.proveedorObj = proveedores.find(p => p.id === s.proveedorId);
      s.porcentajePagado = s.presupuestosTotales > 0 ? (s.pagado / s.presupuestosTotales) * 100 : (s.pagado > 0 ? 100 : 0);
      return s;
    }).sort((a,b) => b.saldoPendiente - a.saldoPendiente);
  }, [obra, presupuestos, movimientos, proveedores]);

  if (!isOpen || !obra) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.proveedorId || !form.montoUSD) return alert("Complete los datos requeridos");
    onSavePresupuesto({
      obraId: obra.id,
      proveedorId: form.proveedorId,
      categoria: form.categoria || 'Varios',
      rubro: form.rubro || 'General',
      montoUSD: Number(form.montoUSD)
    });
    setForm({ proveedorId: '', categoria: '', rubro: '', montoUSD: '' });
  };

  const totalPresupuestado = proveedorStats.reduce((a, b) => a + b.presupuestosTotales, 0);
  const totalPagado = proveedorStats.reduce((a, b) => a + b.pagado, 0);

  return (
    <div className="fixed inset-0 z-50 glass-panel/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Wallet className="text-orange-500" />
              Cuentas Corrientes - {obra.nombre}
            </h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Control de Saldo a Proveedores y Presupuestos</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors shadow-sm border border-slate-200"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-50/30 flex gap-6">
          
          {/* Main Content: Table */}
          <div className="flex-1 space-y-4">
            
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Presupuestado</div>
                    <div className="text-2xl font-black text-slate-800">u$d {Math.round(totalPresupuestado).toLocaleString()}</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Pagado</div>
                    <div className="text-2xl font-black text-emerald-600">u$d {Math.round(totalPagado).toLocaleString()}</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Compromiso de Caja (Deuda)</div>
                    <div className="text-2xl font-black text-rose-600">u$d {Math.round(totalPresupuestado - totalPagado).toLocaleString()}</div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black text-[10px] tracking-widest">
                  <tr>
                    <th className="p-3">Proveedor</th>
                    <th className="p-3 text-right">Presupuesto</th>
                    <th className="p-3 text-right">Pagado</th>
                    <th className="p-3 min-w-[120px]">Ejecución</th>
                    <th className="p-3 text-right">Saldo Deuda</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {proveedorStats.length === 0 && (
                    <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-bold">No hay presupuestos ni pagos registrados en esta obra.</td></tr>
                  )}
                  {proveedorStats.map(s => {
                    let healthColor = 'bg-emerald-500';
                    if (s.porcentajePagado >= 70) healthColor = 'bg-yellow-400';
                    if (s.porcentajePagado >= 90) healthColor = 'bg-orange-500';
                    if (s.porcentajePagado > 100) healthColor = 'bg-rose-600';

                    return (
                    <tr key={s.proveedorId} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-3 font-bold text-slate-800">{s.proveedorObj?.nombre || 'Proveedor Eliminado'}</td>
                      <td className="p-3 text-right font-black text-slate-600">u$d {Math.round(s.presupuestosTotales).toLocaleString()}</td>
                      <td className="p-3 text-right font-black text-emerald-600">u$d {Math.round(s.pagado).toLocaleString()}</td>
                      <td className="p-3">
                         <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-[10px] font-black text-slate-400">
                               <span>{s.porcentajePagado.toFixed(1)}%</span>
                               {s.porcentajePagado > 100 && <ShieldAlert size={10} className="text-rose-500" />}
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div className={`${healthColor} h-1.5 rounded-full transition-all`} style={{width: `${Math.min(s.porcentajePagado, 100)}%`}}></div>
                            </div>
                         </div>
                      </td>
                      <td className={`p-3 text-right font-black ${s.saldoPendiente < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                        u$d {Math.round(s.saldoPendiente).toLocaleString()}
                      </td>
                      <td className="p-3 text-right">
                         {/* Simple toggle to view details in the future */}
                         {s.porcentajePagado > 100 && <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Sobregiro</span>}
                         {s.porcentajePagado === 100 && s.saldoPendiente === 0 && <span className="text-emerald-500"><CheckCircle2 size={14} /></span>}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
            
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-indigo-800 text-xs font-bold flex gap-2">
                <ShieldAlert size={16} className="text-indigo-600 shrink-0" />
                <p>Las alertas de sobregiro se activarán automáticamente si intentás cargar un pago que supere el saldo pendiente de deuda de un proveedor presupuestado.</p>
            </div>
          </div>

          {/* Sidebar: Add Presupuesto */}
          <div className="w-80 flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-black text-slate-800 mb-4 text-sm flex items-center gap-2">
                <Plus size={16} className="text-orange-500" />
                Cargar Presupuesto
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Proveedor</label>
                  <SearchableSelect 
                    required 
                    value={form.proveedorId} 
                    onChange={e => setForm({...form, proveedorId: e.target.value})} 
                    options={proveedores.map(p => ({ value: p.id, label: p.nombre }))}
                    placeholder="-- Seleccionar --"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Categoría (Opcional)</label>
                  <SearchableSelect 
                    value={form.categoria} 
                    onChange={e => setForm({...form, categoria: e.target.value})} 
                    options={categorias ? Object.keys(categorias).map(c => ({ value: c, label: c })) : []}
                    placeholder="-- Global --"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 text-xs font-bold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Monto Fijo Presupuestado (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">u$d</span>
                    <input type="number" step="0.01" required value={form.montoUSD} onChange={e => setForm({...form, montoUSD: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-black outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="0.00" />
                  </div>
                </div>

                <button type="submit" className="w-full glass-panel text-white font-black uppercase text-[10px] tracking-widest py-3 rounded-xl hover:glass-card transition-colors mt-2">
                  Guardar Presupuesto
                </button>
              </form>
            </div>
            
            {/* List of unlinked budgets could go here */}
            {presupuestos.filter(p => p.obraId === obra.id).length > 0 && (
                <div className="glass-card rounded-2xl p-4 text-white">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Historial de Presupuestos Cargados</h4>
                    <ul className="space-y-2 max-h-48 overflow-auto custom-scrollbar pr-1">
                       {presupuestos.filter(p => p.obraId === obra.id).map(p => (
                          <li key={p.id} className="text-xs bg-white/10 p-2 rounded-lg flex justify-between items-center">
                             <span className="font-bold truncate" title={proveedores.find(pv => pv.id === p.proveedorId)?.nombre}>
                                {proveedores.find(pv => pv.id === p.proveedorId)?.nombre?.split(' ')[0] || 'Prov'}
                             </span>
                             <div className="flex items-center gap-2">
                                <span className="font-black text-emerald-400">u$d {p.montoUSD}</span>
                                <button onClick={() => onDeletePresupuesto(p.id)} className="text-slate-500 hover:text-rose-400"><X size={12} /></button>
                             </div>
                          </li>
                       ))}
                    </ul>
                </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
