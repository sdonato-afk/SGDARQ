// Categorías de Ingresos y Egresos por Área
export const categoriasFinancieras = {
  Obras: {
    Ingreso: [], // Manejado aparte con tipos y rubros anidados
    Egreso: [] // Manejado dinámicamente con taxonomia_obras
  },
  Alquileres: {
    Ingreso: ['Alquiler', 'Expensas', 'Fondo de Reserva', 'Garantías', 'Otros Ingresos'],
    Egreso: [] // Hereda los Egresos Globales viejos por ahora
  },
  Oficina: {
    Ingreso: ['INGRESOS'],
    Egreso: ['INMUEBLE', 'EMPLEADOS', 'SERVICIOS', 'IMPUESTOS', 'EQUIPAMIENTO', 'INSUMOS', 'VARIOS']
  },
  Directorio: {
    Ingreso: ['Aportes de Capital', 'Devoluciones', 'Préstamos'],
    Egreso: ['Retiros', 'Impuestos', 'Servicios', 'Gastos Compartidos', 'Otros Egresos']
  },
  Sistema: {
    Ingreso: ['Apertura de Caja', 'Ajuste de Saldo', 'Corrección'],
    Egreso:  ['Apertura de Caja', 'Ajuste de Saldo', 'Correción']
  }
};

// Rubros de Directorio por Categoría (Egreso + Ingreso)
export const rubrosDirectorio = {
  // Egresos
  'Retiros':            ['-'],
  'Impuestos':          ['Ganancias', 'Monotributo', 'Autónomos', 'Bienes Personales', 'Moratorias'],
  'Servicios':          ['Telecom', 'Copefaro', 'Edea', 'Omint', 'Seguros'],
  'Gastos Compartidos': ['MDQ', 'Jardín de Paz'],
  'Otros Egresos':      ['-'],
  // Ingresos
  'Aportes de Capital': ['-'],
  'Devoluciones':       ['-'],
  'Préstamos':          ['-'],
};

// Conceptos de 3er nivel para Directorio (cuando aplica)
export const conceptosDirectorio = {
  'Seguros': ['Territory - Ah256ic', 'Jeep - AB456IZ', 'C3 mbp 766', 'Golf - AC144RY', 'Corolla - AG146HB'],
  'MDQ':     ['Jardinero', 'Limpieza', 'Mantenimiento', 'Servicios Públicos'],
};

// Tipos y Rubros específicos para Obras
export const ingresosObrasList = {
  'PAGO A CUENTA': ['-'],
  'CERTIFICACIONES': ['-'],
  'ANTICIPOS': ['-'],
  'ADICIONALES': ['-'],
  'VENTA UF': ['TERRENO', 'DEPARTAMENTO', 'CASA', 'PH']
};

export const egresosGlobalList = {
  'Materiales': ['Gruesos', 'Instalaciones', 'Equipamiento', 'Terminaciones', 'Varios'],
  'Mano de obra': ['General', 'Gruesos', 'Instalaciones', 'Terminaciones'],
  'Impuestos': ['Ganancias', 'IVA', 'IB', 'Derechos Municipales', 'Colegios', 'Gastos de Escritura', 'Permisos Municipales'],
  'Servicios': ['Gruesos', 'Instalaciones', 'Equipamiento', 'Servicios Públicos', 'Terminaciones', 'Profesionales', 'Asesores', 'Logística', 'Mantenimiento', 'Varios'],
  'Varios': ['Propinas', 'Expensas', 'Otros', 'Supermercado', 'Viáticos', 'Productos de Limpieza', 'Asado de Obra', 'Gastos Bancarios']
};

