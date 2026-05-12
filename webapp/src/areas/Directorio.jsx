import React, { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { convertToUSD as _convertToUSD, normalizeYearMonth } from '../helpers/financieros';

/**
 * Tab Área Directorio
 * Props: movimientos, cotizacionBlue
 */
export default function Directorio({ movimientos, cotizacionBlue }) {
  const [directorDetalle, setDirectorDetalle] = useState(null);
  const [showDirSeb, setShowDirSeb] = useState(true);
  const [showDirSan, setShowDirSan] = useState(true);
  const [showDirEmi, setShowDirEmi] = useState(true);

  const convertToUSD = (monto, moneda, tc) => _convertToUSD(monto, moneda, tc, cotizacionBlue);

  const movsDir = movimientos.filter(m => m.area === 'Directorio');
  const ingresosDir = movsDir.filter(m => m.tipo === 'Ingreso').reduce((a, m) => a + convertToUSD(Number(m.monto) || 0, m.moneda, m.cotizacionHistorica || m.tipoCambioReferencia), 0);
  const egresosDir = movsDir.filter(m => m.tipo === 'Egreso').reduce((a, m) => a + convertToUSD(Number(m.monto) || 0, m.moneda, m.cotizacionHistorica || m.tipoCambioReferencia), 0);
  const saldoDir = ingresosDir - egresosDir;

  const normDir = (d) => {
    if (!d) return 'Sin Director';
    const low = d.trim().toLowerCase();
    if (low.startsWith('sebast')) return 'Sebastián';
    if (low.startsWith('emilia')) return 'Emiliano';
    if (low.startsWith('santia')) return 'Santiago';
    if (low.startsWith('floren')) return 'Florencia';
    return d.trim().charAt(0).toUpperCase() + d.trim().slice(1).toLowerCase();
  };

  const porDirector = {};
  movsDir.forEach(m => {
    const d = normDir(m.directorId);
    if (!porDirector[d]) porDirector[d] = { ingresos: 0, egresos: 0 };
    const val = convertToUSD(Number(m.monto) || 0, m.moneda, m.cotizacionHistorica || m.tipoCambioReferencia);
    if (m.tipo === 'Ingreso') porDirector[d].ingresos += val;
    else porDirector[d].egresos += val;
  });

  const dirColors = { 'Sebastián': '#fbbf24', 'Santiago': '#3b82f6', 'Emiliano': '#10b981' };
  const dirShow = { 'Sebastián': showDirSeb, 'Santiago': showDirSan, 'Emiliano': showDirEmi };
  const directors = ['Sebastián', 'Santiago', 'Emiliano'];

  // Últimos 12 meses
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ y: d.getFullYear(), m: d.getMonth() + 1, label: d.toLocaleString('es', { month: 'short' }).replace('.', '') });
  }
  const prefixes = months.map(p => p.y + '-' + String(p.m).padStart(2, '0'));
  const retiros = movsDir.filter(m => m.tipo === 'Egreso' && ((m.categoriaEgreso || '').toLowerCase() === 'retiros'));
  const chartData = months.map((p, idx) => {
    const prefix = prefixes[idx];
    const vals = {};
    directors.forEach(dir => {
      vals[dir] = retiros.filter(m => normDir(m.directorId) === dir && normalizeYearMonth(m.fecha) === prefix)
        .reduce((a, m) => a + convertToUSD(Number(m.monto) || 0, m.moneda, m.cotizacionHistorica || m.tipoCambioReferencia), 0);
    });
    const total = directors.filter(d => dirShow[d]).reduce((a, d) => a + vals[d], 0);
    return { label: p.label, vals, total };
  });
  const maxVal = Math.max(...chartData.map(d => d.total), 1);

  const fmtUSD = (v) => (v < 0 ? '-' : '') + 'u$d ' + Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Aportes / Ingresos', val: ingresosDir, color: 'text-emerald-400', symbol: 'u$d', blurColor: 'bg-emerald-500' },
          { label: 'Retiros / Egresos', val: egresosDir, color: 'text-rose-400', symbol: 'u$d', blurColor: 'bg-rose-500' },
          { label: 'Saldo Neto USD', val: saldoDir, color: saldoDir >= 0 ? 'text-blue-400' : 'text-orange-400', symbol: 'u$d', blurColor: saldoDir >= 0 ? 'bg-blue-500' : 'bg-orange-500' },
        ].map(({ label, val, color, symbol, blurColor }) => (
          <div key={label} className="glass-panel rounded-[2rem] p-6 border border-white/5 relative overflow-hidden shadow-2xl">
            <div className={`absolute top-0 right-0 w-32 h-32 ${blurColor}/[0.15] rounded-full blur-[32px] pointer-events-none -mt-8 -mr-8`} />
            <div className="relative z-10">
              <p className="darq-label mb-3">{label}</p>
              <p className={`text-3xl font-black tracking-tighter ${color}`}>{symbol} {(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Retiros Mensuales por Director — Barras */}
      <div className="glass-panel rounded-[2rem] p-6 border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/[0.05] rounded-full blur-[64px] pointer-events-none -mt-16 -mr-16" />
        <div className="relative z-10 flex items-center justify-between mb-5">
          <h4 className="darq-label">Retiros Mensuales por Director (u$d)</h4>
          <div className="flex gap-2">
            <button onClick={() => setShowDirSeb(v => !v)} className={"flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all " + (showDirSeb ? "text-amber-400 bg-amber-500/15" : "text-slate-600 bg-white/5 line-through")}>
              <span className="w-3 h-3 rounded bg-amber-500 inline-block"></span>Sebastián
            </button>
            <button onClick={() => setShowDirSan(v => !v)} className={"flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all " + (showDirSan ? "text-blue-400 bg-blue-500/15" : "text-slate-600 bg-white/5 line-through")}>
              <span className="w-3 h-3 rounded bg-blue-500 inline-block"></span>Santiago
            </button>
            <button onClick={() => setShowDirEmi(v => !v)} className={"flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all " + (showDirEmi ? "text-emerald-400 bg-emerald-500/15" : "text-slate-600 bg-white/5 line-through")}>
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>Emiliano
            </button>
          </div>
        </div>
        <div className="relative" style={{ height: 240 }}>
          <div className="absolute inset-0 flex items-end gap-1" style={{ paddingBottom: 24 }}>
            {chartData.map((d, i) => {
              const segments = directors.filter(dir => dirShow[dir]).map(dir => ({
                dir, val: d.vals[dir], color: dirColors[dir],
              })).filter(s => s.val > 0);
              const totalH = d.total / maxVal * 180;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end relative group" style={{ minWidth: 0 }}>
                  <div className="w-[70%] flex flex-col-reverse rounded-t-sm overflow-hidden" style={{ height: totalH }}>
                    {segments.map(s => (
                      <div key={s.dir} style={{ height: (s.val / d.total) * totalH, backgroundColor: s.color, opacity: 0.7 }} className="w-full transition-all group-hover:opacity-100" />
                    ))}
                  </div>
                  <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity z-20 glass-panel border border-white/10 rounded-lg px-3 py-2 pointer-events-none shadow-xl" style={{ bottom: totalH + 30, whiteSpace: 'nowrap' }}>
                    <p className="text-[10px] font-black text-white mb-1">Total: u$d {Math.round(d.total).toLocaleString('es-AR')}</p>
                    {directors.filter(dir => dirShow[dir] && d.vals[dir] > 0).map(dir => (
                      <p key={dir} className="text-[10px] text-slate-400"><span style={{ color: dirColors[dir] }}>■</span> {dir}: u$d {Math.round(d.vals[dir]).toLocaleString('es-AR')}</p>
                    ))}
                  </div>
                  <span className="absolute bottom-0 text-[10px] font-black text-slate-600 uppercase">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Por Director — Balance Anual */}
      <div className="glass-panel rounded-[2rem] p-6 border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/[0.05] rounded-full blur-[64px] pointer-events-none -mt-16 -mr-16" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
          {Object.entries(porDirector).map(([dir, data]) => {
            const saldo = data.ingresos - data.egresos;
            const dirName = dir.toUpperCase();
            const colorMap = { 
              'SANTIAGO': 'from-blue-500 to-indigo-600', 
              'SEBASTIÁN': 'from-amber-300 to-yellow-500',
              'SEBASTIAN': 'from-amber-300 to-yellow-500',
              'EMILIANO': 'from-emerald-500 to-teal-600', 
              'FLORENCIA': 'from-purple-500 to-fuchsia-600' 
            };
            const gradient = colorMap[dirName] || 'from-slate-500 to-slate-700';
            const initial = dir.charAt(0).toUpperCase();
            const movsDirector = movsDir.filter(m => normDir(m.directorId) === dir);
            const years = [...new Set(movsDirector.map(m => (m.fecha || '').substring(0, 4)).filter(y => y && y !== ''))].sort();
            const yearData = years.map(y => {
              const movsY = movsDirector.filter(m => (m.fecha || '').startsWith(y));
              const ing = movsY.filter(m => m.tipo === 'Ingreso').reduce((a, m) => a + convertToUSD(Number(m.monto) || 0, m.moneda, m.cotizacionHistorica || m.tipoCambioReferencia), 0);
              const egr = movsY.filter(m => m.tipo === 'Egreso').reduce((a, m) => a + convertToUSD(Number(m.monto) || 0, m.moneda, m.cotizacionHistorica || m.tipoCambioReferencia), 0);
              const bal = ing - egr;
              const mesesActivos = new Set(movsY.map(m => (m.fecha || '').substring(0, 7))).size || 1;
              return { year: y, bal, promMes: bal / mesesActivos };
            });
            return (
              <div key={dir} onClick={() => setDirectorDetalle(dir)} className="glass-panel rounded-[2rem] border border-white/[0.05] cursor-pointer hover:bg-white/[0.05] hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 group overflow-hidden relative">
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[32px] pointer-events-none -mt-8 -mr-8 opacity-30 bg-gradient-to-br ${gradient}`} />
                <div className={`h-1.5 w-full bg-gradient-to-r relative z-10 ${gradient}`}></div>
                <div className="p-6 relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-black text-base`}>{initial}</div>
                      <p className="text-sm font-black text-white uppercase tracking-wide group-hover:text-blue-300 transition-colors">{dir}</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
                  </div>
                  <div className="space-y-1.5">
                    {yearData.map(yd => (
                      <div key={yd.year} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                        <span className="text-[10px] font-black text-slate-500">{yd.year}</span>
                        <div className="text-right">
                          <span className={"text-xs font-black tracking-tight " + (yd.bal >= 0 ? "text-emerald-400" : "text-rose-400")}>u$d {Math.round(yd.bal).toLocaleString('es-AR')}</span>
                          <span className="text-[10px] font-bold text-slate-400 ml-2">{Math.round(yd.promMes).toLocaleString('es-AR')}/mes</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="darq-label">Total</span>
                    <span className={`text-2xl font-black tabular-nums tracking-tighter ${saldo >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>u$d {saldo.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {Object.keys(porDirector).length === 0 && <p className="col-span-2 text-slate-500 text-sm font-bold py-6">Sin movimientos registrados en Directorio.</p>}
        </div>
      </div>

      {/* Detalle por Director */}
      {directorDetalle && (() => {
        const movsDirector = movsDir.filter(m => normDir(m.directorId) === directorDetalle);
        const tree = {};
        let totalUSD = 0;
        movsDirector.forEach(m => {
          const f = m.fecha || '';
          const [y, mm] = f.split('-');
          const año = y || 'Sin Año';
          const mesNum = parseInt(mm) || 0;
          const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
          const mes = meses[mesNum] || 'Sin Mes';
          const cat = m.categoriaEgreso || 'Sin Categoría';
          const rub = m.rubro || 'Sin Rubro';
          const usd = convertToUSD(Number(m.monto) || 0, m.moneda, m.cotizacionHistorica || m.tipoCambioReferencia);
          const signo = m.tipo === 'Ingreso' ? 1 : -1;
          const val = usd * signo;
          totalUSD += val;
          if (!tree[año]) tree[año] = {};
          if (!tree[año][mesNum + '_' + mes]) tree[año][mesNum + '_' + mes] = {};
          if (!tree[año][mesNum + '_' + mes][cat]) tree[año][mesNum + '_' + mes][cat] = {};
          if (!tree[año][mesNum + '_' + mes][cat][rub]) tree[año][mesNum + '_' + mes][cat][rub] = { items: [], total: 0 };
          tree[año][mesNum + '_' + mes][cat][rub].items.push({ ...m, usdVal: val });
          tree[año][mesNum + '_' + mes][cat][rub].total += val;
        });
        return (
          <div className="glass-panel rounded-xl border border-white/5 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-gradient-to-r from-blue-900/20 to-indigo-900/20">
              <div className="flex items-center gap-4">
                <button onClick={() => setDirectorDetalle(null)} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                  <ChevronLeft size={18} />
                </button>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">{directorDetalle}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{movsDirector.length} movimientos · Balance: <span className={totalUSD >= 0 ? 'text-blue-400' : 'text-orange-400'}>{fmtUSD(totalUSD)}</span></p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {Object.keys(tree).sort((a, b) => b.localeCompare(a)).map(año => {
                const mesesData = tree[año];
                const añoTotal = Object.values(mesesData).reduce((a, cats) => a + Object.values(cats).reduce((b, rubs) => b + Object.values(rubs).reduce((c, r) => c + r.total, 0), 0), 0);
                return (
                  <details key={año} open={Object.keys(tree).length <= 2} className="group">
                    <summary className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors list-none">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-lg">{año}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{Object.keys(mesesData).length} meses</span>
                      </div>
                      <span className={`text-sm font-black ${añoTotal >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{fmtUSD(añoTotal)}</span>
                    </summary>
                    <div className="ml-4 mt-2 space-y-2 border-l-2 border-white/5 pl-4">
                      {Object.keys(mesesData).sort((a, b) => parseInt(a) - parseInt(b)).map(mesKey => {
                        const mes = mesKey.split('_')[1];
                        const catsData = mesesData[mesKey];
                        const mesTotal = Object.values(catsData).reduce((a, rubs) => a + Object.values(rubs).reduce((b, r) => b + r.total, 0), 0);
                        return (
                          <details key={mesKey}>
                            <summary className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors list-none">
                              <span className="text-[10px] font-black text-indigo-400">{mes}</span>
                              <span className={`text-xs font-black ${mesTotal >= 0 ? 'text-slate-300' : 'text-rose-400'}`}>{fmtUSD(mesTotal)}</span>
                            </summary>
                            <div className="ml-4 mt-1 space-y-1 border-l border-white/5 pl-3">
                              {Object.keys(catsData).sort().map(cat => {
                                const rubsData = catsData[cat];
                                const catTotal = Object.values(rubsData).reduce((a, r) => a + r.total, 0);
                                return (
                                  <details key={cat}>
                                    <summary className="flex items-center justify-between cursor-pointer p-1.5 rounded hover:bg-white/5 transition-colors list-none">
                                      <span className="darq-label">{cat}</span>
                                      <span className={`text-[10px] font-black ${catTotal >= 0 ? 'text-slate-400' : 'text-rose-400'}`}>{fmtUSD(catTotal)}</span>
                                    </summary>
                                    <div className="ml-4 mt-1 space-y-0.5 border-l border-white/5 pl-3">
                                      {Object.keys(rubsData).sort().map(rub => {
                                        const rd = rubsData[rub];
                                        return (
                                          <details key={rub}>
                                            <summary className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-white/5 transition-colors list-none">
                                              <span className="text-[10px] font-bold text-slate-500">{rub === '-' || rub === 'sin rubro' ? '(sin rubro)' : rub}</span>
                                              <div className="flex items-center gap-3">
                                                <span className="text-[10px] text-slate-600">{rd.items.length} mov</span>
                                                <span className={`text-[10px] font-black ${rd.total >= 0 ? 'text-slate-400' : 'text-rose-400'}`}>{fmtUSD(rd.total)}</span>
                                              </div>
                                            </summary>
                                            <div className="ml-2 mt-1 mb-2">
                                              <table className="w-full text-[10px]">
                                                <thead>
                                                  <tr className="text-slate-600 uppercase tracking-widest">
                                                    <th className="text-left p-1 font-black">Fecha</th>
                                                    <th className="text-left p-1 font-black">Concepto</th>
                                                    <th className="text-left p-1 font-black">Caja</th>
                                                    <th className="text-right p-1 font-black">Monto</th>
                                                    <th className="text-right p-1 font-black">USD</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                  {rd.items.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')).map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                      <td className="p-1 text-slate-400 font-bold">{item.fecha}</td>
                                                      <td className="p-1 text-slate-300">{item.concepto || '-'}</td>
                                                      <td className="p-1 text-slate-500">{item.caja}</td>
                                                      <td className={`p-1 text-right font-black ${item.tipo === 'Ingreso' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {item.moneda === 'USD' ? 'u$d' : '$'} {Number(item.monto).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                                      </td>
                                                      <td className={`p-1 text-right font-black ${item.usdVal >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                                                        {fmtUSD(item.usdVal)}
                                                      </td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          </details>
                                        );
                                      })}
                                    </div>
                                  </details>
                                );
                              })}
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
