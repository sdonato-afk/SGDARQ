import React, { useState } from 'react';
import { SearchableSelect } from '@darq/ui';
import { createPortal } from 'react-dom';
import { X, Save } from 'lucide-react';
import { fmt, calcMargenDARQ } from '../../../lib/calculadora.jsx';



export default function CertificacionModal({ contratistas, retencionPct, initialData, onSave, onClose }) {
  const ct0 = contratistas[0];
  // Derivar margen% del contratista si tiene presupuesto/costo configurados
  const margenPctDeCt = (ct) => {
    if (!ct || !ct.costo_real || ct.costo_real <= 0) return 0;
    return Math.round(((ct.presupuesto_cliente / ct.costo_real) - 1) * 1000) / 10;
  };

  const [form, setForm] = useState(() => {
    const b = initialData;
    const ct = b ? contratistas.find(c => c.id === b.contratista_id) : ct0;
    return {
      fecha:              b?.fecha              ?? new Date().toISOString().slice(0, 10),
      numero_cert:        b?.numero_cert        ?? '',
      contratista_id:     b?.contratista_id     ?? ct0?.id ?? '',
      contratista_nombre: b?.contratista_nombre ?? ct0?.contratista ?? '',
      descripcion:        b?.descripcion        ?? '',
      moneda:             b?.moneda             ?? ct0?.moneda ?? 'ARS',
      monto_avance:       b?.monto_avance ?? b?.monto_bruto ?? '',
      avance_pct:         b?.avance_pct         ?? '',
      aplica_retencion:   b?.aplica_retencion   ?? true,
      retencion_pct:      b?.retencion_pct_custom ?? b?.retencion_pct ?? retencionPct,
      tiene_cac:          b?.tiene_cac          ?? false,
      monto_cac:          b?.monto_cac          ?? '',
      cac_indice:         b?.cac_indice         ?? '',
      margen_pct:         b?.margen_darq_pct    ?? margenPctDeCt(ct),
      iva_pct:            b?.iva_pct            ?? 10.5,
      aprobada:           b?.aprobada           ?? false,
    };
  });
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Cálculos bottom-up
  const avanceBase = parseFloat(form.monto_avance) || 0;
  const cacMonto   = form.tiene_cac ? (parseFloat(form.monto_cac) || 0) : 0;
  const retPct     = form.aplica_retencion ? (parseFloat(form.retencion_pct) || 0) : 0;
  const retMonto   = Math.round(avanceBase * retPct / 100 * 100) / 100;
  const avanceNeto = avanceBase - retMonto;
  const margenPct  = parseFloat(form.margen_pct) || 0;
  const baseMargen = avanceBase + cacMonto;           // margen se aplica sobre avance + CAC
  const margenMonto= Math.round(baseMargen * margenPct / 100 * 100) / 100;
  const totalSinIva= baseMargen + margenMonto;
  const ivaPct     = parseFloat(form.iva_pct) || 0;
  const ivaMonto   = Math.round(totalSinIva * ivaPct / 100 * 100) / 100;
  const totalConIva= totalSinIva + ivaMonto;
  const totalContr = avanceNeto + cacMonto + ivaMonto; // lo que cobra el contratista

  const sym = form.moneda === 'USD' ? 'u$d' : '$';
  const f2  = n => n.toLocaleString('es-AR', { minimumFractionDigits: 2 });

  // Cambio de contratista → actualizar nombre y margen%
  const handleCt = (id) => {
    const ct = contratistas.find(c => c.id === id);
    const pct = parseFloat(form.avance_pct);
    setForm(f => ({
      ...f,
      contratista_id: id,
      contratista_nombre: ct?.contratista || '',
      moneda: ct?.moneda || 'ARS',
      margen_pct: margenPctDeCt(ct),
      monto_avance: (!isNaN(pct) && ct?.costo_real)
        ? (ct.costo_real * pct / 100).toFixed(2) : f.monto_avance,
    }));
  };

  const handleAvancePct = (val) => {
    const pct = parseFloat(val);
    const ct  = contratistas.find(c => c.id === form.contratista_id);
    setForm(f => ({
      ...f, avance_pct: val,
      monto_avance: (!isNaN(pct) && ct?.costo_real)
        ? (ct.costo_real * pct / 100).toFixed(2) : f.monto_avance,
    }));
  };

  const handleSave = async () => {
    if (!avanceBase) return;
    setSaving(true); setSaveError('');
    try {
      await onSave({
        fecha: form.fecha, numero_cert: form.numero_cert,
        contratista_id: form.contratista_id, contratista_nombre: form.contratista_nombre,
        descripcion: form.descripcion, moneda: form.moneda, aprobada: form.aprobada,
        // avance
        monto_avance: avanceBase, monto_bruto: avanceBase, avance_pct: form.avance_pct || null,
        aplica_retencion: form.aplica_retencion, retencion_pct_custom: retPct,
        retencion_reparo: retMonto, monto_neto: avanceNeto,
        // CAC
        tiene_cac: form.tiene_cac, monto_cac: cacMonto,
        cac_indice: parseFloat(form.cac_indice) || null,
        // margen & factura
        margen_darq_pct: margenPct, margen_darq: margenMonto,
        iva_pct: ivaPct, iva_monto: ivaMonto,
        total_sin_iva: totalSinIva, total_con_iva: totalConIva,
        total_contratista: totalContr,
        // Estado de pago: solo se setea al crear — al editar updateDoc no lo toca
        ...(!initialData && { pago_cliente_estado: 'pendiente', pago_cliente_fecha: null }),
      });
    } catch (err) {
      setSaveError(err.message || 'Error al guardar. Revisá los permisos de Firestore.');
    }
    setSaving(false);
  };

  const Toggle = ({ field }) => (
    <button type="button" onClick={() => set(field, !form[field])}
      style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: form[field] ? '#6366f1' : '#334155', position: 'relative', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: form[field] ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
    </button>
  );

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '20px', overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 20, width: '100%', maxWidth: 660,
          margin: 'auto',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: '#e2e8f0' }}>
            {initialData ? 'Editar Certificación' : 'Nueva Certificación'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Fila 1: Fecha + N° */}
          <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
            <div>
              <label className="label">Fecha</label>
              <input className="input" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
            </div>
            <div>
              <label className="label">N° Certificado</label>
              <input className="input" value={form.numero_cert} onChange={e => set('numero_cert', e.target.value)} placeholder="1, 2, 3A..." />
            </div>
          </div>

          {/* Contratista */}
          <div style={{ marginBottom: 12 }}>
            <label className="label">Contratista</label>
            <SearchableSelect
              className="input"
              value={form.contratista_id}
              onChange={e => handleCt(e.target.value)}
              options={[
                ...contratistas.map(c => ({ value: c.id, label: `${c.contratista} — ${c.rubro}` })),
                { value: '', label: 'Sin contratista' }
              ]}
              placeholder="-- Seleccionar Contratista --"
            />
          </div>

          {/* Descripción */}
          <div style={{ marginBottom: 16 }}>
            <label className="label">Descripción</label>
            <input className="input" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Ej: Avance estructura 60%..." />
          </div>

          {/* ── Bloque de montos ── */}
          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Montos · {form.moneda}
            </div>

            <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
              <div>
                <label className="label">Moneda</label>
                <SearchableSelect className="input" value={form.moneda} onChange={e => set('moneda', e.target.value)}>
                  <option value="ARS">ARS $</option>
                  <option value="USD">USD u$d</option>
                </SearchableSelect>
              </div>
              <div>
                <label className="label">% Avance sobre costo real</label>
                <input className="input" type="number" step="0.1" value={form.avance_pct}
                  onChange={e => handleAvancePct(e.target.value)} placeholder="Ej: 20" />
              </div>
            </div>

            {/* Avance base */}
            <div style={{ marginBottom: 10 }}>
              <label className="label">Monto Avance (costo real contratista)</label>
              <input className="input" type="number" step="0.01" value={form.monto_avance}
                onChange={e => set('monto_avance', e.target.value)} placeholder="0.00" style={{ textAlign: 'right', fontSize: 16, fontWeight: 800 }} />
            </div>

            {/* CAC toggle */}
            <div style={{ padding: '10px 12px', background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 10, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: form.tiene_cac ? 10 : 0 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>Incluye CAC</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>Ajuste por índice · no descuenta del presupuesto del contrato</div>
                </div>
                <button type="button" onClick={() => set('tiene_cac', !form.tiene_cac)}
                  style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: form.tiene_cac ? '#f59e0b' : '#334155', position: 'relative', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 3, left: form.tiene_cac ? 23 : 3,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </button>
              </div>
              {form.tiene_cac && (
                <div className="grid-2" style={{ gap: 10 }}>
                  <div>
                    <label className="label" style={{ fontSize: 10 }}>Monto CAC</label>
                    <input className="input" type="number" step="0.01" value={form.monto_cac}
                      onChange={e => set('monto_cac', e.target.value)} placeholder="0.00" style={{ textAlign: 'right' }} />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: 10 }}>Índice CAC (referencia)</label>
                    <input className="input" type="number" step="0.001" value={form.cac_indice}
                      onChange={e => set('cac_indice', e.target.value)} placeholder="Ej: 1.082" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Bloque margen + IVA + retención ── */}
          <div style={{ padding: '14px 16px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, marginTop: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Estructura de precios
            </div>
            <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
              <div>
                <label className="label">Margen D+ARQ %</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input className="input" type="number" step="0.5" value={form.margen_pct}
                    onChange={e => set('margen_pct', e.target.value)} style={{ textAlign: 'right' }} />
                  <span style={{ fontSize: 11, color: '#64748b' }}>%</span>
                </div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>Sobre avance{form.tiene_cac ? ' + CAC' : ''}</div>
              </div>
              <div>
                <label className="label">IVA %</label>
                <SearchableSelect className="input" value={form.iva_pct} onChange={e => set('iva_pct', parseFloat(e.target.value))}>
                  <option value={10.5}>10.5%</option>
                  <option value={21}>21%</option>
                  <option value={27}>27%</option>
                  <option value={0}>Sin IVA</option>
                </SearchableSelect>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>Sobre total s/IVA · va al contratista</div>
              </div>
            </div>

            {/* Retención */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Fondo de Reparo</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>Solo sobre avance · no sobre CAC</div>
              </div>
              {form.aplica_retencion && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input className="input" type="number" step="0.5" value={form.retencion_pct}
                    onChange={e => set('retencion_pct', e.target.value)}
                    style={{ width: 56, textAlign: 'right', padding: '4px 6px' }} />
                  <span style={{ fontSize: 11, color: '#64748b' }}>%</span>
                </div>
              )}
              <Toggle field="aplica_retencion" />
            </div>
          </div>

          {/* ── Panel de resultados ── */}
          {avanceBase > 0 && (
            <div style={{ marginTop: 14, padding: '14px 16px', background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#34d399', textTransform: 'uppercase', marginBottom: 10 }}>
                Desglose calculado
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {[
                  { l: `Avance base contratista`,         v: avanceBase,   c: '#94a3b8' },
                  form.tiene_cac && cacMonto > 0 &&
                  { l: `CAC`,                              v: cacMonto,     c: '#fbbf24' },
                  { l: `Base para margen (avance${form.tiene_cac ? '+CAC' : ''})`, v: baseMargen, c: '#94a3b8' },
                  { l: `Margen D+ARQ ${margenPct}%`,       v: margenMonto,  c: '#818cf8' },
                  { l: `Total sin IVA (factura neta)`,     v: totalSinIva,  c: '#e2e8f0', bold: true },
                  ivaMonto > 0 &&
                  { l: `IVA ${ivaPct}%`,                   v: ivaMonto,     c: '#fbbf24' },
                  { l: `Total con IVA (cliente paga)`,     v: totalConIva,  c: '#34d399', bold: true },
                  { l: `─────────────────────────`,        sep: true },
                  form.aplica_retencion &&
                  { l: `Retención fondo reparo ${retPct}%`, v: retMonto,    c: '#f87171' },
                  { l: `Cobra contratista (neto+CAC+IVA)`, v: totalContr,   c: '#60a5fa' },
                  { l: `Cobra D+ARQ`,                      v: margenMonto,  c: '#818cf8' },
                ].filter(Boolean).map((r, i) => r.sep
                  ? <div key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />
                  : (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{r.l}</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: r.bold ? 900 : 700, fontSize: r.bold ? 14 : 12, color: r.c }}>
                        {sym} {f2(r.v)}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          {saveError && (
            <div style={{ padding: '8px 12px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, fontSize: 12, color: '#f87171' }}>
              ⚠ {saveError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !avanceBase}>
              <Save size={13} /> {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

