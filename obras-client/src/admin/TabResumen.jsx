import React from 'react';
import {
  TrendingUp, AlertCircle, ClipboardList,
  Package, FileUp, ArrowUpRight, Calendar, Wallet
} from 'lucide-react';
import { useResumenFinanciero } from '../hooks/useResumenFinanciero.js';
import { fmt } from '../lib/calculadora.jsx';

// ── KPI Card ──────────────────────────────────────────────────────
function KpiCard({ icon: Icon, color, label, children }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, overflow: 'hidden',
    }}>
      <div style={{
        padding: '9px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 8,
        background: `${color}08`,
      }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={11} color={color} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.09em' }}>{label}</span>
      </div>
      <div style={{ padding: '12px 14px' }}>
        {children}
      </div>
    </div>
  );
}

// ── Monto principal ───────────────────────────────────────────────
function Amount({ value, currency = 'USD', color, size = 17, sub }) {
  return (
    <div style={{ marginBottom: sub ? 2 : 0 }}>
      <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: size, color: color || '#e2e8f0' }}>
        {fmt(value, currency)}
      </div>
      {sub && <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#475569' }}>{sub}</div>}
    </div>
  );
}

// ── Fila de detalle ───────────────────────────────────────────────
function Row({ label, value, currency = 'ARS', color = '#64748b', bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }}>
      <span style={{ fontSize: 10, color: '#475569' }}>{label}</span>
      <span style={{ fontFamily: 'monospace', fontSize: bold ? 12 : 10, fontWeight: bold ? 900 : 600, color }}>
        {fmt(value, currency)}
      </span>
    </div>
  );
}

// ── Barra de progreso ─────────────────────────────────────────────
function Bar({ pct, color = '#34d399', label, right }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ height: '100%', width: `${Math.min(pct || 0, 100)}%`, background: color, borderRadius: 3 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {label && <span style={{ fontSize: 9, color: '#334155' }}>{label}</span>}
        {right && <span style={{ fontSize: 9, color: '#fbbf24', fontWeight: 700 }}>{right}</span>}
      </div>
    </div>
  );
}

// ── Divisor interno ───────────────────────────────────────────────
function Divider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '10px 0' }} />;
}

