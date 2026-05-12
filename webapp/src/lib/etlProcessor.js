/**
 * ETL PROCESSOR v3.0 — Sistema D+ARQ
 * 
 * Importadores actualizados con columnas exactas de cada área.
 * Todos los campos clasificadores se normalizan: lowercase + sin acentos.
 * 
 * COLUMNAS POR ÁREA:
 * 
 * Oficina (12 cols):
 *   [0]FECHA [1]TIPO [2]MONEDA [3]MONTO [4]CAJA [5]CATEGORIA [6]RUBRO [7]CONCEPTO [8]PROVEEDOR [9]TC [10]dolarizado [11]neto_usd
 *
 * Obras (13 cols):
 *   [0]FECHA [1]TIPO [2]MONEDA [3]MONTO [4]CAJA [5]OBRA [6]CATEGORIA [7]RUBRO [8]CONCEPTO [9]PROVEEDOR [10]TC [11]dolarizado [12]neto_usd
 *
 * Alquileres (14 cols):
 *   [0]FECHA [1]TIPO [2]MONEDA [3]MONTO [4]CAJA [5]PROPIEDAD [6]CATEGORIA [7]RUBRO [8]CONCEPTO [9]PROVEEDOR/INQUILINO [10]TC [11]dolarizado [12]neto_usd [13]EDIFICIO
 *
 * Directorio (12 cols):
 *   [0]FECHA [1]TIPO [2]MONEDA [3]MONTO [4]CAJA [5]CATEGORIA [6]RUBRO [7]CONCEPTO [8]DIRECTOR [9]TC [10]dolarizado [11]neto_usd
 */

import {
  normalizeDate,
  normalizeNumber,
  cleanString,
  findSimilar,
  isDuplicateMovement,
  findLastTC,
  normalizeCaja,
} from './etl';

// ─────────────────────────────────────────────────────────────
// Normalización de texto: minúsculas sin acentos para almacenar
// Ej: "Materiales Básicos" → "materiales basicos"
// ─────────────────────────────────────────────────────────────
export const normalizeText = (str) => {
  if (!str) return '';
  return str
    .toString()
    .trim()
    .normalize('NFD')                        // Descomponer caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '')         // Eliminar marcas diacríticas
    .toLowerCase()
    .replace(/\s+/g, ' ')                    // Colapsar espacios
    .trim();
};

// ─────────────────────────────────────────────────────────────
// normalizeMoneda — detecta ARS o USD desde texto libre
// ─────────────────────────────────────────────────────────────
const normalizeMoneda = (str) => {
  if (!str) return 'ARS';
  const u = str.toString().toUpperCase().trim();
  if (u.includes('USD') || u.includes('DOLAR') || u.includes('DÓLAR') || u.includes('U$D') || u.includes('DLS')) return 'USD';
  return 'ARS';
};

// ─────────────────────────────────────────────────────────────
// normalizeCategoria — mapea texto libre a categoría canónica
// ─────────────────────────────────────────────────────────────
const normalizeCategoria = (str, area) => {
  const raw = normalizeText(str);
  // Mapa de alias → canónico (ya normalizados)
  const mapObrasAlq = {
    'mano de obra': 'mano de obra', 'mano obra': 'mano de obra', 'mo': 'mano de obra',
    'materiales': 'materiales', 'material': 'materiales',
    'impuestos': 'impuestos', 'impuesto': 'impuestos',
    'servicios': 'servicios', 'servicio': 'servicios',
    'varios': 'varios',
    'alquiler': 'alquiler',
    'alquileres': 'alquiler',   // alias: 'Alquileres' (el área) → 'alquiler' (el sub-tipo)
    'expensas': 'expensas',
    'ingresos': 'ingresos',
  };
  const mapOficina = {
    'inmueble': 'inmueble',
    'empleados': 'empleados',
    'servicios': 'servicios',
    'impuestos': 'impuestos',
    'equipamiento': 'equipamiento',
    'insumos': 'insumos',
    'varios': 'varios',
    'ingresos': 'ingresos',
  };
  const mapDir = {
    'retiros': 'retiros',
    'impuestos': 'impuestos',
    'servicios': 'servicios',
    'gastos compartidos': 'gastos compartidos',
    'aportes de capital': 'aportes de capital',
    'devoluciones': 'devoluciones',
    'prestamos': 'prestamos',
    'otros egresos': 'otros egresos',
    'varios': 'varios',
  };
  const map = area === 'Oficina' ? mapOficina : area === 'Directorio' ? mapDir : mapObrasAlq;
  return map[raw] || raw;
};

