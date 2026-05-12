import React, { useState } from 'react';
import { Modal, SearchableSelect } from '@darq/ui';
import { Save } from 'lucide-react';
import ComprobanteUploader from '../../../components/ComprobanteUploader.jsx';
import { fmt } from '../../../lib/calculadora.jsx';

const CATEGORIAS = [
  'Materiales', 'Equipamiento', 'Servicios / subcontrato',
  'Seña / anticipo', 'Transferencia / depósito', 'Otro',
];

const FORM_EMPTY = {
  fecha: new Date().toISOString().slice(0, 10),
  categoria: 'Materiales',
  razon_social: '',
  cuit: '',
  tipo: '',
  numero: '',
  monto: '',
  moneda: 'ARS',
  notas: '',
  tiene_pdf: false,
};

export default function PagoDirectoModal({ initialData, feePct, onSave, onClose }) {
  const [form, setForm] = useState(initialData?.form || FORM_EMPTY);
  const [pdfB64, setPdfB64] = useState(initialData?.b64 || null);
  const [pdfName, setPdfName] = useState(initialData?.name || '');
  const [rawDebug, setRawDebug] = useState(initialData?.rawDebug || '');
  const [processing, setProcessing] = useState(false);
  const [saveError, setSaveError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleExtracted = (result) => {
    setRawDebug(result.rawText || '');
    setForm({
      fecha:        result.data?.fecha            || new Date().toISOString().slice(0, 10),
      categoria:    'Materiales',
      razon_social: result.data?.razonSocial      || '',
      cuit:         result.data?.cuit             || '',
      tipo:         result.data?.tipoComprobante  || 'Factura',
      numero:       result.data?.numeroCompleto   || '',
      monto:        result.data?.impTotal         || '',
      moneda:       'ARS',
      notas:        '',
      tiene_pdf:    true,
    });
  };

  const internalHandleSave = async () => {
    if (!form.razon_social || !form.monto) return;
    setProcessing(true); setSaveError('');
    try {
      await onSave({
        ...form,
        monto: parseFloat(String(form.monto).replace(',', '.')) || 0,
        pdf_b64: pdfB64 || null,
        pdf_name: pdfName || null,
        estado: 'pendiente',
      });
      // onClose is called by parent upon successful add
    } catch (err) {
      setSaveError(err.message);
    }
    setProcessing(false);
  };

  return (
    <Modal
      title={pdfB64 ? '✅ Verificar datos extraídos del PDF' : '➕ Agregar pago directo'}
      subtitle={pdfB64 ? 'Revisá y corregí antes de guardar' : 'Pago sin comprobante o carga manual'}
      onClose={onClose}
      maxWidth={600}
      footer={<>
        {saveError && <div style={{ fontSize: 11, color: '#f87171', flex: 1 }}>{saveError}</div>}
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={internalHandleSave}
          disabled={processing || !form.razon_social || !form.monto}>
          <Save size={13} /> {processing ? 'Guardando...' : 'Guardar'}
        </button>
      </>}
    >
      {rawDebug && (
        <details style={{ marginBottom: 14 }}>
          <summary style={{ fontSize: 10, color: '#64748b', cursor: 'pointer' }}>🔍 Texto crudo extraído del PDF</summary>
          <pre style={{ fontSize: 9, color: '#94a3b8', background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 8, maxHeight: 150, overflowY: 'auto', whiteSpace: 'pre-wrap', marginTop: 6 }}>{rawDebug}</pre>
        </details>
      )}
      {!pdfB64 && (
        <div style={{ marginBottom: 14 }}>
          <label className="label">Comprobante PDF (opcional)</label>
          <ComprobanteUploader compact
            onFile={(b64, name) => { setPdfB64(b64); setPdfName(name); }}
            onExtracted={handleExtracted}
          />
        </div>
      )}
      {pdfB64 && (
        <div style={{ marginBottom: 14 }}>
          <label className="label">Comprobante cargado</label>
          <ComprobanteUploader
            existingPdf={pdfB64} existingName={pdfName}
            onRemove={() => { setPdfB64(null); setPdfName(''); }}
          />
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div><label className="label">Fecha</label><input className="input" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} /></div>
        <div>
          <label className="label">Categoría</label>
          <SearchableSelect className="input" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </SearchableSelect>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="label">Proveedor / Razón Social</label>
          <input className="input" autoFocus value={form.razon_social} onChange={e => set('razon_social', e.target.value)} placeholder="Ej: Materiales del Norte SRL" />
        </div>
        <div><label className="label">CUIT</label><input className="input" value={form.cuit} onChange={e => set('cuit', e.target.value)} placeholder="Sin guiones" /></div>
        <div><label className="label">Tipo comprobante</label><input className="input" value={form.tipo} onChange={e => set('tipo', e.target.value)} placeholder="Factura A, Recibo, —" /></div>
        <div><label className="label">Número</label><input className="input" value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="0001-00001234" /></div>
        <div><label className="label">Monto</label><input className="input" type="text" inputMode="decimal" value={form.monto} onChange={e => set('monto', e.target.value)} style={{ textAlign: 'right' }} /></div>
        <div>
          <label className="label">Moneda</label>
          <SearchableSelect className="input" value={form.moneda} onChange={e => set('moneda', e.target.value)}>
            <option value="ARS">ARS $</option><option value="USD">USD u$d</option>
          </SearchableSelect>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="label">Notas para el cliente (opcional)</label>
          <input className="input" value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Ej: Transferir a Cuenta Santander..." />
        </div>
      </div>
      {form.monto > 0 && (
        <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, fontSize: 12, color: '#818cf8' }}>
          Fee de gestión ({feePct}%) sobre este ítem: <strong>{fmt((parseFloat(String(form.monto).replace(',', '.')) || 0) * feePct / 100, form.moneda)}</strong>
        </div>
      )}
    </Modal>
  );
}
