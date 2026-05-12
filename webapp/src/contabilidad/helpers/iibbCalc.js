// ─────────────────────────────────────────────────────────────────────────────
// iibbCalc.js — Cálculo de IIBB para contribuyente local CABA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula la posición de IIBB para contribuyente local CABA.
 *
 * @param {Array}  emitidos    - comprobantes emitidos del período
 * @param {number} alicuota    - alícuota IIBB en % (ej: 4.9)
 * @param {number} retenciones - retenciones de IIBB sufridas en el período ($ ARS)
 * @param {number} percepciones - percepciones de IIBB sufridas ($ ARS)
 * @returns {object} posición IIBB
 */
export function calcPosicionIIBB(emitidos = [], alicuota = 4.9, retenciones = 0, percepciones = 0) {
  // Base imponible = suma del neto gravado de las facturas emitidas
  // Para servicios profesionales: neto gravado (sin IVA)
  let baseImponible = 0;

  for (const c of emitidos) {
    const neto = Number(c.impNetoGravado || 0);
    const exentas = Number(c.impOpExentas || 0);
    const noGravados = Number(c.impNoGravados || 0);
    baseImponible += neto + exentas + noGravados;
  }

  const impuestoCalculado = baseImponible * (alicuota / 100);
  const totalPagosACuenta = retenciones + percepciones;
  const posicion = impuestoCalculado - totalPagosACuenta;

  return {
    baseImponible,
    alicuota,
    impuestoCalculado,
    retenciones,
    percepciones,
    totalPagosACuenta,
    posicion,
    aPagar: posicion > 0,
    aFavor: posicion < 0,
    label: posicion > 0 ? 'A PAGAR' : posicion < 0 ? 'A FAVOR' : 'SIN SALDO',
  };
}

/**
 * Extrae retenciones de IIBB de los comprobantes recibidos.
 * ARCA incluye retenciones en un campo separado.
 * @param {Array} recibidos - comprobantes recibidos
 * @returns {number} total retenciones de IIBB
 */
export function extraerRetencionesIIBB(recibidos = []) {
  return recibidos.reduce((sum, c) => {
    return sum + Number(c.retIIBB || c.retencionIIBB || 0);
  }, 0);
}
