import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, DollarSign, Briefcase, HardHat, Wallet } from 'lucide-react';
import { generateToken } from '../lib/slugify.js';
import { Modal } from '@darq/ui';

// ─── Valor inicial del form dado un config ────────────────────────────
function buildForm(config) {
  return {
    // Materiales
    fee_gestion_pct:               config.fee_gestion_pct              ?? 12,
    caja_chica_sin_comprobante_pct: config.caja_chica_sin_comprobante_pct ?? 30,
    // Honorarios
    honorarios_proyecto_total:     config.honorarios_proyecto_total    ?? 0,
    honorarios_direccion_total:    config.honorarios_direccion_total   ?? 0,
    honorarios_admin_total:        config.honorarios_admin_total       ?? 0,
    honorarios_moneda:             config.honorarios_moneda            ?? 'USD',
    // Caja chica — moneda seleccionable
    caja_chica_fondo:              config.caja_chica_fondo             ?? config.caja_chica_fondo_usd ?? 4000,
    caja_chica_moneda:             config.caja_chica_moneda            ?? 'USD',
    // Logística
    logistica_semanal:             config.logistica_semanal            ?? 0,
    logistica_moneda:              config.logistica_moneda             ?? 'USD',
    // MO
    retencion_reparo_pct:          config.retencion_reparo_pct         ?? 5,
  };
}

export default function ConfigModal({ config, onSave, onClose }) {
  // Reiniciar el form cuando cambia la obra (config.id cambia)
  const [form, setForm] = useState(() => buildForm(config));
  useEffect(() => {
    setForm(buildForm(config));
  }, [config.id]);

  const [saving, setSaving] = useState(false);
  const [regenToken, setRegenToken] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form };
    if (regenToken) data.token_cliente = generateToken();
    await onSave(data);
    setSaving(false);
    onClose();
  };

  return (
    <Modal
      title="Configuración de Obra"
      subtitle={config.nombre}
      onClose={onClose}
      maxWidth={580}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={13} /> {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </>}
    >
      {/* ── MATERIALES ── */}
      <Section title="Gestión de Materiales" icon={DollarSign} color="#34d399">
        <Field label="Fee de Gestión" hint="Se aplica a todas las facturas de materiales">
          <NumInput value={form.fee_gestion_pct} onChange={v => set('fee_gestion_pct', v)} suffix="%" />
        </Field>
        <Field label="Markup sin comprobante" hint="Para gastos de caja chica sin factura">
          <NumInput value={form.caja_chica_sin_comprobante_pct} onChange={v => set('caja_chica_sin_comprobante_pct', v)} suffix="%" />
        </Field>
      </Section>

      {/* ── HONORARIOS ── */}
      <Section title="Honorarios Profesionales" icon={Briefcase} color="#818cf8">
        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: '#64748b' }}>Moneda:</span>
          <MonedaToggle value={form.honorarios_moneda} onChange={v => set('honorarios_moneda', v)} />
        </div>
        <Field label="Total Proyecto" hint="Monto fijo pactado · cargado en cuotas por hito">
          <NumInput value={form.honorarios_proyecto_total} onChange={v => set('honorarios_proyecto_total', v)} prefix={form.honorarios_moneda === 'USD' ? 'u$d' : '$'} />
        </Field>
        <Field label="Total Dirección" hint="Monto fijo pactado · cargado en cuotas por hito">
          <NumInput value={form.honorarios_direccion_total} onChange={v => set('honorarios_direccion_total', v)} prefix={form.honorarios_moneda === 'USD' ? 'u$d' : '$'} />
        </Field>
        <Field label="Total Administración" hint="Monto fijo pactado · cargado en cuotas por hito" fullWidth>
          <NumInput value={form.honorarios_admin_total} onChange={v => set('honorarios_admin_total', v)} prefix={form.honorarios_moneda === 'USD' ? 'u$d' : '$'} />
        </Field>
      </Section>

      {/* ── CAJA CHICA ── */}
      <Section title="Caja Chica" icon={Wallet} color="#fbbf24">
        <Field label="Fondo de Caja Chica" hint="Monto que adelanta el cliente al inicio">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <NumInput value={form.caja_chica_fondo} onChange={v => set('caja_chica_fondo', v)} />
            <MonedaToggle value={form.caja_chica_moneda} onChange={v => set('caja_chica_moneda', v)} />
          </div>
        </Field>
        <Field label="Logística semanal" hint="Cargo automático por semana de trabajo">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <NumInput value={form.logistica_semanal} onChange={v => set('logistica_semanal', v)} />
            <MonedaToggle value={form.logistica_moneda} onChange={v => set('logistica_moneda', v)} />
          </div>
        </Field>
      </Section>

      {/* ── MO / CERTIFICACIONES ── */}
      <Section title="Mano de Obra" icon={HardHat} color="#64748b">
        <Field label="Retención Fondo de Reparo" hint="Se descuenta de cada certificación">
          <NumInput value={form.retencion_reparo_pct} onChange={v => set('retencion_reparo_pct', v)} suffix="%" />
        </Field>
        <div /> {/* spacer */}
      </Section>

      {/* ── TOKEN ── */}
      <div style={{ padding: 16, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Token de acceso cliente</div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{config.token_cliente?.slice(0, 16)}...</div>
          </div>
          <button onClick={() => setRegenToken(v => !v)} className={`btn btn-sm ${regenToken ? 'btn-danger' : 'btn-ghost'}`}>
            <RefreshCw size={12} /> {regenToken ? 'Se regenerará' : 'Regenerar'}
          </button>
        </div>
        {regenToken && (
          <p style={{ marginTop: 10, fontSize: 11, color: '#f87171' }}>
            ⚠ El link actual del cliente dejará de funcionar. Tendrás que enviarle el nuevo.
            ?? El link actual del cliente dejar� de funcionar. Tendr�s que enviarle el nuevo.
          </p>
        )}
      </div>
    </Modal>
  );
}

