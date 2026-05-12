import React, { useState } from 'react';
import { convertToUSD as _convertToUSD, normalizeYearMonth } from '../../helpers/financieros';
import { db, appId } from '../../config/firebase';
import { doc, writeBatch } from 'firebase/firestore';

/**
 * Vista Rentabilidad — Comparativa VO vs MO.
 * Extraído de AreaAlquileres.jsx para descomprimir el componente raíz.
 *
 * Props: movsVO, movsMO, movsAlq, propiedades, clientes, contratos, proveedores,
 *        cotizacionBlue, movimientos, contsActivos
 */
export default function RentabilidadEdificios({
  movsVO, movsMO, movsAlq, propiedades, clientes, contratos, proveedores,
  cotizacionBlue, movimientos, contsActivos
}) {
  const convertToUSD = (monto, moneda, tc) => _convertToUSD(monto, moneda, tc, cotizacionBlue);
  const toARS = (m) => {
    const raw = (m.moneda||'ARS') === 'USD'
      ? (Number(m.monto)||0) * (m.cotizacionHistorica || m.tipoCambioReferencia || cotizacionBlue)
      : (Number(m.monto)||0);
    return m.tipoFactura === 'A' ? raw / 1.21 : raw;
  };

  // ── Internal state ──
  const [rentPeriodo, setRentPeriodo] = useState(12);
  const [alqChartEdificio, setAlqChartEdificio] = useState('todos');
  const [migPreview, setMigPreview] = useState(null);
  const [migStatus, setMigStatus] = useState('');
  const [showObrasIng, setShowObrasIng] = useState(true);
  const [showObrasEgr, setShowObrasEgr] = useState(true);

  const hoyR = new Date();
  const filtrarPorPeriodo = (movs) => {
    if (rentPeriodo === 0) return movs;
    const desde = new Date(hoyR.getFullYear(), hoyR.getMonth() - rentPeriodo, 1);
    return movs.filter(m => new Date(m.fecha) >= desde);
  };
  const movsVOFilt = filtrarPorPeriodo(movsVO);
  const movsMOFilt = filtrarPorPeriodo(movsMO);
  const ingVO = movsVOFilt.filter(m=>m.tipo==='Ingreso').reduce((a,m)=>a+convertToUSD(m.monto,m.moneda,m.cotizacionHistorica||m.tipoCambioReferencia),0);
  const egrVO = movsVOFilt.filter(m=>m.tipo==='Egreso').reduce((a,m)=>a+convertToUSD(m.monto,m.moneda,m.cotizacionHistorica||m.tipoCambioReferencia),0);
  const ingMO = movsMOFilt.filter(m=>m.tipo==='Ingreso').reduce((a,m)=>a+convertToUSD(m.monto,m.moneda,m.cotizacionHistorica||m.tipoCambioReferencia),0);
  const egrMO = movsMOFilt.filter(m=>m.tipo==='Egreso').reduce((a,m)=>a+convertToUSD(m.monto,m.moneda,m.cotizacionHistorica||m.tipoCambioReferencia),0);
  const balVO = ingVO - egrVO;
  const balMO = ingMO - egrMO;
  const propsVO = propiedades.filter(p=>!p.esCentroCostos && p.nombre?.toUpperCase().startsWith('VO'));
  const propsMO = propiedades.filter(p=>!p.esCentroCostos && p.nombre?.toUpperCase().startsWith('MO'));
  const contsVO = contsActivos.filter(c=>{ const p=propiedades.find(pp=>pp.id===c.propiedadId); return p?.nombre?.toUpperCase().startsWith('VO'); });
  const contsMO = contsActivos.filter(c=>{ const p=propiedades.find(pp=>pp.id===c.propiedadId); return p?.nombre?.toUpperCase().startsWith('MO'); });
  const activosVO = propsVO.reduce((a,p)=>a+(Number(p.valorActualUSD)||0),0);
  const activosMO = propsMO.reduce((a,p)=>a+(Number(p.valorActualUSD)||0),0);

  // Morosidad
  const mesAct = `${hoyR.getFullYear()}-${String(hoyR.getMonth()+1).padStart(2,'0')}`;
  const totalConts = contsActivos.length || 1;
  const sinPagoMes = contsActivos.filter(c => !movsAlq.some(m => m.propiedadId === c.propiedadId && normalizeYearMonth(m.fecha) === mesAct && m.tipo === 'Ingreso')).length;
  const tasaMorosidad = (sinPagoMes / totalConts * 100).toFixed(1);

  // ── Cuatrimestral ──
  const getCuatrimestre = (fecha) => {
    const d = new Date(fecha);
    const m = d.getMonth();
    const y = d.getFullYear();
    const c = m < 4 ? 1 : m < 8 ? 2 : 3;
    return { y, c, key: `${y}-C${c}`, label: `C${c}'${String(y).slice(-2)}` };
  };

  const allMovsAlq = [...movsVO, ...movsMO];
  const cuatMap = {};
  allMovsAlq.forEach(m => {
    if (!m.fecha) return;
    const q = getCuatrimestre(m.fecha);
    if (!cuatMap[q.key]) cuatMap[q.key] = { key: q.key, label: q.label, y: q.y, c: q.c, ingVO: 0, egrVO: 0, ingMO: 0, egrMO: 0 };
    const isVO = (() => { const p = propiedades.find(pp => pp.id === m.propiedadId); return p?.nombre?.toUpperCase().startsWith('VO'); })();
    const usd = convertToUSD(m.monto, m.moneda, m.cotizacionHistorica || m.tipoCambioReferencia);
    if (isVO) { if (m.tipo === 'Ingreso') cuatMap[q.key].ingVO += usd; else cuatMap[q.key].egrVO += usd; }
    else { if (m.tipo === 'Ingreso') cuatMap[q.key].ingMO += usd; else cuatMap[q.key].egrMO += usd; }
  });
  const cuatData = Object.values(cuatMap).sort((a,b) => a.key.localeCompare(b.key));

  // ── Balance mensual por edificio ──
  const meses12 = Array.from({length:12},(_,i)=>{
    const d = new Date(hoyR.getFullYear(), hoyR.getMonth()-11+i, 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  });

  // ── Chart SVG ──
  const chartMovs = alqChartEdificio === 'todos' ? movsAlq : alqChartEdificio === 'VO' ? movsVO : movsMO;
  const chartData12 = meses12.map(m => ({
    label: m.slice(5),
    ing: chartMovs.filter(mv => mv.tipo==='Ingreso' && normalizeYearMonth(mv.fecha) === m).reduce((a,mv)=>a+convertToUSD(mv.monto, mv.moneda, mv.cotizacionHistorica || mv.tipoCambioReferencia),0),
    egr: chartMovs.filter(mv => mv.tipo==='Egreso' && normalizeYearMonth(mv.fecha) === m).reduce((a,mv)=>a+convertToUSD(mv.monto, mv.moneda, mv.cotizacionHistorica || mv.tipoCambioReferencia),0),
  }));
  const maxChartVal = Math.max(...chartData12.map(d=>Math.max(d.ing,d.egr)),1);
  const CW=700,CH=160,CPAD=30;
  const cxStep=(CW-CPAD*2)/11;
  const cyOf=v=>CH-CPAD-((v/maxChartVal)*(CH-CPAD*2));

  // ── Distribución socios VO ──
  const SOCIOS = ['Florencia','Santiago','Sebastián','Emiliano'];
  const balEdificio = (movs) => movs.reduce((acc, m) => acc + (m.tipo === 'Ingreso' ? convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia) : -convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia)), 0);
  const egrsVOAll = movsVO.filter(m=>m.tipo==='Egreso');
  const mesesConDatos = [...new Set(egrsVOAll.map(m=>m.fecha?.slice(0,7)).filter(Boolean))].sort();
  const ultimos3 = mesesConDatos.slice(-3);
  const egrsPromMensual = ultimos3.length > 0
    ? ultimos3.map(mes=>egrsVOAll.filter(m=>m.fecha?.startsWith(mes)).reduce((a,m)=>a+m.monto,0)).reduce((a,b)=>a+b,0) / ultimos3.length
    : 0;
  const fondoReserva = egrsPromMensual * 2;
  const cajaVO = balEdificio(movsVO);
  const cajaARS = movsVO.reduce((acc, m) => acc + (m.tipo === 'Ingreso' ? toARS(m) : -toARS(m)), 0);
  const utilidadDistribuible = Math.max(0, cajaARS - fondoReserva);
  const porSocio = utilidadDistribuible / 4;

  const EdifCard = ({nombre, dir, ing, egr, bal, activos, ocu, total}) => (
    <div className="glass-panel p-5 rounded-xl border border-white/5 flex-1">
      <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1">{nombre}</h3>
      <p className="text-[10px] text-slate-500 mb-6 font-bold">{dir}</p>
      <div className="space-y-3">
        {[['Ingresos', ing, 'text-emerald-400'], ['Egresos', egr, 'text-rose-400'], ['Balance Neto', bal, bal>=0?'text-emerald-400':'text-rose-400']].map(([l,v,c])=>(
          <div key={l} className={`flex justify-between items-center ${l==='Balance Neto'?'border-t border-white/10 pt-3':''}`}>
            <span className="darq-label">{l}</span>
            <span className={`text-sm font-black ${c}`}>u$d {Math.round(v).toLocaleString('es-AR')}</span>
          </div>
        ))}
        <div className="border-t border-white/5 pt-3 space-y-2">
          <div className="flex justify-between"><span className="text-[10px] text-slate-500 font-black uppercase">Ocupación</span><span className="text-[10px] font-black text-white">{ocu}/{total} ({total>0?Math.round(ocu/total*100):0}%)</span></div>
          <div className="flex justify-between"><span className="text-[10px] text-slate-500 font-black uppercase">Activos (USD)</span><span className="text-[10px] font-black text-white">u$d {activos.toLocaleString('es-AR')}</span></div>
          {activos>0 && <div className="flex justify-between"><span className="text-[10px] text-slate-500 font-black uppercase">ROI Anual</span><span className={`text-[10px] font-black ${bal>=0?'text-emerald-400':'text-rose-400'}`}>{((bal/activos)*100).toFixed(1)}%</span></div>}
          {ing>0 && <div className="flex justify-between"><span className="text-[10px] text-slate-500 font-black uppercase">Margen</span><span className={`text-[10px] font-black ${bal>=0?'text-emerald-400':'text-rose-400'}`}>{((bal/ing)*100).toFixed(1)}%</span></div>}
        </div>
      </div>
    </div>
  );

  const periodoLabel = rentPeriodo === 0 ? 'Histórico total' : ('Últimos ' + rentPeriodo + ' meses');

  // ── Migración Factura A ──
  const FACTURA_A_KEYWORDS = ['BULKERS','BROOK BELGRANO','JAVIER PRIETO','DIEGO GROLL','W3 COMUNICACIÓN','PVN TURISMO'];
  const matchCli = (nombre) => FACTURA_A_KEYWORDS.some(k => (nombre||'').toUpperCase().includes(k));
  const factAIds = clientes.filter(c => matchCli(c.nombre)).map(c => c.id);
  const factAPropIds = new Set(contratos.filter(c => factAIds.includes(c.clienteId)).map(c => c.propiedadId));
  const pendientesMig = movimientos.filter(m =>
    m.area === 'Alquileres' && m.tipo === 'Ingreso' &&
    factAPropIds.has(m.propiedadId) && !m.tipoFactura
  );

  const prepararMig = () => setMigPreview(pendientesMig.map(m => ({
    id: m.id, fecha: m.fecha, monto: m.monto,
    prop: propiedades.find(p => p.id === m.propiedadId)?.nombre || '?'
  })));

  const ejecutarMig = async () => {
    setMigStatus('running');
    try {
      const batch = writeBatch(db);
      pendientesMig.forEach(m => {
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'movimientos', m.id);
        batch.update(ref, { tipoFactura: 'A' });
      });
      await batch.commit();
      setMigStatus('done'); setMigPreview(null);
    } catch(e) { console.error(e); setMigStatus('error'); }
  };

  return (
    <div className="space-y-8">
      {/* Filtro de período */}
      <div className="flex justify-end gap-2 mb-2">
        {[{v:6,l:'6 meses'},{v:12,l:'12 meses'},{v:0,l:'Todo'}].map(({v,l}) => (
          <button key={v} onClick={() => setRentPeriodo(v)}
            className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${rentPeriodo===v?'bg-white text-slate-900':'bg-white/5 text-slate-500 hover:text-white'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ═══ Resumen Consolidado ═══ */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5">
        <h4 className="darq-label mb-5">Resumen Consolidado — {periodoLabel}</h4>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
          <div><p className="text-[10px] text-slate-500 uppercase font-black mb-1">Ingresos Totales</p><p className="text-xl font-black text-emerald-400">u$d {Math.round(ingVO+ingMO).toLocaleString('es-AR')}</p></div>
          <div><p className="text-[10px] text-slate-500 uppercase font-black mb-1">Egresos Totales</p><p className="text-xl font-black text-rose-400">u$d {Math.round(egrVO+egrMO).toLocaleString('es-AR')}</p></div>
          <div><p className="text-[10px] text-slate-500 uppercase font-black mb-1">Balance Global</p><p className={`text-xl font-black ${(balVO+balMO)>=0?'text-emerald-400':'text-rose-400'}`}>u$d {Math.round(balVO+balMO).toLocaleString('es-AR')}</p></div>
          <div><p className="text-[10px] text-slate-500 uppercase font-black mb-1">Tasa Morosidad</p><p className={`text-xl font-black ${parseFloat(tasaMorosidad)>20?'text-rose-400':parseFloat(tasaMorosidad)>0?'text-amber-400':'text-emerald-400'}`}>{tasaMorosidad}%</p><p className="text-[10px] text-slate-600 mt-0.5">{sinPagoMes}/{totalConts} sin cobro</p></div>
          <div><p className="text-[10px] text-slate-500 uppercase font-black mb-1">Activos Totales</p><p className="text-xl font-black text-white">u$d {(activosVO+activosMO).toLocaleString('es-AR')}</p></div>
        </div>
      </div>

      {/* ═══ Comparativa VO vs MO ═══ */}
      <div className="flex gap-4">
        <EdifCard nombre="Vuelta de Obligado 2789" dir="VO · Expensas + Alquileres" ing={ingVO} egr={egrVO} bal={balVO} activos={activosVO} ocu={contsVO.length} total={propsVO.length} />
        <EdifCard nombre="Monroe 2325" dir="MO · Alquileres Directos" ing={ingMO} egr={egrMO} bal={balMO} activos={activosMO} ocu={contsMO.length} total={propsMO.length} />
      </div>

      {/* ═══ RENTABILIDAD CUATRIMESTRAL ═══ */}
      {cuatData.length > 0 && (() => {
        const CW = 700, CH = 210;
        const PAD_L = 44, PAD_R = 16, PAD_T = 16, PAD_B = 32;
        const chartW = CW - PAD_L - PAD_R;
        const chartH = CH - PAD_T - PAD_B;
        const n = cuatData.length;
        const groupW = chartW / n;
        const barW = Math.max(8, Math.min(24, (groupW - 20) / 2));

        const allBals = cuatData.flatMap(q => [
          q.ingVO - q.egrVO,
          q.ingMO - q.egrMO,
          (q.ingVO + q.ingMO) - (q.egrVO + q.egrMO)
        ]);
        const maxV = Math.max(0, ...allBals);
        const minV = Math.min(0, ...allBals);
        const range = maxV - minV || 1;

        const zeroY = PAD_T + chartH * (maxV / range);
        const yOf   = (v) => PAD_T + chartH * ((maxV - v) / range);
        const xCtr  = (i) => PAD_L + i * groupW + groupW / 2;
        const xVO   = (i) => PAD_L + i * groupW + (groupW - barW * 2 - 4) / 2;
        const xMO   = (i) => xVO(i) + barW + 4;
        const bY    = (v) => v >= 0 ? yOf(v) : zeroY;
        const bH    = (v) => Math.max(2, Math.abs(yOf(v) - zeroY));

        const gridVals = [0, 0.25, 0.5, 0.75, 1].map(t => minV + t * range);

        return (
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h4 className="darq-label mb-3">Rentabilidad Cuatrimestral (USD)</h4>
            <div className="flex gap-5 mb-4">
              <span className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase"><span className="w-3 h-3 bg-blue-400/80 rounded-sm inline-block"/>&nbsp;Balance VO</span>
              <span className="flex items-center gap-2 text-[10px] font-black text-orange-400 uppercase"><span className="w-3 h-3 bg-orange-400/80 rounded-sm inline-block"/>&nbsp;Balance MO</span>
              <span className="flex items-center gap-2 text-[10px] font-black text-white/60 uppercase"><span className="w-5 h-0.5 bg-white/50 inline-block rounded-full"/>&nbsp;Total</span>
            </div>

            <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full" style={{height:210}}>
              {gridVals.map((v, i) => (
                <g key={i}>
                  <line x1={PAD_L} y1={yOf(v)} x2={CW - PAD_R} y2={yOf(v)} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                  <text x={PAD_L - 5} y={yOf(v) + 3} textAnchor="end" fill="rgba(148,163,184,0.45)" fontSize="7" fontFamily="sans-serif" fontWeight="700">
                    {Math.abs(v) >= 1000 ? `${Math.round(v/1000)}k` : Math.round(v)}
                  </text>
                </g>
              ))}
              <line x1={PAD_L} y1={zeroY} x2={CW - PAD_R} y2={zeroY} stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="4,3"/>
              {cuatData.map((q, i) => {
                const bVO = q.ingVO - q.egrVO;
                const bMO = q.ingMO - q.egrMO;
                return (
                  <g key={q.key}>
                    <rect x={xVO(i)} y={bY(bVO)} width={barW} height={bH(bVO)}
                      fill={bVO >= 0 ? 'rgba(96,165,250,0.75)' : 'rgba(248,113,113,0.6)'} rx="2">
                      <title>VO {q.label}: u$d {Math.round(bVO).toLocaleString()}</title>
                    </rect>
                    <rect x={xMO(i)} y={bY(bMO)} width={barW} height={bH(bMO)}
                      fill={bMO >= 0 ? 'rgba(251,146,60,0.75)' : 'rgba(248,113,113,0.45)'} rx="2">
                      <title>MO {q.label}: u$d {Math.round(bMO).toLocaleString()}</title>
                    </rect>
                    <text x={xCtr(i)} y={CH - 4} textAnchor="middle" fill="rgba(148,163,184,0.65)" fontSize="8" fontWeight="700" fontFamily="sans-serif">{q.label}</text>
                  </g>
                );
              })}
              {cuatData.length > 1 && (
                <polyline
                  points={cuatData.map((q, i) => `${xCtr(i)},${yOf((q.ingVO+q.ingMO)-(q.egrVO+q.egrMO))}`).join(' ')}
                  fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"
                  strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5,3"/>
              )}
              {cuatData.map((q, i) => {
                const balT = (q.ingVO+q.ingMO)-(q.egrVO+q.egrMO);
                return (
                  <circle key={q.key} cx={xCtr(i)} cy={yOf(balT)} r="3.5"
                    fill={balT >= 0 ? '#34d399' : '#f87171'} stroke="rgba(0,0,0,0.3)" strokeWidth="1">
                    <title>Total {q.label}: u$d {Math.round(balT).toLocaleString()}</title>
                  </circle>
                );
              })}
            </svg>

            {/* Tabla simplificada */}
            <div className="overflow-x-auto mt-5">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-3 py-2 text-slate-500 font-black uppercase"></th>
                    {cuatData.map(q => <th key={q.key} className="text-right px-3 py-2 text-slate-400 font-black uppercase">{q.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/5">
                    <td className="px-3 py-2.5 font-black text-blue-400">Balance VO</td>
                    {cuatData.map(q => { const b = q.ingVO - q.egrVO; return <td key={q.key} className={`px-3 py-2.5 text-right font-extrabold tabular-nums ${b >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>u$d {Math.round(b).toLocaleString()}</td>; })}
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="px-3 py-2.5 font-black text-orange-400">Balance MO</td>
                    {cuatData.map(q => { const b = q.ingMO - q.egrMO; return <td key={q.key} className={`px-3 py-2.5 text-right font-extrabold tabular-nums ${b >= 0 ? 'text-orange-400' : 'text-rose-400'}`}>u$d {Math.round(b).toLocaleString()}</td>; })}
                  </tr>
                  <tr className="border-t-2 border-white/20">
                    <td className="px-3 py-3 font-black text-white uppercase text-[10px]">Balance Total</td>
                    {cuatData.map(q => { const b = (q.ingVO+q.ingMO)-(q.egrVO+q.egrMO); return <td key={q.key} className={`px-3 py-3 text-right font-extrabold text-sm tabular-nums ${b >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>u$d {Math.round(b).toLocaleString()}</td>; })}
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold text-slate-600 uppercase">Margen %</td>
                    {cuatData.map(q => { const ingT = q.ingVO+q.ingMO; const b = ingT-(q.egrVO+q.egrMO); const m = ingT > 0 ? ((b/ingT)*100).toFixed(0)+'%' : '-'; return <td key={q.key} className={`px-3 py-2 text-right font-black tabular-nums ${b >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{m}</td>; })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}


      {/* ═══ Gráfico 12 meses ═══ */}
      <div className="glass-panel p-5 rounded-xl border border-white/5">
        <div className="flex items-center justify-between mb-6">
          <h4 className="darq-label">Histórico Ingresos vs. Egresos — Últimos 12 meses</h4>
          <div className="flex gap-2">
            {['todos','VO','MO'].map(e=>(
              <button key={e} onClick={()=>setAlqChartEdificio(e)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${alqChartEdificio===e?'bg-blue-600 text-white':'text-slate-600 hover:text-white'}`}>
                {e==='todos'?'Todos':e}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-6 mb-4">
          <span className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase"><span className="w-6 h-0.5 bg-emerald-400 inline-block rounded-full"></span>Ingresos</span>
          <span className="flex items-center gap-2 text-[10px] font-black text-orange-500 uppercase"><span className="w-6 h-0.5 bg-orange-500 inline-block rounded-full"></span>Egresos</span>
        </div>
        <svg viewBox={`0 0 ${CW} ${CH + 20}`} className="w-full" style={{height:180}}>
          {[0,0.25,0.5,0.75,1].map(t=>(
            <line key={t} x1={CPAD} y1={cyOf(maxChartVal*t)} x2={CW-CPAD} y2={cyOf(maxChartVal*t)} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
          ))}
          <polygon points={`${CPAD},${CH-CPAD} ${chartData12.map((d,i)=>`${CPAD+i*cxStep},${cyOf(d.ing)}`).join(' ')} ${CPAD+11*cxStep},${CH-CPAD}`} fill="rgba(52,211,153,0.06)"/>
          <polygon points={`${CPAD},${CH-CPAD} ${chartData12.map((d,i)=>`${CPAD+i*cxStep},${cyOf(d.egr)}`).join(' ')} ${CPAD+11*cxStep},${CH-CPAD}`} fill="rgba(249,115,22,0.06)"/>
          <polyline points={chartData12.map((d,i)=>`${CPAD+i*cxStep},${cyOf(d.ing)}`).join(' ')} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
          <polyline points={chartData12.map((d,i)=>`${CPAD+i*cxStep},${cyOf(d.egr)}`).join(' ')} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
          {chartData12.map((d,i)=>(
            <g key={i}>
              {d.ing>0&&<circle cx={CPAD+i*cxStep} cy={cyOf(d.ing)} r="3.5" fill="#34d399"/>}
              {d.egr>0&&<circle cx={CPAD+i*cxStep} cy={cyOf(d.egr)} r="3.5" fill="#f97316"/>}
            </g>
          ))}
          {chartData12.map((d,i)=>(
            <text key={d.label} x={CPAD+i*cxStep} y={CH+14} textAnchor="middle" fill="rgba(148,163,184,0.6)" fontSize="8" fontWeight="700" fontFamily="sans-serif">{d.label}</text>
          ))}
        </svg>
      </div>

      {/* ═══ Distribución Socios VO ═══ */}
      <div className="glass-panel p-5 rounded-xl border border-white/5">
        <h4 className="darq-label mb-5">Distribución Socios — VO</h4>
        <div className="space-y-3 mb-5 text-[10px]">
          <div className="flex justify-between"><span className="text-slate-400">Balance caja VO</span><span className="font-black text-white">$ {cajaVO.toLocaleString('es-AR')}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Fondo reserva (2 meses)</span><span className="font-black text-amber-400">- $ {fondoReserva.toLocaleString('es-AR')}</span></div>
          <div className="flex justify-between border-t border-white/10 pt-3"><span className="font-black text-white">Utilidad distribuible</span><span className="font-black text-emerald-400">$ {utilidadDistribuible.toLocaleString('es-AR')}</span></div>
        </div>
        <div className="space-y-2">
          {SOCIOS.map(s=>(
            <div key={s} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
              <span className="text-[10px] font-black text-white uppercase">{s}</span>
              <span className="text-sm font-black text-emerald-400">$ {Math.round(porSocio).toLocaleString('es-AR')}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-600 mt-4 font-bold">* Egr. prom. mensual: $ {Math.round(egrsPromMensual).toLocaleString('es-AR')} (últimos {ultimos3.length} meses)</p>
      </div>

      {/* ═══ Migración Factura A ═══ */}
      {(pendientesMig.length > 0 || migStatus === 'done') && (
        <div className="glass-panel p-5 rounded-xl border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Migración Factura A</p>
              {migStatus === 'done'
                ? <p className="text-[10px] text-emerald-400 font-bold mt-0.5">✅ Completado — todos los movimientos fueron etiquetados.</p>
                : <p className="text-[10px] text-slate-400 font-bold mt-0.5">{pendientesMig.length} movimiento(s) sin etiqueta Factura A detectados</p>
              }
            </div>
            {migStatus !== 'done' && (
              <div className="flex gap-2">
                {!migPreview && (
                  <button onClick={prepararMig} className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                    Ver preview
                  </button>
                )}
                {migPreview && migStatus !== 'running' && (
                  <button onClick={ejecutarMig} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                    Confirmar y etiquetar
                  </button>
                )}
                {migStatus === 'running' && <span className="text-[10px] text-amber-400 font-black">Actualizando...</span>}
              </div>
            )}
          </div>
          {migPreview && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {migPreview.map(m => (
                <div key={m.id} className="flex justify-between px-3 py-1.5 bg-white/3 rounded-lg text-[10px]">
                  <span className="text-slate-400">{m.fecha} · {m.prop}</span>
                  <span className="font-black text-white">$ {Number(m.monto).toLocaleString('es-AR')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
