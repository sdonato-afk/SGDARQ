import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Landmark, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function DirectorioBI({ movimientos, directores, cotizacionBlue }) {
  
  const metrics = useMemo(() => {
     const today = new Date();
     
     const toARS = (monto, moneda, cotiz) => (moneda === 'USD') ? Number(monto)*(cotiz || cotizacionBlue || 1200) : Number(monto);
     
     // 1. Math Global: Ingresos - Egresos
     let totalIngresos = 0;
     let totalEgresos = 0;
     let fondoReservaAgrupado = 0;

     movimientos.forEach(m => {
        // Excluimos movimientos de Directorio del cálculo de Utilidad (son los retiros)
        if (m.area === 'Directorio') return;
        
        const ars = toARS(m.monto, m.moneda, m.cotizacionHistorica || m.tipoCambioReferencia);
        const isReserva = (m.categoriaEgreso || '').toLowerCase().includes('reserva') || (m.concepto || '').toLowerCase().includes('reserva') || (m.rubro || '').toLowerCase().includes('reserva');

        if (m.tipo === 'Ingreso') totalIngresos += ars;
        else if (m.tipo === 'Egreso') {
           totalEgresos += ars;
           if (isReserva) fondoReservaAgrupado += ars;
        }
     });

     const utilidadNetaBruta = totalIngresos - totalEgresos;
     const utilidadADistribuir = utilidadNetaBruta; // Si fondoReservaAgrupado ya está en Egresos, restarlo de nuevo duplicaría. Se asume ganancia limpia.
     
     // Default 33.3%
     const participacion = utilidadADistribuir / directores.length;

     const mDir = movimientos.filter(m => m.area === 'Directorio');
     
     // Helper fonético
     const normalizeStr = (str) => {
        if (!str) return '';
        return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
     };

     // 2. Ledger per Socie
     const sociosStats = directores.map(d => {
        const dNorm = normalizeStr(d);
        const isMatch = (m) => normalizeStr(m.directorId) === dNorm || normalizeStr(m.proveedorNombre) === dNorm || normalizeStr(m.entidadCuenta) === dNorm;

        // Histórico absoluto del director
        const ingresosARS = mDir.filter(m => isMatch(m) && m.tipo === 'Ingreso').reduce((s, m) => s + toARS(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia), 0);
        const egresosARS = mDir.filter(m => isMatch(m) && m.tipo === 'Egreso').reduce((s, m) => s + toARS(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia), 0);
        
        const retiroNeto = egresosARS - ingresosARS; 
        const saldoAcumulado = participacion - retiroNeto;

        return { name: d, utilAsignada: participacion, retiroNeto, saldoAcumulado };
     });

     // 3. Extracción Mensual (Retiros por mes)
     const trend = [];
     for(let i=5; i>=0; i--) {
        const date = new Date(today);
        date.setMonth(today.getMonth() - i);
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        const k = `${yyyy}-${mm}`;
        
        const eg = mDir.filter(m => m.tipo === 'Egreso' && m.fecha.startsWith(k)).reduce((s, m) => s + toARS(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia), 0);
        const utilMesBruta = movimientos.filter(m => m.area !== 'Directorio' && m.fecha.startsWith(k)).reduce((s, m) => s + (m.tipo === 'Ingreso' ? toARS(m.monto, m.moneda, m.cotizacionHistorica) : -toARS(m.monto, m.moneda, m.cotizacionHistorica)), 0);
        
        trend.push({ month: date.toLocaleDateString('es-AR', {month: 'short'}), distribucion: eg, generacion: Math.max(0, utilMesBruta) });
     }

     return { utilidadNetaBruta, fondoReservaAgrupado, sociosStats, trend };
  }, [movimientos, directores, cotizacionBlue]);

  return (
    <div className="space-y-6">
       
       {/* Global Math Card */}
       <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
           <div>
               <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-1"><Landmark size={12}/> Compañía Consolidada</p>
               <h3 className="text-3xl font-black text-slate-800 mt-1">$ {Math.round(metrics.utilidadNetaBruta).toLocaleString()}</h3>
               <p className="text-[10px] text-slate-500 font-bold mt-1">Utilidad Neta (Ingresos Totales - Egresos OpEx/Obras)</p>
           </div>
           <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-6 text-center">
               <div>
                  <p className="darq-label">Fondo Reserva</p>
                  <p className="text-sm font-black text-slate-700">$ {Math.round(metrics.fondoReservaAgrupado).toLocaleString()}</p>
               </div>
               <div>
                  <p className="darq-label">Alicuota (x3)</p>
                  <p className="text-sm font-black text-slate-700">33.3%</p>
               </div>
           </div>
       </div>

       {/* Ledger de Socios */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metrics.sociosStats.map(s => (
             <div key={s.name} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                   <div className="text-sm font-black uppercase text-slate-800 tracking-widest">{s.name}</div>
                   <div className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-100 text-blue-700">DIR. PARTNER</div>
                </div>
                
                <div className="space-y-3 flex-1">
                   <div className="flex justify-between items-center">
                       <span className="text-[10px] font-bold text-slate-400">Utilidad Asignada (33%)</span>
                       <span className="text-xs font-black text-slate-700">$ {Math.round(s.utilAsignada).toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between items-center">
                       <span className="text-[10px] font-bold text-slate-400">Retiro Histórico</span>
                       <span className="text-xs font-black text-rose-500">- $ {Math.round(s.retiroNeto).toLocaleString()}</span>
                   </div>
                </div>

                <div className={`mt-6 pt-4 border-t ${s.saldoAcumulado >= 0 ? 'border-emerald-100 bg-emerald-50/30' : 'border-rose-100 bg-rose-50/30'} -mx-6 px-6 -mb-6 pb-6 rounded-b-3xl flex justify-between items-center`}>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Saldo Disp.</span>
                    <span className={`text-lg font-black ${s.saldoAcumulado >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        $ {Math.round(s.saldoAcumulado).toLocaleString()}
                    </span>
                </div>
             </div>
          ))}
       </div>

       {/* Trend Chart */}
       <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">Histórico de Percepción vs Generación (6m)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.trend} margin={{ top: 20, right: 0, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} tickFormatter={(val) => '$'+(val/1000).toFixed(0)+'k'} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  labelStyle={{fontWeight: '900', color: '#0f172a', marginBottom: '4px'}}
                  formatter={(value) => '$ ' + Math.round(value).toLocaleString()}
                />
                <Legend wrapperStyle={{fontSize: '10px', fontWeight: 'bold', color: '#64748b'}} />
                <Bar dataKey="generacion" name="Utilidad Generada (Empresa)" fill="#e2e8f0" radius={[6, 6, 0, 0]} barSize={30} />
                <Bar dataKey="distribucion" name="Retiro Socios (Eyectado)" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
       </div>

    </div>
  );
}
