// ─────────────────────────────────────────────────────────────────────────────
// arcaParser.js — Parsea el XLS/XLSX/CSV exportado desde ARCA (AFIP)
// ─────────────────────────────────────────────────────────────────────────────
import { read, utils } from 'xlsx';

/** Detecta si el buffer es un CSV (texto plano) o un binario XLS/XLSX */
function isCSV(buffer) {
  // Los primeros bytes de XLS son D0 CF (OLE2) o PK (XLSX zip)
  const bytes = new Uint8Array(buffer.slice(0, 4));
  const isXLS  = bytes[0] === 0xD0 && bytes[1] === 0xCF;
  const isXLSX = bytes[0] === 0x50 && bytes[1] === 0x4B;
  return !isXLS && !isXLSX;
}

/** Convierte un buffer CSV (UTF-8 o latin1) a array de filas */
function parseCSVBuffer(buffer) {
  // CRÍTICO: usar {fatal:true} para que falle realmente con latin-1
  // Los CSVs de ARCA son latin-1 (ISO-8859-1), no UTF-8
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
  catch { text = new TextDecoder('latin1').decode(buffer); }

  console.log('[parseCSVBuffer] Primeros 100 chars:', text.slice(0, 100));

  // ARCA usa ";" como separador; fallback a coma o tab
  const sep = text.includes(';') ? ';' : (text.includes('\t') ? '\t' : ',');
  console.log('[parseCSVBuffer] Separador detectado:', JSON.stringify(sep));

  return text
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0)
    .map(line => line.split(sep).map(cell => cell.trim().replace(/^"|"$/g, '') || null));
}

/**
 * Lee las primeras filas del archivo e intenta detectar automáticamente:
 *   - tipoImport : 'emitidos' | 'recibidos' | null
 *   - cuit       : string 11 dígitos | null
 *
 * Para XLS: busca en las primeras filas del contenido.
 * Para CSV: el nombre del archivo ya contiene toda la info
 *   (ej: comprobantes_consulta_csv_recibidos_170962050_30715128140_20260407)
 *
 * @param {ArrayBuffer} buffer
 * @param {string} filename  - nombre del archivo (File.name), usado para CSV
 */
