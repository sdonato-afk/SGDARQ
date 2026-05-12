import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Briefcase, TrendingDown, Clock, Calculator } from 'lucide-react';

export default function OficinaBI({ movimientos, cotizacionBlue }) {
  
  const metrics = useMemo(() => {
     const today = new Date();
     
     // Helper conversion to ARS
     const toARS = (monto, moneda, cotiz) => (moneda === 'USD') ? Number(monto)*(cotiz || cotizacionBlue || 1200) : Number(monto);

     // 1. Weekly Burn Rate (OpEx)
     const fourWeeksAgo = new Date(today);
     fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
     
     const mOficina = movimientos.filter(m => m.area === 'Oficina' && m.tipo === 'Egreso');
     
     let burnRateARS = 0;
     mOficina.filter(m => new Date(m.fecha) >= fourWeeksAgo).forEach(m => burnRateARS += toARS(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia));
     burnRateARS = burnRateARS / 4; // weekly

     // 2. Historic OpEx Categorization
     const currentYearStr = String(today.getFullYear());
     const catTotales = {};
     mOficina.filter(m => m.fecha.startsWith(currentYearStr)).forEach(m => {
        const c = m.categoriaEgreso || 'VARIOS';
        catTotales[c] = (catTotales[c] || 0) + toARS(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia);
     });

     const ratioEstructural = Object.entries(catTotales).map(([c, v]) => ({
        name: c,
        value: v
     })).sort((a,b) => b.value - a.value);

     // 3. Heatmap Data (Last 6 Months progression)
     const heatmap = [];
     for(let i=5; i>=0; i--) {
        const d = new Date(today);
        d.setMonth(today.getMonth() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const monthKey = `${yyyy}-${mm}`;
        
        const mMes = mOficina.filter(m => m.fecha.startsWith(monthKey));
        const totalGasto = mMes.reduce((s, m) => s + toARS(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia), 0);
        
        heatmap.push({
           month: d.toLocaleDateString('es-AR', {month: 'short'}),
           gasto: totalGasto
        });
     }

     return { burnRateARS, ratioEstructural, heatmap };
  }, [movimientos]);

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
             <div>
               <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center gap-1"><TrendingDown size={12}/> Burn Rate (OpEx)</div>
               <div className="text-4xl font-black text-rose-500">$ {Math.round(metrics.burnRateARS).toLocaleString()}</div>
               <div className="darq-value text-slate-500 mt-1">Gasto estructural operativo semanal ARS</div>
             </div>
             <div className="p-4 bg-rose-50 rounded-2xl"><Clock className="text-rose-400" size={32}/></div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
             <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center gap-1"><Calculator size={12}/> Ratio de Carga (Top 3)</div>
             <div className="mt-3 space-y-3">
                {metrics.ratioEstructural.slice(0, 3).map((r, i) => (
                   <div key={r.name} className="flex justify-between items-center text-sm font-black text-slate-700">
                      <div className="flex gap-2 items-center"><span className="text-slate-300">#{i+1}</span> <span>{r.name}</span></div>
                      <span>$ {Math.round(r.value).toLocaleString()}</span>
                   </div>
                ))}
             </div>
          </div>
       </div>

       <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2"><Briefcase className="text-blue-500"/> Heatmap OpEx (Últimos 6 Meses)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.heatmap} margin={{ top: 20, right: 0, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} textAnchor="middle" />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} tickFormatter={(val) => '$'+(val/1000).toFixed(0)+'k'} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  labelStyle={{fontWeight: '900', color: '#0f172a', marginBottom: '4px'}}
                  formatter={(value) => '$ ' + Math.round(value).toLocaleString()}
                />
                <Bar dataKey="gasto" radius={[6, 6, 0, 0]} barSize={50}>
                   {metrics.heatmap.map((entry, index) => {
                      let color = '#3b82f6';
                      // Highlight highest spending month as 'hot'
                      const max = Math.max(...metrics.heatmap.map(h => h.gasto));
                      if (entry.gasto === max) color = '#f43f5e';
                      return <Cell key={`cell-${index}`} fill={color} />;
                   })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
       </div>

    </div>
  );
}
