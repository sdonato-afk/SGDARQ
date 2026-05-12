import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

/**
 * Tab Área Oficina
 * Props: movimientos, proveedores, cotizacionBlue
 */
export default function Oficina({ movimientos, proveedores, cotizacionBlue }) {
  const movsOficina = movimientos.filter(m => m.area === 'Oficina');
  const hoy = new Date();
  const mesActualKey = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`;

  // Helper: convertir monto a ARS
  const toARS = (m) => m.moneda === 'USD'
    ? (Number(m.monto) || 0) * (m.cotizacionHistorica || m.tipoCambioReferencia || cotizacionBlue)
    : (Number(m.monto) || 0);

  // Helper: egresos de N meses hacia atrás (excluyendo mes actual)
  const egresoPromedio = (nMeses) => {
    const meses = Array.from({ length: nMeses }, (_, i) => {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - 1 - i, 1);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    });
    const egrsDelPeriodo = movsOficina.filter(m =>
      m.tipo === 'Egreso' && meses.some(mes => (m.fecha || '').startsWith(mes))
    );
    const total = egrsDelPeriodo.reduce((a, m) => a + toARS(m), 0);
    // Solo contar meses con datos para no inflar el promedio con meses vacíos
    const mesesConDatos = new Set(egrsDelPeriodo.map(m => (m.fecha||'').slice(0,7))).size;
    return mesesConDatos > 0 ? total / mesesConDatos : 0;
  };

  const ingresosOficina = movsOficina
    .filter(m => m.tipo === 'Ingreso')
    .reduce((a, m) => a + toARS(m), 0);

  const egresosOficina = movsOficina
    .filter(m => m.tipo === 'Egreso')
    .reduce((a, m) => a + toARS(m), 0);

  const saldoOficina = ingresosOficina - egresosOficina;

  // Egresos mes actual
  const egresosMesActual = movsOficina
    .filter(m => m.tipo === 'Egreso' && (m.fecha || '').startsWith(mesActualKey))
    .reduce((a, m) => a + toARS(m), 0);

  const prom6  = egresoPromedio(6);
  const prom12 = egresoPromedio(12);
  const prom24 = egresoPromedio(24);

  // Porcentaje relativo al promedio 12m para la barra
  const maxProm = Math.max(egresosMesActual, prom6, prom12, prom24, 1);

  const porCategoria = {};
  movsOficina.filter(m => m.tipo === 'Egreso').forEach(m => {
    const cat = m.categoriaEgreso || 'VARIOS';
    const monto = toARS(m);
    if (!porCategoria[cat]) porCategoria[cat] = { total: 0, proveedores: {} };
    porCategoria[cat].total += monto;
    const provId = m.proveedorId;
    const provNom = provId
      ? (proveedores.find(p => p.id === provId)?.nombre || 'Sin nombre')
      : (m.concepto || m.rubro || 'Otros');
    if (!porCategoria[cat].proveedores[provNom]) porCategoria[cat].proveedores[provNom] = 0;
    porCategoria[cat].proveedores[provNom] += monto;
  });

  const mesNombre = hoy.toLocaleString('es-AR', { month: 'long', year: 'numeric' });

  const variacion = prom12 > 0 ? ((egresosMesActual - prom12) / prom12 * 100) : null;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* KPIs Globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Ingresos Totales', val: ingresosOficina, color: 'text-emerald-400', symbol: '$', blurColor: 'bg-emerald-500' },
          { label: 'Egresos Totales', val: egresosOficina, color: 'text-rose-400', symbol: '$', blurColor: 'bg-rose-500' },
          { label: 'Saldo Neto', val: saldoOficina, color: saldoOficina >= 0 ? 'text-blue-400' : 'text-orange-400', symbol: '$', blurColor: saldoOficina >= 0 ? 'bg-blue-500' : 'bg-orange-500' },
        ].map(({ label, val, color, symbol, blurColor }) => (
          <div key={label} className="glass-panel rounded-[2rem] p-6 border border-white/5 relative overflow-hidden shadow-2xl">
            <div className={`absolute top-0 right-0 w-32 h-32 ${blurColor}/[0.15] rounded-full blur-[32px] pointer-events-none -mt-8 -mr-8`} />
            <div className="relative z-10">
              <p className="darq-label mb-3">{label}</p>
              <p className={`text-3xl font-black tracking-tighter ${color}`}>
                {symbol} {(val || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── KPI Panel: Egresos del mes + Promedios ── */}
      <div className="glass-panel rounded-[2rem] border border-white/5 overflow-hidden relative shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/[0.05] rounded-full blur-[64px] pointer-events-none -mt-16 -mr-16" />
        <div className="relative z-10 px-6 pt-5 pb-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <p className="darq-label">Gasto Corriente</p>
            <h3 className="text-sm font-black text-white mt-0.5">Egresos de Oficina — Análisis Mensual</h3>
          </div>
          {variacion !== null && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black ${
              variacion > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              {variacion > 0 ? <TrendingUp size={13}/> : <TrendingDown size={13}/>}
              {variacion > 0 ? '+' : ''}{variacion.toFixed(1)}% vs prom. 12m
            </div>
          )}
        </div>

        <div className="p-6 relative z-10">
          {/* Mes actual — destacado */}
          <div className="mb-6 p-5 bg-white/[0.03] rounded-xl border border-white/8">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-1.5 capitalize">{mesNombre}</p>
            <div className="flex items-end gap-3">
              <p className="text-3xl font-black text-rose-400 tracking-tighter">
                $ {egresosMesActual.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] font-bold text-slate-500 mb-1">egreso mes actual</p>
            </div>
            {/* Barra de progreso vs promedio 12m */}
            {prom12 > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] font-black text-slate-600 mb-1">
                  <span>0</span>
                  <span>Prom. 12m: $ {Math.round(prom12).toLocaleString('es-AR')}</span>
                </div>
                <div className="relative h-2 bg-white/5 rounded-full overflow-visible">
                  {/* Línea de referencia promedio 12m */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-400/50 z-10"
                    style={{ left: `${Math.min((prom12 / maxProm) * 100, 100)}%` }}
                  />
                  {/* Barra del mes actual */}
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      egresosMesActual > prom12 ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min((egresosMesActual / maxProm) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Grid de promedios */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Prom. 6 meses', value: prom6, meses: 6, color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/[0.05]' },
              { label: 'Prom. 12 meses', value: prom12, meses: 12, color: 'text-sky-400', border: 'border-sky-500/20', bg: 'bg-sky-500/[0.05]' },
              { label: 'Prom. 24 meses', value: prom24, meses: 24, color: 'text-violet-400', border: 'border-violet-500/20', bg: 'bg-violet-500/[0.05]' },
            ].map(({ label, value, meses, color, border, bg }) => {
              const diff = value > 0 ? ((egresosMesActual - value) / value * 100) : null;
              return (
                <div key={meses} className={`rounded-xl p-4 border ${border} ${bg}`}>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{label}</p>
                  <p className={`text-base font-black ${color} tracking-tight`}>
                    $ {Math.round(value).toLocaleString('es-AR')}
                  </p>
                  {diff !== null && (
                    <p className={`text-[10px] font-black mt-1.5 ${diff > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {diff > 0 ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}% vs actual
                    </p>
                  )}
                  {/* Mini barra comparativa */}
                  <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color.replace('text-','bg-').replace('-400','-500')}`}
                      style={{ width: `${Math.min((value / maxProm) * 100, 100)}%`, opacity: 0.7 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Gráfico de barras: Egresos mes a mes ── */}
      {(() => {
        const N_MESES = 18;
        const mesesBar = Array.from({ length: N_MESES }, (_, i) => {
          const d = new Date(hoy.getFullYear(), hoy.getMonth() - (N_MESES - 1) + i, 1);
          return {
            key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
            label: String(d.getMonth()+1).padStart(2,'0'),
            year: d.getFullYear(),
            isActual: d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth(),
          };
        });
        const egresosBar = mesesBar.map(m => ({
          ...m,
          val: movsOficina
            .filter(mv => mv.tipo === 'Egreso' && (mv.fecha || '').startsWith(m.key))
            .reduce((a, mv) => a + toARS(mv), 0),
        }));
        const maxVal = Math.max(...egresosBar.map(d => d.val), 1);
        const BAR_W = 28;
        const GAP = 6;
        const CHART_H = 150;
        const PAD_L = 48;
        const PAD_B = 28;
        const totalW = PAD_L + N_MESES * (BAR_W + GAP) - GAP + 12;
        const fmtK = v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v/1000)}k` : Math.round(v);
        const yTicks = [0, 0.25, 0.5, 0.75, 1];

        return (
          <div className="glass-panel rounded-[2rem] border border-white/5 overflow-hidden relative shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/[0.05] rounded-full blur-[64px] pointer-events-none -mt-16 -mr-16" />
            <div className="relative z-10 px-6 pt-5 pb-3 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="darq-label">Evolución</p>
                <h3 className="text-sm font-black text-white mt-0.5">Egresos Mensuales — Últimos 18 meses</h3>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500/60 inline-block"/>{hoy.toLocaleString('es-AR',{month:'short'})} actual</span>
                <span className="flex items-center gap-1.5"><span className="w-8 h-0.5 bg-slate-500/50 inline-block border-dashed"/><span>Promedio</span></span>
              </div>
            </div>
            <div className="px-4 py-5 overflow-x-auto relative z-10 custom-scrollbar">
              <svg
                viewBox={`0 0 ${totalW} ${CHART_H + PAD_B + 4}`}
                style={{ width: '100%', minWidth: totalW, height: CHART_H + PAD_B + 8 }}
              >
                {/* Y grid + labels */}
                {yTicks.map(t => {
                  const y = CHART_H - (t * (CHART_H - 20));
                  return (
                    <g key={t}>
                      <line x1={PAD_L} y1={y} x2={totalW - 4} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                      <text x={PAD_L - 5} y={y + 3} textAnchor="end" fill="rgba(148,163,184,0.35)" fontSize="8" fontFamily="sans-serif">{fmtK(maxVal * t)}</text>
                    </g>
                  );
                })}

                {/* Línea de promedio 12m */}
                {prom12 > 0 && (() => {
                  const yProm = CHART_H - ((prom12 / maxVal) * (CHART_H - 20));
                  return (
                    <g>
                      <line x1={PAD_L} y1={yProm} x2={totalW - 4} y2={yProm} stroke="rgba(148,163,184,0.3)" strokeWidth="1" strokeDasharray="4,3"/>
                      <text x={totalW - 2} y={yProm - 3} textAnchor="end" fill="rgba(148,163,184,0.4)" fontSize="7" fontFamily="sans-serif">prom.12m</text>
                    </g>
                  );
                })()}

                {/* Barras */}
                {egresosBar.map((d, i) => {
                  const barH = Math.max(2, (d.val / maxVal) * (CHART_H - 20));
                  const x = PAD_L + i * (BAR_W + GAP);
                  const y = CHART_H - barH;
                  const isHigh = prom12 > 0 && d.val > prom12 * 1.2;
                  const barColor = d.isActual ? 'rgba(96,165,250,0.75)' : isHigh ? 'rgba(251,113,133,0.65)' : 'rgba(99,102,241,0.50)';
                  const barHover = d.isActual ? 'rgba(96,165,250,0.95)' : isHigh ? 'rgba(251,113,133,0.85)' : 'rgba(99,102,241,0.75)';
                  return (
                    <g key={d.key}>
                      <rect
                        x={x} y={y} width={BAR_W} height={barH}
                        fill={barColor}
                        rx="3"
                      >
                        <title>$ {Math.round(d.val).toLocaleString('es-AR')} — {d.label}/{d.year}</title>
                      </rect>
                      {/* Valor encima si hay espacio */}
                      {barH > 28 && (
                        <text x={x + BAR_W/2} y={y + 11} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="7" fontWeight="700" fontFamily="sans-serif">
                          {fmtK(d.val)}
                        </text>
                      )}
                      {/* Label mes */}
                      <text x={x + BAR_W/2} y={CHART_H + PAD_B - 14} textAnchor="middle" fill={d.isActual ? 'rgba(96,165,250,0.9)' : 'rgba(148,163,184,0.45)'} fontSize="8" fontWeight={d.isActual ? '900' : '700'} fontFamily="sans-serif">
                        {d.label}
                      </text>
                      {/* Año (solo enero o primer mes) */}
                      {(d.label === '01' || i === 0) && (
                        <text x={x + BAR_W/2} y={CHART_H + PAD_B - 3} textAnchor="middle" fill="rgba(100,116,139,0.4)" fontSize="7" fontFamily="sans-serif">{d.year}</text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        );
      })()}

      {/* Egresos por Categoría */}
      <div className="glass-panel rounded-[2rem] p-6 border border-white/5 relative shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/[0.05] rounded-full blur-[64px] pointer-events-none -mt-16 -mr-16" />
        <h3 className="darq-label mb-6 relative z-10">Egresos por Categoría</h3>
        <div className="space-y-1 relative z-10">
          {Object.entries(porCategoria).sort((a, b) => b[1].total - a[1].total).map(([cat, data]) => {
            const pct = egresosOficina > 0 ? (data.total / egresosOficina) * 100 : 0;
            return (
              <details key={cat} className="border border-white/5 rounded-xl overflow-hidden">
                <summary className="px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors">
                  <div>
                    <div className="flex justify-between text-xs font-black mb-1">
                      <span className="text-slate-300 uppercase">{cat}</span>
                      <span className="text-rose-400">
                        $ {data.total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}{' '}
                        <span className="text-slate-500">({pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-700"
                        style={{ width: pct + '%' }}
                      />
                    </div>
                  </div>
                </summary>
                <div className="border-t border-white/5 px-4 py-2 space-y-1">
                  {Object.entries(data.proveedores).sort((a, b) => b[1] - a[1]).map(([prov, montoP]) => (
                    <div key={prov} className="flex justify-between items-center py-1.5 text-[10px] border-b border-white/[0.03] last:border-0">
                      <span className="text-slate-400 font-semibold">{prov}</span>
                      <span className="text-rose-400 font-bold">$ {montoP.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
          {Object.keys(porCategoria).length === 0 && (
            <p className="text-slate-500 text-xs font-bold">Sin egresos registrados.</p>
          )}
        </div>
      </div>
    </div>
  );
}
