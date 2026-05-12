import React, { useState } from 'react';
import { Plus, ClipboardList, Check, Edit2, Trash2, FileText, Download } from 'lucide-react';
import { useCertificaciones, useContratistas, useTcGlobal, useMovimientosMain, useOrdenesCambio } from '../../hooks/useObras.js';
import { fmt, sumarEquiv, calcMargenDARQ } from '../../lib/calculadora.jsx';
import { DualAmt, SectionHeader } from '@darq/ui';
import { openPDF, downloadPDF } from '../../components/ComprobanteUploader.jsx';
import CertificacionModal from './certificaciones/NuevaCertificacionModal.jsx';
import PagoClienteModal   from './certificaciones/PagoClienteModal.jsx';

// Soporta ambos formatos: aprobada:bool (nuevo) y estado:'aprobada' (legacy)
const isAprobada = (c) => !!(c.aprobada || c.estado === 'aprobada');

// Fila de dato dentro de un KPI card: label apagado + valor monospace coloreado
function KpiRow({ label, value, valueColor = '#e2e8f0', labelColor = '#64748b', bold = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 10, color: labelColor, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: bold ? 13 : 12, fontWeight: bold ? 900 : 700, color: valueColor, fontFamily: 'monospace' }}>
        {value}
      </span>
    </div>
  );
}


// Calcula el margen D+ARQ proporcional al avance certificado

