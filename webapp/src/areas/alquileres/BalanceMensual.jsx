import React, { useState } from 'react';

/**
 * Vista Balance Mensual — reutilizable para VO y MO.
 * Extraído de AreaAlquileres.jsx.
 *
 * Props:
 *   movs          — movimientos filtrados del edificio
 *   propiedades   — todas las propiedades
 *   clientes      — todos los clientes
 *   contsActivos  — contratos activos
 *   cotizacionBlue
 *   edificio      — 'VO' | 'MO'
 *   titulo        — ej. "Vuelta de Obligado 2789"
 *   porcentajes   — {key: pct} o null (si null, usa prorrateo por ingreso)
 *   filtroProps   — fn(nombre) => bool, para filtrar propiedades del edificio
 *   excludeProps  — array de nombres a excluir
 */
export default function BalanceMensual({
  movs, propiedades, clientes, contsActivos, cotizacionBlue,
  edificio, titulo, porcentajes = null, filtroProps, excludeProps = []
}) {
  const toARS = (m) => {
    const raw = (m.moneda||'ARS') === 'USD'
      ? (Number(m.monto)||0) * (m.cotizacionHistorica || m.tipoCambioReferencia || cotizacionBlue)
      : (Number(m.monto)||0);
    return m.tipoFactura === 'A' ? raw / 1.21 : raw;
  };

  const [balanceAnio, setBalanceAnio] = useState(new Date().getFullYear());

  const allProps = propiedades.filter(p =>
    !p.esCentroCostos &&
    filtroProps(p.nombre) &&
    !excludeProps.includes(p.nombre?.toUpperCase().trim())
  );

  const aniosSet = new Set();
  movs.forEach(m => { if (m.fecha) aniosSet.add(parseInt(m.fecha.substring(0,4))); });
  const aniosDisp = [...aniosSet].sort((a,b) => b - a);

  const anioStr = String(balanceAnio);
  const movsAnio = movs.filter(m => m.fecha?.startsWith(anioStr));
  const ingTotal = movsAnio.filter(m => m.tipo === 'Ingreso').reduce((a,m) => a + toARS(m), 0);
  const egrTotal = movsAnio.filter(m => m.tipo === 'Egreso').reduce((a,m) => a + toARS(m), 0);
  const balTotal = ingTotal - egrTotal;

  const mesesSet = new Set();
  movsAnio.forEach(m => { if (m.fecha) mesesSet.add(m.fecha.substring(0,7)); });
  const meses = [...mesesSet].sort();

  const getMesDetail = (mes) => {
    const movsM = movsAnio.filter(m => m.fecha?.startsWith(mes));
    const ingM = movsM.filter(m => m.tipo === 'Ingreso').reduce((a,m) => a + toARS(m), 0);
    const egrM = movsM.filter(m => m.tipo === 'Egreso').reduce((a,m) => a + toARS(m), 0);

    const ingPorProp = allProps.map(p => {
      const ingP = movsM.filter(m => m.tipo === 'Ingreso' && m.propiedadId === p.id).reduce((a,m) => a + toARS(m), 0);
      return { ...p, ingTotal: ingP };
    });
    const totalIngP = ingPorProp.reduce((a,p) => a + p.ingTotal, 0);

    let propsConBal;
    if (porcentajes) {
      // VO: usa porcentajes fijos
      propsConBal = allProps.map(p => {
        const key = (p.nombre || '').toUpperCase().replace(/\s+/g, '-');
        const pesoFijo = porcentajes[key] || porcentajes[p.nombre] || 0;
        const egrProrrateado = egrM * pesoFijo / 100;
        const ingP = ingPorProp.find(ip => ip.id === p.id);
        const ingT = ingP ? ingP.ingTotal : 0;
        const balance = ingT - egrProrrateado;
        const cont = contsActivos.find(c => c.propiedadId === p.id);
        const cli = cont ? clientes.find(cl => cl.id === cont.clienteId) : null;
        const inquilino = cli ? (cli.nombre || 'Sin nombre') : 'Vacante';
        return { ...p, peso: pesoFijo, egrProrrateado, balance, inquilino, ingTotal: ingT };
      }).sort((a,b) => b.peso - a.peso);
    } else {
      // MO: prorrateo proporcional
      propsConBal = ingPorProp.map(p => {
        const peso = totalIngP > 0 ? (p.ingTotal / totalIngP * 100) : 0;
        const egrProrrateado = egrM * peso / 100;
        const balance = p.ingTotal - egrProrrateado;
        const cont = contsActivos.find(c => c.propiedadId === p.id);
        const cli = cont ? clientes.find(cl => cl.id === cont.clienteId) : null;
        const inquilino = cli ? (cli.nombre || 'Sin nombre') : 'Vacante';
        return { ...p, peso, egrProrrateado, balance, inquilino };
      }).sort((a,b) => b.peso - a.peso);
    }

    return { ingM, egrM, bal: ingM - egrM, props: propsConBal };
  };

  const mesNames = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  return (
    <div className="space-y-6">
      {/* Year selector */}
      <div className="flex items-center justify-between">
        <h3 className="darq-h2">{titulo} — Balance Mensual</h3>
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
          {aniosDisp.map(a => (
            <button key={a} onClick={() => setBalanceAnio(a)}
              className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all ${balanceAnio === a ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-500 hover:text-white'}`}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs for selected year */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-xl border border-white/5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Ingresos {anioStr}</p>
          <p className="text-xl font-extrabold text-emerald-400">$ {ingTotal.toLocaleString('es-AR')}</p>
        </div>
        <div className="glass-panel p-5 rounded-xl border border-white/5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Egresos {anioStr}</p>
          <p className="text-xl font-extrabold text-rose-400">$ {egrTotal.toLocaleString('es-AR')}</p>
        </div>
        <div className="glass-panel p-5 rounded-xl border border-white/5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Balance {anioStr}</p>
          <p className={"text-xl font-extrabold " + (balTotal >= 0 ? "text-emerald-400" : "text-rose-400")}>$ {balTotal.toLocaleString('es-AR')}</p>
        </div>
      </div>

      {/* Monthly details as collapsible lists */}
      <div className="space-y-2">
        {meses.map(mes => {
          const movsM = movsAnio.filter(m => m.fecha?.startsWith(mes));
          const ingM = movsM.filter(m => m.tipo === 'Ingreso').reduce((a,m) => a + toARS(m), 0);
          const egrM = movsM.filter(m => m.tipo === 'Egreso').reduce((a,m) => a + toARS(m), 0);
          const balM = ingM - egrM;
          const mesNum = parseInt(mes.split('-')[1]);
          const mesLabel = mesNames[mesNum] || mes;
          const detail = getMesDetail(mes);
          return (
            <details key={mes} className="glass-panel rounded-xl border border-white/5 overflow-hidden">
              <summary className="px-5 py-3 cursor-pointer list-none flex items-center justify-between hover:bg-white/[0.03] transition-colors">
                <span className="text-sm font-black text-slate-300">{mesLabel}</span>
                <div className="flex items-center gap-6 text-xs font-bold tabular-nums">
                  <span className="text-emerald-400">$ {ingM.toLocaleString('es-AR')}</span>
                  <span className="text-rose-400">$ {egrM.toLocaleString('es-AR')}</span>
                  <span className={(balM >= 0 ? "text-emerald-400" : "text-rose-400") + " font-extrabold min-w-[100px] text-right"}>$ {balM.toLocaleString('es-AR')}</span>
                </div>
              </summary>
              <div className="border-t border-white/5 px-4 py-3 bg-white/[0.02]">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Detalle por propiedad — {mesLabel} {anioStr}</p>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-2 py-1.5 text-slate-600 font-bold uppercase">Unidad</th>
                      <th className="text-left px-2 py-1.5 text-slate-600 font-bold uppercase">Inquilino</th>
                      <th className="text-right px-2 py-1.5 text-slate-600 font-bold uppercase">Ingreso</th>
                      <th className="text-right px-2 py-1.5 text-slate-600 font-bold uppercase">Peso %</th>
                      <th className="text-right px-2 py-1.5 text-slate-600 font-bold uppercase">Egr. Prorr.</th>
                      <th className="text-right px-2 py-1.5 text-slate-600 font-bold uppercase">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.props.map(p => (
                      <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-2 py-1.5 font-bold text-white">{p.nombre}</td>
                        <td className="px-2 py-1.5 text-slate-400">{p.inquilino}</td>
                        <td className="px-2 py-1.5 text-right font-bold text-emerald-400">$ {p.ingTotal.toLocaleString('es-AR')}</td>
                        <td className="px-2 py-1.5 text-right text-slate-400">{p.peso.toFixed(1)}%</td>
                        <td className="px-2 py-1.5 text-right font-bold text-rose-400">$ {Math.round(p.egrProrrateado).toLocaleString('es-AR')}</td>
                        <td className={"px-2 py-1.5 text-right font-bold " + (p.balance >= 0 ? "text-emerald-400" : "text-rose-400")}>$ {Math.round(p.balance).toLocaleString('es-AR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
