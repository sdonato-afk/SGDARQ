import React, { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Zap } from 'lucide-react';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import {
  categoriasFinancieras,
  egresosGlobalList, conceptosGlobalList,
  ingresosObrasList,
  egresosOficinaList, conceptosOficinaList,
  rubrosDirectorio, conceptosDirectorio,
} from '../../config/taxonomiaEstatica';

// ── Build flat taxonomy lookup ───────────────────────────────────────
function buildTaxonomy() {
  const T = {};

  // Helper: register area/tipo → { cat: { rubro: [conceptos] } }
  const reg = (area, tipo, catMap, rubroMap, concMap) => {
    if (!T[area]) T[area] = {};
    T[area][tipo] = {};
    const cats = Object.keys(catMap || {});
    for (const cat of cats) {
      const rubros = rubroMap?.[cat] || catMap[cat] || {};
      if (Array.isArray(rubros)) {
        // rubros is a list of rubro names
        T[area][tipo][cat] = {};
        for (const r of rubros) {
          T[area][tipo][cat][r] = concMap?.[cat]?.[r] || [];
        }
      } else {
        // rubros is an object { rubro: [conceptos] }
        T[area][tipo][cat] = rubros;
      }
    }
  };

  // Obras Ingreso
  T.Obras = { Ingreso: {} };
  for (const [cat, rubros] of Object.entries(ingresosObrasList)) {
    T.Obras.Ingreso[cat] = {};
    for (const r of rubros) T.Obras.Ingreso[cat][r] = [];
  }

  // Obras Egreso
  T.Obras.Egreso = {};
  for (const [cat, rubros] of Object.entries(egresosGlobalList)) {
    T.Obras.Egreso[cat] = {};
    for (const r of rubros) {
      T.Obras.Egreso[cat][r] = conceptosGlobalList?.[cat]?.[r] || [];
    }
  }

  // Alquileres Ingreso
  T.Alquileres = { Ingreso: {}, Egreso: { ...T.Obras.Egreso } };
  const alqIng = categoriasFinancieras.Alquileres?.Ingreso || [];
  for (const cat of alqIng) T.Alquileres.Ingreso[cat] = { '-': [] };

  // Oficina
  T.Oficina = { Ingreso: {}, Egreso: {} };
  const ofIng = categoriasFinancieras.Oficina?.Ingreso || [];
  for (const cat of ofIng) {
    const rubros = cat === 'INGRESOS' ? { 'VENTA IVA': [], 'INGRESOS VARIOS': [] } : { '-': [] };
    T.Oficina.Ingreso[cat] = rubros;
  }
  for (const [cat, rubros] of Object.entries(egresosOficinaList)) {
    T.Oficina.Egreso[cat] = {};
    for (const r of rubros) {
      T.Oficina.Egreso[cat][r] = conceptosOficinaList?.[cat]?.[r] || [];
    }
  }

  // Directorio
  T.Directorio = { Ingreso: {}, Egreso: {} };
  const dirIng = categoriasFinancieras.Directorio?.Ingreso || [];
  for (const cat of dirIng) T.Directorio.Ingreso[cat] = { '-': [] };
  const dirEg = categoriasFinancieras.Directorio?.Egreso || [];
  for (const cat of dirEg) {
    T.Directorio.Egreso[cat] = {};
    const rubs = rubrosDirectorio[cat] || ['-'];
    for (const r of rubs) {
      T.Directorio.Egreso[cat][r] = conceptosDirectorio?.[r] || [];
    }
  }

  // Sistema
  T.Sistema = {
    Ingreso: { 'Apertura de Caja': {}, 'Ajuste de Saldo': {}, 'Corrección': {} },
    Egreso:  { 'Apertura de Caja': {}, 'Ajuste de Saldo': {}, 'Correción': {} },
  };

  // Tesoreria
  T.Tesoreria = { Ingreso: {}, Egreso: {} };

  return T;
}

