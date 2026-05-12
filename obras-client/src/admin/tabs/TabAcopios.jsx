import React, { useState } from 'react';
import { Plus, Package } from 'lucide-react';
import { useAcopios, useTcGlobal } from '../../hooks/useObras.js';
import { fmt, sumarEquiv } from '../../lib/calculadora.jsx';
import { DualAmt, DualResult, KPICard, SectionHeader, DataTable } from '@darq/ui';
import AcopioModal from './acopios/AcopioModal.jsx';

export default function TabAcopios({ obraId, config }) {
  const { acopios, loading, add, update, remove } = useAcopios(obraId);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const { tc } = useTcGlobal(obraId);

  const comprado = sumarEquiv(acopios.map(a => ({ ...a, monto: (a.cantidad_comprada || 0) * (a.precio_unitario || 0) })), tc);
  const enAcopio = sumarEquiv(acopios.map(a => ({ ...a, monto: ((a.cantidad_comprada || 0) - (a.cantidad_entregada || 0)) * (a.precio_unitario || 0) })), tc);

  // Enriquecer data con campos calculados
  const data = acopios.map(a => {
    const enAcopioQty = (a.cantidad_comprada || 0) - (a.cantidad_entregada || 0);
    const capitalAcopiado = enAcopioQty * (a.precio_unitario || 0);
    const pct = a.cantidad_comprada > 0 ? Math.round((a.cantidad_entregada / a.cantidad_comprada) * 100) : 0;
    return { ...a, _enAcopio: enAcopioQty, _capitalAcopiado: capitalAcopiado, _pct: pct };
  });

  // ── Columnas para DataTable ──
  const columns = [
    {
      key: 'material', label: 'Material', sortable: true, filterable: true,
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 700 }}>{row.taxonomia_concepto || val || '—'}</div>
          {row.taxonomia_rubro_nombre && (
            <div style={{ fontSize: 10, color: '#818cf8', fontWeight: 600 }}>{row.taxonomia_rubro_nombre}</div>
          )}
          {val && row.taxonomia_concepto && val !== row.taxonomia_concepto && (
            <div style={{ fontSize: 11, color: '#64748b' }}>{val}</div>
          )}
        </div>
      ),
    },
    {
      key: 'proveedor', label: 'Proveedor', filterable: true,
      render: (val) => <span style={{ color: '#64748b', fontSize: 12 }}>{val || '-'}</span>,
    },
    {
      key: 'cantidad_comprada', label: 'Comprado', sortable: true, align: 'right',
      render: (val) => <span style={{ fontFamily: 'monospace' }}>{(val || 0).toLocaleString('es-AR')}</span>,
    },
    {
      key: 'cantidad_entregada', label: 'Entregado', align: 'right',
      render: (val, row) => (
        <input type="number" value={row.cantidad_entregada || 0}
          onChange={e => update(row.id, { cantidad_entregada: parseFloat(e.target.value) || 0 })}
          style={{ width: 80, textAlign: 'right', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 8px', color: '#e2e8f0', fontSize: 12 }} />
      ),
    },
    {
      key: '_enAcopio', label: 'En Acopio', sortable: true, align: 'right',
      render: (val) => <span style={{ color: '#fbbf24', fontWeight: 700, fontFamily: 'monospace' }}>{val.toLocaleString('es-AR')}</span>,
    },
    {
      key: 'unidad', label: 'Unidad', filterable: true,
      render: (val) => <span style={{ color: '#64748b' }}>{val}</span>,
    },
    {
      key: 'precio_unitario', label: 'P. Unitario', sortable: true, align: 'right',
      render: (val, row) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
          <DualAmt monto={row.precio_unitario} monedaOrig={row.moneda} tc={tc} />
        </span>
      ),
    },
    {
      key: '_capitalAcopiado', label: 'Capital Acopiado', sortable: true, align: 'right',
      render: (val, row) => (
        <span style={{ color: '#fbbf24', fontWeight: 800, fontFamily: 'monospace' }}>
          <DualAmt monto={row._capitalAcopiado} monedaOrig={row.moneda} tc={tc} />
        </span>
      ),
    },
    {
      key: '_pct', label: 'Avance', align: 'right',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', minWidth: 80 }}>
          <div className="progress-bar" style={{ width: 60 }}>
            <div className="progress-fill" style={{ width: `${row._pct}%`, background: row._pct === 100 ? '#34d399' : '#6366f1' }} />
          </div>
          <span style={{ fontSize: 11, color: '#64748b' }}>{row._pct}%</span>
        </div>
      ),
    },
    {
      key: '_actions', label: '',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" style={{ padding: '0 6px', color: '#94a3b8' }}
            onClick={() => { setEditingItem(row); setShowModal(true); }}>✏️</button>
          <button className="btn btn-ghost btn-sm" style={{ padding: '0 6px', color: '#f87171' }}
            onClick={() => { if(window.confirm('¿Eliminar acopio?')) remove(row.id); }}>🗑️</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <KPICard label="Capital en Acopio" value={<DualResult result={enAcopio} />} sub="Protegido contra inflación" color="#fbbf24" />
        <KPICard label="Total Comprado" value={<DualResult result={comprado} />} />
        <KPICard label="Ítems en seguimiento" value={acopios.length} />
      </div>

      <SectionHeader title="Acopios · Tracking de Stock"
        ActionIcon={Plus} actionLabel="Nuevo acopio"
        onAction={() => { setEditingItem(null); setShowModal(true); }} />

      <DataTable
        columns={columns}
        data={loading ? [] : data}
        emptyMessage={loading ? 'Cargando...' : 'Sin acopios. Registrá materiales comprados para proteger capital.'}
        accentColor="amber"
      />

      {showModal && (
        <AcopioModal
          initialData={editingItem}
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
