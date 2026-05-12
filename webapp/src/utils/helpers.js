// Helpers financieros compartidos
export const convertToUSD = (monto, moneda, tc, fallbackTC = 1250) => {
  if (moneda === 'USD') return Number(monto) || 0;
  const parsed = tc !== '' && tc !== null && tc !== undefined ? Number(tc) : 0;
  const rate = (parsed > 0 ? parsed : null) || fallbackTC || 1;
  return (Number(monto) || 0) / rate;
};

export const normalizeYearMonth = (dateStr) => {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const pts = dateStr.split('-');
    if (pts[0].length === 4) return `${pts[0]}-${pts[1].padStart(2, '0')}`;
    if (pts[2]?.length === 4) return `${pts[2]}-${pts[1].padStart(2, '0')}`;
  }
  if (dateStr.includes('/')) {
    const pts = dateStr.split('/');
    if (pts[2]?.length === 4) return `${pts[2]}-${pts[1].padStart(2, '0')}`;
    if (pts[0].length === 4) return `${pts[0]}-${pts[1].padStart(2, '0')}`;
  }
  return '';
};

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

export const parseMontoImport = (rawStr) => {
  if (!rawStr) return 0;
  const cleaned = rawStr.trim().replace(/[^\d,.\-]/g, '');
  if (!cleaned) return 0;
  let result;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    result = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
      ? parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
      : parseFloat(cleaned.replace(/,/g, ''));
  } else if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    result = (parts.length === 2 && parts[1].length <= 2)
      ? parseFloat(cleaned.replace(',', '.'))
      : parseFloat(cleaned.replace(/,/g, ''));
  } else if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    result = (parts.length >= 3 || (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3))
      ? parseFloat(cleaned.replace(/\./g, ''))
      : parseFloat(cleaned);
  } else {
    result = parseFloat(cleaned);
  }
  return isNaN(result) ? 0 : result;
};
