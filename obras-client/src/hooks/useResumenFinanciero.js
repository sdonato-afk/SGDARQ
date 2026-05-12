/**
 * useResumenFinanciero.js — Cerebro financiero centralizado
 *
 * Fuente única de verdad para TODOS los cálculos financieros de una obra.
 * Consumido por TabResumen (admin) y ClienteApp (portal del cliente).
 * Replica exactamente la matemática que antes vivía solo en TabResumen.jsx.
 */

import {
  useMovimientosMain, useTcGlobal,
  useFacturasDirectas, useCertificaciones,
  useContratistas, useHonorarios,
  useOrdenesCambio, useAcopios,
  useCajaChica,
} from './useObras.js';
import { sumarEquiv } from '../lib/calculadora.jsx';

// ── Helpers de conversión (idénticos a TabResumen) ────────────────
function movToUSD(m, tcFallback) {
  if (m.moneda === 'USD') return parseFloat(m.monto) || 0;
  const tc = parseFloat(m.tipoCambioReferencia || m.cotizacionHistorica || m.tc || tcFallback) || 1;
  return (parseFloat(m.monto) || 0) / tc;
}
function movToARS(m) {
  if (m.moneda === 'ARS') return parseFloat(m.monto) || 0;
  return 0;
}

// ── Matchers reutilizables ────────────────────────────────────────
const esCobroHon = (m) => {
  const campos = [m.concepto, m.subRubro, m.rubro, m.tipoObraIngreso].map(c => (c || '').toLowerCase());
  return m.tipo === 'Ingreso' && campos.some(c => c.includes('honorario'));
};
const esAdicional = (m) => {
  const campos = [m.tipoObraIngreso, m.rubro, m.concepto, m.subRubro].map(c => (c || '').toLowerCase());
  return campos.some(c => c.includes('adicional'));
};

