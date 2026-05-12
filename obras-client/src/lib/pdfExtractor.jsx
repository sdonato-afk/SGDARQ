// ─────────────────────────────────────────────────────────────────────────────
// pdfExtractor.jsx — Extrae datos de facturas electrónicas usando PDF.js v5
// ─────────────────────────────────────────────────────────────────────────────

// Importar el worker como URL estática (Vite lo bundlea como asset)
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

/**
 * Extrae texto del PDF preservando estructura por líneas.
 * Agrupa ítems cercanos verticalmente para reconstruir líneas lógicas.
 */
async function getPDFText(source) {
  const pdfjs = await import('pdfjs-dist');

  // Apuntar al worker local (ya no CDN)
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  }

  let buffer;
  if (source instanceof File) {
    buffer = await source.arrayBuffer();
  } else {
    buffer = source;
  }

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  let allLines = [];

  for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 3); pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Agrupar ítems por posición Y (misma línea visual = Y similar)
    const itemsByY = {};
    for (const item of content.items) {
      if (!item.str?.trim()) continue;
      const y = Math.round(item.transform[5]); // coordenada Y redondeada
      if (!itemsByY[y]) itemsByY[y] = [];
      itemsByY[y].push({ x: item.transform[4], str: item.str });
    }

    // Ordenar por Y (descendente = orden visual top-to-bottom en PDF)
    const sortedYs = Object.keys(itemsByY).map(Number).sort((a, b) => b - a);

    for (const y of sortedYs) {
      // Ordenar los ítems de esa línea por X (izquierda a derecha)
      const lineItems = itemsByY[y].sort((a, b) => a.x - b.x);
      const lineText = lineItems.map(i => i.str).join(' ').trim();
      if (lineText) allLines.push(lineText);
    }
  }

  return allLines;
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalizador: quita espacios internos exagerados y caracteres raros
// ─────────────────────────────────────────────────────────────────────────────
function normalizeLine(line) {
  return line
    .replace(/\s+/g, ' ')          // multi-espacio → un espacio
    .replace(/[\u00a0]/g, ' ')     // non-breaking space
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Extracción inteligente campo por campo
// ─────────────────────────────────────────────────────────────────────────────

function parseTipoComprobante(lines) {
  for (const line of lines) {
    // "FACTURA A", "FACTURA B", "FACTURA C", "NOTA DE CRÉDITO A", etc.
    const m = line.match(/\b(FACTURA|NOTA\s+DE\s+CR[EÉ]DITO|NOTA\s+DE\s+D[EÉ]BITO|RECIBO)\s*([ABC]?)\b/i);
    if (m) {
      const tipo = m[1].replace(/\s+/g, ' ').trim();
      const letra = m[2]?.toUpperCase() || '';
      return letra ? `${tipo} ${letra}` : tipo;
    }
  }
  return null;
}

function parseNumeroComprobante(lines) {
  for (const line of lines) {
    // "0001-00012345", "00001 - 00012345", "Nro. 0001-00012345"
    const m = line.match(/(\d{1,5})\s*[-–—]\s*(\d{6,8})/);
    if (m) {
      const pv = m[1].padStart(4, '0');
      const nro = m[2].padStart(8, '0');
      // Descartar si parece un CUIT (dos dígitos guión ocho dígitos guión uno)
      if (m[1].length === 2 && m[2].length === 8) continue;
      return { puntoVenta: pv, numero: nro, numeroCompleto: `${pv}-${nro}` };
    }
  }
  return null;
}

function parseFecha(lines) {
  // Buscar en todo el texto la primera fecha DD/MM/YYYY que aparezca cerca de "Fecha" o en general
  for (const line of lines) {
    // Busca explícitamente "Fecha de emisión" / "Fecha Emis." / "Fecha:"
    if (/fecha/i.test(line)) {
      const m = line.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
      if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    }
  }
  // Fallback: primera fecha en cualquier línea
  for (const line of lines) {
    const m = line.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (m) {
      const day = parseInt(m[1]), month = parseInt(m[2]), year = parseInt(m[3]);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2099) {
        return `${m[3]}-${m[2]}-${m[1]}`;
      }
    }
  }
  return null;
}

