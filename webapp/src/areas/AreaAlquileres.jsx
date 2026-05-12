import React, { useState } from 'react';
import { FileText, Clock, AlertTriangle, Calendar, FileSignature } from 'lucide-react';
import { convertToUSD as _convertToUSD, normalizeYearMonth } from '../helpers/financieros';
import RentabilidadEdificios from './alquileres/RentabilidadEdificios';
import InformeSocio from './alquileres/InformeSocio';
import BalanceMensual from './alquileres/BalanceMensual';
import { getGrupoExpensa } from '../config/expensasMapping';

// Porcentajes fijos de expensas VO 2789
const VO_PORCENTAJES = {
  'VO-LOCAL':12.03,'VO-1A':4.91,'VO-1B':3.93,'VO-1C':4.30,
  'VO-2A':4.94,'VO-2B':4.30,'VO-2C':3.96,'VO-3A':4.94,
  'VO-3B':4.30,'VO-3C':3.96,'VO-4A':4.94,'VO-4B':4.30,
  'VO-4C':3.96,'VO-5A':4.94,'VO-5B':4.30,'VO-5C':3.96,
  'VO-6A':5.81,'VO-6B':5.81,'VO-7A':5.33,'VO-8A':5.09
};

/**
 * Dashboard Área Alquileres
 * Props: movimientos, propiedades, clientes, contratos, proveedores, cotizacionBlue,
 *        setFormMov, setIsModalMovOpen, formMov, setIsModalCobroOpen
 */
