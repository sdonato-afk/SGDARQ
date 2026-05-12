/**
 * prioridad.js
 * Calcula el urgenciaScore de un item de agenda.
 * Score = montoPotencial / díasAlPróximoViernes
 * Cuanto mayor el score, más arriba aparece en la columna.
 */

/**
 * Días hasta el próximo viernes desde hoy.
 * Si hoy es viernes, cuenta para el viernes siguiente.
 */
export function diasAlViernes(desde = new Date()) {
  const DOW = desde.getDay(); // 0=dom, 5=vie
  const diff = DOW <= 5 ? 5 - DOW : 7 - DOW + 5;
  return diff === 0 ? 7 : diff;
}

/**
 * Columna destino según fecha de vencimiento y prioridad.
 * @returns 'urgente' | 'semana' | 'pendiente'
 */
export function columnaItem(item, hoy = new Date()) {
  if (item.prioridad === 'critica') return 'urgente';
  if (!item.fechaVencimiento) return 'pendiente';

  const vence = new Date(item.fechaVencimiento + 'T00:00:00');
  const diff   = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));

  if (diff <= 3)  return 'urgente';
  if (diff <= 7)  return 'semana';
  return 'pendiente';
}

/**
 * Calcula urgenciaScore para ordenar dentro de cada columna.
 * Usa monto si está disponible, sino 1000 como peso neutro.
 */
export function urgenciaScore(item, hoy = new Date()) {
  const dias  = item.fechaVencimiento
    ? Math.max(1, Math.ceil((new Date(item.fechaVencimiento + 'T00:00:00') - hoy) / (1000 * 60 * 60 * 24)))
    : diasAlViernes(hoy);
  const monto = item.montoPotencial || 1000;
  return monto / dias;
}
