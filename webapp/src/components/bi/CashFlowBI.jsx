import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingDown, TrendingUp, AlertCircle, CalendarClock } from 'lucide-react';

export default function CashFlowBI({ movimientos, presupuestos, cotizacionBlue, contratos }) {
  const data = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // 1. Calculate current exact liquidity
    let liquidezUSD = 0;
    movimientos.forEach(m => {
       const v = m.moneda === 'USD' ? Number(m.monto) : (Number(m.monto) / (m.cotizacionHistorica || m.tipoCambioReferencia || cotizacionBlue));
       if (m.tipo === 'Ingreso') liquidezUSD += v;
       else liquidezUSD -= v;
    });

    // 2. Compute Historic OpEx Averages (last 6 months)
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    let opex6mUSD = 0;
    movimientos.filter(m => m.area === 'Oficina' && m.tipo === 'Egreso' && new Date(m.fecha) >= sixMonthsAgo).forEach(m => {
       opex6mUSD += m.moneda === 'USD' ? Number(m.monto) : (Number(m.monto) / (m.cotizacionHistorica || m.tipoCambioReferencia || cotizacionBlue));
    });
    const dailyOpex = opex6mUSD / 180; // approx USD / day

    // 3. Outstanding Budgets (Obras) - Distributed linearly over next 60 days
    const totalPresupuestos = presupuestos.reduce((sum, p) => sum + Number(p.montoUSD), 0);
    const totalPagadoPresupuestos = movimientos.filter(m => m.area === 'Obras' && m.proveedorId && m.tipo === 'Egreso').reduce((sum, m) => sum + (m.moneda === 'USD' ? Number(m.monto) : (Number(m.monto) / (m.cotizacionHistorica || m.tipoCambioReferencia || cotizacionBlue))), 0);
    const pendienteObras = Math.max(0, totalPresupuestos - totalPagadoPresupuestos); // Total Debt
    const dailyObrasDebt = pendienteObras / 60; // Assuming it burns over 60 days

    // 4. Rent Income Projections
    // Get total monthly USD rent from active contracts
    let monthlyRentUSD = 0;
    contratos.filter(c => new Date(c.fechaFin) >= today && new Date(c.fechaInicio) <= today).forEach(c => {
       monthlyRentUSD += c.moneda === 'USD' ? Number(c.monto) : (Number(c.monto) / cotizacionBlue);
    });

    const projection = [];
    let currentBalance = liquidezUSD;
    
    for (let i = 0; i <= 90; i+=5) { // Intervals of 5 days
       const stepDate = new Date(today);
       stepDate.setDate(today.getDate() + i);
       
       if (i > 0) {
          // Subtract daily burn
          currentBalance -= (dailyOpex * 5);
          if (i <= 60) currentBalance -= (dailyObrasDebt * 5);
          
          // Add income if month crossed
          const prevDate = new Date(today);
          prevDate.setDate(today.getDate() + (i-5));
          if (stepDate.getMonth() !== prevDate.getMonth()) {
             currentBalance += monthlyRentUSD; // Rent comes in usually between 1-10, we'll just add it when month ticks
          }
       }
       
       projection.push({
          dia: '+' + i + 'd',
          fecha: stepDate.toLocaleDateString('es-AR', {day: '2-digit', month: 'short'}),
          saldo: Math.round(currentBalance)
       });
    }

    return { projection, dailyOpex, pendienteObras, monthlyRentUSD, liquidezUSD };
  }, [movimientos, presupuestos, cotizacionBlue, contratos]);

  const endBalance = data.projection[data.projection.length-1].saldo;
  const isDanger = endBalance < 0;

  return (
    <div className="space-y-6">
       
       {/* Cards row */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
             <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <WalletIcon /> Liquidez Actual
             </div>
             <div className="text-3xl font-black text-slate-800 mt-2">u$d {Math.round(data.liquidezUSD).toLocaleString()}</div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
             <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <TrendingDown className="text-orange-500" size={14}/> Burn Rate OpEx
             </div>
             <div className="text-2xl font-black text-orange-600 mt-2">u$d {Math.round(data.dailyOpex * 7).toLocaleString()} <span className="text-xs text-orange-400">/sem</span></div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
             <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <HardHatIcon /> Deuda Obras (60d)
             </div>
             <div className="text-2xl font-black text-rose-600 mt-2">u$d {Math.round(data.pendienteObras).toLocaleString()}</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
             <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <TrendingUp className="text-emerald-500" size={14}/> Ingreso Renta Estimado
             </div>
             <div className="text-2xl font-black text-emerald-600 mt-2">u$d {Math.round(data.monthlyRentUSD).toLocaleString()} <span className="text-xs text-emerald-400">/mes</span></div>
          </div>
       </div>

       {/* Chart */}
       <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
             <div>
                <h3 className="font-black text-slate-800 flex items-center gap-2">Proyección de Flujo de Caja (90 Días)</h3>
                <p className="text-xs text-slate-500 font-bold mt-1">Modelo predictivo integrado basado en promedios del último semestre y obligaciones exigibles</p>
             </div>
             {isDanger && (
                <div className="bg-rose-50 text-rose-700 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 border border-rose-200">
                   <AlertCircle size={14} /> Riesgo de Quiebre de Caja Estimado
                </div>
             )}
          </div>
          
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.projection} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isDanger ? '#f43f5e' : '#3b82f6'} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={isDanger ? '#f43f5e' : '#3b82f6'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} dx={-10} tickFormatter={(val) => '$'+val.toLocaleString()} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  labelStyle={{fontWeight: '900', color: '#0f172a', marginBottom: '4px'}}
                  formatter={(value) => ['u$d ' + value.toLocaleString(), 'Proyección']}
                  labelFormatter={(label, payload) => {
                     return payload && payload[0] ? payload[0].payload.fecha + ' (' + label + ')' : label;
                  }}
                />
                <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="saldo" stroke={isDanger ? '#e11d48' : '#2563eb'} strokeWidth={3} fillOpacity={1} fill="url(#colorSaldo)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
       </div>

    </div>
  );
}

const WalletIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>;
const HardHatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500"><path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6h0"/><path d="M14 6h0a6 6 0 0 1 6 6v3"/></svg>;
