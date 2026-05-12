import React, { useState } from 'react';
import { ArrowLeft, Plus, TrendingUp, Calendar, CheckCircle2, Clock, Hash, Droplets, X, FileSignature, HardHat, Building2, ChevronRight } from 'lucide-react';
import { convertToUSD as _convertToUSD, normalizeYearMonth } from '../helpers/financieros';

/**
 * Dashboard Área Obras
 * Props: movimientos, obras, proveedores, cotizacionBlue,
 *        setFormMov, setIsModalMovOpen, formMov, handleEditObra
 */
export default function AreaObras({
  movimientos, obras, proveedores, cotizacionBlue,
  setFormMov, setIsModalMovOpen, formMov, handleEditObra
}) {
  const convertToUSD = (monto, moneda, tc) => _convertToUSD(monto, moneda, tc, cotizacionBlue);

  // ── Internal state (moved from App.jsx) ──
  const [obrasView, setObrasView] = useState('dashboard');
  const [selectedObraId, setSelectedObraId] = useState(null);
  const [reporteObraId, setReporteObraId] = useState('todas');
  const [reporteObraSearch, setReporteObraSearch] = useState('');
  const [reporteObraDropdownOpen, setReporteObraDropdownOpen] = useState(false);
  const [showObrasIng, setShowObrasIng] = useState(true);
  const [showObrasEgr, setShowObrasEgr] = useState(true);
  const [reporteProveedorFilter, setReporteProveedorFilter] = useState('');

  return (
            <div className="space-y-0 animate-in fade-in slide-in-from-bottom-4 duration-700">

              {/* â”€â”€ Nav bar de Obras â”€â”€ */}
              <div className="flex items-center justify-between mb-10">
                <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
                  {['dashboard', 'reportes'].map(v => (
                    <button key={v} onClick={() => { setObrasView(v); setSelectedObraId(null); }}
                      className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${obrasView === v ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-white'}`}>
                      {v === 'dashboard' ? 'Panel de Área' : 'Reportes por Obra'}
                    </button>
                  ))}
                </div>
              </div>

              {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• DASHBOARD â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
              {obrasView === 'dashboard' && !selectedObraId && (() => {
                const movsObras = movimientos.filter(m => m.area === 'Obras');

                // Last 12 months calculation
                const now = new Date();
                const last12 = [];
                for (let i = 11; i >= 0; i--) {
                  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                  last12.push({ y: d.getFullYear(), m: d.getMonth() + 1, label: d.toLocaleString('es', {month:'short'}).replace('.','') });
                }
                const last12Prefixes = last12.map(p => `${p.y}-${String(p.m).padStart(2,'0')}`);
                const movs12 = movsObras.filter(m => last12Prefixes.includes(normalizeYearMonth(m.fecha)));
                const deptoIds = new Set(obras.filter(o => o.tipoObra === 'departamento').map(o => o.id));
                const desarrolloIds = new Set(obras.filter(o => o.tipoObra === 'desarrollo').map(o => o.id));
                const servicioIds = new Set(obras.filter(o => !o.tipoObra || o.tipoObra === 'servicio').map(o => o.id));
                const movs12Obras = movs12.filter(m => !deptoIds.has(m.obraId));
                const movs12Servicio = movs12.filter(m => servicioIds.has(m.obraId));
                const movs12Desarrollo = movs12.filter(m => desarrolloIds.has(m.obraId));
                const movs12Deptos = movs12.filter(m => deptoIds.has(m.obraId));
                const balObras12 = movs12Obras.reduce((acc, m) => acc + (m.tipo === 'Ingreso' ? convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia) : -convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia)), 0);
                const balServicio12 = movs12Servicio.reduce((acc, m) => acc + (m.tipo === 'Ingreso' ? convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia) : -convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia)), 0);
                const balDesarrollo12 = movs12Desarrollo.reduce((acc, m) => acc + (m.tipo === 'Ingreso' ? convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia) : -convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia)), 0);
                const balDeptos12 = movs12Deptos.reduce((acc, m) => acc + (m.tipo === 'Ingreso' ? convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia) : -convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia)), 0);
                const obrasActivas = obras.filter(o => o.estado !== 'Finalizada');
                const obrasFinalizadas = obras.filter(o => o.estado === 'Finalizada');

                // Certificados a cobrar
                const certificados = movsObras.filter(m => m.tipoObraIngreso === 'CERTIFICACIONES');
                const totalCert = certificados.reduce((acc, m) => acc + convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia), 0);

                // SVG Chart data — últimos 12 meses (u$d)
                const chartData = last12.map((p, idx) => {
                  const prefix = last12Prefixes[idx];
                  const ing = movsObras.filter(m => servicioIds.has(m.obraId) && m.tipo === 'Ingreso' && normalizeYearMonth(m.fecha) === prefix).reduce((a, m) => a + convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia), 0);
                  const egr = movsObras.filter(m => servicioIds.has(m.obraId) && m.tipo === 'Egreso' && normalizeYearMonth(m.fecha) === prefix).reduce((a, m) => a + convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia), 0);
                  return { label: p.label, ing, egr };
                });
                const maxVal = Math.max(...chartData.map(d => Math.max(d.ing, d.egr)), 1);
                const W = 700, H = 180, PAD = 30;
                const xStep = (W - PAD * 2) / 11;
                const yOf = v => H - PAD - ((v / maxVal) * (H - PAD * 2));
                const polyline = pts => pts.map((p, i) => `${PAD + i * xStep},${yOf(p)}`).join(' ');

                return (
                  <div className="space-y-10">
                    {/* === ROW 1: Balance por Tipo de Obra (anual) === */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {[
                        { tipo: 'servicio', label: 'Servicios a Terceros', color: 'from-blue-500 to-indigo-600', borderColor: 'border-blue-500/20' },
                        { tipo: 'desarrollo', label: 'Desarrollo Propio', color: 'from-violet-500 to-purple-600', borderColor: 'border-violet-500/20' },
                        { tipo: 'departamento', label: 'Departamentos', color: 'from-amber-500 to-orange-600', borderColor: 'border-amber-500/20' },
                      ].map(({ tipo, label, color, borderColor }) => {
                        const ids = new Set(obras.filter(o => tipo === 'servicio' ? (!o.tipoObra || o.tipoObra === 'servicio') : o.tipoObra === tipo).map(o => o.id));
                        const movsT = movsObras.filter(m => ids.has(m.obraId));
                        const activas = obras.filter(o => ids.has(o.id) && o.estado !== 'Finalizada').length;
                        const finalizadas = obras.filter(o => ids.has(o.id) && o.estado === 'Finalizada').length;

                        const years = [...new Set(movsT.map(m => (m.fecha||'').substring(0,4)).filter(y => y && y !== ''))].sort();
                        const currentYear = new Date().getFullYear();
                        const allYears = years.length > 0 ? years : [String(currentYear)];

                        const yearData = allYears.map(y => {
                          const movsY = movsT.filter(m => (m.fecha||'').startsWith(y));
                          const ing = movsY.filter(m => m.tipo === 'Ingreso').reduce((a, m) => a + convertToUSD(Number(m.monto)||0, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia), 0);
                          const egr = movsY.filter(m => m.tipo === 'Egreso').reduce((a, m) => a + convertToUSD(Number(m.monto)||0, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia), 0);
                          const bal = ing - egr;
                          const mesesActivos = new Set(movsY.map(m => (m.fecha||'').substring(0,7))).size || 1;
                          return { year: y, bal, promMes: bal / mesesActivos, meses: mesesActivos };
                        });

                        const totalHist = movsT.reduce((a, m) => a + (m.tipo === 'Ingreso' ? convertToUSD(Number(m.monto)||0, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia) : -convertToUSD(Number(m.monto)||0, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia)), 0);

                        return (
                          <div key={tipo} className={"glass-panel rounded-[2rem] border overflow-hidden relative shadow-2xl flex flex-col justify-between " + borderColor}>
                            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[32px] pointer-events-none -mt-8 -mr-8 opacity-40 bg-gradient-to-br ${color}`} />
                            <div className={"h-1.5 w-full bg-gradient-to-r relative z-10 " + color}></div>
                            <div className="p-6 relative z-10 flex-1 flex flex-col">
                              <div className="flex items-center justify-between mb-6">
                                <h4 className="darq-label">{label}</h4>
                                <div className="flex gap-2">
                                  <span className="text-[10px] font-black bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">{activas} act.</span>
                                  <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">{finalizadas} fin.</span>
                                </div>
                              </div>

                              <div className="space-y-2 flex-1">
                                {yearData.map(yd => (
                                  <div key={yd.year} className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-black/30 border border-white/[0.05] hover:bg-white/[0.06] hover:-translate-y-0.5 transition-all">
                                    <span className="text-[10px] font-black text-slate-500">{yd.year}</span>
                                    <div className="text-right">
                                      <p className={"text-sm font-black tracking-tight " + (yd.bal >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                        u$d {Math.round(yd.bal).toLocaleString('es-AR')}
                                      </p>
                                      <p className="text-[10px] font-bold text-slate-400">
                                        u$d {Math.round(yd.promMes).toLocaleString('es-AR')}/mes
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                                <span className="darq-label">Total Histórico</span>
                                <p className={"text-2xl font-black tracking-tighter " + (totalHist >= 0 ? "text-white" : "text-rose-400")}>
                                  u$d {Math.round(totalHist).toLocaleString('es-AR')}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* === ROW 2: SVG Chart + Ranking === */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 glass-panel rounded-[2rem] border border-white/5 p-6 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/[0.05] rounded-full blur-[64px] pointer-events-none -mt-16 -mr-16" />
                        <div className="relative z-10">
                        <h4 className="darq-label mb-4">Ingresos vs. Egresos — Últimos 12 meses</h4>
                        <div className="flex gap-4 mb-4">
                          <button onClick={() => setShowObrasIng(v => !v)} className={`flex items-center gap-2 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all ${showObrasIng ? 'text-emerald-400 bg-emerald-500/15' : 'text-slate-600 bg-white/5 line-through'}`}>
                            <span className="w-4 h-0.5 bg-emerald-400 inline-block rounded-full"></span>Ingresos
                          </button>
                          <button onClick={() => setShowObrasEgr(v => !v)} className={`flex items-center gap-2 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all ${showObrasEgr ? 'text-orange-500 bg-orange-500/15' : 'text-slate-600 bg-white/5 line-through'}`}>
                            <span className="w-4 h-0.5 bg-orange-500 inline-block rounded-full"></span>Egresos
                          </button>
                        </div>
                        <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" style={{height: 280}}>
                          {[0,0.25,0.5,0.75,1].map(t => (
                            <g key={t}>
                              <line x1={PAD} y1={yOf(maxVal * t)} x2={W - PAD} y2={yOf(maxVal * t)} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                              <text x={PAD - 4} y={yOf(maxVal * t) + 3} textAnchor="end" fill="rgba(148,163,184,0.5)" fontSize="7" fontWeight="700" fontFamily="sans-serif">
                                {(maxVal * t / 1000).toFixed(0)}k
                              </text>
                            </g>
                          ))}
                          {showObrasIng && <polygon points={`${PAD},${H - PAD} ${chartData.map((d, i) => `${PAD + i * xStep},${yOf(d.ing)}`).join(' ')} ${PAD + 11 * xStep},${H - PAD}`} fill="rgba(52,211,153,0.08)"/>}
                          {showObrasEgr && <polygon points={`${PAD},${H - PAD} ${chartData.map((d, i) => `${PAD + i * xStep},${yOf(d.egr)}`).join(' ')} ${PAD + 11 * xStep},${H - PAD}`} fill="rgba(249,115,22,0.08)"/>}
                          {showObrasIng && <polyline points={polyline(chartData.map(d => d.ing))} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>}
                          {showObrasEgr && <polyline points={polyline(chartData.map(d => d.egr))} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>}
                          {chartData.map((d, i) => (
                            <g key={i}>
                              {showObrasIng && d.ing > 0 && <circle cx={PAD + i * xStep} cy={yOf(d.ing)} r="4" fill="#34d399"/>}
                              {showObrasEgr && d.egr > 0 && <circle cx={PAD + i * xStep} cy={yOf(d.egr)} r="4" fill="#f97316"/>}
                            </g>
                          ))}
                          {chartData.map((d, i) => (
                            <text key={i} x={PAD + i * xStep} y={H + 14} textAnchor="middle" fill="rgba(148,163,184,0.6)" fontSize="9" fontWeight="700" fontFamily="sans-serif">{d.label}</text>
                          ))}
                        </svg>
                        </div>
                      </div>

                      {/* Ranking de Rentabilidad */}
                      <div className="glass-panel rounded-[2rem] border border-white/5 p-6 relative overflow-hidden shadow-2xl flex flex-col">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/[0.1] rounded-full blur-[32px] pointer-events-none -mt-8 -mr-8" />
                        <h4 className="darq-label mb-4 relative z-10">Ranking Rentabilidad</h4>
                        <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar">
                          {(() => {
                            const ranking = obras.filter(o => o.estado === 'Finalizada' && (o.tipoObra === 'servicio' || !o.tipoObra)).map(o => {
                              const mO = movimientos.filter(m => m.obraId === o.id);
                              const ingO = mO.filter(m => m.tipo === 'Ingreso').reduce((a, m) => a + convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia), 0);
                              const egrO = mO.filter(m => m.tipo === 'Egreso').reduce((a, m) => a + convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia), 0);
                              const bal = ingO - egrO;
                              const egrs = mO.filter(m => m.tipo === 'Egreso').map(m => m.fecha).filter(Boolean).sort();
                              const fi = o.fechaInicioReal || (egrs.length > 0 ? egrs[0] : null);
                              const ff = o.fechaFinReal || (o.estado === 'Finalizada' && egrs.length > 0 ? egrs[egrs.length - 1] : null);
                              let meses = 0;
                              if (fi && ff) {
                                meses = Math.max(1, Math.round((new Date(ff) - new Date(fi)) / (1000*60*60*24*30)));
                              }
                              const rentMes = meses > 0 ? bal / meses : 0;
                              return { nombre: o.nombre, bal, meses, rentMes, ingO };
                            }).filter(o => o.ingO > 0).sort((a, b) => b.rentMes - a.rentMes);

                            return ranking.length > 0 ? ranking.map((r, idx) => (
                              <div key={r.nombre} className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/[0.05] hover:bg-white/[0.06] hover:-translate-y-0.5 transition-all group relative z-10">
                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : idx === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' : idx === 2 ? 'bg-orange-700/20 text-orange-400 border border-orange-700/30' : 'bg-white/5 text-slate-500'}`}>{idx + 1}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-black text-white truncate">{r.nombre}</p>
                                  <p className="text-[10px] text-slate-500">{r.meses} meses · u$d {Math.round(r.rentMes).toLocaleString('es-AR')}/mes</p>
                                </div>
                                <span className={`text-xs font-black tabular-nums ${r.bal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>u$d {Math.round(r.bal).toLocaleString('es-AR')}</span>
                              </div>
                            )) : <p className="text-[10px] text-slate-500 font-bold">Sin obras finalizadas</p>;
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Lista obras — Dropdowns */}
                    {(() => {
                      const isServicio = o => !o.tipoObra || o.tipoObra === 'servicio';
                      const isDesarrollo = o => o.tipoObra === 'desarrollo';
                      const isDpto = o => o.tipoObra === 'departamento';
                      const obrasProceso = obras.filter(o => isServicio(o) && o.estado !== 'Finalizada');
                      const obrasTerminadas = obras.filter(o => isServicio(o) && o.estado === 'Finalizada');
                      const obrasDesarrollo = obras.filter(o => isDesarrollo(o));
                      const deptos = obras.filter(o => isDpto(o));

                      const renderRow = o => {
                        const mObra = movimientos.filter(m => m.obraId === o.id);
                        const bObra = mObra.reduce((acc, m) => acc + (m.tipo==='Ingreso' ? convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia) : -convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia)), 0);
                        return (
                          <div key={o.id} onClick={() => setSelectedObraId(o.id)} className="flex items-center justify-between gap-4 px-5 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors cursor-pointer group">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className={`shrink-0 w-2 h-2 rounded-full ${o.estado==='Finalizada'?'bg-emerald-400':o.estado==='Pausada'?'bg-amber-400':'bg-blue-400'}`}></span>
                              <div className="min-w-0">
                                <h3 className="text-[11px] font-black text-white truncate">{o.nombre}</h3>
                                <p className="text-[10px] font-bold text-slate-500 truncate">{o.direccion || 'Sin dirección'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${o.estado==='Finalizada'?'bg-emerald-500/15 text-emerald-400':o.estado==='Pausada'?'bg-amber-500/15 text-amber-400':'bg-blue-500/15 text-blue-400'}`}>{o.estado}</span>
                              <p className={`text-sm font-black tabular-nums min-w-[100px] text-right ${bObra < 0 ? 'text-rose-400' : 'text-white'}`}>u$d {bObra.toLocaleString('es-AR', {maximumFractionDigits: 0})}</p>
                              <button onClick={(e) => { e.stopPropagation(); handleEditObra(o); }} className="p-1.5 rounded-lg bg-white/5 text-slate-500 opacity-0 group-hover:opacity-100 transition-all hover:text-white">
                                <FileSignature size={11} />
                              </button>
                            </div>
                          </div>
                        );
                      };

                      return (
                        <div className="space-y-4">
                          {/* En Proceso + Pausadas */}
                          <details open className="glass-panel rounded-xl border border-white/5 overflow-hidden">
                            <summary className="px-5 py-4 cursor-pointer list-none flex items-center justify-between hover:bg-white/[0.03] transition-colors">
                              <div className="flex items-center gap-2">
                                <HardHat size={14} className="text-blue-400"/>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Obras en Proceso / Pausadas</span>
                              </div>
                              <span className="text-[10px] font-black text-blue-400 bg-blue-500/15 px-3 py-1 rounded-full">{obrasProceso.length}</span>
                            </summary>
                            <div>{obrasProceso.map(renderRow)}</div>
                          </details>

                          {/* Finalizadas */}
                          <details className="glass-panel rounded-xl border border-white/5 overflow-hidden">
                            <summary className="px-5 py-4 cursor-pointer list-none flex items-center justify-between hover:bg-white/[0.03] transition-colors">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 size={14} className="text-emerald-400"/>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Obras Finalizadas</span>
                              </div>
                              <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full">{obrasTerminadas.length}</span>
                            </summary>
                            <div>{obrasTerminadas.map(renderRow)}</div>
                          </details>

                          {/* Desarrollo Propio */}
                          {obrasDesarrollo.length > 0 && (
                            <details className="glass-panel rounded-xl border border-white/5 overflow-hidden">
                              <summary className="px-5 py-4 cursor-pointer list-none flex items-center justify-between hover:bg-white/[0.03] transition-colors">
                                <div className="flex items-center gap-2">
                                  <Building2 size={14} className="text-violet-400"/>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desarrollos Propios</span>
                                </div>
                                <span className="text-[10px] font-black text-violet-400 bg-violet-500/15 px-3 py-1 rounded-full">{obrasDesarrollo.length}</span>
                              </summary>
                              <div>{obrasDesarrollo.map(renderRow)}</div>
                            </details>
                          )}

                          {/* Venta de Departamentos */}
                          {deptos.length > 0 && (
                            <details className="glass-panel rounded-xl border border-white/5 overflow-hidden">
                              <summary className="px-5 py-4 cursor-pointer list-none flex items-center justify-between hover:bg-white/[0.03] transition-colors">
                                <div className="flex items-center gap-2">
                                  <Building2 size={14} className="text-indigo-400"/>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Venta de Departamentos</span>
                                </div>
                                <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/15 px-3 py-1 rounded-full">{deptos.length}</span>
                              </summary>
                              <div>{deptos.map(renderRow)}</div>
                            </details>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

              {/* â•â• DETALLE DE OBRA (desde dashboard) â•â• */}
              {obrasView === 'dashboard' && selectedObraId && (() => {
                const obra = obras.find(o => o.id === selectedObraId);
                const mObra = movimientos.filter(m => m.obraId === selectedObraId);
                const mEgr = mObra.filter(m => m.tipo === 'Egreso');
                const ing = mObra.filter(m => m.tipo === 'Ingreso').reduce((a, m) => a + convertToUSD(m.monto, m.moneda, m.cotizacionHistorica || m.tipoCambioReferencia), 0);
                const egr = mEgr.reduce((a, m) => a + convertToUSD(m.monto, m.moneda, m.cotizacionHistorica || m.tipoCambioReferencia), 0);

                // Breakdown: categoría → rubro → concepto (todo en USD equiv.)
                const catMap = {};
                mEgr.forEach(m => {
                  const cat = m.categoriaEgreso || 'Varios';
                  const rub = m.rubro || '-';
                  const con = m.concepto || m.subRubro || '-';
                  if (!catMap[cat]) catMap[cat] = {};
                  if (!catMap[cat][rub]) catMap[cat][rub] = {};
                  if (!catMap[cat][rub][con]) catMap[cat][rub][con] = {usd: 0, ars: 0};
                  catMap[cat][rub][con].usd += convertToUSD(m.monto, m.moneda, m.cotizacionHistorica || m.tipoCambioReferencia);
                  catMap[cat][rub][con].ars += m.moneda === 'USD' ? (Number(m.monto)||0) * (m.cotizacionHistorica||m.tipoCambioReferencia||cotizacionBlue) : (Number(m.monto)||0);
                });
                const totalEgr = egr || 1;

                return (
                  <div className="space-y-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                      <div className="space-y-3">
                        <button onClick={() => setSelectedObraId(null)} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
                          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform"/>
                          <span className="text-[10px] font-bold uppercase tracking-widest">Volver al Panel</span>
                        </button>
                        <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">{obra?.nombre}</h3>
                        <p className="darq-label">{obra?.direccion}</p>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        <button onClick={() => { setFormMov({...formMov, area:'Obras', obraId:selectedObraId, tipo:'Ingreso'}); setIsModalMovOpen(true); }}
                          className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">
                          + Ingreso
                        </button>
                        <button onClick={() => { setFormMov({...formMov, area:'Obras', obraId:selectedObraId, tipo:'Egreso'}); setIsModalMovOpen(true); }}
                          className="px-6 py-3 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">
                          + Egreso
                        </button>
                      </div>
                    </div>

                    {/* KPIs obra */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { label: 'Ingresos', v: ing, color: 'text-emerald-400', blurColor: 'bg-emerald-500' },
                        { label: 'Egresos', v: egr, color: 'text-rose-400', blurColor: 'bg-rose-500' },
                        { label: 'Balance', v: ing - egr, color: ing - egr >= 0 ? 'text-white' : 'text-rose-400', blurColor: ing - egr >= 0 ? 'bg-blue-500' : 'bg-rose-500' },
                      ].map(k => (
                        <div key={k.label} className="glass-panel rounded-[2rem] border border-white/5 p-6 relative overflow-hidden shadow-2xl">
                          <div className={`absolute top-0 right-0 w-32 h-32 ${k.blurColor}/[0.15] rounded-full blur-[32px] pointer-events-none -mt-8 -mr-8`} />
                          <div className="relative z-10">
                            <p className="darq-label mb-2">{k.label}</p>
                            <p className={`text-3xl font-black tracking-tighter ${k.color}`}>u$d {k.v.toLocaleString('es-AR', {maximumFractionDigits: 0})}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Breakdown Categoría â†’ Rubro â†’ Concepto */}
                    <div className="glass-panel p-5 rounded-xl border border-white/5">
                      <h4 className="darq-label mb-6">Costos por Categoría / Rubro / Concepto</h4>
                      <div className="space-y-6">
                        {Object.entries(catMap).sort((a,b) => {
                          const sumA = Object.values(a[1]).flatMap(Object.values).reduce((s,v)=>s+v,0);
                          const sumB = Object.values(b[1]).flatMap(Object.values).reduce((s,v)=>s+v,0);
                          return sumB - sumA;
                        }).map(([cat, rubros]) => {
                          const catTotal = Object.values(rubros).flatMap(Object.values).reduce((s,v)=>s+v,0);
                          return (
                            <div key={cat} className="border border-white/5 rounded-2xl overflow-hidden">
                              <div className="flex justify-between items-center px-6 py-4 bg-white/3">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">{cat}</span>
                                <div className="flex items-center gap-4">
                                  <span className="text-[10px] font-black text-blue-400">{((catTotal/totalEgr)*100).toFixed(1)}%</span>
                                  <span className="text-sm font-black text-white">u$d {catTotal.toLocaleString('es-AR', {maximumFractionDigits: 0})}</span>
                                </div>
                              </div>
                              <div className="w-full h-1 bg-white/5"><div className="bg-blue-600 h-full" style={{width:`${(catTotal/totalEgr)*100}%`}}></div></div>
                              {Object.entries(rubros).sort((a,b)=>Object.values(b[1]).reduce((s,v)=>s+v,0)-Object.values(a[1]).reduce((s,v)=>s+v,0)).map(([rub, conceptos]) => {
                                const rubTotal = Object.values(conceptos).reduce((s,v)=>s+v,0);
                                return (
                                  <div key={rub} className="border-t border-white/5">
                                    <div className="flex justify-between items-center px-8 py-3 bg-white/[0.01]">
                                      <span className="text-[10px] font-black text-slate-400 uppercase">{rub}</span>
                                      <span className="text-xs font-black text-slate-300">u$d {rubTotal.toLocaleString('es-AR', {maximumFractionDigits: 0})}</span>
                                    </div>
                                    {Object.entries(conceptos).sort((a,b)=>b[1]-a[1]).map(([con, val]) => (
                                      <div key={con} className="flex justify-between items-center px-6 py-2 border-t border-white/[0.03]">
                                        <span className="text-[10px] text-slate-500">{con}</span>
                                        <span className="text-[10px] font-black text-slate-400">u$d {val.toLocaleString('es-AR', {maximumFractionDigits: 0})}</span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• REPORTES â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
              {obrasView === 'reportes' && (() => {
                const obrasFiltradas = reporteObraId === 'todas' ? obras : obras.filter(o => o.id === reporteObraId);
                const movsReporte = movimientos.filter(m => m.area === 'Obras' && (reporteObraId === 'todas' || m.obraId === reporteObraId));
                const movsEgr = movsReporte.filter(m => m.tipo === 'Egreso');
                const movsIng = movsReporte.filter(m => m.tipo === 'Ingreso');

                // Cuentas corrientes proveedores con desglose por obra
                const provMap = {};
                movsEgr.forEach(m => {
                  if (!m.proveedorId) return;
                  const prov = proveedores.find(p => p.id === m.proveedorId);
                  const nombre = prov?.nombre || 'Sin Nombre';
                  if (!provMap[nombre]) provMap[nombre] = { total: 0, totalARS: 0, porObra: {}, movs: [] };
                  const valUSD = convertToUSD(m.monto, m.moneda, m.cotizacionHistorica || m.tipoCambioReferencia);
                  const valARS = m.moneda === 'USD' ? (Number(m.monto)||0) * (m.cotizacionHistorica || m.tipoCambioReferencia || cotizacionBlue) : (Number(m.monto)||0);
                  provMap[nombre].total += valUSD;
                  provMap[nombre].totalARS += valARS;
                  const obraObj = obras.find(o => o.id === m.obraId);
                  const obraNombre = obraObj?.nombre || 'Sin Obra';
                  if (!provMap[nombre].porObra[obraNombre]) provMap[nombre].porObra[obraNombre] = { total: 0, totalARS: 0, movs: [] };
                  provMap[nombre].porObra[obraNombre].total += valUSD;
                  provMap[nombre].porObra[obraNombre].totalARS += valARS;
                  provMap[nombre].porObra[obraNombre].movs.push(m);
                  provMap[nombre].movs.push(m);
                });
                const filteredProvs = Object.entries(provMap).filter(([n]) =>
                  !reporteProveedorFilter || n.toLowerCase().includes(reporteProveedorFilter.toLowerCase())
                ).sort((a,b) => b[1].total - a[1].total);

                // Costos ordenados Catâ†’Rubâ†’Con
                const catMap = {};
                movsEgr.forEach(m => {
                  const cat = m.categoriaEgreso || 'Varios';
                  const rub = m.rubro || '-';
                  const con = m.concepto || m.subRubro || '-';
                  if (!catMap[cat]) catMap[cat] = {};
                  if (!catMap[cat][rub]) catMap[cat][rub] = {};
                  if (!catMap[cat][rub][con]) catMap[cat][rub][con] = {usd: 0, ars: 0};
                  catMap[cat][rub][con].usd += convertToUSD(m.monto, m.moneda, m.cotizacionHistorica || m.tipoCambioReferencia);
                  catMap[cat][rub][con].ars += m.moneda === 'USD' ? (Number(m.monto)||0) * (m.cotizacionHistorica||m.tipoCambioReferencia||cotizacionBlue) : (Number(m.monto)||0);
                });
                const totalEgr = movsEgr.reduce((a, m) => a + convertToUSD(m.monto, m.moneda, m.cotizacionHistorica || m.tipoCambioReferencia), 0) || 1;

                // Ingresos por categoría → rubro
                const ingMap = {};
                movsIng.forEach(m => {
                  const cat = m.tipoObraIngreso || 'INGRESO';
                  const rub = m.rubro || '—';
                  if (!ingMap[cat]) ingMap[cat] = { usd: 0, ars: 0, rubros: {} };
                  ingMap[cat].usd += convertToUSD(m.monto, m.moneda, m.cotizacionHistorica || m.tipoCambioReferencia);
                  ingMap[cat].ars += m.moneda === 'USD' ? (Number(m.monto)||0) * (m.cotizacionHistorica||m.tipoCambioReferencia||cotizacionBlue) : (Number(m.monto)||0);
                  if (!ingMap[cat].rubros[rub]) ingMap[cat].rubros[rub] = { usd: 0, ars: 0 };
                  ingMap[cat].rubros[rub].usd += convertToUSD(m.monto, m.moneda, m.cotizacionHistorica || m.tipoCambioReferencia);
                  ingMap[cat].rubros[rub].ars += m.moneda === 'USD' ? (Number(m.monto)||0) * (m.cotizacionHistorica||m.tipoCambioReferencia||cotizacionBlue) : (Number(m.monto)||0);
                });

                return (
                  <div className="space-y-10">
                    {/* Selector de obra searchable + KPIs */}
                    {(() => {
                      const totalIngUSD = movsIng.reduce((a,m) => a + convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia), 0);
                      const totalIngARS = movsIng.reduce((a,m) => a + (m.moneda === 'USD' ? (Number(m.monto)||0) * (m.cotizacionHistorica||m.tipoCambioReferencia||cotizacionBlue) : (Number(m.monto)||0)), 0);
                      const totalEgrUSD = movsEgr.reduce((a,m) => a + convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia), 0);
                      const totalEgrARS = movsEgr.reduce((a,m) => a + (m.moneda === 'USD' ? (Number(m.monto)||0) * (m.cotizacionHistorica||m.tipoCambioReferencia||cotizacionBlue) : (Number(m.monto)||0)), 0);
                      const balanceARS = totalIngARS - totalEgrARS;
                      const balanceUSD = totalIngUSD - totalEgrUSD;
                      const obrasFiltradas = reporteObraSearch.trim()
                        ? obras.filter(o => o.nombre?.toLowerCase().includes(reporteObraSearch.toLowerCase()))
                        : obras;
                      const selectedObraName = reporteObraId === 'todas' ? 'Todas las obras' : (obras.find(o => o.id === reporteObraId)?.nombre || 'Obra');
                      return (
                        <div className="space-y-6">
                          {/* Combobox searchable */}
                          <div className="relative" style={{maxWidth: 360}}>
                            <input
                              type="text"
                              value={reporteObraDropdownOpen ? reporteObraSearch : selectedObraName}
                              onFocus={() => { setReporteObraDropdownOpen(true); setReporteObraSearch(''); }}
                              onChange={e => setReporteObraSearch(e.target.value)}
                              placeholder="Buscar obra..."
                              className="w-full glass-panel text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-2xl outline-none border border-white/10 bg-transparent placeholder:text-slate-600"
                            />
                            {reporteObraDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-2 glass-panel border border-white/10 rounded-2xl overflow-hidden z-50 max-h-72 overflow-y-auto custom-scrollbar shadow-lg">
                                <button
                                  onClick={() => { setReporteObraId('todas'); setReporteObraDropdownOpen(false); setReporteObraSearch(''); }}
                                  className={`w-full text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${reporteObraId === 'todas' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                >Todas las obras</button>
                                {obrasFiltradas.map(o => (
                                  <button key={o.id}
                                    onClick={() => { setReporteObraId(o.id); setReporteObraDropdownOpen(false); setReporteObraSearch(''); }}
                                    className={`w-full text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-t border-white/5 ${reporteObraId === o.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                  >{o.nombre}</button>
                                ))}
                                {obrasFiltradas.length === 0 && (
                                  <p className="px-6 py-4 text-[10px] text-slate-600 font-bold">Sin resultados</p>
                                )}
                              </div>
                            )}
                            {reporteObraDropdownOpen && (
                              <div className="fixed inset-0 z-40" onClick={() => { setReporteObraDropdownOpen(false); setReporteObraSearch(''); }} />
                            )}
                          </div>
                          {/* KPIs en cards */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="glass-panel p-6 rounded-[2rem] border border-white/5 relative overflow-hidden shadow-2xl">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.15] rounded-full blur-[32px] pointer-events-none -mt-8 -mr-8" />
                              <div className="relative z-10">
                                <p className="darq-label mb-2">Ingresos Totales</p>
                                <p className="text-3xl font-black text-emerald-400 tracking-tighter">u$d {Math.round(totalIngUSD).toLocaleString('es-AR')}</p>
                                <p className="text-sm font-bold text-emerald-400/50 mt-1">$ {Math.round(totalIngARS).toLocaleString('es-AR')}</p>
                              </div>
                            </div>
                            <div className="glass-panel p-6 rounded-[2rem] border border-white/5 relative overflow-hidden shadow-2xl">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/[0.15] rounded-full blur-[32px] pointer-events-none -mt-8 -mr-8" />
                              <div className="relative z-10">
                                <p className="darq-label mb-2">Egresos Totales</p>
                                <p className="text-3xl font-black text-rose-400 tracking-tighter">u$d {Math.round(totalEgrUSD).toLocaleString('es-AR')}</p>
                                <p className="text-sm font-bold text-rose-400/50 mt-1">$ {Math.round(totalEgrARS).toLocaleString('es-AR')}</p>
                              </div>
                            </div>
                            <div className={`glass-panel p-6 rounded-[2rem] border relative overflow-hidden shadow-2xl ${balanceUSD >= 0 ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-rose-900/10 border-rose-500/20'}`}>
                              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[32px] pointer-events-none -mt-8 -mr-8 ${balanceUSD >= 0 ? 'bg-emerald-500/[0.15]' : 'bg-rose-500/[0.15]'}`} />
                              <div className="relative z-10">
                                <p className="darq-label mb-2">Balance</p>
                                <p className={`text-3xl font-black tracking-tighter ${balanceUSD >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>u$d {Math.round(balanceUSD).toLocaleString('es-AR')}</p>
                                <p className={`text-sm font-bold mt-1 ${balanceARS >= 0 ? 'text-emerald-400/50' : 'text-rose-400/50'}`}>$ {Math.round(balanceARS).toLocaleString('es-AR')}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Costos Catâ†’Rubâ†’Con */}
                      <div className="glass-panel p-5 rounded-xl border border-white/5">
                        <h4 className="darq-label mb-6">Egresos por Categoría / Rubro / Concepto</h4>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                          {Object.entries(catMap).sort((a,b)=>{
                            const sA=Object.values(a[1]).flatMap(Object.values).reduce((s,v)=>s+(v.usd||v||0),0);
                            const sB=Object.values(b[1]).flatMap(Object.values).reduce((s,v)=>s+(v.usd||v||0),0);
                            return sB-sA;
                          }).map(([cat, rubros]) => {
                            const catItems = Object.values(rubros).flatMap(Object.values);
                            const catT = catItems.reduce((s,v)=>s+(v.usd||v||0),0);
                            const catTARS = catItems.reduce((s,v)=>s+(v.ars||0),0);
                            return (
                              <details key={cat} className="border border-white/5 rounded-xl overflow-hidden group/cat">
                                <summary className="flex justify-between items-center px-4 py-3 bg-white/3 cursor-pointer select-none hover:bg-white/5 transition-colors list-none">
                                  <div className="flex items-center gap-2">
                                    <ChevronRight size={12} className="text-slate-500 group-open/cat:rotate-90 transition-transform duration-200"/>
                                    <span className="text-[10px] font-black text-white uppercase">{cat}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-slate-600">{Object.keys(rubros).length} rubros</span>
                                    <span className="text-[10px] font-black text-rose-400">u$d {Math.round(catT).toLocaleString('es-AR')}</span>
                                    <span className="text-[10px] font-bold text-slate-400 ml-2">$ {Math.round(catTARS).toLocaleString('es-AR')}</span>
                                    <span className="text-[10px] font-bold text-slate-500">({(catT/totalEgr*100).toFixed(1)}%)</span>
                                  </div>
                                </summary>
                                <div className="border-t border-white/5">
                                {Object.entries(rubros).sort((a,b) => {
                                  const tA = Object.values(a[1]).reduce((s,v)=>s+(v.usd||v||0),0);
                                  const tB = Object.values(b[1]).reduce((s,v)=>s+(v.usd||v||0),0);
                                  return tB - tA;
                                }).map(([rub, concs]) => {
                                  const rubT = Object.values(concs).reduce((s,v)=>s+(v.usd||v||0),0);
                                  const rubTARS = Object.values(concs).reduce((s,v)=>s+(v.ars||0),0);
                                  const concEntries = Object.entries(concs).sort((a,b)=>(b[1].usd||b[1]||0)-(a[1].usd||a[1]||0));
                                  return (
                                    <details key={rub} className="group/rub border-t border-white/5 first:border-0">
                                      <summary className="flex justify-between items-center px-6 py-2 cursor-pointer select-none hover:bg-white/[0.03] transition-colors list-none">
                                        <div className="flex items-center gap-2">
                                          <ChevronRight size={10} className="text-slate-600 group-open/rub:rotate-90 transition-transform duration-200"/>
                                          <span className="text-[10px] text-slate-400 font-bold uppercase">{rub}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="text-[10px] text-slate-600">{concEntries.length} items</span>
                                          <span className="text-[10px] text-rose-400/80 font-black">u$d {Math.round(rubT).toLocaleString('es-AR')}</span>
                                          <span className="text-[10px] font-bold text-slate-500 ml-2">$ {Math.round(rubTARS).toLocaleString('es-AR')}</span>
                                        </div>
                                      </summary>
                                      <div className="border-t border-white/[0.03]">
                                      {concEntries.map(([con, val]) => (
                                        <div key={con} className="flex justify-between items-center px-9 py-1.5 border-t border-white/[0.03] first:border-0 hover:bg-white/[0.02] transition-colors">
                                          <span className="text-[10px] text-slate-500">{con}</span>
                                          <div className="text-right">
                                            <span className="text-[10px] text-rose-400/70 font-bold">u$d {Math.round(val.usd||val||0).toLocaleString('es-AR')}</span>
                                            <span className="text-[10px] font-bold text-slate-500 ml-2">$ {Math.round(val.ars||0).toLocaleString('es-AR')}</span>
                                          </div>
                                        </div>
                                      ))}
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

                      {/* Ingresos + Proveedores */}
                      <div className="space-y-6">
                        {/* Ingresos por categoría */}
                        <div className="glass-panel p-5 rounded-xl border border-white/5">
                          <h4 className="darq-label mb-4">Ingresos por Tipo</h4>
                          <div className="space-y-4">
                            {Object.entries(ingMap).sort((a,b) => b[1].usd - a[1].usd).map(([cat, catData]) => {
                              const rubros = Object.entries(catData.rubros || {}).sort((a,b) => b[1].usd - a[1].usd);
                              const hasRubros = rubros.length > 1 || (rubros.length === 1 && rubros[0][0] !== '—');
                              return (
                                <div key={cat} className="border border-white/5 rounded-xl overflow-hidden">
                                  <div className="flex justify-between items-center px-4 py-3 bg-white/[0.03]">
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{cat}</span>
                                    <div className="text-right">
                                      <span className="text-sm font-black text-emerald-400">u$d {Math.round(catData.usd).toLocaleString('es-AR')}</span>
                                      <span className="text-[10px] font-bold text-emerald-400/50 ml-2">$ {Math.round(catData.ars).toLocaleString('es-AR')}</span>
                                    </div>
                                  </div>
                                  {hasRubros && rubros.map(([rub, rubData]) => (
                                    <div key={rub} className="flex justify-between items-center px-6 py-2 border-t border-white/[0.04] bg-white/[0.01]">
                                      <span className="text-[10px] text-slate-400 font-bold">{rub}</span>
                                      <div className="text-right">
                                        <span className="text-[10px] font-black text-emerald-400/80">u$d {Math.round(rubData.usd).toLocaleString('es-AR')}</span>
                                        <span className="text-[10px] font-bold text-slate-500 ml-2">$ {Math.round(rubData.ars).toLocaleString('es-AR')}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Cuentas corrientes proveedores */}
                        <div className="glass-panel p-5 rounded-xl border border-white/5">
                          <h4 className="darq-label mb-4">Cuenta Corriente Proveedores</h4>
                          <input
                            type="text" placeholder="Buscar proveedor..."
                            value={reporteProveedorFilter} onChange={e => setReporteProveedorFilter(e.target.value)}
                            className="w-full glass-input rounded-xl px-4 py-2 text-xs font-bold outline-none mb-4"
                          />
                          <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                            {filteredProvs.map(([nombre, data]) => (
                              <details key={nombre} className="border border-white/5 rounded-xl overflow-hidden">
                                <summary className="flex justify-between items-center px-5 py-3 cursor-pointer select-none hover:bg-white/3">
                                  <span className="text-[10px] font-black text-white uppercase">{nombre}</span>
                                  <div className="text-right">
                                    <span className="text-sm font-black text-emerald-400">u$d {data.total.toLocaleString('es-AR', {maximumFractionDigits: 0})}</span>
                                    <span className="text-[10px] font-bold text-slate-400 ml-2">$ {Math.round(data.totalARS).toLocaleString('es-AR')}</span>
                                  </div>
                                </summary>
                                <div className="border-t border-white/5">
                                  {Object.entries(data.porObra).sort((a,b) => b[1].total - a[1].total).map(([obraNom, obraData]) => (
                                    <details key={obraNom} className="border-t border-white/5 first:border-0">
                                      <summary className="flex justify-between items-center px-6 py-2.5 cursor-pointer select-none hover:bg-white/[0.03]">
                                        <span className="text-[10px] font-black text-blue-400 uppercase">{obraNom}</span>
                                        <div className="text-right">
                                          <span className="text-[10px] font-black text-slate-300">u$d {obraData.total.toLocaleString('es-AR', {maximumFractionDigits: 0})}</span>
                                          <span className="text-[10px] font-bold text-slate-500 ml-2">$ {Math.round(obraData.totalARS).toLocaleString('es-AR')}</span>
                                        </div>
                                      </summary>
                                      <div>
                                        {obraData.movs.sort((a,b) => b.fecha?.localeCompare(a.fecha)).map((m, i) => (
                                          <div key={i} className="flex justify-between items-center px-9 py-1.5 text-[10px] border-t border-white/[0.02] first:border-0">
                                            <span className="text-slate-600">{m.fecha} · {m.concepto || m.rubro || '-'}</span>
                                            <span className="font-black text-rose-500">{m.moneda === 'USD' ? 'u$d' : '$ '} {Number(m.monto||0).toLocaleString('es-AR', {maximumFractionDigits: 0})}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </details>
                                  ))}
                                </div>
                              </details>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
  );
}
