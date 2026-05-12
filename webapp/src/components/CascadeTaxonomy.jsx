import React, { useEffect } from 'react';
import { SearchableSelect } from '@darq/ui';
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

  // ── CascadeTaxonomy es la ÚNICA fuente de verdad para taxonomía ──
  // Auto-inicializa categoría y rubro cuando están vacíos o no existen en Firestore.
  // Esto resuelve el conflicto entre la config estática del modal y los datos de Firestore.
  // DEBE estar ANTES de cualquier early return (reglas de hooks de React).
  useEffect(() => {
    if (!loading && taxonomia.length > 0) {
      const updates = {};
      const isObrasIngreso = area === 'Obras' && tipo === 'Ingreso';
      const catKey = isObrasIngreso ? 'tipoObraIngreso' : 'categoria';
      const currentCatValue = isObrasIngreso ? values.tipoObraIngreso : values.categoria;

      // Auto-seleccionar categoría si está vacía
      const matchingCat = taxonomia.find(c => c.nombre === currentCatValue);
      const resolvedCat = matchingCat || taxonomia[0];
      if (!currentCatValue && resolvedCat) {
        updates[catKey] = resolvedCat.nombre;
      }

      // Auto-seleccionar rubro si está vacío
      const resolvedRubros = resolvedCat?.rubros || [];
      if (resolvedRubros.length > 0) {
        const matchingRubro = resolvedRubros.find(r => r.nombre === values.rubro);
        if (!values.rubro) {
          updates.rubro = resolvedRubros[0].nombre;
          updates.concepto = '';
        }
      }

      if (Object.keys(updates).length > 0) {
        onChange(updates);
      }
    }
  }, [catObj, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Early returns DESPUÉS de todos los hooks ──
  if (loading) return <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest animate-pulse col-span-2">Cargando árbol de rubros...</div>;
  if (!taxonomia || taxonomia.length === 0) return <div className="text-[10px] text-red-400 font-bold col-span-2">El administrador aún no ha configurado rubros para esta área.</div>;

  const handleCatChange = (e) => {
    const selectedCat = taxonomia.find(c => c.nombre === e.target.value);
    const firstRubro = selectedCat?.rubros?.[0]?.nombre || '';
    if (area === 'Obras' && tipo === 'Ingreso') {
      onChange({ tipoObraIngreso: e.target.value, rubro: firstRubro, concepto: '' });
    } else {
      onChange({ categoria: e.target.value, rubro: firstRubro, concepto: '' });
    }
  };

  return (
    <>
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase ml-1" style={{ color: catColor }}>Categoría</label>
        <SearchableSelect 
          value={currentCat || ''} 
          onChange={handleCatChange}
          options={[
            ...taxonomia.map(t => ({ value: t.nombre, label: t.nombre })),
            ...(currentCat && !taxonomia.find(c => c.nombre === currentCat) ? [{ value: currentCat, label: currentCat + ' (Obsoleto)' }] : [])
          ]}
          placeholder="Seleccionar..."
        />
      </div>

      {rubrosObj.length > 0 && (
        <div className="space-y-1 animate-in fade-in slide-in-from-left-2">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Rubro</label>
          <SearchableSelect 
            required 
            value={rubroObj?.nombre || values.rubro || ''} 
            onChange={e => onChange({ rubro: e.target.value, concepto: '' })} 
            options={[
              ...rubrosObj.map(sr => ({ value: sr.nombre, label: sr.nombre })),
              ...(values.rubro && !rubrosObj.find(r => r.nombre === values.rubro) ? [{ value: values.rubro, label: values.rubro + ' (Obsoleto)' }] : [])
            ]}
            style={{ borderBottomWidth: 2, borderColor: catColor }}
            placeholder="Seleccionar..."
          />
        </div>
      )}

      {conceptosList.length > 0 && (
        <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Concepto Restringido</label>
          <SearchableSelect 
            required 
            value={values.concepto || ''} 
            onChange={e => onChange({ concepto: e.target.value })} 
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
