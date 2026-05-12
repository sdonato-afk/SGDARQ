import React, { useState, useEffect } from 'react';
import { SearchableSelect } from '@darq/ui';
import { useTaxonomia } from '../hooks/useTaxonomia';
import { db } from '../config/firebase';
import { seedDatabase } from '../config/seedScript';
import { Plus, Trash2, Save, Undo2, X, ChevronDown, ChevronRight, Layers, TableProperties } from 'lucide-react';

const AREAS_TAXONOMIA = [
  { id: 'obras_egreso', nombre: 'Obras (Egresos)' },
  { id: 'obras_ingreso', nombre: 'Obras (Ingresos)' },
  { id: 'oficina_egreso', nombre: 'Oficina (Egresos)' },
  { id: 'oficina_ingreso', nombre: 'Oficina (Ingresos)' },
  { id: 'alquileres_egreso', nombre: 'Alquileres (Egresos)' },
  { id: 'alquileres_ingreso', nombre: 'Alquileres (Ingresos)' },
  { id: 'directorio_egreso', nombre: 'Directorio (Egresos)' },
  { id: 'directorio_ingreso', nombre: 'Directorio (Ingresos)' }
];

export default function TaxonomiaMaestra() {
  const [selectedDoc, setSelectedDoc] = useState('obras_egreso');
  const [areaParam, tipoParam] = selectedDoc.split('_');
  
  // Custom Hook to load specific taxonomy
  const { taxonomia, loading, save } = useTaxonomia(selectedDoc);
  const [localData, setLocalData] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [expandedCats, setExpandedCats] = useState({});
  const [expandedRubros, setExpandedRubros] = useState({});

  useEffect(() => {
    if(!loading) {
        setLocalData(JSON.parse(JSON.stringify(taxonomia)));
        setIsDirty(false);
    }
  }, [taxonomia, loading, selectedDoc]);

  const generateId = () => Math.random().toString(36).substring(2, 9);
  
  const handleSave = async () => {
     await save(localData);
     setIsDirty(false);
     alert("Cambios guardados en Firebase con éxito.");
  };

  const handleSeed = async () => {
    if(window.confirm("¿Estás seguro de que deseas reiniciar la base de datos de taxonomías copiando del código fuente actual? Esto sobrescribirá todo.")) {
       await seedDatabase(db);
       alert("Migración de diccionarios finalizada. Refresca la ventana.");
       window.location.reload();
    }
  };

  // Add Category
  const addCategory = () => {
      const newCat = { id: generateId(), nombre: 'NUEVA CATEGORIA', rubros: [], color: '#38bdf8' };
      setLocalData([...localData, newCat]);
      setIsDirty(true);
  };

  // UI Handlers (Simple state mutations for deep tree)
  const updateCat = (catId, newName) => {
      setLocalData(localData.map(c => c.id === catId ? {...c, nombre: newName} : c));
      setIsDirty(true);
  };

  const addRubro = (catId) => {
      setLocalData(localData.map(c => {
          if (c.id === catId) {
             const rubros = c.rubros || [];
             setExpandedCats({...expandedCats, [catId]: true});
             return { ...c, rubros: [...rubros, { id: generateId(), nombre: 'NUEVO RUBRO', conceptos: [] }] };
          }
          return c;
      }));
      setIsDirty(true);
  };

  const updateRubro = (catId, rubroId, newName) => {
      setLocalData(localData.map(c => {
          if(c.id === catId) {
              return {...c, rubros: c.rubros.map(r => r.id === rubroId ? {...r, nombre: newName} : r)};
          } return c;
      }));
      setIsDirty(true);
  };

  const addConcepto = (catId, rubroId) => {
      setLocalData(localData.map(c => {
          if(c.id === catId) {
             return {...c, rubros: c.rubros.map(r => {
                 if(r.id === rubroId) {
                     setExpandedRubros({...expandedRubros, [rubroId]: true});
                     return {...r, conceptos: [...(r.conceptos||[]), 'NUEVO CONCEPTO']};
                 }
                 return r;
             })};
          } return c;
      }));
      setIsDirty(true);
  };

  const updateConcepto = (catId, rubroId, index, newName) => {
      setLocalData(localData.map(c => {
          if(c.id === catId) {
             return {...c, rubros: c.rubros.map(r => {
                 if(r.id === rubroId) {
                     const newConceptos = [...r.conceptos];
                     newConceptos[index] = newName;
                     return {...r, conceptos: newConceptos};
                 }
                 return r;
             })};
          } return c;
      }));
      setIsDirty(true);
  };

  const delConcepto = (catId, rubroId, index) => {
       setLocalData(localData.map(c => {
          if(c.id === catId) {
             return {...c, rubros: c.rubros.map(r => {
                 if(r.id === rubroId) {
                     const newConceptos = r.conceptos.filter((_, i) => i !== index);
                     return {...r, conceptos: newConceptos};
                 }
                 return r;
             })};
          } return c;
      }));
      setIsDirty(true);
  };
  
  const delRubro = (catId, rubroId) => {
      setLocalData(localData.map(c => c.id === catId ? {...c, rubros: c.rubros.filter(r => r.id !== rubroId)} : c));
      setIsDirty(true);
  };

  const delCat = (catId) => {
      setLocalData(localData.filter(c => c.id !== catId));
      setIsDirty(true);
  };


  return (
    <div className="min-h-screen bg-black text-white p-8">
       <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between">
              <div>
                 <h1 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                    <TableProperties className="text-blue-500" /> Taxonomía Maestra
                 </h1>
                 <p className="text-sm text-slate-400 mt-1">Gestión Centralizada (BBDD Viva)</p>
              </div>

              <div className="flex items-center gap-4">
                  <SearchableSelect 
                      value={selectedDoc} 
                      onChange={e => setSelectedDoc(e.target.value)}
                      className="bg-black/50 border border-white/20 rounded-xl px-4 py-2 font-bold text-blue-300 outline-none focus:border-blue-500"
                  >
                     {AREAS_TAXONOMIA.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </SearchableSelect>

                  <button 
                     onClick={handleSeed}
                     className="px-4 py-2 bg-red-600/20 text-red-500 border border-red-600/30 font-bold rounded-xl text-xs flex items-center gap-2"
                  >
                     <Layers size={14} /> MIGRAR JSON 
                  </button>
                  <button 
                     onClick={handleSave}
                     disabled={!isDirty}
                     className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 disabled:opacity-50 transition-colors"
                  >
                     <Save size={14} /> GUARDAR BASE DE DATOS
                  </button>
              </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
             {loading ? <div className="text-center text-slate-400 animate-pulse">Cargando árbol contable...</div> : (
               <>
                 {localData.map(c => (
                     <div key={c.id} className="border border-white/5 bg-black/40 rounded-xl overflow-hidden">
                         <div className="flex items-center gap-4 p-4 border-b border-white/5">
                             <button onClick={() => setExpandedCats({...expandedCats, [c.id]: !expandedCats[c.id]})} className="text-slate-500 hover:text-white">
                                {expandedCats[c.id] ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                             </button>
                             <div className="flex-1 flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CAT</span>
                                <input 
                                   value={c.nombre} 
                                   onChange={e => updateCat(c.id, e.target.value)} 
                                   className="bg-transparent border-none text-white font-bold text-lg outline-none flex-1 focus:bg-white/5 px-2 py-1 rounded" 
                                />
                             </div>
                             <div className="flex items-center gap-2">
                                <button onClick={() => addRubro(c.id)} className="p-2 text-emerald-400 hover:bg-emerald-400/20 rounded-lg"><Plus size={16} /></button>
                                <button onClick={() => delCat(c.id)} className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg"><Trash2 size={16} /></button>
                             </div>
                         </div>

                         {expandedCats[c.id] && c.rubros && (
                            <div className="pl-12 pr-4 py-4 space-y-3 bg-white/[0.02]">
                               {c.rubros.map(r => (
                                 <div key={r.id} className="border border-white/5 bg-black/50 rounded-lg">
                                      <div className="flex items-center gap-4 p-3 border-b border-white/5">
                                         <button onClick={() => setExpandedRubros({...expandedRubros, [r.id]: !expandedRubros[r.id]})} className="text-slate-500 hover:text-white">
                                            {expandedRubros[r.id] ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                                         </button>
                                         <div className="flex-1 flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">RUBRO</span>
                                            <input 
                                               value={r.nombre} 
                                               onChange={e => updateRubro(c.id, r.id, e.target.value)} 
                                               className="bg-transparent border-none text-white font-bold text-sm outline-none flex-1 focus:bg-white/5 px-2 py-1 rounded" 
                                            />
                                         </div>
                                         <div className="flex items-center gap-2">
                                            <button onClick={() => addConcepto(c.id, r.id)} className="p-1.5 text-blue-400 hover:bg-blue-400/20 rounded-md"><Plus size={14} /></button>
                                            <button onClick={() => delRubro(c.id, r.id)} className="p-1.5 text-red-400 hover:bg-red-400/20 rounded-md"><Trash2 size={14} /></button>
                                         </div>
                                      </div>

                                      {expandedRubros[r.id] && r.conceptos && (
                                         <div className="pl-12 pr-4 py-3 bg-black/30 flex flex-col gap-2">
                                            {r.conceptos.map((con, idx) => (
                                                <div key={idx} className="flex items-center gap-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></div>
                                                    <input 
                                                      value={con}
                                                      onChange={e => updateConcepto(c.id, r.id, idx, e.target.value)}
                                                      className="bg-transparent border-b border-white/10 text-slate-300 font-medium text-xs outline-none flex-1 py-1 px-1 focus:border-blue-400 focus:text-white transition-colors"
                                                    />
                                                    <button onClick={() => delConcepto(c.id, r.id, idx)} className="text-red-500/50 hover:text-red-500"><X size={12}/></button>
                                                </div>
                                            ))}
                                            {r.conceptos.length === 0 && <span className="text-xs text-slate-500 italic">No hay conceptos (permite guardar cualquier concepto genérico).</span>}
                                         </div>
                                      )}
                                 </div>
                               ))}
                               {c.rubros.length === 0 && <span className="text-xs text-slate-500 italic pl-4">No hay rubros en esta categoría.</span>}
                            </div>
                         )}
                     </div>
                 ))}
                 
                 <button onClick={addCategory} className="w-full py-4 border-2 border-dashed border-white/10 rounded-xl text-slate-400 hover:text-white hover:border-white/30 font-bold flex flex-col items-center gap-2 transition-all">
                     <Plus /> Agregar Categoría Principal
                 </button>
               </>
             )}
          </div>
       </div>
    </div>
  )
}
