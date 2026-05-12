/**
 * conciliacion.js
 * ───────────────────────────────────────────────────────────────────────────
 * Fuente única de verdad para la lógica de conciliación automática entre
 * Vencimientos regulatorios y Movimientos (asientos) contables.
 *
 * Regla central:
 *   Un movimiento "paga" un vencimiento si:
 *     1. El proveedor coincide (por ID o por nombre en el concepto)
 *     2. La fecha del movimiento cae dentro de un margen de ± DIAS_MARGEN días
 *        respecto a la fecha de vencimiento.
 *
 * Usar esta función en lugar de duplicar la lógica en cada hook.
 */

/** Ventana de tolerancia en días (antes y después del vencimiento). */
export const DIAS_MARGEN_CONCILIACION = 35;

/**
 * Determina si un movimiento contable "satisface" (paga) un vencimiento.
 *
 * @param {object} movimiento  - Asiento de Firestore (tipo Egreso).
 * @param {object} vencimiento - Documento de la colección vencimientos.
 * @returns {boolean}
 */
export function matchMovimientoVencimiento(movimiento, vencimiento) {
  if (!movimiento?.fecha || !vencimiento?.fecha) return false;
  if (movimiento.tipo !== 'Egreso') return false;

  // 1. Coincidencia temporal
  const fechaPago   = new Date(movimiento.fecha);
  const fechaVence  = new Date(vencimiento.fecha);
  const diffDias    = (fechaVence - fechaPago) / (1000 * 60 * 60 * 24);

  if (diffDias > DIAS_MARGEN_CONCILIACION || diffDias < -DIAS_MARGEN_CONCILIACION) {
    return false;
  }

  // 2. Coincidencia Taxonómica Estricta (Categoría y Rubro)
  const catM = (movimiento.categoriaEgreso || '').toLowerCase().trim();
  const catV = (vencimiento.categoria || vencimiento.categoriaEgreso || '').toLowerCase().trim();
  if (catM && catV && catM !== catV) return false;

  const rubM = (movimiento.rubro || '').toLowerCase().trim();
  const rubV = (vencimiento.rubro || '').toLowerCase().trim();
  if (rubM && rubV && rubM !== rubV) return false;

  // 3. Coincidencia de Entidad (Obra o Propiedad) - Si el vencimiento está asociado a una
  if (vencimiento.entidadId) {
    if (movimiento.obraId !== vencimiento.entidadId && movimiento.propiedadId !== vencimiento.entidadId) {
      return false; // El pago fue para otra obra/propiedad
    }
  }

  // 4. Coincidencia de Proveedor
  // 4a. Por ID de proveedor (estricto)
  if (vencimiento.proveedorId && movimiento.proveedorId) {
    return vencimiento.proveedorId === movimiento.proveedorId;
  }

  // 4b. Por texto en nombre / concepto (fallback para legacy)
  const nomV = (vencimiento.proveedorNombre || vencimiento.concepto || '').toLowerCase().trim();
  const nomM = (movimiento.concepto || movimiento.proveedorNombre || '').toLowerCase().trim();

  // Si ambos campos están presentes y coinciden, es un match seguro
  if (nomV.length >= 4 && nomM.length >= 4) {
    if (nomV.includes(nomM) || nomM.includes(nomV)) {
      return true;
    }
  }

  // 5. Si no hubo match por Proveedor (o el concepto escrito es distinto),
  // pero la Taxonomía (Categoría y Rubro) coincide de forma perfecta y estamos dentro del margen de días:
  // Es un match válido. (Ej: Vencimiento dice "Edenor", Movimiento dice "Electricidad").
  return (rubM !== '' && rubM === rubV);
}

/**
 * Dada una lista de movimientos, devuelve el primero que satisface el vencimiento.
 * Retorna null si ninguno coincide.
 *
 * @param {object[]} movimientos  - Array de asientos (tipo Egreso).
 * @param {object}   vencimiento  - Documento de vencimientos.
 * @returns {object|null}
 */
export function encontrarPagoParaVencimiento(movimientos, vencimiento) {
  return movimientos.find(m => matchMovimientoVencimiento(m, vencimiento)) ?? null;
}
