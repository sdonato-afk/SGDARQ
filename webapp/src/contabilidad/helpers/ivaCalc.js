// ─────────────────────────────────────────────────────────────────────────────
// ivaCalc.js — Cálculo de posición de IVA
//
// CONVENCIÓN DE SIGNOS (Argentina):
//   posicion = creditoFiscal - debitoFiscal + saldoAnterior
//
//   posicion > 0  →  SALDO A FAVOR  →  se arrastra al mes siguiente
//   posicion < 0  →  IMPUESTO A PAGAR  →  se paga a AFIP, el próximo mes arranca en 0
//   posicion = 0  →  sin saldo
//
//   El saldoAnterior siempre es POSITIVO cuando hay crédito acumulado a favor.
// ─────────────────────────────────────────────────────────────────────────────

// Tipos que generan débito fiscal (facturas emitidas)
const TIPOS_DEBITO      = ['001', '002', '006', '007', '011', '012', '019', '020', '021'];
// Tipos que reducen débito (notas de crédito emitidas)
const TIPOS_NC_EMITIDAS = ['003', '008', '013'];
// Tipos que generan crédito fiscal (facturas recibidas)
const TIPOS_CREDITO     = ['001', '002', '006', '007', '011', '012', '019', '020', '021'];
// Tipos que reducen crédito (notas de crédito recibidas)
const TIPOS_NC_RECIBIDAS = ['003', '008', '013'];

/**
 * Detecta si un comprobante es una Nota de Crédito.
 * Acepta código numérico ('003','008','013') O texto del tipo:
 *   "Nota de Crédito A", "Nota Crédito A", etc.
 * Esto cubre datos importados antes del fix de parseTipo.
 */
