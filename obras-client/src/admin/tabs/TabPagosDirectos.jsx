import React, { useState, useRef } from 'react';
import { FileText, Download, Trash2, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { usePagosDirectos, useTcGlobal } from '../../hooks/useObras.js';
import ComprobanteUploader, { fileToBase64, openPDF, downloadPDF } from '../../components/ComprobanteUploader.jsx';
import { fmt } from '../../lib/calculadora.jsx';
import { KPICard } from '@darq/ui';
import PagoDirectoModal from './pagosdirectos/PagoDirectoModal.jsx';

// ── Estados ──────────────────────────────────────────────────────────
const ESTADOS = {
  pendiente: { label: 'Pendiente',  color: '#fbbf24', badge: 'badge-amber' },
  validado:  { label: 'Validado',   color: '#818cf8', badge: 'badge-blue'  },
  pagado:    { label: 'Pagado',     color: '#34d399', badge: 'badge-green' },
};
const ESTADO_NEXT = { pendiente: 'validado', validado: 'pagado', pagado: 'pendiente' };

export default function TabPagosDirectos({ obraId, config }) {
  const { pagosDirectos: facturas, loading, add, update, remove } = usePagosDirectos(obraId);
  const { tc } = useTcGlobal(obraId);

  const feePct = config?.fee_gestion_pct ?? 12;

  const [modalData, setModalData] = useState(null);
  const [tempFile, setTempFile] = useState(null);
  const [attachTarget, setAttachTarget] = useState(null);
  const [attachingId, setAttachingId]   = useState(null);
  const attachRef = useRef(null);

  // ── Abrir modal con datos extraídos del PDF ──────────────────────────
  const handleExtracted = (result) => {
    setModalData({
      form: {
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
      },
      rawDebug: result.rawText || '',
    });
  };

  // ── Adjuntar PDF a registro existente ──────────────────────────
  const handleAttachFile = async (e) => {
    if (!attachTarget || !e.target.files?.[0]) return;
    setAttachingId(attachTarget);
    try {
      const f = e.target.files[0];
      const b64 = await fileToBase64(f);
      await update(attachTarget, { pdf_b64: b64, pdf_name: f.name, tiene_pdf: true });
    } catch (err) { alert('Error: ' + err.message); }
    setAttachingId(null); setAttachTarget(null); e.target.value = '';
  };

  const avanzarEstado = (id, estado) => update(id, { estado: ESTADO_NEXT[estado] || 'pendiente' });

  // ── Totales ──────────────────────────────────────────────────────────
  const pendientes = facturas.filter(f => f.estado !== 'pagado');
  const pagados    = facturas.filter(f => f.estado === 'pagado');
  const toUSD = (f) => {
    const m = parseFloat(f.monto) || 0;
    return f.moneda === 'USD' ? m : m / (tc || 1000);
  };
  const totalPendUSD = pendientes.reduce((s, f) => s + toUSD(f), 0);
  const totalPagUSD  = pagados.reduce((s, f) => s + toUSD(f), 0);
  const feeCalcUSD   = (totalPendUSD + totalPagUSD) * feePct / 100;

  return (
    <div>
      <input ref={attachRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleAttachFile} />

      {/* KPIs */}
      <div className="grid-3" style={{ marginBottom: 28 }}>
        <KPICard
          label="Pendiente de pago"
          value={fmt(totalPendUSD, 'USD')}
          sub={`${pendientes.length} obligaciones`}
          color="#fbbf24"
          borderColor="rgba(251,191,36,0.2)"
          background="rgba(251,191,36,0.04)"
        />
        <KPICard
          label="Total pagado"
          value={fmt(totalPagUSD, 'USD')}
          sub={`${pagados.length} pagos realizados`}
          color="#34d399"
          borderColor="rgba(52,211,153,0.2)"
          background="rgba(52,211,153,0.04)"
        />
        <KPICard
          label={`Fee de gestión D+ARQ (${feePct}%)`}
          value={fmt(feeCalcUSD, 'USD')}
          sub="Sobre total gestionado"
          color="#818cf8"
          borderColor="rgba(99,102,241,0.2)"
          background="rgba(99,102,241,0.04)"
        />
      </div>

      {/* Zona drag & drop + botón manual */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 28 }}>
        <ComprobanteUploader
          onFile={(b64, name) => setTempFile({ b64, name })}
          onExtracted={handleExtracted}
        />
        <button
          onClick={() => { setTempFile(null); setModalData({}); }}
          className="btn btn-ghost"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 24px', height: '100%', borderRadius: 16, border: '2px dashed rgba(255,255,255,0.1)' }}
        >
          <Plus size={24} color="#64748b" />
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Pago sin<br />comprobante</span>
        </button>
      </div>

      {/* Tabla */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Cargando...</div>
      ) : facturas.length === 0 ? (
        <div className="glass" style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
          <AlertCircle size={28} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 13 }}>No hay obligaciones de pago registradas.</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Arrastrá una factura PDF o usá el botón "Pago sin comprobante".</div>
        </div>
      ) : (
        <div className="glass" style={{ overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Categoría</th>
                <th>Proveedor / Descripción</th>
                <th>Comprobante</th>
                <th style={{ textAlign: 'right' }}>Monto</th>
                <th>Estado</th>
                <th style={{ textAlign: 'center' }}>PDF</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {facturas.map(f => {
                const est = ESTADOS[f.estado] || ESTADOS.pendiente;
                return (
                  <tr key={f.id} style={{ opacity: f.estado === 'pagado' ? 0.55 : 1 }}>
                    <td style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{f.fecha}</td>
                    <td>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', background: 'rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: 6 }}>
                        {f.categoria || 'Otro'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>{f.razon_social}</div>
                      {f.notas && <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{f.notas}</div>}
                    </td>
                    <td style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                      {f.tipo && <div>{f.tipo}</div>}
                      {f.numero && <div style={{ opacity: 0.7 }}>{f.numero}</div>}
                      {!f.tiene_pdf && !f.tipo && <span style={{ color: '#475569', fontStyle: 'italic' }}>Sin comprobante</span>}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, fontSize: 14, color: est.color, whiteSpace: 'nowrap' }}>
                      {fmt(parseFloat(f.monto) || 0, f.moneda)}
                    </td>
                    <td>
                      <button onClick={() => avanzarEstado(f.id, f.estado)}
                        className={`badge ${est.badge}`}
                        style={{ cursor: 'pointer', border: 'none', whiteSpace: 'nowrap' }}
                        title="Click para avanzar estado"
                      >
                        {est.label}
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {f.pdf_b64 ? (
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button onClick={() => openPDF(f.pdf_b64)} style={{ background: 'rgba(56,189,248,0.1)', border: 'none', cursor: 'pointer', color: '#38bdf8', borderRadius: 6, padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <FileText size={11} /> Ver
                          </button>
                          <button onClick={() => downloadPDF(f.pdf_b64, f.pdf_name)} style={{ background: 'rgba(52,211,153,0.1)', border: 'none', cursor: 'pointer', color: '#34d399', borderRadius: 6, padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Download size={11} /> Bajar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAttachTarget(f.id); attachRef.current.click(); }}
                          disabled={attachingId === f.id}
                          style={{ background: 'rgba(251,191,36,0.08)', border: '1px dashed rgba(251,191,36,0.3)', cursor: 'pointer', color: '#fbbf24', borderRadius: 6, padding: '3px 8px', fontSize: 10 }}
                        >
                          {attachingId === f.id ? '⏳' : '+ PDF'}
                        </button>
                      )}
                    </td>
                    <td>
                      <button onClick={() => remove(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155' }}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal carga */}
      {modalData && (
        <PagoDirectoModal
          initialData={{
            ...modalData,
            b64: tempFile?.b64,
            name: tempFile?.name,
          }}
          feePct={feePct}
          onSave={async (data) => {
            await add(data);
            setModalData(null);
            setTempFile(null);
          }}
          onClose={() => {
            setModalData(null);
            setTempFile(null);
          }}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