export default function TabCertificaciones({ obraId, config }) {
  const { certificaciones, loading, add, update, remove, approve } = useCertificaciones(obraId);
  const { contratistas } = useContratistas(obraId);
  const { tc }           = useTcGlobal(obraId);
  const { movimientos: movsMain } = useMovimientosMain(obraId);
  const { ordenes }      = useOrdenesCambio(obraId);
  const [showModal, setShowModal]   = useState(false);
  const [editingCert, setEditingCert] = useState(null);
  const [pagoTarget, setPagoTarget]   = useState(null);

  const retencionPct = config?.retencion_reparo_pct ?? 5;
  const bruto    = sumarEquiv(certificaciones, tc, 'monto_bruto');
  const retencion= sumarEquiv(certificaciones, tc, 'retencion_reparo');
  const neto     = sumarEquiv(certificaciones, tc, 'monto_neto');

  // CAC total certificado
  const cacTotal = certificaciones.reduce((s, c) => s + (parseFloat(c.monto_cac) || 0), 0);

  // Presupuesto: base de contratistas + adicionales aprobados
  const presupBase = contratistas.reduce((s, c) => s + (parseFloat(c.costo_real) || 0), 0);
  const adicionales = ordenes
    .filter(o => o.estado === 'aprobada_cliente')
    .reduce((s, o) => s + (parseFloat(o.monto_adicional) || 0), 0);
  const presupTotal = presupBase + adicionales;
  const saldoPresup = presupTotal - bruto.ars;

  // Vista cliente: presupuesto_cliente (lo que el cliente paga por cada contratista)
  const presupCliente    = contratistas.reduce((s, c) => s + (parseFloat(c.presupuesto_cliente) || 0), 0);
  const totalSinIva      = certificaciones.reduce((s, c) => s + (parseFloat(c.total_sin_iva) || 0), 0);
  const ivaTotal         = certificaciones.reduce((s, c) => s + (parseFloat(c.iva_monto) || 0), 0);
  // El CAC no descuenta del presupuesto del contrato — lo separamos para el saldo
  const avanceSinIva     = totalSinIva - cacTotal;  // solo avance+margen, sin CAC
  const saldoCliente     = presupCliente - avanceSinIva;

  // KPIs margen
  const margenTotal = certificaciones.reduce((s, c) => s + (c.margen_darq || calcMargenDARQ(c, contratistas)), 0);

  // Margen cobrado = ingresos del sistema principal con rubro "Retornos de Proveedores"
  // (o cualquier variante de ese nombre — case-insensitive)
  const RUBRO_RETORNO = /retorno/i;
  const margenCobradoReal = movsMain
    .filter(m => m.tipo === 'Ingreso' && RUBRO_RETORNO.test(m.rubro || ''))
    .reduce((s, m) => s + (parseFloat(m.monto) || 0), 0);
  // Fallback al toggle manual si aún no hay asientos vinculados
  const margenCobradoToggle = certificaciones.filter(c => c.margen_cobrado).reduce((s, c) => s + (c.margen_darq || 0), 0);
  const margenCobrado = margenCobradoReal || margenCobradoToggle;

  const toggleMargen = (c) => update(c.id, {
    margen_cobrado: !c.margen_cobrado,
    margen_cobrado_fecha: !c.margen_cobrado ? new Date().toISOString().slice(0, 10) : null,
  });

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>

        {/* ── KPI 1: Presupuesto contratista ── */}
        <div className="kpi" style={{ borderColor: 'rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.05)', padding: '0', overflow: 'hidden' }}>
          {/* Título */}
          <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 3, height: 16, borderRadius: 2, background: '#818cf8', flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Presupuesto contratista
            </span>
          </div>
          {/* Filas */}
          <div style={{ padding: '10px 16px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            <KpiRow label="Certificado (avance)" value={fmt(bruto.ars)} />
            {retencion.ars > 0 && <KpiRow label={`Fondo reparo ${retencionPct}%`} value={`- ${fmt(retencion.ars)}`} valueColor="#f87171" labelColor="#f87171" />}
            {retencion.ars > 0 && <KpiRow label="Neto a cobrar" value={fmt(bruto.ars - retencion.ars)} valueColor="#34d399" />}
            <KpiRow label={adicionales > 0 ? `Presupuesto +${fmt(adicionales)} adic.` : 'Presupuesto'} value={fmt(presupTotal)} valueColor="#818cf8" />
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 7 }}>
              <KpiRow label="Saldo presupuesto" value={fmt(saldoPresup)} valueColor={saldoPresup >= 0 ? '#34d399' : '#f87171'} bold />
            </div>
            {presupTotal > 0 && (
              <div style={{ fontSize: 9, color: '#475569', textAlign: 'right' }}>
                {((bruto.ars / presupTotal) * 100).toFixed(1)}% ejecutado
              </div>
            )}
          </div>
        </div>

        {/* ── KPI 2: Pagos del cliente ── */}
        <div className="kpi" style={{ borderColor: 'rgba(52,211,153,0.25)', background: 'rgba(52,211,153,0.05)', padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 3, height: 16, borderRadius: 2, background: '#34d399', flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Pagos del cliente
            </span>
          </div>
          <div style={{ padding: '10px 16px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            <KpiRow label="Presupuesto cliente" value={fmt(presupCliente)} valueColor="#34d399" bold />
            <KpiRow label="Avance cert. s/IVA" value={fmt(avanceSinIva)} />
            {cacTotal > 0 && <KpiRow label="CAC (no descuenta pres.)" value={fmt(cacTotal)} valueColor="#fbbf24" labelColor="#fbbf24" />}
            {ivaTotal > 0 && <KpiRow label="IVA" value={fmt(ivaTotal)} valueColor="#94a3b8" />}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 7 }}>
              <KpiRow label="Saldo s/IVA" value={fmt(saldoCliente)} valueColor={saldoCliente >= 0 ? '#34d399' : '#f87171'} bold />
            </div>
            {presupCliente > 0 && (
              <div style={{ fontSize: 9, color: '#475569', textAlign: 'right' }}>
                {((avanceSinIva / presupCliente) * 100).toFixed(1)}% del presupuesto facturado
              </div>
            )}
          </div>
        </div>

        {/* ── KPI 3: Margen D+ARQ ── */}
        <div className="kpi" style={{ borderColor: 'rgba(129,140,248,0.25)', background: 'rgba(129,140,248,0.05)', padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid rgba(129,140,248,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 3, height: 16, borderRadius: 2, background: '#a78bfa', flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Margen D+ARQ ★
            </span>
          </div>
          <div style={{ padding: '10px 16px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            <KpiRow label="Estimado" value={fmt(margenTotal, 'ARS')} valueColor="#818cf8" />
            <KpiRow label="Cobrado" value={margenCobrado > 0 ? fmt(margenCobrado, 'ARS') : '—'} valueColor={margenCobrado > 0 ? '#34d399' : '#475569'} />
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 7 }}>
              <KpiRow label="Saldo" value={fmt(margenTotal - margenCobrado, 'ARS')} valueColor={(margenTotal - margenCobrado) <= 0 ? '#34d399' : '#fbbf24'} bold />
            </div>
            {margenCobradoReal > 0 && (
              <div style={{ fontSize: 9, color: '#475569', textAlign: 'right' }}>● desde asientos del sistema</div>
            )}
          </div>
        </div>
      </div>

      <SectionHeader
        title="Certificaciones · Avance Físico"
        ActionIcon={Plus}
        actionLabel="Nueva certificación"
        onAction={() => { setEditingCert(null); setShowModal(true); }}
      />

      <div className="glass" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Fecha</th>
                <th style={{ width: 40, textAlign: 'center' }}>N°</th>
                <th>Contratista</th>
                <th>Descripción</th>
                <th style={{ textAlign: 'right', color: '#34d399' }}>Neto</th>
                <th style={{ textAlign: 'right', color: '#fbbf24', width: 90 }}>CAC</th>
                <th style={{ textAlign: 'right', color: '#60a5fa' }}>Cliente c/IVA</th>
                <th style={{ textAlign: 'center', width: 110 }}>Estado</th>
                <th style={{ textAlign: 'right', color: '#818cf8' }}>Margen D+ARQ</th>
                <th style={{ width: 70 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Cargando...</td></tr>
              ) : certificaciones.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
                    <ClipboardList size={28} style={{ marginBottom: 10, opacity: 0.3 }} />
                    <div style={{ fontSize: 12 }}>Sin certificaciones. Registrá el primer avance.</div>
                  </td>
                </tr>
              ) : certificaciones.map(c => {
                const margenEst = c.margen_darq ?? calcMargenDARQ(c, contratistas);
                const ct = contratistas.find(ct => ct.id === c.contratista_id);
                const moneda = c.moneda || ct?.moneda || 'ARS';
                const aprobada = isAprobada(c);
                const pagado = c.pago_cliente_estado === 'pagado';

                // Detectar si este cert tiene retiro de margen registrado en asientos
                const margenAsiento = movsMain
                  .filter(m => m.tipo === 'Ingreso' && RUBRO_RETORNO.test(m.rubro || '') && m.monto > 0)
                  .reduce((s, m) => s + (parseFloat(m.monto) || 0), 0);
                // Por ahora el margen cobrado viene del campo manual como fallback
                const margenCobradoEste = c.margen_cobrado;

                return (
                  <tr key={c.id} style={{ opacity: aprobada ? 1 : 0.65 }}>

                    {/* Fecha */}
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>
                      {c.fecha
                        ? new Date(c.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                        : c.periodo || '—'
                      }
                    </td>

                    {/* N° */}
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>
                      {c.numero_cert ? `#${c.numero_cert}` : '—'}
                    </td>

                    {/* Contratista */}
                    <td style={{ fontWeight: 700, fontSize: 12 }}>
                      {ct?.contratista || c.contratista_nombre || '-'}
                      {c.tiene_cac && <span className="badge badge-amber" style={{ fontSize: 8, marginLeft: 4 }}>+CAC</span>}
                    </td>

                    {/* Descripción */}
                    <td style={{ color: '#94a3b8', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                      {c.descripcion || '-'}
                    </td>

                    {/* Neto (avance − retención) — con retención inline si aplica */}
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12, fontWeight: 800, color: '#34d399' }}>
                      <DualAmt monto={c.monto_neto} monedaOrig={moneda} tc={tc} />
                      {c.retencion_reparo > 0 && (
                        <div style={{ fontSize: 9, color: '#f87171', fontWeight: 600, marginTop: 1 }}>
                          − {fmt(c.retencion_reparo, moneda)} reparo
                        </div>
                      )}
                    </td>

                    {/* CAC */}
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 11, color: '#fbbf24' }}>
                      {c.monto_cac > 0 ? <DualAmt monto={c.monto_cac} monedaOrig={moneda} tc={tc} /> : <span style={{ color: '#334155' }}>—</span>}
                    </td>

                    {/* Cliente c/IVA */}
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: '#60a5fa', fontWeight: 700 }}>
                      {c.total_con_iva
                        ? <DualAmt monto={c.total_con_iva} monedaOrig={moneda} tc={tc} />
                        : <span style={{ color: '#334155', fontSize: 10 }}>—</span>
                      }
                    </td>

                    {/* Estado pago cliente — badge clickeable */}
                    <td style={{ textAlign: 'center' }}>
                      {!aprobada ? (
                        <span style={{ fontSize: 9, color: '#475569', fontWeight: 700 }}>Sin aprobar</span>
                      ) : pagado ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <button
                            onClick={() => update(c.id, { pago_cliente_estado: 'pendiente', pago_cliente_fecha: null })}
                            className="badge badge-green"
                            style={{ cursor: 'pointer', border: 'none', fontSize: 10 }}
                            title={`Pagado el ${c.pago_cliente_fecha || '?'} · Click para revertir`}
                          >
                            ✓ Pagado
                          </button>
                          {c.comprobante_b64 && (
                            <div style={{ display: 'flex', gap: 3 }}>
                              <button
                                onClick={() => openPDF(c.comprobante_b64)}
                                title="Ver comprobante"
                                style={{ background: 'rgba(56,189,248,0.1)', border: 'none', cursor: 'pointer', color: '#38bdf8', borderRadius: 5, padding: '2px 6px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 2 }}
                              >
                                <FileText size={10} /> Ver
                              </button>
                              <button
                                onClick={() => downloadPDF(c.comprobante_b64, c.comprobante_nombre || 'comprobante.pdf')}
                                title="Descargar comprobante"
                                style={{ background: 'rgba(52,211,153,0.1)', border: 'none', cursor: 'pointer', color: '#34d399', borderRadius: 5, padding: '2px 6px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 2 }}
                              >
                                <Download size={10} /> Bajar
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setPagoTarget(c)}
                          className="badge badge-gray"
                          style={{ cursor: 'pointer', border: 'none', fontSize: 10 }}
                          title="Registrar pago del cliente"
                        >
                          ⏳ Registrar pago
                        </button>
                      )}
                    </td>

                    {/* Margen D+ARQ — desde asientos, sin toggle */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                        <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#818cf8', fontWeight: 800 }}>
                          {fmt(margenEst, moneda)}
                        </span>
                        {margenCobradoEste ? (
                          <span className="badge badge-green" style={{ fontSize: 9 }}>✓ Cobrado</span>
                        ) : margenAsiento > 0 ? (
                          <span className="badge badge-green" style={{ fontSize: 9 }}>✓ Asiento</span>
                        ) : (
                          <span className="badge badge-gray" style={{ fontSize: 9 }}>Pendiente</span>
                        )}
                      </div>
                    </td>

                    {/* Acciones */}
                    <td>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {!aprobada && (
                          <button className="btn btn-success btn-sm" style={{ fontSize: 10 }}
                            onClick={() => approve(c.id)}>
                            <Check size={11} /> Aprobar
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm" style={{ padding: '0 6px', color: '#94a3b8' }}
                          onClick={() => { setEditingCert(c); setShowModal(true); }}>
                          <Edit2 size={13} />
                        </button>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '0 6px', color: '#f87171' }}
                          onClick={() => {
                            if (window.confirm(`¿Eliminás la certificación ${c.numero_cert ? '#' + c.numero_cert : ''} de ${c.contratista_nombre || '?'}?`))
                              remove(c.id);
                          }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal certificación */}
      {showModal && (
        <CertificacionModal
          contratistas={contratistas}
          retencionPct={retencionPct}
          initialData={editingCert}
          onSave={async (data) => {
            try {
              if (editingCert) await update(editingCert.id, data);
              else await add(data);
              setShowModal(false); setEditingCert(null);
            } catch (err) {
              console.error('[TabCertificaciones] Error al guardar:', err);
              throw err;
            }
          }}
          onClose={() => { setShowModal(false); setEditingCert(null); }}
        />
      )}

      {/* Modal pago cliente */}
      {pagoTarget && (
        <PagoClienteModal
          cert={pagoTarget}
          contratistas={contratistas}
          onSave={async (data) => { await update(pagoTarget.id, data); setPagoTarget(null); }}
          onClose={() => setPagoTarget(null)}
        />
      )}
    </div>
  );
}

// ── Modal nueva certificación (modelo bottom-up) ──────────────────
