import React, { useState } from 'react';
import { Plus, Save, AlertCircle, Check, XCircle } from 'lucide-react';
import { useOrdenesCambio, useTcGlobal } from '../../hooks/useObras.js';
import { fmt, sumarEquiv } from '../../lib/calculadora.jsx';
import { DualAmt, DualResult, KPICard, SectionHeader, Modal, DataTable, SearchableSelect } from '@darq/ui';

const MOTIVOS = ['solicitud_cliente', 'error_proyecto', 'imprevistos', 'normativa', 'otro'];
const ESTADO_COLOR = { pendiente: '#fbbf24', aprobada_cliente: '#34d399', rechazada: '#f87171' };

export default function TabOrdenesCambio({ obraId, config }) {
  const { ordenes, loading, add, update, remove, aprobar } = useOrdenesCambio(obraId);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const { tc } = useTcGlobal(obraId);

  const adicional = sumarEquiv(ordenes, tc, 'monto_adicional');
  const fee = sumarEquiv(ordenes, tc, 'fee_reproye_monto');
  const aprobadasCount = ordenes.filter(o => o.estado === 'aprobada_cliente').length;

  const nextNum = ordenes.length + 1;
  const nextOCNum = `OC-${String(nextNum).padStart(3, '0')}`;

  // ── Columnas para DataTable ──
  const columns = [
    {
      key: 'numero', label: 'N°', sortable: true, filterable: true,
      render: (val) => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#818cf8' }}>{val}</span>,
    },
    {
      key: 'fecha', label: 'Fecha', sortable: true,
      render: (val) => (
        <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>
          {val ? new Date(val).toLocaleDateString('es-AR') : '—'}
        </span>
      ),
    },
    {
      key: 'descripcion', label: 'Descripción', filterable: true,
      render: (val) => <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, display: 'block' }}>{val}</span>,
    },
    {
      key: 'motivo', label: 'Motivo', filterable: true,
      valueGetter: (row) => (row.motivo || '-').replace('_', ' '),
      render: (val) => <span className="badge badge-gray">{(val || '-').replace('_', ' ')}</span>,
    },
    {
      key: 'monto_adicional', label: 'Adicional', sortable: true, align: 'right',
      render: (val, row) => (
        <span style={{ color: '#f87171', fontWeight: 700, fontFamily: 'monospace' }}>
          <DualAmt monto={row.monto_adicional} monedaOrig={row.moneda} tc={row.tc_manual || tc} />
        </span>
      ),
    },
    {
      key: 'fee_reproye_monto', label: 'Fee Re-proy.', sortable: true, align: 'right',
      render: (val, row) => (
        <span style={{ color: '#818cf8', fontFamily: 'monospace' }}>
          <DualAmt monto={row.fee_reproye_monto} monedaOrig={row.moneda} tc={row.tc_manual || tc} />
        </span>
      ),
    },
    {
      key: 'estado', label: 'Estado', filterable: true,
      valueGetter: (row) => row.estado?.replace('_', ' ') || '',
      render: (val, row) => (
        <span className="badge" style={{ background: `${ESTADO_COLOR[row.estado]}20`, color: ESTADO_COLOR[row.estado] }}>
          {row.estado?.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'aprobacion_fecha', label: 'Aprobación',
      render: (val) => <span style={{ fontSize: 11, color: '#64748b' }}>{val ? new Date(val).toLocaleDateString('es-AR') : '-'}</span>,
    },
    {
      key: '_actions', label: '',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
          {row.estado === 'pendiente' && (
            <div style={{ display: 'flex', gap: 2, marginRight: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => aprobar(row.id)} title="Aprobar" style={{ padding: '0 4px', color: '#34d399' }}>
                <Check size={14} />
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => update(row.id, { estado: 'rechazada' })} title="Rechazar" style={{ padding: '0 4px', color: '#f87171' }}>
                <XCircle size={14} />
              </button>
            </div>
          )}
          <button className="btn btn-ghost btn-sm" style={{ padding: '0 6px', color: '#94a3b8' }}
            onClick={() => { setEditingItem(row); setShowModal(true); }}>✏️</button>
          <button className="btn btn-ghost btn-sm" style={{ padding: '0 6px', color: '#f87171' }}
            onClick={() => { if(window.confirm('¿Eliminar OC?')) remove(row.id); }}>🗑️</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <KPICard label="Total Adicionales" value={<DualResult result={adicional} />} sub={`${ordenes.length} órdenes de cambio`} color="#f87171" />
        <KPICard label="Aprobadas por cliente" value={aprobadasCount} color="#34d399" />
        <KPICard label="Fee Re-proyecto" value={<DualResult result={fee} />} color="#818cf8" />
      </div>

      <SectionHeader title="Órdenes de Cambio · Control de Adicionales"
        ActionIcon={Plus} actionLabel="Nueva OC"
        onAction={() => { setEditingItem(null); setShowModal(true); }} />

      <DataTable
        columns={columns}
        data={loading ? [] : ordenes}
        emptyMessage={loading ? 'Cargando...' : 'Sin órdenes de cambio. Los adicionales aprobados aparecen aquí.'}
        accentColor="rose"
      />

      {showModal && (
        <OCModal
          nextNum={nextOCNum} initialData={editingItem}
          onSave={async (data) => {
            if (editingItem) { await update(editingItem.id, data); }
            else { await add(data); }
            setShowModal(false); setEditingItem(null);
          }}
          onClose={() => { setShowModal(false); setEditingItem(null); }}
        />
      )}
    </div>
  );
}

function OCModal({ nextNum, initialData, onSave, onClose }) {
  const [form, setForm] = useState(initialData || {
    numero: nextNum, fecha: new Date().toISOString().slice(0, 10),
    descripcion: '', motivo: 'solicitud_cliente', moneda: 'ARS',
    monto_adicional: '', fee_reproye_pct: 15, tc_manual: '', notas: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const monto    = parseFloat(form.monto_adicional) || 0;
  const feeMonto = monto * (form.fee_reproye_pct / 100);
  const tcUsado  = parseFloat(form.tc_manual) || null;

  return (
    <Modal
      title={initialData ? 'Editar OC' : 'Nueva Orden de Cambio'}
      onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={async () => { setSaving(true); await onSave({ ...form, monto_adicional: monto, fee_reproye_monto: feeMonto, tc_manual: tcUsado }); setSaving(false); }} disabled={saving || !monto}>
          <Save size={13} /> {saving ? 'Guardando...' : 'Guardar OC'}
        </button>
      </>}
    >
      <div className="grid-2" style={{ gap: 14 }}>
        <div>
          <label className="label">Número OC</label>
          <input className="input" value={form.numero} onChange={e => set('numero', e.target.value)} />
        </div>
        <div>
          <label className="label">Fecha</label>
          <input className="input" type="date" value={form.fecha || ''} onChange={e => set('fecha', e.target.value)} />
        </div>
        <div>
          <label className="label">Motivo</label>
          <SearchableSelect className="input" value={form.motivo} onChange={e => set('motivo', e.target.value)}>
            {MOTIVOS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
          </SearchableSelect>
        </div>
        <div>
          <label className="label">TC manual (ARS/USD)</label>
          <p style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>Opcional — si no, usa TC promedio de la obra</p>
          <input className="input" type="number" step="1" placeholder="Ej: 1320"
            value={form.tc_manual || ''} onChange={e => set('tc_manual', e.target.value)} style={{ textAlign: 'right' }} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="label">Descripción del adicional</label>
          <input className="input" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Descripción detallada del cambio solicitado..." />
        </div>
        <div>
          <label className="label">Monto Adicional</label>
          <input className="input" type="number" value={form.monto_adicional} onChange={e => set('monto_adicional', e.target.value)} style={{ textAlign: 'right' }} />
        </div>
        <div>
          <label className="label">Moneda</label>
          <SearchableSelect className="input" value={form.moneda} onChange={e => set('moneda', e.target.value)}>
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
          </SearchableSelect>
        </div>
        <div>
          <label className="label">Fee Re-proyecto %</label>
          <input className="input" type="number" step="0.5" value={form.fee_reproye_pct} onChange={e => set('fee_reproye_pct', parseFloat(e.target.value) || 0)} style={{ textAlign: 'right' }} />
        </div>
      </div>

      {monto > 0 && (
        <div style={{ marginTop: 16, padding: '14px 18px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 9, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Monto adicional</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#f87171', fontFamily: 'monospace' }}>{form.moneda === 'USD' ? 'u$d' : '$'} {monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
              {tcUsado && form.moneda === 'ARS' && (
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>≈ u$d {(monto / tcUsado).toLocaleString('es-AR', { minimumFractionDigits: 2 })} @ {tcUsado}</div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Fee Re-proyecto {form.fee_reproye_pct}%</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#818cf8', fontFamily: 'monospace' }}>{form.moneda === 'USD' ? 'u$d' : '$'} {feeMonto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Total al cliente</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#34d399', fontFamily: 'monospace' }}>{form.moneda === 'USD' ? 'u$d' : '$'} {(monto + feeMonto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
