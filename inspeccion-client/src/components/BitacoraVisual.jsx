import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, ArrowLeft, Loader2, X, Plus } from 'lucide-react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { SearchableSelect } from '@darq/ui';
import { db } from '../config/firebase';
import { dropboxUpload, dropboxEnsureSubfolder, dropboxCreateSharedLink } from '../hooks/useDropbox';

// Debe coincidir con la colección que usa obras-client
const OBRAS_COL = 'obras';

export default function BitacoraVisual({ onBack, selectedObra }) {
  const obraId = selectedObra?.id;
  
  const [fotos, setFotos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });
  const [exito, setExito] = useState(false);
  
  const fileInputRef = useRef(null);  const [viewMode, setViewMode] = useState('subir'); // 'subir' | 'consultar'
  const [fotosBitacora, setFotosBitacora] = useState([]);
  const [loadingFotos, setLoadingFotos] = useState(false);
  const [fotosCargadas, setFotosCargadas] = useState({}); // id -> true

  useEffect(() => {
    if (viewMode === 'consultar' && obraId) {
      setLoadingFotos(true);
      async function fetchFotos() {
        try {
          const snap = await getDocs(collection(db, OBRAS_COL, obraId, 'fotos'));
          const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          fetched.sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          setFotosBitacora(fetched);
        } catch(e) {
          console.error(e);
        } finally {
          setLoadingFotos(false);
        }
      }
      fetchFotos();
    }
  }, [viewMode, obraId]);

  const handleCapture = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const newFotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9)
    }));
    
    setFotos(prev => [...prev, ...newFotos]);
  };

  const removeFoto = (idToRemove) => {
    setFotos(prev => prev.filter(f => f.id !== idToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (fotos.length === 0 || !obraId) {
      alert('Faltan datos obligatorios (Fotos u Obra)');
      return;
    }

    setSubiendo(true);
    setProgreso({ actual: 0, total: fotos.length });
    
    try {
      const obraSelected = selectedObra;
      await dropboxEnsureSubfolder(obraId, obraSelected?.nombre, 'Bitacora');

      for (let i = 0; i < fotos.length; i++) {
        const fotoItem = fotos[i];
        const meta = await dropboxUpload(obraId, obraSelected?.nombre, fotoItem.file, `Bitacora_${i + 1}`, 'Bitacora');
        const url = await dropboxCreateSharedLink(meta.path_display);

        await addDoc(collection(db, OBRAS_COL, obraId, 'fotos'), {
          fecha:        new Date().toISOString().slice(0, 10),
          descripcion:  `Campo · Foto ${i + 1} de ${fotos.length}`,
          url,
          dropbox_path: meta.path_display,
          subida_por:   'inspeccion',
          createdAt:    new Date().toISOString(),
        });

        setProgreso(prev => ({ ...prev, actual: i + 1 }));
      }

      setExito(true);
      setFotos([]);
      
      setTimeout(() => {
        onBack();
      }, 2500);

    } catch (error) {
      console.error("Error subiendo fotos a Bitácora:", error);
      alert('Error subiendo las fotos. Intentá de nuevo.');
    } finally {
      setSubiendo(false);
    }
  };

  if (exito) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[70vh] p-8 text-center animate-fade-in">
        <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6">
          <Upload size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-100 mb-2">¡Bitácora Actualizada!</h2>
        <p className="text-slate-400">Las fotos se han guardado exitosamente en la carpeta de la obra.</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto pb-safe">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} disabled={subiendo} className="p-2 -ml-2 rounded-full active:bg-slate-800 text-slate-400 transition-colors disabled:opacity-50">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold text-slate-100">Bitácora Visual</h2>
      </div>

      <div className="flex bg-black/40 p-1 rounded-xl mb-6 border border-white/5">
        <button onClick={() => setViewMode('subir')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${viewMode === 'subir' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Subir</button>
        <button onClick={() => setViewMode('consultar')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${viewMode === 'consultar' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Consultar</button>
      </div>

      {/* UBICACIÓN ACTUAL */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">Ubicación Actual</p>
          <p className="text-sm font-bold text-slate-200">{selectedObra?.nombre || 'Obra no seleccionada'}</p>
        </div>
      </div>

      {viewMode === 'consultar' ? (
        <div className="pt-2 space-y-4">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center mb-2">Modo Ahorro de Datos Activado</p>
          {loadingFotos ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>
          ) : fotosBitacora.length === 0 ? (
            <div className="text-center py-10 bg-black/20 rounded-2xl border border-white/5">
              <Camera size={32} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm">No hay fotos en la bitácora.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {fotosBitacora.map(f => (
                <div key={f.id} className="bg-white/[0.03] border border-white/[0.05] rounded-xl overflow-hidden flex flex-col">
                  <div className="aspect-square bg-black/40 flex items-center justify-center relative">
                    {fotosCargadas[f.id] ? (
                      <img src={f.url} alt={f.descripcion} className="w-full h-full object-cover" />
                    ) : (
                      <button onClick={() => setFotosCargadas(prev => ({ ...prev, [f.id]: true }))}
                        className="flex flex-col items-center gap-2 p-4 text-indigo-400 active:scale-95 transition-transform">
                        <Camera size={24} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Cargar Foto</span>
                      </button>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold text-slate-300 truncate">{f.descripcion}</p>
                    <p className="text-[9px] text-slate-500 mt-1">{f.fecha}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* FOTOS */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Fotos ({fotos.length}) *
            </label>
            
            <div className="grid grid-cols-3 gap-2 mb-3">
              {fotos.map(foto => (
                <div key={foto.id} className="relative aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-800 group">
                  <img src={foto.preview} alt="Preview" className="w-full h-full object-cover" />
                  {!subiendo && (
                    <button 
                      type="button"
                      onClick={() => removeFoto(foto.id)}
                      className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full active:scale-95"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              
              {!subiendo && (
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 active:bg-emerald-500/10 text-emerald-400 transition-colors"
                >
                  <Plus size={24} />
                  <span className="text-[10px] font-bold mt-1">AÑADIR</span>
                </button>
              )}
            </div>

            <input 
              type="file" 
              accept="image/*" 
              multiple
              capture="environment" 
              ref={fileInputRef}
              className="hidden" 
              onChange={handleCapture}
            />
          </div>

          {/* SUBMIT */}
          <div className="pt-4 pb-8">
            <button 
              type="submit" 
              disabled={subiendo || fotos.length === 0 || !obraId}
              className="w-full p-4 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-black text-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:active:bg-emerald-600"
            >
              {subiendo ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
              {subiendo ? `Subiendo ${progreso.actual} de ${progreso.total}...` : 'Subir a Bitácora'}
            </button>
          </div>
        </form>
      )}
      </div>
  );
}
