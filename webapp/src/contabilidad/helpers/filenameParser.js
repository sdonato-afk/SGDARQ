// ─────────────────────────────────────────────────────────────────────────────
// filenameParser.js
// Extrae metadata del nombre de archivo y la ruta de la carpeta
// Ej: "FA-DARIA-18-03-2026.pdf" en "1 AMECON/2026/COMPRAS/MARZO"
// ─────────────────────────────────────────────────────────────────────────────

const MESES = {
  ENERO: '01', FEBRERO: '02', MARZO: '03', ABRIL: '04',
  MAYO: '05', JUNIO: '06', JULIO: '07', AGOSTO: '08',
  SEPTIEMBRE: '09', OCTUBRE: '10', NOVIEMBRE: '11', DICIEMBRE: '12',
};

const TIPOS_FILENAME = {
  FA: 'Factura A', FB: 'Factura B', FC: 'Factura C',
  NDA: 'Nota Débito A', NCA: 'Nota Crédito A',
  NDB: 'Nota Débito B', NCB: 'Nota Crédito B',
};

/**
 * Parsea la ruta completa de un archivo PDF de factura.
 * @param {string} relativePath - path relativo desde la raíz seleccionada
 *   Ej: "1 AMECON/2026/COMPRAS/MARZO/FA-DARIA-18-03-2026.pdf"
 * @returns {object} metadata extraída
 */
export function parseFilePath(relativePath) {
  const parts = relativePath.replace(/\\/g, '/').split('/');
  const filename = parts[parts.length - 1];
  const nameNoExt = filename.replace(/\.pdf$/i, '');

  const result = {
    filename,
    relativePath,
    empresa: null,
    año: null,
    tipoMovimiento: null,  // 'compra' | 'venta'
    mes: null,
    tipoComprobante: null, // 'Factura A', etc.
    tipoCorto: null,       // 'FA', 'FB', etc.
    fechaHint: null,       // fecha extraída del nombre (YYYY-MM-DD)
    contraparteHint: null, // nombre abreviado del cliente/proveedor
    parsedFromPath: true,
  };

  // ── Empresa (nivel 0 de la ruta, ej: "1 AMECON")
  if (parts.length > 0) {
    result.empresa = parts[0].replace(/^\d+\s*/, '').trim(); // quita "1 "
  }

  // ── Año (nivel 1)
  if (parts.length > 1 && /^\d{4}$/.test(parts[1])) {
    result.año = parts[1];
  }

  // ── Tipo de movimiento (nivel 2)
  if (parts.length > 2) {
    const t = parts[2].toUpperCase();
    if (t === 'COMPRAS')  result.tipoMovimiento = 'compra';
    if (t === 'VENTAS')   result.tipoMovimiento = 'venta';
    if (t === 'REQUERIMIENTO') result.tipoMovimiento = 'requerimiento';
  }

  // ── Mes (nivel 3)
  if (parts.length > 3) {
    const m = MESES[parts[3].toUpperCase()];
    if (m) result.mes = m;
  }

  // ── Tipo comprobante (inicio del nombre, ej: "FA", "FC", "NDA")
  const tipoMatch = nameNoExt.match(/^(FA|FB|FC|NDA|NCA|NDB|NCB)/i);
  if (tipoMatch) {
    result.tipoCorto = tipoMatch[1].toUpperCase();
    result.tipoComprobante = TIPOS_FILENAME[result.tipoCorto] || tipoMatch[1];
  }

  // ── Fecha del nombre (formato DD-MM-YYYY al final)
  const fechaMatch = nameNoExt.match(/(\d{2})-(\d{2})-(\d{4})(?:-\d+)?$/);
  if (fechaMatch) {
    const [, dd, mm, yyyy] = fechaMatch;
    result.fechaHint = `${yyyy}-${mm}-${dd}`;
    // Año desde fecha si no lo teníamos de la carpeta
    if (!result.año) result.año = yyyy;
    if (!result.mes) result.mes = mm;
  }

  // ── Contraparte (parte del nombre entre tipo y fecha)
  if (tipoMatch && fechaMatch) {
    const after = nameNoExt.slice(tipoMatch[0].length + 1); // quita "FA-"
    const idx = after.lastIndexOf(fechaMatch[0]);
    if (idx > 0) {
      result.contraparteHint = after.slice(0, idx - 1).trim();
    }
  } else if (tipoMatch) {
    result.contraparteHint = nameNoExt.slice(tipoMatch[0].length + 1).trim();
  }

  return result;
}

/**
 * Detecta si un texto extraído de PDF parece escaneado (sin texto útil)
 */
export function isScanned(text) {
  if (!text || text.trim().length < 50) return true;
  // Si tiene muy poca variedad de caracteres, probablemente es ruido
  const meaningful = text.replace(/\s/g, '').length;
  return meaningful < 30;
}
