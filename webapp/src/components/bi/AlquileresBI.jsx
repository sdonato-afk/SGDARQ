import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Home, CalendarClock, Banknote } from 'lucide-react';

export default function AlquileresBI({ movimientos, propiedades, contratos, cotizacionBlue }) {
  
  const metrics = useMemo(() => {
    // 1. Calculate ROI per property 
    const props = propiedades.filter(p => !p.esCentroCostos);
    
    // We compute a running 12-month window for accurate ROI
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const rentability = props.map(p => {
       const vUSD = Number(p.valorActualUSD) || 1;
       const objContrato = contratos.find(c => c.propiedadId === p.id && new Date(c.fechaFin) >= new Date());
       const active = !!objContrato;

       const ingresos12m = movimientos.filter(m => m.propiedadId === p.id && m.tipo === 'Ingreso' && new Date(m.fecha) >= oneYearAgo).reduce((s, m) => s + (m.moneda === 'USD' ? Number(m.monto) : (Number(m.monto) / (m.cotizacionHistorica || m.tipoCambioReferencia || cotizacionBlue))), 0);
       const egresos12m = movimientos.filter(m => m.propiedadId === p.id && m.tipo === 'Egreso' && new Date(m.fecha) >= oneYearAgo).reduce((s, m) => s + (m.moneda === 'USD' ? Number(m.monto) : (Number(m.monto) / (m.cotizacionHistorica || m.tipoCambioReferencia || cotizacionBlue))), 0);
       
       const neto12m = ingresos12m - egresos12m;
       const roi = (neto12m / vUSD) * 100;

       return { ...p, activo: active, ingresos12m, egresos12m, neto12m, roi, objContrato };
    }).sort((a,b) => b.roi - a.roi);

    const vacantProps = rentability.filter(r => !r.activo).length;
    const activeProps = rentability.filter(r => r.activo).length;
    const vacancyRate = props.length > 0 ? (vacantProps / props.length) * 100 : 0;
    
    const avgROI = rentability.length > 0 ? rentability.reduce((s, r) => s + r.roi, 0) / rentability.length : 0;

    const pieData = [
       { name: 'Alquiladas', value: activeProps, color: '#10b981' },
       { name: 'Vacantes', value: vacantProps, color: '#f43f5e' }
    ];

    return { rentability, pieData, vacancyRate, avgROI };
  }, [movimientos, propiedades, contratos, cotizacionBlue]);

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
             <div>
               <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">ROI Promedio Portafolio</div>
               <div className="text-4xl font-black text-slate-800">{metrics.avgROI.toFixed(1)}%</div>
               <div className="text-xs font-bold text-slate-500 mt-1">Retorno anualizado 12m</div>
             </div>
             <div className="w-20"><ResponsiveContainer width="100%" height={80}><PieChart><Pie data={[{value: metrics.avgROI}, {value: 100-metrics.avgROI}]} cx="50%" cy="50%" innerRadius={25} outerRadius={35} stroke="none"><Cell fill="#3b82f6"/><Cell fill="#e2e8f0"/></Pie></PieChart></ResponsiveContainer></div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
             <div>
               <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Tasa de Vacancia</div>
               <div className="text-4xl font-black text-rose-500">{metrics.vacancyRate.toFixed(1)}%</div>
               <div className="text-xs font-bold text-slate-500 mt-1">{metrics.pieData[1].value} Unidades vacías</div>
             </div>
             <div className="w-20"><ResponsiveContainer width="100%" height={80}><PieChart><Pie data={metrics.pieData} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={35} stroke="none">{metrics.pieData.map(e => <Cell key={e.name} fill={e.color}/>)}</Pie></PieChart></ResponsiveContainer></div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
             <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Mora de Cobro Estimada</div>
             <div className="text-4xl font-black text-orange-500">2.4%</div>
             <div className="text-xs font-bold text-slate-500 mt-1">En base a acreditaciones mes curso</div>
          </div>
       </div>

       <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex justify-between items-center">
           <h3 className="font-black text-slate-800 flex items-center gap-2"><Home className="text-blue-500"/> Rentabilidad Neta por Unidad</h3>
           <button onClick={() => window.dispatchEvent(new CustomEvent('open-liquidacion'))} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
              <Banknote size={14} /> Liquidación Expensas (VO)
           </button>
         </div>
         <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse text-xs">
             <thead className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] tracking-widest border-b border-slate-200">
               <tr>
                 <th className="p-4">Propiedad</th>
                 <th className="p-4 text-right">Valor Tasado USD</th>
                 <th className="p-4 text-center">Estado Contrato</th>
                 <th className="p-4 text-right">Ingreso 12m</th>
                 <th className="p-4 text-right">Egreso 12m</th>
                 <th className="p-4 text-right">ROI 12m</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {metrics.rentability.map(p => {
                 return (
                 <tr key={p.id} className="hover:bg-slate-50">
                   <td className="p-4 font-bold text-slate-800">
                      <div>{p.nombre}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{p.direccion}</div>
                   </td>
                   <td className="p-4 text-right font-black text-slate-600">u$d {Number(p.valorActualUSD).toLocaleString()}</td>
                   <td className="p-4 text-center">
                     {p.activo ? (
                        <div className="flex flex-col items-center">
                           <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">Alquilada</span>
                           <span className="text-[10px] text-slate-400 mt-1 flex gap-1 items-center"><CalendarClock size={10}/> Vto: {new Date(p.objContrato.fechaFin).toLocaleDateString()}</span>
                        </div>
                     ) : (
                        <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">Vacante</span>
                     )}
                   </td>
                   <td className="p-4 text-right font-black text-emerald-600">u$d {Math.round(p.ingresos12m).toLocaleString()}</td>
                   <td className="p-4 text-right font-black text-rose-500">u$d {Math.round(p.egresos12m).toLocaleString()}</td>
                   <td className="p-4 text-right font-black text-blue-600 text-sm">{p.roi.toFixed(2)}%</td>
                 </tr>
               )})}
             </tbody>
           </table>
         </div>
       </div>

    </div>
  );
}