// ── Encabezado de columna ─────────────────────────────────────────
function ColHeader({ label, sub, accent }) {
  return (
    <div style={{ marginBottom: 16, paddingBottom: 10, borderBottom: `2px solid ${accent}25` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 4, height: 16, background: accent, borderRadius: 2 }} />
        <span style={{ fontSize: 13, fontWeight: 900, color: '#e2e8f0' }}>{label}</span>
      </div>
      {sub && <div style={{ fontSize: 10, color: '#334155', marginTop: 3, marginLeft: 12 }}>{sub}</div>}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────
export default function TabResumen({ obraId, config }) {
  const R = useResumenFinanciero(obraId, config);
  const tc = R.tc;

  // ── Aliases para compatibilidad con el JSX existente ──
  const { facturas, ordenes, acopios, contratistas, certificaciones } = R.raw;
  const markupPct = R.adelantados.markupPct;

  // Honorarios
  const honPactado = R.hon.pactado, totHonEmitido = R.hon.emitido;
  const totHonEmitidoARS = R.hon.emitidoARS;
  const honCobradoUSD = R.hon.cobradoUSD, honCobradoARS = R.hon.cobradoARS;
  const honSaldoARS = R.hon.saldoARS, honPendiente = R.hon.pendiente, honPct = R.hon.pct;
  const honEmitidos = R.hon.emitidos, cobrosHon = R.hon.cobros;

  // Adicionales
  const totAdicional = R.adic.totalUSD, totAdicionalARS = R.adic.totalARS;
  const adicionalesAprobados = R.adic.aprobados;
  const adicAprobadoTotal = R.adic.aprobadoTotal, adicPagadoTotal = R.adic.pagadoTotal;
  const adicPagadoUSD = R.adic.pagadoUSD;
  const adicSaldo = R.adic.saldo, pagosAdicionales = R.adic.pagos;

  // Logística
  const totLogistica = R.log.totalUSD, totLogARS = R.log.totalARS;

  // Adelantados
  const egresosUSD = R.adelantados.egresosUSD, egresosARS = R.adelantados.egresosARS;
  const totalAdelantadoUSD = R.adelantados.totalUSD, totalAdelantadoARS = R.adelantados.totalARS;
  const totalAdelantadoMarkup = R.adelantados.totalMarkupUSD;
  const totalAdelantadoMarkupARS = R.adelantados.totalMarkupARS;

  // Contratistas / Certificaciones
  const presupCliente = R.cert.presupCliente, presupTotal = R.cert.presupTotal;
  const totalSinIva = R.cert.totalSinIva, cacTotal = R.cert.cacTotal, ivaTotal = R.cert.ivaTotal;
  const avanceSinIva = R.cert.avanceSinIva;
  const certPagadasSinIva = R.cert.certPagadasSinIva, certPagadasConIva = R.cert.certPagadasConIva;
  const certPagadasConIvaUSD = R.cert.certPagadasConIvaUSD;
  const saldoCertif = R.cert.saldoCertif, pctCertif = R.cert.pctCertif;
  const perContratista = R.cert.perContratista;

  // Pagos a cuenta
  const pagosACuenta = R.paCuenta.items;
  const paCuentaARS = R.paCuenta.ars, paCuentaUSD = R.paCuenta.usd;

  // Proveedores
  const totProvTotal = R.prov.totalUSD, totProvTotalARS = R.prov.totalARS;
  const totProvPagado = R.prov.pagadoUSD, totProvPagadoARS = R.prov.pagadoARS;
  const totProvPend = R.prov.pendienteUSD, totProvPendARS = R.prov.pendienteARS;

  // Acopios
  const totAcopios = R.acop.totalUSD, totAcopiosARS = R.acop.totalARS;

  // Caja chica
  const fondoCajaRaw = R.cajaChica.fondoRaw, fondoCajaMoneda = R.cajaChica.moneda;
  const balanceCajaNativo = R.cajaChica.balance;

  // KPI Jueves
  const fechaJueves = R.jueves.fecha;
  const juevHonARS = R.jueves.honARS;
  const juevCertUSD = R.jueves.certUSD, certByContratista = R.jueves.certByContratista;
  const certNoPagadas = R.jueves.certNoPagadas;
  const juevPdUSD = R.jueves.pdUSD, pdNoPagados = R.jueves.pdNoPagados;
  const juevAdicUSD = R.jueves.adicUSD;
  const juevTotalARS = R.jueves.totalARS, juevTotalUSD = R.jueves.totalUSD;

  // Helper row para el KPI
  const JRow = ({ label, value, color = '#e2e8f0', sub, indent }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: indent ? '2px 24px 2px 44px' : '4px 24px' }}>
      <span style={{ fontSize: indent ? 10 : 11, color: indent ? '#475569' : '#94a3b8', fontWeight: indent ? 400 : 600 }}>
        {indent && '└ '}{label}
        {sub && <span style={{ marginLeft: 6, fontSize: 9, color: '#334155' }}>{sub}</span>}
      </span>
      <span style={{ fontFamily: 'monospace', fontSize: indent ? 11 : 12, fontWeight: indent ? 600 : 800, color }}>
        {fmt(value * tc, 'ARS')}
      </span>
    </div>
  );

  return (
    <div>
      {/* ═══════════════ KPI JUEVES ═══════════════ */}
      <div style={{
        marginBottom: 28, overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.10) 0%, rgba(129,140,248,0.04) 100%)',
        border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20,
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 24px',
          borderBottom: '1px solid rgba(99,102,241,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={16} color="#818cf8" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Próximo Jueves · {fechaJueves}
              </div>
              <div style={{ fontSize: 10, color: '#475569' }}>Total que el cliente debe transferir</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 900, color: '#818cf8', letterSpacing: '-0.03em' }}>
              {fmt(juevTotalARS, 'ARS')}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#475569' }}>
              {fmt(juevTotalUSD, 'USD')}
            </div>
          </div>
        </div>

        {/* Desglose detallado */}
        <div style={{ padding: '8px 0 12px' }}>
          {/* Honorarios */}
          {juevHonARS > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 24px' }}>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                Honorarios a cobrar
                <span style={{ marginLeft: 6, fontSize: 9, color: '#334155' }}>{honEmitidos.length} emitidos</span>
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800, color: '#818cf8' }}>
                {fmt(juevHonARS, 'ARS')}
              </span>
            </div>
          )}

          {/* Certificaciones por contratista */}
          {juevCertUSD > 0 && (
            <>
              <JRow label="Certificaciones contratistas" value={juevCertUSD} color="#6366f1" sub={`${certNoPagadas.length} pendientes`} />
              {Object.entries(certByContratista).map(([nombre, data]) => (
                <JRow key={nombre} label={nombre} value={data.usd} color="#6366f1" sub={`${data.count} cert.`} indent />
              ))}
            </>
          )}

          {/* Pagos directos */}
          {juevPdUSD > 0 && (
            <JRow label="Compras directas" value={juevPdUSD} color="#fbbf24" sub={`${pdNoPagados.length} facturas`} />
          )}

          {/* Adicionales */}
          {juevAdicUSD > 0 && (
            <JRow label="Adicionales aprobados" value={juevAdicUSD} color="#f87171" sub={`saldo pendiente`} />
          )}

          {/* Separador */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 24px' }} />

          {/* Balance caja chica */}
          <div style={{ padding: '4px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>
              Balance caja chica
              <span style={{ marginLeft: 6, fontSize: 9, color: '#334155' }}>
                fondo {fmt(fondoCajaRaw, fondoCajaMoneda)} − egresos − logística
              </span>
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800, color: balanceCajaNativo >= 0 ? '#34d399' : '#f87171' }}>
              {fmt(balanceCajaNativo, fondoCajaMoneda)}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* ═══════════════ COLUMNA A — D+ARQ ═══════════════ */}
        <div>
          <ColHeader
            label="D+ARQ cobra al cliente"
            sub="Honorarios · Adicionales · Logística · Gastos adelantados"
            accent="#818cf8"
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Honorarios */}
            <KpiCard icon={TrendingUp} color="#818cf8" label="Honorarios">
              {/* Pendiente de pago en ARS — dato prominente */}
              {honSaldoARS > 0 && (
                <>
                  <Amount
                    value={honSaldoARS}
                    currency="ARS"
                    color="#fbbf24"
                    size={20}
                    sub={`≈ ${fmt(honPendiente, 'USD')}`}
                  />
                  <div style={{ fontSize: 9, color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    Saldo pendiente (emitido al TC de emisión − cobrado)
                  </div>
                  <Divider />
                </>
              )}
              <Row label="Presupuesto total" value={honPactado} currency="USD" color="#818cf8" bold />
              <Row label="Emitido (certificados)" value={totHonEmitido} currency="USD" color="#818cf8" />
              {totHonEmitidoARS > 0 && <Row label="  └ emitido al TC de emisión" value={totHonEmitidoARS} color="#818cf8" />}
              <Divider />
              <Row label={`Cobrado (${cobrosHon.length} pago${cobrosHon.length !== 1 ? 's' : ''})`} value={honCobradoARS} currency="ARS" color="#34d399" bold />
              {honCobradoUSD > 0 && <Row label="  └ equiv. USD" value={honCobradoUSD} currency="USD" color="#475569" />}
              <Divider />
              <Row label="Pendiente a emitir" value={Math.max(0, honPactado - totHonEmitido)} currency="USD" color="#64748b" />
              <Row label="Saldo a cobrar (ARS)" value={honSaldoARS} color={honSaldoARS > 0 ? '#fbbf24' : '#34d399'} bold />
              <Bar pct={honPct} color="#818cf8" label={`${honPct.toFixed(0)}% cobrado`} />
            </KpiCard>

            {/* Fee re-proyecto */}
            <KpiCard icon={AlertCircle} color="#f87171" label="Adicionales">
              {totAdicional > 0
                ? <Amount value={totAdicionalARS} currency="ARS" color="#f87171" sub={fmt(totAdicional, 'USD')} />
                : <div style={{ fontSize: 11, color: '#334155' }}>Sin adicionales aprobados</div>
              }
              {adicionalesAprobados.length > 0 && (
                <Row label={`${adicionalesAprobados.length} OC aprobadas`} value={totAdicionalARS} currency="ARS" color="#f87171" />
              )}
            </KpiCard>

            {/* Pagos adelantados D+ARQ (egresos + logística) */}
            <KpiCard icon={ArrowUpRight} color="#60a5fa" label="Pagos adelantados D+ARQ">
              <Amount
                value={totalAdelantadoMarkupARS}
                currency="ARS"
                color="#60a5fa"
                sub={`${fmt(totalAdelantadoMarkup, 'USD')} · costo real: ${fmt(totalAdelantadoARS, 'ARS')} · markup ${markupPct}%`}
              />
              <Divider />
              <Row label="Egresos del sistema" value={egresosARS} currency="ARS" color="#94a3b8" />
              {egresosUSD > 0 && <Row label="  └ en USD" value={egresosUSD} currency="USD" color="#475569" />}
              <Row label={`Logística (${R.log.semanas} semanas)`} value={totLogARS} currency="ARS" color="#34d399" />
              {totLogistica > 0 && <Row label="  └ en USD" value={totLogistica} currency="USD" color="#475569" />}
              <Divider />
              <Row label="Fondo caja chica" value={fondoCajaRaw} currency={fondoCajaMoneda} color="#64748b" />
              <Row
                label="Balance disponible"
                value={balanceCajaNativo}
                currency={fondoCajaMoneda}
                color={balanceCajaNativo >= 0 ? '#34d399' : '#f87171'}
                bold
              />
            </KpiCard>

          </div>
        </div>

        {/* ═══════════════ COLUMNA B — Cliente paga directo ═══════════════ */}
        <div>
          <ColHeader
            label="Cliente paga directo"
            sub="Contratistas · Proveedores · Acopios"
            accent="#6366f1"
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Contratistas */}
            <KpiCard icon={ClipboardList} color="#6366f1" label="Contratistas">
              {/* Mini-tabla por contratista */}
              {perContratista.length > 0 && (
                <>
                  {/* Header de la tabla */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1.2fr repeat(3, minmax(70px, 1fr))',
                    padding: '0 0 5px', marginBottom: 2,
                    borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 8, fontWeight: 800,
                    color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>
                    <div>Contratista</div>
                    <div style={{ textAlign: 'right' }}>Certificado</div>
                    <div style={{ textAlign: 'right' }}>Presupuesto</div>
                    <div style={{ textAlign: 'right' }}>Saldo</div>
                  </div>
                  {/* Filas */}
                  {perContratista.map(c => (
                    <div key={c.nombre} style={{
                      display: 'grid', gridTemplateColumns: '1.2fr repeat(3, minmax(70px, 1fr))',
                      padding: '3px 0', fontSize: 10, borderBottom: '1px solid rgba(255,255,255,0.03)',
                    }}>
                      <div style={{ color: '#e2e8f0', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre}</div>
                      <div style={{ textAlign: 'right', fontFamily: 'monospace', color: '#34d399', fontWeight: 700 }}>{fmt(c.certificado, 'ARS')}</div>
                      <div style={{ textAlign: 'right', fontFamily: 'monospace', color: '#818cf8', fontWeight: 700 }}>{fmt(c.presupuesto, 'ARS')}</div>
                      <div style={{ textAlign: 'right', fontFamily: 'monospace', color: c.saldo >= 0 ? '#64748b' : '#f87171', fontWeight: 800 }}>{fmt(c.saldo, 'ARS')}</div>
                    </div>
                  ))}
                  <Divider />
                </>
              )}

              {/* Totales globales */}
              {cacTotal > 0 && <Row label="Total CAC" value={cacTotal} currency="ARS" color="#fbbf24" />}
              {ivaTotal > 0 && <Row label="Total IVA" value={ivaTotal} currency="ARS" color="#64748b" />}
              <Row label="Total pagado (con IVA)" value={certPagadasConIva} currency="ARS" color="#34d399" bold />
              <Row label="Total pagado (sin IVA)" value={certPagadasSinIva} currency="ARS" color="#34d399" />
              {saldoCertif > 0 && (
                <Row label="Pendiente de pago" value={saldoCertif} currency="ARS" color="#fbbf24" bold />
              )}
              <Bar pct={pctCertif} color="#6366f1" label={`${pctCertif.toFixed(0)}% del presupuesto certificado`} />
            </KpiCard>

            {/* Adicionales — cruzado con movimientos del sistema principal */}
            {adicAprobadoTotal > 0 && (
              <KpiCard icon={Package} color="#f87171" label="Adicionales">
                <Amount value={adicAprobadoTotal} currency="ARS" color="#f87171" sub={fmt(totAdicional, 'USD')} />
                <Divider />
                <Row label={`Pagado (${pagosAdicionales.length} pago${pagosAdicionales.length !== 1 ? 's' : ''} registrado${pagosAdicionales.length !== 1 ? 's' : ''})`} value={adicPagadoTotal} currency="ARS" color="#34d399" />
                <Row label="Saldo pendiente" value={adicSaldo} currency="ARS" color={adicSaldo > 0 ? '#fbbf24' : '#34d399'} bold />
              </KpiCard>
            )}

            {/* Pagos a cuenta */}
            {pagosACuenta.length > 0 && (
              <KpiCard icon={Wallet} color="#60a5fa" label="Pagos a Cuenta (Adelantos)">
                <Amount value={paCuentaARS > 0 ? paCuentaARS : paCuentaUSD * tc} currency="ARS" color="#60a5fa" />
                {paCuentaUSD > 0 && <Row label="└ Registrado en USD" value={paCuentaUSD} currency="USD" color="#475569" />}
                <Row label={`${pagosACuenta.length} movimiento${pagosACuenta.length !== 1 ? 's' : ''}`} value="" color="#334155" />
              </KpiCard>
            )}

            {/* Proveedores / Compras directas */}
            <KpiCard icon={FileUp} color="#fbbf24" label="Proveedores / Compras directas">
              {totProvTotal > 0 ? (
                <>
                  <Amount value={totProvTotalARS} currency="ARS" color="#fbbf24" sub={`${fmt(totProvTotal, 'USD')} · Pagado: ${fmt(totProvPagadoARS, 'ARS')}`} />
                  <Row label="Pendiente de pago" value={totProvPendARS} currency="ARS" color={totProvPend > 0 ? '#fbbf24' : '#34d399'} bold />
                  {totProvPend > 0 && <Row label="  └ en USD" value={totProvPend} currency="USD" color="#475569" />}
                  <Bar
                    pct={totProvTotal > 0 ? (totProvPagado / totProvTotal) * 100 : 0}
                    color="#fbbf24"
                    label={`${totProvTotal > 0 ? ((totProvPagado / totProvTotal) * 100).toFixed(0) : 0}% pagado`}
                  />
                </>
              ) : (
                <div style={{ fontSize: 11, color: '#334155' }}>Sin compras directas registradas</div>
              )}
            </KpiCard>

            {/* Acopios */}
            <KpiCard icon={Package} color="#a78bfa" label="Acopios">
              {totAcopios > 0 ? (
                <>
                  <Amount value={totAcopiosARS} currency="ARS" color="#a78bfa" sub={fmt(totAcopios, 'USD')} />
                  <Row label={`${acopios.length} acopios registrados`} value="" color="#334155" />
                </>
              ) : (
                <div style={{ fontSize: 11, color: '#334155' }}>Sin acopios registrados</div>
              )}
            </KpiCard>

            {/* Total Pagado (Columna B) */}
            <KpiCard icon={TrendingUp} color="#10b981" label="Total Pagado a la Fecha">
              <Amount
                value={certPagadasConIva + adicPagadoTotal + (paCuentaARS > 0 ? paCuentaARS : paCuentaUSD * tc) + totProvPagadoARS}
                currency="ARS"
                color="#10b981"
                size={22}
                sub={`Equiv. USD: ${fmt(certPagadasConIvaUSD + adicPagadoUSD + paCuentaUSD + totProvPagado, 'USD')}`}
              />
              <Divider />
              <Row label="Certificados pagados (con IVA)" value={certPagadasConIva} currency="ARS" color="#34d399" />
              {adicPagadoTotal > 0 && <Row label="Adicionales cobrados" value={adicPagadoTotal} currency="ARS" color="#34d399" />}
              {totProvPagadoARS > 0 && <Row label="Proveedores pagados" value={totProvPagadoARS} currency="ARS" color="#34d399" />}
              {paCuentaARS > 0 && <Row label="Pagos a cuenta" value={paCuentaARS} currency="ARS" color="#34d399" />}
              {totAcopiosARS > 0 && (
                <>
                  <Divider />
                  <Row
                    label={`Acopios comprometidos (${acopios.length}) — no incluidos`}
                    value={totAcopiosARS}
                    currency="ARS"
                    color="#a78bfa"
                  />
                </>
              )}
            </KpiCard>

          </div>
        </div>
      </div>

      {/* TC referencia */}
      {tc > 0 && (
        <div style={{ fontSize: 10, color: '#1e293b', textAlign: 'right', marginTop: 20 }}>
          TC promedio ponderado: $ {tc.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
        </div>
      )}
    </div>
  );
}
