/**
 * finanzasService.js
 * ─────────────────────────────────────────────────────────────────────────
 * Capa de Acceso a Datos (DAL) para operaciones financieras.
 *
 * REGLA: Nadie escribe directamente en la colección `movimientos` de
 * Firestore. Toda inserción de asientos pasa por este módulo para:
 *   1. Validar los campos obligatorios.
 *   2. Enriquecer automáticamente con campos de auditoría.
 *   3. Garantizar atomicidad (si hay una operación secundaria, ambas se
 *      ejecutan juntas o ninguna, usando writeBatch).
 *
 * Exporta:
 *   registrarAsiento(payload, opciones?)   → Promise<string> (id del doc)
 *   aprobarTicketInbox(ticket, payload)    → Promise<string>
 */

import {
  collection, doc, writeBatch,
} from 'firebase/firestore';
import { db, MAIN_COL } from '../config/firebase';

// ── Validación ────────────────────────────────────────────────────────────────

/**
 * Valida que un payload de asiento tenga los campos mínimos obligatorios.
 * Lanza un Error descriptivo si algo falta, para que la UI lo muestre al usuario.
 */
function validarAsiento(payload) {
  const { monto, fecha, tipo, area } = payload;
  if (!tipo || !['Ingreso', 'Egreso'].includes(tipo)) {
    throw new Error('El asiento debe tener tipo "Ingreso" o "Egreso".');
  }
  if (!area || typeof area !== 'string') {
    throw new Error('El asiento debe tener un área asignada (Obras, Alquileres, Oficina, etc.).');
  }
  if (!fecha) {
    throw new Error('El asiento debe tener una fecha.');
  }
  const montoNum = parseFloat(monto);
  if (isNaN(montoNum) || montoNum <= 0) {
    throw new Error('El monto del asiento debe ser un número positivo.');
  }
}

// ── Enriquecimiento ───────────────────────────────────────────────────────────

/**
 * Agrega campos de auditoría y normalización que todos los asientos deben tener.
 */
function enriquecerAsiento(payload) {
  return {
    ...payload,
    monto:       parseFloat(payload.monto),
    createdAt:   new Date().toISOString(),
    // Normalización de moneda
    moneda:      payload.moneda || 'ARS',
    // Asegurar que el tipo de cambio esté presente si es USD
    tipoCambioReferencia: parseFloat(payload.tipoCambioReferencia) || null,
  };
}

// ── API Pública ───────────────────────────────────────────────────────────────

/**
 * Registra un asiento contable en Firestore de forma atómica.
 *
 * @param {object}  payload     - Datos del movimiento (tipo, area, monto, fecha, ...).
 * @param {object}  [opciones]
 * @param {string}  [opciones.ticketInboxId]  - Si viene de un ticket de Inbox, su ID.
 * @returns {Promise<string>}   ID del documento creado en la colección movimientos.
 */
export async function registrarAsiento(payload, opciones = {}) {
  validarAsiento(payload);

  const asiento    = enriquecerAsiento(payload);
  const batch      = writeBatch(db);

  // 1. Referencia al nuevo movimiento (ID auto-generado)
  const movRef = doc(collection(db, ...MAIN_COL('movimientos')));
  batch.set(movRef, {
    ...asiento,
    ...(opciones.ticketInboxId ? { ticketId: opciones.ticketInboxId } : {}),
  });

  // 2. Si viene de un ticket del Inbox, marcar como aprobado atómicamente
  if (opciones.ticketInboxId) {
    const ticketRef = doc(db, ...MAIN_COL('inbox_movimientos'), opciones.ticketInboxId);
    batch.update(ticketRef, {
      estado:      'aprobado',
      aprobadoAt:  new Date().toISOString(),
      movimientoId: movRef.id,
    });
  }

  // Commit: si cualquiera falla, NINGUNO se ejecuta (transacción atómica)
  await batch.commit();

  return movRef.id;
}

/**
 * Atajo semántico para aprobar un ticket del Inbox y contabilizarlo.
 * Equivale a llamar registrarAsiento con la opción ticketInboxId.
 *
 * @param {object} ticket   - Documento del inbox_movimientos (debe tener .id).
 * @param {object} payload  - Datos del movimiento a registrar.
 * @returns {Promise<string>}
 */
export async function aprobarTicketInbox(ticket, payload) {
  if (!ticket?.id) throw new Error('El ticket debe tener un ID válido para ser aprobado.');
  return registrarAsiento(payload, { ticketInboxId: ticket.id });
}
