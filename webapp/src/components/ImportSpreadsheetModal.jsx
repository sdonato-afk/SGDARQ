import React from 'react';
import { X } from 'lucide-react';

/**
 * Modal genérico de importación de spreadsheet.
 * Reemplaza los 4 modales inline copy/paste que vivían en App.jsx.
 *
 * @param {{ open, area, accentClass, accentColor, columns, importText, onChangeText, onImport, onClose, isImporting, importProgress }} props
 */
const THEME = {
  Obras:       { bg: 'bg-orange-700/80', accent: 'text-orange-300', hint: 'text-orange-200/70', btn: 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/30', focus: 'focus:border-orange-500/60' },
  Oficina:     { bg: 'bg-emerald-800/80', accent: 'text-emerald-300', hint: 'text-emerald-200/70', btn: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30', focus: 'focus:border-emerald-500/60' },
  Directorio:  { bg: 'bg-violet-800/80', accent: 'text-violet-300', hint: 'text-violet-200/70', btn: 'bg-violet-600 hover:bg-violet-500 shadow-violet-900/30', focus: 'focus:border-violet-500/60' },
  Alquileres:  { bg: 'bg-blue-800/80', accent: 'text-blue-300', hint: 'text-blue-200/70', btn: 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30', focus: 'focus:border-blue-500/60' },
};

const COLUMNS = {
  Obras:       'FECHA · TIPO · MONEDA · MONTO · CAJA · OBRA · CATEGORIA · RUBRO · CONCEPTO · TC',
  Oficina:     'FECHA · TIPO · MONEDA · MONTO · CAJA · CATEGORIA · RUBRO · CONCEPTO · TC',
  Directorio:  'FECHA · TIPO · MONEDA · MONTO · CAJA · CATEGORIA · RUBRO · CONCEPTO · DIRECTOR · TC',
  Alquileres:  'FECHA · TIPO · MONEDA · MONTO · CAJA · PROPIEDAD · CATEGORIA · RUBRO · CONCEPTO · TC',
};

export default function ImportSpreadsheetModal({
  open, area, importText, onChangeText, onImport, onClose,
  isImporting, importProgress
}) {
  if (!open) return null;
  const t = THEME[area] || THEME.Obras;
  const cols = COLUMNS[area] || '';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] rounded-2xl w-full max-w-2xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`px-6 py-5 ${t.bg} border-b border-white/10 flex justify-between items-center`}>
          <div>
            <p className={`${t.accent} text-[10px] font-black uppercase tracking-[0.25em] mb-0.5`}>Importar · {area}</p>
            <h3 className="text-xl font-black italic tracking-tighter uppercase text-white">Importar Spreadsheet</h3>
            <p className={`text-[10px] font-mono ${t.hint} mt-1`}>{cols}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Progress */}
        {importProgress && (
          <div className="px-6 py-3 bg-blue-500/10 border-t border-white/10">
            {importProgress.status === 'processing' && <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest animate-pulse">Procesando datos...</span>}
            {importProgress.status === 'importing' && (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Importando...</span>
                    <span className="text-[10px] font-black text-slate-400">{importProgress.current} / {importProgress.total}</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 ease-out"
                      style={{ width: importProgress.total ? (importProgress.current / importProgress.total * 100) + '%' : '0%' }} />
                  </div>
                </div>
                <span className="text-[10px] font-black text-blue-400">{importProgress.total ? Math.round(importProgress.current / importProgress.total * 100) : 0}%</span>
              </div>
            )}
            {importProgress.status === 'done' && <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">✅ {importProgress.total} movimientos importados</span>}
            {importProgress.status === 'error' && <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">❌ Error: {importProgress.message}</span>}
            {importProgress.status === 'empty' && <span className="darq-label">ℹ️ Sin filas válidas para importar</span>}
          </div>
        )}

        {/* Textarea */}
        <div className="p-6">
          <textarea
            value={importText}
            onChange={(e) => onChangeText(e.target.value)}
            placeholder="Pegá tus datos desde Excel/Sheets acá..."
            className={`w-full h-64 bg-black/40 border border-white/15 rounded-xl p-4 text-xs font-mono text-slate-200 outline-none ${t.focus} transition-colors resize-none`}
          />
        </div>

        {/* Footer */}
        <div className="p-6 bg-black/20 border-t border-white/10 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
            Cancelar
          </button>
          <button
            type="button"
            onClick={onImport}
            disabled={isImporting}
            className={`px-6 py-2.5 text-sm font-bold text-white ${t.btn} rounded-xl transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isImporting ? 'Importando...' : 'Importar Datos'}
          </button>
        </div>
      </div>
    </div>
  );
}
