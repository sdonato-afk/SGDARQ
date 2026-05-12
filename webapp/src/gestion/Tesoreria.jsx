import React, { useState, useMemo } from 'react';
import { deleteDoc, doc, addDoc, collection } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import {
  Wallet, Banknote, CreditCard, DollarSign, Search, Trash2,
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { ColumnFilter, SearchableSelect } from '@darq/ui';
import { useTableFilter } from '../hooks/useTableFilter';

const TES_PAGE_SIZE = 50;

// ─── Configuración estática ─────────────────────────────────────────────────
const CAJAS = [
  { id: 'Caja Dólares',  moneda: 'USD', icon: DollarSign,  gradient: 'from-amber-500 to-yellow-600',   border: 'border-amber-500/20',  label: 'Caja u$d' },
  { id: 'Caja Pesos',    moneda: 'ARS', icon: Banknote,    gradient: 'from-emerald-500 to-green-600',  border: 'border-emerald-500/20', label: 'Caja $'   },
  { id: 'Banco Amecon',  moneda: 'ARS', icon: CreditCard,  gradient: 'from-blue-500 to-indigo-600',    border: 'border-blue-500/20',   label: 'Bco. Amecon' },
  { id: 'Banco Blue',    moneda: 'ARS', icon: CreditCard,  gradient: 'from-slate-400 to-slate-600',    border: 'border-slate-500/20',  label: 'Bco. Blue'   },
  { id: 'MP Amecon',     moneda: 'ARS', icon: CreditCard,  gradient: 'from-violet-500 to-purple-600',  border: 'border-violet-500/20', label: 'MP Amecon'   },
  { id: 'MP Blue',       moneda: 'ARS', icon: CreditCard,  gradient: 'from-rose-500 to-pink-600',      border: 'border-rose-500/20',   label: 'MP Blue'     },
];

const AREA_CONFIG = {
  Obras:      { gradient: 'from-orange-500 to-amber-600',  border: 'border-orange-500/20',  text: 'text-orange-400',  bg: 'bg-orange-500/10'  },
  Alquileres: { gradient: 'from-blue-500 to-indigo-600',   border: 'border-blue-500/20',    text: 'text-blue-400',    bg: 'bg-blue-500/10'    },
  Oficina:    { gradient: 'from-emerald-500 to-teal-600',  border: 'border-emerald-500/20', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  Directorio: { gradient: 'from-violet-500 to-purple-600', border: 'border-violet-500/20',  text: 'text-violet-400',  bg: 'bg-violet-500/10'  },
  Tesoreria:  { gradient: 'from-slate-500 to-slate-600',   border: 'border-slate-500/20',   text: 'text-slate-400',   bg: 'bg-slate-500/10'   },
};

const AREAS = ['Obras', 'Alquileres', 'Oficina', 'Directorio', 'Tesoreria'];

// ─── Helper ─────────────────────────────────────────────────────────────────
function labelMes(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('es-AR', { month: 'long', year: 'numeric' });
}

function navigateMes(ym, dir) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + dir, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Tesoreria({ movimientos, obras, propiedades, proveedores, cotizacionBlue, userRole }) {
  const now = new Date();
  const [mesFluj, setMesFluj] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [filtroArea, setFiltroArea]   = useState('Todas');
  const [filtroTipo, setFiltroTipo]   = useState('Todos');
  const [filtroCaja, setFiltroCaja]   = useState('Todas');
  const [filtroSearch, setFiltroSearch] = useState('');
  const [tesPage, setTesPage]         = useState(0);

  const { filters, sort, setFilter, setSort, filterRows, sortRows } = useTableFilter();

  const resetPage = () => setTesPage(0);

  // ── Saldo acumulado por caja ────────────────────────────────────────────
  const saldosCaja = useMemo(() => {
    const s = {};
    CAJAS.forEach(c => { s[c.id] = { ing: 0, egr: 0 }; });
    movimientos.forEach(m => {
      if (!s[m.caja]) s[m.caja] = { ing: 0, egr: 0 };
      const v = Number(m.monto) || 0;
      if (m.tipo === 'Ingreso') s[m.caja].ing += v;
      else                      s[m.caja].egr += v;
    });
    return s;
  }, [movimientos]);

  // ── Flujo del mes seleccionado por área ────────────────────────────────
  const flujoMes = useMemo(() => {
    const tc = cotizacionBlue || 1;
    const result = {};
    AREAS.forEach(a => { result[a] = { ing: 0, egr: 0, ingUSD: 0, egrUSD: 0 }; });
    movimientos
      .filter(m => m.fecha && m.fecha.startsWith(mesFluj))
      .forEach(m => {
        const r = result[m.area];
        if (!r) return;
        const v = Number(m.monto) || 0;
        const vUSD = m.moneda === 'USD' ? v : v / (m.cotizacionHistorica || m.tipoCambioReferencia || tc);
        if (m.tipo === 'Ingreso') { r.ing += v; r.ingUSD += vUSD; }
        else                      { r.egr += v; r.egrUSD += vUSD; }
      });
    return result;
  }, [movimientos, mesFluj, cotizacionBlue]);

  // ── Total del mes ───────────────────────────────────────────────────────
  const totalMes = useMemo(() => {
    let ingARS = 0, egrARS = 0, ingUSD = 0, egrUSD = 0;
    AREAS.forEach(a => {
      ingARS += flujoMes[a].ing; egrARS += flujoMes[a].egr;
      ingUSD += flujoMes[a].ingUSD; egrUSD += flujoMes[a].egrUSD;
    });
    return { ingARS, egrARS, ingUSD, egrUSD };
  }, [flujoMes]);

  // ── Movimientos filtrados ───────────────────────────────────────────────
  const movsFiltrados = useMemo(() => {
    let base = movimientos
      .filter(m => {
        if (filtroArea !== 'Todas' && m.area !== filtroArea) return false;
        if (filtroTipo !== 'Todos' && m.tipo !== filtroTipo) return false;
        if (filtroCaja !== 'Todas' && m.caja !== filtroCaja) return false;
        if (filtroSearch) {
          const q = filtroSearch.toLowerCase();
          const candidates = [
            m.concepto, m.rubro, m.fecha,
            obras.find(o => o.id === m.obraId)?.nombre,
            propiedades.find(p => p.id === m.propiedadId)?.nombre,
            proveedores.find(pv => pv.id === m.proveedorId)?.nombre,
          ];
          if (!candidates.some(v => v?.toLowerCase().includes(q))) return false;
        }
        return true;
      });

    const valueGetters = {
      fecha: m => m.fecha || '',
      area: m => m.area || '',
      caja: m => m.caja || '—',
      concepto: m => {
        const obraNombre = m.obraId ? obras.find(o  => o.id  === m.obraId)?.nombre : null;
        const propNombre = m.propiedadId ? propiedades.find(p => p.id === m.propiedadId)?.nombre : null;
        const provNombre = m.proveedorId ? proveedores.find(pv => pv.id === m.proveedorId)?.nombre : null;
        return [m.concepto, m.rubro, obraNombre, propNombre, provNombre].filter(Boolean).join(' ');
      }
    };

    base = filterRows(base, valueGetters);
    return sortRows(base, valueGetters, (a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  }, [movimientos, filtroArea, filtroTipo, filtroCaja, filtroSearch, obras, propiedades, proveedores, filters, sort]);

  const totalTesPaginas = Math.ceil(movsFiltrados.length / TES_PAGE_SIZE);
  const movsPaginados   = movsFiltrados.slice(tesPage * TES_PAGE_SIZE, (tesPage + 1) * TES_PAGE_SIZE);

  const handleDelete = async (m) => {
    if (userRole === 'superadmin') {
      if (window.confirm('¿Eliminar movimiento?')) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'movimientos', m.id));
      }
    } else {
      if (window.confirm('Se enviará una solicitud de borrado al administrador. ¿Continuar?')) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'solicitudes'), {
          tipo: 'borrar',
          movimientoId: m.id,
          movimientoSnapshot: { fecha: m.fecha, area: m.area, tipo: m.tipo, moneda: m.moneda, monto: m.monto, concepto: m.concepto || '' },
          solicitanteRol: userRole, estado: 'pendiente', createdAt: new Date().toISOString(),
        });
        alert('✅ Solicitud de borrado enviada.');
      }
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ══ SECCIÓN 1: ESTADO DE CAJAS ══════════════════════════════════ */}
      <section>
        <h3 className="darq-label mb-5 flex items-center gap-2">
          <Wallet size={12} /> Estado de Cajas — saldo acumulado
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {CAJAS.map(caja => {
            const s = saldosCaja[caja.id] || { ing: 0, egr: 0 };
            const saldo = s.ing - s.egr;
            const Icon = caja.icon;
            return (
              <div key={caja.id} className={`glass-panel rounded-2xl border ${caja.border} overflow-hidden`}>
                <div className={`h-1 w-full bg-gradient-to-r ${caja.gradient}`} />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{caja.label}</p>
                    <Icon size={12} className="text-slate-600" />
                  </div>
                  <p className={`text-lg font-black tracking-tighter tabular-nums ${saldo >= 0 ? 'text-white' : 'text-rose-400'}`}>
                    {caja.moneda === 'USD' ? 'u$d' : '$'} {Math.abs(Math.round(saldo)).toLocaleString('es-AR')}
                  </p>
                  <div className="mt-3 pt-2 border-t border-white/5 flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <ArrowUpRight size={9} />
                      <span className="tabular-nums">{Math.round(s.ing).toLocaleString('es-AR')}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-rose-400">
                      <ArrowDownRight size={9} />
                      <span className="tabular-nums">{Math.round(s.egr).toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ SECCIÓN 2: FLUJO DEL MES ════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h3 className="darq-label flex items-center gap-2">
            <TrendingUp size={12} /> Flujo por Área
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setMesFluj(v => navigateMes(v, -1))}
              className="p-1.5 rounded-lg bg-white/5 text-slate-500 hover:text-white transition-all">
              <ChevronLeft size={14} />
            </button>
            <span className="text-[10px] font-black text-white uppercase tracking-widest min-w-[140px] text-center capitalize">
              {labelMes(mesFluj)}
            </span>
            <button onClick={() => setMesFluj(v => navigateMes(v, 1))}
              className="p-1.5 rounded-lg bg-white/5 text-slate-500 hover:text-white transition-all">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Cards por área */}
          {AREAS.map(area => {
            const f = flujoMes[area];
            const cfg = AREA_CONFIG[area];
            const bal = f.ing - f.egr;
            const balUSD = f.ingUSD - f.egrUSD;
            return (
              <div key={area} className={`glass-panel rounded-2xl border ${cfg.border} overflow-hidden`}>
                <div className={`h-1 w-full bg-gradient-to-r ${cfg.gradient}`} />
                <div className="p-5">
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${cfg.text}`}>{area}</p>
                  <p className={`text-xl font-black tracking-tighter tabular-nums ${bal >= 0 ? 'text-white' : 'text-rose-400'}`}>
                    {bal >= 0 ? '+' : '−'} $ {Math.abs(Math.round(bal)).toLocaleString('es-AR')}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 tabular-nums mt-0.5">
                    {balUSD >= 0 ? '+' : '−'} u$d {Math.abs(Math.round(balUSD)).toLocaleString('es-AR')}
                  </p>
                  <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-1 text-[10px]">
                    <div>
                      <span className="text-slate-600 block">Ing</span>
                      <span className="text-emerald-400 font-black tabular-nums">{Math.round(f.ing).toLocaleString('es-AR')}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 block">Egr</span>
                      <span className="text-rose-400 font-black tabular-nums">{Math.round(f.egr).toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Card Total */}
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-slate-500 to-slate-400" />
            <div className="p-5">
              <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-slate-400">Total Empresa</p>
              <p className={`text-xl font-black tracking-tighter tabular-nums ${(totalMes.ingARS - totalMes.egrARS) >= 0 ? 'text-white' : 'text-rose-400'}`}>
                {(totalMes.ingARS - totalMes.egrARS) >= 0 ? '+' : '−'} $ {Math.abs(Math.round(totalMes.ingARS - totalMes.egrARS)).toLocaleString('es-AR')}
              </p>
              <p className="text-[10px] font-bold text-slate-500 tabular-nums mt-0.5">
                {(totalMes.ingUSD - totalMes.egrUSD) >= 0 ? '+' : '−'} u$d {Math.abs(Math.round(totalMes.ingUSD - totalMes.egrUSD)).toLocaleString('es-AR')}
              </p>
              <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-1 text-[10px]">
                <div>
                  <span className="text-slate-600 block">Ing</span>
                  <span className="text-emerald-400 font-black tabular-nums">{Math.round(totalMes.ingARS).toLocaleString('es-AR')}</span>
                </div>
                <div>
                  <span className="text-slate-600 block">Egr</span>
                  <span className="text-rose-400 font-black tabular-nums">{Math.round(totalMes.egrARS).toLocaleString('es-AR')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ SECCIÓN 3: TABLA DE MOVIMIENTOS ════════════════════════════ */}
      <section>
        {/* Barra de filtros */}
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <h3 className="darq-label mr-2 flex items-center gap-2">
            <TrendingDown size={12} /> Movimientos
          </h3>

          <div className="relative">
            <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={filtroSearch} onChange={e => { setFiltroSearch(e.target.value); resetPage(); }}
              placeholder="Buscar..."
              className="pl-8 pr-4 py-2 text-[10px] font-bold bg-white/5 border border-white/10 rounded-xl outline-none text-white placeholder:text-slate-600 w-44"
            />
          </div>

          <SearchableSelect value={filtroArea} onChange={e => { setFiltroArea(e.target.value); resetPage(); }}
            className="text-[10px] font-black bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-slate-400 outline-none cursor-pointer">
            <option value="Todas">Todas las áreas</option>
            {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </SearchableSelect>

          <SearchableSelect value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); resetPage(); }}
            className="text-[10px] font-black bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-slate-400 outline-none cursor-pointer">
            <option value="Todos">Ing + Egr</option>
            <option value="Ingreso">Solo Ingresos</option>
            <option value="Egreso">Solo Egresos</option>
          </SearchableSelect>

          <SearchableSelect value={filtroCaja} onChange={e => { setFiltroCaja(e.target.value); resetPage(); }}
            className="text-[10px] font-black bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-slate-400 outline-none cursor-pointer">
            <option value="Todas">Todas las cajas</option>
            {CAJAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </SearchableSelect>

          <span className="ml-auto text-[10px] text-slate-600 font-bold tabular-nums">
            {tesPage * TES_PAGE_SIZE + 1}–{Math.min((tesPage + 1) * TES_PAGE_SIZE, movsFiltrados.length)} de {movsFiltrados.length}
          </span>
        </div>

        {/* Tabla */}
        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto max-h-[560px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0d1724] z-10">
                <tr className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
                  <th className="p-0 whitespace-nowrap"><ColumnFilter label="Fecha" colKey="fecha" rows={movimientos} valueGetter={m => m.fecha || ''} filterState={filters.fecha} onFilterChange={setFilter} sortDir={sort.key === 'fecha' ? sort.dir : null} onSortChange={setSort} /></th>
                  <th className="p-0"><ColumnFilter label="Área" colKey="area" rows={movimientos} valueGetter={m => m.area || ''} filterState={filters.area} onFilterChange={setFilter} sortDir={sort.key === 'area' ? sort.dir : null} onSortChange={setSort} /></th>
                  <th className="p-0"><ColumnFilter label="Caja" colKey="caja" rows={movimientos} valueGetter={m => m.caja || '—'} filterState={filters.caja} onFilterChange={setFilter} sortDir={sort.key === 'caja' ? sort.dir : null} onSortChange={setSort} /></th>
                  <th className="p-0"><ColumnFilter label="Concepto / Referencia" colKey="concepto" rows={movimientos} valueGetter={m => {
                    const obraNombre = m.obraId ? obras.find(o  => o.id  === m.obraId)?.nombre : null;
                    const propNombre = m.propiedadId ? propiedades.find(p => p.id === m.propiedadId)?.nombre : null;
                    const provNombre = m.proveedorId ? proveedores.find(pv => pv.id === m.proveedorId)?.nombre : null;
                    return [m.concepto, m.rubro, obraNombre, propNombre, provNombre].filter(Boolean).join(' ');
                  }} filterState={filters.concepto} onFilterChange={setFilter} sortDir={sort.key === 'concepto' ? sort.dir : null} onSortChange={setSort} /></th>
                  <th className="px-5 py-3 text-right whitespace-nowrap">Monto</th>
                  <th className="px-5 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {movsPaginados.map(m => {
                  const cfg = AREA_CONFIG[m.area] || { text: 'text-slate-400', bg: 'bg-white/5' };
                  const obraNombre = m.obraId     ? obras.find(o  => o.id  === m.obraId)?.nombre     : null;
                  const propNombre = m.propiedadId ? propiedades.find(p => p.id === m.propiedadId)?.nombre : null;
                  const provNombre = m.proveedorId ? proveedores.find(pv => pv.id === m.proveedorId)?.nombre : null;
                  return (
                    <tr key={m.id} className="border-t border-white/[0.04] hover:bg-white/[0.03] transition-colors group">
                      <td className="px-5 py-3 text-[10px] font-bold text-slate-500 tabular-nums whitespace-nowrap">{m.fecha}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${cfg.text} ${cfg.bg}`}>
                          {m.area}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[10px] font-bold text-slate-600 whitespace-nowrap">{m.caja || '—'}</td>
                      <td className="px-5 py-3 max-w-xs">
                        <p className="text-[10px] font-bold text-white truncate">{m.concepto || m.rubro || '—'}</p>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {obraNombre && <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 rounded-full">{obraNombre}</span>}
                          {propNombre && <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 rounded-full">{propNombre}</span>}
                          {provNombre && <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 rounded-full">{provNombre}</span>}
                        </div>
                      </td>
                      <td className={`px-5 py-3 text-right font-black text-sm tabular-nums whitespace-nowrap ${m.tipo === 'Ingreso' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {m.tipo === 'Ingreso' ? '+' : '−'} {m.moneda === 'USD' ? 'u$d' : '$'} {Number(m.monto || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleDelete(m)}
                          className={`opacity-0 group-hover:opacity-100 p-1.5 transition-all rounded-lg ${userRole === 'superadmin' ? 'text-slate-600 hover:text-rose-400 hover:bg-rose-500/10' : 'text-amber-600 hover:text-amber-400 hover:bg-amber-500/10'}`}
                          title={userRole === 'superadmin' ? 'Eliminar movimiento' : 'Solicitar borrado'}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {movsFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-[10px] font-black text-slate-600 uppercase tracking-widest">
                      Sin movimientos para los filtros seleccionados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginación */}
        {totalTesPaginas > 1 && (
          <div className="flex items-center justify-between px-4 py-3 mt-3 bg-white/5 border border-white/10 rounded-xl">
            <span className="darq-label">
              Página {tesPage + 1} de {totalTesPaginas}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setTesPage(0)} disabled={tesPage === 0}
                className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-white/5 transition-colors">⟨⟨</button>
              <button onClick={() => setTesPage(p => Math.max(0, p - 1))} disabled={tesPage === 0}
                className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-white/5 transition-colors">⟨ Anterior</button>
              <span className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black">{tesPage + 1} / {totalTesPaginas}</span>
              <button onClick={() => setTesPage(p => Math.min(totalTesPaginas - 1, p + 1))} disabled={tesPage >= totalTesPaginas - 1}
                className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-white/5 transition-colors">Siguiente ⟩</button>
              <button onClick={() => setTesPage(totalTesPaginas - 1)} disabled={tesPage >= totalTesPaginas - 1}
                className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-white/5 transition-colors">⟩⟩</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
