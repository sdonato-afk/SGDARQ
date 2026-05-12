import React, { useState } from 'react';
import { Modal, SearchableSelect } from '@darq/ui';
import { Check } from 'lucide-react';
import { fmt } from '../../../lib/calculadora.jsx';
import ComprobanteUploader, { openPDF, downloadPDF } from '../../../components/ComprobanteUploader.jsx';

export default function PagoClienteModal({ cert, contratistas, onSave, onClose }) {
  const ct = contratistas.find(c => c.id === cert.contratista_id);
  const [form, setForm] = useState({
    pago_cliente_estado: 'pagado',
    pago_cliente_fecha: new Date().toISOString().slice(0, 10),
    tiene_factura: true,
    iva_pct: 21,
    factura_numero: '',
    factura_cuit: ct?.cuit || '',
    notas_pago: '',
  });
  const [saving, setSaving] = useState(false);
  const [pdfB64, setPdfB64] = useState(null);
  const [pdfName, setPdfName] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const moneda = cert.moneda || 'ARS';
  // Base correcta: el cliente paga sobre total_sin_iva (avance + margen D+ARQ)
  // NO sobre monto_neto (que es solo lo que cobra el contratista)
  const baseSinIva   = cert.total_sin_iva || cert.monto_neto || 0;
  const ivaMonto     = form.tiene_factura ? Math.round(baseSinIva * (form.iva_pct / 100) * 100) / 100 : 0;
  const totalConIva  = baseSinIva + ivaMonto;

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      pago_cliente_estado: 'pagado',
      pago_cliente_fecha: form.pago_cliente_fecha,
      tiene_factura: form.tiene_factura,
      iva_pct: form.tiene_factura ? form.iva_pct : 0,
      iva_monto: ivaMonto,
      total_con_iva: totalConIva,
      factura_numero: form.factura_numero,
      factura_cuit: form.factura_cuit,
      notas_pago: form.notas_pago,
      // Comprobante PDF adjunto
      ...(pdfB64 ? { comprobante_b64: pdfB64, comprobante_nombre: pdfName, tiene_comprobante: true } : {}),
    });
    setSaving(false);
  };

  return (
    <Modal
      title="Registrar Pago del Cliente"
      subtitle={`${ct?.contratista || cert.contratista_nombre} · ${cert.periodo}${cert.quincena ? ' Q' + cert.quincena : ''}`}
      onClose={onClose}
      maxWidth={480}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-success" onClick={handleSave} disabled={saving}>
          <Check size={13} /> {saving ? 'Guardando...' : 'Confirmar pago'}
        </button>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="label">Fecha de pago del cliente</label>
          <input className="input" type="date" value={form.pago_cliente_fecha} onChange={e => set('pago_cliente_fecha', e.target.value)} />
        </div>

        {/* Toggle factura */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>¿Tiene factura del contratista?</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Sin factura → IVA no aplica</div>
          </div>
          <button
            type="button"
            onClick={() => set('tiene_factura', !form.tiene_factura)}
            style={{
              width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: form.tiene_factura ? '#6366f1' : '#334155', transition: 'all 0.2s', position: 'relative',
            }}
          >
            <div style={{
              position: 'absolute', top: 3, left: form.tiene_factura ? 23 : 3,
              width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'all 0.2s',
            }} />
          </button>
        </div>

        {form.tiene_factura && (
          <div className="grid-2" style={{ gap: 12 }}>
            <div>
              <label className="label">Número de factura</label>
              <input className="input" value={form.factura_numero} onChange={e => set('factura_numero', e.target.value)} placeholder="0001-00001234" />
            </div>
            <div>
              <label className="label">IVA %</label>
              <SearchableSelect className="input" value={form.iva_pct} onChange={e => set('iva_pct', parseFloat(e.target.value))}>
                <option value={21}>21%</option>
                <option value={10.5}>10.5%</option>
                <option value={27}>27%</option>
                <option value={0}>Sin IVA / Exento</option>
              </SearchableSelect>
            </div>
          </div>
        )}

        {/* Resumen del pago — flujo correcto */}
        <div style={{ padding: '14px 18px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', marginBottom: 12 }}>
            Flujo de pago
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

            {/* Lo que cobra el contratista */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: '#64748b' }}>Avance neto contratista</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#94a3b8', fontSize: 12 }}>{fmt(cert.monto_neto || 0, moneda)}</span>
            </div>
            {(cert.margen_darq || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#818cf8' }}>+ Margen D+ARQ (incl. en precio)</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#818cf8', fontSize: 12 }}>{fmt(cert.margen_darq, moneda)}</span>
              </div>
            )}

            {/* Separador: base s/IVA */}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 12, color: '#e2e8f0' }}>Total s/IVA (base factura)</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#e2e8f0', fontSize: 13 }}>{fmt(baseSinIva, moneda)}</span>
            </div>

            {form.tiene_factura && form.iva_pct > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>IVA {form.iva_pct}%</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#fbbf24', fontSize: 12 }}>{fmt(ivaMonto, moneda)}</span>
              </div>
            )}

            {/* Total final */}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: '#34d399' }}>Total que paga el cliente</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#34d399', fontSize: 18 }}>{fmt(totalConIva, moneda)}</span>
            </div>

            {/* Aclaración back-to-back */}
            {(cert.margen_darq || 0) > 0 && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(129,140,248,0.08)', border: '1px dashed rgba(129,140,248,0.25)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#818cf8' }}>↩ Contratista le debe a D+ARQ</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#818cf8', fontSize: 13 }}>{fmt(cert.margen_darq, moneda)}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="label">Notas (opcional)</label>
          <input className="input" value={form.notas_pago} onChange={e => set('notas_pago', e.target.value)} placeholder="Ej: Transferencia Santander, referencia..." />
        </div>

        {/* Comprobante PDF (opcional) */}
        <div>
          <label className="label">Comprobante de pago (opcional)</label>
          <ComprobanteUploader
            compact
            existingPdf={pdfB64}
            existingName={pdfName}
            onFile={(b64, name) => { setPdfB64(b64); setPdfName(name); }}
            onRemove={() => { setPdfB64(null); setPdfName(''); }}
          />
        </div>
      </div>
    </Modal>
  );
}