// ══════════════════════════════════════════════════════════════════
export function useResumenFinanciero(obraId, config) {
  const { movimientos: movsMain } = useMovimientosMain(obraId);
  const { honorarios }            = useHonorarios(obraId);
  const { facturas }              = useFacturasDirectas(obraId);
  const { certificaciones }       = useCertificaciones(obraId);
  const { contratistas }          = useContratistas(obraId);
  const { ordenes }               = useOrdenesCambio(obraId);
  const { acopios }               = useAcopios(obraId);
  const { tc }                    = useTcGlobal(obraId);
  const { rendiciones }           = useCajaChica(obraId);

  const markupPct = config?.caja_chica_sin_comprobante_pct ?? 30;
  const logMoneda = config?.logistica_moneda || 'USD';

  // ══════════════════════════════════════════════════════════════
  // COLUMNA A — D+ARQ cobra al cliente
  // ══════════════════════════════════════════════════════════════

  // 1. Honorarios
  const grandTotalHon =
    (config?.honorarios_proyecto_total  || 0) +
    (config?.honorarios_direccion_total || 0) +
    (config?.honorarios_admin_total     || 0);
  const honEmitidos   = honorarios.filter(h => h.estado === 'emitido');
  const totHonEmitido = honEmitidos.reduce((s, h) => s + (h.monto || 0), 0);
  const honPactado    = grandTotalHon || totHonEmitido;

  const totHonEmitidoARS = honEmitidos.reduce((s, h) => {
    const tcEm = parseFloat(h.tc_emision) || tc || 1;
    return s + ((h.monto || 0) * tcEm);
  }, 0);

  const cobrosHon    = movsMain.filter(esCobroHon);
  const honCobradoUSD = cobrosHon.reduce((s, m) => {
    if (m.moneda === 'USD') return s + (parseFloat(m.monto) || 0);
    const tcMov = parseFloat(m.cotizacionHistorica || m.tipoCambioReferencia) || tc || 1;
    return s + ((parseFloat(m.monto) || 0) / tcMov);
  }, 0);
  const honCobradoARS = cobrosHon.reduce((s, m) => {
    if (m.moneda === 'ARS') return s + (parseFloat(m.monto) || 0);
    const tcMov = parseFloat(m.cotizacionHistorica || m.tipoCambioReferencia) || tc || 1;
    return s + ((parseFloat(m.monto) || 0) * tcMov);
  }, 0);

  const honSaldoARS  = Math.max(0, totHonEmitidoARS - honCobradoARS);
  const honPendiente = Math.max(0, honPactado - honCobradoUSD);
  const honPct       = honPactado > 0 ? (honCobradoUSD / honPactado) * 100 : 0;

  // 2. Adicionales aprobados
  const adicionalesAprobados = ordenes.filter(o => o.estado === 'aprobada_cliente');
  const totAdicional    = sumarEquiv(adicionalesAprobados, tc, 'monto_adicional', 'moneda').usd;
  const totAdicionalARS = totAdicional * tc;

  // 3. Logística — calculada automáticamente: semanas activas × tarifa semanal del config
  // Cada semana distinta en rendiciones = una semana de trabajo
  const semanasActivas    = new Set(rendiciones.map(r => r.semana).filter(Boolean)).size;
  const totLogisticaNativo = semanasActivas * (config?.logistica_semanal || 0);
  const totLogistica = logMoneda === 'ARS'
    ? totLogisticaNativo / (tc || 1)
    : totLogisticaNativo;
  const totLogARS    = logMoneda === 'ARS'
    ? totLogisticaNativo
    : totLogisticaNativo * (tc || 1);

  // 4. Pagos adelantados D+ARQ
  const egresosObra    = movsMain.filter(m => m.tipo === 'Egreso');
  const egresosUSD     = egresosObra.reduce((s, m) => s + movToUSD(m, tc), 0);
  const egresosARS     = egresosObra.reduce((s, m) => s + movToARS(m), 0);
  const totalAdelantadoUSD = egresosUSD + totLogistica;
  const totalAdelantadoARS = egresosARS + totLogARS;
  const totalAdelantadoMarkup    = totalAdelantadoUSD * (1 + markupPct / 100);
  const totalAdelantadoMarkupARS = totalAdelantadoARS + (totalAdelantadoARS * markupPct / 100);

  // ══════════════════════════════════════════════════════════════
  // COLUMNA B — Cliente paga directo
  // ══════════════════════════════════════════════════════════════

  // 1. Contratistas
  const presupCliente  = contratistas.reduce((s, c) => s + (parseFloat(c.presupuesto_cliente) || 0), 0);
  const adicCliente    = adicionalesAprobados.reduce((s, o) => s + (parseFloat(o.monto_adicional) || 0), 0);
  const presupTotal    = presupCliente + adicCliente;

  const totalSinIva    = certificaciones.reduce((s, c) => s + (parseFloat(c.total_sin_iva) || 0), 0);
  const cacTotal       = certificaciones.reduce((s, c) => s + (parseFloat(c.monto_cac) || 0), 0);
  const ivaTotal       = certificaciones.reduce((s, c) => s + (parseFloat(c.iva_monto) || 0), 0);
  const avanceSinIva   = totalSinIva - cacTotal;

  const certPagadasSinIva = certificaciones
    .filter(c => c.pago_cliente_estado === 'pagado')
    .reduce((s, c) => s + (parseFloat(c.total_sin_iva) || 0) - (parseFloat(c.monto_cac) || 0), 0);
  const certPagadasConIva = certificaciones
    .filter(c => c.pago_cliente_estado === 'pagado')
    .reduce((s, c) => s + (parseFloat(c.total_sin_iva) || 0) + (parseFloat(c.iva_monto) || 0), 0);
  const certPagadasConIvaUSD = certificaciones
    .filter(c => c.pago_cliente_estado === 'pagado')
    .reduce((s, c) => {
      const ars = (parseFloat(c.total_sin_iva) || 0) + (parseFloat(c.iva_monto) || 0);
      const c_tc = parseFloat(c.tc) || parseFloat(c.tipo_cambio) || tc || 1;
      return s + (ars / c_tc);
    }, 0);

  const saldoCertif    = avanceSinIva - certPagadasSinIva;
  const pctCertif      = presupTotal > 0 ? (avanceSinIva / presupTotal) * 100 : 0;
  const fondoReparo    = certificaciones.reduce((s, c) => s + (parseFloat(c.retencion_reparo) || 0), 0);

  // Desglose por contratista
  const perContratista = contratistas.map(ct => {
    const certs = certificaciones.filter(c => c.contratista_id === ct.id);
    const certSinIva = certs.reduce((s, c) => s + (parseFloat(c.total_sin_iva) || 0) - (parseFloat(c.monto_cac) || 0), 0);
    const presup = parseFloat(ct.presupuesto_cliente) || 0;
    return {
      id: ct.id,
      nombre: ct.contratista || ct.nombre || '—',
      certificado: certSinIva,
      presupuesto: presup,
      saldo: presup - certSinIva,
    };
  }).filter(c => c.presupuesto > 0 || c.certificado > 0);

  // Adicionales: cruzado con movimientos
  const adicAprobadoTotal = adicCliente;
  const pagosAdicionales  = movsMain.filter(m => m.tipo === 'Ingreso' && esAdicional(m));
  const adicPagadoUSD     = pagosAdicionales.reduce((s, m) => s + movToUSD(m, tc), 0);
  const adicPagadoARS     = pagosAdicionales.reduce((s, m) => s + movToARS(m), 0);
  const adicPagadoTotal   = adicPagadoARS > 0 ? adicPagadoARS : adicPagadoUSD * tc;
  const adicSaldo         = Math.max(0, adicAprobadoTotal - adicPagadoTotal);

  // Pagos a cuenta (exclusivo de clientes, ignorar retornos de proveedores o contratistas)
  const pagosACuenta = movsMain.filter(m =>
    m.tipo === 'Ingreso' &&
    /pago.*cuenta/i.test(m.tipoObraIngreso || '') &&
    !esAdicional(m) &&
    !m.proveedorId && !m.contratista_id && !m.contratistaId &&
    !(m.rubro || '').toLowerCase().includes('retornos de proveedores') &&
    !(m.categoria || '').toLowerCase().includes('devolucion')
  );
  const paCuentaARS = pagosACuenta.reduce((s, m) => s + movToARS(m), 0);
  const paCuentaUSD = pagosACuenta.reduce((s, m) => s + movToUSD(m, tc), 0);

  // 2. Proveedores / Compras directas (facturas sin contratista)
  const factSinContrat = facturas.filter(f => !f.contratista_id);
  const totProvTotal    = sumarEquiv(factSinContrat, tc, 'monto', 'moneda').usd;
  const totProvTotalARS = totProvTotal * tc;
  const totProvPagado   = sumarEquiv(factSinContrat.filter(f => f.pagado), tc, 'monto', 'moneda').usd;
  const totProvPagadoARS = totProvPagado * tc;
  const totProvPend     = Math.max(0, totProvTotal - totProvPagado);
  const totProvPendARS  = totProvPend * tc;

  // 3. Acopios
  const totAcopios    = sumarEquiv(acopios, tc, 'monto', 'moneda').usd;
  const totAcopiosARS = totAcopios * tc;

  // ══════════════════════════════════════════════════════════════
  // KPI JUEVES — Total que el cliente debe transferir
  // ══════════════════════════════════════════════════════════════
  const proximoJueves = (() => {
    const hoy = new Date();
    const dia = hoy.getDay();
    const diff = (4 - dia + 7) % 7 || 7;
    const j = new Date(hoy);
    j.setDate(hoy.getDate() + diff);
    return j;
  })();
  const fechaJueves = `${proximoJueves.getDate().toString().padStart(2,'0')}/${(proximoJueves.getMonth()+1).toString().padStart(2,'0')}`;

  const juevHonARS = honSaldoARS;

  // Certificaciones pendientes de cobro: lee de `certificaciones`, no de `facturas`
  // pago_cliente_estado !== 'pagado' = aún no transferido por el cliente
  const certNoPagadas = certificaciones.filter(c =>
    c.contratista_id && (c.aprobada || c.estado === 'aprobada') && c.pago_cliente_estado !== 'pagado'
  );
  const certByContratista = {};
  certNoPagadas.forEach(c => {
    const nombre = c.contratista_nombre || c.contratista_id || 'Sin nombre';
    if (!certByContratista[nombre]) certByContratista[nombre] = { usd: 0, count: 0 };
    // total_con_iva = lo que el cliente transfiere (avance + margen D+ARQ + IVA)
    certByContratista[nombre].usd += sumarEquiv(
      [{ monto: c.total_con_iva, moneda: c.moneda }], tc, 'monto', 'moneda'
    ).usd;
    certByContratista[nombre].count += 1;
  });
  const juevCertUSD = Object.values(certByContratista).reduce((s, c) => s + c.usd, 0);

  const pdNoPagados = facturas.filter(f => !f.contratista_id && !f.pagado);
  const juevPdUSD   = sumarEquiv(pdNoPagados, tc, 'monto', 'moneda').usd;

  const juevAdicUSD = adicSaldo > 0 ? adicSaldo / tc : 0;

  const fondoCajaRaw    = config?.caja_chica_fondo ?? config?.caja_chica_fondo_usd ?? 4000;
  const fondoCajaMoneda = config?.caja_chica_moneda ?? 'USD';
  const balanceCajaNativo = fondoCajaMoneda === 'ARS'
    ? fondoCajaRaw - totalAdelantadoARS
    : fondoCajaRaw - totalAdelantadoUSD;

  const juevTotalARS = juevHonARS + (juevCertUSD + juevPdUSD + juevAdicUSD) * tc;
  const juevTotalUSD = juevTotalARS / tc;

  // ══════════════════════════════════════════════════════════════
  // RETURN — Objeto estructurado para ambas vistas
  // ══════════════════════════════════════════════════════════════
  return {
    tc,

    // ── Datos crudos (para tablas) ──
    raw: {
      facturas, certificaciones, contratistas,
      honorarios, ordenes, rendiciones,
      acopios, movsMain,
    },

    // ── Honorarios ──
    hon: {
      pactado: honPactado, emitido: totHonEmitido,
      emitidoARS: totHonEmitidoARS,
      cobradoUSD: honCobradoUSD, cobradoARS: honCobradoARS,
      saldoARS: honSaldoARS, pendiente: honPendiente,
      pct: honPct,
      emitidos: honEmitidos, cobros: cobrosHon,
    },

    // ── Adicionales ──
    adic: {
      aprobados: adicionalesAprobados,
      totalUSD: totAdicional, totalARS: totAdicionalARS,
      aprobadoTotal: adicAprobadoTotal,
      pagadoTotal: adicPagadoTotal,
      pagadoUSD: adicPagadoUSD,
      pagos: pagosAdicionales,
      saldo: adicSaldo,
    },

    // ── Logística ──
    log: { totalUSD: totLogistica, totalARS: totLogARS, semanas: semanasActivas },

    // ── Pagos adelantados D+ARQ (admin only) ──
    adelantados: {
      egresosUSD, egresosARS,
      totalUSD: totalAdelantadoUSD, totalARS: totalAdelantadoARS,
      totalMarkupUSD: totalAdelantadoMarkup,
      totalMarkupARS: totalAdelantadoMarkupARS,
      markupPct,
    },

    // ── Contratistas / Certificaciones ──
    cert: {
      presupCliente, presupTotal,
      totalSinIva, cacTotal, ivaTotal,
      avanceSinIva, certPagadasSinIva, certPagadasConIva,
      certPagadasConIvaUSD,
      saldoCertif, pctCertif, fondoReparo,
      perContratista,
    },

    // ── Pagos a cuenta ──
    paCuenta: { items: pagosACuenta, ars: paCuentaARS, usd: paCuentaUSD },

    // ── Proveedores (Pagos Directos sin contratista) ──
    prov: {
      totalUSD: totProvTotal, totalARS: totProvTotalARS,
      pagadoUSD: totProvPagado, pagadoARS: totProvPagadoARS,
      pendienteUSD: totProvPend, pendienteARS: totProvPendARS,
    },

    // ── Acopios ──
    acop: { totalUSD: totAcopios, totalARS: totAcopiosARS },

    // ── Caja chica ──
    cajaChica: {
      fondoRaw: fondoCajaRaw, moneda: fondoCajaMoneda,
      balance: balanceCajaNativo,
    },

    // ── KPI Jueves — Total pendiente del cliente ──
    jueves: {
      fecha: fechaJueves,
      honARS: juevHonARS,
      certUSD: juevCertUSD, certByContratista,
      certNoPagadas,
      pdUSD: juevPdUSD, pdNoPagados,
      adicUSD: juevAdicUSD,
      totalARS: juevTotalARS,
      totalUSD: juevTotalUSD,
    },
  };
}
