import React, { useEffect } from 'react';
import SearchableSelect from './SearchableSelect';
import { useTaxonomia } from '../hooks/useTaxonomia';

export default function CascadeTaxonomy({ area, tipo, values, onChange }) {
  // Construir docId dinámicamente: ej "obras_egreso", "oficina_ingreso"
  const docId = `${String(area).toLowerCase()}_${String(tipo).toLowerCase()}`;
  
  // Custom hook para escuchar la colección (ahora unificada)
  const { taxonomia, loading } = useTaxonomia(docId);

  // Fallback map para Obras Ingreso que usaba tipoObraIngreso históricamente en App.jsx
  const currentCat = (area === 'Obras' && tipo === 'Ingreso') ? values.tipoObraIngreso : values.categoria;

  // Calcular derivados de forma segura (taxonomia puede ser [] mientras carga)
  const catObj = taxonomia?.find(c => c.nombre === currentCat) || taxonomia?.[0];
  const catColor = catObj?.color || (tipo === 'Ingreso' ? '#34d399' : '#f87171');
  const rubrosObj = catObj?.rubros || [];
  const rubroActual = values.rubro || rubrosObj[0]?.nombre || '';
  const rubroObj = rubrosObj.find(r => r.nombre === rubroActual) || rubrosObj[0];
  const conceptosList = rubroObj?.conceptos || [];
  const isConceptoLibre = rubrosObj.length > 0 && conceptosList.length === 0;

  useEffect(() => {
    if (!loading && taxonomia.length > 0) {
      const updates = {};
      const isObrasIngreso = area === 'Obras' && tipo === 'Ingreso';
      const catKey = isObrasIngreso ? 'tipoObraIngreso' : 'categoria';
      const currentCatValue = isObrasIngreso ? values.tipoObraIngreso : values.categoria;

      // Auto-seleccionar categoría si está vacía o no existe en Firestore
      const matchingCat = taxonomia.find(c => c.nombre === currentCatValue);
      const resolvedCat = matchingCat || taxonomia[0];
      if (!matchingCat && resolvedCat) {
        updates[catKey] = resolvedCat.nombre;
      }

      // Auto-seleccionar rubro si está vacío o no existe en la categoría resuelta
      const resolvedRubros = resolvedCat?.rubros || [];
      if (resolvedRubros.length > 0) {
        const matchingRubro = resolvedRubros.find(r => r.nombre === values.rubro);
        if (!matchingRubro) {
          updates.rubro = resolvedRubros[0].nombre;
          updates.concepto = '';
        }
      }

      if (Object.keys(updates).length > 0) {
        onChange(updates);
      }
    }
  }, [catObj, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest animate-pulse col-span-2">Cargando árbol de rubros...</div>;
  if (!taxonomia || taxonomia.length === 0) return <div className="text-[10px] text-red-400 font-bold col-span-2">El administrador aún no ha configurado rubros para esta área.</div>;

  const handleCatChange = (val) => {
    const selectedCat = taxonomia.find(c => c.nombre === val);
    const firstRubro = selectedCat?.rubros?.[0]?.nombre || '';
    if (area === 'Obras' && tipo === 'Ingreso') {
      onChange({ tipoObraIngreso: val, rubro: firstRubro, concepto: '' });
    } else {
      onChange({ categoria: val, rubro: firstRubro, concepto: '' });
    }
  };

  return (
    <>
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase ml-1" style={{ color: catColor }}>Categoría</label>
        <SearchableSelect 
          value={currentCat || ''} 
          onChange={handleCatChange}
          options={taxonomia.map(t => ({ value: t.nombre, label: t.nombre }))}
          placeholder="Seleccionar..."
        />
      </div>

      {rubrosObj.length > 0 && (
        <div className="space-y-1 animate-in fade-in slide-in-from-left-2">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Rubro</label>
          <SearchableSelect 
            value={rubroObj?.nombre || ''} 
            onChange={val => onChange({ rubro: val, concepto: '' })} 
            options={rubrosObj.map(sr => ({ value: sr.nombre, label: sr.nombre }))}
            placeholder="Seleccionar..."
          />
        </div>
      )}

      {conceptosList.length > 0 && (
        <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Concepto Restringido</label>
          <SearchableSelect 
            value={values.concepto || ''} 
            onChange={val => onChange({ concepto: val })} 
            options={conceptosList.map((c) => ({ value: c, label: c }))}
            placeholder="-- Seleccionar --"
          />
        </div>
      )}

      {isConceptoLibre && (
        <div className="space-y-1 animate-in fade-in">
          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Concepto / Detalle (Anotación Libre)</label>
          <input 
            value={values.concepto || ''} 
            onChange={e => onChange({ concepto: e.target.value })} 
            placeholder="Ej: Mes de Junio, Gasto extraordinario, etc..." 
            className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-white/30 transition-colors placeholder:font-normal placeholder:text-slate-500"
          />
        </div>
      )}
    </>
  );
}
