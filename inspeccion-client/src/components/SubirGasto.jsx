import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, ArrowLeft, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { SearchableSelect } from '@darq/ui';
import { db, app } from '../config/firebase';
import { dropboxUpload, dropboxCreateSharedLink, dropboxCreateFolder } from '../hooks/useDropbox';

export default function SubirGasto({ onBack, user, selectedObra }) {
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [monto, setMonto] = useState('');
  const [proveedor, setProveedor] = useState('');
  const obraId = selectedObra?.id;
  const [nota, setNota] = useState('');
  
  const [subiendo, setSubiendo] = useState(false);
  const [exito, setExito] = useState(false);
  const fileInputRef = useRef(null);



  const handleCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFoto(file);
    const objectUrl = URL.createObjectURL(file);
    setFotoPreview(objectUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!foto || !monto || !obraId) {
      alert('Faltan datos obligatorios (Foto, Monto u Obra)');
      return;
    }

    setSubiendo(true);
    try {
      const obraSelected = selectedObra;

      // 1. Asegurar que la carpeta de la obra exista en Dropbox
      await dropboxCreateFolder(obraId, obraSelected?.nombre);

      // 2. Subir foto a Dropbox
      const meta = await dropboxUpload(obraId, obraSelected?.nombre, foto, `Ticket_${proveedor || 'Gasto'}`);

      // 3. Generar enlace público
      const url = await dropboxCreateSharedLink(meta.path_display);

      // 4. Crear documento en inbox_movimientos
      await addDoc(collection(db, 'artifacts', 'sg-darq', 'public', 'data', 'inbox_movimientos'), {
        tipo: 'gasto_obra',
        obraId,
        obraNombre: obraSelected?.nombre,
        monto: parseFloat(monto),
        moneda: 'ARS', // por defecto
        proveedor,
        nota,
        fotoUrl: url,
        estado: 'pendiente',
        createdAt: serverTimestamp(),
        origen: 'inspeccion-client'
      });

      setExito(true);
      // Limpiar
      setFoto(null);
      setFotoPreview(null);
      setMonto('');
      setProveedor('');
      setNota('');
      
      setTimeout(() => {
        onBack();
      }, 2000);

    } catch (error) {
      console.error("Error subiendo gasto:", error);
      alert('Error subiendo el ticket. Intentá de nuevo.');
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
        <h2 className="text-2xl font-black text-slate-100 mb-2">¡Enviado a Revisión!</h2>
        <p className="text-slate-400">El ticket ya está en la Bandeja de Entrada de administración.</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto pb-safe">
      {/* Header Modal */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full active:bg-slate-800 text-slate-400 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold text-slate-100">Subir Ticket</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* FOTO (Botón gigante) */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Foto del Comprobante *</label>
          {fotoPreview ? (
            <div className="relative rounded-2xl overflow-hidden border-2 border-indigo-500/50 aspect-[4/3] bg-black">
              <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover" />
              <button 
                type="button"
                onClick={() => { setFoto(null); setFotoPreview(null); }}
                className="absolute top-3 right-3 bg-black/60 backdrop-blur text-white p-2 rounded-full active:scale-95"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[4/3] rounded-2xl flex flex-col items-center justify-center gap-3 border-2 border-dashed border-indigo-500/30 bg-indigo-500/5 active:bg-indigo-500/10 transition-colors"
            >
              <Camera size={48} className="text-indigo-400" />
              <span className="font-bold text-indigo-400">Tomar Foto</span>
            </button>
          )}
          {/* input capture="environment" abre la cámara trasera en móviles */}
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            ref={fileInputRef}
            className="hidden" 
            onChange={handleCapture}
          />
        </div>

        {/* UBICACIÓN ACTUAL */}
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Ubicación Actual</p>
            <p className="text-sm font-bold text-slate-200">{selectedObra?.nombre || 'Obra no seleccionada'}</p>
          </div>
        </div>

        {/* MONTO */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Monto Total *</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">$</span>
            <input 
              type="number" 
              inputMode="decimal"
              placeholder="0.00"
              required
              value={monto}
              onChange={e => setMonto(e.target.value)}
              className="w-full p-4 pl-10 rounded-xl glass-input text-2xl font-black text-emerald-400 placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* PROVEEDOR */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Proveedor (Opcional)</label>
          <input 
            type="text" 
            placeholder="Ej: Easy, Corralón X"
            value={proveedor}
            onChange={e => setProveedor(e.target.value)}
            className="w-full p-4 rounded-xl glass-input font-medium"
          />
        </div>

        {/* NOTA */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nota (Opcional)</label>
          <input 
            type="text" 
            placeholder="Ej: Materiales losa, Flete"
            value={nota}
            onChange={e => setNota(e.target.value)}
            className="w-full p-4 rounded-xl glass-input font-medium"
          />
        </div>

        {/* SUBMIT */}
        <div className="pt-4 pb-8">
          <button 
            type="submit" 
            disabled={subiendo || !foto || !monto || !obraId}
            className="w-full p-4 rounded-xl bg-indigo-600 active:bg-indigo-700 text-white font-black text-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:active:bg-indigo-600"
          >
            {subiendo ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
            {subiendo ? 'Enviando...' : 'Enviar a Revisión'}
          </button>
        </div>

      </form>
    </div>
  );
}
