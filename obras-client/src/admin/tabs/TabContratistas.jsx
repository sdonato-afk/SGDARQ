import React, { useState } from 'react';
import { Plus, AlertCircle, Clock, FileText } from 'lucide-react';
import { useContratistas, useProveedoresMain, useMovimientosMain, useTcGlobal } from '../../hooks/useObras.js';
import { useCertificaciones } from '../../hooks/useCertificaciones.js';
import { calcularMargenMO, fmt, sumarEquiv } from '../../lib/calculadora.jsx';
import { DualAmt, DualResult, KPICard, SectionHeader, DataTable, SearchableSelect } from '@darq/ui';
import ContratistasModal from './contratistas/ContratistasModal.jsx';
import { generarEstadoCuentaContratista } from '../../lib/pdfContratista.js';

const ESTADOS = ['presupuestado', 'en_ejecucion', 'cerrado'];

export default function TabContratistas({ obraId, config }) {
  const { contratistas, loading, add, update, remove } = useContratistas(obraId);
  const { proveedores, loading: ldProv } = useProveedoresMain();
  const { movimientos, loading: ldMov } = useMovimientosMain(obraId);
  const { certificaciones } = useCertificaciones(obraId);
  const [showModal, setShowModal] = useState(false);
  const [editingContratista, setEditingContratista] = useState(null);

  const { tc } = useTcGlobal(obraId);
  const hoy = new Date();

  let presupCliente = { usd: 0, ars: 0 };
  let costoReal = { usd: 0, ars: 0 };
  let margen = { usd: 0, ars: 0 };
  let pagadoTotal = { usd: 0, ars: 0 };

  for (const c of contratistas) {
    const sp = sumarEquiv([{ monto: c.presupuesto_cliente, moneda: c.moneda }], tc);
    presupCliente.usd += sp.usd; presupCliente.ars += sp.ars;
    const cr = sumarEquiv([{ monto: c.costo_real, moneda: c.moneda }], tc);
    costoReal.usd += cr.usd; costoReal.ars += cr.ars;
    const m = sumarEquiv([{ monto: c.margen_operativo, moneda: c.moneda }], tc);
    margen.usd += m.usd; margen.ars += m.ars;
    // Pagado: movimientos de tesorería SI está linkeado, sino certificaciones neto
    const pagosTesoreria = movimientos.filter(mv => mv.proveedorId === c.proveedor_id && c.proveedor_id);
    if (pagosTesoreria.length > 0) {
      const pg = sumarEquiv(pagosTesoreria, tc);
      pagadoTotal.usd += pg.usd; pagadoTotal.ars += pg.ars;
    } else {
      // Fallback: certificaciones aprobadas = pagos al contratista
      const certsDe = certificaciones.filter(cert => cert.contratista_id === c.id);
      const certNeto = certsDe.reduce((s, cert) => s + (parseFloat(cert.monto_neto) || 0), 0);
      const pgCert = sumarEquiv([{ monto: certNeto, moneda: c.moneda }], tc);
      pagadoTotal.usd += pgCert.usd; pagadoTotal.ars += pgCert.ars;
    }
  }

  const pendiente = { usd: costoReal.usd - pagadoTotal.usd, ars: costoReal.ars - pagadoTotal.ars };

  // Enriquecer data con campos calculados
  const data = contratistas.map(c => {
    const { margen: margenVal, margen_pct } = calcularMargenMO(c.presupuesto_cliente, c.costo_real);
    const pagosArr = movimientos.filter(m => m.proveedorId === c.proveedor_id && c.proveedor_id);
    // Certificaciones de este contratista
    const certsDe = certificaciones.filter(cert => cert.contratista_id === c.id);
    const totalCertNeto = certsDe.reduce((s, cert) => s + (parseFloat(cert.monto_neto) || 0), 0);
    // Pagado: movimientos reales o certificaciones como fallback
    const pg = pagosArr.length > 0
      ? sumarEquiv(pagosArr, tc)
      : sumarEquiv([{ monto: totalCertNeto, moneda: c.moneda }], tc);
    const crUSD = c.moneda === 'USD' ? (c.costo_real || 0) : (c.costo_real / tc);
    const saldoUSD = crUSD - pg.usd;
    const totalCertificado = certsDe.reduce((s, cert) => s + (parseFloat(cert.monto_bruto) || 0), 0);
    const costoRealNum = parseFloat(c.costo_real) || 0;
    const avancePct = costoRealNum > 0 ? Math.min(100, Math.round((totalCertificado / costoRealNum) * 100)) : 0;
    // Retención acumulada
    const retencionAcum = certsDe.reduce((s, cert) => s + (parseFloat(cert.retencion_reparo) || 0), 0);
    // Plazo vencido
    const vencido = c.fecha_fin && c.estado !== 'cerrado' && new Date(c.fecha_fin) < hoy;
    return { ...c, _margen: margenVal, _margen_pct: margen_pct, _pagado: pg, _saldoUSD: saldoUSD, _avancePct: avancePct, _totalCertificado: totalCertificado, _retencionAcum: retencionAcum, _vencido: vencido };
  });

  // ── Columnas para DataTable ──
  const columns = [
    {
      key: 'contratista', label: 'Contratista (Proveedor)', sortable: true, filterable: true,
      render: (val, row) => (
        <div>
          <span style={{ fontWeight: 700 }}>{val}</span>
          {row.proveedor_id && (
            <div style={{ fontSize: 9, color: '#3b82f6', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertCircle size={9}/> Linkeado a caja central
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'rubro', label: 'Rubro', filterable: true,
      render: (val) => <span className="badge badge-blue">{val}</span>,
    },
    {
      key: 'presupuesto_cliente', label: 'Presup. Cliente', sortable: true, align: 'right',
      render: (val, row) => (
        <span style={{ color: '#34d399', fontWeight: 700, fontFamily: 'monospace' }}>
          <DualAmt monto={row.presupuesto_cliente} monedaOrig={row.moneda} tc={tc} />
        </span>
      ),
    },
    {
      key: 'costo_real', label: 'Costo Real ★', sortable: true, align: 'right',
      render: (val, row) => (
        <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>
          <DualAmt monto={row.costo_real} monedaOrig={row.moneda} tc={tc} />
        </span>
      ),
    },
    {
      key: '_pagado', label: 'Pagado ★', align: 'right',
      valueGetter: (row) => {
        const pagosArr = movimientos.filter(m => m.proveedorId === row.proveedor_id && row.proveedor_id);
        const pg = sumarEquiv(pagosArr, tc);
        return String(Math.round(pg.usd));
      },
      render: (_, row) => (
        <span style={{ color: '#3b82f6', fontWeight: 700, fontFamily: 'monospace' }}>
          <DualResult result={row._pagado} />
        </span>
      ),
    },
    {
      key: '_saldoUSD', label: 'Saldo Pendiente ★', sortable: true, align: 'right',
      render: (val, row) => (
        <span style={{ color: row._saldoUSD > 0.01 ? '#f59e0b' : '#34d399', fontWeight: 900, fontFamily: 'monospace' }}>
          <DualResult result={{usd: row._saldoUSD, ars: row._saldoUSD * tc}} />
        </span>
      ),
    },
    {
      key: '_avancePct', label: 'Avance', sortable: true, align: 'center', width: 'w-28',
      render: (val, row) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: row._avancePct === 100 ? '#34d399' : '#f59e0b' }}>{row._avancePct}%</span>
          <div style={{ width: '100%', height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, width: `${row._avancePct}%`, background: row._avancePct === 100 ? '#34d399' : '#f59e0b', transition: 'width 0.5s' }} />
          </div>
        </div>
      ),
    },
    {
      key: '_margen', label: 'Margen ★', align: 'right',
      render: (_, row) => (
        <span style={{ color: '#818cf8', fontWeight: 800, fontFamily: 'monospace' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', gap: 6 }}>
            <span style={{ fontSize: 10, background: 'rgba(129,140,248,0.1)', padding: '2px 4px', borderRadius: 4, marginTop: 2 }}>{row._margen_pct.toFixed(1)}%</span>
            <DualAmt monto={row._margen} monedaOrig={row.moneda} tc={tc} bold />
          </div>
        </span>
      ),
    },
    {
      key: '_retencionAcum', label: 'Retención', align: 'right', width: 'w-28',
      render: (val, row) => (
        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: row._retencionAcum > 0 ? '#f87171' : '#334155' }}>
          {row._retencionAcum > 0 ? fmt(row._retencionAcum, row.moneda) : '—'}
        </span>
      ),
    },
    {
      key: 'estado', label: 'Estado', filterable: true,
      valueGetter: (row) => (row.estado || '').replace('_', ' '),
      render: (val, row) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <SearchableSelect value={row.estado} onChange={e => update(row.id, { estado: e.target.value })}
            style={{ background: 'transparent', border: 'none', color: row.estado === 'cerrado' ? '#34d399' : row.estado === 'en_ejecucion' ? '#818cf8' : '#fbbf24', fontSize: 10, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase' }}>
            {ESTADOS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </SearchableSelect>
          {row._vencido && (
            <span style={{ fontSize: 8, fontWeight: 900, color: '#f87171', background: 'rgba(248,113,113,0.12)', padding: '1px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Clock size={8} /> Vencido
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'fecha_inicio', label: 'Inicio',
      render: (val) => <span style={{ fontSize: 11, color: '#64748b' }}>{val || '-'}</span>,
    },
    {
      key: 'fecha_fin', label: 'Fin',
      render: (val, row) => (
        <span style={{ fontSize: 11, color: row._vencido ? '#f87171' : '#64748b', fontWeight: row._vencido ? 800 : 400 }}>{val || '-'}</span>
      ),
    },
    {
      key: '_actions', label: '', width: 'w-24',
      render: (_, row) => {
        const certsDe = certificaciones.filter(c => c.contratista_id === row.id);
        const pagosArr = movimientos.filter(m => m.proveedorId === row.proveedor_id && row.proveedor_id);
        return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => generarEstadoCuentaContratista(row, certsDe, pagosArr, { obraNombre: config?.nombre || 'Obra', tc })}
            title="Estado de Cuenta PDF"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818cf8', padding: 2 }}
          ><FileText size={13} /></button>
          <button onClick={() => setEditingContratista(row)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 2 }}>✏️</button>
          <button onClick={() => remove(row.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 2 }}>🗑️</button>
        </div>
      );
      },
    },
  ];

  return (
    <div>
      {/* KPIs */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <KPICard label="Presupuesto al Cliente" value={<DualResult result={presupCliente} />}
          sub={`${contratistas.length} contratistas activos`} color="#34d399" />
        <KPICard label="Costo Real D+ARQ ★" value={<DualResult result={costoReal} />} color="#e2e8f0" />
        <KPICard label="Margen de Fee D+ARQ ★"
          value={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <DualResult result={margen} bold />
              <span style={{ fontSize: 13, background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: 10, color: '#818cf8' }}>
                {presupCliente.usd > 0 ? ((margen.usd / presupCliente.usd) * 100).toFixed(1) : 0}%
              </span>
            </div>
          }
          sub="del presupuesto cliente" color="#818cf8"
          borderColor="rgba(99,102,241,0.2)" background="rgba(99,102,241,0.08)" />
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <KPICard label="Total Pagado (Reflejado de Caja Central)" value={<DualResult result={pagadoTotal} />} color="#3b82f6" />
        <KPICard label="Deuda Pendiente a Contratistas ★" value={<DualResult result={pendiente} />}
          color={pendiente.usd > 0 ? '#f59e0b' : '#34d399'} />
      </div>

      <SectionHeader title="Contratistas · Lógica Back-to-Back"
        ActionIcon={Plus} actionLabel="Nuevo contratista"
        onAction={() => { setShowModal(true); setEditingContratista(null); }} />

      <DataTable
        columns={columns}
        data={loading ? [] : data}
        emptyMessage={loading ? 'Cargando...' : 'Sin contratistas. Cargá el primer presupuesto back-to-back.'}
        accentColor="indigo"
      />

      {(showModal || editingContratista) && (
        <ContratistasModal
          proveedores={proveedores}
          initialData={editingContratista}
          onSave={async (data) => {
            if (editingContratista) { await update(editingContratista.id, data); }
            else { await add(data); }
            setShowModal(false); setEditingContratista(null);
          }}
          onClose={() => { setShowModal(false); setEditingContratista(null); }}
        />
      )}
    </div>
  );
}