export function detectARCAMeta(buffer, filename = '') {
  let titleText = '';

  if (isCSV(buffer)) {
    // CSV de ARCA: toda la metadata está en el nombre del archivo
    titleText = filename.replace(/_/g, ' ');
    console.log('[detectARCAMeta] CSV — usando filename:', titleText);
  } else {
    // XLS/XLSX: la primera fila del sheet contiene el título
    const wb = read(buffer, { type: 'array', cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = utils.sheet_to_json(ws, { header: 1, defval: null });
    titleText = (rows.slice(0, 2) || [])
      .flat()
      .map(c => c?.toString() ?? '')
      .join(' ');
    console.log('[detectARCAMeta] XLS — texto:', titleText);
  }

  let tipoImport = null;
  if     (/emitid/i.test(titleText))  tipoImport = 'emitidos';
  else if (/recibid/i.test(titleText)) tipoImport = 'recibidos';

  // CUIT: 11 dígitos consecutivos
  const cuitMatch = titleText.replace(/-/g, '').match(/\b(\d{11})\b/);
  const cuit = cuitMatch ? cuitMatch[1] : null;

  console.log('[detectARCAMeta] tipoImport:', tipoImport, '| CUIT:', cuit);

  return { tipoImport, cuit, titleText };
}


// Mapeo de tipos de comprobante AFIP → nombre legible
const TIPOS_AFIP = {
  '001': 'Factura A',       '002': 'Nota Débito A',   '003': 'Nota Crédito A',
  '006': 'Factura B',       '007': 'Nota Débito B',   '008': 'Nota Crédito B',
  '011': 'Factura C',       '012': 'Nota Débito C',   '013': 'Nota Crédito C',
  '019': 'Factura E',       '020': 'Nota Débito E',   '021': 'Nota Crédito E',
  '051': 'Factura M',       '081': 'Tique',           '082': 'Tique Factura A',
  '083': 'Tique Factura B', '091': 'Remito R',
};

// Alias de columnas fijas de ARCA
// NOTA: El IVA viene separado por alícuota ("IVA 21%", "IVA 10,5%", etc.)
//       → se auto-detectan y suman en el parser; no se mapean en COL_MAP
const COL_MAP = {
  // --- Columnas fecha/tipo ---
  fecha:          [
    // CSV de ARCA (latin-1 o utf-8)
    'Fecha de Emisión', 'Fecha de Emision',
    // XLS de ARCA
    'Fecha', 'FECHA', 'fecha',
  ],
  tipo:           [
    'Tipo de Comprobante',           // CSV
    'Tipo', 'TIPO', 'Tipo Cbte', 'Tipo Comprobante',  // XLS
  ],
  puntoVenta:     ['Punto de Venta', 'Pto.Vta', 'Pto. Vta', 'PtoVta'],
  nroDesde:       [
    'Número Desde', 'Numero Desde',  // CSV (con/sin tilde)
    'Nro. Desde', 'Número', 'Nro Desde', 'NroDesde',  // XLS
  ],
  nroHasta:       ['Número Hasta', 'Numero Hasta', 'Nro. Hasta', 'NroHasta'],
  cae:            [
    'Cód. Autorización',   // CSV (con espacio después del punto)
    'Cód.Autorización',    // XLS (sin espacio)
    'CAE', 'Código Autorización', 'CodAuth',
  ],
  tipoDoc:        ['Tipo Doc. Receptor', 'Tipo Doc. Emisor', 'Tipo Doc'],
  nroDoc:         ['Nro. Doc. Receptor', 'Nro. Doc. Emisor', 'Nro. Doc', 'CUIT'],
  denominacion:   [
    // CSV recibidos: el emisor es el proveedor
    'Denominación Emisor',    'Denominacion Emisor',
    // CSV emitidos: el receptor es el cliente
    'Denominación Receptor',  'Denominacion Receptor',
    // XLS (con 'a' al final)
    'Denominación Receptora', 'Denominacion Receptora',
    'Denominación Emisora',   'Denominacion Emisora',
    // Variantes genéricas
    'Denominación',           'Denominacion',
    'Razon Social',           'Razón Social',
    'Nombre Receptor',        'Nombre Emisor',
    'Nombre',
  ],
  impTotal:       ['Imp. Total', 'Imp.Total', 'Total'],
  impNoGravados:  [
    'Imp. Neto No Gravado',           // CSV
    'Neto No Gravado',                // XLS
    'Imp. Tot. Conc. No Gravados',    // XLS viejo
    'No Gravados', 'ImpNoGravados', 'Neto No Gravado',
  ],
  impExentas:     ['Imp. Op. Exentas', 'Op. Exentas', 'Exentas', 'Imp.OpExentas'],
  impNetoGravado: [
    'Imp. Neto Gravado Total',        // CSV (columna totalizadora)
    'Imp. Neto Gravado',              // variante XLS
    'Neto Gravado', 'ImpNetoGravado', 'Neto Gravado Total',
  ],
  otrosTributos:  ['Otros Tributos', 'Otros tributos'],
  // IVA totalizado (columna pre-calculada por ARCA, más confiable que sumar alicuotas)
  impIVA:         ['Total IVA', 'Total de IVA', 'IVA Total'],
};

// Columnas de IVA por alícuota: "IVA 21%", "IVA 10,5%", "IVA 2,5%", etc.
const IVA_COL_PATTERN    = /^iva\s+[\d,.]+\s*%?\s*$/i;
// Columnas de neto gravado por alícuota: "Neto Grav. IVA 21%", etc.
const NETO_GRAV_PATTERN  = /^neto\s+grav/i;

// ─── helpers ────────────────────────────────────────────────────────────────

function findCol(headers, aliases) {
  for (const a of aliases) {
    const found = headers.find(h => h?.toString().trim().toLowerCase() === a.toLowerCase());
    if (found !== undefined) return found;
  }
  return null;
}

function getCell(row, headers, aliases) {
  const col = findCol(headers, aliases);
  if (col === null) return null;
  return row[col] ?? null;
}

/**
 * Parsea un importe que puede venir en formato argentino (1.234,56)
 * o anglosajón (1234.56 / 1,234.56).
 */
function parseAmount(raw) {
  if (raw === null || raw === undefined || raw === '') return 0;
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
  const s = String(raw).trim().replace(/\s/g, '');
  if (!s || s === '-') return 0;
  // Detectar formato: si la coma viene después del último punto → coma es decimal (AR)
  const lastComma = s.lastIndexOf(',');
  const lastDot   = s.lastIndexOf('.');
  if (lastComma > lastDot) {
    // Formato argentino: 1.234,56 → quitar puntos, reemplazar coma por punto
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  }
  // Formato anglosajón / sin separador de miles: 1234.56 o 1,234.56
  return parseFloat(s.replace(/,/g, '')) || 0;
}

/** Suma el valor de TODAS las columnas cuyos headers coincidan con el patrón regex */
function sumColsByPattern(row, headers, pattern) {
  let total = 0;
  for (const h of headers) {
    if (h && pattern.test(h.toString().trim())) {
      total += parseAmount(row[h] ?? 0);
    }
  }
  return total;
}

function parseFecha(raw) {
  if (!raw) return null;
  if (typeof raw === 'number') {
    // Excel serial date → ISO
    const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
    const y  = d.getUTCFullYear();
    const m  = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }
  const s = String(raw).trim();
  // DD/MM/YYYY
  const m1 = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
  // YYYY-MM-DD
  if (/^\d{4}[\/\-]\d{2}[\/\-]\d{2}$/.test(s)) return s;
  return s;
}

function parseTipo(raw) {
  if (!raw) return null;
  const s = String(raw).trim();

  // 1. Código numérico (XLS: 1, 3, 6 → '001', '003', '006')
  const cod = s.padStart(3, '0');
  if (TIPOS_AFIP[cod]) return { codigo: cod, nombre: TIPOS_AFIP[cod] };

  // 2. Nombre descriptivo (CSV: "Factura A", "Nota de Crédito A", etc.)
  //    Normaliza tildes Y la preposición "de" para cubrir variantes de ARCA
  //    "Nota de Crédito A" === "Nota Crédito A" luego de normalizar
  const norm = (t) => t
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // quita tildes
    .replace(/\bde\b\s*/g, '')                          // quita "de "
    .replace(/\s+/g, ' ').trim();

  const entrada = Object.entries(TIPOS_AFIP).find(([, nombre]) => norm(nombre) === norm(s));
  if (entrada) return { codigo: entrada[0], nombre: entrada[1] };

  // 3. Fallback
  return { codigo: s, nombre: s };
}

function parseNumero(raw) {
  if (raw === null || raw === undefined) return null;
  return String(raw).trim().replace(/^0+/, '') || '0';
}

// ─── parser principal ────────────────────────────────────────────────────────

/**
 * Parsea un archivo XLS/XLSX de ARCA y retorna un array de comprobantes normalizados.
 *
 * @param {ArrayBuffer} buffer    - contenido del archivo
 * @param {'emitidos'|'recibidos'} tipoImport
 * @param {string} empresa        - 'AMECON' | 'BLUE ELEPHANT'
 * @returns {Array} comprobantes normalizados
 */
export function parseARCA(buffer, tipoImport, empresa) {
  let rows;
  if (isCSV(buffer)) {
    rows = parseCSVBuffer(buffer);
    console.log('[arcaParser] Formato: CSV | Filas totales:', rows.length);
  } else {
    const wb        = read(buffer, { type: 'array', cellDates: false });
    const sheetName = wb.SheetNames[0];
    const ws        = wb.Sheets[sheetName];
    rows = utils.sheet_to_json(ws, { header: 1, defval: null });
    console.log('[arcaParser] Formato: XLS | Hoja:', sheetName, '| Filas totales:', rows.length);
  }

  if (rows.length < 2) return [];

  // Auto-detectar fila de headers: la que más columnas conocidas tenga en las primeras 5 filas
  const allAliases = Object.values(COL_MAP).flat().map(a => a.toLowerCase());
  let headerRowIdx = 0;
  let bestScore    = -1;
  for (let r = 0; r < Math.min(5, rows.length); r++) {
    const cells = (rows[r] || []).map(h => h?.toString().trim());
    const score = cells.filter(h =>
      allAliases.includes(h?.toLowerCase()) ||
      IVA_COL_PATTERN.test(h) ||
      NETO_GRAV_PATTERN.test(h)
    ).length;
    if (score > bestScore) { bestScore = score; headerRowIdx = r; }
  }
  console.log('[arcaParser] Fila de headers:', headerRowIdx, '(columnas detectadas:', bestScore, ')');

  const headers = rows[headerRowIdx].map(h => h?.toString().trim());
  console.log('[arcaParser] Headers:', headers);

  // Columnas IVA por alícuota detectadas
  const ivaHeaders = headers.filter(h => h && IVA_COL_PATTERN.test(h));
  console.log('[arcaParser] Columnas IVA por alícuota:', ivaHeaders);

  // Log de mapeo de columnas fijas
  const mappedCols = {};
  for (const [key, aliases] of Object.entries(COL_MAP)) {
    mappedCols[key] = findCol(headers, aliases) ?? '❌ NO ENCONTRADO';
  }
  console.log('[arcaParser] Mapeo COL_MAP:', mappedCols);

  const resultado = [];

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = {};
    headers.forEach((h, idx) => { row[h] = rows[i][idx]; });

    const fecha = parseFecha(getCell(row, headers, COL_MAP.fecha));
    if (!fecha) continue; // fila vacía o totalizadora

    const tipoRaw    = getCell(row, headers, COL_MAP.tipo);
    const tipoParsed = parseTipo(tipoRaw);
    const ptoVenta   = String(getCell(row, headers, COL_MAP.puntoVenta) ?? '').trim().padStart(4, '0');
    const nroDesde   = parseNumero(getCell(row, headers, COL_MAP.nroDesde));
    const nro        = nroDesde ? String(nroDesde).padStart(8, '0') : null;
    const numeroCompleto = ptoVenta && nro ? `${ptoVenta}-${nro}` : null;

    // ── Contraparte: depende de si son emitidos (→ Receptor) o recibidos (→ Emisor) ──────
    // Para recibidos: quien emitió la factura ES el proveedor (nro+denom EMISOR)
    // Para emitidos:  quien la recibió ES el cliente (nro+denom RECEPTOR)
    const isRecibidos = tipoImport === 'recibidos';
    const nroDocAliases = isRecibidos
      ? ['Nro. Doc. Emisor',  'Nro. Doc. Receptor', 'Nro. Doc', 'CUIT']
      : ['Nro. Doc. Receptor', 'Nro. Doc. Emisor',  'Nro. Doc', 'CUIT'];
    const denomAliases = isRecibidos
      ? ['Denominación Emisor',   'Denominacion Emisor',
         'Denominación Emisora',  'Denominacion Emisora',
         'Denominación', 'Denominacion', 'Razón Social', 'Razon Social', 'Nombre Emisor', 'Nombre']
      : ['Denominación Receptor',  'Denominacion Receptor',
         'Denominación Receptora', 'Denominacion Receptora',
         'Denominación', 'Denominacion', 'Razón Social', 'Razon Social', 'Nombre Receptor', 'Nombre'];

    const nroDoc = String(getCell(row, headers, nroDocAliases) ?? '').trim();
    const cuit   = nroDoc.length >= 10 ? nroDoc : null;

    // ── Importes ──────────────────────────────────────────────────────────────
    // IVA: usar "Total IVA" (columna pre-calculada por ARCA) como fuente primaria.
    // Algunos tipos (ej. tipo 81) dejan vacías las columnas de alícuota pero sí tienen "Total IVA".
    // Fallback: sumar columnas individuales "IVA 21%", "IVA 10,5%", etc.
    let impIVA = parseAmount(getCell(row, headers, COL_MAP.impIVA));
    if (!impIVA) {
      impIVA = sumColsByPattern(row, headers, IVA_COL_PATTERN);
    }

    // Neto gravado: intentar columna directa; si no, sumar "Neto Grav. IVA XX%"
    let impNetoGravado = parseAmount(getCell(row, headers, COL_MAP.impNetoGravado));
    if (!impNetoGravado) {
      impNetoGravado = sumColsByPattern(row, headers, NETO_GRAV_PATTERN);
    }

    const impTotal      = parseAmount(getCell(row, headers, COL_MAP.impTotal));
    const impNoGravados = parseAmount(getCell(row, headers, COL_MAP.impNoGravados));
    const impOpExentas  = parseAmount(getCell(row, headers, COL_MAP.impExentas));
    const otrosTributos = parseAmount(getCell(row, headers, COL_MAP.otrosTributos));

    resultado.push({
      id: `${empresa}-${tipoImport}-${fecha}-${numeroCompleto || i}`,
      empresa,
      tipoImport,
      fecha,
      periodo: fecha.slice(0, 7),

      // Comprobante
      tipoCodigo:    tipoParsed?.codigo,
      tipoNombre:    tipoParsed?.nombre,
      puntoVenta:    ptoVenta,
      numero:        nro,
      numeroCompleto,
      cae:           String(getCell(row, headers, COL_MAP.cae) ?? '').trim() || null,

      // Contraparte
      cuit,
      denominacion: String(getCell(row, headers, denomAliases) ?? '').trim() || null,

      // Importes
      impTotal,
      impNoGravados,
      impOpExentas,
      impNetoGravado,
      impIVA,
      otrosTributos,

      // Metadata
      origen:    'arca',
      estadoPDF: 'pendiente',
    });
  }

  console.log('[arcaParser] Comprobantes parseados:', resultado.length);

  if (resultado.length === 0) {
    // Armar mensaje diagnóstico con los headers reales para facilitar el debug
    const headersMsg = headers.filter(Boolean).join(' | ');
    const scoreMsg   = `Score de detección: ${bestScore} (fila ${headerRowIdx})`;
    throw new Error(
      `No se encontraron comprobantes válidos en el archivo.\n` +
      `${scoreMsg}\n` +
      `Columnas detectadas: ${headersMsg}`
    );
  }

  const sample = resultado[0];
  console.log('[arcaParser] Muestra fila 1:', {
    fecha: sample.fecha, tipo: sample.tipoCodigo,
    impTotal: sample.impTotal, impIVA: sample.impIVA,
    denominacion: sample.denominacion, cuit: sample.cuit,
  });

  return resultado;
}
