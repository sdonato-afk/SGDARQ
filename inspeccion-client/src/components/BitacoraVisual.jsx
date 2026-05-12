import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, ArrowLeft, Loader2, X, Plus } from 'lucide-react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { SearchableSelect } from '@darq/ui';
import { db } from '../config/firebase';
import { dropboxUpload, dropboxCreateFolder, dropboxCreateSharedLink } from '../hooks/useDropbox';

// Debe coincidir con la colección que usa obras-client
const OBRAS_COL = 'obras';

export default function BitacoraVisual({ onBack, selectedObra }) {
  const obraId = selectedObra?.id;
  
  const [fotos, setFotos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });
  const [exito, setExito] = useState(false);
  
  const fileInputRef = useRef(null);



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

      // Asegurar que la subcarpeta Bitacora exista
      await dropboxCreateFolder(obraId, `${obraSelected?.nombre}/Bitacora`);

      // Subir fotos secuencialmente para no saturar la red del móvil
      for (let i = 0; i < fotos.length; i++) {
        const fotoItem = fotos[i];

        // 1. Upload a Dropbox (subcarpeta Bitacora/)
        const meta = await dropboxUpload(
          obraId, obraSelected?.nombre, fotoItem.file,
          `Bitacora_${i + 1}`, 'Bitacora'
        );

        // 2. Crear shared link público (necesario para que obras-client pueda mostrar la imagen)
        const url = await dropboxCreateSharedLink(meta.path_display);

        // 3. Registrar en Firestore → aparece inmediatamente en TabBitacora de obras-client
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
        <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-6">
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

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* UBICACIÓN ACTUAL */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">Ubicación Actual</p>
            <p className="text-sm font-bold text-slate-200">{selectedObra?.nombre || 'Obra no seleccionada'}</p>
          </div>
        </div>

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
            {subiendo ? `Subiendo ${progreso.actual} de ${progreso.total}...` : 'Subir a la Bitácora'}
          </button>
        </div>

      </form>
    </div>
  );
}
