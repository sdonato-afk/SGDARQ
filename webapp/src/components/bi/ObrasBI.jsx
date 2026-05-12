import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line, Legend
} from 'recharts';
import { ChevronDown, ChevronRight, Activity, DollarSign, AlertCircle, Briefcase, Filter } from 'lucide-react';
import { SearchableSelect } from '@darq/ui';

export default function ObrasBI({ movimientos, obras, presupuestos, proveedores, cotizacionBlue }) {
  const [selectedObra, setSelectedObra] = useState('all');
  const [expandedCats, setExpandedCats] = useState({});
  const [expandedRubros, setExpandedRubros] = useState({});

  const toggleCat = (cat) => setExpandedCats(prev => ({...prev, [cat]: !prev[cat]}));
  const toggleRubro = (rubro) => setExpandedRubros(prev => ({...prev, [rubro]: !prev[rubro]}));

  // Helper
  const toUSD = (monto, moneda, cotiz) => {
    if (!monto) return 0;
    if (moneda === 'USD') return Number(monto);
    const div = Number(cotiz) || Number(cotizacionBlue) || 1200;
    return Number(monto) / div;
  };

  const { 
    kpis, 
    topProveedores, 
    donutData, 
    jerarquia, 
    cashFlowData 
  } = useMemo(() => {
    const activeObras = selectedObra === 'all' ? obras : obras.filter(o => o.id === selectedObra);
    const activeObraIds = new Set(activeObras.map(o => o.id));

    // 1. Filtrar Movimientos & Presupuestos
    const movs = movimientos.filter(m => activeObraIds.has(m.obraId));
    const ppts = presupuestos.filter(p => activeObraIds.has(p.obraId));

    // 2. KPIs Globales (Segregación Multidivisa)
    let ingARS = 0, ingUSD = 0, egARS = 0, egUSD = 0;
    let consolidadoUSD_Ing = 0, consolidadoUSD_Eg = 0;

    movs.forEach(m => {
      const u = toUSD(m.monto, m.moneda, m.cotizacionHistorica || m.tipoCambioReferencia);
      const amt = Number(m.monto) || 0;
      
      if (m.tipo === 'Ingreso') {
        consolidadoUSD_Ing += u;
        if (m.moneda === 'USD') ingUSD += amt; else ingARS += amt;
      } else if (m.tipo === 'Egreso') {
        consolidadoUSD_Eg += u;
        if (m.moneda === 'USD') egUSD += amt; else egARS += amt;
      }
    });

    const cajaOperativa = {
      ARS: ingARS - egARS,
      USD: ingUSD - egUSD,
      consolidado: consolidadoUSD_Ing - consolidadoUSD_Eg
    };

    const ejecutado = {
      ARS: egARS,
      USD: egUSD,
      consolidado: consolidadoUSD_Eg
    };

    const pptoObjetivoTotal = activeObras.reduce((a,o) => a + (Number(o.presupuestoObjetivo) || 0), 0);
    const pctConsumo = pptoObjetivoTotal > 0 ? (ejecutado.consolidado / pptoObjetivoTotal) * 100 : 0;

    // 3. Deuda Técnica y Top Proveedores
    let consolidadoUSD_Deuda = 0;
    const provDebts = [];
    (proveedores || []).forEach(prov => {
      const pptoProv = ppts.filter(p => p.proveedorId === prov.id).reduce((a,p) => a + Number(p.montoUSD||0), 0);
      const pagosProv = movs.filter(m => m.proveedorId === prov.id && m.tipo === 'Egreso').reduce((a,m) => a + toUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia), 0);
      const deuda = pptoProv - pagosProv;
      if (deuda > 0) {
        consolidadoUSD_Deuda += deuda;
        provDebts.push({ name: prov.nombre || 'Desconocido', deuda });
      }
    });
    
    const deudaTecnica = {
        ARS: 0,
        USD: 0,
        consolidado: consolidadoUSD_Deuda
    };

    const topProveedores = provDebts.sort((a,b) => b.deuda - a.deuda).slice(0, 5);

    // 4. Jerarquía Drill-Down (Cat -> Rubro -> Concepto) y Donut Chart
    const jerarquiaMap = {};
    const actEgresos = movs.filter(m => m.tipo === 'Egreso');
    
    actEgresos.forEach(m => {
      const cat = (m.categoriaEgreso || 'Sin Categoría').toUpperCase();
      const rubro = (m.rubro || m.subRubro || 'Sin Rubro').toUpperCase();
      const concepto = (m.concepto || 'Varios').toUpperCase();
      const provName = (proveedores||[]).find(p => p.id === m.proveedorId)?.nombre || 'Varios';
      const usd = toUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia);

      if (!jerarquiaMap[cat]) jerarquiaMap[cat] = { total: 0, ppto: 0, rubros: {} };
      jerarquiaMap[cat].total += usd;

      if (!jerarquiaMap[cat].rubros[rubro]) jerarquiaMap[cat].rubros[rubro] = { total: 0, ppto: 0, conceptos: [] };
      jerarquiaMap[cat].rubros[rubro].total += usd;

      jerarquiaMap[cat].rubros[rubro].conceptos.push({ ...m, usd, provName, concepto });
    });

    // Añadir presupuestos a jerarquía para % de progreso
    ppts.forEach(p => {
      const cat = (p.categoria || 'Sin Categoría').toUpperCase();
      const rubro = (p.rubro || 'Sin Rubro').toUpperCase();
      if (!jerarquiaMap[cat]) jerarquiaMap[cat] = { total: 0, ppto: 0, rubros: {} };
      jerarquiaMap[cat].ppto += Number(p.montoUSD || 0);

      if (!jerarquiaMap[cat].rubros[rubro]) jerarquiaMap[cat].rubros[rubro] = { total: 0, ppto: 0, conceptos: [] };
      jerarquiaMap[cat].rubros[rubro].ppto += Number(p.montoUSD || 0);
    });

    const jerarquia = Object.entries(jerarquiaMap).map(([cat, tData]) => ({
      name: cat,
      ejecutado: tData.total,
      ppto: tData.ppto || (tData.total * 1.1), // Fallback if no specific ppto
      pct: tData.ppto > 0 ? (tData.total / tData.ppto)*100 : (tData.total>0?100:0),
      rubros: Object.entries(tData.rubros).map(([rub, rData]) => ({
        name: rub,
        ejecutado: rData.total,
        ppto: rData.ppto,
        conceptos: rData.conceptos
      })).sort((a,b)=>b.ejecutado - a.ejecutado)
    })).sort((a,b)=>b.ejecutado - a.ejecutado);

    const donutData = jerarquia.map(j => ({ name: j.name, value: j.ejecutado })).filter(d=>d.value>0);

    // 5. Cash Flow Semanal (Línea de Tendencia mensual simplificada para el chart)
    const cfMap = {};
    const todayCF = new Date();
    for(let i=11; i>=0; i--) {
       const d = new Date(todayCF.getFullYear(), todayCF.getMonth() - i, 1);
       const mo = d.toISOString().substring(0, 7);
       cfMap[mo] = { name: mo, in: 0, out: 0 };
    }

    movs.forEach(m => {
       const u = toUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia);
       const mo = m.fecha.substring(0, 7); // YYYY-MM
       if (!cfMap[mo]) cfMap[mo] = { name: mo, in: 0, out: 0 };
       if (m.tipo === 'Ingreso') cfMap[mo].in += u;
       if (m.tipo === 'Egreso') cfMap[mo].out += u;
    });
    const cashFlowData = Object.values(cfMap).sort((a,b) => a.name.localeCompare(b.name));

    return {
      kpis: {
        cajaOperativa, ejecutado: egresos, deudaTecnica, pctConsumo
      },
      topProveedores,
      donutData,
      jerarquia,
      cashFlowData
    };
  }, [movimientos, obras, presupuestos, proveedores, cotizacionBlue, selectedObra]);

  // Colores D+ARQ Dark
  const DONUT_COLORS = ['#34d399', '#3b82f6', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4'];

  const pctColor = (pct) => pct < 50 ? 'bg-emerald-500' : pct < 70 ? 'bg-yellow-400' : pct < 90 ? 'bg-orange-500' : 'bg-rose-600';

  return (
    <div className="space-y-6 text-slate-100 bg-[#06101f] p-6 rounded-[2rem] shadow-2xl relative overflow-hidden font-mono mt-4">
      {/* HEADER & FILTROS */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-[#0a192f] p-4 rounded-2xl border border-slate-800 shadow-md gap-4 z-10 relative">
         <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
               <Briefcase size={24} className="text-blue-400" />
            </div>
            <div>
               <h2 className="text-xl font-black text-white tracking-widest uppercase">Inteligencia Obras</h2>
               <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em]">Dashboard Financiero Alta Densidad</p>
            </div>
         </div>
         <div className="flex items-center gap-3">
            <Filter size={16} className="text-slate-500"/>
            <SearchableSelect 
               value={selectedObra} 
               onChange={(e) => setSelectedObra(e.target.value)}
               className="bg-[#112240] text-slate-300 font-bold text-xs p-2 rounded-xl outline-none border border-white/10 hover:border-blue-500 transition-colors cursor-pointer"
            >
               <option value="all">TODAS LAS OBRAS (Consolidado)</option>
               {obras.map(o => <option key={o.id} value={o.id}>{o.nombre.toUpperCase()}</option>)}
            </SearchableSelect>
         </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 z-10 relative">
         <div className="bg-[#112240] p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-[100px] transition-transform group-hover:scale-110"></div>
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mb-2 font-sans font-bold flex justify-between">
              <span>Caja Operativa</span>
              <span className="text-[10px] flex flex-col items-end">
                <span>$ {Math.round(kpis.cajaOperativa.ARS).toLocaleString()} ARS</span>
                <span>u$d {Math.round(kpis.cajaOperativa.USD).toLocaleString()} USD</span>
              </span>
            </p>
            <h3 className="text-2xl font-black text-emerald-400 mt-2">u$d {Math.round(kpis.cajaOperativa.consolidado).toLocaleString()}</h3>
            <div className="mt-4 flex items-center justify-between text-[10px] text-emerald-500/70">
               <span>Consolidado Equivalente</span>
               <Activity size={12} />
            </div>
         </div>
         <div className="bg-[#112240] p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-[100px] transition-transform group-hover:scale-110"></div>
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mb-2 font-sans font-bold flex justify-between">
              <span>Ejecución Acumulada</span>
              <span className="text-[10px] flex flex-col items-end">
                <span>$ {Math.round(kpis.ejecutado.ARS).toLocaleString()} ARS</span>
                <span>u$d {Math.round(kpis.ejecutado.USD).toLocaleString()} USD</span>
              </span>
            </p>
            <h3 className="text-2xl font-black text-white mt-2">u$d {Math.round(kpis.ejecutado.consolidado).toLocaleString()}</h3>
            <div className="mt-4 flex items-center justify-between text-[10px] text-blue-400/70">
               <span>Histórico de Egresos Consolidado</span>
               <DollarSign size={12} />
            </div>
         </div>
         <div className="bg-[#112240] p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-bl-[100px] transition-transform group-hover:scale-110"></div>
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mb-2 font-sans font-bold">Deuda Técnica</p>
            <h3 className="text-2xl font-black text-rose-400">u$d {Math.round(kpis.deudaTecnica.consolidado).toLocaleString()}</h3>
            <div className="mt-4 flex items-center justify-between text-[10px] text-rose-400/70">
               <span>Ppto USD vs Pagado Total</span>
               <AlertCircle size={12} />
            </div>
         </div>
         <div className="bg-[#112240] p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-bl-[100px] transition-transform group-hover:scale-110"></div>
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mb-2 font-sans font-bold">% Consumo Presup.</p>
            <h3 className="text-2xl font-black text-orange-400">{kpis.pctConsumo.toFixed(1)}%</h3>
            <div className="mt-4 w-full glass-card rounded-full h-1.5 overflow-hidden">
               <div className={`${pctColor(kpis.pctConsumo)} h-1.5 rounded-full`} style={{width: `${Math.min(kpis.pctConsumo, 100)}%`}}></div>
            </div>
         </div>
      </div>

      {/* CHARTS LAYER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 z-10 relative">
         <div className="bg-[#112240] p-5 rounded-2xl border border-slate-800 lg:col-span-1">
            <h4 className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mb-4 font-sans font-bold">Distribución Categorías</h4>
            <div className="h-64 w-full">
               <ResponsiveContainer>
                  <PieChart>
                     <Pie data={donutData} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                        {donutData.map((e,i) => <Cell key={`c-${i}`} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                     </Pie>
                     <RechartsTooltip formatter={(v)=>'u$d '+Math.round(v).toLocaleString()} contentStyle={{backgroundColor:'#0a192f', borderColor:'#1e293b', color:'#fff', borderRadius:'8px'}} itemStyle={{color:'#cbd5e1', fontWeight:'bold'}}/>
                     <Legend wrapperStyle={{fontSize:'9px', color:'#94a3b8', fontFamily:'sans-serif'}} />
                  </PieChart>
               </ResponsiveContainer>
            </div>
         </div>
         <div className="bg-[#112240] p-5 rounded-2xl border border-slate-800 lg:col-span-2">
             <h4 className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mb-4 font-sans font-bold">Flujo de Caja Intermensual</h4>
             <div className="h-64 w-full">
               <ResponsiveContainer>
                 <LineChart data={cashFlowData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                   <XAxis dataKey="name" stroke="#64748b" tick={{fontSize: 10}} axisLine={false} tickLine={false}/>
                   <YAxis stroke="#64748b" tick={{fontSize: 10}} axisLine={false} tickLine={false} tickFormatter={(v)=>`${v/1000}k`}/>
                   <RechartsTooltip formatter={(v)=>'u$d '+Math.round(v).toLocaleString()} contentStyle={{backgroundColor:'#0a192f', borderColor:'#1e293b', color:'#fff', borderRadius:'8px'}} itemStyle={{fontWeight:'bold'}}/>
                   <Legend wrapperStyle={{fontSize:'10px', color:'#94a3b8'}}/>
                   <Line type="monotone" dataKey="in" name="Ingresos" stroke="#34d399" strokeWidth={3} dot={{r:4, fill:'#0a192f', strokeWidth:2}} />
                   <Line type="monotone" dataKey="out" name="Egresos" stroke="#f43f5e" strokeWidth={3} dot={{r:4, fill:'#0a192f', strokeWidth:2}} />
                 </LineChart>
               </ResponsiveContainer>
             </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 z-10 relative">
         <div className="bg-[#112240] p-5 rounded-2xl border border-slate-800 lg:col-span-1">
            <h4 className="text-[10px] text-rose-400/80 uppercase tracking-[0.2em] mb-4 font-sans font-bold">Top 5 Deuda Proveedores</h4>
            <div className="h-64 w-full">
               <ResponsiveContainer>
                 <BarChart data={topProveedores} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                   <XAxis type="number" stroke="#64748b" tick={{fontSize: 9}} axisLine={false} tickLine={false} tickFormatter={(v)=>`${v/1000}k`}/>
                   <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{fontSize: 9}} axisLine={false} tickLine={false} width={80}/>
                   <RechartsTooltip cursor={{fill: '#1e293b'}} formatter={(v)=>'u$d '+Math.round(v).toLocaleString()} contentStyle={{backgroundColor:'#0a192f', borderColor:'#1e293b', color:'#fff', borderRadius:'8px'}} itemStyle={{fontWeight:'bold', color:'#f43f5e'}}/>
                   <Bar dataKey="deuda" name="Deuda Pendiente" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={20} />
                 </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* ACORDEON DRILL-DOWN */}
         <div className="bg-[#0a192f] rounded-2xl border border-slate-800 shadow-inner lg:col-span-2 overflow-hidden flex flex-col h-[328px]">
            <div className="p-5 border-b border-slate-800 bg-[#112240]">
               <h4 className="text-[10px] text-slate-300 uppercase tracking-[0.2em] font-sans font-bold">Jerarquía de Costos (Drill-Down)</h4>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
               {jerarquia.map((cat, i) => (
                  <div key={cat.name} className="mb-2">
                     <button onClick={()=>toggleCat(cat.name)} className="w-full flex items-center justify-between bg-[#1e293b] p-3 rounded-xl hover:bg-[#334155] transition-colors border border-white/10/50">
                        <div className="flex items-center gap-3">
                           {expandedCats[cat.name] ? <ChevronDown size={14} className="text-blue-400"/> : <ChevronRight size={14} className="text-slate-500"/>}
                           <span className="font-bold text-xs uppercase text-slate-200">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-6">
                           <div className="text-right">
                              <p className="text-[10px] text-slate-500 uppercase font-sans tracking-widest leading-tight">Ejecutado</p>
                              <p className="text-sm font-black text-white">u$d {Math.round(cat.ejecutado).toLocaleString()}</p>
                           </div>
                           <div className="w-24">
                              <div className="flex justify-between text-[10px] font-sans mb-1 font-bold text-slate-400">
                                 <span>Consumo</span><span>{cat.pct.toFixed(0)}%</span>
                              </div>
                              <div className="w-full glass-card rounded-full h-1.5 overflow-hidden">
                                 <div className={`${pctColor(cat.pct)} h-1.5 rounded-full`} style={{width: `${Math.min(cat.pct, 100)}%`}}></div>
                              </div>
                           </div>
                        </div>
                     </button>
                     
                     {expandedCats[cat.name] && (
                        <div className="pl-6 pr-2 pt-2 space-y-2">
                           {cat.rubros.map(rub => (
                              <div key={rub.name}>
                                 <button onClick={()=>toggleRubro(rub.name)} className="w-full flex items-center justify-between bg-[#112240] p-2.5 rounded-lg border border-slate-800/80 hover:bg-[#1e293b] transition-colors">
                                    <div className="flex items-center gap-2">
                                       {expandedRubros[rub.name] ? <ChevronDown size={12} className="text-slate-400"/> : <ChevronRight size={12} className="text-slate-600"/>}
                                       <span className="font-bold text-[11px] text-slate-300">{rub.name}</span>
                                    </div>
                                    <span className="text-xs font-bold text-slate-400">u$d {Math.round(rub.ejecutado).toLocaleString()}</span>
                                 </button>
                                 
                                 {expandedRubros[rub.name] && (
                                    <div className="pl-6 pr-2 py-2 space-y-1">
                                       {rub.conceptos.map((con, j) => (
                                          <div key={j} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 rounded">
                                             <div className="flex gap-4">
                                                <span className="text-[10px] text-slate-500">{con.fecha}</span>
                                                <span className="text-[10px] text-slate-300 w-32 truncate">{con.provName}</span>
                                                <span className="text-[10px] text-slate-400 hidden sm:block truncate w-48">{con.concepto}</span>
                                             </div>
                                             <span className="text-[10px] font-bold text-emerald-400">u$d {Math.round(con.usd).toLocaleString()}</span>
                                          </div>
                                       ))}
                                    </div>
                                 )}
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}