export default function AreaAlquileres({
  movimientos, propiedades, clientes, contratos, proveedores, cotizacionBlue,
  setFormMov, setIsModalMovOpen, formMov, setIsModalCobroOpen
}) {
  const convertToUSD = (monto, moneda, tc) => _convertToUSD(monto, moneda, tc, cotizacionBlue);

  // ── Internal state (moved from App.jsx) ──
  const hoy = new Date();
  const [alqView, setAlqView] = useState('dashboard');
  const [liquidacionMes, setLiquidacionMes] = useState(String(hoy.getMonth() + 1).padStart(2, '0'));
  const [liquidacionAnio, setLiquidacionAnio] = useState(String(hoy.getFullYear()));

  return (() => {

            // â”€â”€ Helpers â”€â”€
            const movsAlq = movimientos.filter(m => m.area === 'Alquileres');

            // Helper: determinar edificio de un movimiento por nombre de propiedad o centro de costos
            const getEdificio = (m) => {
              if (m.propiedadId) {
                const prop = propiedades.find(p => p.id === m.propiedadId);
                const pName = (prop?.nombre || '').toUpperCase();
                if (pName.startsWith('VO')) return 'VO';
                if (pName.startsWith('MO')) return 'MO';
              }
              // Gastos sin propiedad asignada: check concepto/rubro para VO-Consorcio / MO-General
              const refText = ((m.concepto || '') + ' ' + (m.rubro || '') + ' ' + (m.subRubro || '')).toUpperCase();
              if (refText.includes('VO-') || refText.includes('CONSORCIO VO') || refText.includes('VO CONSORCIO')) return 'VO';
              if (refText.includes('MO-') || refText.includes('GENERAL MO') || refText.includes('MO GENERAL')) return 'MO';
              return '';
            };

            const movsVO = movsAlq.filter(m => getEdificio(m) === 'VO');
            const movsMO = movsAlq.filter(m => getEdificio(m) === 'MO');


            // â”€â”€ Alertas día 8 â”€â”€
            const hoy = new Date();
            const dia = hoy.getDate();
            const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`;
            // Contrato activo: empezó (fechaInicio <= hoy) y no expiró
            // Si no tiene fechaFin o es inválida (Prieto, etc.) → contrato indefinido → activo
            const esContratoActivo = (c) => {
              if (c.fechaInicio && new Date(c.fechaInicio) > hoy) return false; // no empezó aún
              const fin = c.fechaFin && c.fechaFin !== '-' && c.fechaFin !== '0';
              return !fin || new Date(c.fechaFin) >= hoy;
            };
            const contsActivos = contratos.filter(esContratoActivo);

            // Case-insensitive: ETL guarda 'alquiler'/'expensas' (lowercase), modal guarda 'Alquiler'/'Expensas'
            const esIngAlquiler = (m) => ['alquiler','alquileres'].includes((m.rubro||m.categoriaEgreso||'').toLowerCase());
            const esIngExpensas = (m) => (m.rubro||m.categoriaEgreso||'').toLowerCase().includes('expens');

            const alertasSinPago = contsActivos.filter(c => {
              const tieneAlquilerMes = movsAlq.some(m =>
                m.propiedadId === c.propiedadId &&
                normalizeYearMonth(m.fecha) === mesActual &&
                m.tipo === 'Ingreso' &&
                esIngAlquiler(m)
              );
              return !tieneAlquilerMes;
            });
            const alertasSinExpensas = contsActivos.filter(c => {
              const tieneExpensasMes = movsAlq.some(m =>
                m.propiedadId === c.propiedadId &&
                normalizeYearMonth(m.fecha) === mesActual &&
                m.tipo === 'Ingreso' &&
                esIngExpensas(m)
              );
              return !tieneExpensasMes;
            });

            // â”€â”€ Sin contrato activo â”€â”€
            const propSinContrato = propiedades.filter(p => {
              const n = (p.nombre||'').toUpperCase().trim();
              if (p.esCentroCostos) return false;
              if (n.includes('CONSORCIO') || n.includes('MO GENERAL') || n.includes('MO-GENERAL') || n.includes('GENERAL MO')) return false;
              if (n.includes('CORREA 3212')) return false; // sede empresa
              return !contsActivos.find(c => c.propiedadId === p.id);
            });

            // â”€â”€ Balance mensual por edificio â”€â”€


            // â”€â”€ Liquidación expensas VO â”€â”€
            const liquidPeriodo = `${liquidacionAnio}-${liquidacionMes}`;
            const egrsVOLiquid = movsVO.filter(m=>m.tipo==='Egreso' && normalizeYearMonth(m.fecha) === liquidPeriodo);
            const totalGastosLiquid = egrsVOLiquid.reduce((a, m) => {
               if (m.tipoGasto === 'extraordinario') return a;
               const grupo = getGrupoExpensa(m.categoriaEgreso, m.rubro || m.subRubro);
               if (grupo === 'NO COMPUTA') return a;
               return a + (Number(m.monto) || 0);
            }, 0);

            const generarPDFLiquidacion = () => {
              const w = window.open('','_print','width=800,height=1000,scrollbars=yes');
              const rows = Object.entries(VO_PORCENTAJES).map(([unidad, pct]) => {
                const monto = (totalGastosLiquid * pct / 100);
                const prop = propiedades.find(p=>p.nombre===unidad || p.codigo===unidad);
                const contrato = prop ? contsActivos.find(c=>c.propiedadId===prop.id) : null;
                const cliente = contrato ? clientes.find(cl => cl.id === contrato.clienteId) : null;
                const inquilino = cliente ? (cliente.nombre || 'Sin nombre') : 'Sin inquilino';
                const tienesPago = movsAlq.some(m=>m.propiedadId===prop?.id && normalizeYearMonth(m.fecha) === liquidPeriodo && m.tipo === 'Ingreso');
                return {unidad, pct, monto, inquilino, tienesPago, prop};
              });
              // Colores corporativos NESS
              const NAVY = '#1B3054';
              const DARK = '#0E1F38';
              const STEEL = '#3A6080';
              const BEIGE = '#C2B08B';
              const COPPER = '#B07D4F';
              const gastosAgrupados = {};
              const extraordinarios = [];
              let totalOrdinarios = 0;
              
              egrsVOLiquid.forEach(m => {
                 const prov = proveedores.find(p=>p.id===m.proveedorId)?.nombre||'-';
                 const monto = Number(m.monto) || 0;
                 if (m.tipoGasto === 'extraordinario') {
                    extraordinarios.push({ ...m, prov, monto });
                 } else {
                    const grupo = getGrupoExpensa(m.categoriaEgreso, m.rubro || m.subRubro);
                    if (grupo !== 'NO COMPUTA') {
                       const cat = (m.categoriaEgreso || 'VARIOS').toUpperCase();
                       if (!gastosAgrupados[cat]) gastosAgrupados[cat] = [];
                       gastosAgrupados[cat].push({ ...m, prov, monto });
                       totalOrdinarios += monto;
                    }
                 }
              });

              let gastosHTML = '';
              const categoriasList = Object.keys(gastosAgrupados).sort();
              if (categoriasList.length === 0) {
                 gastosHTML += `<tr><td colspan="3" style="color:#94a3b8; font-style:italic; font-size:9px; text-align:center">Sin gastos registrados en el período</td></tr>`;
              } else {
                 categoriasList.forEach(cat => {
                    const movs = gastosAgrupados[cat];
                    const totalGrupo = movs.reduce((a, b) => a + b.monto, 0);
                    
                    gastosHTML += `<tr style="background:${NAVY}10"><td colspan="2" style="font-weight:900; color:${NAVY}; font-size:10px">${cat}</td><td style="text-align:right; font-weight:900; color:${NAVY}; font-size:10px">$ ${totalGrupo.toLocaleString('es-AR')}</td></tr>`;
                    
                    movs.forEach(m => {
                        const rub = m.rubro || m.subRubro || '';
                        let detalle = rub ? rub.toUpperCase() : '';
                        if (m.concepto && m.concepto !== '-') detalle += (detalle ? ` — ` : '') + m.concepto.toUpperCase();
                        if (!detalle) detalle = 'VARIOS';
                        if (m.prov && m.prov !== '-') detalle += ` (${m.prov.toUpperCase()})`;
                        
                        gastosHTML += `<tr><td style="width:15%">${m.fecha||'-'}</td><td style="width:65%">${detalle}</td><td style="text-align:right; width:20%">$ ${m.monto.toLocaleString('es-AR')}</td></tr>`;
                    });
                 });
              }
              
              if (extraordinarios.length > 0) {
                  const totalExt = extraordinarios.reduce((a, b) => a + b.monto, 0);
                  gastosHTML += `
                    <tr><td colspan="3" style="border:none; height:24px"></td></tr>
                    <tr class="total-row"><td colspan="3" style="background:${COPPER}; color:white; text-align:center">GASTOS EXTRAORDINARIOS (A CARGO DEL PROPIETARIO)</td></tr>
                  `;
                  extraordinarios.forEach(m => {
                     const rub = m.rubro || m.subRubro || m.categoriaEgreso || '';
                     let detalle = rub ? rub.toUpperCase() : 'VARIOS';
                     if (m.concepto && m.concepto !== '-') detalle += ` — ${m.concepto.toUpperCase()}`;
                     if (m.prov && m.prov !== '-') detalle += ` (${m.prov.toUpperCase()})`;
                     gastosHTML += `<tr><td style="width:15%">${m.fecha||'-'}</td><td style="width:65%">${detalle}</td><td style="text-align:right; width:20%">$ ${m.monto.toLocaleString('es-AR')}</td></tr>`;
                  });
                  gastosHTML += `<tr style="background:${COPPER}20"><td colspan="2" style="font-weight:900; color:${COPPER}">TOTAL EXTRAORDINARIOS</td><td style="text-align:right; font-weight:900; color:${COPPER}">$ ${totalExt.toLocaleString('es-AR')}</td></tr>`;
              }
              const html = `<!DOCTYPE html><html><head>
                <title>Liquidación Expensas VO 2789 - ${liquidacionMes}/${liquidacionAnio}</title>
                <style>
                  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
                  *{margin:0;padding:0;box-sizing:border-box}
                  body{font-family:'Outfit',sans-serif;background:${DARK};color:#e2e8f0;padding:40px}
                  .header{border-bottom:3px solid ${BEIGE};padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:flex-start}
                  .brand{display:flex;align-items:center;gap:16px}
                  .brand-n{font-size:48px;font-weight:900;color:${NAVY};font-style:italic;letter-spacing:-3px}
                  .brand-sub{font-size:9px;font-weight:700;color:${STEEL};text-transform:uppercase;letter-spacing:4px}
                  .title{font-size:28px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:-1px}
                  .subtitle{font-size:10px;font-weight:700;color:${STEEL};text-transform:uppercase;letter-spacing:4px;margin-top:6px}
                  .meta{display:flex;gap:40px;margin-top:16px}
                  .meta-item p:first-child{font-size:8px;font-weight:900;color:${STEEL};text-transform:uppercase;letter-spacing:3px}
                  .meta-item p:last-child{font-size:16px;font-weight:900;color:#fff;margin-top:4px}
                  .section-title{font-size:9px;font-weight:900;color:${BEIGE};text-transform:uppercase;letter-spacing:3px;margin:24px 0 12px;border-bottom:1px solid ${NAVY};padding-bottom:6px}
                  table{width:100%;border-collapse:collapse;font-size:11px}
                  th{background:${NAVY};padding:10px 12px;text-align:left;font-size:8px;font-weight:900;color:${BEIGE};text-transform:uppercase;letter-spacing:2px}
                  td{padding:10px 12px;border-bottom:1px solid ${NAVY};font-weight:700}
                  .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:8px;font-weight:900;text-transform:uppercase}
                  .paid{background:#065f46;color:#34d399}.unpaid{background:#7f1d1d;color:#f87171}
                  .total-row{background:${NAVY};font-weight:900;color:${BEIGE}}
                  .gastos-title{font-size:9px;font-weight:900;color:${BEIGE};text-transform:uppercase;letter-spacing:3px;margin:24px 0 12px;border-bottom:1px solid ${NAVY};padding-bottom:6px}
                  .footer{margin-top:30px;border-top:2px solid ${NAVY};padding-top:16px;display:flex;justify-content:space-between;font-size:8px;color:${STEEL};text-transform:uppercase;letter-spacing:2px}
                  .wa-btn{display:inline-block;margin-top:20px;padding:10px 24px;background:#25d366;color:#fff;border-radius:8px;text-decoration:none;font-weight:900;font-size:12px;letter-spacing:1px}
                  @media print{body{background:#fff;color:#000;padding:20px}.wa-btn{display:none}}
                </style>
              </head><body>
                <div class="header">
                  <div>
                    <div class="brand">
                      <div class="brand-n">NESS<span style="color:${BEIGE}">.</span></div>
                    </div>
                    <div class="brand-sub">Inversiones de los Hermanos Donato</div>
                    <div style="margin-top:8px;font-size:10px;color:${STEEL}">D+ARQ · Gestión Inmobiliaria</div>
                  </div>
                  <div style="text-align:right">
                    <div class="title">Liquidación de Expensas</div>
                    <div class="subtitle">Vuelta de Obligado 2789</div>
                  </div>
                </div>
                <div class="meta">
                  <div class="meta-item"><p>Período</p><p>${liquidacionMes}/${liquidacionAnio}</p></div>
                  <div class="meta-item"><p>Total Gastos</p><p>$ ${totalGastosLiquid.toLocaleString('es-AR')}</p></div>
                  <div class="meta-item"><p>Unidades</p><p>${Object.keys(VO_PORCENTAJES).length}</p></div>
                  <div class="meta-item"><p>Emitido</p><p>${new Date().toLocaleDateString()}</p></div>
                </div>
                <div class="gastos-title">Detalle de Gastos del Mes</div>
                <table>
                  <thead><tr><th style="width:15%">Fecha</th><th style="width:65%">Detalle del Gasto</th><th style="text-align:right; width:20%">Monto</th></tr></thead>
                  <tbody>
                    ${gastosHTML}
                    <tr class="total-row"><td colspan="2">TOTAL GASTOS</td><td style="text-align:right">$ ${totalGastosLiquid.toLocaleString('es-AR')}</td></tr>
                  </tbody>
                </table>
                <div class="section-title">Liquidación por Unidad Funcional</div>
                <table>
                  <thead><tr><th>Unidad</th><th>%</th><th>Inquilino</th><th style="text-align:right">Monto</th><th>Estado</th></tr></thead>
                  <tbody>
                    ${rows.map(r=>'<tr><td>'+r.unidad+'</td><td>'+r.pct+'%</td><td>'+r.inquilino+'</td><td style="text-align:right">$ '+r.monto.toLocaleString('es-AR', {maximumFractionDigits: 0})+'</td><td><span class="badge '+(r.tienesPago?'paid':'unpaid')+'">'+(r.tienesPago?'Pago':'Sin pago')+'</span></td></tr>').join('')}
                    <tr class="total-row"><td colspan="3">TOTAL</td><td style="text-align:right">$ ${totalGastosLiquid.toLocaleString('es-AR')}</td><td></td></tr>
                  </tbody>
                </table>
                <div class="footer">
                  <span>NESS · D+ARQ · Sistema de Gestión</span>
                  <span>Documento generado automáticamente · ${new Date().toLocaleString('es-AR')}</span>
                </div>
                <div style="text-align:center">
                  <a class="wa-btn" href="https://api.whatsapp.com/send?text=${encodeURIComponent('Liquidación de Expensas VO 2789 - Período ' + liquidacionMes + '/' + liquidacionAnio + ' - Total: $' + totalGastosLiquid.toLocaleString('es-AR'))}" target="_blank">📱 Compartir por WhatsApp</a>
                </div>
              </body></html>`;
              w.document.write(html);
              w.document.close();
              setTimeout(()=>w.print(),500);
            };

            return (
              <div className="space-y-0 animate-in fade-in duration-700">
                {/* Nav */}
                <div className="flex items-center justify-between mb-10">
                  <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
                    {[{v:'dashboard',l:'Panel de Área'},{v:'rentabilidad',l:'Rentabilidad'},{v:'balanceVO',l:'Balance VO'},{v:'balanceMO',l:'Balance MO'},{v:'liquidacion',l:'Liquidación VO'},{v:'informeSocio',l:'Informe Socio'}].map(({v,l}) => (
                      <button key={v} onClick={() => setAlqView(v)}
                        className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${alqView===v?'bg-white text-slate-900 shadow-xl':'text-slate-500 hover:text-white'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                  {alqView === 'dashboard' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsModalCobroOpen(true)}
                        style={{ background: '#111', color: '#F0EEE9', border: 'none', borderRadius: '0.75rem', padding: '0.5rem 1rem', fontWeight: 900, fontStyle: 'italic', fontSize: '0.65rem', letterSpacing: '0.08em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        💳 REGISTRAR COBRO
                      </button>
                    </div>
                  )}
                </div>

                {alqView === 'dashboard' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 xl:gap-6 items-start">

                    {/* ── Alquileres sin pago ── */}
                    {alertasSinPago.length > 0 && (
                      <details className="glass-panel rounded-xl border border-amber-500/20 overflow-hidden group">
                        <summary className="px-5 py-4 bg-amber-500/10 cursor-pointer list-none flex items-center justify-between hover:bg-amber-500/15 transition-colors">
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={14} className="text-amber-400"/>
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Alquileres sin pago</span>
                          </div>
                          <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full">{alertasSinPago.length}</span>
                        </summary>
                        <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto custom-scrollbar">
                          {alertasSinPago.map(c => {
                            const prop = propiedades.find(p=>p.id===c.propiedadId);
                            const cli = clientes.find(cl=>cl.id===c.clienteId);
                            const nomInq = cli ? (cli.nombre || 'Sin nombre') : 'Sin inquilino';
                            const edif = prop?.nombre?.toUpperCase().startsWith('VO') ? 'VO 2789' : prop?.nombre?.toUpperCase().startsWith('MO') ? 'MO 2325' : '-';
                            return (
                              <div key={c.id} className="flex justify-between items-center px-5 py-3">
                                <div>
                                  <p className="text-[10px] font-black text-white">{nomInq}</p>
                                  <p className="text-[9px] text-slate-500">{prop?.nombre || '-'} · {edif}</p>
                                </div>
                                <span className="text-[9px] font-black text-amber-400 uppercase">Sin pago</span>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    )}

                    {/* ── Expensas sin pago ── */}
                    {alertasSinExpensas.length > 0 && (
                      <details className="glass-panel rounded-xl border border-rose-500/20 overflow-hidden group">
                        <summary className="px-5 py-4 bg-rose-500/10 cursor-pointer list-none flex items-center justify-between hover:bg-rose-500/15 transition-colors">
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={14} className="text-rose-400"/>
                            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Expensas sin pago</span>
                          </div>
                          <span className="text-[10px] font-black text-rose-300 bg-rose-500/20 px-3 py-1 rounded-full">{alertasSinExpensas.length}</span>
                        </summary>
                        <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto custom-scrollbar">
                          {alertasSinExpensas.map(c => {
                            const prop = propiedades.find(p=>p.id===c.propiedadId);
                            const cli = clientes.find(cl=>cl.id===c.clienteId);
                            const nomInq = cli ? (cli.nombre || 'Sin nombre') : 'Sin inquilino';
                            const edif = prop?.nombre?.toUpperCase().startsWith('VO') ? 'VO 2789' : prop?.nombre?.toUpperCase().startsWith('MO') ? 'MO 2325' : '-';
                            return (
                              <div key={c.id} className="flex justify-between items-center px-5 py-3">
                                <div>
                                  <p className="text-[10px] font-black text-white">{nomInq}</p>
                                  <p className="text-[9px] text-slate-500">{prop?.nombre || '-'} · {edif}</p>
                                </div>
                                <span className="text-[9px] font-black text-rose-400 uppercase">Sin pago</span>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    )}

                    {/* ── Contratos por vencer / Próx. Actualización ── */}
                    {(() => {
                      const hoyDate = new Date();
                      const en60dias = new Date(hoyDate.getTime() + 60 * 24 * 60 * 60 * 1000);
                      const en30dias = new Date(hoyDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                      const porVencer = contsActivos.filter(c => c.fechaFin && new Date(c.fechaFin) <= en60dias && new Date(c.fechaFin) >= hoyDate);
                      const porRenovar = contsActivos.filter(c => c.proximaActualizacion && new Date(c.proximaActualizacion) <= en30dias && new Date(c.proximaActualizacion) >= hoyDate);
                      return (
                        <>
                          
                            <details className="glass-panel rounded-xl border border-orange-500/20 overflow-hidden">
                              <summary className="px-5 py-4 bg-orange-500/10 cursor-pointer list-none flex items-center justify-between hover:bg-orange-500/15 transition-colors">
                                <div className="flex items-center gap-2">
                                  <Clock size={14} className="text-orange-400"/>
                                  <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Contratos por vencer — 60 días</span>
                                </div>
                                <span className="text-[10px] font-black text-orange-300 bg-orange-500/20 px-3 py-1 rounded-full">{porVencer.length}</span>
                              </summary>
                              <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto custom-scrollbar">
                                {porVencer.map(c => {
                                  const prop = propiedades.find(p=>p.id===c.propiedadId);
                                  const cli = clientes.find(cl=>cl.id===c.clienteId);
                                  const diasRestantes = Math.ceil((new Date(c.fechaFin) - hoyDate) / (1000*60*60*24));
                                  return (
                                    <div key={c.id} className="flex justify-between items-center px-5 py-3">
                                      <div>
                                        <p className="text-[10px] font-black text-white">{cli?.nombre || 'Sin inquilino'}</p>
                                        <p className="text-[9px] text-slate-500">{prop?.nombre || '-'}</p>
                                {porVencer.length === 0 && <p className="px-5 py-4 text-[10px] text-slate-500 font-bold">Sin contratos próximos a vencer</p>}
                                      </div>
                                      <div className="text-right">
                                        <p className="text-[10px] font-black text-orange-400">{diasRestantes} días</p>
                                        <p className="text-[9px] text-slate-600">{c.fechaFin}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </details>

                          
                            <details className="glass-panel rounded-xl border border-blue-500/20 overflow-hidden">
                              <summary className="px-5 py-4 bg-blue-500/10 cursor-pointer list-none flex items-center justify-between hover:bg-blue-500/15 transition-colors">
                                <div className="flex items-center gap-2">
                                  <Calendar size={14} className="text-blue-400"/>
                                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Próxima actualización — 30 días</span>
                                </div>
                                <span className="text-[10px] font-black text-blue-300 bg-blue-500/20 px-3 py-1 rounded-full">{porRenovar.length}</span>
                              </summary>
                              <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto custom-scrollbar">
                                {porRenovar.map(c => {
                                  const prop = propiedades.find(p=>p.id===c.propiedadId);
                                  const cli = clientes.find(cl=>cl.id===c.clienteId);
                                  const diasRestantes = Math.ceil((new Date(c.proximaActualizacion) - hoyDate) / (1000*60*60*24));
                                  return (
                                    <div key={c.id} className="flex justify-between items-center px-5 py-3">
                                      <div>
                                        <p className="text-[10px] font-black text-white">{cli?.nombre || 'Sin inquilino'}</p>
                                        <p className="text-[9px] text-slate-500">{prop?.nombre || '-'}</p>
                                {porRenovar.length === 0 && <p className="px-5 py-4 text-[10px] text-slate-500 font-bold">Sin actualizaciones próximas</p>}
                                      </div>
                                      <div className="text-right">
                                        <p className="text-[10px] font-black text-blue-400">{diasRestantes} días</p>
                                        <p className="text-[9px] text-slate-600">{c.proximaActualizacion}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </details>

                        </>
                      );
                    })()}

                    {/* ── Contratos activos ── */}
                    <details open className="glass-panel rounded-xl border border-white/5 overflow-hidden">
                      <summary className="px-5 py-4 cursor-pointer list-none flex items-center justify-between hover:bg-white/[0.03] transition-colors">
                        <div className="flex items-center gap-2">
                          <FileSignature size={14} className="text-emerald-400"/>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contratos Activos</span>
                        </div>
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full">{contsActivos.length}</span>
                      </summary>
                      <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto custom-scrollbar">
                        {contsActivos.map(c=>{
                          const prop=propiedades.find(p=>p.id===c.propiedadId);
                          const cli=clientes.find(cl=>cl.id===c.clienteId);
                          const nomInq = cli ? (cli.nombre || 'Sin nombre') : 'Sin inquilino';
                          const edif = prop?.nombre?.toUpperCase().startsWith('VO') ? 'VO 2789' : prop?.nombre?.toUpperCase().startsWith('MO') ? 'MO 2325' : '-';
                          return (
                            <div key={c.id} className="flex justify-between items-center px-5 py-3">
                              <div>
                                <p className="text-[10px] font-black text-white">{nomInq}</p>
                                <p className="text-[9px] text-slate-500">{prop?.nombre||'-'} · {edif}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-black text-emerald-400">$ {(c.montoAlquiler||0).toLocaleString('es-AR')}</p>
                                <p className="text-[9px] text-slate-600">Vence: {c.fechaFin||'Sin fecha'}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </details>

                    {/* ── Propiedades sin contrato ── */}
                    {propSinContrato.length > 0 && (
                      <details className="glass-panel rounded-xl border border-rose-500/15 overflow-hidden">
                        <summary className="px-5 py-4 cursor-pointer list-none flex items-center justify-between hover:bg-white/[0.03] transition-colors">
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={14} className="text-rose-500"/>
                            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Propiedades sin contrato</span>
                          </div>
                          <span className="text-[10px] font-black text-rose-300 bg-rose-500/20 px-3 py-1 rounded-full">{propSinContrato.length}</span>
                        </summary>
                        <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto custom-scrollbar">
                          {propSinContrato.map(p=>(
                            <div key={p.id} className="flex justify-between items-center px-5 py-3">
                              <div>
                                <p className="text-[10px] font-black text-white uppercase">{p.nombre||p.codigo}</p>
                                <p className="text-[9px] text-slate-500">{p.nombre?.toUpperCase().startsWith('VO') ? 'VO 2789' : p.nombre?.toUpperCase().startsWith('MO') ? 'MO 2325' : '-'}</p>
                              </div>
                              <span className="text-[9px] font-black text-rose-500 uppercase">Sin contrato</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}
                {alqView === 'liquidacion' && (
                  <div className="space-y-8">
                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex items-center gap-3 glass-panel px-6 py-3 rounded-2xl">
                        <label className="darq-label">Período</label>
                        <select value={liquidacionMes} onChange={e=>setLiquidacionMes(e.target.value)}
                          className="bg-transparent text-white font-black text-sm outline-none">
                          {Array.from({length:12},(_,i)=>`${String(i+1).padStart(2,'0')}`).map(m=>(
                            <option key={m} value={m} className="bg-slate-900">Mes {m}</option>
                          ))}
                        </select>
                        <select value={liquidacionAnio} onChange={e=>setLiquidacionAnio(e.target.value)}
                          className="bg-transparent text-white font-black text-sm outline-none">
                          {[2023,2024,2025,2026].map(y=>(
                            <option key={y} value={y} className="bg-slate-900">{y}</option>
                          ))}
                        </select>
                      </div>
                      <div className="ml-2">
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Total gastos VO</p>
                        <p className="text-xl font-black text-rose-400">$ {totalGastosLiquid.toLocaleString('es-AR')}</p>
                      </div>
                      <button onClick={generarPDFLiquidacion}
                        className="ml-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-black/20 flex items-center gap-2">
                        <FileText size={14}/> Generar PDF
                      </button>
                    </div>

                    {/* Gastos del mes */}
                    <div className="glass-panel p-5 rounded-2xl border border-white/5">
                      <h4 className="darq-label mb-5">Gastos del edificio — {liquidacionMes}/{liquidacionAnio}</h4>
                      <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1">
                        {egrsVOLiquid.length === 0 ? (
                          <p className="text-sm text-slate-500 font-bold italic">No hay egresos registrados para este período.</p>
                        ) : egrsVOLiquid.map((m,i) => (
                          <div key={i} className="flex justify-between items-center py-3 px-2 border-b border-white/5 last:border-0">
                            <div>
                              <p className="text-[9px] font-black text-white">{m.concepto||'-'}</p>
                              <p className="text-[8px] text-slate-500">{m.fecha} · {proveedores.find(p=>p.id===m.proveedorId)?.nombre||'Sin proveedor'}</p>
                            </div>
                            <p className="text-sm font-black text-rose-400">$ {m.monto?.toLocaleString('es-AR')}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tabla por unidad */}
                    <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
                      <div className="px-6 py-4 border-b border-white/5">
                        <h4 className="darq-label">Liquidación por Unidad</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[9px]">
                          <thead>
                            <tr className="border-b border-white/5">
                              <th className="text-left px-5 py-3 font-black text-slate-500 uppercase tracking-widest">Unidad</th>
                              <th className="text-left px-5 py-3 font-black text-slate-500 uppercase tracking-widest">Inquilino</th>
                              <th className="text-right px-5 py-3 font-black text-slate-500 uppercase tracking-widest">%</th>
                              <th className="text-right px-5 py-3 font-black text-slate-500 uppercase tracking-widest">Monto</th>
                              <th className="text-center px-5 py-3 font-black text-slate-500 uppercase tracking-widest">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(VO_PORCENTAJES).map(([unidad, pct]) => {
                              const monto = totalGastosLiquid * pct / 100;
                              const prop = propiedades.find(p=>p.nombre===unidad||p.codigo===unidad);
                              const cont = prop ? contsActivos.find(c=>c.propiedadId===prop.id) : null;
                              const cli = cont ? clientes.find(cl=>cl.id===cont.clienteId) : null;
                              const inquilino = cli ? (cli.nombre || 'Sin nombre') : '-';
                              const tienesPago = movsAlq.some(m=>m.propiedadId===prop?.id&&normalizeYearMonth(m.fecha)===liquidPeriodo&&m.tipo==='Ingreso');
                              return (
                                <tr key={unidad} className="border-b border-white/5 hover:bg-white/[0.02]">
                                  <td className="px-5 py-3 font-black text-white">{unidad}</td>
                                  <td className="px-5 py-3 text-slate-400">{inquilino}</td>
                                  <td className="px-5 py-3 text-right text-slate-400">{pct}%</td>
                                  <td className="px-5 py-3 text-right font-black text-white">$ {monto.toLocaleString('es-AR', {maximumFractionDigits: 0})}</td>
                                  <td className="px-5 py-3 text-center">
                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${tienesPago?'bg-emerald-500/10/20 text-emerald-400':'bg-rose-500/10/20 text-rose-400'}`}>
                                      {tienesPago ? 'Pago' : 'Sin pago'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                            <tr className="border-t-2 border-white/10 bg-white/3">
                              <td colSpan="3" className="px-5 py-3 font-black text-white uppercase">Total</td>
                              <td className="px-5 py-3 text-right font-black text-white">$ {totalGastosLiquid.toLocaleString('es-AR')}</td>
                              <td></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* â•â•â•â•â•â• RENTABILIDAD VO vs MO â•â•â•â•â•â• */}
                {alqView === 'rentabilidad' && (
                  <RentabilidadEdificios
                    movsVO={movsVO} movsMO={movsMO} movsAlq={movsAlq}
                    propiedades={propiedades} clientes={clientes} contratos={contratos}
                    proveedores={proveedores} cotizacionBlue={cotizacionBlue}
                    movimientos={movimientos} contsActivos={contsActivos}
                  />
                )}

                {alqView === 'balanceMO' && (
                  <BalanceMensual
                    movs={movsMO}
                    propiedades={propiedades} clientes={clientes} contsActivos={contsActivos}
                    cotizacionBlue={cotizacionBlue}
                    edificio="MO" titulo="Monroe 2325"
                    filtroProps={(nombre) => nombre?.toUpperCase().startsWith('MO')}
                    excludeProps={['MO GENERAL','GENERAL MO']}
                  />
                )}

                {alqView === 'balanceVO' && (
                  <BalanceMensual
                    movs={movsVO}
                    propiedades={propiedades} clientes={clientes} contsActivos={contsActivos}
                    cotizacionBlue={cotizacionBlue}
                    edificio="VO" titulo="Vuelta de Obligado 2789"
                    filtroProps={(nombre) => nombre?.toUpperCase().startsWith('VO')}
                    excludeProps={['VO CONSORCIO','CONSORCIO VO','VO-CONSORCIO']}
                    porcentajes={VO_PORCENTAJES}
                  />
                )}

                {alqView === 'informeSocio' && (
                  <InformeSocio
                    movsVO={movsVO}
                    propiedades={propiedades} clientes={clientes} contratos={contratos}
                    proveedores={proveedores} cotizacionBlue={cotizacionBlue}
                    contsActivos={contsActivos}
                  />
                )}

              </div>
            );
  })();
}
