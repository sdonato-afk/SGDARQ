import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Download, X } from 'lucide-react';
import { extractFromPDF } from '../lib/pdfExtractor.jsx';

// ── Helpers PDF ───────────────────────────────────────────────────
export const fileToBase64 = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(',')[1]);
  r.onerror = rej;
  r.readAsDataURL(file);
});

export const base64ToBlob = (b64) => {
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: 'application/pdf' });
};

export const openPDF = (b64) => {
  const url = URL.createObjectURL(base64ToBlob(b64));
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

export const downloadPDF = (b64, name) => {
  const url = URL.createObjectURL(base64ToBlob(b64));
  const a = document.createElement('a');
  a.href = url; a.download = name || 'comprobante.pdf';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

/**
 * ComprobanteUploader
 *
 * Props:
 *   onFile(base64, name, size)  — llamado cuando se carga un PDF
 *   onExtracted(data)           — llamado con los datos extraídos del PDF AFIP
 *   existingPdf                 — base64 del comprobante ya guardado
 *   existingName                — nombre del archivo existente
 *   onRemove()                  — callback para quitar el PDF existente
 *   compact                     — modo compacto (para usar dentro de un modal)
 *   disabled                    — deshabilita la carga
 */
export default function ComprobanteUploader({
  onFile, onExtracted, existingPdf, existingName,
  onRemove, compact = false, disabled = false,
}) {
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!disabled) setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const processFile = async (file) => {
    if (file.type !== 'application/pdf') { alert('Solo se aceptan archivos PDF.'); return; }
    
    // Validar límite de 1MB (1024 * 1024 bytes)
    if (file.size > 1048576) {
      alert('El archivo PDF supera el límite de 1MB. Por favor, comprima el archivo antes de subirlo.');
      return;
    }

    setProcessing(true);
    try {
      // Extraer datos AFIP
      if (onExtracted) {
        const result = await extractFromPDF(file);
        onExtracted(result);
      }
      // Convertir a base64
      if (onFile) {
        const b64 = await fileToBase64(file);
        onFile(b64, file.name, file.size);
      }
    } catch (err) {
      console.error('Error procesando PDF:', err);
    }
    setProcessing(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (disabled) return;
    if (e.dataTransfer.files?.[0]) await processFile(e.dataTransfer.files[0]);
  };

  const handleChange = async (e) => {
    if (e.target.files?.[0]) await processFile(e.target.files[0]);
    e.target.value = '';
  };

  // ── Si ya hay PDF cargado ────────────────────────────────────────
  if (existingPdf) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: compact ? '8px 12px' : '12px 16px',
        background: 'rgba(52,211,153,0.06)',
        border: '1px solid rgba(52,211,153,0.2)',
        borderRadius: 10,
      }}>
        <FileText size={16} color="#34d399" style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {existingName || 'comprobante.pdf'}
        </span>
        <button
          onClick={() => openPDF(existingPdf)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818cf8', padding: 4 }}
          title="Ver PDF"
        >
          <FileText size={13} />
        </button>
        <button
          onClick={() => downloadPDF(existingPdf, existingName)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
          title="Descargar"
        >
          <Download size={13} />
        </button>
        {onRemove && !disabled && (
          <button
            onClick={onRemove}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 4 }}
            title="Quitar PDF"
          >
            <X size={13} />
          </button>
        )}
      </div>
    );
  }

  // ── Zona de carga ────────────────────────────────────────────────
  return (
    <div
      onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
      onClick={() => !disabled && fileRef.current?.click()}
      style={{
        padding: compact ? '14px 16px' : '24px',
        textAlign: 'center',
        borderRadius: 12,
        border: dragActive ? '2px solid #6366f1' : '2px dashed rgba(255,255,255,0.1)',
        background: dragActive ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.2s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleChange} />
      {processing ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div style={{ width: 18, height: 18, border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 12, color: '#818cf8', fontWeight: 700 }}>Leyendo PDF AFIP...</span>
        </div>
      ) : (
        <div>
          <UploadCloud size={compact ? 20 : 28} style={{ color: dragActive ? '#818cf8' : '#475569', marginBottom: 6 }} />
          <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: compact ? 12 : 13, marginBottom: 2 }}>
            {compact ? 'Subir comprobante PDF' : 'Arrastrar comprobante PDF'}
          </div>
          {!compact && <div style={{ color: '#64748b', fontSize: 11 }}>Extrae datos AFIP automáticamente</div>}
        </div>
      )}
    </div>
  );
}
