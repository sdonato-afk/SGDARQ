import React, { useState, useMemo } from 'react';
import {
  FileText, Upload, BarChart2, Receipt,
  Building2, TrendingUp, TrendingDown, ChevronRight, Minus
} from 'lucide-react';
import ImportARCA    from './components/ImportARCA';
import IVADashboard  from './components/IVADashboard';
import IIBBDashboard from './components/IIBBDashboard';
import { useComprobantes }   from './hooks/useComprobantes';
import { calcPosicionIVA, calcSaldoAcumulado } from './helpers/ivaCalc';

// ─── Navegación interna ───────────────────────────────────────────────────────
const TABS = [
  {
    id: 'iva',
    icon: TrendingUp,
    label: 'IVA',
    sub: 'Débito vs. Crédito fiscal',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
  {
    id: 'iibb',
    icon: Building2,
    label: 'IIBB',
    sub: 'Contribuyente local CABA',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  {
    id: 'arca',
    icon: Upload,
    label: 'Importar ARCA',
    sub: 'Comprobantes emitidos / recibidos',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
  },
  {
    id: 'comprobantes',
    icon: Receipt,
    label: 'Comprobantes',
    sub: 'Archivo de facturas',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    comingSoon: true,
  },
];

const EMPRESAS = ['BLUE ELEPHANT', 'AMECON'];
const fmt = (n) => Math.abs(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });

// ─── Widget IVA para el home ──────────────────────────────────────────────────
function IVAWidget({ onNav }) {
  const now = new Date();
  const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [empresa, setEmpresa] = useState('BLUE ELEPHANT');

  const { comprobantes: todos, configContable, loading } = useComprobantes({ empresa });

  const saldoApertura = Number(configContable?.saldoInicioIVA?.[empresa] ?? 0);

  const { saldoAnterior } = useMemo(
    () => calcSaldoAcumulado(todos, mesActual, saldoApertura),
    [todos, mesActual, saldoApertura]
  );

  const { emitidos, recibidos } = useMemo(() => {
    const mes = todos.filter(c => c.periodo === mesActual);
    return {
      emitidos:  mes.filter(c => c.tipoImport === 'emitidos'),
      recibidos: mes.filter(c => c.tipoImport === 'recibidos'),
    };
  }, [todos, mesActual]);

  const { debitoFiscal, creditoFiscal } = useMemo(
    () => calcPosicionIVA(emitidos, recibidos),
    [emitidos, recibidos]
  );

  const posicion    = saldoAnterior + creditoFiscal - debitoFiscal;
  const aPagar      = posicion < 0;
  const aFavor      = posicion > 0;
  const PosIcon     = aPagar ? TrendingDown : aFavor ? TrendingUp : Minus;
  const posColor    = aPagar ? 'text-rose-400' : aFavor ? 'text-emerald-400' : 'text-slate-400';
  const borderColor = aPagar ? 'border-rose-500/30' : aFavor ? 'border-emerald-500/30' : 'border-white/10';
  const label       = aPagar ? 'A PAGAR este mes' : aFavor ? 'SALDO A FAVOR' : 'SIN SALDO';

  const mesLabel = new Date(mesActual + '-02').toLocaleString('es-AR', { month: 'long', year: 'numeric' });

  return (
    <div className={`glass-panel rounded-2xl border ${borderColor} p-6`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
            Posición IVA — {mesLabel}
          </p>
          {/* Selector de empresa */}
          <div className="flex gap-1 mt-1">
            {EMPRESAS.map(e => (
              <button key={e} onClick={() => setEmpresa(e)}
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full transition-all ${
                  empresa === e
                    ? e === 'BLUE ELEPHANT' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'
                    : 'hover:text-slate-400'
                }`}
                style={empresa !== e ? { color: 'var(--text-dim)' } : {}}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => onNav('iva')}
          className="text-[10px] font-bold hover:text-white uppercase tracking-widest flex items-center gap-1 transition-colors"
          style={{ color: 'var(--text-muted)' }}>
          Ver detalle <ChevronRight size={10} />
        </button>
      </div>

      {loading ? (
        <p className="text-[10px] animate-pulse" style={{ color: 'var(--text-dim)' }}>Calculando...</p>
      ) : (
        <>
          {/* Posición principal */}
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              aPagar ? 'bg-rose-500/10' : aFavor ? 'bg-emerald-500/10' : 'bg-white/5'
            }`}>
              <PosIcon size={22} className={posColor} />
            </div>
            <div>
              <p className={`text-3xl font-black tabular-nums tracking-tighter ${posColor}`}>
                $ {fmt(posicion)}
              </p>
              <p className={`text-[10px] font-black uppercase mt-0.5 ${posColor}`}>{label}</p>
            </div>
          </div>

          {/* Desglose */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-dim)' }}>Débito</p>
              <p className="text-sm font-black tabular-nums text-rose-400">$ {fmt(debitoFiscal)}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-dim)' }}>Crédito</p>
              <p className="text-sm font-black tabular-nums text-emerald-400">$ {fmt(creditoFiscal)}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-dim)' }}>Arrastrado</p>
              <p className={`text-sm font-black tabular-nums ${saldoAnterior > 0 ? 'text-emerald-400' : ''}`}
                 style={saldoAnterior <= 0 ? { color: 'var(--text-muted)' } : {}}>
                {saldoAnterior > 0 ? `$ ${fmt(saldoAnterior)}` : '—'}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Pantalla de inicio del módulo ───────────────────────────────────────────
function HomeContabilidad({ onNav }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <p className="darq-label mb-1">Módulo</p>
        <h1 className="text-3xl font-black text-white tracking-tight">Contabilidad</h1>
        <p className="text-sm mt-2 max-w-lg" style={{ color: 'var(--text-muted)' }}>
          Posición de IVA e Ingresos Brutos, archivo de comprobantes y cruce con ARCA.
        </p>
      </div>

      {/* Widget IVA prominente */}
      <IVAWidget onNav={onNav} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => !tab.comingSoon && onNav(tab.id)}
              disabled={tab.comingSoon}
              className={`text-left glass-panel rounded-2xl border ${tab.border} p-6 transition-all group
                ${tab.comingSoon
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:shadow-xl hover:-translate-y-1 cursor-pointer'}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl ${tab.bg} flex items-center justify-center`}>
                  <Icon size={22} className={tab.color} />
                </div>
                {!tab.comingSoon && (
                  <ChevronRight size={16} className="group-hover:text-white transition-colors mt-1" style={{ color: 'var(--text-dim)' }} />
                )}
                {tab.comingSoon && (
                  <span className="text-[10px] font-black uppercase px-2 py-1 rounded-full"
                        style={{ color: 'var(--text-dim)', background: 'rgba(255,255,255,0.05)' }}>
                    Próximamente
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black text-white">{tab.label}</h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{tab.sub}</p>
            </button>
          );
        })}
      </div>

      {/* Info rápida sobre el módulo */}
      <div className="glass-panel rounded-2xl border border-white/5 p-5">
        <h4 className="darq-label mb-3">Flujo de trabajo</h4>
        <ol className="space-y-3" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          <li className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
            <span><span className="text-white font-bold">Importar ARCA</span> — subí el XLS de comprobantes emitidos y recibidos de cada mes.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
            <span><span className="text-white font-bold">IVA</span> — el sistema calcula automáticamente la posición de IVA del período.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
            <span><span className="text-white font-bold">IIBB</span> — calcula la base imponible y descuenta retenciones para CABA.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
            <span><span className="text-white font-bold">Comprobantes</span> <span style={{ color: 'var(--text-dim)' }}>(próximamente)</span> — indexa los PDFs de Dropbox y cruza con ARCA.</span>
          </li>
        </ol>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Contabilidad() {
  const [activeTab, setActiveTab] = useState('home');

  const currentTab = TABS.find(t => t.id === activeTab);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Breadcrumb / nav superior */}
      {activeTab !== 'home' && (
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          <button onClick={() => setActiveTab('home')} className="hover:text-white transition-colors" style={{ color: 'inherit' }}>
            Contabilidad
          </button>
          <ChevronRight size={12} style={{ color: 'var(--text-dim)' }} />
          <span className="text-white">{currentTab?.label}</span>
        </div>
      )}

      {/* Tab pills (solo cuando no es home) */}
      {activeTab !== 'home' && (
        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl w-fit overflow-x-auto">
          {TABS.filter(t => !t.comingSoon).map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? `glass-panel shadow-sm ${tab.color}`
                    : 'hover:text-slate-200'
                }`}
                style={activeTab !== tab.id ? { color: 'var(--text-muted)' } : {}}>
                <Icon size={12} />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Contenido */}
      {activeTab === 'home'      && <HomeContabilidad onNav={setActiveTab} />}
      {activeTab === 'arca'      && <ImportARCA />}
      {activeTab === 'iva'       && <IVADashboard />}
      {activeTab === 'iibb'      && <IIBBDashboard />}
    </div>
  );
}