// ── Fuzzy key finder (case + plural + near-match) ────────────────────
function normalize(s) { return s.toLowerCase().trim().replace(/\s+/g, ' '); }

function findKeyCI(obj, key) {
  if (!obj || !key) return null;
  if (obj[key]) return key; // exact match
  const keys = Object.keys(obj);
  const kn = normalize(key);
  // 1. Case-insensitive exact
  const ci = keys.find(k => normalize(k) === kn);
  if (ci) return ci;
  // 2. Plural/singular: "retiro" ↔ "retiros", "material" ↔ "materiales"
  const withS = kn.endsWith('s') ? kn.slice(0, -1) : kn + 's';
  const withEs = kn.endsWith('es') ? kn.slice(0, -2) : kn + 'es';
  const plural = keys.find(k => {
    const n = normalize(k);
    return n === withS || n === withEs;
  });
  if (plural) return plural;
  // 3. One contains the other (for abbreviations / typos)
  const inc = keys.find(k => {
    const n = normalize(k);
    return (n.length > 3 && kn.length > 3) && (n.includes(kn) || kn.includes(n));
  });
  if (inc) return inc;
  return null;
}

// ── Audit logic ──────────────────────────────────────────────────────
function auditMovimientos(movimientos, TAX) {
  const issues = [];
  const caseFixes = []; // { id, campo, valorActual, valorCorrecto }

  for (const m of movimientos) {
    const area = m.area || '';
    const tipo = m.tipo || '';
    const cat  = m.categoriaEgreso || '';
    const rub  = m.rubro || '';

    // Skip Tesoreria — no tiene categorías
    if (area === 'Tesoreria') continue;

    // Sin categoría
    if (!cat) {
      issues.push({ id: m.id, m, campo: 'categoriaEgreso', valor: '(vacío)',
        opciones: Object.keys(TAX[area]?.[tipo] || {}) });
      continue;
    }

    // Área desconocida
    if (!TAX[area]) {
      issues.push({ id: m.id, m, campo: 'area', valor: area, opciones: Object.keys(TAX) });
      continue;
    }

    const taxArea = TAX[area]?.[tipo];
    if (!taxArea) continue;

    // Categoría — buscar case-insensitive
    const catMatch = findKeyCI(taxArea, cat);
    if (!catMatch) {
      issues.push({ id: m.id, m, campo: 'categoriaEgreso', valor: cat,
        opciones: Object.keys(taxArea) });
      continue;
    }
    // Auto-fix case mismatch
    if (catMatch !== cat) {
      caseFixes.push({ id: m.id, campo: 'categoriaEgreso', valorActual: cat, valorCorrecto: catMatch });
    }

    // Rubro — buscar case-insensitive
    if (rub && typeof taxArea[catMatch] === 'object' && Object.keys(taxArea[catMatch]).length > 0) {
      const rubMatch = findKeyCI(taxArea[catMatch], rub);
      if (!rubMatch) {
        issues.push({ id: m.id, m, campo: 'rubro', valor: rub,
          opciones: Object.keys(taxArea[catMatch]) });
        continue;
      }
      if (rubMatch !== rub) {
        caseFixes.push({ id: m.id, campo: 'rubro', valorActual: rub, valorCorrecto: rubMatch });
      }
    }
  }

  return { issues, caseFixes };
}

