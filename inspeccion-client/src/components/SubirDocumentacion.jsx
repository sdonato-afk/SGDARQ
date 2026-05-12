import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Loader2, SendHorizonal, FileText, Map, FileImage, Paperclip, X, ExternalLink, Search } from 'lucide-react';
import { collection, getDocs, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { SearchableSelect } from '@darq/ui';
import { db } from '../config/firebase';
import { dropboxUpload, dropboxCreateSharedLink, dropboxCreateFolder } from '../hooks/useDropbox';

const TIPOS_DOC = [
  { id: 'plano',   label: 'Plano',        icon: Map,       color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  { id: 'detalle', label: 'Detalle',      icon: FileText,  color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  { id: 'render',  label: 'Render/Imagen',icon: FileImage, color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
  { id: 'otro',    label: 'Otro',         icon: Paperclip, color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
];

export default function SubirDocumentacion({ onBack, user, selectedObra }) {
  const obraId = selectedObra?.id;
  
  const [viewMode, setViewMode] = useState('subir'); // 'subir' o 'consultar'
  const [documentos, setDocumentos] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const [tipo, setTipo] = useState('plano');
  const [titulo, setTitulo] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [exito, setExito] = useState(false);
  
  const fileRef = useRef();



  useEffect(() => {
    if (viewMode === 'consultar' && obraId) {
      setLoadingDocs(true);
      async function loadDocs() {
        try {
          const q = query(
            collection(db, 'artifacts', 'sg-darq', 'public', 'data', 'documentacion_obras'),
            where('obraId', '==', obraId)
          );
          const snap = await getDocs(q);
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          // Orden local para evitar requerir un índice compuesto en Firestore
          docs.sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
          setDocumentos(docs);
        } catch(e) {
          console.error(e);
        } finally {
          setLoadingDocs(false);
        }
      }
      loadDocs();
    }
  }, [viewMode, obraId]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) setArchivo(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!obraId || !titulo.trim() || !archivo) {
      alert('Completá la obra, el título y selecciona un archivo.');
      return;
    }
    
    setSubiendo(true);
    try {
      const obraSelected = selectedObra;
      
      // 1. Asegurar la carpeta base de la obra
      await dropboxCreateFolder(obraId, obraSelected?.nombre);
      
      // 2. Subir el archivo dentro de la subcarpeta "Documentacion"
      // dropboxUpload se encarga de crear la subcarpeta automáticamente si no existe.
      const meta = await dropboxUpload(obraId, obraSelected?.nombre, archivo, `${tipo}_${titulo}`, 'Documentacion');
      
      // 3. Crear link para que quede accesible
      const fileUrl = await dropboxCreateSharedLink(meta.path_display);
      
      // 4. Guardar registro en Firestore
      await addDoc(collection(db, 'artifacts', 'sg-darq', 'public', 'data', 'documentacion_obras'), {
        obraId,
        obraNombre: obraSelected?.nombre || '',
        tipo,
        titulo: titulo.trim(),
        nombreArchivo: archivo.name,
        fileUrl,
        dropboxPath: meta.path_display,
        subidoPorUid: user?.uid || '',
        subidoPorNombre: user?.displayName || user?.email?.split('@')[0] || 'Inspección',
        createdAt: serverTimestamp(),
      });
      
      setExito(true);
      setTimeout(() => onBack(), 2500);
    } catch (err) {
      console.error('Error subiendo documento:', err);
      alert('Error al subir el documento. Intentá de nuevo.');
    } finally {
      setSubiendo(false);
    }
  };

  if (exito) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
          <SendHorizonal size={40} color="#3b82f6" />
        </div>
        <h2 className="text-2xl font-black text-slate-100 mb-2">¡Documento subido!</h2>
        <p className="text-slate-400">El archivo se guardó correctamente en Dropbox y está vinculado a la obra.</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto pb-16">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full active:bg-slate-800 text-slate-400">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold text-slate-100">Documentación</h2>
      </div>

      <div className="flex bg-black/40 p-1 rounded-xl mb-6 border border-white/5">
        <button onClick={() => setViewMode('subir')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${viewMode === 'subir' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Subir</button>
        <button onClick={() => setViewMode('consultar')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${viewMode === 'consultar' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Consultar</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* UBICACIÓN ACTUAL */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Ubicación Actual</p>
            <p className="text-sm font-bold text-slate-200">{selectedObra?.nombre || 'Obra no seleccionada'}</p>
          </div>
        </div>

        {viewMode === 'consultar' ? (
          <div className="pt-4 space-y-4">
            {loadingDocs ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>
            ) : documentos.length === 0 ? (
              <div className="text-center py-10 bg-black/20 rounded-2xl border border-white/5">
                <Search size={32} className="mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400 text-sm">No hay documentos para esta obra.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documentos.map(doc => {
                  const tipoInfo = TIPOS_DOC.find(t => t.id === doc.tipo) || TIPOS_DOC[3];
                  const Icon = tipoInfo.icon;
                  return (
                    <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors active:scale-95">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: tipoInfo.bg, color: tipoInfo.color }}>
                        <Icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-200 truncate">{doc.titulo}</p>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{doc.nombreArchivo}</p>
                      </div>
                      <ExternalLink size={18} className="text-slate-500 shrink-0" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* TIPO */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tipo de Documento</label>
          <div className="grid grid-cols-2 gap-3">
            {TIPOS_DOC.map(t => {
              const Icon = t.icon;
              const active = tipo === t.id;
              return (
                <button key={t.id} type="button" onClick={() => setTipo(t.id)}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all active:scale-95"
                  style={{ 
                    background: active ? t.bg : 'rgba(255,255,255,0.03)', 
                    border: `2px solid ${active ? t.color : 'rgba(255,255,255,0.06)'}` 
                  }}>
                  <Icon size={24} color={active ? t.color : '#475569'} />
                  <span className="text-xs font-bold" style={{ color: active ? t.color : '#64748b' }}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TÍTULO */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Título / Detalle *</label>
          <input type="text" required
            placeholder="Ej: Plano de Instalación Sanitaria"
            value={titulo} onChange={e => setTitulo(e.target.value)}
            className="w-full p-4 rounded-xl glass-input font-medium" />
        </div>

        {/* ARCHIVO */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Archivo *</label>
          {archivo ? (
            <div className="relative p-4 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText size={24} className="text-blue-400 shrink-0" />
                <div className="truncate">
                  <p className="text-sm font-bold text-slate-200 truncate">{archivo.name}</p>
                  <p className="text-xs text-slate-500">{(archivo.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button type="button" onClick={() => setArchivo(null)} className="p-2 text-slate-400 hover:text-rose-400 shrink-0">
                <X size={20} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full py-6 rounded-2xl flex flex-col items-center justify-center gap-2 border-2 border-dashed active:opacity-70"
              style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
              <Paperclip size={28} className="text-slate-500" />
              <span className="text-sm font-bold text-slate-400">Tocar para seleccionar archivo</span>
              <span className="text-xs text-slate-600">Soporta PDF, imágenes, DWG, etc.</span>
            </button>
          )}
          {/* Aceptamos casi cualquier cosa, pero podés restringir el accept="" si quieres */}
          <input type="file" ref={fileRef} className="hidden" onChange={handleFile} />
        </div>

        {/* SUBMIT */}
        <div className="pt-4 pb-8">
          <button type="submit" disabled={subiendo || !obraId || !titulo.trim() || !archivo}
            className="w-full p-4 rounded-xl text-white font-black text-lg flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
            style={{ background: '#3b82f6' }}>
            {subiendo ? <Loader2 className="animate-spin" size={24} /> : <SendHorizonal size={24} />}
            {subiendo ? 'Subiendo...' : 'Subir Documento'}
          </button>
        </div>
        </>
        )}

      </form>
    </div>
  );
}
