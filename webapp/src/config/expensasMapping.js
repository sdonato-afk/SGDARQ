export const MAPEO_EXPENSAS = {
  // ── CATEGORÍA: MATERIALES ──
  'Materiales': {
    'Gruesos':       'C. MANTENIMIENTO Y CONSERVACIÓN',
    'Instalaciones': 'C. MANTENIMIENTO Y CONSERVACIÓN',
    'Equipamiento':  'C. MANTENIMIENTO Y CONSERVACIÓN',
    'Terminaciones': 'C. MANTENIMIENTO Y CONSERVACIÓN',
    'Varios':        'C. MANTENIMIENTO Y CONSERVACIÓN',
    'default':       'C. MANTENIMIENTO Y CONSERVACIÓN'
  },

  // ── CATEGORÍA: MANO DE OBRA ──
  'Mano de obra': {
    'General':       'C. MANTENIMIENTO Y CONSERVACIÓN',
    'Gruesos':       'C. MANTENIMIENTO Y CONSERVACIÓN',
    'Instalaciones': 'C. MANTENIMIENTO Y CONSERVACIÓN',
    'Terminaciones': 'C. MANTENIMIENTO Y CONSERVACIÓN',
    'default':       'C. MANTENIMIENTO Y CONSERVACIÓN'
  },

  // ── CATEGORÍA: SERVICIOS ──
  'Servicios': {
    'Servicios Públicos': 'B. SERVICIOS PÚBLICOS',
    'Mantenimiento':      'C. MANTENIMIENTO Y CONSERVACIÓN',
    'Profesionales':      'E. ADMINISTRACIÓN Y SEGUROS',
    'Asesores':           'E. ADMINISTRACIÓN Y SEGUROS',
    'Logística':          'D. GASTOS DE LIMPIEZA Y VARIOS',
    'Gruesos':            'C. MANTENIMIENTO Y CONSERVACIÓN',
    'Instalaciones':      'C. MANTENIMIENTO Y CONSERVACIÓN',
    'Equipamiento':       'C. MANTENIMIENTO Y CONSERVACIÓN',
    'Terminaciones':      'C. MANTENIMIENTO Y CONSERVACIÓN',
    'Varios':             'D. GASTOS DE LIMPIEZA Y VARIOS',
    'default':            'C. MANTENIMIENTO Y CONSERVACIÓN'
  },

  // ── CATEGORÍA: IMPUESTOS ──
  'Impuestos': {
    'default': 'E. ADMINISTRACIÓN Y SEGUROS'
  },

  // ── CATEGORÍA: VARIOS ──
  'Varios': {
    'Productos de Limpieza': 'D. GASTOS DE LIMPIEZA Y VARIOS',
    'Gastos Bancarios':      'E. ADMINISTRACIÓN Y SEGUROS',
    'Supermercado':          'D. GASTOS DE LIMPIEZA Y VARIOS',
    'Propinas':              'D. GASTOS DE LIMPIEZA Y VARIOS',
    'Viáticos':              'E. ADMINISTRACIÓN Y SEGUROS',
    'Expensas':              'E. ADMINISTRACIÓN Y SEGUROS',
    'Asado de Obra':         'NO COMPUTA',
    'default':               'D. GASTOS DE LIMPIEZA Y VARIOS'
  },
  
  // ── CATEGORÍA: EMPLEADOS (Detectado en BD) ──
  'empleado': {
    'sueldo': 'A. SUELDOS Y CARGAS SOCIALES',
    'cargas sociales': 'A. SUELDOS Y CARGAS SOCIALES',
    'default': 'A. SUELDOS Y CARGAS SOCIALES'
  },
  'empleados': {
    'default': 'A. SUELDOS Y CARGAS SOCIALES'
  }
};

export const getGrupoExpensa = (categoria, rubro) => {
  if (!categoria) return 'C. MANTENIMIENTO Y CONSERVACIÓN'; // Fallback
  
  // Buscar categoría de forma insensible a mayúsculas
  const searchCat = categoria.trim().toLowerCase();
  let mapCat = null;
  for (const key in MAPEO_EXPENSAS) {
    if (key.toLowerCase() === searchCat) {
      mapCat = MAPEO_EXPENSAS[key];
      break;
    }
  }
  
  if (!mapCat) return 'C. MANTENIMIENTO Y CONSERVACIÓN'; // Fallback general
  
  if (rubro) {
    const searchRubro = rubro.trim().toLowerCase();
    for (const key in mapCat) {
      if (key.toLowerCase() === searchRubro) {
        return mapCat[key];
      }
    }
  }
  
  return mapCat['default'] || 'C. MANTENIMIENTO Y CONSERVACIÓN';
};