// ─────────────────────────────────────────────────────────────
// parseTCFromRow — Extrae TC de la celda o usa histórico/blue
// ─────────────────────────────────────────────────────────────
const parseTCFromRow = (tcStr, fecha, moneda, movimientos, cotizacionBlue) => {
  let tc = normalizeNumber(tcStr);
  if (moneda === 'USD' && (tc === 0 || isNaN(tc))) {
    tc = findLastTC(fecha, movimientos, cotizacionBlue || 1400);
  } else if (moneda === 'ARS' && (tc === 0 || isNaN(tc))) {
    tc = cotizacionBlue || 1400;
  }
  return tc;
};

// ─────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL — processETL
// ─────────────────────────────────────────────────────────────
export const processETL = (rawText, type, context) => {
  const { obras, proveedores, clientes, propiedades, contratos, movimientos, cotizacionBlue } = context;

  const lines = rawText.trim().split('\n');
  let startIndex = 0;

  // Auto-detectar header
  const firstLine = lines[0].toLowerCase();
  if (firstLine.includes('fecha') || firstLine.includes('nombre') || firstLine.includes('tipo') ||
      firstLine.includes('monto') || firstLine.includes('moneda') || firstLine.includes('concepto')) {
    startIndex = 1;
  }

  const rows = [];
  const summary = { procesadas: 0, errores: 0, duplicados: 0 };

  for (let i = startIndex; i < lines.length; i++) {
    const row = lines[i].split('\t');
    if (row.length < 2 || row.every(c => !c.trim())) continue;

    const parsedRow = { original: lines[i], isValid: true, isDuplicate: false, warnings: [], data: {} };

    try {

      // ═══════════════════════════════════════════════════════
      // MOVIMIENTOS — ALQUILERES
      // [0]FECHA [1]TIPO [2]MONEDA [3]MONTO [4]CAJA [5]PROPIEDAD [6]CATEGORIA [7]RUBRO [8]CONCEPTO [9]PROV/INQUILINO [10]TC [11]dolarizado [12]neto_usd [13]EDIFICIO
      // ═══════════════════════════════════════════════════════
      if (type === 'movimientos_alquileres') {
        const [f, t, mon, mont, caj, prop, cat, rub, con, entidad, tc, _dol, netoUsdStr, edif] = row;

        const fecha    = normalizeDate(f);
        const tipo     = cleanString(t).toLowerCase().includes('ingreso') ? 'Ingreso' : 'Egreso';
        const moneda   = normalizeMoneda(mon);
        const monto    = normalizeNumber(mont);
        const caja     = normalizeCaja(caj, moneda);
        const propNombre = cleanString(prop);
        const categoria  = normalizeCategoria(cat, 'Alquileres');
        const rubro      = normalizeText(rub);
        const concepto   = normalizeText(con);
        const entidadStr = cleanString(entidad);
        const tcVal      = parseTCFromRow(tc, fecha, moneda, movimientos, cotizacionBlue);
        const netoUSD    = normalizeNumber(netoUsdStr);
        const edificio   = normalizeText(edif) || (propNombre.toUpperCase().startsWith('VO') ? 'vo' : 'mo');

        // Lookup Propiedad
        let propiedadId = '';
        if (propNombre) {
          const sim = findSimilar(propNombre, propiedades);
          if (sim.exact || sim.similar) {
            propiedadId = sim.id;
            if (sim.similar) parsedRow.warnings.push(`Propiedad similar: "${sim.nombre}"`);
          } else {
            parsedRow.warnings.push(`Propiedad "${propNombre}" no encontrada → se creará al importar`);
            parsedRow.data.propiedadNueva = propNombre;
          }
        }

        // Helper: buscar contrato activo más reciente para una propiedad
        const findActiveContract = (pId) => {
          if (!pId) return null;
          const now = new Date();
          const activos = contratos
            .filter(c => c.propiedadId === pId && c.clienteId)
            .sort((a, b) => new Date(b.fechaInicio || 0) - new Date(a.fechaInicio || 0));
          const vigente = activos.find(c => c.fechaFin && new Date(c.fechaFin) >= now);
          return vigente || activos[0] || null;
        };

        // Lookup Inquilino/Proveedor
        let clienteId = '';
        let proveedorId = '';
        if (entidadStr) {
          if (tipo === 'Ingreso') {
            // 1. Buscar en clientes por nombre
            const sim = findSimilar(entidadStr, clientes);
            if (sim.exact || sim.similar) {
              clienteId = sim.id;
              if (sim.similar) parsedRow.warnings.push(`Inquilino similar: "${sim.nombre}"`);
            }
            // 2. Si no matcheó por nombre, intentar inferir del contrato activo de la propiedad
            if (!clienteId && propiedadId) {
              const ct = findActiveContract(propiedadId);
              if (ct?.clienteId) {
                clienteId = ct.clienteId;
                const cliNombre = clientes.find(c => c.id === ct.clienteId)?.nombre || '';
                parsedRow.warnings.push(`Inquilino "${entidadStr}" → inferido del contrato: ${cliNombre}`);
              }
            }
            // 3. Si sigue sin matchear, crear nuevo
            if (!clienteId) {
              parsedRow.warnings.push(`Inquilino "${entidadStr}" no existe → se creará al importar`);
              parsedRow.data.clienteNuevo = entidadStr;
            }
          } else {
            // Egreso → buscar primero en proveedores, luego en clientes
            const simProv = findSimilar(entidadStr, proveedores);
            if (simProv.exact || simProv.similar) {
              proveedorId = simProv.id;
              if (simProv.similar) parsedRow.warnings.push(`Proveedor similar: "${simProv.nombre}"`);
            } else {
              // También buscar en clientes (muchos egresos de alquileres son a nombre del inquilino)
              const simCli = findSimilar(entidadStr, clientes);
              if (simCli.exact || simCli.similar) {
                clienteId = simCli.id;
                if (simCli.similar) parsedRow.warnings.push(`Entidad matcheó como inquilino: "${simCli.nombre}"`);
              } else if (propiedadId) {
                // Intentar inferir del contrato
                const ct = findActiveContract(propiedadId);
                if (ct?.clienteId) {
                  clienteId = ct.clienteId;
                }
              }
              if (!proveedorId && !clienteId) {
                parsedRow.data.proveedorNuevo = entidadStr;
              }
            }
          }
        } else if (propiedadId) {
          // Sin entidad → siempre intentar inferir del contrato (tanto ingreso como egreso)
          const ct = findActiveContract(propiedadId);
          if (ct?.clienteId) {
            clienteId = ct.clienteId;
            const cliNombre = clientes.find(c => c.id === ct.clienteId)?.nombre || '';
            parsedRow.warnings.push(`Inquilino inferido del contrato: ${cliNombre}`);
          }
        }

        if (isDuplicateMovement(fecha, monto, entidadStr, movimientos)) {
          parsedRow.isDuplicate = true;
          parsedRow.warnings.push('⚠️ Posible duplicado (Fecha + Monto + Entidad)');
          summary.duplicados++;
        } else {
          summary.procesadas++;
        }

        parsedRow.data = {
          ...parsedRow.data,
          fecha, tipo, moneda, monto, caja,
          area: 'Alquileres',
          propiedadId,
          clienteId,
          proveedorId,
          obraId: '',
          directorId: '',
          categoriaEgreso: categoria,
          // Fix: si el rubro del CSV es '-' o vacío, derivar de la categoría
          // para evitar guardar guiones literales que ensucian los reportes
          rubro: (rubro === '-' || rubro === '') ? categoria : rubro,
          subRubro: '',
          concepto,
          edificio,
          netoUSD,
          tipoCambioReferencia: tcVal,
          cotizacionHistorica: tcVal,
          tipoObraIngreso: '',
          entidadNombre: normalizeText(entidadStr),
          propiedadNombre: normalizeText(propNombre),
        };

      // ═══════════════════════════════════════════════════════
      // MOVIMIENTOS — OBRAS
      // [0]FECHA [1]TIPO [2]MONEDA [3]MONTO [4]CAJA [5]OBRA [6]CATEGORIA [7]RUBRO [8]CONCEPTO [9]PROVEEDOR [10]TC [11]dolarizado [12]neto_usd
      // ═══════════════════════════════════════════════════════
      } else if (type === 'movimientos_obras') {
        const [f, t, mon, mont, caj, obraNom, cat, rub, con, provStr, tc, _dol, netoUsdStr] = row;

        const fecha   = normalizeDate(f);
        const tipo    = cleanString(t).toLowerCase().includes('ingreso') ? 'Ingreso' : 'Egreso';
        const moneda  = normalizeMoneda(mon);
        const monto   = normalizeNumber(mont);
        const caja    = normalizeCaja(caj, moneda);
        const obraStr = cleanString(obraNom);
        const categoria = normalizeCategoria(cat, 'Obras');
        const rubro     = normalizeText(rub);
        const concepto  = normalizeText(con);
        const prvStr    = cleanString(provStr);
        const tcVal     = parseTCFromRow(tc, fecha, moneda, movimientos, cotizacionBlue);
        const netoUSD   = normalizeNumber(netoUsdStr);

        // Lookup Obra
        let obraId = '';
        if (obraStr) {
          const sim = findSimilar(obraStr, obras);
          if (sim.exact || sim.similar) {
            obraId = sim.id;
            if (sim.similar) parsedRow.warnings.push(`Obra similar: "${sim.nombre}"`);
          } else {
            parsedRow.warnings.push(`Obra "${obraStr}" no encontrada → se creará al importar`);
            parsedRow.data.obraNueva = obraStr;
          }
        }

        // Lookup Proveedor
        let proveedorId = '';
        if (prvStr) {
          const sim = findSimilar(prvStr, proveedores);
          if (sim.exact || sim.similar) {
            proveedorId = sim.id;
            if (sim.similar) parsedRow.warnings.push(`Proveedor similar: "${sim.nombre}"`);
          } else {
            parsedRow.data.proveedorNuevo = prvStr;
          }
        }

        // Para ingresos de obra: detectar tipoObraIngreso
        let tipoObraIngreso = '';
        if (tipo === 'Ingreso') {
          const catU = (cat || '').trim().toUpperCase();
          const tipos = ['PAGO A CUENTA', 'CERTIFICACIONES', 'ANTICIPOS', 'ADICIONALES', 'VENTA UF'];
          tipoObraIngreso = tipos.find(t => catU.includes(t.replace(' ', ''))) || 'PAGO A CUENTA';
        }

        if (isDuplicateMovement(fecha, monto, prvStr, movimientos)) {
          parsedRow.isDuplicate = true;
          parsedRow.warnings.push('⚠️ Posible duplicado');
          summary.duplicados++;
        } else {
          summary.procesadas++;
        }

        parsedRow.data = {
          ...parsedRow.data,
          fecha, tipo, moneda, monto, caja,
          area: 'Obras',
          obraId,
          proveedorId,
          clienteId: '',
          propiedadId: '',
          directorId: '',
          categoriaEgreso: categoria,
          rubro,
          subRubro: '',
          concepto,
          netoUSD,
          tipoObraIngreso,
          tipoCambioReferencia: tcVal,
          cotizacionHistorica: tcVal,
          oBraNombre: normalizeText(obraStr),
          proveedorNombre: normalizeText(prvStr),
        };

      // ═══════════════════════════════════════════════════════
      // MOVIMIENTOS — OFICINA
      // [0]FECHA [1]TIPO [2]MONEDA [3]MONTO [4]CAJA [5]CATEGORIA [6]RUBRO [7]CONCEPTO [8]PROVEEDOR [9]TC [10]dolarizado [11]neto_usd
      // ═══════════════════════════════════════════════════════
      } else if (type === 'movimientos_oficina') {
        const [f, t, mon, mont, caj, cat, rub, con, provStr, tc, _dol, netoUsdStr] = row;

        const fecha     = normalizeDate(f);
        const tipo      = cleanString(t).toLowerCase().includes('ingreso') ? 'Ingreso' : 'Egreso';
        const moneda    = normalizeMoneda(mon);
        const monto     = normalizeNumber(mont);
        const caja      = normalizeCaja(caj, moneda);
        const categoria = normalizeCategoria(cat, 'Oficina');
        const rubro     = normalizeText(rub);
        const concepto  = normalizeText(con);
        const prvStr    = cleanString(provStr);
        const tcVal     = parseTCFromRow(tc, fecha, moneda, movimientos, cotizacionBlue);
        const netoUSD   = normalizeNumber(netoUsdStr);

        let proveedorId = '';
        if (prvStr) {
          const sim = findSimilar(prvStr, proveedores);
          if (sim.exact || sim.similar) {
            proveedorId = sim.id;
            if (sim.similar) parsedRow.warnings.push(`Proveedor similar: "${sim.nombre}"`);
          } else {
            parsedRow.data.proveedorNuevo = prvStr;
          }
        }

        if (isDuplicateMovement(fecha, monto, prvStr, movimientos)) {
          parsedRow.isDuplicate = true;
          parsedRow.warnings.push('⚠️ Posible duplicado');
          summary.duplicados++;
        } else {
          summary.procesadas++;
        }

        parsedRow.data = {
          ...parsedRow.data,
          fecha, tipo, moneda, monto, caja,
          area: 'Oficina',
          obraId: '',
          propiedadId: '',
          clienteId: '',
          proveedorId,
          directorId: '',
          categoriaEgreso: categoria,
          rubro,
          subRubro: '',
          concepto,
          netoUSD,
          tipoObraIngreso: '',
          entidadCuenta: normalizeText(prvStr),
          tipoCambioReferencia: tcVal,
          cotizacionHistorica: tcVal,
          proveedorNombre: normalizeText(prvStr),
        };

      // ═══════════════════════════════════════════════════════
      // MOVIMIENTOS — DIRECTORIO
      // [0]FECHA [1]TIPO [2]MONEDA [3]MONTO [4]CAJA [5]CATEGORIA [6]RUBRO [7]CONCEPTO [8]DIRECTOR [9]TC [10]dolarizado [11]neto_usd
      // ═══════════════════════════════════════════════════════
      } else if (type === 'movimientos_directorio') {
        const [f, t, mon, mont, caj, cat, rub, con, dirStr, tc, _dol, netoUsdStr] = row;

        const fecha     = normalizeDate(f);
        const tipo      = cleanString(t).toLowerCase().includes('ingreso') ? 'Ingreso' : 'Egreso';
        const moneda    = normalizeMoneda(mon);
        const monto     = normalizeNumber(mont);
        const caja      = normalizeCaja(caj, moneda);
        const categoria = normalizeCategoria(cat, 'Directorio');
        const rubro     = normalizeText(rub);
        const concepto  = normalizeText(con);
        const director  = cleanString(dirStr);
        const tcVal     = parseTCFromRow(tc, fecha, moneda, movimientos, cotizacionBlue);
        const netoUSD   = normalizeNumber(netoUsdStr);

        if (isDuplicateMovement(fecha, monto, director, movimientos)) {
          parsedRow.isDuplicate = true;
          parsedRow.warnings.push('⚠️ Posible duplicado');
          summary.duplicados++;
        } else {
          summary.procesadas++;
        }

        parsedRow.data = {
          ...parsedRow.data,
          fecha, tipo, moneda, monto, caja,
          area: 'Directorio',
          obraId: '',
          propiedadId: '',
          clienteId: '',
          proveedorId: '',
          directorId: (() => {
            if (!director) return '';
            const d = director.trim().toLowerCase();
            if (d.includes('santiago') || d === 'santi') return 'Santiago';
            if (d.includes('emiliano') || d === 'emi') return 'Emiliano';
            if (d.includes('sebastian') || d.includes('sebastián') || d === 'seba') return 'Sebastián';
            if (d.includes('florencia') || d === 'flor') return 'Florencia';
            // Capitalizar primera letra como fallback
            return director.charAt(0).toUpperCase() + director.slice(1).toLowerCase();
          })(),
          categoriaEgreso: categoria,
          rubro,
          subRubro: '',
          concepto,
          netoUSD,
          tipoObraIngreso: '',
          tipoCambioReferencia: tcVal,
          cotizacionHistorica: tcVal,
        };

      // ═══════════════════════════════════════════════════════
      // MAESTRAS (pasan al procesador viejo de forma delegada)
      // ═══════════════════════════════════════════════════════
      } else if (type === 'maestra_obras' || type === 'obras') {
        const [n, dir, fi, ff, avance, est, cli] = row;
        const nombre = cleanString(n);
        let porcentaje = 0;
        if (avance) {
          const avStr = avance.toString().trim().replace('%', '').replace(',', '.');
          const p = parseFloat(avStr) || 0;
          porcentaje = p > 0 && p <= 1 ? p * 100 : p;
        }
        let estado = cleanString(est) || 'En Proceso';
        const eL = estado.toLowerCase();
        if (eL.includes('proceso') || eL.includes('progreso')) estado = 'En Proceso';
        else if (eL.includes('finaliz') || eL.includes('termin') || eL.includes('complet')) estado = 'Finalizada';
        else if (eL.includes('paus') || eL.includes('deten')) estado = 'Pausada';

        if (!nombre) { parsedRow.isValid = false; parsedRow.warnings.push('Nombre vacío'); summary.errores++; }
        else {
          const sim = findSimilar(nombre, obras);
          if (sim.exact) { parsedRow.isDuplicate = true; parsedRow.warnings.push('Ya existe'); summary.duplicados++; }
          else summary.procesadas++;
        }
        parsedRow.data = { nombre, direccion: cleanString(dir), fechaInicio: normalizeDate(fi), fechaEstimadaFin: normalizeDate(ff), porcentajeAvance: porcentaje, estado, cliente: cleanString(cli) };

      } else if (type === 'maestra_propiedades' || type === 'propiedades') {
        let n, dir, piso, depto, uf, partida, estado, val;
        if (row.length >= 8) [n, dir, piso, depto, uf, partida, estado, val] = row;
        else { [n, dir, piso, depto, uf, estado, val] = row; partida = ''; }
        const nombre = cleanString(n);
        if (!nombre) { parsedRow.isValid = false; parsedRow.warnings.push('Nombre vacío'); summary.errores++; }
        else {
          const sim = findSimilar(nombre, propiedades);
          if (sim.exact) { parsedRow.isDuplicate = true; parsedRow.warnings.push('Ya existe'); summary.duplicados++; }
          else summary.procesadas++;
        }
        parsedRow.data = { nombre, direccion: cleanString(dir), piso: cleanString(piso), depto: cleanString(depto), unidadFuncional: cleanString(uf), partidaInmobiliaria: cleanString(partida), estado: cleanString(estado) || 'Alquilada', valorActualUSD: normalizeNumber(val) };

      } else if (type === 'maestra_contratos') {
        let inq, prop, fi, periodo, duracion, proxAct, ff, monedaRaw, mont;
        if (row.length >= 9) [inq, prop, fi, periodo, duracion, proxAct, ff, monedaRaw, mont] = row;
        else { [inq, prop, fi, periodo, duracion, proxAct, ff, mont] = row; monedaRaw = ''; }
        const nombreInq = cleanString(inq);
        const nombreProp = cleanString(prop);
        const moneda = normalizeMoneda(monedaRaw);
        const exactProp = propiedades.find(p => p.nombre?.toLowerCase().trim() === nombreProp.toLowerCase());
        const exactInq = clientes.find(c => c.nombre?.toLowerCase().trim() === nombreInq.toLowerCase());
        if (!exactProp) parsedRow.warnings.push(`Propiedad "${nombreProp}" no encontrada`);
        if (!exactInq) parsedRow.warnings.push(`Inquilino "${nombreInq}" no existe → se creará`);
        summary.procesadas++;
        parsedRow.data = { inquilinoNombre: nombreInq, propiedadNombre: nombreProp, propiedadId: exactProp ? exactProp.id : '', clienteId: exactInq ? exactInq.id : '', fechaInicio: normalizeDate(fi), periodoActualizacion: cleanString(periodo) || '3', duracionMeses: cleanString(duracion) || '24', proximaActualizacion: normalizeDate(proxAct), fechaFin: normalizeDate(ff), monto: normalizeNumber(mont), moneda };

      } else if (type === 'maestra_proveedores' || type === 'proveedores') {
        let nombre, razonSocial, tipo, rubro, cuitRaw, tel, mail, vendedor, alias1, alias2, concepto;
        if (row.length >= 11) [nombre, razonSocial, tipo, rubro, cuitRaw, tel, mail, vendedor, alias1, alias2, concepto] = row.map(c => cleanString(c));
        else if (row.length >= 5) { [nombre, cuitRaw, tel, mail, tipo] = row.map(c => cleanString(c)); razonSocial = rubro = vendedor = alias1 = alias2 = concepto = ''; }
        else { nombre = cleanString(row[0]); tipo = cleanString(row[1]) || ''; razonSocial = rubro = cuitRaw = tel = mail = vendedor = alias1 = alias2 = concepto = ''; }
        nombre = cleanString(nombre);
        if (!nombre) { parsedRow.isValid = false; parsedRow.warnings.push('Nombre vacío'); summary.errores++; }
        else {
          const sim = findSimilar(nombre, proveedores);
          if (sim.exact) { parsedRow.isDuplicate = true; parsedRow.warnings.push('Ya existe'); summary.duplicados++; }
          else summary.procesadas++;
        }
        parsedRow.data = { nombre, razonSocial: razonSocial || '', tipo: tipo || 'Varios', rubro: normalizeText(rubro), cuit: (cuitRaw || '').replace(/[^0-9\-]/g, ''), telefono: tel || '', mail: mail || '', nombreVendedor: vendedor || '', alias1: alias1 || '', alias2: alias2 || '', concepto: concepto || '' };

      } else if (type === 'maestra_clientes' || type === 'clientes') {
        let nombre, cuitRaw, tel, mail, tipo;
        if (row.length >= 5) [nombre, cuitRaw, tel, mail, tipo] = row.map(c => cleanString(c));
        else { nombre = cleanString(row[0]); tipo = cleanString(row[1]) || 'Varios'; cuitRaw = tel = mail = ''; }
        nombre = cleanString(nombre);
        if (!nombre) { parsedRow.isValid = false; parsedRow.warnings.push('Nombre vacío'); summary.errores++; }
        else {
          const sim = findSimilar(nombre, clientes);
          if (sim.exact) { parsedRow.isDuplicate = true; parsedRow.warnings.push('Ya existe'); summary.duplicados++; }
          else summary.procesadas++;
        }
        parsedRow.data = { nombre, cuit: (cuitRaw || '').replace(/[^0-9\-]/g, ''), telefono: tel || '', mail: mail || '', tipo: tipo || 'Varios' };
      }

    } catch (e) {
      parsedRow.isValid = false;
      parsedRow.warnings.push('Error de formato: ' + e.message);
      summary.errores++;
    }

    rows.push(parsedRow);
  }

  return { rows, summary };
};
