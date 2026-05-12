// ─────────────────────────────────────────────────────────────────────────────
// pdfExtractor.js — Extrae datos de facturas electrónicas usando PDF.js
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrae texto completo de un PDF (File o ArrayBuffer).
 * Usa PDF.js via CDN worker — sin necesidad de bundlar el worker con Vite.
 */
async function getPDFText(source) {
  // Import dinámico para no bloquear el bundle principal
  const pdfjs = await import('pdfjs-dist');
  
  // Worker via CDN (evita problemas de bundling con Vite)
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = 
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  }

  let buffer;
  if (source instanceof File) {
    buffer = await source.arrayBuffer();
  } else {
    buffer = source;
  }

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  let fullText = '';
  for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 3); pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}

/**
 * Patrones para facturas electrónicas AFIP argentinas
 */
const PATTERNS = {
  // Número de comprobante: "0001-00012345" o "00001 - 00012345"
  numero: /(\d{4,5})\s*[-–]\s*(\d{7,8})/,
  
  // CAE: 14 dígitos consecutivos
  cae: /\b(\d{14})\b/,
  
  // CUIT: XX-XXXXXXXX-X o XXXXXXXXXXX
  cuit: /(\d{2}[-\s]?\d{8}[-\s]?\d{1})/,
  
  // Fecha: DD/MM/YYYY
  fecha: /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/,
  
  // Tipo de comprobante
  tipoFactura: /FACTURA\s+([ABC])/i,
  tipoNota: /NOTA\s+DE\s+(CRÉDITO|DEBITO|DÉBITO)\s+([ABC])/i,
  
  // Importes
  importeTotal: /(?:TOTAL|IMPORTE TOTAL|TOTAL A PAGAR)\s*\$?\s*([\d.,]+)/i,
  importeNeto:  /(?:NETO GRAVADO|BASE IMPONIBLE)\s*\$?\s*([\d.,]+)/i,
  importeIVA:   /(?:I\.V\.A|IVA|IMPUESTO)\s+(?:21|10,5|27)%?\s*\$?\s*([\d.,]+)/i,
};

function parseImporte(raw) {
  if (!raw) return null;
  return Number(raw.replace(/\./g, '').replace(',', '.'));
}

/**
 * Extrae los datos de una factura electrónica argentina del texto del PDF.
 * @param {string} text - texto extraído del PDF
 * @param {object} pathMeta - metadata pre-extraída del nombre/ruta
 * @returns {object} datos del comprobante
 */
function parseInvoiceText(text, pathMeta = {}) {
  const result = {
    // Pre-rellenado desde la ruta
    empresa:         pathMeta.empresa || null,
    tipoMovimiento:  pathMeta.tipoMovimiento || null,
    contraparteHint: pathMeta.contraparteHint || null,
    fechaHint:       pathMeta.fechaHint || null,
    
    // Extraídos del PDF
    tipoComprobante: null,
    puntoVenta:      null,
    numero:          null,
    numeroCompleto:  null,
    fecha:           null,
    cuit:            null,
    cae:             null,
    impTotal:        null,
    impNetoGravado:  null,
    impIVA:          null,
    
    origen: 'pdf',
    esEscaneado: false,
  };

  if (!text || text.trim().length < 50) {
    result.esEscaneado = true;
    return result;
  }

  // Tipo de comprobante
  const mTipo = text.match(PATTERNS.tipoFactura);
  if (mTipo) result.tipoComprobante = `Factura ${mTipo[1].toUpperCase()}`;
  const mNota = text.match(PATTERNS.tipoNota);
  if (mNota) result.tipoComprobante = `Nota de ${mNota[1]} ${mNota[2].toUpperCase()}`;

  // Número de comprobante
  const mNro = text.match(PATTERNS.numero);
  if (mNro) {
    result.puntoVenta    = mNro[1].padStart(4, '0');
    result.numero        = mNro[2].padStart(8, '0');
    result.numeroCompleto = `${result.puntoVenta}-${result.numero}`;
  }

  // CAE
  const mCAE = text.match(PATTERNS.cae);
  if (mCAE) result.cae = mCAE[1];

  // CUIT (primer match — suele ser el emisor)
  const mCUITs = [...text.matchAll(new RegExp(PATTERNS.cuit.source, 'g'))];
  if (mCUITs.length > 0) {
    result.cuit = mCUITs[0][1].replace(/[\s-]/g, '');
  }

  // Fecha (primer match en el texto)
  const mFecha = text.match(PATTERNS.fecha);
  if (mFecha) {
    result.fecha = `${mFecha[3]}-${mFecha[2]}-${mFecha[1]}`;
  }

  // Importes
  const mTotal = text.match(PATTERNS.importeTotal);
  if (mTotal) result.impTotal = parseImporte(mTotal[1]);
  const mNeto = text.match(PATTERNS.importeNeto);
  if (mNeto) result.impNetoGravado = parseImporte(mNeto[1]);
  const mIVA = text.match(PATTERNS.importeIVA);
  if (mIVA) result.impIVA = parseImporte(mIVA[1]);

  return result;
}

/**
 * Función principal: extrae datos de un archivo PDF.
 * @param {File} file - archivo PDF
 * @param {object} pathMeta - metadata del nombre/ruta (de filenameParser)
 * @returns {Promise<object>} datos del comprobante + flag esEscaneado
 */
export async function extractFromPDF(file, pathMeta = {}) {
  try {
    const text = await getPDFText(file);
    const data = parseInvoiceText(text, pathMeta);
    data.rawTextLength = text.length;
    return { success: true, data, rawText: text.slice(0, 500) };
  } catch (err) {
    return {
      success: false,
      data: { ...pathMeta, esEscaneado: true, origen: 'pdf' },
      error: err.message,
    };
  }
}
