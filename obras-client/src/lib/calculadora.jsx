// ────────────────────────────────────────────────────────────────
// CALCULADORA DE OBRAS — Toda la lógica de negocio pura
// ────────────────────────────────────────────────────────────────

/**
 * TRANSACCIONES (Materiales)
 * costo_factura + fee% → subtotal → + IVA% → total_cliente
 */
export function calcularTotalCliente(costoFactura, feePct, ivaPct) {
  const cf = Number(costoFactura) || 0;
  const feeDecimal = Number(feePct) / 100 || 0;
  const ivaDecimal = Number(ivaPct) / 100 || 0;
  const subtotal = cf * (1 + feeDecimal);
  const total = subtotal * (1 + ivaDecimal);
  return {
    subtotal: round2(subtotal),
    fee_monto: round2(cf * feeDecimal),
    iva_monto: round2(subtotal * ivaDecimal),
    total_cliente: round2(total)
  };
}

/**
 * CONTRATISTAS (Back-to-Back)
 * margen = presupuesto_cliente - costo_real (PRIVADO)
 */
export function calcularMargenMO(presupuestoCliente, costoReal) {
  const pc = Number(presupuestoCliente) || 0;
  const cr = Number(costoReal) || 0;
  return {
    margen: round2(pc - cr),
    margen_pct: cr > 0 ? round2(((pc - cr) / cr) * 100) : 0
  };
}

/**
 * CERTIFICACIONES
 * retención 5% fondo de reparo
 */
export function calcularCertificacion(montoBruto, retencionPct = 5) {
  const mb = Number(montoBruto) || 0;
  const retencion = round2(mb * (Number(retencionPct) / 100));
  return {
    monto_bruto: mb,
    retencion_reparo: retencion,
    monto_neto: round2(mb - retencion)
  };
}

/**
 * CERTIFICACIONES
 * Margen proporcional de D+ARQ sobre una certificación,
 * ponderado por el avance relativo al presupuesto del contratista.
 * margen = margen_operativo * (monto_bruto / presupuesto_cliente)
 */
export function calcMargenDARQ(cert, contratistas) {
  const ct = contratistas.find(c => c.id === cert.contratista_id);
  if (!ct || !ct.margen_operativo) return 0;
  const mb    = parseFloat(cert.monto_bruto) || 0;
  const pptoC = parseFloat(ct.presupuesto_cliente) || 0;
  if (!pptoC) return 0;
  return Math.round(ct.margen_operativo * (mb / pptoC) * 100) / 100;
}

/**
 * HONORARIOS MENSUALES — 3 registros automáticos
 * Retorna array de { tipo, base, porcentaje, monto }
 */
export function calcularHonorariosMensuales(config, totalFacturadoMes, totalInversionAcumulada) {
  const {
    honorarios_proyecto_fijo = 0,
    honorarios_direccion_pct = 0,
    honorarios_admin_pct = 0,
  } = config || {};

  return [
    {
      tipo: 'proyecto',
      label: 'Honorarios de Proyecto',
      base: null,
      porcentaje: null,
      monto: round2(Number(honorarios_proyecto_fijo))
    },
    {
      tipo: 'direccion',
      label: 'Dirección de Obra',
      base: round2(totalInversionAcumulada),
      porcentaje: Number(honorarios_direccion_pct),
      monto: round2(totalInversionAcumulada * (Number(honorarios_direccion_pct) / 100))
    },
    {
      tipo: 'administracion',
      label: 'Administración Delegada',
      base: round2(totalFacturadoMes),
      porcentaje: Number(honorarios_admin_pct),
      monto: round2(totalFacturadoMes * (Number(honorarios_admin_pct) / 100))
    }
  ];
}

/**
 * DASHBOARD RENTABILIDAD REAL (solo directores — nunca al cliente)
 * tc: tipo de cambio ARS/USD — si se pasa, todos los valores se expresan en ARS.
 *     Si no se pasa, se usa la moneda nativa de cada item (puede mezclar).
 */
export function calcularRentabilidadReal({ transacciones = [], contratistas = [], logistica = [], honorarios = [], tc = null }) {
  // Fees: siempre en ARS (fee_gestion_monto se guarda en la moneda de la transacción)
  const fees = transacciones.reduce((sum, t) => {
    const monto = t.fee_gestion_monto || 0;
    const isUSD = (t.moneda || 'ARS') === 'USD';
    return sum + (tc && isUSD ? monto * tc : monto);
  }, 0);

  // Margen MO: suma en moneda nativa o convertida a ARS
  const margenMO = contratistas.reduce((sum, c) => {
    const monto = c.margen_operativo || 0;
    const isUSD = (c.moneda || 'ARS') === 'USD';
    return sum + (tc && isUSD ? monto * tc : monto);
  }, 0);

  // Logística: suma en moneda nativa o convertida
  const totalLogistica = logistica.reduce((sum, l) => {
    const monto = l.monto || 0;
    const isUSD = (l.moneda_logistica || l.moneda || 'USD') === 'USD';
    return sum + (tc && isUSD ? monto * tc : monto);
  }, 0);

  // Honorarios: suma en moneda nativa o convertida (antes se mezclaban USD y ARS)
  const totalHonorarios = honorarios.reduce((sum, h) => {
    const monto = h.monto || 0;
    const isUSD = (h.moneda || 'USD') === 'USD';
    return sum + (tc && isUSD ? monto * tc : monto);
  }, 0);

  return {
    fees:       round2(fees),
    margenMO:   round2(margenMO),
    logistica:  round2(totalLogistica),
    honorarios: round2(totalHonorarios),
    total:      round2(fees + margenMO + totalLogistica + totalHonorarios),
    moneda:     tc ? 'ARS' : 'mixed',
  };
}

/**
 * Convierte un monto a USD usando tipo de cambio
 */
export function toUSD(monto, moneda, tc) {
  const m = Number(monto) || 0;
  if (moneda === 'USD') return m;
  return tc > 0 ? round2(m / tc) : 0;
}

export function sumarEquiv(arr, tcPromedio, valKeyStr = 'monto', monedaKey = 'moneda') {
  let sumUSD = 0;
  let sumARS = 0;
  const tc = parseFloat(tcPromedio) || 1000;

  for (const item of arr) {
    const v = parseFloat(item[valKeyStr] || 0);
    const m = typeof monedaKey === 'function' ? monedaKey(item) : (item[monedaKey] || 'ARS');
    const isUSD = m === 'USD';
    
    // Si la transaccion individual tiene historic TC, lo respeta, si no, usa el general tcPromedio
    const itemTC = parseFloat(item.tipoCambioReferencia || item.cotizacionHistorica || tc);

    if (isUSD) {
      sumUSD += v;
      sumARS += (v * itemTC);
    } else {
      sumARS += v;
      sumUSD += (v / itemTC);
    }
  }
  return { usd: sumUSD, ars: sumARS };
}



/**
 * Formateador de moneda argentino
 */
export function fmt(num, moneda = 'ARS') {
  const n = Number(num) || 0;
  const formatted = n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return moneda === 'USD' ? `u$d ${formatted}` : `$ ${formatted}`;
}

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * Genera el período ISO de la semana actual (2026-W15)
 */
export function getWeekId(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Período mes actual (2026-03)
 */
export function getMesId(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
