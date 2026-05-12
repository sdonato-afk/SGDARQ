import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { X, CheckCircle, AlertTriangle, RefreshCw, Search } from 'lucide-react';

export default function ReconciliarModal({ isOpen, onClose, context }) {
  const { db, appId, movimientos, propiedades } = context;
  const [importText, setImportText] = useState('');
  const [preview, setPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const propNameToId = {};
  (propiedades || []).forEach(p => {
    propNameToId[(p.nombre || '').toUpperCase().trim()] = p.id;
  });
  const propIdToName = {};
  (propiedades || []).forEach(p => {
    propIdToName[p.id] = (p.nombre || '').toUpperCase().trim();
  });

  const handleAnalyze = () => {
    setIsProcessing(true);
    setTimeout(() => {
      try {
        const lines = importText.trim().split('\n').filter(l => l.trim());
        const rows = lines.map(line => {
          const p = line.split('\t');
          return {
            fecha: (p[0] || '').trim(),
            tipo: (p[1] || '').trim().toLowerCase() === 'ingreso' ? 'Ingreso' : 'Egreso',
            moneda: (p[2] || '').trim(),
            monto: parseFloat((p[3] || '0').trim().replace(/\$/g, '').replace(/\./g, '').replace(',', '.')),
            caja: (p[4] || '').trim(),
            propiedad: (p[5] || '').trim().toUpperCase(),
          };
        }).filter(r => r.fecha && r.propiedad);

        // Match each row to a Firebase movement
        const matched = new Set();
        const fixes = [];
        const noMatch = [];

        for (const row of rows) {
          const correctPropId = propNameToId[row.propiedad];
          if (!correctPropId) continue; // Property not in system

          // Find matching Firebase movement
          const candidates = (movimientos || []).filter(m => {
            if (matched.has(m.id)) return false;
            if (m.fecha !== row.fecha) return false;
            if (m.tipo !== row.tipo) return false;
            const diff = Math.abs((m.monto || 0) - row.monto);
            return diff < 2;
          });

          if (candidates.length === 0) {
            noMatch.push(row);
            continue;
          }

          // Best match by closest monto
          let best = candidates[0];
          for (const c of candidates) {
            if (Math.abs((c.monto || 0) - row.monto) < Math.abs((best.monto || 0) - row.monto)) {
              best = c;
            }
          }
          matched.add(best.id);

          const currentPropName = propIdToName[best.propiedadId] || best.propiedadId;
          if (best.propiedadId !== correctPropId) {
            fixes.push({
              movId: best.id,
              fecha: row.fecha,
              tipo: row.tipo,
              monto: row.monto,
              oldProp: currentPropName,
              newProp: row.propiedad,
              newPropId: correctPropId,
            });
          }
        }

        // Summary
        const summary = {};
        fixes.forEach(f => {
          const key = `${f.oldProp} → ${f.newProp}`;
          summary[key] = (summary[key] || 0) + 1;
        });

        setPreview({ fixes, noMatch, summary, totalRows: rows.length, matchedCount: matched.size });
      } catch (e) {
        alert('Error analizando: ' + e.message);
      }
      setIsProcessing(false);
    }, 200);
  };

  const handleApply = async () => {
    if (!preview || preview.fixes.length === 0) return;
    setIsSaving(true);
    setProgress(0);
    try {
      const total = preview.fixes.length;
      for (let i = 0; i < total; i++) {
        const f = preview.fixes[i];
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'movimientos', f.movId);
        await updateDoc(ref, { propiedadId: f.newPropId });
        setProgress(Math.round(((i + 1) / total) * 100));
      }
      alert(`✅ ${total} movimientos corregidos exitosamente`);
      onClose();
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-white/10 bg-black/20">
          <div>
            <h3 className="text-lg font-black text-white italic">Reconciliar Propiedades</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
              Corregir asignación de propiedadId en movimientos existentes
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 transition-colors rounded-lg hover:bg-white/5"><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4">
          {!preview ? (
            <>
              <p className="text-[10px] text-slate-400 font-bold">
                Pegá los datos de tu planilla (columnas: FECHA, TIPO, MONEDA, MONTO, CAJA, PROPIEDAD, ...). 
                Solo se usan las primeras 6 columnas. El sistema matchea por fecha+tipo+monto y corrige el propiedadId.
              </p>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder="2024-01-02  ingreso  Pesos  107730  CAJA PESOS  VO-4B  ..."
                className="w-full flex-1 min-h-[300px] bg-black/40 border border-white/15 rounded-xl p-4 text-xs font-mono text-white outline-none focus:border-blue-500/50 focus:bg-black/60 resize-none transition-colors"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleAnalyze}
                  disabled={!importText.trim() || isProcessing}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  <Search size={14} />
                  {isProcessing ? 'Analizando...' : 'Analizar y Previsualizar'}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-4 text-center">
                  <span className="text-2xl font-black text-blue-400">{preview.matchedCount}</span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matcheados</p>
                </div>
                <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-xl p-4 text-center">
                  <CheckCircle size={16} className="text-emerald-400 mx-auto mb-1"/>
                  <span className="text-2xl font-black text-emerald-400">{preview.fixes.length}</span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">A Corregir</p>
                </div>
                <div className="bg-amber-900/30 border border-amber-500/30 rounded-xl p-4 text-center">
                  <AlertTriangle size={16} className="text-amber-400 mx-auto mb-1"/>
                  <span className="text-2xl font-black text-amber-400">{preview.noMatch.length}</span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sin Match</p>
                </div>
              </div>

              {/* Migration summary */}
              {Object.keys(preview.summary).length > 0 && (
                <div className="bg-black/20 border border-white/5 rounded-xl p-4">
                  <h4 className="darq-label mb-3">Resumen de Migraciones</h4>
                  {Object.entries(preview.summary).sort((a,b) => b[1]-a[1]).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
                      <span className="text-[10px] font-mono text-slate-300">{k}</span>
                      <span className="text-[10px] font-black text-blue-400">{v} movs</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Fixes detail */}
              <div className="bg-black/20 border border-white/5 rounded-xl overflow-hidden">
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-max">
                    <thead className="bg-[#111827] sticky top-0 border-b border-white/10 z-10">
                      <tr>
                        <th className="px-3 py-2 text-[10px] font-black uppercase text-slate-400">Fecha</th>
                        <th className="px-3 py-2 text-[10px] font-black uppercase text-slate-400">Tipo</th>
                        <th className="px-3 py-2 text-[10px] font-black uppercase text-slate-400 text-right">Monto</th>
                        <th className="px-3 py-2 text-[10px] font-black uppercase text-slate-400">Actual</th>
                        <th className="px-3 py-2 text-[10px] font-black uppercase text-slate-400">→</th>
                        <th className="px-3 py-2 text-[10px] font-black uppercase text-slate-400">Correcto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {preview.fixes.slice(0, 100).map((f, i) => (
                        <tr key={i} className="hover:bg-white/5">
                          <td className="px-3 py-1.5 text-[10px] text-slate-300">{f.fecha}</td>
                          <td className="px-3 py-1.5 text-[10px] text-slate-300">{f.tipo}</td>
                          <td className="px-3 py-1.5 text-[10px] text-slate-300 text-right">${f.monto?.toLocaleString()}</td>
                          <td className="px-3 py-1.5 text-[10px] font-bold text-rose-400">{f.oldProp}</td>
                          <td className="px-3 py-1.5 text-[10px] text-slate-600">→</td>
                          <td className="px-3 py-1.5 text-[10px] font-bold text-emerald-400">{f.newProp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {isSaving && (
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <RefreshCw size={14} className="text-blue-400 animate-spin" />
                    <span className="text-xs font-bold text-blue-400">Aplicando... {progress}%</span>
                  </div>
                  <div className="w-full glass-card rounded-full h-2 mt-2">
                    <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/20 flex justify-between items-center">
          {preview && (
            <button onClick={() => setPreview(null)} disabled={isSaving} className="text-xs font-bold text-slate-400 hover:text-white">
              ← Volver
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-lg">
              Cancelar
            </button>
            {preview && preview.fixes.length > 0 && (
              <button
                onClick={handleApply}
                disabled={isSaving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-lg shadow-lg"
              >
                {isSaving ? `Aplicando ${progress}%...` : `Aplicar ${preview.fixes.length} Correcciones`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