// ── Component ────────────────────────────────────────────────────────
export default function AsientosNormalizacion({ movimientos }) {
  const TAX = useMemo(() => buildTaxonomy(), []);
  const audit = useMemo(() => auditMovimientos(movimientos, TAX), [movimientos, TAX]);
  const { issues, caseFixes } = audit;

  // Group by campo + valor
  const groups = useMemo(() => {
    const map = {};
    for (const iss of issues) {
      const key = `${iss.campo}::${iss.valor}`;
      if (!map[key]) map[key] = { campo: iss.campo, valor: iss.valor, opciones: iss.opciones, items: [] };
      map[key].items.push(iss);
    }
    return Object.values(map).sort((a, b) => b.items.length - a.items.length);
  }, [issues]);

  const [corrections, setCorrections] = useState({});
  const [applying, setApplying] = useState(null);
  const [applied, setApplied] = useState({});
  const [collapsed, setCollapsed] = useState({});
  const [caseFixed, setCaseFixed] = useState(false);
  const [caseFixing, setCaseFixing] = useState(false);

  const setCor = (key, val) => setCorrections(c => ({ ...c, [key]: val }));
  const toggle = (key) => setCollapsed(c => ({ ...c, [key]: !c[key] }));

  // Auto-fix all case mismatches
  const fixAllCase = async () => {
    if (caseFixes.length === 0) return;
    setCaseFixing(true);
    try {
      for (let i = 0; i < caseFixes.length; i += 450) {
        const batch = writeBatch(db);
        const chunk = caseFixes.slice(i, i + 450);
        for (const fix of chunk) {
          const ref = doc(db, 'artifacts', appId, 'public', 'data', 'movimientos', fix.id);
          batch.update(ref, { [fix.campo]: fix.valorCorrecto });
        }
        await batch.commit();
      }
      setCaseFixed(true);
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setCaseFixing(false);
  };

  const applyCorrection = async (group) => {
    const key = `${group.campo}::${group.valor}`;
    const newValue = corrections[key];
    if (!newValue) return;

    setApplying(key);
    try {
      const ids = group.items.map(i => i.id);
      const batches = [];
      for (let i = 0; i < ids.length; i += 450) {
        const batch = writeBatch(db);
        const chunk = ids.slice(i, i + 450);
        for (const id of chunk) {
          const ref = doc(db, 'artifacts', appId, 'public', 'data', 'movimientos', id);
          batch.update(ref, { [group.campo]: newValue });
        }
        batches.push(batch);
      }
      for (const b of batches) await b.commit();
      setApplied(a => ({ ...a, [key]: ids.length }));
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setApplying(null);
  };

  const fmt = (n) => n ? Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 }) : '-';

  const pendingGroups = groups.filter(g => !applied[`${g.campo}::${g.valor}`]);
  const doneGroups = groups.filter(g => applied[`${g.campo}::${g.valor}`]);

  if (issues.length === 0 && caseFixes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <CheckCircle2 size={48} className="text-emerald-500" />
        <h2 className="text-lg font-black text-white">Todos los asientos están normalizados</h2>
        <p className="text-slate-500 text-xs">No hay conflictos con la taxonomía vigente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" />
            Normalización Taxonómica
          </h2>
          <p className="text-[10px] text-slate-500 mt-1">
            {pendingGroups.length} grupo{pendingGroups.length !== 1 ? 's' : ''} con conflicto · {issues.length} asientos afectados
            {caseFixes.length > 0 && !caseFixed && ` · ${caseFixes.length} con error de mayúsculas`}
          </p>
        </div>
      </div>

      {/* Auto-fix case banner */}
      {caseFixes.length > 0 && !caseFixed && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-blue-400">
              {caseFixes.length} asientos con error de mayúsculas/minúsculas
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Ej: "retiros" → "Retiros", "materiales" → "Materiales". Son correcciones automáticas seguras.
            </p>
          </div>
          <button
            onClick={fixAllCase}
            disabled={caseFixing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-all"
          >
            <Zap size={14} />
            {caseFixing ? 'Corrigiendo...' : `Auto-corregir ${caseFixes.length}`}
          </button>
        </div>
      )}
      {caseFixed && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2 text-emerald-400 text-xs font-bold">
          <CheckCircle2 size={14} />
          {caseFixes.length} asientos corregidos automáticamente (mayúsculas). Recargá para ver el resultado.
        </div>
      )}

      {/* Pending groups */}
      {pendingGroups.map(group => {
        const key = `${group.campo}::${group.valor}`;
        const isExp = !collapsed[key]; // expanded by default
        const isApplying = applying === key;
        const corValue = corrections[key] || '';

        return (
          <div key={key} className="bg-[#1a2235] rounded-xl border border-white/10 overflow-hidden">
            {/* Group header */}
            <div className="p-3 flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <span className="text-amber-400 font-black text-xs">{group.items.length}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                  {group.campo === 'categoriaEgreso' ? 'Categoría' : group.campo === 'rubro' ? 'Rubro' : group.campo}
                </div>
                <div className="text-xs font-bold text-amber-300 truncate">
                  "{group.valor}" <span className="text-slate-500 font-normal">no existe en la taxonomía</span>
                </div>
              </div>

              {/* Correction select */}
              <select
                value={corValue}
                onChange={e => setCor(key, e.target.value)}
                className="bg-[#0d1220] border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-bold text-white outline-none focus:border-blue-500/40 max-w-[200px]"
              >
                <option value="">Corregir a...</option>
                {group.opciones.map(o => <option key={o} value={o}>{o}</option>)}
              </select>

              {/* Apply button */}
              <button
                onClick={() => applyCorrection(group)}
                disabled={!corValue || isApplying}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                  corValue
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 cursor-pointer'
                    : 'bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed'
                }`}
              >
                <Zap size={10} />
                {isApplying ? 'Aplicando...' : `Corregir ${group.items.length}`}
              </button>

              {/* Expand/collapse */}
              <button onClick={() => toggle(key)} className="p-1 text-slate-500 hover:text-white transition-colors">
                <ChevronDown size={14} className={`transition-transform ${isExp ? 'rotate-180' : ''}`} title="Expandir/Colapsar" />
              </button>
            </div>

            {/* Expanded: show sample items */}
            {isExp && (
              <div className="border-t border-white/5 max-h-72 overflow-auto">
                <table className="w-full text-[9px]">
                  <thead className="bg-black/20 text-slate-500 uppercase font-black sticky top-0">
                    <tr>
                      <th className="p-1.5 text-left">Fecha</th>
                      <th className="p-1.5 text-left">Área</th>
                      <th className="p-1.5 text-left">Tipo</th>
                      <th className="p-1.5 text-left">Mon</th>
                      <th className="p-1.5 text-right">Monto</th>
                      <th className="p-1.5 text-left">Caja</th>
                      <th className="p-1.5 text-left">Categoría</th>
                      <th className="p-1.5 text-left">Rubro</th>
                      <th className="p-1.5 text-left">Concepto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {group.items.slice(0, 50).map(iss => (
                      <tr key={iss.id} className="text-slate-300 hover:bg-white/5">
                        <td className="p-1.5 whitespace-nowrap">{iss.m.fecha || '-'}</td>
                        <td className="p-1.5">{iss.m.area || '-'}</td>
                        <td className={`p-1.5 font-bold ${iss.m.tipo === 'Ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>{iss.m.tipo}</td>
                        <td className="p-1.5">{iss.m.moneda || '-'}</td>
                        <td className="p-1.5 text-right font-bold font-mono whitespace-nowrap">{fmt(iss.m.monto)}</td>
                        <td className="p-1.5 text-slate-400">{iss.m.caja || '-'}</td>
                        <td className="p-1.5 text-amber-300">{iss.m.categoriaEgreso || '-'}</td>
                        <td className="p-1.5">{iss.m.rubro || '-'}</td>
                        <td className="p-1.5 text-slate-400">{iss.m.subRubro || iss.m.concepto || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {group.items.length > 50 && (
                  <div className="text-center text-[9px] text-slate-600 py-1">
                    ...y {group.items.length - 50} más
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Done groups */}
      {doneGroups.length > 0 && (
        <div className="mt-6">
          <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mb-2">
            ✓ Corregidos en esta sesión
          </div>
          {doneGroups.map(group => {
            const key = `${group.campo}::${group.valor}`;
            return (
              <div key={key} className="flex items-center gap-2 py-1 text-[10px] text-slate-500">
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span>"{group.valor}" → "{corrections[key]}" ({applied[key]} asientos)</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
