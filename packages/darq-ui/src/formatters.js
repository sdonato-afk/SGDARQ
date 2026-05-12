export const fmt = (n) => {
  if (!n) return '0,00';
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
