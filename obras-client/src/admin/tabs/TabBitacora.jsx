/**
 * TabBitacora.jsx
 *
 * Tab de gestión de fotos de obra en el panel admin.
 * - Sube fotos directamente a Dropbox (múltiples a la vez)
 * - Sincroniza imágenes que ya estén en la carpeta de Dropbox
 * - Muestra galería con opción de eliminar
 * - Fotos son accesibles desde el portal del cliente via URL pública
 */

import React, { useState, useRef } from 'react';
import { Camera, Upload, RefreshCw, Trash2, ImageOff, FolderOpen, CheckCircle, X } from 'lucide-react';
import { useFotos } from '../../hooks/useObras';
import { useDropboxFotos } from '../../hooks/useDropboxFotos';

export default function TabBitacora({ obraId, obraNombre }) {
  const { fotos, loading } = useFotos(obraId);
  const {
    uploading, syncing, uploadProgress, syncResult,
    subirFotos, sincronizarDesdeDropbox, eliminarFoto,
  } = useDropboxFotos(obraId, obraNombre);

  const [descripcion, setDescripcion] = useState('');
  const [confirmId, setConfirmId]     = useState(null);
  const [dragOver, setDragOver]       = useState(false);
  const [expandedFoto, setExpandedFoto] = useState(null);
  const [toast, setToast]             = useState(null); // { type: 'ok'|'err', msg }
  const fileRef = useRef();

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const handleFiles = async (files) => {
    if (!files?.length) return;
    try {
      const urls = await subirFotos(Array.from(files), descripcion);
      showToast('ok', `${urls.length} foto${urls.length !== 1 ? 's' : ''} subida${urls.length !== 1 ? 's' : ''} correctamente`);
      setDescripcion('');
    } catch (e) {
      console.error('Dropbox upload error:', e);
      showToast('err', `Error al subir: ${e.message}`);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleSync = async () => {
    try {
      const result = await sincronizarDesdeDropbox();
      showToast('ok', `${result.added} fotos importadas · ${result.skipped} ya registradas`);
    } catch (e) {
      console.error('Dropbox sync error:', e);
      showToast('err', `Error al sincronizar: ${e.message}`);
    }
  };

  return (
    <div style={{ padding: '24px 28px' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '12px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13,
          background: toast.type === 'ok' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
          border: `1px solid ${toast.type === 'ok' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
          color: toast.type === 'ok' ? '#34d399' : '#f87171',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          maxWidth: 400,
        }}>
          {toast.type === 'ok' ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 }}>Bitácora Visual</h2>
          <p style={{ fontSize: 12, color: '#64748b' }}>
            Las fotos se guardan en <code style={{ color: '#818cf8', fontSize: 11 }}>Dropbox/D+ARQ/Obras/{obraNombre || obraId}</code>
          </p>
        </div>
        <button
          onClick={handleSync} disabled={syncing || uploading}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 18px', background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.25)', borderRadius: 10,
            color: '#818cf8', fontWeight: 700, fontSize: 12, cursor: 'pointer',
            opacity: (syncing || uploading) ? 0.5 : 1,
          }}>
          <RefreshCw size={13} className={syncing ? 'spin' : ''} />
          {syncing ? 'Sincronizando...' : 'Sincronizar desde Dropbox'}
        </button>
      </div>

      {/* Resultado de sync */}
      {syncResult && (
        <div style={{ marginBottom: 20, padding: '12px 18px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle size={16} color="#34d399" />
          <span style={{ fontSize: 13, color: '#34d399', fontWeight: 600 }}>
            {syncResult.added} foto{syncResult.added !== 1 ? 's' : ''} nuevas importadas
            {syncResult.skipped > 0 && ` · ${syncResult.skipped} ya registradas`}
          </span>
        </div>
      )}

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileRef.current?.click()}
        style={{
          marginBottom: 28, padding: '32px 24px', textAlign: 'center',
          background: dragOver ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
          border: `2px dashed ${dragOver ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 16, cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s',
        }}>
        <input
          ref={fileRef} type="file" multiple accept="image/*" style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />

        {uploading ? (
          <div>
            <Upload size={28} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} color="#818cf8" />
            <div style={{ fontSize: 14, fontWeight: 700, color: '#818cf8', marginBottom: 6 }}>
              {uploadProgress ? `Subiendo ${uploadProgress.current} de ${uploadProgress.total}...` : 'Subiendo...'}
            </div>
            <div style={{ width: 160, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, margin: '0 auto' }}>
              <div style={{
                height: '100%', borderRadius: 4, background: '#6366f1',
                width: uploadProgress ? `${(uploadProgress.current / uploadProgress.total) * 100}%` : '60%',
                transition: 'width 0.3s',
              }} />
            </div>
          </div>
        ) : (
          <>
            <Camera size={28} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} color="#fff" />
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
              Arrastrá fotos o hacé clic para seleccionar
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
              JPG, PNG, WEBP, HEIC · Múltiples archivos permitidos
            </div>
            <input
              type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)}
              onClick={e => e.stopPropagation()}
              placeholder="Descripción (opcional)"
              style={{
                padding: '8px 14px', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                color: '#e2e8f0', fontSize: 13, width: '100%', maxWidth: 320,
              }}
            />
          </>
        )}
      </div>

      {/* Galería */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Cargando...</div>
      ) : fotos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.01)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.05)' }}>
          <FolderOpen size={36} style={{ opacity: 0.15, margin: '0 auto 12px', display: 'block' }} color="#fff" />
          <div style={{ fontSize: 14, color: '#475569' }}>Sin fotos. Subí desde acá o sincronizá desde Dropbox.</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            {fotos.length} foto{fotos.length !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {fotos.map(f => (
              <div key={f.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                {/* Imagen */}
                <div 
                  className="cursor-pointer group/img"
                  onClick={() => setExpandedFoto(f)}
                  style={{ width: '100%', paddingTop: '75%', position: 'relative', background: 'rgba(0,0,0,0.3)' }}
                >
                  <img
                    src={f.url} alt={f.descripcion}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    className="transition-transform duration-300 group-hover/img:scale-105"
                    onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s' }} className="group-hover/img:opacity-100">
                    <span style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', padding: '8px 16px', borderRadius: 20, color: '#fff', fontSize: 12, fontWeight: 700 }}>Ampliar</span>
                  </div>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'none', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageOff size={24} color="#475569" />
                  </div>
                </div>

                {/* Info + acciones */}
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.descripcion}</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{f.fecha}</div>
                  </div>
                  {confirmId === f.id ? (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => { eliminarFoto(f.id, f.dropbox_path); setConfirmId(null); }}
                        style={{ padding: '4px 8px', background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 6, color: '#f87171', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                        ✕ Borrar
                      </button>
                      <button onClick={() => setConfirmId(null)}
                        style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, color: '#64748b', fontSize: 10, cursor: 'pointer' }}>
                        No
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmId(f.id)}
                      style={{ flexShrink: 0, padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', borderRadius: 6 }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Lightbox / Visor de Foto Expandida */}
      {expandedFoto && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'absolute', top: 20, right: 30, display: 'flex', gap: 16 }}>
            <a href={expandedFoto.url} target="_blank" rel="noopener noreferrer"
               style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '10px 16px', borderRadius: 12, textDecoration: 'none', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
               Descargar Original
            </a>
            <button onClick={() => setExpandedFoto(null)}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={24} />
            </button>
          </div>
          
          <img src={expandedFoto.url} alt={expandedFoto.descripcion} style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} />
          
          <div style={{ marginTop: 24, textAlign: 'center', maxWidth: 600 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{expandedFoto.descripcion}</div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>Subido el {expandedFoto.fecha}</div>
          </div>
        </div>
      )}

      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
