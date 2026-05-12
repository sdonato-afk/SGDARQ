// --- HELPERS FINANCIEROS ---

/**
 * Convierte un monto a USD usando el tipo de cambio proporcionado o el blue.
 * @param {number} monto 
 * @param {string} moneda - 'USD' o 'ARS'
 * @param {number} tc - tipo de cambio
 * @param {number} cotizacionBlue - cotización blue actual (fallback)
 * @returns {number} monto en USD
 */
export const convertToUSD = (monto, moneda, tc, cotizacionBlue = 1250) => {
  if (moneda === 'USD') return Number(monto) || 0;
  const parsed = tc !== '' && tc !== null && tc !== undefined ? Number(tc) : 0;
  const rate = (parsed > 0 ? parsed : null) || cotizacionBlue || 1;
  return (Number(monto) || 0) / rate;
};

/**
 * Normaliza una fecha a formato YYYY-MM (año-mes).
 */
export const normalizeYearMonth = (dateStr) => {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const pts = dateStr.split('-');
    if (pts[0].length === 4) return `${pts[0]}-${pts[1].padStart(2, '0')}`;
    if (pts[2].length === 4) return `${pts[2]}-${pts[1].padStart(2, '0')}`;
  }
  if (dateStr.includes('/')) {
    const pts = dateStr.split('/');
    if (pts[2].length === 4) return `${pts[2]}-${pts[1].padStart(2, '0')}`;
    if (pts[0].length === 4) return `${pts[0]}-${pts[1].padStart(2, '0')}`;
  }
  return '';
};

/**
 * Normaliza cualquier fecha a formato YYYY-MM-DD para inputs type="date".
 */
export const normalizeDate = (dateStr) => {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.split('T')[0];
  const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
  const m2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (m2) return `20${m2[3]}-${m2[1].padStart(2,'0')}-${m2[2].padStart(2,'0')}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return s;
};

/**
 * Parser robusto de montos para importación.
 * Soporta: 1.158.939,77 (AR) | 1,158,939.77 (US) | 1158939.77 | etc.
 */
export const parseMontoImport = (rawStr) => {
  if (!rawStr) return 0;
  const cleaned = rawStr.trim().replace(/[^\d,.-]/g, '');
  if (!cleaned) return 0;
  let result;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      result = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    } else {
      result = parseFloat(cleaned.replace(/,/g, ''));
    }
  } else if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      result = parseFloat(cleaned.replace(',', '.'));
    } else {
      result = parseFloat(cleaned.replace(/,/g, ''));
    }
  } else if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length >= 3 || (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3)) {
      result = parseFloat(cleaned.replace(/\./g, ''));
    } else {
      result = parseFloat(cleaned);
    }
  } else {
    result = parseFloat(cleaned);
  }
  return isNaN(result) ? 0 : result;
};

// --- CONSTANTES ---

export const SOCIOS = ['Sebastián', 'Emiliano', 'Santiago'];

export const VO_PORCENTAJES = {
  'VO-1A': 5.17, 'VO-1B': 5.17, 'VO-2A': 5.17, 'VO-2B': 5.17,
  'VO-3A': 5.17, 'VO-3B': 5.17, 'VO-4A': 4.32, 'VO-4B': 4.32,
  'VO-5A': 4.32, 'VO-5B': 4.32, 'VO-6A': 4.32, 'VO-6B': 4.32,
  'VO-7A': 4.32, 'VO-7B': 4.32, 'VO-8A': 3.08, 'VO-8B': 3.08,
  'VO-9A': 3.08, 'VO-9B': 3.08, 'VO-COCHERA-1': 2.38, 'VO-COCHERA-2': 2.38,
  'VO-COCHERA-3': 2.38, 'VO-COCHERA-4': 2.38, 'VO-COCHERA-5': 2.38,
  'VO-COCHERA-6': 2.38, 'VO-COCHERA-7': 2.38
};

export const areas = ['Obras', 'Alquileres', 'Oficina', 'Directorio', 'Sistema'];

export const directores = ['Sebastián', 'Emiliano', 'Santiago', 'Florencia'];

export const cajas = ['Caja Dólares', 'Caja Pesos', 'Banco Amecon', 'Banco Blue', 'MP Amecon', 'MP Blue'];

/**
 * Calcula la próxima fecha de actualización y la fecha de fin de un contrato.
 * @param {string} fechaInicio - YYYY-MM-DD
 * @param {string|number} periodoActualizacion - meses entre actualizaciones (ej: '3', '6')
 * @param {string|number} duracionMeses - duración total del contrato en meses
 * @returns {{ dtProx: string, dtFin: string }} fechas en formato YYYY-MM-DD
 */
export const calcularFechasContrato = (fechaInicio, periodoActualizacion, duracionMeses) => {
  if (!fechaInicio) return { dtProx: '', dtFin: '' };
  const base = new Date(fechaInicio + 'T12:00:00Z');
  const periodo = parseInt(periodoActualizacion) || 3;
  const duracion = parseInt(duracionMeses) || 24;
  const proxDate = new Date(base);
  proxDate.setMonth(proxDate.getMonth() + periodo);
  const finDate = new Date(base);
  finDate.setMonth(finDate.getMonth() + duracion);
  const fmt = (d) => d.toISOString().split('T')[0];
  return { dtProx: fmt(proxDate), dtFin: fmt(finDate) };
};

