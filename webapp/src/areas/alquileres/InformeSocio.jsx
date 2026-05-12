import React, { useState } from 'react';
import { FileText } from 'lucide-react';

/**
 * Vista Informe Socio — VO.
 * Incluye selector multi-mes, KPIs, building canvas, expense breakdown,
 * y generación de PDF mensual/anual.
 * Extraído de AreaAlquileres.jsx.
 *
 * Props: movsVO, propiedades, clientes, contratos, proveedores, cotizacionBlue, contsActivos
 */
export default function InformeSocio({
  movsVO, propiedades, clientes, contratos, proveedores, cotizacionBlue, contsActivos
}) {
  const toARS = (m) => {
    const raw = (m.moneda||'ARS') === 'USD'
      ? (Number(m.monto)||0) * (m.cotizacionHistorica || m.tipoCambioReferencia || cotizacionBlue)
      : (Number(m.monto)||0);
    return m.tipoFactura === 'A' ? raw / 1.21 : raw;
  };

  const mesNames = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const NAVY = '#1B3054', DARK = '#0E1F38', STEEL = '#3A6080', BEIGE = '#C2B08B';
  const VO_ORDER = ['VO-LOCAL','VO-1A','VO-1B','VO-1C','VO-2A','VO-2B','VO-2C','VO-3A','VO-3B','VO-3C','VO-4A','VO-4B','VO-4C','VO-5A','VO-5B','VO-5C','VO-6A','VO-6B','VO-7A','VO-8A'];

  const [informeAnio, setInformeAnio] = useState(new Date().getFullYear());
  const [informeMeses, setInformeMeses] = useState([]);

  const aniosSet = new Set();
  movsVO.forEach(m => { if (m.fecha) aniosSet.add(m.fecha.substring(0,4)); });
  const aniosDisp = [...aniosSet].sort((a,b) => b - a);

  const mesesConDatos = [...new Set(movsVO.filter(m => m.fecha?.startsWith(informeAnio)).map(m => m.fecha?.substring(5,7)).filter(Boolean))].sort();
  const toggleMes = (mes) => setInformeMeses(prev => prev.includes(mes) ? prev.filter(m => m !== mes) : [...prev, mes].sort());

  const movsSelected = movsVO.filter(m => m.fecha?.startsWith(informeAnio) && informeMeses.includes(m.fecha?.substring(5,7)));
  const ingresos     = movsSelected.filter(m => m.tipo === 'Ingreso' && (Number(m.monto)||0) > 0);
  const egresos      = movsSelected.filter(m => m.tipo === 'Egreso'  && (Number(m.monto)||0) > 0);
  const ingTotal     = ingresos.reduce((a,m) => a + toARS(m), 0);
  const egrTotal     = egresos.reduce((a,m)  => a + toARS(m), 0);
  const neto         = ingTotal - egrTotal;
  const netoUSD      = cotizacionBlue > 0 ? neto / cotizacionBlue : 0;
  const margen       = ingTotal > 0 ? ((neto / ingTotal) * 100).toFixed(1) : null;

  const getTipoIngreso = (m) => {
    const cat = (m.rubro || m.categoriaIngreso || m.categoria || '').trim().toLowerCase();
    return cat.includes('expens') ? 'Expensas' : 'Alquiler';
  };
  const ingAlquiler = ingresos.filter(m => getTipoIngreso(m) === 'Alquiler').reduce((a,m) => a + toARS(m), 0);
  const ingExpensas = ingresos.filter(m => getTipoIngreso(m) === 'Expensas').reduce((a,m) => a + toARS(m), 0);

  const propiedadesVO = propiedades.filter(p => p.nombre?.toUpperCase().startsWith('VO-') && !p.esCentroCostos);
  const propsSorted   = [...propiedadesVO].sort((a,b) => {
    const ai = VO_ORDER.indexOf(a.nombre?.toUpperCase().trim()), bi = VO_ORDER.indexOf(b.nombre?.toUpperCase().trim());
    return ai === -1 && bi === -1 ? (a.nombre||'').localeCompare(b.nombre||'') : ai === -1 ? 1 : bi === -1 ? -1 : ai - bi;
  });
  const buildingCanvas = propsSorted.map(prop => {
    const cont          = contsActivos.find(c => c.propiedadId === prop.id);
    const cli           = cont ? clientes.find(cl => cl.id === cont.clienteId) : null;
    const movsProp      = ingresos.filter(m => m.propiedadId === prop.id);
    const pagado        = movsProp.length > 0;
    const montoARS      = movsProp.reduce((a,m) => a + toARS(m), 0);
    const montoAlquiler = movsProp.filter(m => getTipoIngreso(m) === 'Alquiler').reduce((a,m) => a + toARS(m), 0);
    const montoExpensas = movsProp.filter(m => getTipoIngreso(m) === 'Expensas').reduce((a,m) => a + toARS(m), 0);
    const esUSD         = movsProp.some(m => (m.moneda||'ARS') === 'USD');
    const esFactA       = movsProp.some(m => m.tipoFactura === 'A');
    return { prop, cli, cont, pagado, montoARS, montoAlquiler, montoExpensas, esUSD, esFactA };
  });

  const egresosCat = {};
  egresos.forEach(m => {
    const cat = m.categoriaEgreso || m.rubro || 'Otros';
    egresosCat[cat] = (egresosCat[cat] || 0) + toARS(m);
  });
  const catList = Object.entries(egresosCat).sort((a,b) => b[1]-a[1]);
  const maxCat  = catList[0]?.[1] || 1;

  const periodoLabel = informeMeses.length === 0 ? 'Sin período' :
    informeMeses.length === 1 ? `${mesNames[parseInt(informeMeses[0])]} ${informeAnio}` :
    `${mesNames[parseInt(informeMeses[0])]}–${mesNames[parseInt(informeMeses[informeMeses.length-1])]} ${informeAnio}`;

  // ── PDF Mensual ──
  const generarPDFMensualSocio = () => {
    const getPropNombre = (m) => (propiedades.find(p => p.id === m.propiedadId)?.nombre||'').toUpperCase().trim();
    const fmtM = (m) => (m.moneda||'ARS') === 'USD'
      ? `<span style="font-size:8px;background:#1B3054;color:#C2B08B;padding:1px 5px;border-radius:3px;margin-right:4px;font-weight:900">USD</span>U$D ${(Number(m.monto)||0).toLocaleString('es-AR')}`
      : `$ ${(Number(m.monto)||0).toLocaleString('es-AR')}`;
    const ingSorted = [...ingresos].sort((a,b) => {
      const ia = VO_ORDER.indexOf(getPropNombre(a)), ib = VO_ORDER.indexOf(getPropNombre(b));
      return ia === -1 && ib === -1 ? getPropNombre(a).localeCompare(getPropNombre(b)) : ia === -1 ? 1 : ib === -1 ? -1 : ia - ib;
    });
    const ingRows = ingSorted.map(m => {
      const prop  = propiedades.find(p => p.id === m.propiedadId);
      const cont  = prop ? contsActivos.find(c => c.propiedadId === prop.id) : null;
      const cli   = cont ? clientes.find(cl => cl.id === cont.clienteId) : null;
      const facBadge = m.tipoFactura === 'A' ? `<span style="font-size:7px;background:#b45309;color:#fff;padding:1px 4px;border-radius:3px;margin-right:3px;font-weight:900">FAC A</span>` : '';
      const arsEq = (m.moneda||'ARS') === 'USD' ? `<span style="font-size:8px;color:#94a3b8;margin-left:4px">(≈ $ ${Math.round(toARS(m)).toLocaleString('es-AR')} ARS)</span>` : '';
      const tipo  = getTipoIngreso(m);
      return `<tr><td>${m.fecha||'-'}</td><td>${prop?.nombre||'-'}</td><td>${cli?.nombre||'-'}</td><td style="font-weight:700;color:${tipo==='Expensas'?'#94a3b8':'#C2B08B'}">${tipo}</td><td class="num">${facBadge}${fmtM(m)}${arsEq}</td></tr>`;
    }).join('');
    const egrRows = egresos.map(m => {
      const prov = proveedores.find(p => p.id === m.proveedorId)?.nombre || '-';
      const arsEq = (m.moneda||'ARS') === 'USD' ? `<span style="font-size:8px;color:#94a3b8;margin-left:4px">(≈ $ ${Math.round(toARS(m)).toLocaleString('es-AR')} ARS)</span>` : '';
      return `<tr><td>${m.fecha||'-'}</td><td>${m.categoriaEgreso||m.rubro||'-'}</td><td>${m.concepto||'-'}</td><td>${prov}</td><td class="num">$ ${Math.round(toARS(m)).toLocaleString('es-AR')}${arsEq}</td></tr>`;
    }).join('');
    const catRows = catList.map(([cat,monto]) => `<tr><td style="font-weight:700">${cat}</td><td class="num" style="color:#f87171">$ ${Math.round(monto).toLocaleString('es-AR')}</td><td class="num">${egrTotal > 0 ? ((monto/egrTotal)*100).toFixed(1)+'%' : '-'}</td></tr>`).join('');
    const css = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=JetBrains+Mono:wght@700&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;background:${DARK};color:#e2e8f0;padding:36px}.mono{font-family:'JetBrains Mono',monospace}.header{border-bottom:3px solid ${BEIGE};padding-bottom:18px;margin-bottom:22px;display:flex;justify-content:space-between;align-items:flex-start}.brand-n{font-size:36px;font-weight:900;color:${NAVY};font-style:italic;letter-spacing:-3px;font-family:'Inter',sans-serif}.brand-sub{font-size:9px;font-weight:700;color:${STEEL};text-transform:uppercase;letter-spacing:4px;margin-top:4px}.title{font-size:20px;font-weight:900;color:#fff;text-transform:uppercase;text-align:right}.subtitle{font-size:10px;color:${STEEL};font-weight:700;text-transform:uppercase;letter-spacing:3px;text-align:right;margin-top:5px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px}.kpi{padding:14px 16px;background:rgba(27,48,84,0.45);border-radius:8px;border:1px solid ${NAVY}}.kpi-label{font-size:8px;font-weight:700;color:${STEEL};text-transform:uppercase;letter-spacing:3px;margin-bottom:6px}.kpi-val{font-size:17px;font-weight:700;font-family:'JetBrains Mono',monospace}.kpi-sub{font-size:9px;color:${STEEL};margin-top:3px}.section-title{font-size:9px;font-weight:900;color:${BEIGE};text-transform:uppercase;letter-spacing:3px;margin:18px 0 8px;padding-bottom:5px;border-bottom:1px solid ${NAVY}}table{width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:6px}th{background:${NAVY};padding:8px 11px;text-align:left;font-size:8px;font-weight:700;color:${BEIGE};text-transform:uppercase;letter-spacing:2px}td{padding:7px 11px;border-bottom:1px solid rgba(255,255,255,0.05);font-weight:500}.num{text-align:right;font-family:'JetBrains Mono',monospace;font-weight:700}.total-row{background:${NAVY};font-weight:700;color:${BEIGE}}.ing{color:#34d399}.egr{color:#f87171}.pos{color:#34d399}.neg{color:#f87171}.footer{margin-top:22px;border-top:2px solid ${NAVY};padding-top:12px;display:flex;justify-content:space-between;font-size:8px;color:${STEEL};text-transform:uppercase;letter-spacing:2px}@media print{body{background:#fff;color:#000}th,.total-row{background:#1B3054;color:#C2B08B}.kpi{background:#f0f0f0;border:1px solid #ccc}}`;
    const netoC = neto >= 0 ? '#34d399' : '#f87171';
    const html = `<!DOCTYPE html><html><head><title>Informe VO — ${periodoLabel}</title><meta charset="UTF-8"><style>${css}</style></head><body>
<div class="header"><div><div class="brand-n">NESS<span style="color:${BEIGE}">.</span></div><div class="brand-sub">Inversiones — D+ARQ</div></div><div><div class="title">Informe de Gestión</div><div class="subtitle">Vuelta de Obligado 2789 &middot; ${periodoLabel}</div></div></div>
<div class="kpis"><div class="kpi"><div class="kpi-label">Ingresos</div><div class="kpi-val ing">$ ${Math.round(ingTotal).toLocaleString('es-AR')}</div><div class="kpi-sub">${ingresos.length} cobros</div></div><div class="kpi"><div class="kpi-label">Egresos</div><div class="kpi-val egr">$ ${Math.round(egrTotal).toLocaleString('es-AR')}</div><div class="kpi-sub">${egresos.length} gastos</div></div><div class="kpi"><div class="kpi-label">Resultado Neto</div><div class="kpi-val" style="color:${netoC}">$ ${Math.round(neto).toLocaleString('es-AR')}</div><div class="kpi-sub">u$d ${Math.round(netoUSD).toLocaleString('es-AR')}</div></div><div class="kpi"><div class="kpi-label">Margen</div><div class="kpi-val" style="color:${netoC}">${margen !== null ? margen+'%' : '—'}</div><div class="kpi-sub">Rentabilidad</div></div></div>
<div class="section-title">Ingresos del Período</div>${ingresos.length===0?'<p style="color:#64748b;font-size:11px;padding:8px">Sin ingresos registrados.</p>':`<table><thead><tr><th>Fecha</th><th>Unidad</th><th>Inquilino</th><th>Categoría</th><th style="text-align:right">Monto</th></tr></thead><tbody>${ingRows}<tr class="total-row"><td colspan="4">TOTAL INGRESOS</td><td class="num">$ ${Math.round(ingTotal).toLocaleString('es-AR')}</td></tr></tbody></table>`}
<div class="section-title">Egresos del Período</div>${egresos.length===0?'<p style="color:#64748b;font-size:11px;padding:8px">Sin egresos registrados.</p>':`<table><thead><tr><th>Fecha</th><th>Categoría</th><th>Concepto</th><th>Proveedor</th><th style="text-align:right">Monto ARS</th></tr></thead><tbody>${egrRows}<tr class="total-row"><td colspan="4">TOTAL EGRESOS</td><td class="num">$ ${Math.round(egrTotal).toLocaleString('es-AR')}</td></tr></tbody></table>`}
${catList.length>0?`<div class="section-title">Egresos por Categoría</div><table><thead><tr><th>Categoría</th><th style="text-align:right">Monto</th><th style="text-align:right">% del Total</th></tr></thead><tbody>${catRows}</tbody></table>`:''}
<p style="font-size:8px;color:${STEEL};font-style:italic;margin-top:14px">* Valores en pesos argentinos (ARS). Ingresos Factura A netos de IVA 21%. Generado automáticamente.</p>
<div class="footer"><span>NESS &middot; D+ARQ &middot; Sistema de Gestión</span><span>Generado: ${new Date().toLocaleString('es-AR')}</span></div></body></html>`;
    const w = window.open('','_print','width=950,height=1100,scrollbars=yes');
    w.document.write(html); w.document.close(); setTimeout(()=>w.print(),600);
  };

  // ── PDF Anual ──
  const generarPDFAnualSocio = () => {
    const movsAnioVO = movsVO.filter(m => m.fecha?.startsWith(informeAnio));
    const mesesSet   = [...new Set(movsAnioVO.map(m => m.fecha?.substring(0,7)).filter(Boolean))].sort();
    let tIng=0, tEgr=0;
    const filas = mesesSet.map(mes => {
      const mm  = movsAnioVO.filter(m => m.fecha?.startsWith(mes));
      const ing = mm.filter(m => m.tipo==='Ingreso').reduce((a,m) => a+toARS(m), 0);
      const egr = mm.filter(m => m.tipo==='Egreso').reduce((a,m)  => a+toARS(m), 0);
      const net = ing - egr; tIng+=ing; tEgr+=egr;
      const ml  = mesNames[parseInt(mes.split('-')[1])]||mes;
      const c   = net>=0?'#34d399':'#f87171';
      return `<tr><td style="font-weight:700;color:#fff">${ml}</td><td class="num ing">$ ${Math.round(ing).toLocaleString('es-AR')}</td><td class="num egr">$ ${Math.round(egr).toLocaleString('es-AR')}</td><td class="num" style="color:${c};font-weight:700">$ ${Math.round(net).toLocaleString('es-AR')}</td><td class="num" style="color:${c}">${ing>0?((net/ing)*100).toFixed(1)+'%':'-'}</td></tr>`;
    });
    const tNet = tIng - tEgr;
    const css  = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=JetBrains+Mono:wght@700&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;background:${DARK};color:#e2e8f0;padding:36px}.header{border-bottom:3px solid ${BEIGE};padding-bottom:18px;margin-bottom:22px;display:flex;justify-content:space-between;align-items:flex-start}.brand-n{font-size:36px;font-weight:900;color:${NAVY};font-style:italic;letter-spacing:-3px}.brand-sub{font-size:9px;font-weight:700;color:${STEEL};text-transform:uppercase;letter-spacing:4px;margin-top:4px}.title{font-size:20px;font-weight:900;color:#fff;text-transform:uppercase;text-align:right}.subtitle{font-size:10px;color:${STEEL};font-weight:700;text-transform:uppercase;letter-spacing:3px;text-align:right;margin-top:5px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px}.kpi{padding:14px 16px;background:rgba(27,48,84,0.45);border-radius:8px;border:1px solid ${NAVY}}.kpi-label{font-size:8px;font-weight:700;color:${STEEL};text-transform:uppercase;letter-spacing:3px;margin-bottom:6px}.kpi-val{font-size:17px;font-weight:700;font-family:'JetBrains Mono',monospace}.section-title{font-size:9px;font-weight:900;color:${BEIGE};text-transform:uppercase;letter-spacing:3px;margin:18px 0 8px;padding-bottom:5px;border-bottom:1px solid ${NAVY}}table{width:100%;border-collapse:collapse;font-size:11px}th{background:${NAVY};padding:9px 13px;text-align:left;font-size:8px;font-weight:700;color:${BEIGE};text-transform:uppercase;letter-spacing:2px}td{padding:9px 13px;border-bottom:1px solid rgba(255,255,255,0.05);font-weight:500}.num{text-align:right;font-family:'JetBrains Mono',monospace}.ing{color:#34d399}.egr{color:#f87171}.total-row{background:${NAVY};font-weight:700;color:${BEIGE}}.footer{margin-top:22px;border-top:2px solid ${NAVY};padding-top:12px;display:flex;justify-content:space-between;font-size:8px;color:${STEEL};text-transform:uppercase;letter-spacing:2px}@media print{body{background:#fff;color:#000}th,.total-row{background:#1B3054;color:#C2B08B}.kpi{background:#f0f0f0;border:1px solid #ccc}}`;
    const netoC = tNet>=0?'#34d399':'#f87171';
    const html  = `<!DOCTYPE html><html><head><title>Resumen Anual VO — ${informeAnio}</title><meta charset="UTF-8"><style>${css}</style></head><body><div class="header"><div><div class="brand-n">NESS<span style="color:${BEIGE}">.</span></div><div class="brand-sub">Inversiones — D+ARQ</div></div><div><div class="title">Resumen Anual</div><div class="subtitle">Vuelta de Obligado 2789 &middot; Ejercicio ${informeAnio}</div></div></div><div class="kpis"><div class="kpi"><div class="kpi-label">Ingresos ${informeAnio}</div><div class="kpi-val" style="color:#34d399">$ ${Math.round(tIng).toLocaleString('es-AR')}</div></div><div class="kpi"><div class="kpi-label">Egresos ${informeAnio}</div><div class="kpi-val" style="color:#f87171">$ ${Math.round(tEgr).toLocaleString('es-AR')}</div></div><div class="kpi"><div class="kpi-label">Resultado Neto</div><div class="kpi-val" style="color:${netoC}">$ ${Math.round(tNet).toLocaleString('es-AR')}</div></div><div class="kpi"><div class="kpi-label">Margen Anual</div><div class="kpi-val" style="color:${netoC}">${tIng>0?((tNet/tIng)*100).toFixed(1)+'%':'—'}</div></div></div><div class="section-title">Detalle Mensual — Ejercicio ${informeAnio}</div><table><thead><tr><th>Mes</th><th style="text-align:right">Ingresos</th><th style="text-align:right">Egresos</th><th style="text-align:right">Resultado Neto</th><th style="text-align:right">Margen</th></tr></thead><tbody>${filas.join('')}<tr class="total-row"><td>TOTAL ${informeAnio}</td><td class="num">$ ${Math.round(tIng).toLocaleString('es-AR')}</td><td class="num">$ ${Math.round(tEgr).toLocaleString('es-AR')}</td><td class="num">$ ${Math.round(tNet).toLocaleString('es-AR')}</td><td class="num">${tIng>0?((tNet/tIng)*100).toFixed(1)+'%':'—'}</td></tr></tbody></table><p style="font-size:8px;color:${STEEL};font-style:italic;margin-top:14px">* Valores en ARS. Ingresos Factura A netos de IVA 21%.</p><div class="footer"><span>NESS &middot; D+ARQ &middot; Sistema de Gestión</span><span>Generado: ${new Date().toLocaleString('es-AR')}</span></div></body></html>`;
    const w = window.open('','_print','width=950,height=1100,scrollbars=yes');
    w.document.write(html); w.document.close(); setTimeout(()=>w.print(),600);
  };

  return (
    <div className="space-y-5">
      {/* —— Header —— */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="darq-h2">Informe Socio</h3>
          <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-widest">Vuelta de Obligado 2789 &middot; {periodoLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={generarPDFMensualSocio} disabled={informeMeses.length===0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-slate-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105">
            <FileText size={12}/> PDF Período
          </button>
          <button onClick={generarPDFAnualSocio}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105">
            <FileText size={12}/> PDF Anual {informeAnio}
          </button>
        </div>
      </div>

      {/* —— Año + Mes multi-selector —— */}
      <div className="glass-panel p-4 rounded-xl border border-white/5 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest w-8">Año</span>
          <div className="flex gap-1">
            {aniosDisp.map(a => (
              <button key={a} onClick={() => { setInformeAnio(a); setInformeMeses([]); }}
                className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${
                  String(informeAnio) === String(a) ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-white bg-white/5'
                }`}>{a}</button>
            ))}
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest w-8 mt-1.5">Mes</span>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0')).map(mes => {
              const hasDatos = mesesConDatos.includes(mes);
              const selected = informeMeses.includes(mes);
              return (
                <button key={mes} onClick={() => hasDatos && toggleMes(mes)} disabled={!hasDatos}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border ${
                    selected       ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-900/30' :
                    hasDatos       ? 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:border-white/25' :
                                     'text-slate-700 border-transparent cursor-not-allowed'
                  }`}>
                  {mesNames[parseInt(mes)].substring(0,3)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {informeMeses.length === 0 && (
        <div className="text-center py-10 text-slate-600 text-[10px] font-black uppercase tracking-widest">
          Seleccioná al menos un mes para ver el informe
        </div>
      )}

      {informeMeses.length > 0 && (
        <>
          {/* —— KPIs —— */}
          <div className="grid grid-cols-4 gap-3">
            <div className="glass-panel p-4 rounded-xl border border-emerald-500/15">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ingresos</p>
              <p className="text-lg font-black text-emerald-400 tabular-nums">$ {Math.round(ingTotal).toLocaleString('es-AR')}</p>
              <div className="flex flex-col gap-0.5 mt-1.5">
                {ingAlquiler > 0 && <p className="text-[10px] text-slate-500"><span className="text-amber-400/80 font-black">Alquiler</span> $ {Math.round(ingAlquiler).toLocaleString('es-AR')}</p>}
                {ingExpensas > 0 && <p className="text-[10px] text-slate-500"><span className="text-slate-400 font-black">Expensas</span> $ {Math.round(ingExpensas).toLocaleString('es-AR')}</p>}
              </div>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-rose-500/15">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Egresos</p>
              <p className="text-lg font-black text-rose-400 tabular-nums">$ {Math.round(egrTotal).toLocaleString('es-AR')}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">{egresos.length} gastos</p>
            </div>
            <div className={`glass-panel p-4 rounded-xl border ${neto>=0?'border-emerald-500/15':'border-rose-500/15'}`}>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Resultado Neto</p>
              <p className={`text-lg font-black tabular-nums ${neto>=0?'text-emerald-400':'text-rose-400'}`}>$ {Math.round(neto).toLocaleString('es-AR')}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">u$d {Math.round(netoUSD).toLocaleString('es-AR')}</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Margen</p>
              <p className={`text-lg font-black ${neto>=0?'text-emerald-400':'text-rose-400'}`}>{margen !== null ? margen+'%' : '—'}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">Rentabilidad</p>
            </div>
          </div>

          {/* —— Building Canvas —— */}
          <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <p className="darq-label">Estado de Cobros por Unidad</p>
              <p className="text-[10px] text-slate-600">{buildingCanvas.filter(u=>u.pagado).length} de {buildingCanvas.length} cobrados</p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {buildingCanvas.map(({prop,cli,pagado,montoARS,montoAlquiler,montoExpensas,esUSD,esFactA}) => (
                <div key={prop.id} className="flex items-center px-5 py-2 hover:bg-white/[0.02] transition-colors gap-3">
                  <span className="w-20 text-[10px] font-black text-white flex-shrink-0">{prop.nombre?.toUpperCase()}</span>
                  <span className="flex-1 text-[10px] text-slate-400 truncate">{cli?.nombre || <span className="text-slate-700">— Vacante —</span>}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {esUSD  && <span className="text-[10px] font-black bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded tracking-wider">USD</span>}
                    {esFactA && <span className="text-[10px] font-black bg-amber-900/30 text-amber-400 px-1.5 py-0.5 rounded tracking-wider">FAC A</span>}
                    {pagado ? (
                      <div className="text-right">
                        {montoAlquiler > 0 && montoExpensas > 0 ? (
                          <>
                            <span className="text-[10px] font-black text-amber-300/80 tabular-nums">Alq $ {Math.round(montoAlquiler).toLocaleString('es-AR')}</span>
                            <span className="text-slate-600 mx-1">/</span>
                            <span className="text-[10px] font-black text-slate-400 tabular-nums">Exp $ {Math.round(montoExpensas).toLocaleString('es-AR')}</span>
                          </>
                        ) : (
                          <span className="text-[10px] font-black text-emerald-300 tabular-nums">$ {Math.round(montoARS).toLocaleString('es-AR')}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-700 font-black">{cli ? 'PENDIENTE' : '—'}</span>
                    )}
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${pagado?'bg-emerald-400':cli?'bg-rose-600':'glass-panel'}`}/>
                  </div>
                </div>
              ))}
              {buildingCanvas.length === 0 && (
                <p className="text-center py-6 text-slate-700 text-[10px] font-black uppercase tracking-widest">Sin propiedades VO registradas</p>
              )}
            </div>
          </div>

          {/* —— Expense Breakdown —— */}
          {catList.length > 0 && (
            <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5">
                <p className="darq-label">Egresos por Categoría</p>
              </div>
              <div className="px-5 py-4 space-y-3.5">
                {catList.map(([cat,monto]) => {
                  const pct  = egrTotal > 0 ? Math.round((monto/egrTotal)*100) : 0;
                  const barW = Math.round((monto/maxCat)*100);
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="darq-label">{cat}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] text-slate-600">{pct}%</span>
                          <span className="text-[10px] font-black text-rose-400 tabular-nums min-w-[90px] text-right">$ {Math.round(monto).toLocaleString('es-AR')}</span>
                        </div>
                      </div>
                      <div className="w-full bg-white/[0.04] rounded-full h-1.5">
                        <div className="bg-rose-500/60 h-1.5 rounded-full transition-all" style={{width:`${barW}%`}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
