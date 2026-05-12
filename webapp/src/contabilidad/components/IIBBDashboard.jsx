import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Settings, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { calcPosicionIIBB } from '../helpers/iibbCalc';
import { useComprobantes } from '../hooks/useComprobantes';

const EMPRESAS = ['AMECON', 'BLUE ELEPHANT'];

function navMes(ym, dir) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + dir, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function labelMes(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('es-AR', { month: 'long', year: 'numeric' });
}

export default function IIBBDashboard() {
  const now = new Date();
  const [empresa, setEmpresa]       = useState('AMECON');
  const [periodo, setPeriodo]       = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [alicuota, setAlicuota]     = useState(4.9);
  const [retManual, setRetManual]   = useState(''); // retenciones manuales en ARS
  const [percManual, setPercManual] = useState(''); // percepciones manuales en ARS
  const [editConfig, setEditConfig] = useState(false);

  const { comprobantes, loading } = useComprobantes({ empresa, periodo });

  const emitidos  = useMemo(() => comprobantes.filter(c => c.tipoImport === 'emitidos'),  [comprobantes]);
  const recibidos = useMemo(() => comprobantes.filter(c => c.tipoImport === 'recibidos'), [comprobantes]);

  // Retenciones automáticas desde ARCA + manuales
  const retAuto  = useMemo(() => recibidos.reduce((s, c) => s + Number(c.retIIBB || 0), 0), [recibidos]);
  const retTotal = retAuto + Number(retManual || 0);
  const percTotal = Number(percManual || 0);

  const posicion = useMemo(
    () => calcPosicionIIBB(emitidos, alicuota, retTotal, percTotal),
    [emitidos, alicuota, retTotal, percTotal]
  );

  const PosIcon  = posicion.aPagar ? TrendingUp : posicion.aFavor ? TrendingDown : Minus;
  const posColor = posicion.aPagar ? 'text-rose-400' : posicion.aFavor ? 'text-emerald-400' : 'text-slate-400';
  const posBorder= posicion.aPagar ? 'border-rose-500/20' : posicion.aFavor ? 'border-emerald-500/20' : 'border-white/10';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-black text-white uppercase tracking-widest">Posición IIBB</h2>
          <p className="text-[10px] text-slate-500 mt-1">Ingresos Brutos · Contribuyente Local CABA</p>
        </div>
        <button onClick={() => setEditConfig(v => !v)}
          className={`p-2 rounded-xl transition-all ${editConfig ? 'bg-violet-600 text-white' : 'bg-white/5 text-slate-500 hover:text-white'}`}>
          <Settings size={14} />
        </button>
      </div>

      {/* Config de alícuota */}
      {editConfig && (
        <div className="glass-panel rounded-2xl border border-violet-500/20 p-5 space-y-4 animate-in fade-in duration-300">
          <h3 className="darq-label">Configuración de alícuota</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="darq-label block mb-2">
                Alícuota IIBB CABA (%)
              </label>
              <input type="number" step="0.1" min="0" max="10"
                value={alicuota} onChange={e => setAlicuota(Number(e.target.value))}
                className="w-full text-xs font-bold bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none" />
              <p className="text-[10px] text-slate-600 mt-1">Servicios profesionales CABA: típicamente 4.9%</p>
            </div>
            <div>
              <label className="darq-label block mb-2">
                Retenciones manuales ($)
              </label>
              <input type="number" min="0"
                value={retManual} onChange={e => setRetManual(e.target.value)}
                placeholder="0"
                className="w-full text-xs font-bold bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none placeholder:text-slate-700" />
              <p className="text-[10px] text-slate-600 mt-1">Retenciones no incluidas en ARCA</p>
            </div>
            <div>
              <label className="darq-label block mb-2">
                Percepciones ($)
              </label>
              <input type="number" min="0"
                value={percManual} onChange={e => setPercManual(e.target.value)}
                placeholder="0"
                className="w-full text-xs font-bold bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none placeholder:text-slate-700" />
            </div>
          </div>
        </div>
      )}

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
          {EMPRESAS.map(e => (
            <button key={e} onClick={() => setEmpresa(e)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                empresa === e ? 'glass-panel text-white' : 'text-slate-500 hover:text-slate-200'
              }`}>{e}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => setPeriodo(v => navMes(v, -1))} className="p-2 rounded-xl bg-white/5 text-slate-500 hover:text-white transition-all">
            <ChevronLeft size={14} />
          </button>
          <span className="text-[10px] font-black text-white uppercase tracking-widest min-w-[130px] text-center capitalize">
            {labelMes(periodo)}
          </span>
          <button onClick={() => setPeriodo(v => navMes(v, 1))} className="p-2 rounded-xl bg-white/5 text-slate-500 hover:text-white transition-all">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel rounded-2xl border border-white/10 p-10 text-center">
          <p className="text-[10px] text-slate-500 font-black uppercase animate-pulse">Cargando...</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel rounded-2xl border border-white/10 p-5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Base Imponible</p>
              <p className="text-xl font-black text-white tabular-nums">
                $ {Math.round(posicion.baseImponible).toLocaleString('es-AR')}
              </p>
              <p className="text-[10px] text-slate-600 mt-1">{emitidos.length} comprobantes</p>
            </div>
            <div className="glass-panel rounded-2xl border border-white/10 p-5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Impuesto ({alicuota}%)</p>
              <p className="text-xl font-black text-rose-400 tabular-nums">
                $ {Math.round(posicion.impuestoCalculado).toLocaleString('es-AR')}
              </p>
            </div>
            <div className="glass-panel rounded-2xl border border-white/10 p-5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Pagos a Cuenta</p>
              <p className="text-xl font-black text-emerald-400 tabular-nums">
                $ {Math.round(posicion.totalPagosACuenta).toLocaleString('es-AR')}
              </p>
              <p className="text-[10px] text-slate-600 mt-1">
                Ret: ${Math.round(retTotal).toLocaleString('es-AR')} · Perc: ${Math.round(percTotal).toLocaleString('es-AR')}
              </p>
            </div>

            {/* Posición */}
            <div className={`glass-panel rounded-2xl border ${posBorder} p-5`}>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Posición Neta</p>
              <div className="flex items-center gap-2">
                <PosIcon size={16} className={posColor} />
                <p className={`text-xl font-black tabular-nums tracking-tighter ${posColor}`}>
                  $ {Math.abs(Math.round(posicion.posicion)).toLocaleString('es-AR')}
                </p>
              </div>
              <p className={`text-[10px] font-black mt-1 ${posColor}`}>{posicion.label}</p>
            </div>
          </div>

          {/* Alerta si no hay datos */}
          {emitidos.length === 0 && (
            <div className="glass-panel rounded-2xl border border-amber-500/20 p-4">
              <p className="text-[10px] font-bold text-amber-400">
                No hay comprobantes emitidos de {empresa} para {labelMes(periodo)}. Importá el XLS de ARCA primero.
              </p>
            </div>
          )}

          {/* Info base de cálculo */}
          <div className="glass-panel rounded-2xl border border-white/5 p-5">
            <h4 className="darq-label mb-3">Base de cálculo</h4>
            <div className="space-y-2 text-[10px]">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Facturación neta del período</span>
                <span className="text-white font-black tabular-nums">$ {Math.round(posicion.baseImponible).toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">× Alícuota IIBB CABA {alicuota}%</span>
                <span className="text-rose-400 font-black tabular-nums">$ {Math.round(posicion.impuestoCalculado).toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">− Retenciones sufridas</span>
                <span className="text-emerald-400 font-black tabular-nums">$ {Math.round(retTotal).toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">− Percepciones sufridas</span>
                <span className="text-emerald-400 font-black tabular-nums">$ {Math.round(percTotal).toLocaleString('es-AR')}</span>
              </div>
              <div className={`flex justify-between py-2 font-black ${posColor}`}>
                <span>= Saldo {posicion.label}</span>
                <span className="tabular-nums">$ {Math.abs(Math.round(posicion.posicion)).toLocaleString('es-AR')}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