function isNotaCredito(tipoCodigo, tipoNombre) {
  const cod = String(tipoCodigo ?? '').padStart(3, '0');
  if (['003', '008', '013'].includes(cod)) return true;
  // Fallback textual (datos con tipoCodigo almacenado como texto)
  const txt = String(tipoNombre ?? tipoCodigo ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');  // quita tildes
  return /\bnota\b.*\bcred/.test(txt);  // "nota ... credito"
}

/**
 * Calcula débito y crédito fiscal bruto de un período.
 *
 * @param {Array} emitidos  - comprobantes emitidos del período
 * @param {Array} recibidos - comprobantes recibidos del período
 * @returns {{ debitoFiscal, creditoFiscal, posicion, aPagar, aFavor, label }}
 *
 *   posicion = creditoFiscal - debitoFiscal
 *   posicion > 0 → a favor (sin saldo anterior)
 *   posicion < 0 → a pagar (sin saldo anterior)
 */
export function calcPosicionIVA(emitidos = [], recibidos = []) {
  let debitoFiscal  = 0;
  let creditoFiscal = 0;

  // Débito fiscal = IVA de facturas emitidas − IVA de NC emitidas
  // Regla: si es NC → resta del débito; cualquier otra cosa → suma al débito
  for (const c of emitidos) {
    const iva = Number(c.impIVA || 0);
    if (isNotaCredito(c.tipoCodigo, c.tipoNombre)) {
      debitoFiscal -= iva;   // NC emitida → cancela un débito → reduce lo que se debe a AFIP
    } else {
      debitoFiscal += iva;   // Factura / ND emitida → genera débito fiscal
    }
  }

  // Crédito fiscal = IVA de facturas recibidas − IVA de NC recibidas
  // Regla: si es NC → resta del crédito; cualquier otra cosa → suma al crédito
  for (const c of recibidos) {
    const iva = Number(c.impIVA || 0);
    if (isNotaCredito(c.tipoCodigo, c.tipoNombre)) {
      creditoFiscal -= iva;  // NC recibida → cancela un crédito → reduce saldo a favor
    } else {
      creditoFiscal += iva;  // Factura / ND recibida → genera crédito fiscal
    }
  }

  // posicion > 0 → crédito > débito → saldo a favor (se arrastra)
  // posicion < 0 → débito > crédito → impuesto a pagar
  const posicion = creditoFiscal - debitoFiscal;

  return {
    debitoFiscal:  Math.max(0, debitoFiscal),
    creditoFiscal: Math.max(0, creditoFiscal),
    posicion,
    aPagar: posicion < 0,
    aFavor: posicion > 0,
    label:  posicion < 0 ? 'A PAGAR' : posicion > 0 ? 'A FAVOR' : 'SIN SALDO',
  };
}

/**
 * Calcula el saldo técnico acumulado de todos los períodos ANTERIORES
 * al período seleccionado.
 *
 * Regla argentina:
 *   posicionMes = saldoAnterior + creditoFiscal − debitoFiscal
 *
 *   si posicionMes > 0  → saldo técnico a favor  → se arrastra (saldo = posicionMes)
 *   si posicionMes < 0  → impuesto a pagar       → se paga, próximo mes arranca en 0
 *   si posicionMes = 0  → sin saldo
 *
 * @param {Array}  todosComprobantes - TODOS los comprobantes de la empresa
 * @param {string} periodoActual     - 'YYYY-MM' del período que se está viendo
 * @param {number} saldoInicial      - saldo técnico de apertura (positivo = a favor)
 * @returns {{ saldoAnterior: number, historial: Array }}
 *          saldoAnterior > 0 = crédito acumulado a favor
 *          saldoAnterior = 0 = sin saldo (o ya pagado)
 */
export function calcSaldoAcumulado(todosComprobantes = [], periodoActual = '', saldoInicial = 0) {
  const byPeriodo = {};
  for (const c of todosComprobantes) {
    if (!c.periodo || c.periodo >= periodoActual) continue;
    if (!byPeriodo[c.periodo]) byPeriodo[c.periodo] = [];
    byPeriodo[c.periodo].push(c);
  }

  const periodosOrdenados = Object.keys(byPeriodo).sort();
  let saldo = Math.max(0, saldoInicial); // El saldo inicial siempre es 0 o positivo (a favor)
  const historial = [];

  for (const p of periodosOrdenados) {
    const comps  = byPeriodo[p];
    const emit   = comps.filter(c => c.tipoImport === 'emitidos');
    const recib  = comps.filter(c => c.tipoImport === 'recibidos');
    const { debitoFiscal, creditoFiscal } = calcPosicionIVA(emit, recib);

    // posicion = saldo acumulado + crédito del mes − débito del mes
    const posicionMes = saldo + creditoFiscal - debitoFiscal;

    historial.push({
      periodo:       p,
      debitoFiscal,
      creditoFiscal,
      saldoAnterior: saldo,
      posicionMes,
      aPagar:        posicionMes < 0, // negativo → pagar
      aFavor:        posicionMes > 0, // positivo → a favor, arrastra
      aPagarMonto:   posicionMes < 0  ? Math.abs(posicionMes) : 0,
      aFavorMonto:   posicionMes > 0  ? posicionMes : 0,
    });

    // Saldo positivo (a favor) se arrastra íntegro al siguiente mes
    // Saldo negativo (a pagar) se paga → próximo mes arranca en 0
    saldo = posicionMes > 0 ? posicionMes : 0;
  }

  return { saldoAnterior: saldo, historial };
}

/**
 * Agrupa comprobantes por período YYYY-MM
 */
export function agruparPorPeriodo(comprobantes) {
  const grupos = {};
  for (const c of comprobantes) {
    const fecha   = c.fecha || '';
    const periodo = fecha.length >= 7 ? fecha.slice(0, 7) : 'sin-fecha';
    if (!grupos[periodo]) grupos[periodo] = [];
    grupos[periodo].push(c);
  }
  return grupos;
}

/**
 * Calcula totales de base imponible e IVA por alícuota
 */
export function calcTotalesPorAlicuota(comprobantes) {
  const result = {
    21:    { base: 0, iva: 0 },
    10.5:  { base: 0, iva: 0 },
    27:    { base: 0, iva: 0 },
    otros: { base: 0, iva: 0 },
  };

  for (const c of comprobantes) {
    const base = Number(c.impNetoGravado || 0);
    const iva  = Number(c.impIVA         || 0);

    if (base > 0 && iva > 0) {
      const alicuota = Math.round((iva / base) * 100 * 2) / 2;
      if      (alicuota === 21)   { result[21].base   += base; result[21].iva   += iva; }
      else if (alicuota === 10.5) { result[10.5].base += base; result[10.5].iva += iva; }
      else if (alicuota === 27)   { result[27].base   += base; result[27].iva   += iva; }
      else                        { result.otros.base  += base; result.otros.iva  += iva; }
    } else {
      result.otros.base += base;
    }
  }

  return result;
}
