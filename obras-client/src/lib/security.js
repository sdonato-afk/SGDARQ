// ────────────────────────────────────────────────────────────────
// SECURITY — Strip de campos privados antes de exponer al cliente
// Regla: todo lo que sea costo interno, fee, margen → NUNCA al cliente
// ────────────────────────────────────────────────────────────────

// ── Transacciones (Materiales) ────────────────────────────────
const PRIVADOS_TRANSACCION = [
  'costo_factura',
  'fee_gestion_pct',
  'fee_gestion_monto',
];

// ── Contratistas (MO back-to-back) ───────────────────────────
const PRIVADOS_CONTRATISTA = [
  'costo_real',
  'margen_operativo',
  'margen_pct',
];

// ── Config de obra ────────────────────────────────────────────
const PRIVADOS_CONFIG = [
  // Fees y márgenes
  'fee_gestion_pct',
  'caja_chica_sin_comprobante_pct',
  // Honorarios — el cliente ve las cuotas emitidas, no los totales base
  'honorarios_proyecto_total',
  'honorarios_direccion_total',
  'honorarios_admin_total',
  // Caja chica interna (ambas keys usadas en distintas versiones)
  'caja_chica_fondo_inicial',
  'caja_chica_fondo_usd',
  // Modelo viejo (por si existen en docs viejos)
  'honorarios_proyecto_fijo',
  'honorarios_direccion_pct',
  'honorarios_admin_pct',
  // Seguridad
  'token_cliente',
];

// ── Honorarios — cuotas ───────────────────────────────────────
// El cliente ve: tipo, hito, monto, estado (solo si es 'emitido' o 'cobrado'), fecha_emision
// NO ve: pct_del_total (revela el total pactado), ni registros 'pendiente'
const PRIVADOS_HONORARIO = [
  'pct_del_total',
];

// ── Caja chica — ítems de rendición ──────────────────────────
// El cliente ve: descripcion, precio_cliente, moneda
// NO ve: costo_real, tipo (con/sin comprobante), markup aplicado
const PRIVADOS_CAJA_CHICA_ITEM = [
  'costo_real',
  'tipo',
];

// ─────────────────────────────────────────────────────────────

function strip(obj, campos) {
  if (!obj) return obj;
  const safe = { ...obj };
  campos.forEach(c => delete safe[c]);
  return safe;
}

export function sanitizarTransaccion(t) {
  return strip(t, PRIVADOS_TRANSACCION);
}

export function sanitizarContratista(c) {
  return strip(c, PRIVADOS_CONTRATISTA);
}

export function sanitizarConfig(cfg) {
  return strip(cfg, PRIVADOS_CONFIG);
}

export function sanitizarHonorario(h) {
  return strip(h, PRIVADOS_HONORARIO);
}

export function sanitizarCajaChicaItem(item) {
  return strip(item, PRIVADOS_CAJA_CHICA_ITEM);
}

// Los honorarios 'pendiente' son solo internos — el cliente ve emitido y cobrado
export function filtrarHonorariosCliente(honorarios = []) {
  return honorarios
    .filter(h => h.estado === 'emitido' || h.estado === 'cobrado')
    .map(sanitizarHonorario);
}
