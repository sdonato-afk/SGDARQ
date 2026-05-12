import React from 'react';
import { TrendingUp, DollarSign } from 'lucide-react';
import { useTransacciones, useContratistas, useLogistica, useHonorarios, useTcGlobal } from '../hooks/useObras.js';
import { calcularRentabilidadReal, fmt } from '../lib/calculadora.jsx';
import { DataTable } from '@darq/ui';

export default function DashboardRentabilidad({ obraId, config }) {
  const { transacciones } = useTransacciones(obraId);
  const { contratistas }  = useContratistas(obraId);
  const { logistica }     = useLogistica(obraId);
  const { honorarios }    = useHonorarios(obraId);
  const { tc }            = useTcGlobal(obraId);

  const rentabilidad = calcularRentabilidadReal({ transacciones, contratistas, logistica, honorarios, tc });

  const items = [
    { label: 'Fees de Gestión (Materiales)', value: rentabilidad.fees, color: '#818cf8', desc: `${config?.fee_gestion_pct ?? 12}% sobre todas las facturas` },
    { label: 'Margen MO Back-to-Back', value: rentabilidad.margenMO, color: '#34d399', desc: 'Presupuesto cliente − Costo real contratistas' },
    { label: 'Logística Acumulada', value: rentabilidad.logistica, color: '#fbbf24', desc: 'Cargo semanal × semanas activas' },
    { label: 'Honorarios Generados', value: rentabilidad.honorarios, color: '#f472b6', desc: 'Proyecto + Dirección + Administración' },
  ];

  const pctItems = items.map(i => ({
    ...i,
    pct: rentabilidad.total > 0 ? (i.value / rentabilidad.total) * 100 : 0,
  }));

  // ── Columnas para la tabla de contratistas ──
  const columns = [
    {
      key: 'contratista', label: 'Contratista', sortable: true, filterable: true,
      render: (val) => <span style={{ fontWeight: 600 }}>{val}</span>,
    },
    {
      key: 'rubro', label: 'Rubro', filterable: true,
      render: (val) => <span className="badge badge-gray">{val}</span>,
    },
    {
      key: 'presupuesto_cliente', label: 'Presup. Cliente', sortable: true, align: 'right',
      render: (val, row) => <span style={{ color: '#34d399', fontFamily: 'monospace' }}>{fmt(val, row.moneda)}</span>,
    },
    {
      key: 'costo_real', label: 'Costo Real ★', sortable: true, align: 'right',
      render: (val, row) => <span style={{ color: '#f87171', fontFamily: 'monospace' }}>{fmt(val, row.moneda)}</span>,
    },
    {
      key: 'margen_operativo', label: 'Margen ★', sortable: true, align: 'right',
      render: (val, row) => <span style={{ color: '#818cf8', fontWeight: 800, fontFamily: 'monospace' }}>{fmt(val, row.moneda)}</span>,
    },
    {
      key: 'margen_pct', label: '%', sortable: true, align: 'right',
      render: (val) => <span style={{ color: '#818cf8', fontWeight: 700 }}>{(val || 0).toFixed(1)}%</span>,
    },
  ];

  return (
    <div className="fade-in">
      {/* Aviso privacidad */}
      <div style={{ marginBottom: 24, padding: '12px 16px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <TrendingUp size={16} color="#818cf8" />
        <span style={{ fontSize: 12, color: '#818cf8', fontWeight: 600 }}>
          Vista privada — Solo visible para Sebastián, Santiago y Emiliano. Nunca se comparte con el cliente.
        </span>
      </div>

      {/* Total rentabilidad */}
      <div style={{
        marginBottom: 32, padding: '32px 40px',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(129,140,248,0.06) 100%)',
        border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
          Rentabilidad Real D+ARQ
        </div>
        <div style={{ fontSize: 52, fontWeight: 900, color: rentabilidad.total >= 0 ? '#818cf8' : '#f87171', letterSpacing: '-0.04em', fontFamily: 'monospace' }}>
          {fmt(rentabilidad.total)}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
          Suma de fees + márgenes MO + logística + honorarios
        </div>
      </div>

      {/* Desglose por fuente */}
      <div className="grid-2" style={{ marginBottom: 32 }}>
        {pctItems.map(item => (
          <div key={item.label} className="kpi" style={{ borderColor: `${item.color}30` }}>
            <div className="kpi-label">{item.label}</div>
            <div className="kpi-value" style={{ color: item.color }}>{fmt(item.value)}</div>
            <div className="kpi-sub">{item.desc}</div>
            <div className="progress-bar" style={{ marginTop: 12 }}>
              <div className="progress-fill" style={{ width: `${item.pct}%`, background: item.color }} />
            </div>
            <div style={{ marginTop: 6, fontSize: 10, color: item.color, fontWeight: 700 }}>{item.pct.toFixed(1)}% del total</div>
          </div>
        ))}
      </div>

      {/* Tabla MO detallada */}
      {contratistas.length > 0 && (
        <div>
          <h3 style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>
            Detalle Márgenes por Contratista
          </h3>
          <DataTable
            columns={columns}
            data={contratistas}
            emptyMessage="Sin contratistas."
            accentColor="indigo"
          />
        </div>
      )}
    </div>
  );
}