function parseCuits(lines) {
  const allCUITs = [];
  for (const line of lines) {
    // CUIT con guiones: 20-12345678-9
    const matches = [...line.matchAll(/\b(\d{2})\s*[-–]\s*(\d{7,8})\s*[-–]\s*(\d{1})\b/g)];
    for (const m of matches) {
      allCUITs.push(`${m[1]}${m[2]}${m[3]}`);
    }
    // CUIT sin guiones: 20123456789 (11 dígitos)
    const matchesPlain = [...line.matchAll(/\b(\d{11})\b/g)];
    for (const m of matchesPlain) {
      const prefix = parseInt(m[1].substring(0, 2));
      if ([20, 23, 24, 27, 30, 33, 34].includes(prefix)) {
        allCUITs.push(m[1]);
      }
    }
  }
  // Deduplicar
  return [...new Set(allCUITs)];
}

function parseRazonSocial(lines, cuits) {
  // Buscar la línea que esté justo después de "Razón Social" o "Razón Social del Emisor"
  for (let i = 0; i < lines.length; i++) {
    if (/raz[oó]n\s+social/i.test(lines[i])) {
      // La razón social puede estar en la misma línea o en la siguiente
      const same = lines[i].replace(/raz[oó]n\s+social\s*[:.]?\s*/i, '').trim();
      if (same.length > 3) return same;
      if (lines[i + 1] && lines[i + 1].length > 3) return lines[i + 1].trim();
    }
  }
  // Segundo intento: buscar línea que contenga S.A., S.R.L., SRL, SA, SAS, S.A.S.
  for (const line of lines) {
    if (/\b(S\.?A\.?S?\.?|S\.?R\.?L\.?|SRL|SA)\b/i.test(line) && line.length > 6 && line.length < 120) {
      return line.trim();
    }
  }
  return null;
}

function parseImporte(raw) {
  if (!raw) return null;
  // El formato argentino usa "." como separador de miles y "," como decimal
  // Ej: "1.234.567,89" o "1234567,89"
  const clean = raw.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

function parseTotal(lines) {
  // Buscar la línea con el total más grande del documento
  const candidates = [];

  for (const line of lines) {
    // Buscar explícitamente "Total:" / "Importe Total:" / "Total a Pagar:"
    if (/\b(total|importe\s+total|total\s+a\s+pagar)\b/i.test(line)) {
      const m = line.match(/([\d.,]+)\s*$/);
      if (m) {
        const val = parseImporte(m[1]);
        if (val !== null && val > 0) candidates.push(val);
      }
    }
  }

  if (candidates.length > 0) {
    // El total correcto suele ser el más grande
    return Math.max(...candidates);
  }

  return null;
}

function parseCAE(lines) {
  for (const line of lines) {
    if (/cae/i.test(line)) {
      const m = line.match(/\b(\d{14})\b/);
      if (m) return m[1];
    }
  }
  // Fallback: cualquier secuencia de 14 dígitos
  for (const line of lines) {
    const m = line.match(/\b(\d{14})\b/);
    if (m) return m[1];
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Función pública
// ─────────────────────────────────────────────────────────────────────────────
export async function extractFromPDF(file) {
  try {
    const rawLines = await getPDFText(file);
    const lines = rawLines.map(normalizeLine).filter(Boolean);

    // Debug: exportar texto crudo
    const rawText = lines.join('\n');

    const cuits = parseCuits(lines);
    const numComp = parseNumeroComprobante(lines);

    const data = {
      tipoComprobante: parseTipoComprobante(lines),
      puntoVenta:      numComp?.puntoVenta || null,
      numero:          numComp?.numero || null,
      numeroCompleto:  numComp?.numeroCompleto || null,
      fecha:           parseFecha(lines),
      cuit:            cuits[0] || null,             // CUIT del emisor (primero)
      cae:             parseCAE(lines),
      impTotal:        parseTotal(lines),
      razonSocial:     parseRazonSocial(lines, cuits),
      todosLosCUITs:   cuits,
      esEscaneado:     rawText.length < 100,
      origen:          'pdf',
      rawTextLength:   rawText.length,
    };

    return { success: true, data, rawText: rawText.slice(0, 800) };

  } catch (err) {
    console.error('[pdfExtractor]', err);
    return {
      success: false,
      data: { esEscaneado: true, origen: 'pdf' },
      error: err.message,
    };
  }
}