export const conceptosGlobalList = {
  'Materiales': {
     'Gruesos': ['Hormigón Elaborado', 'Hierro', 'Encofrados', 'Durlock', 'General'],
     'Instalaciones': ['Sanitaria', 'Eléctrica', 'Calefacción', 'Aire Acondicionado', 'Gas', 'Corrientes Débiles', 'Extracciones'],
     'Equipamiento': ['Cocina', 'Baño', 'Aire Acondicionado', 'Timbres y Porteros', 'Vidrios y Espejos', 'Mobiliario', 'Iluminación', 'Puertas y Aberturas', 'Cortinas'],
     'Terminaciones': ['Pintura', 'Revestimientos', 'Teclas y Tomas', 'Herrajes', 'Cerrajería', 'Accesorios', 'General'],
     'Varios': ['Ferretería', 'Madera', 'Hierro', 'Otros', '-']
  },
  'Mano de obra': {
     'General': ['-'],
     'Gruesos': ['Albañilería', 'Hormigón', 'Durlock', 'Yesero'],
     'Instalaciones': ['Plomería', 'Gasista', 'Eléctrico'],
     'Terminaciones': ['Jardinero', 'Pintor', 'Carpintero', 'Colocador']
  },
  'Servicios': {
     'Gruesos': ['Revoques Proyectados', 'Contrapisos Proyectados', 'Excavaciones', 'Demoliciones'],
     'Instalaciones': ['Sanitaria', 'Electricidad', 'Cámaras de Frío', 'Aire Acondicionado', 'Calefacción', 'Climatización'],
     'Equipamiento': ['Ascensores y Montacargas', 'Marmolería', 'Aberturas', 'Aire Acondicionado', 'Calefacción', 'Extracciones', 'Iluminación', 'Vanitorys', 'Placares', 'Mobiliario', 'Muebles de Cocina', 'Parrillas'],
     'Servicios Públicos': ['Agua', 'Gas', 'Electricidad', 'Internet', 'Teléfono', 'ABL', 'ARBA'],
     'Terminaciones': ['Restauraciones', 'Vidrios Mamparas y Espejos', 'Zócalos', 'Pisos', 'Herrería', 'Pulidor', 'Hormivisto'],
     'Profesionales': ['Abogado', 'Agrimensor', 'Contador', 'Escribano', 'Martillero/Inmobiliaria', 'Seguridad e Higiene', 'Arquitecto'],
     'Asesores': ['Calculista', 'Eléctrico', 'Termomecánica', 'Sanitario', 'Extracciones', 'Seguridad e Higiene', 'Renderista', 'Diseño'],
     'Logística': ['Fletes', 'Envíos', 'Volquetes', 'Gestores'],
     'Mantenimiento': ['Ascensores', 'Bombas', 'Limpieza', 'General', '-'],
     'Varios': ['Seguros', 'Limpieza', 'Destapaciones', 'Matafuegos', '-']
  }
};


// Listas exclusivas de Oficina
export const ingresosOficinaList = {
  'INGRESOS': ['VENTA IVA', 'INGRESOS VARIOS']
};

export const egresosOficinaList = {
  'INMUEBLE': ['MATERIALES', 'MANO DE OBRA', 'ALQUILER'],
  'EMPLEADOS': ['SUELDOS', 'SAC', 'VIATICOS'],
  'SERVICIOS': ['SERVICIOS PUBLICOS', 'PROFESIONALES', 'SERVICIOS VARIOS'],
  'IMPUESTOS': ['GANANCIAS', 'IVA', 'IB', 'DERECHOS MUNICIPALES', 'COLEGIOS', 'GASTOS DE ESCRITURA', 'PERMISOS MUNICIPALES', 'LIBROS CONTABLES', 'CERTIFICACIONES', 'MORATORIAS', 'DEBITO/CREDITO'],
  'EQUIPAMIENTO': ['MOBILIARIO', 'COMPUTADORAS', 'HERRAMIENTAS', 'IMPRESORAS', 'VARIOS'],
  'INSUMOS': ['LIMPIEZA', 'LIBRERIA', 'ALMACEN'],
  'VARIOS': ['GASTOS BANCARIOS']
};

export const conceptosOficinaList = {
  'SERVICIOS': {
      'SERVICIOS PUBLICOS': ['Agua', 'Gas', 'Electricidad', 'Internet', 'Teléfono', 'ABL', 'ARBA'],
      'PROFESIONALES': ['Abogado', 'Contador', 'Escribano', 'Martillero/Inmobiliaria', 'Seguridad e Higiene', 'Arquitecto', 'Agrimensor'],
      'SERVICIOS VARIOS': ['Seguros', 'Limpieza', 'Destapaciones', 'Matafuegos', 'Fletes', 'Viáticos', 'Transportes', 'Mudanzas', 'Dropbox']
  },
  'IMPUESTOS': {
      'IVA':                ['Pago IVA período'],   // el período YYYY-MM se captura en campo aparte
      'IB':                 ['Cuota mensual', 'Anticipo', 'Saldo final de año'],
      'GANANCIAS':          ['Anticipo 1°', 'Anticipo 2°', 'Anticipo 3°', 'Anticipo 4°', 'Saldo final'],
      'MORATORIAS':         ['Cuota ARCA', 'Cuota AFIP', 'Cuota ARBA'],
      'DEBITO/CREDITO':     ['Impuesto al cheque'],
      'DERECHOS MUNICIPALES': ['ABL', 'Derechos varios'],
      'COLEGIOS':           ['Aporte anual', 'Aporte mensual'],
  }
};