// -- Subcomponentes -------------------------------------------------

function Section({ title, icon: Icon, color, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {Icon && <Icon size={14} color={color || '#64748b'} />}
        <span style={{ fontSize: 11, fontWeight: 800, color: color || '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, children, fullWidth }) {
  return (
    <div style={fullWidth ? { gridColumn: '1 / -1' } : {}}>
      <label className="label">{label}</label>
      {hint && <p style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>{hint}</p>}
      {children}
    </div>
  );
}

/**
 * Input numérico que NO parsea en cada keystroke.
 * Guarda el string mientras el usuario escribe y convierte a número solo al salir (onBlur).
 */
function NumInput({ value, onChange, prefix, suffix }) {
  const [raw, setRaw] = useState(String(value ?? ''));

  // Sincronizar si el valor externo cambia (ej. al cambiar de obra)
  useEffect(() => {
    setRaw(String(value ?? ''));
  }, [value]);

  const commit = () => {
    const n = parseFloat(raw.replace(',', '.'));
    onChange(isNaN(n) ? 0 : n);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
      {prefix && <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{prefix}</span>}
      <input
        className="input"
        type="text"
        inputMode="decimal"
        value={raw}
        onChange={e => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={e => e.key === 'Enter' && commit()}
        style={{ textAlign: 'right', flex: 1 }}
      />
      {suffix && <span style={{ fontSize: 11, color: '#64748b' }}>{suffix}</span>}
    </div>
  );
}

/** Toggle visual ARS / USD */
function MonedaToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
      {['USD', 'ARS'].map(m => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          style={{
            padding: '5px 12px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
            background: value === m ? 'rgba(99,102,241,0.3)' : 'transparent',
            color: value === m ? '#818cf8' : '#64748b',
            transition: 'all 0.12s',
          }}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
