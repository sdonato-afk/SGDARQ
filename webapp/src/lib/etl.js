/**
 * MOTOR DE IMPORTACIÓN AVANZADO (ETL) - SISTEMA D+ARQ
 * Normalización Automática, Detección de Duplicados, Limpieza
 * v2.0 — TC inteligente, limpieza agresiva, validación robusta
 */

// ═══════════════════════════════════════════════════
// NORMALIZACIÓN DE FECHAS
// Soporta: DD/MM/YY, DD/MM/YYYY, DD-MM-YY, YYYY-MM-DD, D/M/YY
// ═══════════════════════════════════════════════════
export const normalizeDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    let dStr = dateStr.toString().trim();
    
    // Ya es YYYY-MM-DD
    if (dStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dStr;
    
    // Formato español DD/MM/YYYY o DD-MM-YYYY o D/M/YY
    const parts = dStr.split(/[\/\-\.]/);
    if (parts.length === 3) {
        let [d, m, y] = parts;
        // Detectar si está invertido (YYYY-MM-DD con separadores /)
        if (d.length === 4) { 
            // Formato YYYY/MM/DD
            return `${d}-${m.padStart(2, '0')}-${y.padStart(2, '0')}`;
        }
        if (y.length === 2) y = parseInt(y) > 50 ? "19" + y : "20" + y;
        
        // Validar rangos — si día > 31, es probable un typo, tomamos últimos 2 dígitos
        let dayNum = parseInt(d);
        let monthNum = parseInt(m);
        if (dayNum > 31) dayNum = dayNum % 100 || 1;
        if (monthNum > 12) monthNum = monthNum % 100 || 1;
        if (dayNum < 1) dayNum = 1;
        if (monthNum < 1) monthNum = 1;
        
        return `${y}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    }
    return new Date().toISOString().split('T')[0];
};

// ═══════════════════════════════════════════════════
// NORMALIZACIÓN DE NÚMEROS
// Elimina: $, USD, u$d, ARS, puntos de miles, espacios
// Soporta: 1.234.567,89 y 1,234,567.89
// ═══════════════════════════════════════════════════
export const normalizeNumber = (numStr) => {
    if (!numStr && numStr !== 0) return 0;
    // Borrar símbolos de moneda, espacios y caracteres no numéricos excepto . , -
    let cleaned = numStr.toString()
        .replace(/[$]/g, '')
        .replace(/USD/gi, '')
        .replace(/u\$d/gi, '')
        .replace(/ARS/gi, '')
        .replace(/\s/g, '')
        .trim();
    
    if (!cleaned) return 0;
    
    let num = 0;
    // Detectar formato: si tiene puntos Y comas
    if (cleaned.includes(',') && cleaned.includes('.')) {
        // Si la última coma está después del último punto → formato 1.234,56
        if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
            num = parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
        } else {
            // Formato 1,234.56
            num = parseFloat(cleaned.replace(/,/g, ""));
        }
    } else if (cleaned.includes(',')) {
        // Solo coma: podría ser decimal (1234,56) o miles (1,234)
        const afterComma = cleaned.split(',')[1];
        if (afterComma && afterComma.length <= 2) {
            // Es decimal
            num = parseFloat(cleaned.replace(",", "."));
        } else {
            // Es separador de miles
            num = parseFloat(cleaned.replace(/,/g, ""));
        }
    } else {
        num = parseFloat(cleaned);
    }
    return isNaN(num) ? 0 : num; // Preservar signo negativo para devoluciones/créditos
};

// ═══════════════════════════════════════════════════
// LIMPIEZA DE STRINGS
// TRIM + opcionalmente UPPERCASE
// ═══════════════════════════════════════════════════
export const cleanString = (str, isUppercase = false) => {
    if (!str) return '';
    let cleaned = str.toString().trim().replace(/\s+/g, ' '); // Colapsar espacios múltiples
    if (isUppercase) cleaned = cleaned.toUpperCase();
    return cleaned;
};

// ═══════════════════════════════════════════════════
// LEVENSHTEIN — Distancia para fuzzy matching
// ═══════════════════════════════════════════════════
export const levenshtein = (a, b) => {
    const matrix = [];
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
};

/**
 * findSimilar — Busca entidades similares.
 * Estrategia de matching (en orden de prioridad):
 *   1. Exacto (lowercase trim)
 *   2. Uno contiene al otro (ej: "Rodriguez" matchea "Rodriguez Juan")
 *   3. Levenshtein <= 2
 */
export const findSimilar = (name, entitiesList) => {
    if (!name) return { exact: false, similar: false, id: null };
    const lowerName = name.toLowerCase().trim();
    if (!lowerName) return { exact: false, similar: false, id: null };

    // Fase 1: Exacto
    for (const ent of entitiesList) {
        if (!ent.nombre) continue;
        const entName = ent.nombre.toLowerCase().trim();
        if (entName === lowerName) return { exact: true, id: ent.id, nombre: ent.nombre };
    }

    // Fase 2: Contains (uno contiene al otro, mínimo 3 chars para evitar falsos positivos)
    if (lowerName.length >= 3) {
        for (const ent of entitiesList) {
            if (!ent.nombre) continue;
            const entName = ent.nombre.toLowerCase().trim();
            if (entName.length >= 3 && (entName.includes(lowerName) || lowerName.includes(entName))) {
                return { exact: false, similar: true, id: ent.id, nombre: ent.nombre };
            }
        }
    }

    // Fase 3: Levenshtein <= 2
    for (const ent of entitiesList) {
        if (!ent.nombre) continue;
        const entName = ent.nombre.toLowerCase().trim();
        if (levenshtein(lowerName, entName) <= 2) {
            return { exact: false, similar: true, id: ent.id, nombre: ent.nombre };
        }
    }

    return { exact: false, similar: false, id: null };
};

/**
 * isDuplicateMovement — Fecha + Monto + Proveedor
 */
export const isDuplicateMovement = (fecha, monto, provNombre, allMovements) => {
    return allMovements.some(m =>
        m.fecha === fecha &&
        Math.abs(parseFloat(m.monto || 0) - monto) < 0.01 &&
        (m.proveedorNombre || '').toLowerCase().trim() === (provNombre || '').toLowerCase().trim()
    );
};

/**
 * findLastTC — Busca el último tipo de cambio usado en movimientos USD
 * Prioriza por fecha cercana; si no hay, usa cotizacionBlue del contexto.
 */
export const findLastTC = (fecha, movimientos, cotizacionBlue = 1250) => {
    // Filtrar movimientos en USD que tengan TC registrado
    const usdMovs = movimientos
        .filter(m => m.moneda === 'USD' && parseFloat(m.cotizacionHistorica || m.tipoCambioReferencia || m.tc || 0) > 0)
        .sort((a, b) => {
            // Priorizar por fecha más cercana
            const distA = Math.abs(new Date(a.fecha) - new Date(fecha));
            const distB = Math.abs(new Date(b.fecha) - new Date(fecha));
            return distA - distB;
        });
    
    if (usdMovs.length > 0) {
        return parseFloat(usdMovs[0].cotizacionHistorica || usdMovs[0].tipoCambioReferencia || usdMovs[0].tc);
    }
    return cotizacionBlue;
};

/**
 * normalizeCaja — Normaliza el nombre de caja
 */
export const normalizeCaja = (cajaStr, moneda) => {
    if (!cajaStr) return moneda === 'USD' ? 'Caja Dólares' : 'Caja Pesos';
    const upper = cajaStr.toUpperCase().trim();
    const cajaMap = {
        'CAJA DOLARES': 'Caja Dólares', 'CAJA DÓLARES': 'Caja Dólares', 'CAJA USD': 'Caja Dólares',
        'CAJA PESOS': 'Caja Pesos', 'CAJA ARS': 'Caja Pesos', 'EFECTIVO': 'Caja Pesos',
        'BANCO AMECON': 'Banco Amecon', 'AMECON': 'Banco Amecon',
        'BANCO BLUE': 'Banco Blue', 'BLUE': 'Banco Blue',
        'MP AMECON': 'MP Amecon', 'MERCADOPAGO AMECON': 'MP Amecon',
        'MP BLUE': 'MP Blue', 'MERCADOPAGO BLUE': 'MP Blue',
    };
    return cajaMap[upper] || cajaStr.trim();
};
