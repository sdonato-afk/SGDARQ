import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  getDocs,
  where
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  signInAnonymously,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  LayoutDashboard, 
  HardHat, 
  Building2, 
  Users, 
  UserCircle, 
  FileText, 
  X, 
  Plus, 
  Menu,
  History, 
  Coins, 
  Banknote, 
  TrendingUp,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Hash,
  Droplets,
  Phone,
  Mail,
  CreditCard,
  Briefcase,
  PieChart,
  Wallet,
  FileSignature,
  Database,
  AlertTriangle,
  Lock,
  LogOut,
  Trash2,
  ArrowLeft,
  ArrowUpRight,
  Landmark
} from 'lucide-react';

// Configuración de Firebase Propio (Sistema DARQ)
const firebaseConfig = {
  apiKey: "AIzaSyAcyZAEyl1cd2vpIIWhEngQGyXaEQJjpS0",
  authDomain: "sg-darq.firebaseapp.com",
  projectId: "sg-darq",
  storageBucket: "sg-darq.firebasestorage.app",
  messagingSenderId: "174284213826",
  appId: "1:174284213826:web:f389bf6ed3c19a1fabe7db"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'sg-darq';

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin' | 'viewer'
  const [activeTab, setActiveTab] = useState('Resumen');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [movimientos, setMovimientos] = useState([]);
  const [obras, setObras] = useState([]);
  const [propiedades, setPropiedades] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [contratos, setContratos] = useState([]);
  
  // Modales
  const [isModalMovOpen, setIsModalMovOpen] = useState(false);
  const [isModalObraOpen, setIsModalObraOpen] = useState(false);
  const [isModalPropOpen, setIsModalPropOpen] = useState(false);
  const [isModalProvOpen, setIsModalProvOpen] = useState(false);
  const [isModalContratoOpen, setIsModalContratoOpen] = useState(false);
  const [isModalClienteOpen, setIsModalClienteOpen] = useState(false);
  const [isImportarObrasOpen, setIsImportarObrasOpen] = useState(false);
  const [isImportarAlquileresOpen, setIsImportarAlquileresOpen] = useState(false);
  const [isImportarOficinaOpen, setIsImportarOficinaOpen] = useState(false);
  const [isImportarDirectorioOpen, setIsImportarDirectorioOpen] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // States de Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [cotizacionBlue, setCotizacionBlue] = useState(1250); 
  const [isListasMenuOpen, setIsListasMenuOpen] = useState(false);
  const [resumenDetalleArea, setResumenDetalleArea] = useState('Obras');
  const [bdAreaFilter, setBdAreaFilter] = useState('Todas');
  const [bdFilters, setBdFilters] = useState({});
  const [finanzasSubNivel, setFinanzasSubNivel] = useState('Edificios'); // 'Edificios' | 'Detalle'
  const [edificioSeleccionado, setEdificioSeleccionado] = useState(null); // 'MO' | 'VO' | null
  const [finanzasItemSeleccionado, setFinanzasItemSeleccionado] = useState(null); // ID de Obra, Nombre de Director o Categoria

  const [selectedObraId, setSelectedObraId] = useState(null);
  const [obrasStatusFilter, setObrasStatusFilter] = useState('Todas');
  const [obrasView, setObrasView] = useState('dashboard'); // 'dashboard' | 'reportes'
  const [reporteObraId, setReporteObraId] = useState('todas');
  const [reporteProveedorFilter, setReporteProveedorFilter] = useState('');
  const [certDetalleOpen, setCertDetalleOpen] = useState(false);
  const [alqView, setAlqView] = useState('dashboard'); // 'dashboard' | 'liquidacion' | 'rentabilidad' | 'balanceMO'
  const [alqEdificio, setAlqEdificio] = useState('VO'); // 'VO' | 'MO' | 'todos'
  const [alqChartEdificio, setAlqChartEdificio] = useState('todos');
  const [rentPeriodo, setRentPeriodo] = useState(12); // 6, 12, or 0 (all)
  const [liquidacionMes, setLiquidacionMes] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [liquidacionAnio, setLiquidacionAnio] = useState(() => String(new Date().getFullYear()));
  const areas = ['Obras', 'Alquileres', 'Oficina', 'Directorio'];
  const directores = ['Sebastian', 'Emiliano', 'Santiago'];
  const cajas = ['Caja Dólares', 'Caja Pesos', 'Banco Amecon', 'Banco Blue', 'MP Amecon', 'MP Blue'];
  
  // Categorías de Ingresos y Egresos por Área
  const categoriasFinancieras = {
    Obras: {
      Ingreso: [], // Manejado aparte con tipos y rubros anidados
      Egreso: [] // Manejado aparte con tipos y rubros anidados
    },
    Alquileres: {
      Ingreso: ['Alquiler', 'Expensas', 'Fondo de Reserva', 'Garantías', 'Otros Ingresos'],
      Egreso: [] // Manejado aparte con tipos y rubros anidados
    },
    Oficina: {
      Ingreso: ['INGRESOS'],
      Egreso: ['INMUEBLE', 'EMPLEADOS', 'SERVICIOS', 'IMPUESTOS', 'EQUIPAMIENTO', 'INSUMOS', 'VARIOS']
    },
    Directorio: {
      Ingreso: ['Aportes de Capital', 'Devoluciones', 'Préstamos'],
      Egreso: ['Retiros', 'Impuestos', 'Servicios', 'Gastos Compartidos', 'Otros Egresos']
    }
  };

  // Subrubros específicos para Egresos de Directorio
  const subrubrosDirectorio = {
    'Impuestos': ['Ganancias', 'Ingresos Brutos', 'Autónomos', 'Monotributo', 'Moratorias'],
    'Servicios': ['Telefonía', 'Patentes', 'Seguros', 'ABL'],
    'Gastos Compartidos': ['MDQ', 'Jardín de Paz']
  };

  // Tipos y Rubros específicos para Obras
  const ingresosObrasList = {
    'PAGO A CUENTA': ['-'],
    'CERTIFICACIONES': ['-'],
    'ANTICIPOS': ['-'],
    'ADICIONALES': ['-'],
    'VENTA UF': ['TERRENO', 'DEPARTAMENTO', 'CASA', 'PH']
  };

  const egresosGlobalList = {
    'Materiales': ['Gruesos', 'Instalaciones', 'Equipamiento', 'Terminaciones', 'Varios'],
    'Mano de obra': ['General', 'Gruesos', 'Instalaciones', 'Terminaciones'],
    'Impuestos': ['Ganancias', 'IVA', 'IB', 'Derechos Municipales', 'Colegios', 'Gastos de Escritura', 'Permisos Municipales'],
    'Servicios': ['Gruesos', 'Instalaciones', 'Equipamiento', 'Servicios Públicos', 'Terminaciones', 'Profesionales', 'Asesores', 'Logística', 'Mantenimiento', 'Varios'],
    'Varios': ['Propinas', 'Expensas', 'Otros', 'Supermercado', 'Viáticos', 'Productos de Limpieza', 'Asado de Obra', 'Gastos Bancarios']
  };

  const conceptosGlobalList = {
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
  const ingresosOficinaList = {
    'INGRESOS': ['VENTA IVA', 'INGRESOS VARIOS']
  };

  const egresosOficinaList = {
    'INMUEBLE': ['MATERIALES', 'MANO DE OBRA', 'ALQUILER'],
    'EMPLEADOS': ['SUELDOS', 'SAC', 'VIATICOS'],
    'SERVICIOS': ['SERVICIOS PUBLICOS', 'PROFESIONALES', 'SERVICIOS VARIOS'],
    'IMPUESTOS': ['GANANCIAS', 'IVA', 'IB', 'DERECHOS MUNICIPALES', 'COLEGIOS', 'GASTOS DE ESCRITURA', 'PERMISOS MUNICIPALES', 'LIBROS CONTABLES', 'CERTIFICACIONES', 'MORATORIAS', 'DEBITO/CREDITO'],
    'EQUIPAMIENTO': ['MOBILIARIO', 'COMPUTADORAS', 'HERRAMIENTAS', 'IMPRESORAS', 'VARIOS'],
    'INSUMOS': ['LIMPIEZA', 'LIBRERIA', 'ALMACEN'],
    'VARIOS': ['GASTOS BANCARIOS']
  };

  const conceptosOficinaList = {
    'SERVICIOS': {
        'SERVICIOS PUBLICOS': ['Agua', 'Gas', 'Electricidad', 'Internet', 'Teléfono', 'ABL', 'ARBA'],
        'PROFESIONALES': ['Abogado', 'Contador', 'Escribano', 'Martillero/Inmobiliaria', 'Seguridad e Higiene', 'Arquitecto', 'Agrimensor'],
        'SERVICIOS VARIOS': ['Seguros', 'Limpieza', 'Destapaciones', 'Matafuegos', 'Fletes', 'Viáticos', 'Transportes', 'Mudanzas', 'Dropbox']
    }
  };

  // Estados de Formularios
  const [formMov, setFormMov] = useState({
    fecha: new Date().toISOString().split('T')[0],
    area: 'Obras',
    obraId: '',
    propiedadId: '',
    proveedorId: '',
    directorId: '',
    clienteId: '',
    tipo: 'Egreso',
    tipoObraIngreso: 'PAGO A CUENTA', // Solo usado para ingresos de obras
    categoriaEgreso: Object.keys(egresosGlobalList)[0], // Globalizado para Obras, Alquileres y Oficina
    rubro: egresosGlobalList[Object.keys(egresosGlobalList)[0]][0], // Inicializar
    subRubro: '',
    moneda: 'ARS',
    caja: cajas[1], // Caja Pesos default
    monto: '',
    concepto: '',
    entidadCuenta: '' // Nueva columna exclusiva de oficina
  });
  const [editingMovId, setEditingMovId] = useState(null);
  const [editingObraId, setEditingObraId] = useState(null);

  const [formObra, setFormObra] = useState({
    nombre: '',
    direccion: '',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaEstimadaFin: '',
    porcentajeAvance: 0,
    estado: 'En Proceso'
  });

  const [formProp, setFormProp] = useState({
    nombre: '',
    direccion: '',
    piso: '',
    depto: '',
    unidadFuncional: '',
    partidaInmobiliaria: '',
    valorActualUSD: 0,
    esCentroCostos: false, // MO General, VO Consorcio
    estado: 'Alquilada'
  });

  const [formProv, setFormProv] = useState({
    nombre: '',
    telefono: '',
    mail: '',
    cuit: '',
    nombreVendedor: '',
    alias1: '',
    alias2: '',
    tipo: 'Materiales',
    rubro: '',
    concepto: ''
  });

  const [formCliente, setFormCliente] = useState({
    nombre: '',
    cuit: '',
    telefono: '',
    mail: '',
    direccion: ''
  });

  const [formContrato, setFormContrato] = useState({
    propiedadId: '',
    clienteId: '',
    fechaInicio: new Date().toISOString().split('T')[0],
    periodoActualizacion: '3', // meses
    duracionMeses: '24', // meses
    proximaActualizacion: '', // calculable
    fechaFin: '' // calculable
  });

  const tiposProv = ['Materiales', 'Mano de Obra', 'Impuestos', 'Servicios', 'Sueldos', 'Varios'];

  // Sub-tab de Finanzas
  const [finanzasAreaSeleccionada, setFinanzasAreaSeleccionada] = useState('General');

  useEffect(() => {
    const fetchDolar = async () => {
      try {
        const res = await fetch('https://dolarapi.com/v1/dolares/blue');
        const data = await res.json();
        if(data && data.compra) {
          setCotizacionBlue(data.compra);
        }
      } catch (err) {
        console.error("Error fetching Dolar Blue", err);
      }
    };
    fetchDolar();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const unsubMov = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'movimientos'), orderBy('fecha', 'desc')), (snap) => {
      setMovimientos(snap.docs.map(d => {
        const data = d.data();
        return { id: d.id, ...data, fecha: normalizeDate(data.fecha) };
      }));
    });

    const unsubObras = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'obras'), orderBy('fechaInicio', 'desc')), (snap) => {
      setObras(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubProps = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'propiedades'), orderBy('nombre', 'asc')), (snap) => {
      setPropiedades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubProvs = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'proveedores'), orderBy('nombre', 'asc')), (snap) => {
      setProveedores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubClientes = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'clientes'), orderBy('nombre', 'asc')), (snap) => {
      setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubContratos = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'contratos'), orderBy('fechaInicio', 'desc')), (snap) => {
      setContratos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubMov(); unsubObras(); unsubProps(); unsubProvs(); unsubClientes(); unsubContratos(); };
  }, [user]);

  // --- HELPERS FINANCIEROS ---
  const convertToUSD = (monto, moneda, tc) => {
    if (moneda === 'USD') return Number(monto) || 0;
    const rate = Number(tc) || cotizacionBlue || 1;
    return (Number(monto) || 0) / rate;
  };

  const normalizeYearMonth = (dateStr) => {
    if (!dateStr) return '';
    // Handle YYYY-MM-DD or YYYY-MM
    if (dateStr.includes('-')) {
      const pts = dateStr.split('-');
      if (pts[0].length === 4) return `${pts[0]}-${pts[1].padStart(2, '0')}`;
      if (pts[2].length === 4) return `${pts[2]}-${pts[1].padStart(2, '0')}`; // Handle unusual DD-MM-YYYY
    }
    // Handle DD/MM/YYYY
    if (dateStr.includes('/')) {
      const pts = dateStr.split('/');
      if (pts[2].length === 4) return `${pts[2]}-${pts[1].padStart(2, '0')}`;
      if (pts[0].length === 4) return `${pts[0]}-${pts[1].padStart(2, '0')}`; // Handle YYYY/MM/DD
    }
    return '';
  };

  // Normaliza cualquier fecha a formato YYYY-MM-DD para los inputs type="date"
  const normalizeDate = (dateStr) => {
    if (!dateStr) return '';
    const s = String(dateStr).trim();
    // Ya es ISO  YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // YYYY-MM-DD con hora (ISO full o Firestore Timestamp)
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.split('T')[0];
    // DD/MM/YYYY  o  DD-MM-YYYY
    const m1 = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
    // MM/DD/YYYY (fallback USA)
    const m2 = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2})$/);
    if (m2) return `20${m2[3]}-${m2[1].padStart(2,'0')}-${m2[2].padStart(2,'0')}`;
    // Intentar parsear con Date
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return s; // Devolver tal cual como fallback
  };

  const getSumaActivos = () => {
    return propiedades
      .filter(p => !p.esCentroCostos && !['MO GENERAL', 'VO CONSORCIO', 'CONSORCIO VO', 'GENERAL MO'].includes(p.nombre?.toUpperCase()))
      .reduce((acc, p) => acc + (Number(p.valorActualUSD) || 0), 0);
  };

  // Estadísticas Bimonetarias y ROI Global
  const stats = useMemo(() => {
    let ingresosUSD_Equiv = 0;
    let egresosUSD_Equiv = 0;
    let saldosCajas = { 
        'Caja Dólares': 0, 
        'Caja Pesos': 0, 
        'Banco Amecon': 0, 
        'Banco Blue Elephant': 0 
    };
    let areaSaldosEquiv = { Obras: 0, Alquileres: 0, Oficina: 0, Directorio: 0 };

    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
    let egresosSeisMesesARS = 0;

    movimientos.forEach(m => {
      const monto = Number(m.monto) || 0;
      // Usar convertToUSD helper
      const montoUSD = convertToUSD(monto, m.moneda, m.cotizacionHistorica || m.tipoCambioReferencia);
      
      const isIngreso = m.tipo === 'Ingreso';
      const factor = isIngreso ? 1 : -1;

      if (isIngreso) ingresosUSD_Equiv += montoUSD;
      else egresosUSD_Equiv += montoUSD;

      if (areas.includes(m.area)) {
          areaSaldosEquiv[m.area] = (areaSaldosEquiv[m.area] || 0) + (montoUSD * factor);
      }

      if (cajas.includes(m.caja)) {
          saldosCajas[m.caja] = (saldosCajas[m.caja] || 0) + (montoUSD * factor);
      }

      // Cash Flow: Sólo egresos de los últimos 6 meses (en ARS reales)
      if(!isIngreso && new Date(m.fecha) >= seisMesesAtras) {
          // Usar monto original en ARS, no reconvertir USD
          if (m.moneda === 'USD') {
            egresosSeisMesesARS += monto * (m.cotizacionHistorica || m.tipoCambioReferencia || cotizacionBlue);
          } else {
            egresosSeisMesesARS += monto;
          }
      }
    });

    const saldoUSD_Equiv = ingresosUSD_Equiv - egresosUSD_Equiv;

    // ROI Anualizado / Acumulado
    const roiGlobal = egresosUSD_Equiv > 0 ? ((saldoUSD_Equiv / egresosUSD_Equiv) * 100) : 0;

    // Calcular participación porcentual de cada área sobre el saldo TOTAL
    let sumSaldosPositivos = 0;
    areas.forEach(a => {
        if (areaSaldosEquiv[a] > 0) sumSaldosPositivos += areaSaldosEquiv[a];
    });

    const areaShares = {};
    areas.forEach(a => {
        areaShares[a] = sumSaldosPositivos > 0 && areaSaldosEquiv[a] > 0 
           ? (areaSaldosEquiv[a] / sumSaldosPositivos) * 100 
           : 0;
    });

    // Análisis de Cash Flow Semanal Estimado (Viernes, en ARS)
    const semanasEn6Meses = 26;
    const promedioSemanalARS = egresosSeisMesesARS / semanasEn6Meses;

    const hoy = new Date();
    const diaHoy = hoy.getDay(); // 0(Dom) a 6(Sab)
    const diasParaViernes = diaHoy <= 5 ? (5 - diaHoy) : (12 - diaHoy);
    const proximoViernes = new Date(hoy);
    proximoViernes.setDate(hoy.getDate() + diasParaViernes);
    
    // Si el viernes cae entre el día 1 y 10, sumamos un 25% de colchón
    const esPrincipioMes = proximoViernes.getDate() <= 10;
    const cashFlowEstimadoARS = esPrincipioMes ? promedioSemanalARS * 1.25 : promedioSemanalARS;

    // Métricas activas
    const obrasActivas = obras.filter(o => o.estado !== 'Finalizada').length;
    const contratosActivos = contratos.filter(c => new Date(c.fechaFin) >= hoy).length;
    const totalActivosUSD = getSumaActivos();

    return { 
      ingresosUSD_Equiv, egresosUSD_Equiv, saldoUSD_Equiv,
      roiGlobal, areaSaldosEquiv, areaShares, 
      saldosCajas, cashFlowEstimadoARS, proximoViernes: proximoViernes.toISOString().split('T')[0],
      obrasActivas, contratosActivos, totalActivosUSD
    };
  }, [movimientos, obras, contratos, cotizacionBlue]);

  const statsFinanzasArea = useMemo(() => {
    const movsArea = movimientos.filter(m => m.area === finanzasAreaSeleccionada);
    const agrupar = { 
        ars: { ingresos: 0, egresos: 0 }, 
        usd: { ingresos: 0, egresos: 0 }, 
        rubros: {}, 
        edificios: { MO: {ingresos: 0, egresos: 0}, VO: {ingresos: 0, egresos: 0} },
        obras: {},
        directores: {},
        oficinaCategorias: {}
    };
    
    movsArea.forEach(m => {
        const monto = parseFloat(m.monto) || 0;
        const keyMoneda = m.moneda.toLowerCase();
        
        if (m.tipo === 'Ingreso') agrupar[keyMoneda].ingresos += monto;
        else agrupar[keyMoneda].egresos += monto;

        const montoARS = m.moneda === 'USD' ? monto * cotizacionBlue : monto;
        const rubro = m.rubro || 'Varios';
        if (!agrupar.rubros[rubro]) agrupar.rubros[rubro] = { ingresos: 0, egresos: 0 };
        if (m.tipo === 'Ingreso') agrupar.rubros[rubro].ingresos += montoARS;
        else agrupar.rubros[rubro].egresos += montoARS;

        // Agrupación específica por Area
        if (finanzasAreaSeleccionada === 'Obras') {
            const oId = m.obraId || 'Sin Obra';
            if (!agrupar.obras[oId]) agrupar.obras[oId] = { ingresos: 0, egresos: 0 };
            if (m.tipo === 'Ingreso') agrupar.obras[oId].ingresos += montoARS;
            else agrupar.obras[oId].egresos += montoARS;
        }

        if (finanzasAreaSeleccionada === 'Directorio') {
            const dId = m.directorId || 'Sin Director';
            if (!agrupar.directores[dId]) agrupar.directores[dId] = { ingresos: 0, egresos: 0 };
            if (m.tipo === 'Ingreso') agrupar.directores[dId].ingresos += montoARS;
            else agrupar.directores[dId].egresos += montoARS;
        }

        if (finanzasAreaSeleccionada === 'Oficina') {
            const cat = m.categoriaEgreso || 'VARIOS';
            if (!agrupar.oficinaCategorias[cat]) agrupar.oficinaCategorias[cat] = { ingresos: 0, egresos: 0 };
            if (m.tipo === 'Ingreso') agrupar.oficinaCategorias[cat].ingresos += montoARS;
            else agrupar.oficinaCategorias[cat].egresos += montoARS;
        }

        if (finanzasAreaSeleccionada === 'Alquileres' && m.propiedadId) {
            const prop = propiedades.find(p => p.id === m.propiedadId);
            const propName = prop?.nombre || '';
            const propNameUpper = propName.toUpperCase();
            
            let targetEdificio = '';
            if (propNameUpper.startsWith('MO')) targetEdificio = 'MO';
            else if (propNameUpper.startsWith('VO')) targetEdificio = 'VO';

            if (targetEdificio) {
                if (m.tipo === 'Ingreso') agrupar.edificios[targetEdificio].ingresos += montoARS;
                else agrupar.edificios[targetEdificio].egresos += montoARS;
            }
        }
        
        // Manejo de Gastos Compartidos (Consorcio/General)
        if (finanzasAreaSeleccionada === 'Alquileres' && !m.propiedadId && m.tipo === 'Egreso') {
           const refText = (m.concepto + " " + m.rubro).toUpperCase();
           if (refText.includes('VO-') || refText.includes('CONSORCIO VO')) {
               agrupar.edificios.VO.egresos += montoARS;
           } else if (refText.includes('MO-') || refText.includes('GENERAL MO')) {
               agrupar.edificios.MO.egresos += montoARS;
           }
        }
    });

    // Filtro de movimientos según Drill-Down
    let movsFiltrados = movsArea;
    if (finanzasSubNivel === 'Detalle') {
        if (finanzasAreaSeleccionada === 'Obras') movsFiltrados = movsArea.filter(m => (m.obraId || 'Sin Obra') === finanzasItemSeleccionado);
        if (finanzasAreaSeleccionada === 'Oficina') movsFiltrados = movsArea.filter(m => (m.categoriaEgreso || 'VARIOS') === finanzasItemSeleccionado);
        if (finanzasAreaSeleccionada === 'Directorio') movsFiltrados = movsArea.filter(m => (m.directorId || 'Sin Director') === finanzasItemSeleccionado);
        if (finanzasAreaSeleccionada === 'Alquileres' && edificioSeleccionado) {
             movsFiltrados = movsArea.filter(m => {
                const prop = propiedades.find(p => p.id === m.propiedadId);
                const isMatch = prop?.nombre.toUpperCase().startsWith(edificioSeleccionado);
                if (isMatch) return true;
                if (!m.propiedadId) {
                   const refText = (m.concepto + " " + m.rubro).toUpperCase();
                   return (edificioSeleccionado === 'VO' && (refText.includes('VO-') || refText.includes('CONSORCIO VO'))) ||
                          (edificioSeleccionado === 'MO' && (refText.includes('MO-') || refText.includes('GENERAL MO')));
                }
                return false;
             });
        }
    }

    return { movs: movsFiltrados, agrupar };
  }, [movimientos, finanzasAreaSeleccionada, propiedades, cotizacionBlue, finanzasSubNivel, finanzasItemSeleccionado, edificioSeleccionado]);

  const statsResumenDetalle = useMemo(() => {
    const movs = movimientos.filter(m => m.area === resumenDetalleArea);
    const data = [];
    
    if (resumenDetalleArea === 'Obras') {
       obras.forEach(o => {
          let ingresos = 0, egresos = 0;
          movs.filter(m => m.obraId === o.id).forEach(m => {
             const val = m.moneda === 'USD' ? m.monto : (m.monto / (m.cotizacionHistorica || m.tipoCambioReferencia || cotizacionBlue));
             if (m.tipo === 'Ingreso') ingresos += val; else egresos += val;
          });
          if (ingresos > 0 || egresos > 0) data.push({ id: o.id, nombre: o.nombre, ingresos, egresos, saldo: ingresos - egresos, subDetails: o.estado });
       });
    } else if (resumenDetalleArea === 'Alquileres') {
       propiedades.forEach(p => {
          let ingresos = 0, egresos = 0;
          movs.filter(m => m.propiedadId === p.id).forEach(m => {
             const val = m.moneda === 'USD' ? m.monto : (m.monto / (m.cotizacionHistorica || m.tipoCambioReferencia || cotizacionBlue));
             if (m.tipo === 'Ingreso') ingresos += val; else egresos += val;
          });
          if (ingresos > 0 || egresos > 0) data.push({ id: p.id, nombre: p.nombre, ingresos, egresos, saldo: ingresos - egresos, subDetails: p.direccion });
       });
    } else {
       // Oficina y Directorio -> agrupar por Rubro
       const rubroMap = {};
       movs.forEach(m => {
          const val = m.moneda === 'USD' ? m.monto : (m.monto / (m.cotizacionHistorica || m.tipoCambioReferencia || cotizacionBlue));
          const r = m.rubro || 'Varios';
          if (!rubroMap[r]) rubroMap[r] = { ingresos: 0, egresos: 0 };
          if (m.tipo === 'Ingreso') rubroMap[r].ingresos += val; else rubroMap[r].egresos += val;
       });
       Object.keys(rubroMap).forEach(r => {
          data.push({ id: r, nombre: r, ingresos: rubroMap[r].ingresos, egresos: rubroMap[r].egresos, saldo: rubroMap[r].ingresos - rubroMap[r].egresos, subDetails: 'Rubro agrupado' });
       });
    }
    
    return data.sort((a,b) => b.saldo - a.saldo);
  }, [movimientos, obras, propiedades, resumenDetalleArea, cotizacionBlue]);

  const cobrosPendientes = useMemo(() => {
    if (finanzasAreaSeleccionada !== 'Alquileres') return [];
    
    const hoy = new Date();
    const diaActual = hoy.getDate();
    // Solo mostramos pendientes si pasamos el día 7 del mes
    if (diaActual <= 7) return [];

    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    // Filtramos contratos activos
    const activos = contratos.filter(c => new Date(c.fechaFin) >= hoy && new Date(c.fechaInicio) <= hoy);
    
    const pendientes = [];

    activos.forEach(contrato => {
        // Buscar si existe un Ingreso para este contrato en el mes actual
        // que sea de la categoría alquileres
        const ingresosMes = movimientos.filter(m => 
            m.area === 'Alquileres' && 
            m.tipo === 'Ingreso' && 
            m.clienteId === contrato.clienteId &&
            m.propiedadId === contrato.propiedadId
        ).filter(m => {
            if (!m.fecha) return false;
            // Aseguramos que la fecha del movimiento coincida en mes y año 
            const fechaMov = new Date(m.fecha + 'T12:00:00Z');
            return fechaMov.getMonth() === mesActual && fechaMov.getFullYear() === anioActual;
        });

        // Si no hay ingresos en este mes, lo marcamos como pendiente
        if (ingresosMes.length === 0) {
            pendientes.push({
                contrato,
                propiedad: propiedades.find(p => p.id === contrato.propiedadId),
                cliente: clientes.find(c => c.id === contrato.clienteId)
            });
        }
    });

    return pendientes;
  }, [movimientos, contratos, propiedades, clientes, finanzasAreaSeleccionada]);

  const handleSaveMov = async (e) => {
    e.preventDefault();
    try {
      if (editingMovId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'movimientos', editingMovId), {
           ...formMov,
           monto: parseFloat(formMov.monto),
           tipoCambioReferencia: formMov.tipoCambioReferencia || cotizacionBlue,
           updatedAt: new Date().toISOString()
        });
        setEditingMovId(null);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'movimientos'), {
          ...formMov,
          monto: parseFloat(formMov.monto),
          tipoCambioReferencia: cotizacionBlue,
          createdAt: new Date().toISOString()
        });
      }
      setIsModalMovOpen(false);
      setFormMov({ ...formMov, monto: '', concepto: '', clienteId: '', entidadCuenta: '' });
    } catch (e) { console.error(e); }
  };

  const handleEditMov = (m) => {
    setFormMov({
      fecha: m.fecha,
      area: m.area,
      obraId: m.obraId || '',
      propiedadId: m.propiedadId || '',
      proveedorId: m.proveedorId || '',
      directorId: m.directorId || '',
      clienteId: m.clienteId || '',
      tipo: m.tipo,
      tipoObraIngreso: m.tipoObraIngreso || 'PAGO A CUENTA',
      categoriaEgreso: m.categoriaEgreso || Object.keys(egresosGlobalList)[0],
      rubro: m.rubro || '',
      subRubro: m.subRubro || '',
      moneda: m.moneda || 'ARS',
      caja: m.caja || cajas[1],
      monto: m.monto.toString(),
      concepto: m.concepto || '',
      entidadCuenta: m.entidadCuenta || '',
      tipoCambioReferencia: m.tipoCambioReferencia || cotizacionBlue
    });
    setEditingMovId(m.id);
    setIsModalMovOpen(true);
  };

  const handleSaveObra = async (e) => {
    e.preventDefault();
    try {
      const obraData = { ...formObra, percentageAvance: Number(formObra.porcentajeAvance) || 0 };
      if (editingObraId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'obras', editingObraId), { 
          ...obraData, 
          updatedAt: new Date().toISOString() 
        });
        setEditingObraId(null);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'obras'), { 
          ...obraData, 
          createdAt: new Date().toISOString() 
        });
      }
      setIsModalObraOpen(false);
      setFormObra({ nombre:'', direccion:'', fechaInicio: new Date().toISOString().split('T')[0], fechaEstimadaFin:'', porcentajeAvance:0, estado:'En Proceso' });
    } catch (e) { console.error(e); }
  };

  const handleEditObra = (o) => {
    setFormObra({
      nombre: o.nombre || '',
      direccion: o.direccion || '',
      fechaInicio: o.fechaInicio || '',
      fechaEstimadaFin: o.fechaEstimadaFin || '',
      porcentajeAvance: o.porcentajeAvance || 0,
      estado: o.estado || 'En Proceso'
    });
    setEditingObraId(o.id);
    setIsModalObraOpen(true);
  };

  const handleSaveProp = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'propiedades'), { ...formProp, createdAt: new Date().toISOString() });
      setIsModalPropOpen(false);
    } catch (e) { console.error(e); }
  };

  const handleSaveProv = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'proveedores'), { ...formProv, createdAt: new Date().toISOString() });
      setIsModalProvOpen(false);
      setFormProv({ nombre: '', telefono: '', mail: '', cuit: '', nombreVendedor: '', alias1: '', alias2: '', tipo: 'Materiales', rubro: '', concepto: '' });
    } catch (e) { console.error(e); }
  };

  const handleSaveCliente = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clientes'), { ...formCliente, createdAt: new Date().toISOString() });
      setIsModalClienteOpen(false);
      setFormCliente({ nombre: '', cuit: '', telefono: '', mail: '', direccion: '' });
    } catch (e) { console.error(e); }
  };

  const handleSaveContrato = async (e) => {
    e.preventDefault();
    try {
      if (!formContrato.propiedadId) return alert("Debe seleccionar una propiedad");
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'contratos'), { ...formContrato, createdAt: new Date().toISOString() });
      setIsModalContratoOpen(false);
    } catch (e) { console.error(e); }
  };

  const handleImportObras = async () => {
      if(!importText.trim()) return alert("Pega los datos primero.");
      setIsImporting(true);
      try {
          const lineas = importText.trim().split('\n');
          let startIndex = 0;
          if (lineas[0].toLowerCase().includes('fecha')) startIndex = 1;

          // Cachés locales para evitar duplicados en la misma iteración
          const obrasCache = new Map(obras.map(o => [o.nombre.toLowerCase().trim(), o.id]));
          const provsCache = new Map(proveedores.map(p => [p.nombre.toLowerCase().trim(), p.id]));
          
          for (let i = startIndex; i < lineas.length; i++) {
              const row = lineas[i].split('\t');
              if (row.length < 5) continue; 

              // Columnas esperadas: [0]fecha, [1]tipo, [2]moneda, [3]monto, [4]caja, [5]obra, [6]Categoria, [7]Rubro, [8]concept, [9]proovedor, [10]tc
              const [fechaStr, tipoStr, monedaStr, montoStr, cajaStr, obraStr, catStr, rubroStr, conceptStr, provStr, tcStr] = row;
              
              const mTipo = tipoStr?.trim().toLowerCase() === 'ingreso' ? 'Ingreso' : 'Egreso';
              const strMoneda = (monedaStr || '').trim().toLowerCase();
              const mMoneda = (strMoneda === 'dolares' || strMoneda === 'dólares' || strMoneda === 'dolar' || strMoneda === 'dólar' || strMoneda.includes('usd')) ? 'USD' : 'ARS';
              
              let mMonto = 0;
              const rawMonto = (montoStr || "").trim();
              if (rawMonto) {
                  const cleaned = rawMonto.replace(/[^\d,.-]/g, '');
                  if (cleaned.includes(',') && cleaned.includes('.')) {
                      if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
                          mMonto = parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
                      } else {
                          mMonto = parseFloat(cleaned.replace(/,/g, ""));
                      }
                  } else if (cleaned.includes(',')) {
                      mMonto = parseFloat(cleaned.replace(",", "."));
                  } else {
                      mMonto = parseFloat(cleaned);
                  }
              }
              if(isNaN(mMonto)) mMonto = 0;
              
              const cCaja = cajaStr?.trim().toLowerCase();
              const mCaja = cajas.find(c => c.toLowerCase() === cCaja) || (mMoneda === 'USD' ? cajas[0] : cajas[1]);
              
              const cObra = (obraStr?.trim() || 'Obra General').toLowerCase().trim();
              let mObraId = '';
              
              if (obrasCache.has(cObra)) {
                  mObraId = obrasCache.get(cObra);
              } else {
                  const newObraRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'obras'), {
                     nombre: obraStr?.trim() || 'Obra General', direccion: '', fechaInicio: fechaStr || new Date().toISOString().split('T')[0], fechaEstimadaFin: '', porcentajeAvance: 0, estado: 'En Proceso', createdAt: new Date().toISOString()
                  });
                  mObraId = newObraRef.id;
                  obrasCache.set(cObra, mObraId);
              }

              let mProvId = '';
              const cProvOriginal = provStr?.trim();
              const cProv = cProvOriginal?.toLowerCase() || '';
              
              if (cProvOriginal && cProvOriginal !== '-') {
                  if (provsCache.has(cProv)) {
                      mProvId = provsCache.get(cProv);
                  } else {
                      const newProvRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'proveedores'), {
                          nombre: cProvOriginal, telefono:'', mail:'', cuit:'', nombreVendedor:'', alias1:'', alias2:'', tipo: mTipo==='Egreso' ? (catStr||'Materiales') : 'Varios', rubro: rubroStr||'', concepto: conceptStr||'', createdAt: new Date().toISOString()
                      });
                      mProvId = newProvRef.id;
                      provsCache.set(cProv, mProvId);
                  }
              }

              let tipoObraIngreso = 'PAGO A CUENTA';
              let categoriaEgreso = 'Materiales';
              let finalRubro = '';
              let finalSubRubro = '';
              let finalConcepto = conceptStr?.trim() || '';

              if (mTipo === 'Ingreso') {
                  const rawIng = (catStr || '').trim().toUpperCase();
                  if (Object.keys(ingresosObrasList).includes(rawIng)) {
                      tipoObraIngreso = rawIng;
                  }
                  finalRubro = (rubroStr || '').trim() || '-';
              } else {
                  const rawCat = (catStr || '').trim().toLowerCase();
                  if (rawCat.includes('mano de obra')) categoriaEgreso = 'Mano de obra';
                  else if (rawCat.includes('impuestos')) categoriaEgreso = 'Impuestos';
                  else if (rawCat.includes('servicios')) categoriaEgreso = 'Servicios';
                  else if (rawCat.includes('varios')) categoriaEgreso = 'Varios';
                  else categoriaEgreso = 'Materiales';
                  
                  finalRubro = (rubroStr || '').trim() || 'Varios';
                  finalSubRubro = (conceptStr || '').trim();
              }

              const newMov = {
                  fecha: fechaStr || new Date().toISOString().split('T')[0],
                  area: 'Obras',
                  obraId: mObraId,
                  propiedadId: '',
                  proveedorId: mProvId,
                  directorId: '',
                  tipo: mTipo,
                  tipoObraIngreso,
                  categoriaEgreso,
                  rubro: finalRubro,
                  subRubro: finalSubRubro,
                  moneda: mMoneda,
                  monto: mMonto,
                  caja: mCaja,
                  concepto: mTipo === 'Ingreso' ? finalConcepto : (finalConcepto || finalSubRubro),
                  cotizacionHistorica: tcStr?.trim() || '',
                  createdAt: new Date().toISOString()
              };

              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'movimientos'), newMov);
          }
          alert('Â¡Importación completada con éxito!');
          setImportText('');
          setIsImportarObrasOpen(false);
      } catch (err) {
          console.error(err);
          alert('Error importando datos: ' + err.message);
      } finally {
          setIsImporting(false);
      }
  };

  const handleImportOficina = async () => {
      if(!importText.trim()) return alert("Pega los datos primero.");
      setIsImporting(true);
      try {
          const lineas = importText.trim().split('\n');
          let startIndex = 0;
          if (lineas[0].toLowerCase().includes('fecha')) startIndex = 1;

          for (let i = startIndex; i < lineas.length; i++) {
              const row = lineas[i].split('\t');
              if (row.length < 5) continue; 

              // FECHA | TIPO | MONEDA | MONTO | CAJA | CATEGORIA | RUBRO | CONCEPTO | CUENTA | TC
              const [fechaStr, tipoStr, monedaStr, montoStr, cajaStr, catStr, rubroStr, conceptStr, cuentaStr, tcStr] = row;
              
              const mTipo = tipoStr?.trim().toLowerCase() === 'ingreso' ? 'Ingreso' : 'Egreso';
              const strMoneda = (monedaStr || '').trim().toLowerCase();
              const mMoneda = (strMoneda === 'dolares' || strMoneda === 'dólares' || strMoneda === 'dolar' || strMoneda === 'dólar' || strMoneda.includes('usd')) ? 'USD' : 'ARS';
              
              let mMonto = 0;
              const rawMonto = (montoStr || "").trim();
              if (rawMonto) {
                  const cleaned = rawMonto.replace(/[^\d,.-]/g, '');
                  if (cleaned.includes(',') && cleaned.includes('.')) {
                      if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
                          mMonto = parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
                      } else {
                          mMonto = parseFloat(cleaned.replace(/,/g, ""));
                      }
                  } else if (cleaned.includes(',')) {
                      mMonto = parseFloat(cleaned.replace(",", "."));
                  } else {
                      mMonto = parseFloat(cleaned);
                  }
              }
              if(isNaN(mMonto)) mMonto = 0;
              
              const cCaja = cajaStr?.trim().toLowerCase();
              let mCaja = mMoneda === 'USD' ? cajas[0] : cajas[1]; // default intelligente
              if (cCaja) {
                 const matchCaja = cajas.find(c => c.toLowerCase() === cCaja);
                 if (matchCaja) mCaja = matchCaja;
              }
              
              let mTc = cotizacionBlue;
              if (tcStr) {
                  const pTc = parseFloat(tcStr.replace(/[^0-9,-]+/g,"").replace(",","."));
                  if (!isNaN(pTc) && pTc > 0) mTc = pTc;
              }

              const newMov = {
                  fecha: fechaStr || new Date().toISOString().split('T')[0],
                  area: 'Oficina',
                  tipo: mTipo,
                  categoriaEgreso: catStr?.trim().toUpperCase() || '',
                  rubro: rubroStr?.trim().toUpperCase() || '',
                  subRubro: conceptStr?.trim() || '',
                  moneda: mMoneda,
                  caja: mCaja,
                  monto: mMonto,
                  entidadCuenta: cuentaStr?.trim() && cuentaStr.trim() !== '-' ? cuentaStr.trim() : '',
                  tipoCambioReferencia: mTc,
                  createdAt: new Date().toISOString(),
                  // limpiezas
                  concepto: conceptStr?.trim() || 'Importación Oficina',
                  obraId: '',
                  propiedadId: '',
                  proveedorId: '',
                  directorId: '',
                  clienteId: ''
              };

              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'movimientos'), newMov);
          }

          if (confirm("Importación Oficina finalizada exitosamente.")) {
              setImportText('');
              setIsImportarOficinaOpen(false);
          }
      } catch (e) {
          console.error(e);
          alert("Error de importación Oficina. Revise el formato. " + e.message);
      } finally {
          setIsImporting(false);
      }
  };

  const handleImportAlquileres = async () => {
      if(!importText.trim()) return alert("Pega los datos primero.");
      setIsImporting(true);
      try {
          const lineas = importText.trim().split('\n');
          let startIndex = 0;
          if (lineas[0].toLowerCase().includes('fecha')) startIndex = 1;

          // Cachés locales para evitar duplicados en la misma iteración
          const provsCache = new Map(proveedores.map(p => [p.nombre.toLowerCase().trim(), p.id]));
          const clientesCache = new Map(clientes.map(c => [c.nombre.toLowerCase().trim(), c.id]));
          const propsCache = new Map(propiedades.map(p => [p.nombre.toLowerCase().trim(), p.id]));
          
          for (let i = startIndex; i < lineas.length; i++) {
              const row = lineas[i].split('\t');
              if (row.length < 5) continue; 

              // Columnas esperadas: [0]fecha, [1]tipo, [2]moneda, [3]monto, [4]caja, [5]propiedad, [6]categoria, [7]rubro, [8]concepto, [9]proveedor/inquilino
              const [fechaStr, tipoStr, monedaStr, montoStr, cajaStr, propStr, catStr, rubroStr, conceptStr, entidadStr] = row;
              
              const mTipo = tipoStr?.trim().toLowerCase() === 'ingreso' ? 'Ingreso' : 'Egreso';
              const strMoneda = (monedaStr || '').trim().toLowerCase();
              const mMoneda = (strMoneda === 'dolares' || strMoneda === 'dólares' || strMoneda === 'dolar' || strMoneda === 'dólar' || strMoneda.includes('usd')) ? 'USD' : 'ARS';
              
              let mMonto = 0;
              const rawMonto = (montoStr || "").trim();
              if (rawMonto) {
                  const cleaned = rawMonto.replace(/[^\d,.-]/g, '');
                  if (cleaned.includes(',') && cleaned.includes('.')) {
                      if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
                          mMonto = parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
                      } else {
                          mMonto = parseFloat(cleaned.replace(/,/g, ""));
                      }
                  } else if (cleaned.includes(',')) {
                      mMonto = parseFloat(cleaned.replace(",", "."));
                  } else {
                      mMonto = parseFloat(cleaned);
                  }
              }
              if(isNaN(mMonto)) mMonto = 0;
              
              const cCaja = cajaStr?.trim().toLowerCase();
              const mCaja = cajas.find(c => c.toLowerCase() === cCaja) || (mMoneda === 'USD' ? cajas[0] : cajas[1]);
              
              let mPropId = '';
              const cPropOriginal = propStr?.trim();
              if (cPropOriginal && cPropOriginal !== '-') {
                  const cProp = cPropOriginal.toLowerCase();
                  if (propsCache.has(cProp)) {
                      mPropId = propsCache.get(cProp);
                  } else {
                      const newPropRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'propiedades'), {
                         nombre: cPropOriginal, direccion: '', piso: '', depto: '', unidadFuncional: '', partidaInmobiliaria: '', estado: 'Alquilada', createdAt: new Date().toISOString()
                      });
                      mPropId = newPropRef.id;
                      propsCache.set(cProp, mPropId);
                  }
              }

              let mProvId = '';
              let mClienteId = '';
              const cEntidadOriginal = entidadStr?.trim();
              const cEntidad = cEntidadOriginal?.toLowerCase() || '';

              if (mTipo === 'Egreso') {
                  if (cEntidadOriginal && cEntidadOriginal !== '-') {
                      if (provsCache.has(cEntidad)) {
                          mProvId = provsCache.get(cEntidad);
                      } else {
                          const newProvRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'proveedores'), {
                              nombre: cEntidadOriginal, telefono:'', mail:'', cuit:'', nombreVendedor:'', alias1:'', alias2:'', tipo: catStr || 'Varios', rubro: rubroStr||'', concepto: conceptStr||'', createdAt: new Date().toISOString()
                          });
                          mProvId = newProvRef.id;
                          provsCache.set(cEntidad, mProvId);
                      }
                  }
              } else {
                  // Ingreso -> Inquilino/Cliente
                  if (cEntidadOriginal && cEntidadOriginal !== '-') {
                      if (clientesCache.has(cEntidad)) {
                          mClienteId = clientesCache.get(cEntidad);
                      } else {
                          const newClienteRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clientes'), {
                              nombre: cEntidadOriginal, cuit:'', telefono:'', mail:'', direccion:'', createdAt: new Date().toISOString()
                          });
                          mClienteId = newClienteRef.id;
                          clientesCache.set(cEntidad, mClienteId);
                      }
                      
                      // Auto-asignar la propiedad en base al contrato (si no se asignó forzadamente por la columna propiedad de la planilla)
                      if (!mPropId && mClienteId) {
                         // Buscar un contrato activo para este cliente
                         const ct = contratos.find(c => c.clienteId === mClienteId);
                         if (ct && ct.propiedadId) {
                             mPropId = ct.propiedadId;
                         }
                      }
                  }
              }

              let categoriaEgreso = 'Materiales';
              let finalRubro = rubroStr?.trim() || 'Varios';
              let finalSubRubro = conceptStr?.trim() || '';
              
              if (mTipo === 'Egreso') {
                  const rawCat = (catStr || '').trim().toLowerCase();
                  if (rawCat.includes('mano de obra')) categoriaEgreso = 'Mano de obra';
                  else if (rawCat.includes('impuestos')) categoriaEgreso = 'Impuestos';
                  else if (rawCat.includes('servicios')) categoriaEgreso = 'Servicios';
                  else if (rawCat.includes('varios')) categoriaEgreso = 'Varios';
                  else categoriaEgreso = 'Materiales';
              } else {
                  // En ingresos no se usa categoría de egresos
                  finalRubro = (catStr || '').trim() || 'Alquiler';
                  finalSubRubro = conceptStr?.trim() || '';
              }

              const newMov = {
                  fecha: fechaStr || new Date().toISOString().split('T')[0],
                  area: 'Alquileres',
                  obraId: '',
                  propiedadId: mPropId,
                  proveedorId: mProvId,
                  directorId: '',
                  clienteId: mClienteId,
                  tipo: mTipo,
                  tipoObraIngreso: 'PAGO A CUENTA',
                  categoriaEgreso,
                  rubro: finalRubro,
                  subRubro: finalSubRubro,
                  moneda: mMoneda,
                  monto: mMonto,
                  caja: mCaja,
                  concepto: mTipo === 'Ingreso' ? finalSubRubro : (finalSubRubro || finalRubro),
                  createdAt: new Date().toISOString()
              };

              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'movimientos'), newMov);
          }
          alert('Â¡Importación de Alquileres completada con éxito!');
          setImportText('');
          setIsImportarAlquileresOpen(false);
      } catch (err) {
          console.error(err);
          alert('Error importando datos de alquileres: ' + err.message);
      } finally {
          setIsImporting(false);
      }
  };

  // Función auxiliar de cálculo de fechas para contratos:
  const calcularFechasContrato = (fechaIni, mesesAct, duracionMeses) => {
    const fInicio = new Date(fechaIni);
    fInicio.setHours(fInicio.getHours() + 3); // Prevenir el corrimiento por tz (UTC a Buenos Aires)
    
    // Calcular próxima actualización
    const fProxAct = new Date(fInicio);
    fProxAct.setMonth(fProxAct.getMonth() + parseInt(mesesAct || 0));
    const dtProx = isNaN(fProxAct) ? '' : fProxAct.toISOString().split('T')[0];

    // Calcular fin de contrato
    const fFin = new Date(fInicio);
    fFin.setMonth(fFin.getMonth() + parseInt(duracionMeses || 0));
    const dtFin = isNaN(fFin) ? '' : fFin.toISOString().split('T')[0];

    return { dtProx, dtFin };
  };

  const handleImportDirectorio = async () => {
    if(!importText.trim()) return alert("Pega los datos primero.");
    setIsImporting(true);
    try {
        const lineas = importText.trim().split('\n');
        let startIndex = 0;
        if (lineas[0].toLowerCase().includes('fecha')) startIndex = 1;

        for (let i = startIndex; i < lineas.length; i++) {
            const row = lineas[i].split('\t');
            if (row.length < 5) continue; 

            // FECHA | TIPO | MONEDA | MONTO | CAJA | CATEGORIA | RUBRO | CONCEPTO | DIRECTOR | TC
            const [fechaStr, tipoStr, monedaStr, montoStr, cajaStr, catStr, rubroStr, conceptStr, directorStr, tcStr] = row;
            
            const mTipo = tipoStr?.trim().toLowerCase() === 'ingreso' ? 'Ingreso' : 'Egreso';
            const strMoneda = (monedaStr || '').trim().toLowerCase();
            const mMoneda = (strMoneda === 'dolares' || strMoneda === 'dólares' || strMoneda === 'dolar' || strMoneda === 'dólar' || strMoneda.includes('usd')) ? 'USD' : 'ARS';
            
            let mMonto = 0;
            const rawMonto = (montoStr || "").trim();
            if (rawMonto) {
                const cleaned = rawMonto.replace(/[^\d,.-]/g, '');
                if (cleaned.includes(',') && cleaned.includes('.')) {
                    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
                        mMonto = parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
                    } else {
                        mMonto = parseFloat(cleaned.replace(/,/g, ""));
                    }
                } else if (cleaned.includes(',')) {
                    mMonto = parseFloat(cleaned.replace(",", "."));
                } else {
                    mMonto = parseFloat(cleaned);
                }
            }
            if(isNaN(mMonto)) mMonto = 0;
            
            const cCaja = cajaStr?.trim().toLowerCase();
            let mCaja = mMoneda === 'USD' ? cajas[0] : cajas[1];
            if (cCaja) {
               const matchCaja = cajas.find(c => c.toLowerCase() === cCaja);
               if (matchCaja) mCaja = matchCaja;
            }
            
            let mTc = cotizacionBlue;
            if (tcStr) {
                const pTc = parseFloat(tcStr.replace(/[^0-9,-]+/g,"").replace(",","."));
                if (!isNaN(pTc) && pTc > 0) mTc = pTc;
            }

            const newMov = {
                fecha: fechaStr || new Date().toISOString().split('T')[0],
                area: 'Directorio',
                tipo: mTipo,
                categoriaEgreso: mTipo === 'Egreso' ? (catStr?.trim() || '') : '',
                rubro: rubroStr?.trim() || '',
                subRubro: conceptStr?.trim() || '',
                moneda: mMoneda,
                caja: mCaja,
                monto: mMonto,
                directorId: directorStr?.trim() || '',
                tipoCambioReferencia: mTc,
                createdAt: new Date().toISOString(),
                concepto: conceptStr?.trim() || 'Importación Directorio',
                obraId: '', propiedadId: '', proveedorId: '', clienteId: '', entidadCuenta: ''
            };
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'movimientos'), newMov);
        }
        alert("Importación de Directorio exitosa.");
        setImportText('');
        setIsImportarDirectorioOpen(false);
    } catch (e) {
        console.error(e);
        alert("Error importando Directorio: " + e.message);
    } finally {
        setIsImporting(false);
    }
  };

  const handleClearMovimientos = async () => {
    console.log("Ejecutando handleClearMovimientos (Borrado definitivo)");
    setIsImporting(true);
    setIsConfirmingClear(false);
    
    try {
      const colPath = `artifacts/${appId}/public/data/movimientos`;
      console.log("Accediendo a la colección:", colPath);
      
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'movimientos'));
      console.log("Consulta creada. Ejecutando getDocs...");
      
      const snap = await getDocs(q);
      console.log("Documentos encontrados:", snap.size);
      
      if (snap.empty) {
        alert("â„¹ï¸ No hay movimientos para borrar.");
        setIsImporting(false);
        return;
      }

      alert(`â³ Se encontraron ${snap.size} registros. Iniciando borrado secuencial...`);
      
      let count = 0;
      for (const d of snap.docs) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'movimientos', d.id));
        count++;
        if (count % 50 === 0) {
           console.log(`Borrados ${count} de ${snap.size}...`);
        }
      }
      
      console.log("Borrado finalizado con éxito.");
      alert(`âœ… Ã‰XITO: Se han eliminado ${count} movimientos correctamente.`);
    } catch (e) {
      console.error("ERROR CRÃTICO EN handleClearMovimientos:", e);
      alert("âŒ ERROR AL LIMPIAR: " + e.message);
    } finally {
      setIsImporting(false);
      console.log("Estado isImporting puesto en false");
    }
  };

  const menuItemsAdmin = [
    { id: 'Resumen', icon: LayoutDashboard, label: 'Inicio', type: 'main' },
    { id: 'Area_Obras', icon: HardHat, label: 'Obras', type: 'area' },
    { id: 'Area_Alquileres', icon: Building2, label: 'Alquileres', type: 'area' },
    { id: 'Area_Oficina', icon: Briefcase, label: 'Oficina', type: 'area' },
    { id: 'Area_Directorio', icon: Landmark, label: 'Directorio', type: 'area' },
    { id: 'Listas', icon: Database, label: 'Bases de Datos', type: 'main' },
  ];

  const menuItemsLists = [
    { id: 'Asientos', icon: FileText, label: 'Asientos' },
    { id: 'Obras', icon: HardHat, label: 'Lista Obras' },
    { id: 'Propiedades en Alquiler', icon: Building2, label: 'Propiedades' },
    { id: 'Contratos', icon: FileSignature, label: 'Contratos' },
    { id: 'Proveedores', icon: Users, label: 'Proveedores' },
    { id: 'Clientes', icon: UserCircle, label: 'Clientes' },
  ];

  const menuItemsEmpleado = [
    { id: 'Resumen', icon: LayoutDashboard, label: 'Inicio', type: 'main' },
    { id: 'Area_Obras', icon: HardHat, label: 'Obras', type: 'area' },
    { id: 'Area_Alquileres', icon: Building2, label: 'Alquileres', type: 'area' },
    { id: 'Listas', icon: Database, label: 'Bases de Datos', type: 'main' },
  ];

  const menuItems = userRole === 'empleadoadministrativo' ? menuItemsEmpleado : menuItemsAdmin;

  // --- Funciones de Autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Buscar el rol en Firestore
        try {
          const docs = await getDocs(query(collection(db, 'users'), where('email', '==', currentUser.email)));
          if (!docs.empty) {
            const r = docs.docs[0].data().role;
            setUserRole(r);
            if(r === 'empleadoadministrativo' && (activeTab === 'Resumen' || activeTab === 'Finanzas')) {
              setActiveTab('Obras'); // Default to Obras if restricted tabs were active
            }
          } else {
            setUserRole('admin'); 
          }
        } catch (e) {
          console.error("Error obteniendo rol", e);
          setUserRole('viewer');
        }
      } else {
        setUserRole(null);
      }
    });
    return () => unsubscribe();
  }, [activeTab]); // Added activeTab to dependency array to re-evaluate when it changes

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setAuthError('Correo o contraseña incorrectos, o usuario sin registrar.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  if (!user) {
    return (
      <div className="flex min-h-screen bg-[#06101f] items-center justify-center p-4 relative overflow-hidden">
        {/* Capas de fondo animadas */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent pointer-events-none"></div>
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="w-full max-w-md glass-panel rounded-[2.5rem] p-10 relative z-10 border-white/5 animate-fade-in shadow-2xl">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/20">
              <Lock className="text-white" size={32} />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter italic uppercase">NESS<span className="text-blue-500">.</span></h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">GESTIÃ“N ESTRATÃ‰GICA</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Usuario Administrador</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full glass-input rounded-2xl px-5 py-4 text-sm font-bold outline-none"
                placeholder="admin@ness.com"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Contraseña</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full glass-input rounded-2xl px-5 py-4 text-sm font-bold outline-none"
                placeholder="••••••••"
                required
              />
            </div>
            
            {authError && <p className="text-xs font-bold text-rose-400 text-center animate-pulse">{authError}</p>}
            
            <button 
              type="submit" 
              disabled={isLoggingIn}
              className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white shadow-2xl transition-all mt-4 
                ${isLoggingIn ? 'bg-slate-800' : 'bg-blue-600 hover:bg-blue-500 hover:-translate-y-1 shadow-blue-600/30'}`}
            >
              {isLoggingIn ? 'Verificando...' : 'Entrar al Sistema'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Mapeo de imagenes de fondo por area
  const bgImages = {
    'Obras': '/src/assets/bg_obras.png',
    'Alquileres': '/src/assets/bg_alquileres.png',
    'Oficina': '/src/assets/bg_oficina.png',
    'Directorio': '/src/assets/bg_directorio.png',
    'Resumen': '/src/assets/bg_oficina.png' 
  };

  const currentThemeClass = activeTab === 'Obras' ? 'theme-obras' : 
                            activeTab === 'Alquileres' ? 'theme-alquileres' :
                            activeTab === 'Oficina' ? 'theme-oficina' :
                            activeTab === 'Directorio' ? 'theme-directorio' : '';

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1),rgba(2,6,23,1))] z-0"></div>
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none z-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
      
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-80' : 'w-24'} glass-panel border-r-0 border-white/5 transition-all duration-500 ease-xl flex flex-col z-20 relative m-4 rounded-[2.5rem] shadow-2xl`}>
         <div className="p-8 flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 rotate-3 hover:rotate-0 transition-transform duration-500">
              <LayoutDashboard className="text-white" size={24} />
            </div>
            {isSidebarOpen && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                 <h1 className="text-2xl font-black tracking-tighter italic text-white leading-none">NESS<span className="text-blue-500">.</span>OS</h1>
                 <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em] mt-1">Management Suite</p>
              </div>
            )}
         </div>

         <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
            {menuItems.filter(i => i.type === 'main').map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${activeTab === item.id ? 'bg-white/10 text-white shadow-xl border border-white/5' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}>
                 {item.icon && <item.icon size={22} className={`${activeTab === item.id ? 'text-blue-500 scale-110' : 'group-hover:scale-110'} transition-transform`} />}
                 {isSidebarOpen && <span className="text-sm font-black uppercase tracking-widest italic">{item.label}</span>}
              </button>
            ))}

            <div className="my-8 px-6">
              <div className="h-px bg-white/5 w-full"></div>
              {isSidebarOpen && <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em] mt-8 mb-4 ml-1">Áreas de Negocio</p>}
            </div>

            {menuItems.filter(i => i.type === 'area').map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${activeTab === item.id ? 'bg-blue-600 text-white shadow-2xl shadow-blue-600/20' : 'text-slate-500 hover:bg-white/5'}`}>
                 {item.icon && <item.icon size={22} className={`${activeTab === item.id ? 'text-white scale-110' : 'group-hover:text-blue-400'} transition-all`} />}
                 {isSidebarOpen && <span className="text-sm font-black uppercase tracking-widest italic">{item.label}</span>}
              </button>
            ))}

            <div className="mt-12 px-6">
               <div className="h-px bg-white/5 w-full"></div>
               {isSidebarOpen && (
                 <div className="flex items-center justify-between mt-8 mb-4 px-1">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em]">Bases de Datos</p>
                    <Database size={10} className="text-slate-700" />
                 </div>
               )}
            </div>

            {menuItemsLists.map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-6 py-3 rounded-xl transition-all duration-300 group ${activeTab === item.id ? 'bg-white/5 text-blue-400' : 'text-slate-600 hover:text-slate-400'}`}>
                 {item.icon && <item.icon size={18} className="group-hover:rotate-12 transition-transform" />}
                 {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">{item.label}</span>}
              </button>
            ))}
         </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col relative z-10">
        <header className="px-12 py-10 flex justify-between items-center sticky top-0 z-20 backdrop-blur-md">
          <div>
            <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase animate-in fade-in slide-in-from-top-4 duration-700">
              {activeTab.replace('Area_', '')}
              <span className="text-blue-600">.</span>
            </h2>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2">Executive Overview</p>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl border border-white/5 shadow-2xl">
                <TrendingUp size={16} className="text-emerald-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">USD/ARS: <span className="text-white ml-2">$ {cotizacionBlue}</span></span>
             </div>
             <button onClick={() => handleLogout()} className="p-4 bg-white/5 rounded-2xl text-slate-500 hover:text-rose-500 transition-colors border border-white/5 hover:bg-rose-500/10">
               <LogOut size={20} />
             </button>
          </div>
        </header>

        <div className="flex-1 px-12 pb-12 overflow-y-auto custom-scrollbar">
          {activeTab === 'Area_Obras' && (
            <div className="space-y-0 animate-in fade-in slide-in-from-bottom-4 duration-700">

              {/* â”€â”€ Nav bar de Obras â”€â”€ */}
              <div className="flex items-center justify-between mb-10">
                <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
                  {['dashboard', 'reportes'].map(v => (
                    <button key={v} onClick={() => { setObrasView(v); setSelectedObraId(null); }}
                      className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${obrasView === v ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-white'}`}>
                      {v === 'dashboard' ? 'Panel de Área' : 'Reportes por Obra'}
                    </button>
                  ))}
                </div>
                {obrasView === 'dashboard' && (
                  <div className="flex gap-2">
                    {['Todas', 'En Proceso', 'Finalizada'].map(st => (
                      <button key={st} onClick={() => setObrasStatusFilter(st)}
                        className={`px-5 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${obrasStatusFilter === st ? 'bg-blue-600 text-white' : 'glass-panel text-slate-500 hover:text-white'}`}>
                        {st}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• DASHBOARD â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
              {obrasView === 'dashboard' && !selectedObraId && (() => {
                const anoActual = new Date().getFullYear();
                const movsObras = movimientos.filter(m => m.area === 'Obras');
                const movsAno = movsObras.filter(m => normalizeYearMonth(m.fecha).startsWith(String(anoActual)));
                const balanceAno = movsAno.reduce((acc, m) => acc + (m.tipo === 'Ingreso' ? convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia) : -convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia)), 0);
                const obrasActivas = obras.filter(o => o.estado !== 'Finalizada');
                const obrasFinalizadasAno = obras.filter(o => o.estado === 'Finalizada' && o.fechaInicio?.startsWith(anoActual));
                
                // Obras en rojo (en USD)
                const obrasEnRojo = obras.map(o => {
                  const mO = movimientos.filter(m => m.obraId === o.id);
                  const bal = mO.reduce((acc, m) => acc + (m.tipo === 'Ingreso' ? convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia) : -convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia)), 0);
                  return { ...o, balance: bal };
                }).filter(o => o.balance < 0);

                // Certificados a cobrar (en USD si aplica, asumiendo ARS por defecto si no hay moneda en el registro de certificación)
                const certificados = movsObras.filter(m => m.tipoObraIngreso === 'CERTIFICACIONES');
                const totalCert = certificados.reduce((acc, m) => acc + convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia), 0);

                // SVG Chart data — ingresos y egresos por mes del año actual (u$d)
                const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                const chartData = meses.map((_, i) => {
                  const mm = String(i + 1).padStart(2, '0');
                  const prefix = `${anoActual}-${mm}`;
                  const ing = movsObras.filter(m => m.tipo === 'Ingreso' && normalizeYearMonth(m.fecha) === prefix).reduce((a, m) => a + convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia), 0);
                  const egr = movsObras.filter(m => m.tipo === 'Egreso' && normalizeYearMonth(m.fecha) === prefix).reduce((a, m) => a + convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia), 0);
                  return { label: meses[i], ing, egr };
                });
                const maxVal = Math.max(...chartData.map(d => Math.max(d.ing, d.egr)), 1);
                const W = 700, H = 180, PAD = 30;
                const xStep = (W - PAD * 2) / 11;
                const yOf = v => H - PAD - ((v / maxVal) * (H - PAD * 2));
                const polyline = pts => pts.map((p, i) => `${PAD + i * xStep},${yOf(p)}`).join(' ');

                return (
                  <div className="space-y-10">
                    {/* KPIs */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-gradient-to-br from-orange-600 to-rose-700 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden col-span-2 lg:col-span-1">
                        <h4 className="text-[9px] font-black text-white/60 uppercase tracking-[0.3em] mb-2">Balance {anoActual} (USD)</h4>
                        <p className={`text-3xl font-black tracking-tighter ${balanceAno >= 0 ? 'text-white' : 'text-rose-200'}`}>u$d {balanceAno.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                      </div>
                      <div className="glass-panel p-8 rounded-[2.5rem]">
                        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Obras Activas</h4>
                        <p className="text-3xl font-black text-white">{obrasActivas.length}</p>
                        <p className="text-[8px] text-slate-600 mt-2 uppercase font-black tracking-widest">en proceso</p>
                      </div>
                      <div className="glass-panel p-8 rounded-[2.5rem]">
                        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Finalizadas {anoActual}</h4>
                        <p className="text-3xl font-black text-white">{obrasFinalizadasAno.length}</p>
                        <p className="text-[8px] text-slate-600 mt-2 uppercase font-black tracking-widest">este año</p>
                      </div>
                      <div className="glass-panel p-8 rounded-[2.5rem] cursor-pointer hover:border-emerald-500/30 border border-white/5 transition-all" onClick={() => setCertDetalleOpen(v => !v)}>
                        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Certificados USD</h4>
                        <p className="text-3xl font-black text-emerald-400">u$d {totalCert.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                        <p className="text-[8px] text-emerald-700 mt-2 uppercase font-black tracking-widest flex items-center gap-1">Ver detalle <ArrowUpRight size={10}/></p>
                      </div>
                    </div>

                    {/* Detalle certificados */}
                    {certDetalleOpen && certificados.length > 0 && (
                      <div className="glass-panel rounded-[2rem] overflow-hidden border border-white/5">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                          <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Detalle de Certificados</h4>
                          <button onClick={() => setCertDetalleOpen(false)} className="text-slate-600 hover:text-white"><X size={16}/></button>
                        </div>
                        {certificados.map(c => (
                          <div key={c.id} className="flex justify-between items-center px-6 py-4 border-b border-white/5 last:border-0">
                            <div>
                              <p className="text-xs font-black text-white">{obras.find(o => o.id === c.obraId)?.nombre || 'Obra'}</p>
                              <p className="text-[8px] text-slate-500 font-bold">{c.fecha} · {c.concepto || 'Certificación'}</p>
                            </div>
                            <p className="text-sm font-black text-emerald-400">$ {c.monto?.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* SVG Chart */}
                    <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5">
                      <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6">Ingresos vs. Egresos — {anoActual}</h4>
                      <div className="flex gap-6 mb-4">
                        <span className="flex items-center gap-2 text-[9px] font-black text-emerald-400 uppercase"><span className="w-6 h-0.5 bg-emerald-400 inline-block rounded-full"></span>Ingresos</span>
                        <span className="flex items-center gap-2 text-[9px] font-black text-orange-500 uppercase"><span className="w-6 h-0.5 bg-orange-500 inline-block rounded-full"></span>Egresos</span>
                      </div>
                      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" style={{height: 200}}>
                        {/* Grid lines */}
                        {[0,0.25,0.5,0.75,1].map(t => (
                          <line key={t} x1={PAD} y1={yOf(maxVal * t)} x2={W - PAD} y2={yOf(maxVal * t)} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                        ))}
                        {/* Ingresos area fill */}
                        <polygon
                          points={`${PAD},${H - PAD} ${chartData.map((d, i) => `${PAD + i * xStep},${yOf(d.ing)}`).join(' ')} ${PAD + 11 * xStep},${H - PAD}`}
                          fill="rgba(52,211,153,0.06)"
                        />
                        {/* Egresos area fill */}
                        <polygon
                          points={`${PAD},${H - PAD} ${chartData.map((d, i) => `${PAD + i * xStep},${yOf(d.egr)}`).join(' ')} ${PAD + 11 * xStep},${H - PAD}`}
                          fill="rgba(249,115,22,0.06)"
                        />
                        {/* Lines */}
                        <polyline points={polyline(chartData.map(d => d.ing))} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
                        <polyline points={polyline(chartData.map(d => d.egr))} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
                        {/* Dots */}
                        {chartData.map((d, i) => (
                          <g key={i}>
                            {d.ing > 0 && <circle cx={PAD + i * xStep} cy={yOf(d.ing)} r="4" fill="#34d399"/>}
                            {d.egr > 0 && <circle cx={PAD + i * xStep} cy={yOf(d.egr)} r="4" fill="#f97316"/>}
                          </g>
                        ))}
                        {/* X axis labels */}
                        {meses.map((m, i) => (
                          <text key={m} x={PAD + i * xStep} y={H + 14} textAnchor="middle" fill="rgba(148,163,184,0.6)" fontSize="9" fontWeight="700" fontFamily="sans-serif">{m}</text>
                        ))}
                      </svg>
                    </div>

                    {/* Obras en rojo */}
                    {obrasEnRojo.length > 0 && (
                      <div>
                        <h4 className="text-[9px] font-black text-rose-500 uppercase tracking-[0.4em] mb-4 flex items-center gap-2"><AlertTriangle size={12}/> Obras con Balance Negativo</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {obrasEnRojo.map(o => (
                            <button key={o.id} onClick={() => setSelectedObraId(o.id)}
                              className="glass-panel p-6 rounded-2xl border border-rose-500/20 text-left hover:border-rose-500/50 transition-all group">
                              <p className="text-xs font-black text-white uppercase">{o.nombre}</p>
                              <p className="text-lg font-black text-rose-400 mt-2">u$d {o.balance.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                              <p className="text-[8px] text-slate-600 mt-1 uppercase font-black">Ver detalle â†’</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Grid obras */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {obras.filter(o => obrasStatusFilter === 'Todas' ? true : o.estado === obrasStatusFilter).map(o => {
                              const mObra = movimientos.filter(m => m.obraId === o.id);
                              const bObra = mObra.reduce((acc, m) => acc + (m.tipo==='Ingreso' ? convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia) : -convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia)), 0);
                              return (
                                <div key={o.id} className="glass-panel p-8 rounded-[2rem] border border-white/5 hover:bg-white/[0.03] transition-all group relative">
                                  <button onClick={() => handleEditObra(o)} className="absolute top-6 right-6 p-2 rounded-lg bg-white/5 text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:text-white">
                                    <FileSignature size={14} />
                                  </button>
                                  <div className="flex justify-between items-start mb-6">
                                    <div>
                                      <h3 className="text-xl font-black text-white italic">{o.nombre}</h3>
                                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{o.direccion || 'Sin dirección'}</p>
                                    </div>
                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${o.estado==='Finalizada'?'bg-emerald-500/20 text-emerald-400':'bg-blue-500/20 text-blue-400'}`}>{o.estado}</span>
                                  </div>
                                  <div className="flex justify-between items-end">
                                    <div>
                                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Balance USD</p>
                                      <p className={`text-2xl font-black ${bObra < 0 ? 'text-rose-400' : 'text-white'}`}>u$d {bObra.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                                    </div>
                                    <button onClick={() => setSelectedObraId(o.id)} className="px-6 py-2.5 bg-white text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">Ver Detalle</button>
                                  </div>
                                </div>
                              );
                            })}
                    </div>
                  </div>
                );
              })()}

              {/* â•â• DETALLE DE OBRA (desde dashboard) â•â• */}
              {obrasView === 'dashboard' && selectedObraId && (() => {
                const obra = obras.find(o => o.id === selectedObraId);
                const mObra = movimientos.filter(m => m.obraId === selectedObraId);
                const mEgr = mObra.filter(m => m.tipo === 'Egreso');
                const ing = mObra.filter(m => m.tipo === 'Ingreso').reduce((a, m) => a + m.monto, 0);
                const egr = mEgr.reduce((a, m) => a + m.monto, 0);

                // Breakdown: categoría â†’ rubro â†’ concepto
                const catMap = {};
                mEgr.forEach(m => {
                  const cat = m.categoriaEgreso || 'Varios';
                  const rub = m.rubro || '-';
                  const con = m.concepto || m.subRubro || '-';
                  if (!catMap[cat]) catMap[cat] = {};
                  if (!catMap[cat][rub]) catMap[cat][rub] = {};
                  catMap[cat][rub][con] = (catMap[cat][rub][con] || 0) + m.monto;
                });
                const totalEgr = egr || 1;

                return (
                  <div className="space-y-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                      <div className="space-y-3">
                        <button onClick={() => setSelectedObraId(null)} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
                          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform"/>
                          <span className="text-[9px] font-bold uppercase tracking-widest">Volver al Panel</span>
                        </button>
                        <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase">{obra?.nombre}</h3>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">{obra?.direccion}</p>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        <button onClick={() => { setFormMov({...formMov, area:'Obras', obraId:selectedObraId, tipo:'Ingreso'}); setIsModalMovOpen(true); }}
                          className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:scale-105 transition-all">
                          + Ingreso
                        </button>
                        <button onClick={() => { setFormMov({...formMov, area:'Obras', obraId:selectedObraId, tipo:'Egreso'}); setIsModalMovOpen(true); }}
                          className="px-6 py-3 bg-rose-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:scale-105 transition-all">
                          + Egreso
                        </button>
                      </div>
                    </div>

                    {/* KPIs obra */}
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'Ingresos', v: ing, color: 'text-emerald-400' },
                        { label: 'Egresos', v: egr, color: 'text-rose-400' },
                        { label: 'Balance', v: ing - egr, color: ing - egr >= 0 ? 'text-white' : 'text-rose-400' },
                      ].map(k => (
                        <div key={k.label} className="glass-panel p-6 rounded-2xl">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">{k.label}</p>
                          <p className={`text-xl font-black tracking-tighter ${k.color}`}>$ {k.v.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>

                    {/* Breakdown Categoría â†’ Rubro â†’ Concepto */}
                    <div className="glass-panel p-8 rounded-[2rem] border border-white/5">
                      <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-6">Costos por Categoría / Rubro / Concepto</h4>
                      <div className="space-y-6">
                        {Object.entries(catMap).sort((a,b) => {
                          const sumA = Object.values(a[1]).flatMap(Object.values).reduce((s,v)=>s+v,0);
                          const sumB = Object.values(b[1]).flatMap(Object.values).reduce((s,v)=>s+v,0);
                          return sumB - sumA;
                        }).map(([cat, rubros]) => {
                          const catTotal = Object.values(rubros).flatMap(Object.values).reduce((s,v)=>s+v,0);
                          return (
                            <div key={cat} className="border border-white/5 rounded-2xl overflow-hidden">
                              <div className="flex justify-between items-center px-6 py-4 bg-white/3">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">{cat}</span>
                                <div className="flex items-center gap-4">
                                  <span className="text-[9px] font-black text-blue-400">{((catTotal/totalEgr)*100).toFixed(1)}%</span>
                                  <span className="text-sm font-black text-white">$ {catTotal.toLocaleString()}</span>
                                </div>
                              </div>
                              <div className="w-full h-1 bg-white/5"><div className="bg-blue-600 h-full" style={{width:`${(catTotal/totalEgr)*100}%`}}></div></div>
                              {Object.entries(rubros).sort((a,b)=>Object.values(b[1]).reduce((s,v)=>s+v,0)-Object.values(a[1]).reduce((s,v)=>s+v,0)).map(([rub, conceptos]) => {
                                const rubTotal = Object.values(conceptos).reduce((s,v)=>s+v,0);
                                return (
                                  <div key={rub} className="border-t border-white/5">
                                    <div className="flex justify-between items-center px-8 py-3 bg-white/[0.01]">
                                      <span className="text-[9px] font-black text-slate-400 uppercase">{rub}</span>
                                      <span className="text-xs font-black text-slate-300">$ {rubTotal.toLocaleString()}</span>
                                    </div>
                                    {Object.entries(conceptos).sort((a,b)=>b[1]-a[1]).map(([con, val]) => (
                                      <div key={con} className="flex justify-between items-center px-12 py-2 border-t border-white/[0.03]">
                                        <span className="text-[9px] text-slate-500">{con}</span>
                                        <span className="text-[9px] font-black text-slate-400">$ {val.toLocaleString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• REPORTES â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
              {obrasView === 'reportes' && (() => {
                const obrasFiltradas = reporteObraId === 'todas' ? obras : obras.filter(o => o.id === reporteObraId);
                const movsReporte = movimientos.filter(m => m.area === 'Obras' && (reporteObraId === 'todas' || m.obraId === reporteObraId));
                const movsEgr = movsReporte.filter(m => m.tipo === 'Egreso');
                const movsIng = movsReporte.filter(m => m.tipo === 'Ingreso');

                // Cuentas corrientes proveedores
                const provMap = {};
                movsEgr.forEach(m => {
                  if (!m.proveedorId) return;
                  const prov = proveedores.find(p => p.id === m.proveedorId);
                  const nombre = prov?.nombre || 'Sin Nombre';
                  if (!provMap[nombre]) provMap[nombre] = { total: 0, movs: [] };
                  provMap[nombre].total += m.monto;
                  provMap[nombre].movs.push(m);
                });
                const filteredProvs = Object.entries(provMap).filter(([n]) =>
                  !reporteProveedorFilter || n.toLowerCase().includes(reporteProveedorFilter.toLowerCase())
                ).sort((a,b) => b[1].total - a[1].total);

                // Costos ordenados Catâ†’Rubâ†’Con
                const catMap = {};
                movsEgr.forEach(m => {
                  const cat = m.categoriaEgreso || 'Varios';
                  const rub = m.rubro || '-';
                  const con = m.concepto || m.subRubro || '-';
                  if (!catMap[cat]) catMap[cat] = {};
                  if (!catMap[cat][rub]) catMap[cat][rub] = {};
                  catMap[cat][rub][con] = (catMap[cat][rub][con] || 0) + m.monto;
                });
                const totalEgr = movsEgr.reduce((a, m) => a + m.monto, 0) || 1;

                // Ingresos por categoría
                const ingMap = {};
                movsIng.forEach(m => {
                  const cat = m.tipoObraIngreso || 'INGRESO';
                  ingMap[cat] = (ingMap[cat] || 0) + m.monto;
                });

                return (
                  <div className="space-y-10">
                    {/* Selector de obra */}
                    <div className="flex gap-4 flex-wrap items-center">
                      <select value={reporteObraId} onChange={e => setReporteObraId(e.target.value)}
                        className="glass-panel text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-2xl outline-none border border-white/10 bg-transparent">
                        <option value="todas" className="bg-slate-900">Todas las obras</option>
                        {obras.map(o => <option key={o.id} value={o.id} className="bg-slate-900">{o.nombre}</option>)}
                      </select>
                      <div className="ml-auto text-right">
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Ingresos totales</p>
                        <p className="text-lg font-black text-emerald-400">$ {movsIng.reduce((a,m)=>a+m.monto,0).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Egresos totales</p>
                        <p className="text-lg font-black text-rose-400">$ {movsEgr.reduce((a,m)=>a+m.monto,0).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Costos Catâ†’Rubâ†’Con */}
                      <div className="glass-panel p-8 rounded-[2rem] border border-white/5">
                        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-6">Egresos por Categoría / Rubro / Concepto</h4>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                          {Object.entries(catMap).sort((a,b)=>{
                            const sA=Object.values(a[1]).flatMap(Object.values).reduce((s,v)=>s+v,0);
                            const sB=Object.values(b[1]).flatMap(Object.values).reduce((s,v)=>s+v,0);
                            return sB-sA;
                          }).map(([cat, rubros]) => {
                            const catT = Object.values(rubros).flatMap(Object.values).reduce((s,v)=>s+v,0);
                            return (
                              <div key={cat} className="border border-white/5 rounded-xl overflow-hidden">
                                <div className="flex justify-between px-4 py-3 bg-white/3">
                                  <span className="text-[9px] font-black text-white uppercase">{cat}</span>
                                  <span className="text-[9px] font-black text-white">$ {catT.toLocaleString()}</span>
                                </div>
                                {Object.entries(rubros).map(([rub, concs]) => {
                                  const rubT = Object.values(concs).reduce((s,v)=>s+v,0);
                                  return (
                                    <div key={rub}>
                                      <div className="flex justify-between px-6 py-2 border-t border-white/5 bg-white/[0.01]">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase">{rub}</span>
                                        <span className="text-[9px] text-slate-400 font-black">$ {rubT.toLocaleString()}</span>
                                      </div>
                                      {Object.entries(concs).sort((a,b)=>b[1]-a[1]).map(([con, val]) => (
                                        <div key={con} className="flex justify-between px-9 py-1.5 border-t border-white/[0.03]">
                                          <span className="text-[9px] text-slate-600">{con}</span>
                                          <span className="text-[9px] text-slate-500">$ {val.toLocaleString()}</span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Ingresos + Proveedores */}
                      <div className="space-y-6">
                        {/* Ingresos por categoría */}
                        <div className="glass-panel p-8 rounded-[2rem] border border-white/5">
                          <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Ingresos por Tipo</h4>
                          <div className="space-y-3">
                            {Object.entries(ingMap).sort((a,b)=>b[1]-a[1]).map(([cat, val]) => (
                              <div key={cat} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                                <span className="text-[9px] font-black text-white uppercase tracking-widest">{cat}</span>
                                <span className="text-sm font-black text-emerald-400">$ {val.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Cuentas corrientes proveedores */}
                        <div className="glass-panel p-8 rounded-[2rem] border border-white/5">
                          <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Cuenta Corriente Proveedores</h4>
                          <input
                            type="text" placeholder="Buscar proveedor..."
                            value={reporteProveedorFilter} onChange={e => setReporteProveedorFilter(e.target.value)}
                            className="w-full glass-input rounded-xl px-4 py-2 text-xs font-bold outline-none mb-4"
                          />
                          <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                            {filteredProvs.map(([nombre, data]) => (
                              <details key={nombre} className="border border-white/5 rounded-xl overflow-hidden">
                                <summary className="flex justify-between items-center px-5 py-3 cursor-pointer select-none hover:bg-white/3">
                                  <span className="text-[9px] font-black text-white uppercase">{nombre}</span>
                                  <span className="text-sm font-black text-emerald-400">$ {data.total.toLocaleString()}</span>
                                </summary>
                                <div className="border-t border-white/5">
                                  {data.movs.sort((a,b)=>b.fecha?.localeCompare(a.fecha)).map((m, i) => (
                                    <div key={i} className="flex justify-between items-center px-6 py-2 text-[8px] border-t border-white/[0.03] first:border-0">
                                      <span className="text-slate-500">{m.fecha} · {m.concepto || '-'}</span>
                                      <span className="text-slate-400 font-black">$ {m.monto?.toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}


          {activeTab === 'Area_Alquileres' && (() => {
            // â”€â”€ Porcentajes VO 2789 â”€â”€
            const VO_PORCENTAJES = {
              'VO-LOCAL':12.03,'VO-1A':4.91,'VO-1B':3.93,'VO-1C':4.30,
              'VO-2A':4.94,'VO-2B':4.30,'VO-2C':3.96,'VO-3A':4.94,
              'VO-3B':4.30,'VO-3C':3.96,'VO-4A':4.94,'VO-4B':4.30,
              'VO-4C':3.96,'VO-5A':4.94,'VO-5B':4.30,'VO-5C':3.96,
              'VO-6A':5.81,'VO-6B':5.81,'VO-7A':5.33,'VO-8A':5.09
            };
            const SOCIOS = ['Florencia','Santiago','Sebastián','Emiliano'];

            // â”€â”€ Helpers â”€â”€
            const movsAlq = movimientos.filter(m => m.area === 'Alquileres');

            // Helper: determinar edificio de un movimiento por nombre de propiedad o centro de costos
            const getEdificio = (m) => {
              if (m.propiedadId) {
                const prop = propiedades.find(p => p.id === m.propiedadId);
                const pName = (prop?.nombre || '').toUpperCase();
                if (pName.startsWith('VO')) return 'VO';
                if (pName.startsWith('MO')) return 'MO';
              }
              // Gastos sin propiedad asignada: check concepto/rubro para VO-Consorcio / MO-General
              const refText = ((m.concepto || '') + ' ' + (m.rubro || '') + ' ' + (m.subRubro || '')).toUpperCase();
              if (refText.includes('VO-') || refText.includes('CONSORCIO VO') || refText.includes('VO CONSORCIO')) return 'VO';
              if (refText.includes('MO-') || refText.includes('GENERAL MO') || refText.includes('MO GENERAL')) return 'MO';
              return '';
            };

            const movsVO = movsAlq.filter(m => getEdificio(m) === 'VO');
            const movsMO = movsAlq.filter(m => getEdificio(m) === 'MO');

            const balEdificio = (movs) => movs.reduce((acc, m) => acc + (m.tipo === 'Ingreso' ? convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia) : -convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia)), 0);

            // â”€â”€ Alertas día 8 â”€â”€
            const hoy = new Date();
            const dia = hoy.getDate();
            const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`;
            const contsActivos = contratos.filter(c => c.estado === 'Activo' || !c.estado);
            
            const alertasSinPago = contsActivos.filter(c => {
              const tieneAlquilerMes = movsAlq.some(m => m.propiedadId === c.propiedadId && normalizeYearMonth(m.fecha) === mesActual && m.tipo === 'Ingreso' && (m.rubro === 'Alquiler' || m.categoriaIngreso === 'Alquiler'));
              return !tieneAlquilerMes;
            });
            const alertasSinExpensas = contsActivos.filter(c => {
              const tieneExpensasMes = movsAlq.some(m => m.propiedadId === c.propiedadId && normalizeYearMonth(m.fecha) === mesActual && m.tipo === 'Ingreso' && (m.rubro === 'Expensas' || m.categoriaIngreso === 'Expensas'));
              return !tieneExpensasMes;
            });

            // â”€â”€ Sin contrato activo â”€â”€
            const propSinContrato = propiedades.filter(p => {
              const n = (p.nombre||'').toUpperCase().trim();
              if (p.esCentroCostos) return false;
              if (n.includes('CONSORCIO') || n.includes('MO GENERAL') || n.includes('MO-GENERAL') || n.includes('GENERAL MO')) return false;
              if (n.includes('CORREA 3212')) return false; // sede empresa
              return !contsActivos.find(c => c.propiedadId === p.id);
            });

            // â”€â”€ Balance mensual por edificio â”€â”€
            const meses12 = Array.from({length:12},(_,i)=>{
              const d = new Date(hoy.getFullYear(), hoy.getMonth()-11+i, 1);
              return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            });

            // â”€â”€ Chart SVG: histórico ingresos/egresos â”€â”€
            const chartMovs = alqChartEdificio === 'todos' ? movsAlq : alqChartEdificio === 'VO' ? movsVO : movsMO;
            const chartData12 = meses12.map(m => ({
              label: m.slice(5),
              ing: chartMovs.filter(mv => mv.tipo==='Ingreso' && normalizeYearMonth(mv.fecha) === m).reduce((a,mv)=>a+convertToUSD(mv.monto, mv.moneda, mv.cotizacionHistorica || mv.tipoCambioReferencia),0),
              egr: chartMovs.filter(mv => mv.tipo==='Egreso' && normalizeYearMonth(mv.fecha) === m).reduce((a,mv)=>a+convertToUSD(mv.monto, mv.moneda, mv.cotizacionHistorica || mv.tipoCambioReferencia),0),
            }));
            const maxChartVal = Math.max(...chartData12.map(d=>Math.max(d.ing,d.egr)),1);
            const CW=700,CH=160,CPAD=30;
            const cxStep=(CW-CPAD*2)/11;
            const cyOf=v=>CH-CPAD-((v/maxChartVal)*(CH-CPAD*2));

            // â”€â”€ Distribución socios VO â”€â”€
            const egrsVOAll = movsVO.filter(m=>m.tipo==='Egreso');
            const mesesConDatos = [...new Set(egrsVOAll.map(m=>m.fecha?.slice(0,7)).filter(Boolean))].sort();
            const ultimos3 = mesesConDatos.slice(-3);
            const egrsPromMensual = ultimos3.length > 0
              ? ultimos3.map(mes=>egrsVOAll.filter(m=>m.fecha?.startsWith(mes)).reduce((a,m)=>a+m.monto,0)).reduce((a,b)=>a+b,0) / ultimos3.length
              : 0;
            const fondoReserva = egrsPromMensual * 2;
            const cajaVO = balEdificio(movsVO);
            const utilidadDistribuible = Math.max(0, cajaVO - fondoReserva);
            const porSocio = utilidadDistribuible / 4;

            // â”€â”€ Liquidación expensas VO â”€â”€
            const liquidPeriodo = `${liquidacionAnio}-${liquidacionMes}`;
            const egrsVOLiquid = movsVO.filter(m=>m.tipo==='Egreso' && normalizeYearMonth(m.fecha) === liquidPeriodo);
            const totalGastosLiquid = egrsVOLiquid.reduce((a,m)=>a+m.monto,0);

            const generarPDFLiquidacion = () => {
              const w = window.open('','_print','width=800,height=1000,scrollbars=yes');
              const rows = Object.entries(VO_PORCENTAJES).map(([unidad, pct]) => {
                const monto = (totalGastosLiquid * pct / 100);
                const prop = propiedades.find(p=>p.nombre===unidad || p.codigo===unidad);
                const contrato = prop ? contsActivos.find(c=>c.propiedadId===prop.id) : null;
                const cliente = contrato ? clientes.find(cl => cl.id === contrato.clienteId) : null;
                const inquilino = cliente ? (cliente.nombre || 'Sin nombre') : 'Sin inquilino';
                const tienesPago = movsAlq.some(m=>m.propiedadId===prop?.id && normalizeYearMonth(m.fecha) === liquidPeriodo && m.tipo === 'Ingreso');
                return {unidad, pct, monto, inquilino, tienesPago, prop};
              });
              // Colores corporativos NESS
              const NAVY = '#1B3054';
              const DARK = '#0E1F38';
              const STEEL = '#3A6080';
              const BEIGE = '#C2B08B';
              const COPPER = '#B07D4F';
              // Agrupar: mano de obra + materiales = "Mantenimiento", excepto Nak Berisha
              const NAK_BERISHA = 'nak berisha';
              const isMantenimiento = (m) => {
                const rubro = (m.rubro||m.subRubro||'').toUpperCase();
                const cat = (m.categoriaEgreso||'').toUpperCase();
                const concepto = (m.concepto||'').toUpperCase();
                const prov = (proveedores.find(p=>p.id===m.proveedorId)?.nombre||'').toLowerCase();
                if (prov.includes(NAK_BERISHA)) return false; // Nak Berisha siempre aparte
                return rubro.includes('MANO DE OBRA') || rubro.includes('MATERIAL') || cat.includes('MANO DE OBRA') || cat.includes('MATERIAL') || concepto.includes('MANO DE OBRA') || concepto.includes('MATERIAL');
              };
              // Separar gastos de mantenimiento del resto
              const gastosMantenimiento = egrsVOLiquid.filter(m => isMantenimiento(m));
              const gastosNormales = egrsVOLiquid.filter(m => !isMantenimiento(m));
              const totalMantenimiento = gastosMantenimiento.reduce((a,m) => a + (Number(m.monto)||0), 0);
              
              const gastosNormalesHTML = gastosNormales.map(m => {
                const prov = proveedores.find(p=>p.id===m.proveedorId)?.nombre||'-';
                const cat = (m.categoriaEgreso||'').toUpperCase();
                const isServPublico = cat.includes('SERVICIO');
                const showCat = isServPublico ? 'Servicios Públicos' : (m.categoriaEgreso||'-');
                const showRubro = isServPublico ? prov : (m.rubro||m.subRubro||'-');
                const showConcepto = isServPublico ? '-' : (m.concepto||'-');
                const showProv = isServPublico ? '-' : prov;
                return '<tr><td>'+(m.fecha||'-')+'</td><td>'+showCat+'</td><td>'+showRubro+'</td><td>'+showConcepto+'</td><td>'+showProv+'</td><td style="text-align:right">$ '+(m.monto?.toLocaleString()||'0')+'</td></tr>';
              }).join('');
              // Agregar línea resumen de mantenimiento si hay
              const mantHTML = totalMantenimiento > 0 ? '<tr><td>-</td><td>Mantenimiento</td><td>Varios</td><td>Mano de obra y materiales</td><td>Varios ('+gastosMantenimiento.length+' items)</td><td style="text-align:right">$ '+totalMantenimiento.toLocaleString()+'</td></tr>' : '';
              const gastosHTML = gastosNormalesHTML + mantHTML;
              const html = `<!DOCTYPE html><html><head>
                <title>Liquidación Expensas VO 2789 - ${liquidacionMes}/${liquidacionAnio}</title>
                <style>
                  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
                  *{margin:0;padding:0;box-sizing:border-box}
                  body{font-family:'Outfit',sans-serif;background:${DARK};color:#e2e8f0;padding:40px}
                  .header{border-bottom:3px solid ${BEIGE};padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:flex-start}
                  .brand{display:flex;align-items:center;gap:16px}
                  .brand-n{font-size:48px;font-weight:900;color:${NAVY};font-style:italic;letter-spacing:-3px}
                  .brand-sub{font-size:9px;font-weight:700;color:${STEEL};text-transform:uppercase;letter-spacing:4px}
                  .title{font-size:28px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:-1px}
                  .subtitle{font-size:10px;font-weight:700;color:${STEEL};text-transform:uppercase;letter-spacing:4px;margin-top:6px}
                  .meta{display:flex;gap:40px;margin-top:16px}
                  .meta-item p:first-child{font-size:8px;font-weight:900;color:${STEEL};text-transform:uppercase;letter-spacing:3px}
                  .meta-item p:last-child{font-size:16px;font-weight:900;color:#fff;margin-top:4px}
                  .section-title{font-size:9px;font-weight:900;color:${BEIGE};text-transform:uppercase;letter-spacing:3px;margin:24px 0 12px;border-bottom:1px solid ${NAVY};padding-bottom:6px}
                  table{width:100%;border-collapse:collapse;font-size:11px}
                  th{background:${NAVY};padding:10px 12px;text-align:left;font-size:8px;font-weight:900;color:${BEIGE};text-transform:uppercase;letter-spacing:2px}
                  td{padding:10px 12px;border-bottom:1px solid ${NAVY};font-weight:700}
                  .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:8px;font-weight:900;text-transform:uppercase}
                  .paid{background:#065f46;color:#34d399}.unpaid{background:#7f1d1d;color:#f87171}
                  .total-row{background:${NAVY};font-weight:900;color:${BEIGE}}
                  .gastos-title{font-size:9px;font-weight:900;color:${BEIGE};text-transform:uppercase;letter-spacing:3px;margin:24px 0 12px;border-bottom:1px solid ${NAVY};padding-bottom:6px}
                  .footer{margin-top:30px;border-top:2px solid ${NAVY};padding-top:16px;display:flex;justify-content:space-between;font-size:8px;color:${STEEL};text-transform:uppercase;letter-spacing:2px}
                  .wa-btn{display:inline-block;margin-top:20px;padding:10px 24px;background:#25d366;color:#fff;border-radius:8px;text-decoration:none;font-weight:900;font-size:12px;letter-spacing:1px}
                  @media print{body{background:#fff;color:#000;padding:20px}.wa-btn{display:none}}
                </style>
              </head><body>
                <div class="header">
                  <div>
                    <div class="brand">
                      <div class="brand-n">NESS<span style="color:${BEIGE}">.</span></div>
                    </div>
                    <div class="brand-sub">Inversiones de los Hermanos Donato</div>
                    <div style="margin-top:8px;font-size:10px;color:${STEEL}">D+ARQ · Gestión Inmobiliaria</div>
                  </div>
                  <div style="text-align:right">
                    <div class="title">Liquidación de Expensas</div>
                    <div class="subtitle">Vuelta de Obligado 2789</div>
                  </div>
                </div>
                <div class="meta">
                  <div class="meta-item"><p>Período</p><p>${liquidacionMes}/${liquidacionAnio}</p></div>
                  <div class="meta-item"><p>Total Gastos</p><p>$ ${totalGastosLiquid.toLocaleString()}</p></div>
                  <div class="meta-item"><p>Unidades</p><p>${Object.keys(VO_PORCENTAJES).length}</p></div>
                  <div class="meta-item"><p>Emitido</p><p>${new Date().toLocaleDateString()}</p></div>
                </div>
                <div class="gastos-title">Detalle de Gastos del Mes</div>
                <table>
                  <thead><tr><th>Fecha</th><th>Categoría</th><th>Rubro</th><th>Concepto</th><th>Proveedor</th><th style="text-align:right">Monto</th></tr></thead>
                  <tbody>
                    ${gastosHTML}
                    <tr class="total-row"><td colspan="5">TOTAL GASTOS</td><td style="text-align:right">$ ${totalGastosLiquid.toLocaleString()}</td></tr>
                  </tbody>
                </table>
                <div class="section-title">Liquidación por Unidad Funcional</div>
                <table>
                  <thead><tr><th>Unidad</th><th>%</th><th>Inquilino</th><th style="text-align:right">Monto</th><th>Estado</th></tr></thead>
                  <tbody>
                    ${rows.map(r=>'<tr><td>'+r.unidad+'</td><td>'+r.pct+'%</td><td>'+r.inquilino+'</td><td style="text-align:right">$ '+r.monto.toLocaleString(undefined,{maximumFractionDigits:0})+'</td><td><span class="badge '+(r.tienesPago?'paid':'unpaid')+'">'+(r.tienesPago?'Pago':'Sin pago')+'</span></td></tr>').join('')}
                    <tr class="total-row"><td colspan="3">TOTAL</td><td style="text-align:right">$ ${totalGastosLiquid.toLocaleString()}</td><td></td></tr>
                  </tbody>
                </table>
                <div class="footer">
                  <span>NESS · D+ARQ · Sistema de Gestión</span>
                  <span>Documento generado automáticamente · ${new Date().toLocaleString()}</span>
                </div>
                <div style="text-align:center">
                  <a class="wa-btn" href="https://api.whatsapp.com/send?text=${encodeURIComponent('Liquidación de Expensas VO 2789 - Período ' + liquidacionMes + '/' + liquidacionAnio + ' - Total: $' + totalGastosLiquid.toLocaleString())}" target="_blank">📱 Compartir por WhatsApp</a>
                </div>
              </body></html>`;
              w.document.write(html);
              w.document.close();
              setTimeout(()=>w.print(),500);
            };

            return (
              <div className="space-y-0 animate-in fade-in duration-700">
                {/* Nav */}
                <div className="flex items-center justify-between mb-10">
                  <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
                    {[{v:'dashboard',l:'Panel de Área'},{v:'rentabilidad',l:'Rentabilidad'},{v:'balanceMO',l:'Balance MO'},{v:'liquidacion',l:'Liquidación VO'}].map(({v,l}) => (
                      <button key={v} onClick={() => setAlqView(v)}
                        className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${alqView===v?'bg-white text-slate-900 shadow-xl':'text-slate-500 hover:text-white'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                  {alqView === 'dashboard' && (
                    <div className="flex gap-2">
                      {['VO','MO','todos'].map(e => (
                        <button key={e} onClick={()=>setAlqEdificio(e)}
                          className={`px-5 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${alqEdificio===e?'bg-blue-600 text-white':'glass-panel text-slate-500 hover:text-white'}`}>
                          {e === 'todos' ? 'Todos' : e}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* â•â•â•â•â•â• DASHBOARD â•â•â•â•â•â• */}
                {alqView === 'dashboard' && (
                  <div className="space-y-10">
                    {/* KPIs edificios */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                      {[
                        {label:'Balance VO (USD) — Histórico total', val:balEdificio(movsVO), bg:'from-blue-700 to-indigo-800'},
                        {label:'Balance MO (USD) — Histórico total', val:balEdificio(movsMO), bg:'from-slate-700 to-slate-800'},
                        {label:'Contratos Activos', val:contsActivos.length, bg:null},
                        {label:'Total Activos (USD)', val:stats.totalActivosUSD, bg:'from-emerald-600 to-teal-700 shadow-xl shadow-emerald-900/20'},
                      ].map(k => (
                        <div key={k.label} className={`p-8 rounded-[2.5rem] ${k.bg ? `bg-gradient-to-br ${k.bg}` : 'glass-panel'}`}>
                          <h4 className="text-[9px] font-black text-white/60 uppercase tracking-[0.3em] mb-2">{k.label}</h4>
                          <p className={`text-2xl font-black ${k.val < 0 ? 'text-rose-300' : 'text-white'}`}>
                            {typeof k.val === 'number' && k.label.includes('(USD)') ? `u$d ${k.val.toLocaleString(undefined, {maximumFractionDigits:0})}` : k.val}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Alertas día 8 */}
                    {(alertasSinPago.length > 0 || alertasSinExpensas.length > 0) && (
                      <div className="space-y-4">
                        <h4 className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                          <AlertTriangle size={12}/> Alertas — {mesActual}
                        </h4>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {alertasSinPago.length > 0 && (
                            <div className="glass-panel rounded-2xl border border-amber-500/20 overflow-hidden">
                              <div className="px-5 py-3 bg-amber-500/10 border-b border-amber-500/20">
                                <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Alquileres sin pago ({alertasSinPago.length})</p>
                              </div>
                              {alertasSinPago.slice(0,6).map(c => {
                                const prop = propiedades.find(p=>p.id===c.propiedadId);
                                const cli = clientes.find(cl=>cl.id===c.clienteId);
                                const nomInq = cli ? (cli.nombre || 'Sin nombre') : 'Sin inquilino';
                                const edif = prop?.nombre?.toUpperCase().startsWith('VO') ? 'VO 2789' : prop?.nombre?.toUpperCase().startsWith('MO') ? 'MO 2325' : '-';
                                return (
                                  <div key={c.id} className="flex justify-between items-center px-5 py-3 border-b border-white/5 last:border-0">
                                    <div>
                                      <p className="text-[9px] font-black text-white">{nomInq}</p>
                                      <p className="text-[8px] text-slate-500">{prop?.nombre || '-'} · {edif}</p>
                                    </div>
                                    <span className="text-[8px] font-black text-amber-400 uppercase">Sin pago</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {alertasSinExpensas.length > 0 && (
                            <div className="glass-panel rounded-2xl border border-rose-500/20 overflow-hidden">
                              <div className="px-5 py-3 bg-rose-500/10 border-b border-rose-500/20">
                                <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Expensas sin pago ({alertasSinExpensas.length})</p>
                              </div>
                              {alertasSinExpensas.slice(0,6).map(c => {
                                const prop = propiedades.find(p=>p.id===c.propiedadId);
                                const cli = clientes.find(cl=>cl.id===c.clienteId);
                                const nomInq = cli ? (cli.nombre || 'Sin nombre') : 'Sin inquilino';
                                const edif = prop?.nombre?.toUpperCase().startsWith('VO') ? 'VO 2789' : prop?.nombre?.toUpperCase().startsWith('MO') ? 'MO 2325' : '-';
                                return (
                                  <div key={c.id} className="flex justify-between items-center px-5 py-3 border-b border-white/5 last:border-0">
                                    <div>
                                      <p className="text-[9px] font-black text-white">{nomInq}</p>
                                      <p className="text-[8px] text-slate-500">{prop?.nombre || '-'} · {edif}</p>
                                    </div>
                                    <span className="text-[8px] font-black text-rose-400 uppercase">Sin pago</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Balance mensual por edificio + Gráfico histórico */}
                    <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Histórico Ingresos vs. Egresos — Ãšltimos 12 meses</h4>
                        <div className="flex gap-2">
                          {['todos','VO','MO'].map(e=>(
                            <button key={e} onClick={()=>setAlqChartEdificio(e)}
                              className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${alqChartEdificio===e?'bg-blue-600 text-white':'text-slate-600 hover:text-white'}`}>
                              {e==='todos'?'Todos':e}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-6 mb-4">
                        <span className="flex items-center gap-2 text-[9px] font-black text-emerald-400 uppercase"><span className="w-6 h-0.5 bg-emerald-400 inline-block rounded-full"></span>Ingresos</span>
                        <span className="flex items-center gap-2 text-[9px] font-black text-orange-500 uppercase"><span className="w-6 h-0.5 bg-orange-500 inline-block rounded-full"></span>Egresos</span>
                      </div>
                      <svg viewBox={`0 0 ${CW} ${CH + 20}`} className="w-full" style={{height:180}}>
                        {[0,0.25,0.5,0.75,1].map(t=>(
                          <line key={t} x1={CPAD} y1={cyOf(maxChartVal*t)} x2={CW-CPAD} y2={cyOf(maxChartVal*t)} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                        ))}
                        <polygon points={`${CPAD},${CH-CPAD} ${chartData12.map((d,i)=>`${CPAD+i*cxStep},${cyOf(d.ing)}`).join(' ')} ${CPAD+11*cxStep},${CH-CPAD}`} fill="rgba(52,211,153,0.06)"/>
                        <polygon points={`${CPAD},${CH-CPAD} ${chartData12.map((d,i)=>`${CPAD+i*cxStep},${cyOf(d.egr)}`).join(' ')} ${CPAD+11*cxStep},${CH-CPAD}`} fill="rgba(249,115,22,0.06)"/>
                        <polyline points={chartData12.map((d,i)=>`${CPAD+i*cxStep},${cyOf(d.ing)}`).join(' ')} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
                        <polyline points={chartData12.map((d,i)=>`${CPAD+i*cxStep},${cyOf(d.egr)}`).join(' ')} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
                        {chartData12.map((d,i)=>(
                          <g key={i}>
                            {d.ing>0&&<circle cx={CPAD+i*cxStep} cy={cyOf(d.ing)} r="3.5" fill="#34d399"/>}
                            {d.egr>0&&<circle cx={CPAD+i*cxStep} cy={cyOf(d.egr)} r="3.5" fill="#f97316"/>}
                          </g>
                        ))}
                        {chartData12.map((d,i)=>(
                          <text key={d.label} x={CPAD+i*cxStep} y={CH+14} textAnchor="middle" fill="rgba(148,163,184,0.6)" fontSize="8" fontWeight="700" fontFamily="sans-serif">{d.label}</text>
                        ))}
                      </svg>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Contratos activos */}
                      <div className="glass-panel p-8 rounded-[2rem] border border-white/5">
                        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-5">Contratos Activos</h4>
                        <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                          {contsActivos.map(c=>{
                            const prop=propiedades.find(p=>p.id===c.propiedadId);
                            const cli=clientes.find(cl=>cl.id===c.clienteId);
                            const nomInq = cli ? (cli.nombre || 'Sin nombre') : 'Sin inquilino';
                            const edif = prop?.nombre?.toUpperCase().startsWith('VO') ? 'VO 2789' : prop?.nombre?.toUpperCase().startsWith('MO') ? 'MO 2325' : '-';
                            return (
                              <div key={c.id} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                                <div>
                                  <p className="text-[9px] font-black text-white">{nomInq}</p>
                                  <p className="text-[8px] text-slate-500">{prop?.nombre||'-'} · {edif}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[9px] font-black text-emerald-400">$ {(c.montoAlquiler||0).toLocaleString()}</p>
                                  <p className="text-[8px] text-slate-600">{c.fechaFin||'Sin fecha'}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Distribución socios VO */}
                      <div className="glass-panel p-8 rounded-[2rem] border border-white/5">
                        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-5">Distribución Socios — VO</h4>
                        <div className="space-y-3 mb-5 text-[9px]">
                          <div className="flex justify-between"><span className="text-slate-400">Balance caja VO</span><span className="font-black text-white">$ {cajaVO.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Fondo reserva (2 meses)</span><span className="font-black text-amber-400">- $ {fondoReserva.toLocaleString()}</span></div>
                          <div className="flex justify-between border-t border-white/10 pt-3"><span className="font-black text-white">Utilidad distribuible</span><span className="font-black text-emerald-400">$ {utilidadDistribuible.toLocaleString()}</span></div>
                        </div>
                        <div className="space-y-2">
                          {SOCIOS.map(s=>(
                            <div key={s} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                              <span className="text-[9px] font-black text-white uppercase">{s}</span>
                              <span className="text-sm font-black text-emerald-400">$ {Math.round(porSocio).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[8px] text-slate-600 mt-4 font-bold">* Egr. prom. mensual: $ {Math.round(egrsPromMensual).toLocaleString()} (últimos {ultimos3.length} meses)</p>
                      </div>
                    </div>

                    {/* Sin contrato */}
                    {propSinContrato.length > 0 && (
                      <div>
                        <h4 className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <AlertTriangle size={12}/> Propiedades sin contrato ({propSinContrato.length})
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {propSinContrato.map(p=>(
                            <div key={p.id} className="glass-panel p-4 rounded-xl border border-rose-500/15">
                              <p className="text-[9px] font-black text-white uppercase">{p.nombre||p.codigo}</p>
                              <p className="text-[8px] text-slate-500 mt-1">{p.nombre?.toUpperCase().startsWith('VO') ? 'VO 2789' : p.nombre?.toUpperCase().startsWith('MO') ? 'MO 2325' : '-'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* â•â•â•â•â•â• LIQUIDACIÃ“N â•â•â•â•â•â• */}
                {alqView === 'liquidacion' && (
                  <div className="space-y-8">
                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex items-center gap-3 glass-panel px-6 py-3 rounded-2xl">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Período</label>
                        <select value={liquidacionMes} onChange={e=>setLiquidacionMes(e.target.value)}
                          className="bg-transparent text-white font-black text-sm outline-none">
                          {Array.from({length:12},(_,i)=>`${String(i+1).padStart(2,'0')}`).map(m=>(
                            <option key={m} value={m} className="bg-slate-900">Mes {m}</option>
                          ))}
                        </select>
                        <select value={liquidacionAnio} onChange={e=>setLiquidacionAnio(e.target.value)}
                          className="bg-transparent text-white font-black text-sm outline-none">
                          {[2023,2024,2025,2026].map(y=>(
                            <option key={y} value={y} className="bg-slate-900">{y}</option>
                          ))}
                        </select>
                      </div>
                      <div className="ml-2">
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Total gastos VO</p>
                        <p className="text-xl font-black text-rose-400">$ {totalGastosLiquid.toLocaleString()}</p>
                      </div>
                      <button onClick={generarPDFLiquidacion}
                        className="ml-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-2xl shadow-blue-900/30 flex items-center gap-2">
                        <FileText size={14}/> Generar PDF
                      </button>
                    </div>

                    {/* Gastos del mes */}
                    <div className="glass-panel p-8 rounded-2xl border border-white/5">
                      <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-5">Gastos del edificio — {liquidacionMes}/{liquidacionAnio}</h4>
                      <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1">
                        {egrsVOLiquid.length === 0 ? (
                          <p className="text-sm text-slate-500 font-bold italic">No hay egresos registrados para este período.</p>
                        ) : egrsVOLiquid.map((m,i) => (
                          <div key={i} className="flex justify-between items-center py-3 px-2 border-b border-white/5 last:border-0">
                            <div>
                              <p className="text-[9px] font-black text-white">{m.concepto||'-'}</p>
                              <p className="text-[8px] text-slate-500">{m.fecha} · {proveedores.find(p=>p.id===m.proveedorId)?.nombre||'Sin proveedor'}</p>
                            </div>
                            <p className="text-sm font-black text-rose-400">$ {m.monto?.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tabla por unidad */}
                    <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
                      <div className="px-6 py-4 border-b border-white/5">
                        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Liquidación por Unidad</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[9px]">
                          <thead>
                            <tr className="border-b border-white/5">
                              <th className="text-left px-5 py-3 font-black text-slate-500 uppercase tracking-widest">Unidad</th>
                              <th className="text-left px-5 py-3 font-black text-slate-500 uppercase tracking-widest">Inquilino</th>
                              <th className="text-right px-5 py-3 font-black text-slate-500 uppercase tracking-widest">%</th>
                              <th className="text-right px-5 py-3 font-black text-slate-500 uppercase tracking-widest">Monto</th>
                              <th className="text-center px-5 py-3 font-black text-slate-500 uppercase tracking-widest">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(VO_PORCENTAJES).map(([unidad, pct]) => {
                              const monto = totalGastosLiquid * pct / 100;
                              const prop = propiedades.find(p=>p.nombre===unidad||p.codigo===unidad);
                              const cont = prop ? contsActivos.find(c=>c.propiedadId===prop.id) : null;
                              const cli = cont ? clientes.find(cl=>cl.id===cont.clienteId) : null;
                              const inquilino = cli ? (cli.nombre || 'Sin nombre') : '-';
                              const tienesPago = movsAlq.some(m=>m.propiedadId===prop?.id&&normalizeYearMonth(m.fecha)===liquidPeriodo&&m.tipo==='Ingreso');
                              return (
                                <tr key={unidad} className="border-b border-white/5 hover:bg-white/[0.02]">
                                  <td className="px-5 py-3 font-black text-white">{unidad}</td>
                                  <td className="px-5 py-3 text-slate-400">{inquilino}</td>
                                  <td className="px-5 py-3 text-right text-slate-400">{pct}%</td>
                                  <td className="px-5 py-3 text-right font-black text-white">$ {monto.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                                  <td className="px-5 py-3 text-center">
                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${tienesPago?'bg-emerald-500/20 text-emerald-400':'bg-rose-500/20 text-rose-400'}`}>
                                      {tienesPago ? 'Pago' : 'Sin pago'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                            <tr className="border-t-2 border-white/10 bg-white/3">
                              <td colSpan="3" className="px-5 py-3 font-black text-white uppercase">Total</td>
                              <td className="px-5 py-3 text-right font-black text-white">$ {totalGastosLiquid.toLocaleString()}</td>
                              <td></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* â•â•â•â•â•â• RENTABILIDAD VO vs MO â•â•â•â•â•â• */}
                {alqView === 'rentabilidad' && (() => {
                  // Filtro de período
                  const hoyR = new Date();
                  const filtrarPorPeriodo = (movs) => {
                    if (rentPeriodo === 0) return movs;
                    const desde = new Date(hoyR.getFullYear(), hoyR.getMonth() - rentPeriodo, 1);
                    return movs.filter(m => new Date(m.fecha) >= desde);
                  };
                  const movsVOFilt = filtrarPorPeriodo(movsVO);
                  const movsMOFilt = filtrarPorPeriodo(movsMO);
                  const ingVO = movsVOFilt.filter(m=>m.tipo==='Ingreso').reduce((a,m)=>a+convertToUSD(m.monto,m.moneda,m.cotizacionHistorica||m.tipoCambioReferencia),0);
                  const egrVO = movsVOFilt.filter(m=>m.tipo==='Egreso').reduce((a,m)=>a+convertToUSD(m.monto,m.moneda,m.cotizacionHistorica||m.tipoCambioReferencia),0);
                  const ingMO = movsMOFilt.filter(m=>m.tipo==='Ingreso').reduce((a,m)=>a+convertToUSD(m.monto,m.moneda,m.cotizacionHistorica||m.tipoCambioReferencia),0);
                  const egrMO = movsMOFilt.filter(m=>m.tipo==='Egreso').reduce((a,m)=>a+convertToUSD(m.monto,m.moneda,m.cotizacionHistorica||m.tipoCambioReferencia),0);
                  const balVO = ingVO - egrVO;
                  const balMO = ingMO - egrMO;
                  const propsVO = propiedades.filter(p=>!p.esCentroCostos && p.nombre?.toUpperCase().startsWith('VO'));
                  const propsMO = propiedades.filter(p=>!p.esCentroCostos && p.nombre?.toUpperCase().startsWith('MO'));
                  const contsVO = contsActivos.filter(c=>{ const p=propiedades.find(pp=>pp.id===c.propiedadId); return p?.nombre?.toUpperCase().startsWith('VO'); });
                  const contsMO = contsActivos.filter(c=>{ const p=propiedades.find(pp=>pp.id===c.propiedadId); return p?.nombre?.toUpperCase().startsWith('MO'); });
                  const activosVO = propsVO.reduce((a,p)=>a+(Number(p.valorActualUSD)||0),0);
                  const activosMO = propsMO.reduce((a,p)=>a+(Number(p.valorActualUSD)||0),0);

                  const EdifCard = ({nombre, dir, ing, egr, bal, activos, ocu, total}) => (
                    <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 flex-1">
                      <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1">{nombre}</h3>
                      <p className="text-[9px] text-slate-500 mb-6 font-bold">{dir}</p>
                      <div className="space-y-3">
                        {[['Ingresos', ing, 'text-emerald-400'], ['Egresos', egr, 'text-rose-400'], ['Balance Neto', bal, bal>=0?'text-emerald-400':'text-rose-400']].map(([l,v,c])=>(
                          <div key={l} className={`flex justify-between items-center ${l==='Balance Neto'?'border-t border-white/10 pt-3':''}`}>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{l}</span>
                            <span className={`text-sm font-black ${c}`}>u$d {Math.round(v).toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="border-t border-white/5 pt-3 space-y-2">
                          <div className="flex justify-between"><span className="text-[9px] text-slate-500 font-black uppercase">Ocupación</span><span className="text-[10px] font-black text-white">{ocu}/{total} ({total>0?Math.round(ocu/total*100):0}%)</span></div>
                          <div className="flex justify-between"><span className="text-[9px] text-slate-500 font-black uppercase">Activos (USD)</span><span className="text-[10px] font-black text-white">u$d {activos.toLocaleString()}</span></div>
                          {activos>0 && <div className="flex justify-between"><span className="text-[9px] text-slate-500 font-black uppercase">ROI Anual</span><span className={`text-[10px] font-black ${bal>=0?'text-emerald-400':'text-rose-400'}`}>{((bal/activos)*100).toFixed(1)}%</span></div>}
                          {ing>0 && <div className="flex justify-between"><span className="text-[9px] text-slate-500 font-black uppercase">Margen</span><span className={`text-[10px] font-black ${bal>=0?'text-emerald-400':'text-rose-400'}`}>{((bal/ing)*100).toFixed(1)}%</span></div>}
                        </div>
                      </div>
                    </div>
                  );

                  const periodoLabel = rentPeriodo === 0 ? 'Histórico total' : ('Últimos ' + rentPeriodo + ' meses');

                  return (
                    <div className="space-y-8">
                      <div className="flex justify-end gap-2 mb-2">
                        {[{v:6,l:'6 meses'},{v:12,l:'12 meses'},{v:0,l:'Todo'}].map(({v,l}) => (
                          <button key={v} onClick={() => setRentPeriodo(v)}
                            className={`px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${rentPeriodo===v?'bg-white text-slate-900':'bg-white/5 text-slate-500 hover:text-white'}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                      <p className="text-[8px] text-slate-600 font-bold text-right">Período: {periodoLabel}</p>
                      <div className="flex gap-8">
                        <EdifCard nombre="Vuelta de Obligado 2789" dir="VO · Expensas + Alquileres" ing={ingVO} egr={egrVO} bal={balVO} activos={activosVO} ocu={contsVO.length} total={propsVO.length} />
                        <EdifCard nombre="Monroe 2325" dir="MO · Alquileres Directos" ing={ingMO} egr={egrMO} bal={balMO} activos={activosMO} ocu={contsMO.length} total={propsMO.length} />
                      </div>
                      <div className="glass-panel p-6 rounded-2xl border border-white/5">
                        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Resumen Consolidado</h4>
                        <div className="grid grid-cols-4 gap-6">
                          <div><p className="text-[8px] text-slate-500 uppercase font-black">Ingresos Totales</p><p className="text-lg font-black text-emerald-400">u$d {Math.round(ingVO+ingMO).toLocaleString()}</p></div>
                          <div><p className="text-[8px] text-slate-500 uppercase font-black">Egresos Totales</p><p className="text-lg font-black text-rose-400">u$d {Math.round(egrVO+egrMO).toLocaleString()}</p></div>
                          <div><p className="text-[8px] text-slate-500 uppercase font-black">Balance Global</p><p className={`text-lg font-black ${(balVO+balMO)>=0?'text-emerald-400':'text-rose-400'}`}>u$d {Math.round(balVO+balMO).toLocaleString()}</p></div>
                          <div><p className="text-[8px] text-slate-500 uppercase font-black">Activos Totales</p><p className="text-lg font-black text-white">u$d {(activosVO+activosMO).toLocaleString()}</p></div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* â•â•â•â•â•â• BALANCE MO â•â•â•â•â•â• */}
                {alqView === 'balanceMO' && (() => {
                  // Propiedades MO (sin centros de costos)
                  const propsMO = propiedades.filter(p => !p.esCentroCostos && p.nombre?.toUpperCase().startsWith('MO') && !['MO GENERAL','GENERAL MO'].includes(p.nombre?.toUpperCase()));
                  
                  // Ingresos por propiedad MO
                  const ingPorProp = propsMO.map(p => {
                    const ingTotal = movsMO.filter(m => m.tipo === 'Ingreso' && m.propiedadId === p.id).reduce((a,m) => a + (Number(m.monto)||0), 0);
                    return { ...p, ingTotal };
                  });
                  const totalIngMO = ingPorProp.reduce((a,p) => a + p.ingTotal, 0);
                  
                  // Egresos totales MO (centro de costos MO General)
                  const egrTotalMO = movsMO.filter(m => m.tipo === 'Egreso').reduce((a,m) => a + (Number(m.monto)||0), 0);
                  
                  // Porcentuales calculados por proporción de alquiler
                  const propsMOConBalance = ingPorProp.map(p => {
                    const peso = totalIngMO > 0 ? (p.ingTotal / totalIngMO * 100) : 0;
                    const egrProrrateado = egrTotalMO * peso / 100;
                    const balance = p.ingTotal - egrProrrateado;
                    const cont = contsActivos.find(c => c.propiedadId === p.id);
                    const cli = cont ? clientes.find(cl => cl.id === cont.clienteId) : null;
                    const inquilino = cli ? (cli.nombre || 'Sin nombre') : 'Vacante';
                    return { ...p, peso, egrProrrateado, balance, inquilino };
                  }).sort((a,b) => b.peso - a.peso);

                  return (
                    <div className="space-y-8">
                      <div className="glass-panel p-6 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center mb-6">
                          <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Monroe 2325 — Balance por Unidad</h4>
                          <div className="flex gap-6 text-[9px]">
                            <span className="font-black text-emerald-400">Ing Total: $ {totalIngMO.toLocaleString()}</span>
                            <span className="font-black text-rose-400">Egr Total: $ {egrTotalMO.toLocaleString()}</span>
                            <span className={`font-black ${(totalIngMO-egrTotalMO)>=0?'text-emerald-400':'text-rose-400'}`}>Balance: $ {(totalIngMO-egrTotalMO).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[9px]">
                            <thead>
                              <tr className="border-b border-white/5">
                                <th className="text-left px-4 py-3 font-black text-slate-500 uppercase tracking-widest">Unidad</th>
                                <th className="text-left px-4 py-3 font-black text-slate-500 uppercase tracking-widest">Inquilino</th>
                                <th className="text-right px-4 py-3 font-black text-slate-500 uppercase tracking-widest">Ingreso</th>
                                <th className="text-right px-4 py-3 font-black text-slate-500 uppercase tracking-widest">Peso %</th>
                                <th className="text-right px-4 py-3 font-black text-slate-500 uppercase tracking-widest">Egr. Prorrateado</th>
                                <th className="text-right px-4 py-3 font-black text-slate-500 uppercase tracking-widest">Balance</th>
                              </tr>
                            </thead>
                            <tbody>
                              {propsMOConBalance.map(p => (
                                <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                  <td className="px-4 py-3 font-black text-white">{p.nombre}</td>
                                  <td className="px-4 py-3 text-slate-400">{p.inquilino}</td>
                                  <td className="px-4 py-3 text-right font-black text-emerald-400">$ {p.ingTotal.toLocaleString()}</td>
                                  <td className="px-4 py-3 text-right text-slate-400">{p.peso.toFixed(1)}%</td>
                                  <td className="px-4 py-3 text-right font-black text-rose-400">$ {Math.round(p.egrProrrateado).toLocaleString()}</td>
                                  <td className={`px-4 py-3 text-right font-black ${p.balance>=0?'text-emerald-400':'text-rose-400'}`}>$ {Math.round(p.balance).toLocaleString()}</td>
                                </tr>
                              ))}
                              <tr className="border-t-2 border-white/10 bg-white/3">
                                <td colSpan="2" className="px-4 py-3 font-black text-white uppercase">Total</td>
                                <td className="px-4 py-3 text-right font-black text-emerald-400">$ {totalIngMO.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right text-white font-black">100%</td>
                                <td className="px-4 py-3 text-right font-black text-rose-400">$ {egrTotalMO.toLocaleString()}</td>
                                <td className={`px-4 py-3 text-right font-black ${(totalIngMO-egrTotalMO)>=0?'text-emerald-400':'text-rose-400'}`}>$ {(totalIngMO-egrTotalMO).toLocaleString()}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <p className="text-[8px] text-slate-600 font-bold italic px-2">* Los porcentuales de cada unidad se calculan automáticamente en base a la proporción de su alquiler sobre el total de ingresos del edificio. Los egresos de "MO General" se prorratean según dicho peso.</p>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {activeTab === 'Resumen' && (() => {
            const anoActual = new Date().getFullYear();
            // Balances anuales por área en USD
            const balanceArea = (area) => movimientos
              .filter(m => m.area === area && normalizeYearMonth(m.fecha).startsWith(String(anoActual)))
              .reduce((acc, m) => acc + (m.tipo === 'Ingreso' ? convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia) : -convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia)), 0);
            const balObras = balanceArea('Obras');
            const balAlq = balanceArea('Alquileres');
            const balOficina = balanceArea('Oficina');

            // Saldos de caja en USD usando stats
            const cajasDisplay = [
              { label: 'Caja Dólares', key: 'Caja Dólares', color: 'text-yellow-400', icon: '💵' },
              { label: 'Caja Pesos', key: 'Caja Pesos', color: 'text-slate-300', icon: '💰' },
              { label: 'Banco Amecon', key: 'Banco Amecon', color: 'text-blue-400', icon: '🏦' },
              { label: 'Banco Blue', key: 'Banco Blue', color: 'text-sky-400', icon: '🔵' },
              { label: 'MP Amecon', key: 'MP Amecon', color: 'text-emerald-400', icon: '📱' },
              { label: 'MP Blue', key: 'MP Blue', color: 'text-teal-400', icon: '📱' },
            ];

            // Cash flow viernes
            const cashFlowViernes = stats.cashFlowEstimadoARS;
            const proximoViernes = stats.proximoViernes;

            return (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Hero: Cash Flow + CTA */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Cash Flow gran tarjeta */}
                  <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 via-indigo-700 to-violet-800 p-6 rounded-[2rem] shadow-2xl shadow-blue-900/40 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none"/>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"/>
                    <p className="text-[9px] font-black text-blue-200/80 uppercase tracking-[0.4em] mb-1">Próximo Viernes · {proximoViernes}</p>
                    <h3 className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-3">Cash Flow Estimado</h3>
                    <p className="text-3xl font-black text-white tracking-tighter">
                      $ {cashFlowViernes.toLocaleString(undefined, {maximumFractionDigits: 0})}
                    </p>
                    <p className="text-[9px] font-black text-blue-200/60 uppercase tracking-widest mt-2">Promedio semanal · últimos 6 meses</p>
                  </div>

                  {/* CTA Botón */}
                  <div className="flex flex-col justify-center items-center glass-panel rounded-[2rem] p-6 border border-white/5 gap-4">
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Registrar</p>
                      <p className="text-sm font-black text-white">Nuevo Movimiento</p>
                    </div>
                    <button
                      onClick={() => setIsModalMovOpen(true)}
                      className="w-16 h-16 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-900/40 hover:scale-110 transition-all duration-300"
                    >
                      <Plus size={28} strokeWidth={3} />
                    </button>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Importar desde planilla</p>
                    <div className="flex gap-2">
                      {[{label:'Obras', open: ()=>setIsImportarObrasOpen(true)},
                        {label:'Alquileres', open: ()=>setIsImportarAlquileresOpen(true)},
                        {label:'Oficina', open: ()=>setIsImportarOficinaOpen(true)},
                      ].map(btn => (
                        <button key={btn.label} onClick={btn.open}
                          className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-xl text-[8px] font-black text-white uppercase tracking-widest hover:bg-white/20 transition-all">
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Balances Anuales por Área */}
                <div>
                  <h4 className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] mb-4">Balance del Año {anoActual} — En USD</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {[
                      { label: 'Obras', val: balObras, gradient: 'from-orange-600 to-red-700', shadow: 'shadow-orange-900/30', icon: <HardHat size={18}/> },
                      { label: 'Alquileres', val: balAlq, gradient: 'from-blue-600 to-indigo-700', shadow: 'shadow-blue-900/30', icon: <Building2 size={18}/> },
                      { label: 'Oficina', val: balOficina, gradient: 'from-emerald-600 to-teal-700', shadow: 'shadow-emerald-900/30', icon: <Briefcase size={18}/> },
                    ].map(card => (
                      <div key={card.label} className={`bg-gradient-to-br ${card.gradient} p-5 rounded-2xl shadow-xl ${card.shadow} relative overflow-hidden`}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 bg-white/15 rounded-xl flex items-center justify-center text-white">{card.icon}</div>
                          <p className="text-[8px] font-black text-white/70 uppercase tracking-[0.3em]">{card.label}</p>
                        </div>
                        <p className={`text-xl font-black tracking-tighter ${card.val >= 0 ? 'text-white' : 'text-rose-200'}`}>
                          u$d {card.val.toLocaleString(undefined, {maximumFractionDigits: 0})}
                        </p>
                        <p className="text-[7px] font-black text-white/40 uppercase tracking-widest mt-1">{card.val >= 0 ? 'Superávit' : 'Déficit'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Saldos de Caja */}
                <div>
                  <h4 className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] mb-4">Saldos de Caja</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {cajasDisplay.map(c => {
                      const isUSD = c.key === 'Caja Dólares';
                      const valUSD = movimientos.filter(m => m.caja === c.key).reduce((acc, m) => acc + (m.tipo === 'Ingreso' ? convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia) : -convertToUSD(m.monto, m.moneda, m.cotizacionHistorica||m.tipoCambioReferencia)), 0);
                      // Para no-USD, convertir a ARS usando cotizacionBlue
                      const valARS = movimientos.filter(m => m.caja === c.key).reduce((acc, m) => {
                        const monto = Number(m.monto) || 0;
                        const montoARS = m.moneda === 'USD' ? monto * (Number(m.cotizacionHistorica || m.tipoCambioReferencia) || cotizacionBlue) : monto;
                        return acc + (m.tipo === 'Ingreso' ? montoARS : -montoARS);
                      }, 0);
                      const displayVal = isUSD ? valUSD : valARS;
                      const displaySymbol = isUSD ? 'u$d' : '$';
                      return (
                        <div key={c.key} className="glass-panel p-5 rounded-[1.5rem] border border-white/5 flex flex-col gap-2">
                          <span className="text-xl">{c.icon}</span>
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-tight">{c.label}</p>
                          <p className={`text-sm font-black ${displayVal >= 0 ? c.color : 'text-rose-400'}`}>
                            {displaySymbol} {displayVal.toLocaleString(undefined, {maximumFractionDigits: 0})}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {activeTab === 'Finanzas' && (
            <div className="space-y-8">
                {/* Selector de Área */}
                <div className="flex gap-2 p-1 bg-slate-200/50 rounded-2xl w-fit overflow-x-auto">
                    <button 
                        onClick={() => {
                           setFinanzasAreaSeleccionada('General');
                           setFinanzasSubNivel('Edificios');
                        }}
                        className={`px-6 py-3 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${finanzasAreaSeleccionada === 'General' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Vista General
                    </button>
                    {areas.map(area => (
                        <button 
                            key={area}
                            onClick={() => {
                               setFinanzasAreaSeleccionada(area);
                               setFinanzasSubNivel('Principal');
                               setEdificioSeleccionado(null);
                               setFinanzasItemSeleccionado(null);
                            }}
                            className={`px-6 py-3 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${finanzasAreaSeleccionada === area ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            {area}
                        </button>
                    ))}
                </div>

                {finanzasAreaSeleccionada === 'General' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     {/* Cuadro Dominante de Share de Área */}
                     <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-8">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                            <PieChart size={20} />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-slate-900">Distribución de Saldos</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase mt-1 tracking-widest">Aportación al Flujo Neto Disp.</p>
                          </div>
                        </div>

                        <div className="space-y-6">
                           {areas.map(a => {
                               const valStr = stats.areaSaldosEquiv[a] || 0;
                               const share = stats.areaShares[a] || 0;
                               
                               let colorBase = 'bg-slate-500'; let colorL = 'text-slate-700';
                               if(a==='Obras') {colorBase='bg-orange-500'; colorL='text-orange-700';}
                               if(a==='Alquileres') {colorBase='bg-blue-500'; colorL='text-blue-700';}
                               if(a==='Oficina') {colorBase='bg-emerald-500'; colorL='text-emerald-700';}
                               if(a==='Directorio') {colorBase='bg-indigo-500'; colorL='text-indigo-700';}

                               return (
                                 <div key={a} className="relative">
                                     <div className="flex justify-between items-end mb-2">
                                       <span className={`text-sm font-black uppercase ${colorL}`}>{a}</span>
                                       <div className="text-right">
                                          <span className="text-xs font-black text-slate-400 mr-2 md:inline hidden">u$d {valStr.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                                          <span className="text-sm font-black text-slate-800">{share.toFixed(1)}%</span>
                                       </div>
                                     </div>
                                     <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
                                       <div className={`${colorBase} h-full rounded-full transition-all duration-1000`} style={{ width: `${share}%` }}></div>
                                     </div>
                                 </div>
                               );
                           })}
                        </div>
                     </div>
                  </div>
                )}

                {finanzasAreaSeleccionada !== 'General' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Bloque ARS Área */}
                    <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Banknote size={14}/> {finanzasAreaSeleccionada} - Filtro ARS
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard title="Ingresos" val={statsFinanzasArea.agrupar.ars.ingresos} color="text-emerald-600" bg="bg-emerald-50" symbol="$" />
                        <StatCard title="Egresos" val={statsFinanzasArea.agrupar.ars.egresos} color="text-rose-600" bg="bg-rose-50" symbol="$" />
                        <StatCard title="Balance" val={statsFinanzasArea.agrupar.ars.ingresos - statsFinanzasArea.agrupar.ars.egresos} color="text-slate-800" bg="bg-slate-100" symbol="$" />
                    </div>
                    </div>
                    {/* Bloque USD Área */}
                    <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Coins size={14}/> {finanzasAreaSeleccionada} - Filtro USD
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard title="Ingresos" val={statsFinanzasArea.agrupar.usd.ingresos} color="text-emerald-600" bg="bg-emerald-50" symbol="u$d" />
                        <StatCard title="Egresos" val={statsFinanzasArea.agrupar.usd.egresos} color="text-rose-600" bg="bg-rose-50" symbol="u$d" />
                        <StatCard title="Balance" val={statsFinanzasArea.agrupar.usd.ingresos - statsFinanzasArea.agrupar.usd.egresos} color="text-blue-700" bg="bg-blue-50" symbol="u$d" />
                    </div>
                    </div>
                </div>
                )}

                {finanzasAreaSeleccionada === 'Alquileres' && (
                  <div className="space-y-6">
                      {finanzasSubNivel === 'Principal' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <button onClick={() => { setEdificioSeleccionado('MO'); setFinanzasSubNivel('Detalle'); }} className="text-left bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><Building2 size={24} /></div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 italic">MO - Monroe 2325</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Consolidado Edificio</p>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all"><Plus size={20} /></div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div><span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Ingresos</span><span className="text-sm font-black text-emerald-600">$ {statsFinanzasArea.agrupar.edificios.MO.ingresos.toLocaleString()}</span></div>
                                    <div><span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Egresos</span><span className="text-sm font-black text-rose-600">$ {statsFinanzasArea.agrupar.edificios.MO.egresos.toLocaleString()}</span></div>
                                    <div className="text-right"><span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Saldo Neto</span><span className={`text-sm font-black ${(statsFinanzasArea.agrupar.edificios.MO.ingresos - statsFinanzasArea.agrupar.edificios.MO.egresos) >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>$ ${(statsFinanzasArea.agrupar.edificios.MO.ingresos - statsFinanzasArea.agrupar.edificios.MO.egresos).toLocaleString()}</span></div>
                                </div>
                            </button>
                            <button onClick={() => { setEdificioSeleccionado('VO'); setFinanzasSubNivel('Detalle'); }} className="text-left bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><Building2 size={24} /></div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 italic">VO - V. de Obligado</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Consolidado Edificio</p>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all"><Plus size={20} /></div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div><span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Ingresos</span><span className="text-sm font-black text-emerald-600">$ {statsFinanzasArea.agrupar.edificios.VO.ingresos.toLocaleString()}</span></div>
                                    <div><span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Egresos</span><span className="text-sm font-black text-rose-600">$ {statsFinanzasArea.agrupar.edificios.VO.egresos.toLocaleString()}</span></div>
                                    <div className="text-right"><span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Saldo Neto</span><span className={`text-sm font-black ${(statsFinanzasArea.agrupar.edificios.VO.ingresos - statsFinanzasArea.agrupar.edificios.VO.egresos) >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>$ ${(statsFinanzasArea.agrupar.edificios.VO.ingresos - statsFinanzasArea.agrupar.edificios.VO.egresos).toLocaleString()}</span></div>
                                </div>
                            </button>
                        </div>
                      ) : (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                             <div className="flex items-center justify-between bg-slate-100/50 p-4 rounded-2xl border border-slate-200">
                                <div className="flex items-center gap-3">
                                   <button onClick={() => setFinanzasSubNivel('Principal')} className="p-2 hover:bg-white rounded-lg transition-all text-slate-600"><TrendingUp size={16} className="-rotate-90" /></button>
                                   <h3 className="font-black text-slate-800 uppercase tracking-tighter italic">Desglose {edificioSeleccionado}</h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] font-black text-slate-400 uppercase">Balance Edificio</p>
                                    <p className="font-black text-blue-600">$ {(statsFinanzasArea.agrupar.edificios[edificioSeleccionado].ingresos - statsFinanzasArea.agrupar.edificios[edificioSeleccionado].egresos).toLocaleString()}</p>
                                </div>
                             </div>
                        </div>
                      )}
                  </div>
                )}

                {finanzasAreaSeleccionada === 'Obras' && (
                  <div className="space-y-6">
                      {finanzasSubNivel === 'Principal' ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {obras.length > 0 ? obras.map(obra => {
                                const data = statsFinanzasArea.agrupar.obras[obra.id] || { ingresos: 0, egresos: 0 };
                                if (data.ingresos === 0 && data.egresos === 0) return null;
                                return (
                                    <button key={obra.id} onClick={() => { setFinanzasItemSeleccionado(obra.id); setFinanzasSubNivel('Detalle'); }} className="text-left bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center font-black italic">{obra.nombre.substring(0,2).toUpperCase()}</div>
                                            <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-orange-600 group-hover:text-white transition-all"><Plus size={14} /></div>
                                        </div>
                                        <h3 className="text-base font-black text-slate-900 mb-4">{obra.nombre}</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase"><span>Flujo Neto</span><span className={`font-black ${(data.ingresos - data.egresos) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>$ {(data.ingresos - data.egresos).toLocaleString(undefined, {maximumFractionDigits:0})}</span></div>
                                            <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden leading-[0]">
                                                <div className="bg-orange-400 h-full rounded-full" style={{ width: '40%' }}></div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            }) : <p className="col-span-3 text-center text-slate-400 font-bold py-10">No hay movimientos en Obras.</p>}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-slate-100/50 p-4 rounded-2xl border border-slate-200 animate-in slide-in-from-right-4">
                           <div className="flex items-center gap-3">
                              <button onClick={() => setFinanzasSubNivel('Principal')} className="p-2 hover:bg-white rounded-lg transition-all text-slate-600"><TrendingUp size={16} className="-rotate-90" /></button>
                              <h3 className="font-black text-slate-800 uppercase tracking-tighter italic">Desglose Obra: {obras.find(o => o.id === finanzasItemSeleccionado)?.nombre}</h3>
                           </div>
                           <div className="text-right">
                               <p className="text-[8px] font-black text-slate-400 uppercase">Balance Obra</p>
                               <p className="font-black text-orange-600">$ {((statsFinanzasArea.agrupar.obras[finanzasItemSeleccionado]?.ingresos || 0) - (statsFinanzasArea.agrupar.obras[finanzasItemSeleccionado]?.egresos || 0)).toLocaleString()}</p>
                           </div>
                        </div>
                      )}
                  </div>
                )}

                {finanzasAreaSeleccionada === 'Directorio' && (
                  <div className="space-y-6">
                      {finanzasSubNivel === 'Principal' ? (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {(Object.keys(statsFinanzasArea.agrupar.directores).length > 0) ? Object.keys(statsFinanzasArea.agrupar.directores).map(dir => {
                                const data = statsFinanzasArea.agrupar.directores[dir] || { ingresos: 0, egresos: 0 };
                                return (
                                    <button key={dir} onClick={() => { setFinanzasItemSeleccionado(dir); setFinanzasSubNivel('Detalle'); }} className="text-left bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="w-10 h-10 bg-violet-50 text-violet-500 rounded-xl flex items-center justify-center font-black italic"><UserCircle size={20}/></div>
                                            <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-violet-600 group-hover:text-white transition-all"><Plus size={14} /></div>
                                        </div>
                                        <h3 className="text-base font-black text-slate-900 mb-1">{dir}</h3>
                                        <p className="text-[10px] font-black text-rose-500 uppercase">Retiros Acum.</p>
                                        <p className="text-lg font-black text-slate-700 mt-2">$ {data.egresos.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                                    </button>
                                );
                            }) : <p className="col-span-4 text-center text-slate-400 font-bold py-10">No hay movimientos en Directorio.</p>}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-slate-100/50 p-4 rounded-2xl border border-slate-200 animate-in slide-in-from-right-4">
                           <div className="flex items-center gap-3">
                              <button onClick={() => setFinanzasSubNivel('Principal')} className="p-2 hover:bg-white rounded-lg transition-all text-slate-600"><TrendingUp size={16} className="-rotate-90" /></button>
                              <h3 className="font-black text-slate-800 uppercase tracking-tighter italic">Desglose Director: {finanzasItemSeleccionado}</h3>
                           </div>
                           <div className="text-right">
                               <p className="text-[8px] font-black text-slate-400 uppercase">Balance Neto</p>
                               <p className="font-black text-violet-600">$ {((statsFinanzasArea.agrupar.directores[finanzasItemSeleccionado]?.ingresos || 0) - (statsFinanzasArea.agrupar.directores[finanzasItemSeleccionado]?.egresos || 0)).toLocaleString()}</p>
                           </div>
                        </div>
                      )}
                  </div>
                )}

                {finanzasAreaSeleccionada === 'Oficina' && (
                  <div className="space-y-6">
                      {finanzasSubNivel === 'Principal' ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {Object.keys(statsFinanzasArea.agrupar.oficinaCategorias).map(cat => {
                                const data = statsFinanzasArea.agrupar.oficinaCategorias[cat] || { ingresos: 0, egresos: 0 };
                                return (
                                    <button key={cat} onClick={() => { setFinanzasItemSeleccionado(cat); setFinanzasSubNivel('Detalle'); }} className="text-left bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-lg transition-all group">
                                        <div className="text-[9px] font-black text-slate-400 uppercase mb-2 truncate">{cat}</div>
                                        <div className="text-sm font-black text-slate-800">$ {data.egresos.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                                        <div className="w-full bg-slate-50 h-1 rounded-full mt-2 overflow-hidden"><div className="bg-emerald-400 h-full w-1/2"></div></div>
                                    </button>
                                );
                            })}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-slate-100/50 p-4 rounded-2xl border border-slate-200 animate-in slide-in-from-right-4">
                           <div className="flex items-center gap-3">
                              <button onClick={() => setFinanzasSubNivel('Principal')} className="p-2 hover:bg-white rounded-lg transition-all text-slate-600"><TrendingUp size={16} className="-rotate-90" /></button>
                              <h3 className="font-black text-slate-800 uppercase tracking-tighter italic">Detalle Oficina: {finanzasItemSeleccionado}</h3>
                           </div>
                           <div className="text-right">
                               <p className="text-[8px] font-black text-slate-400 uppercase">Total Categoría</p>
                               <p className="font-black text-emerald-600">$ {statsFinanzasArea.agrupar.oficinaCategorias[finanzasItemSeleccionado]?.egresos.toLocaleString()}</p>
                           </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Tabla Movimientos Área */}
                {finanzasAreaSeleccionada !== 'General' && (
                  <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-3">
                        <History size={20} className="text-slate-400" />
                        <h3 className="font-black text-slate-800">Registros de {finanzasAreaSeleccionada}</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                            <th className="px-8 py-4">Fecha</th>
                            <th className="px-8 py-4">Rubro</th>
                            <th className="px-8 py-4">Concepto / Referencia</th>
                            <th className="px-8 py-4 text-right">Monto</th>
                            <th className="px-8 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {statsFinanzasArea.movs.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-8 py-4 text-xs font-bold text-slate-400">{m.fecha}</td>
                                <td className="px-8 py-4">
                                    <span className="text-[10px] font-black text-blue-600 block mb-1 uppercase">
                                       {m.area}
                                       {m.area === 'Obras' && m.tipo === 'Ingreso' && <span className="text-slate-400"> - {m.tipoObraIngreso}</span>}
                                       {['Obras', 'Alquileres', 'Oficina'].includes(m.area) && m.tipo === 'Egreso' && <span className="text-slate-400"> - {m.categoriaEgreso || m.tipoObraEgreso || m.tipoAlquilerEgreso || m.tipoOficinaEgreso}</span>}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase italic">{m.caja}</span>
                                </td>
                                <td className="px-8 py-4">
                                <p className="text-sm font-bold text-slate-800">{m.concepto}</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {m.obraId && <span className="text-[9px] text-orange-600 font-bold uppercase bg-orange-50 px-2 rounded">Obra: {obras.find(o => o.id === m.obraId)?.nombre}</span>}
                                    {m.propiedadId && <span className="text-[9px] text-blue-600 font-bold uppercase bg-blue-50 px-2 rounded">Propiedad: {propiedades.find(p => p.id === m.propiedadId)?.nombre}</span>}
                                    {m.proveedorId && <span className="text-[9px] text-indigo-600 font-bold uppercase bg-indigo-50 px-2 rounded">Prov: {proveedores.find(pv => pv.id === m.proveedorId)?.nombre}</span>}
                                    {m.entidadCuenta && <span className="text-[9px] text-cyan-600 font-bold uppercase bg-cyan-50 px-2 rounded">Entidad: {m.entidadCuenta}</span>}
                                    {m.directorId && <span className="text-[9px] text-violet-600 font-bold uppercase bg-violet-50 px-2 rounded flex items-center gap-1"><UserCircle size={8}/> {m.directorId}</span>}
                                </div>
                                </td>
                                <td className={`px-8 py-4 text-right font-black ${m.tipo === 'Ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {m.tipo === 'Ingreso' ? '+' : '-'} {m.moneda === 'USD' ? 'u$d' : '$'} {m.monto.toLocaleString(undefined, {minimumFractionDigits:2})}
                                </td>
                                <td className="px-8 py-4 text-right">
                                    <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'movimientos', m.id))} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 transition-all">
                                    <X size={16}/>
                                    </button>
                                </td>
                            </tr>
                            ))}
                            {statsFinanzasArea.movs.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-8 py-8 text-center text-slate-400 font-bold">No hay movimientos registrados para esta área.</td>
                                </tr>
                            )}
                        </tbody>
                        </table>
                    </div>
                  </div>
                )}
            </div>
          )}

          {activeTab === 'Contratos' && (
             <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <table className="w-full text-left border-collapse text-[10px]">
                 <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-500 uppercase font-black tracking-widest">
                   <tr>
                     <th className="p-2 border-r border-slate-200">Propiedad</th>
                     <th className="p-2 border-r border-slate-200">Inquilino</th>
                     <th className="p-2 border-r border-slate-200 text-center">Inicio</th>
                     <th className="p-2 border-r border-slate-200 text-center">Próx. Act. (Meses)</th>
                     <th className="p-2 border-r border-slate-200 text-center">Vencimiento</th>
                     <th className="p-2 text-center w-10"></th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {contratos.map(c => {
                     const prop = propiedades.find(p => p.id === c.propiedadId);
                     const cli = clientes.find(cl => cl.id === c.clienteId);
                     return (
                       <tr key={c.id} className="hover:bg-amber-50/50 transition-colors font-bold text-slate-700">
                         <td className="p-2 border-r border-slate-100 max-w-[150px] truncate" title={prop ? prop.nombre + ' - ' + prop.direccion : 'Desconocida'}>{prop ? prop.nombre : 'Desconocida'}</td>
                         <td className="p-2 border-r border-slate-100 text-[9px] truncate">{cli ? cli.nombre + ' ' + '' : '-'}</td>
                         <td className="p-1 border-r border-slate-100 text-center">
                            <input defaultValue={c.fechaInicio} type="date" className="bg-transparent outline-none w-full px-1 py-1 hover:bg-white focus:bg-white rounded text-center" onBlur={(e) => {
                               if(e.target.value !== c.fechaInicio) {
                                  const c_obj = calcularFechasContrato(e.target.value, c.periodoActualizacion, c.duracionMeses);
                                  updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'contratos', c.id), {fechaInicio: e.target.value, proximaActualizacion: c_obj.dtProx, fechaFin: c_obj.dtFin});
                               }
                            }} />
                         </td>
                         <td className="p-1 border-r border-slate-100 text-center">
                            <div className="flex items-center gap-1 justify-center relative group-date">
                               <input type="date" defaultValue={c.proximaActualizacion||''} className="bg-transparent outline-none px-1 py-1 hover:bg-white focus:bg-white rounded text-amber-600 font-black w-26 text-center" onBlur={(e) => {if(e.target.value !== c.proximaActualizacion) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'contratos', c.id), {proximaActualizacion: e.target.value})}} />
                               <span className="text-[8px] text-slate-400">({c.periodoActualizacion}m)</span>
                            </div>
                         </td>
                         <td className="p-1 border-r border-slate-100 text-center">
                            <input type="date" defaultValue={c.fechaFin||''} className="bg-transparent outline-none w-full px-1 py-1 hover:bg-white focus:bg-white rounded text-center" onBlur={(e) => {if(e.target.value !== c.fechaFin) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'contratos', c.id), {fechaFin: e.target.value})}} />
                         </td>
                         <td className="p-1 text-center">
                           <button onClick={() => {if(window.confirm('Â¿Borrar contrato?')) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'contratos', c.id))}} className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-1 rounded transition-colors"><X size={12} className="mx-auto" /></button>
                         </td>
                       </tr>
                     );
                   })}
                   {contratos.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-bold">No hay contratos registrados.</td></tr>}
                 </tbody>
               </table>
             </div>
          )}


          {activeTab === 'Proveedores' && (
             <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <table className="w-full text-left border-collapse text-[10px]">
                 <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-500 uppercase font-black tracking-widest">
                   <tr>
                     <th className="p-2 border-r border-slate-200">Razón Social / Proveedor</th>
                     <th className="p-2 border-r border-slate-200 w-24 text-center">Categoría</th>
                     <th className="p-2 border-r border-slate-200 w-32">Rubro / Especialidad</th>
                     <th className="p-2 border-r border-slate-200">Contacto</th>
                     <th className="p-2 border-r border-slate-200">CUIT Fiscal</th>
                     <th className="p-2 border-r border-slate-200">Alias / CBU</th>
                     <th className="p-2 text-center w-10"></th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {proveedores.map(prov => (
                     <tr key={prov.id} className="hover:bg-indigo-50/50 transition-colors font-bold text-slate-700">
                       <td className="p-1 border-r border-slate-100"><input defaultValue={prov.nombre} className="bg-transparent outline-none w-full px-1 py-1 hover:bg-white focus:bg-white rounded" onBlur={(e) => {if(e.target.value !== prov.nombre) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'proveedores', prov.id), {nombre: e.target.value})}} /></td>
                       <td className="p-1 border-r border-slate-100 text-center text-[9px]">
                         <select defaultValue={prov.tipo} className="bg-transparent outline-none w-full px-1 py-1 hover:bg-white focus:bg-white rounded uppercase" onChange={(e) => {if(e.target.value !== prov.tipo) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'proveedores', prov.id), {tipo: e.target.value})}}>
                           <option value="Materiales">Materiales</option>
                           <option value="Mano de Obra">Mano de Obra</option>
                           <option value="Servicios">Servicios</option>
                           <option value="Profesionales">Profesionales</option>
                           <option value="Otros">Otros</option>
                         </select>
                       </td>
                       <td className="p-1 border-r border-slate-100"><input defaultValue={prov.rubro} className="bg-transparent outline-none w-full px-1 py-1 hover:bg-white focus:bg-white rounded" onBlur={(e) => {if(e.target.value !== prov.rubro) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'proveedores', prov.id), {rubro: e.target.value})}} /></td>
                       <td className="p-1 border-r border-slate-100">
                         <div className="flex gap-1 w-full flex-col xl:flex-row">
                             <input placeholder="Tel" defaultValue={prov.telefono} className="bg-transparent outline-none w-full xl:w-1/2 px-1 py-1 hover:bg-white focus:bg-white rounded border-b xl:border-b-0 xl:border-r border-transparent hover:border-slate-200" onBlur={(e) => {if(e.target.value !== prov.telefono) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'proveedores', prov.id), {telefono: e.target.value})}} />
                             <input placeholder="Email" defaultValue={prov.mail} className="bg-transparent outline-none w-full xl:w-1/2 px-1 py-1 hover:bg-white focus:bg-white rounded" onBlur={(e) => {if(e.target.value !== prov.mail) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'proveedores', prov.id), {mail: e.target.value})}} />
                         </div>
                       </td>
                       <td className="p-1 border-r border-slate-100"><input defaultValue={prov.cuit} className="bg-transparent outline-none w-full px-1 py-1 hover:bg-white focus:bg-white rounded font-mono text-[9px]" onBlur={(e) => {if(e.target.value !== prov.cuit) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'proveedores', prov.id), {cuit: e.target.value})}} /></td>
                       <td className="p-1 border-r border-slate-100"><input defaultValue={prov.alias1} className="bg-transparent outline-none w-full px-1 py-1 hover:bg-white focus:bg-white rounded font-mono text-[9px]" onBlur={(e) => {if(e.target.value !== prov.alias1) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'proveedores', prov.id), {alias1: e.target.value})}} /></td>
                       <td className="p-1 text-center">
                         <button onClick={() => {if(window.confirm('Â¿Borrar proveedor?')) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'proveedores', prov.id))}} className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-1 rounded transition-colors"><X size={12} className="mx-auto" /></button>
                       </td>
                     </tr>
                   ))}
                   {proveedores.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-slate-400 font-bold">No hay proveedores registrados.</td></tr>}
                 </tbody>
               </table>
             </div>
          )}

          {activeTab === 'Asientos' && (
             <div className="space-y-4 animate-in fade-in duration-500">
               {/* Pestañas de Área */}
               <div className="flex gap-2 p-1 bg-white/5 rounded-2xl w-max mb-6">
                 {['Todas', 'Obras', 'Alquileres', 'Oficina', 'Directorio'].map(a => (
                   <button key={a} onClick={() => setBdAreaFilter(a)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${bdAreaFilter === a ? 'bg-blue-600 text-white' : 'glass-panel text-slate-500 hover:text-white'}`}>
                     {a}
                   </button>
                 ))}
               </div>
               
               {/* Grilla Excel */}
               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[75vh]">
                 <div className="overflow-auto custom-scrollbar flex-1 relative">
                   <table className="w-full text-left border-collapse text-[10px]">
                     <thead className="sticky top-0 z-10 bg-slate-100/90 backdrop-blur-sm shadow-sm">
                       <tr className="border-b border-slate-200 text-slate-500 uppercase font-black tracking-widest">
                         <th className="p-2 border-r border-slate-200 min-w-[100px]">
                           Fecha
                           <input type="text" placeholder="Filtrar..." value={bdFilters.fecha || ''} onChange={e => setBdFilters({...bdFilters, fecha: e.target.value})} className="w-full mt-1 px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-normal normal-case outline-none text-slate-800" />
                         </th>
                         <th className="p-2 border-r border-slate-200 min-w-[120px]">
                           Área / Tipo
                           <input type="text" placeholder="Filtrar..." value={bdFilters.areaTipo || ''} onChange={e => setBdFilters({...bdFilters, areaTipo: e.target.value})} className="w-full mt-1 px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-normal normal-case outline-none text-slate-800" />
                         </th>
                         <th className="p-2 border-r border-slate-200 min-w-[160px]">
                           Categoría / Rubro
                           <input type="text" placeholder="Filtrar..." value={bdFilters.catRubro || ''} onChange={e => setBdFilters({...bdFilters, catRubro: e.target.value})} className="w-full mt-1 px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-normal normal-case outline-none text-slate-800" />
                         </th>
                         <th className="p-2 border-r border-slate-200 min-w-[200px]">
                           Concepto / Entidad
                           <input type="text" placeholder="Filtrar..." value={bdFilters.concepto || ''} onChange={e => setBdFilters({...bdFilters, concepto: e.target.value})} className="w-full mt-1 px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-normal normal-case outline-none text-slate-800" />
                         </th>
                         <th className="p-2 border-r border-slate-200 min-w-[120px] text-right">
                           Monto original
                           <input type="text" placeholder="Filtrar..." value={bdFilters.montoOrig || ''} onChange={e => setBdFilters({...bdFilters, montoOrig: e.target.value})} className="w-full mt-1 px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-normal normal-case outline-none text-slate-800 text-right" />
                         </th>
                         <th className="p-2 border-r border-slate-200 min-w-[120px]">
                           Caja Destino
                           <input type="text" placeholder="Filtrar..." value={bdFilters.caja || ''} onChange={e => setBdFilters({...bdFilters, caja: e.target.value})} className="w-full mt-1 px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-normal normal-case outline-none text-slate-800" />
                         </th>
                         <th className="p-2 w-10 text-center"></th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {movimientos
                         .filter(m => bdAreaFilter === 'Todas' || m.area === bdAreaFilter)
                         .filter(m => {
                           if (bdFilters.fecha && !m.fecha.includes(bdFilters.fecha)) return false;
                           if (bdFilters.areaTipo && !`${m.area} ${m.tipo}`.toLowerCase().includes(bdFilters.areaTipo.toLowerCase())) return false;
                           if (bdFilters.catRubro && !`${m.categoriaEgreso||''} ${m.rubro||''} ${m.subRubro||''}`.toLowerCase().includes(bdFilters.catRubro.toLowerCase())) return false;
                           if (bdFilters.concepto && !`${m.concepto||''} ${m.entidadCuenta||''}`.toLowerCase().includes(bdFilters.concepto.toLowerCase())) return false;
                           if (bdFilters.montoOrig && !`${m.monto}`.includes(bdFilters.montoOrig)) return false;
                           if (bdFilters.caja && !`${m.caja||''}`.toLowerCase().includes(bdFilters.caja.toLowerCase())) return false;
                           return true;
                         })
                         .sort((a,b) => new Date(b.fecha) - new Date(a.fecha) || b.createdAt?.localeCompare(a.createdAt))
                         .map(m => (
                           <tr key={m.id} className="hover:bg-blue-50/50 transition-colors font-bold text-slate-700">
                             <td className="p-1 border-r border-slate-100 whitespace-nowrap"><input defaultValue={m.fecha} type="date" className="bg-transparent outline-none w-full px-1 py-1 hover:bg-white focus:bg-white rounded" onBlur={(e) => {if(e.target.value !== m.fecha) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'movimientos', m.id), {fecha: e.target.value})}} /></td>
                             <td className="p-2 border-r border-slate-100 whitespace-nowrap">
                               <span className={`px-2 py-0.5 rounded uppercase text-[8px] mr-1 ${m.tipo==='Ingreso'?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700'}`}>{m.tipo}</span>
                               <span className="text-[9px] text-slate-500 uppercase">{m.area}</span>
                             </td>
                             <td className="p-2 border-r border-slate-100 text-[9px] truncate max-w-[150px] title={m.categoriaEgreso + ' ' + m.rubro + ' ' + m.subRubro}">{[m.categoriaEgreso, m.rubro, m.subRubro].filter(Boolean).join(' > ')}</td>
                             <td className="p-1 border-r border-slate-100">
                                <div className="flex items-center gap-1 w-full">
                                   <input defaultValue={m.concepto} className="bg-transparent outline-none w-full px-1 py-1 hover:bg-white focus:bg-white rounded" onBlur={(e) => {if(e.target.value !== m.concepto) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'movimientos', m.id), {concepto: e.target.value})}} />
                                   {m.entidadCuenta && <span className="text-[7px] bg-blue-100 text-blue-700 px-1 rounded uppercase min-w-max">{m.entidadCuenta}</span>}
                                </div>
                             </td>
                             <td className="p-1 border-r border-slate-100 text-right font-black flex items-center justify-end">
                                <span className="text-slate-400 mr-1">{m.moneda==='USD'?'u$d':'$'}</span>
                                <input type="number" step="0.01" defaultValue={m.monto} className="bg-transparent outline-none w-24 text-right px-1 py-1 hover:bg-white focus:bg-white rounded" onBlur={(e) => {if(Number(e.target.value) !== m.monto) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'movimientos', m.id), {monto: Number(e.target.value)})}} />
                             </td>
                             <td className="p-1 border-r border-slate-100">
                               <select defaultValue={m.caja} className="bg-transparent outline-none w-full text-[9px] px-1 py-1 hover:bg-white focus:bg-white rounded" onChange={(e) => {if(e.target.value !== m.caja) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'movimientos', m.id), {caja: e.target.value})}}>
                                 <option value="">-- Sin Caja --</option>
                                 {cajas.map(c => <option key={c} value={c}>{c}</option>)}
                               </select>
                             </td>
                             <td className="p-2 text-center">
                               <button onClick={() => {if(window.confirm('Â¿Borrar asiento?')) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'movimientos', m.id))}} className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-1 rounded transition-colors"><X size={12} className="mx-auto" /></button>
                             </td>
                           </tr>
                         ))}
                     </tbody>
                   </table>
                 </div>
               </div>
             </div>
          )}

          {activeTab === 'Obras' && (
             <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <table className="w-full text-left border-collapse text-[10px]">
                 <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-500 uppercase font-black tracking-widest">
                   <tr>
                     <th className="p-2 border-r border-slate-200">Nombre / Identificador</th>
                     <th className="p-2 border-r border-slate-200">Dirección</th>
                     <th className="p-2 border-r border-slate-200 text-center">Avance (%)</th>
                     <th className="p-2 border-r border-slate-200 text-center">Cronograma</th>
                     <th className="p-2 border-r border-slate-200">Estado</th>
                     <th className="p-2 text-center w-10"></th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {obras.map(o => (
                     <tr key={o.id} className="hover:bg-slate-50 transition-colors font-bold text-slate-700">
                       <td className="p-1 border-r border-slate-100"><input defaultValue={o.nombre} className="bg-transparent outline-none w-full px-1 py-1 hover:bg-white focus:bg-white rounded" onBlur={(e) => {if(e.target.value !== o.nombre) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'obras', o.id), {nombre: e.target.value})}} /></td>
                       <td className="p-1 border-r border-slate-100"><input defaultValue={o.direccion} className="bg-transparent outline-none w-full px-1 py-1 hover:bg-white focus:bg-white rounded" onBlur={(e) => {if(e.target.value !== o.direccion) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'obras', o.id), {direccion: e.target.value})}} /></td>
                       <td className="p-1 border-r border-slate-100 text-center"><input type="number" defaultValue={o.porcentajeAvance || 0} className="bg-transparent outline-none w-16 px-1 py-1 hover:bg-white focus:bg-white rounded text-center" onBlur={(e) => {if(e.target.value !== String(o.porcentajeAvance)) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'obras', o.id), {porcentajeAvance: Number(e.target.value)})}} /></td>
                       <td className="p-2 border-r border-slate-100 text-[9px] text-center">
                         {o.fechaInicio && new Date(o.fechaInicio).toLocaleDateString()} 
                         <span className="text-slate-300 mx-1">â†’</span>
                         {o.fechaEstimadaFin ? new Date(o.fechaEstimadaFin).toLocaleDateString() : 'TBD'}
                       </td>
                       <td className="p-1 border-r border-slate-100">
                         <select defaultValue={o.estado} className={`bg-transparent outline-none w-full px-1 py-1 hover:bg-white focus:bg-white rounded text-[9px] uppercase ${o.estado === 'Finalizada' ? 'text-emerald-600' : 'text-blue-600'}`} onChange={(e) => {if(e.target.value !== o.estado) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'obras', o.id), {estado: e.target.value})}}>
                           <option className="text-slate-800" value="En Ejecución">En Ejecución</option>
                           <option className="text-slate-800" value="Finalizada">Finalizada</option>
                           <option className="text-slate-800" value="Pausada">Pausada</option>
                           <option className="text-slate-800" value="Presupuesto">Presupuesto</option>
                         </select>
                       </td>
                       <td className="p-1 text-center">
                         <button onClick={() => {if(window.confirm('Â¿Borrar obra?')) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'obras', o.id))}} className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-1 rounded transition-colors"><X size={12} className="mx-auto" /></button>
                       </td>
                     </tr>
                   ))}
                   {obras.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-bold">No hay obras registradas.</td></tr>}
                 </tbody>
               </table>
             </div>
          )}

          {activeTab === 'Propiedades en Alquiler' && (
             <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               {/* Botón rápido Correa */}
               {!propiedades.some(p => p.nombre?.includes('Correa 3212')) && (
                 <div className="bg-orange-50 p-2 border-b border-orange-100 flex justify-between items-center">
                   <p className="text-[10px] font-black text-orange-600 uppercase">Falta agregar Correa 3212</p>
                   <button onClick={() => { setFormProp({ nombre:'Correa 3212', direccion:'Correa 3212', piso:'-', depto:'-', unidadFuncional:'-', partidaInmobiliaria:'-', valorActualUSD: 0, esCentroCostos: false, estado:'Alquilada' }); setIsModalPropOpen(true); }} className="px-3 py-1 bg-orange-600 text-white rounded text-[9px] font-bold">Agregar Rápido</button>
                 </div>
               )}
               <table className="w-full text-left border-collapse text-[10px]">
                 <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-500 uppercase font-black tracking-widest">
                   <tr>
                     <th className="p-2 border-r border-slate-200">Tipo</th>
                     <th className="p-2 border-r border-slate-200 min-w-[120px]">Edificio/Identificador</th>
                     <th className="p-2 border-r border-slate-200 min-w-[150px]">Dirección</th>
                     <th className="p-2 border-r border-slate-200 text-center">Partida Inmob.</th>
                     <th className="p-2 border-r border-slate-200 text-center">Piso / Depto / UF</th>
                     <th className="p-2 border-r border-slate-200 text-right">Valor Venta USD</th>
                     <th className="p-2 text-center w-10"></th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {propiedades.sort((a,b) => (a.esCentroCostos === b.esCentroCostos) ? 0 : a.esCentroCostos ? 1 : -1).map(p => (
                     <tr key={p.id} className={`transition-colors font-bold text-slate-700 ${p.esCentroCostos ? 'bg-slate-50 hover:bg-slate-100/80' : 'hover:bg-blue-50/50'}`}>
                       <td className="p-2 border-r border-slate-100 whitespace-nowrap text-center">
                         {p.esCentroCostos ? <span className="bg-slate-200 text-slate-500 px-2 py-0.5 rounded uppercase text-[8px]">C. Costos</span> : <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase text-[8px]">Propiedad</span>}
                       </td>
                       <td className="p-1 border-r border-slate-100"><input defaultValue={p.nombre} className="bg-transparent outline-none w-full px-1 py-1 hover:bg-white focus:bg-white rounded" onBlur={(e) => {if(e.target.value !== p.nombre) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'propiedades', p.id), {nombre: e.target.value})}} /></td>
                       <td className="p-1 border-r border-slate-100"><input defaultValue={p.direccion} className="bg-transparent outline-none w-full px-1 py-1 hover:bg-white focus:bg-white rounded" onBlur={(e) => {if(e.target.value !== p.direccion) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'propiedades', p.id), {direccion: e.target.value})}} /></td>
                       <td className="p-1 border-r border-slate-100 text-center"><input defaultValue={p.partidaInmobiliaria} className="bg-transparent outline-none w-full px-1 py-1 hover:bg-white focus:bg-white rounded text-center" onBlur={(e) => {if(e.target.value !== p.partidaInmobiliaria) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'propiedades', p.id), {partidaInmobiliaria: e.target.value})}} /></td>
                       <td className="p-1 border-r border-slate-100 text-center flex items-center justify-center gap-1">
                          <input defaultValue={p.piso} placeholder="Piso" className="bg-transparent outline-none w-8 px-1 py-1 hover:bg-white focus:bg-white rounded text-center" onBlur={(e) => {if(e.target.value !== p.piso) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'propiedades', p.id), {piso: e.target.value})}} /> /
                          <input defaultValue={p.depto} placeholder="Depto" className="bg-transparent outline-none w-8 px-1 py-1 hover:bg-white focus:bg-white rounded text-center" onBlur={(e) => {if(e.target.value !== p.depto) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'propiedades', p.id), {depto: e.target.value})}} /> /
                          <input defaultValue={p.unidadFuncional} placeholder="UF" className="bg-transparent outline-none w-8 px-1 py-1 hover:bg-white focus:bg-white rounded text-center" onBlur={(e) => {if(e.target.value !== p.unidadFuncional) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'propiedades', p.id), {unidadFuncional: e.target.value})}} />
                       </td>
                       <td className="p-1 border-r border-slate-100 text-right"><span className="text-slate-400 mr-1">u$d</span><input type="number" defaultValue={p.valorActualUSD || 0} className="bg-transparent outline-none w-20 px-1 py-1 hover:bg-white focus:bg-white rounded text-right text-blue-600 font-black" onBlur={(e) => {if(Number(e.target.value) !== p.valorActualUSD) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'propiedades', p.id), {valorActualUSD: Number(e.target.value)})}} /></td>
                       <td className="p-1 text-center">
                         <button onClick={() => {if(window.confirm('Â¿Borrar propiedad?')) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'propiedades', p.id))}} className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-1 rounded transition-colors"><X size={12} className="mx-auto" /></button>
                       </td>
                     </tr>
                   ))}
                   {propiedades.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-slate-400 font-bold">No hay propiedades registradas.</td></tr>}
                 </tbody>
               </table>
             </div>
          )}
          {activeTab === 'Clientes' && (
             <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <table className="w-full text-left border-collapse text-[10px]">
                 <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-500 uppercase font-black tracking-widest">
                   <tr>
                     <th className="p-2 border-r border-slate-200">Nombre Inquilino/Cliente</th>
                     <th className="p-2 border-r border-slate-200">Dirección Módulo</th>
                     <th className="p-2 border-r border-slate-200">Teléfono</th>
                     <th className="p-2 border-r border-slate-200">Email</th>
                     <th className="p-2 border-r border-slate-200">CUIT / ID Fiscal</th>
                     <th className="p-2 text-center w-10"></th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {clientes.map(cl => (
                     <tr key={cl.id} className="hover:bg-emerald-50/50 transition-colors font-bold text-slate-700">
                       <td className="p-1 border-r border-slate-100"><input defaultValue={cl.nombre} className="bg-transparent outline-none w-full px-1 py-1 hover:bg-white focus:bg-white rounded" onBlur={(e) => {if(e.target.value !== cl.nombre) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clientes', cl.id), {nombre: e.target.value})}} /></td>
                       <td className="p-1 border-r border-slate-100"><input defaultValue={cl.direccion} className="bg-transparent outline-none w-full px-1 py-1 hover:bg-white focus:bg-white rounded" onBlur={(e) => {if(e.target.value !== cl.direccion) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clientes', cl.id), {direccion: e.target.value})}} /></td>
                       <td className="p-1 border-r border-slate-100"><input defaultValue={cl.telefono} className="bg-transparent outline-none w-full px-1 py-1 hover:bg-white focus:bg-white rounded" onBlur={(e) => {if(e.target.value !== cl.telefono) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clientes', cl.id), {telefono: e.target.value})}} /></td>
                       <td className="p-1 border-r border-slate-100"><input defaultValue={cl.mail} className="bg-transparent outline-none w-full px-1 py-1 hover:bg-white focus:bg-white rounded" onBlur={(e) => {if(e.target.value !== cl.mail) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clientes', cl.id), {mail: e.target.value})}} /></td>
                       <td className="p-1 border-r border-slate-100"><input defaultValue={cl.cuit} className="bg-transparent outline-none w-full px-1 py-1 hover:bg-white focus:bg-white rounded font-mono" onBlur={(e) => {if(e.target.value !== cl.cuit) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clientes', cl.id), {cuit: e.target.value})}} /></td>
                       <td className="p-1 text-center">
                         <button onClick={() => {if(window.confirm('Â¿Borrar cliente?')) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clientes', cl.id))}} className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-1 rounded transition-colors"><X size={12} className="mx-auto" /></button>
                       </td>
                     </tr>
                   ))}
                   {clientes.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-bold">No hay clientes registrados.</td></tr>}
                 </tbody>
               </table>
             </div>
          )}

      {/* MODAL CONTRATO */}
      {isModalContratoOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden my-auto animate-in zoom-in duration-200">
            <div className="p-8 bg-amber-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black italic tracking-tighter uppercase">NUEVO CONTRATO</h3>
                <p className="text-amber-100 text-[10px] font-black uppercase tracking-widest mt-1">Alquileres</p>
              </div>
              <button onClick={() => setIsModalContratoOpen(false)} className="hover:rotate-90 transition-transform"><X /></button>
            </div>
            <form onSubmit={handleSaveContrato} className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Propiedad Involucrada</label>
                <select required value={formContrato.propiedadId} onChange={e => setFormContrato({...formContrato, propiedadId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none">
                    <option value="">-- Seleccionar Propiedad --</option>
                    {propiedades.filter(p => !p.esCentroCostos).map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.direccion})</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><UserCircle size={10} /> Inquilino Asignado</label>
                <select required value={formContrato.clienteId} onChange={e => setFormContrato({...formContrato, clienteId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none">
                    <option value="">-- Seleccionar Cliente Módulo Inquilino --</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido} (CUIT: {c.cuit || 'S/N'})</option>)}
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Fecha de Inicio</label>
                <input type="date" required value={formContrato.fechaInicio} onChange={e => {
                    const nuevInicio = e.target.value;
                    const c = calcularFechasContrato(nuevInicio, formContrato.periodoActualizacion, formContrato.duracionMeses);
                    setFormContrato({...formContrato, fechaInicio: nuevInicio, proximaActualizacion: c.dtProx, fechaFin: c.dtFin});
                }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Actualización</label>
                    <select value={formContrato.periodoActualizacion} onChange={e => {
                        const nuevoPer = e.target.value;
                        const c = calcularFechasContrato(formContrato.fechaInicio, nuevoPer, formContrato.duracionMeses);
                        setFormContrato({...formContrato, periodoActualizacion: nuevoPer, proximaActualizacion: c.dtProx, fechaFin: c.dtFin});
                    }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none">
                        <option value="3">Cada 3 Meses</option>
                        <option value="4">Cada 4 Meses</option>
                        <option value="6">Cada 6 Meses</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Duración</label>
                    <div className="flex relative items-center">
                        <input type="number" required value={formContrato.duracionMeses} onChange={e => {
                            const nuevaDur = e.target.value;
                            const c = calcularFechasContrato(formContrato.fechaInicio, formContrato.periodoActualizacion, nuevaDur);
                            setFormContrato({...formContrato, duracionMeses: nuevaDur, proximaActualizacion: c.dtProx, fechaFin: c.dtFin});
                        }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" min="1"/>
                        <span className="absolute right-4 text-xs font-black text-slate-400">meses</span>
                    </div>
                  </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl grid grid-cols-2 gap-4 mt-6">
                 <div>
                    <span className="text-[9px] font-black text-amber-500 uppercase block mb-1">Próxima Act.</span>
                    <span className="text-sm font-black text-amber-700">{formContrato.proximaActualizacion ? formContrato.proximaActualizacion : '-'}</span>
                 </div>
                 <div>
                    <span className="text-[9px] font-black text-amber-500 uppercase block mb-1">Finalización</span>
                    <span className="text-sm font-black text-amber-700">{formContrato.fechaFin ? formContrato.fechaFin : '-'}</span>
                 </div>
              </div>

              <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-xl transition-all mt-4">Guardar Contrato</button>
            </form>
          </div>
        </div>
      )}

      {isModalObraOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden my-auto animate-in zoom-in duration-200">
            <div className="p-8 bg-orange-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black italic tracking-tighter uppercase">{editingObraId ? 'EDITAR OBRA' : 'NUEVA OBRA'}</h3>
                <p className="text-orange-100 text-[10px] font-black uppercase tracking-widest mt-1">Gestión de Proyectos</p>
              </div>
              <button onClick={() => { setIsModalObraOpen(false); setEditingObraId(null); }} className="hover:rotate-90 transition-transform"><X /></button>
            </div>
            <form onSubmit={handleSaveObra} className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nombre de la Obra</label>
                <input required value={formObra.nombre} onChange={e => setFormObra({...formObra, nombre: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Dirección</label>
                <input value={formObra.direccion} onChange={e => setFormObra({...formObra, direccion: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Inicio</label>
                    <input type="date" value={formObra.fechaInicio} onChange={e => setFormObra({...formObra, fechaInicio: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Est. Fin</label>
                    <input type="date" value={formObra.fechaEstimadaFin} onChange={e => setFormObra({...formObra, fechaEstimadaFin: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Avance (%)</label>
                <input type="number" value={formObra.porcentajeAvance} onChange={e => setFormObra({...formObra, porcentajeAvance: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" min="0" max="100"/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Estado</label>
                <select value={formObra.estado} onChange={e => setFormObra({...formObra, estado: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none">
                    <option value="En Proceso">En Proceso</option>
                    <option value="Finalizada">Finalizada</option>
                    <option value="Pausada">Pausada</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-xl transition-all mt-4">{editingObraId ? 'Actualizar Obra' : 'Guardar Obra'}</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PROPIEDAD */}
      {isModalPropOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden my-auto animate-in zoom-in duration-200">
            <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black italic tracking-tighter uppercase">NUEVA PROPIEDAD</h3>
                <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mt-1">Activos Inmobiliarios</p>
              </div>
              <button onClick={() => setIsModalPropOpen(false)} className="hover:rotate-90 transition-transform"><X /></button>
            </div>
            <form onSubmit={handleSaveProp} className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nombre / Identificador</label>
                <input required value={formProp.nombre} onChange={e => setFormProp({...formProp, nombre: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" placeholder="Ej: VO 2789 1A"/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Dirección Completa</label>
                <input required value={formProp.direccion} onChange={e => setFormProp({...formProp, direccion: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <input placeholder="Piso" value={formProp.piso} onChange={e => setFormProp({...formProp, piso: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
                <input placeholder="Depto" value={formProp.depto} onChange={e => setFormProp({...formProp, depto: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
                <input placeholder="UF" value={formProp.unidadFuncional} onChange={e => setFormProp({...formProp, unidadFuncional: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Partida Inmobiliaria</label>
                <input value={formProp.partidaInmobiliaria} onChange={e => setFormProp({...formProp, partidaInmobiliaria: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Valor Actual (USD)</label>
                <input type="number" value={formProp.valorActualUSD} onChange={e => setFormProp({...formProp, valorActualUSD: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none text-blue-600"/>
              </div>
              <div className="flex items-center gap-2 py-2">
                <input type="checkbox" checked={formProp.esCentroCostos} onChange={e => setFormProp({...formProp, esCentroCostos: e.target.checked})} id="chkCC" className="w-4 h-4 rounded border-slate-300"/>
                <label htmlFor="chkCC" className="text-xs font-bold text-slate-600 cursor-pointer">Es Centro de Costos (No Activo)</label>
              </div>
              <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-xl transition-all mt-4">Guardar Propiedad</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MOVIMIENTO */}
      {isModalMovOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden my-auto animate-in zoom-in duration-200">
            <div className="p-8 bg-emerald-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black italic tracking-tighter uppercase">REGISTRAR FLUJO</h3>
                <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest mt-1">Caja y Tesorería</p>
              </div>
              <button onClick={() => setIsModalMovOpen(false)} className="hover:rotate-90 transition-transform"><X /></button>
            </div>
            <form onSubmit={handleSaveMov} className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input type="date" required value={formMov.fecha} onChange={e => setFormMov({...formMov, fecha: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
                <select 
                  value={formMov.area} 
                  onChange={e => {
                    const nuevaArea = e.target.value;
                    let nuevoRubro = '';
                    let nuevaCategoriaEgreso = formMov.categoriaEgreso;
                    let nuevoTipoObraIngreso = formMov.tipoObraIngreso;

                    if (['Obras', 'Alquileres', 'Oficina'].includes(nuevaArea) && formMov.tipo === 'Egreso') {
                        nuevaCategoriaEgreso = Object.keys(egresosGlobalList)[0];
                        nuevoRubro = egresosGlobalList[nuevaCategoriaEgreso][0];
                    } else if (nuevaArea === 'Obras' && formMov.tipo === 'Ingreso') {
                        nuevoTipoObraIngreso = Object.keys(ingresosObrasList)[0];
                        nuevoRubro = ingresosObrasList[nuevoTipoObraIngreso][0];
                    } else {
                        const nuevaListaRubros = categoriasFinancieras[nuevaArea] && categoriasFinancieras[nuevaArea][formMov.tipo];
                        nuevoRubro = nuevaListaRubros ? nuevaListaRubros[0] || '' : '';
                    }
                    
                    setFormMov({...formMov, area: nuevaArea, rubro: nuevoRubro, subRubro: '', obraId: '', propiedadId: '', directorId: '', clienteId: '', categoriaEgreso: nuevaCategoriaEgreso, tipoObraIngreso: nuevoTipoObraIngreso});
                  }} 
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                >
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {['Ingreso', 'Egreso'].map(t => (
                    <button 
                      key={t} 
                      type="button" 
                      onClick={() => {
                        let nuevoRubro = formMov.rubro;
                        let nuevaCategoriaEgreso = formMov.categoriaEgreso;
                        let nuevoTipoObraIngreso = formMov.tipoObraIngreso;
                        
                        if (['Obras', 'Alquileres'].includes(formMov.area) && t === 'Egreso') {
                           nuevaCategoriaEgreso = Object.keys(egresosGlobalList)[0];
                           nuevoRubro = egresosGlobalList[nuevaCategoriaEgreso][0];
                        } else if (formMov.area === 'Oficina' && t === 'Egreso') {
                           nuevaCategoriaEgreso = Object.keys(egresosOficinaList)[0];
                           nuevoRubro = egresosOficinaList[nuevaCategoriaEgreso][0];
                        } else if (formMov.area === 'Oficina' && t === 'Ingreso') {
                           nuevaCategoriaEgreso = Object.keys(ingresosOficinaList)[0];
                           nuevoRubro = ingresosOficinaList[nuevaCategoriaEgreso][0];
                        } else if (formMov.area === 'Obras' && t === 'Ingreso') {
                           nuevoTipoObraIngreso = Object.keys(ingresosObrasList)[0];
                           nuevoRubro = ingresosObrasList[nuevoTipoObraIngreso][0];
                        } else {
                           const nuevaListaRubros = categoriasFinancieras[formMov.area] && categoriasFinancieras[formMov.area][t];
                           if (nuevaListaRubros && nuevaListaRubros.length > 0) {
                              nuevoRubro = nuevaListaRubros.includes(formMov.rubro) ? formMov.rubro : nuevaListaRubros[0];
                           } else {
                              nuevoRubro = '';
                           }
                        }
                        
                        setFormMov({...formMov, tipo: t, rubro: nuevoRubro, subRubro: '', clienteId: '', propiedadId: '', categoriaEgreso: nuevaCategoriaEgreso, tipoObraIngreso: nuevoTipoObraIngreso});
                      }} 
                      className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${formMov.tipo === t ? (t==='Ingreso' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white') : 'text-slate-500'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {['ARS', 'USD'].map(m => (
                    <button key={m} type="button" onClick={() => setFormMov({...formMov, moneda: m})} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${formMov.moneda === m ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500'}`}>{m}</button>
                  ))}
                </div>
              </div>

              {/* Rubro Dinámico General o Tipo de Egreso en Obras/Alquileres/Oficina */}
              <div className="grid grid-cols-2 gap-4">
                
                {['Obras', 'Alquileres'].includes(formMov.area) && formMov.tipo === 'Egreso' ? (
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Categoría</label>
                      <select 
                        value={formMov.categoriaEgreso} 
                        onChange={e => {
                           const nuevoTipo = e.target.value;
                           setFormMov({...formMov, categoriaEgreso: nuevoTipo, rubro: egresosGlobalList[nuevoTipo][0], subRubro: ''});
                        }} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      >
                          {Object.keys(egresosGlobalList).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                   </div>
                ) : formMov.area === 'Oficina' && formMov.tipo === 'Egreso' ? (
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Categoría</label>
                      <select 
                        value={formMov.categoriaEgreso} 
                        onChange={e => {
                           const nuevoTipo = e.target.value;
                           setFormMov({...formMov, categoriaEgreso: nuevoTipo, rubro: egresosOficinaList[nuevoTipo][0], subRubro: ''});
                        }} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none border-blue-200"
                      >
                          {Object.keys(egresosOficinaList).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                   </div>
                ) : formMov.area === 'Oficina' && formMov.tipo === 'Ingreso' ? (
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Categoría / Tipo Ingreso</label>
                      <select 
                        value={formMov.categoriaEgreso} 
                        onChange={e => {
                           const nuevoTipo = e.target.value;
                           setFormMov({...formMov, categoriaEgreso: nuevoTipo, rubro: ingresosOficinaList[nuevoTipo][0], subRubro: ''});
                        }} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none border-blue-200"
                      >
                          {Object.keys(ingresosOficinaList).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                   </div>
                ) : formMov.area === 'Obras' && formMov.tipo === 'Ingreso' ? (
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Categoría</label>
                      <select 
                        value={formMov.tipoObraIngreso} 
                        onChange={e => {
                           const nuevoTipo = e.target.value;
                           setFormMov({...formMov, tipoObraIngreso: nuevoTipo, rubro: ingresosObrasList[nuevoTipo][0], subRubro: ''});
                        }} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      >
                          {Object.keys(ingresosObrasList).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                   </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Clasificación / Rubro</label>
                    <select 
                      value={formMov.rubro} 
                      onChange={e => setFormMov({...formMov, rubro: e.target.value, subRubro: ''})} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                    >
                        {categoriasFinancieras[formMov.area][formMov.tipo].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                )}
                
                {/* Segundo Nivel (Rubro para Egresos/Oficina) */}
                {['Obras', 'Alquileres'].includes(formMov.area) && formMov.tipo === 'Egreso' && (
                  <div className="space-y-1 animate-in fade-in slide-in-from-left-2">
                    <label className="text-[10px] font-black text-orange-500 uppercase ml-1">Rubro</label>
                    <select required value={formMov.rubro} onChange={e => setFormMov({...formMov, rubro: e.target.value, subRubro: ''})} className="w-full bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm font-black text-orange-700 outline-none">
                      {egresosGlobalList[formMov.categoriaEgreso] && egresosGlobalList[formMov.categoriaEgreso].map(sr => <option key={sr} value={sr}>{sr}</option>)}
                    </select>
                  </div>
                )}

                {formMov.area === 'Oficina' && formMov.tipo === 'Egreso' && egresosOficinaList[formMov.categoriaEgreso] && (
                  <div className="space-y-1 animate-in fade-in slide-in-from-left-2">
                    <label className="text-[10px] font-black text-blue-500 uppercase ml-1">Rubro</label>
                    <select required value={formMov.rubro} onChange={e => setFormMov({...formMov, rubro: e.target.value, subRubro: ''})} className="w-full bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm font-black text-blue-700 outline-none">
                      {egresosOficinaList[formMov.categoriaEgreso].map(sr => <option key={sr} value={sr}>{sr}</option>)}
                    </select>
                  </div>
                )}

                {formMov.area === 'Oficina' && formMov.tipo === 'Ingreso' && ingresosOficinaList[formMov.categoriaEgreso] && (
                  <div className="space-y-1 animate-in fade-in slide-in-from-left-2">
                    <label className="text-[10px] font-black text-emerald-500 uppercase ml-1">Rubro</label>
                    <select required value={formMov.rubro} onChange={e => setFormMov({...formMov, rubro: e.target.value, subRubro: ''})} className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-black text-emerald-700 outline-none">
                      {ingresosOficinaList[formMov.categoriaEgreso].map(sr => <option key={sr} value={sr}>{sr}</option>)}
                    </select>
                  </div>
                )}

                {formMov.area === 'Obras' && formMov.tipo === 'Ingreso' && ingresosObrasList[formMov.tipoObraIngreso] && ingresosObrasList[formMov.tipoObraIngreso].length > 0 && (
                  <div className="space-y-1 animate-in fade-in slide-in-from-left-2">
                    <label className="text-[10px] font-black text-emerald-500 uppercase ml-1">Rubro</label>
                    <select required value={formMov.rubro} onChange={e => setFormMov({...formMov, rubro: e.target.value, subRubro: ''})} className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-black text-emerald-700 outline-none">
                      {ingresosObrasList[formMov.tipoObraIngreso].map(sr => <option key={sr} value={sr}>{sr}</option>)}
                    </select>
                  </div>
                )}

                {/* Tercer Nivel dinámico para Global y Oficina (Conceptos) */}
                {['Obras', 'Alquileres'].includes(formMov.area) && formMov.tipo === 'Egreso' && conceptosGlobalList[formMov.categoriaEgreso] && conceptosGlobalList[formMov.categoriaEgreso][formMov.rubro] && conceptosGlobalList[formMov.categoriaEgreso][formMov.rubro].length > 0 && (
                  <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Concepto</label>
                    <select required value={formMov.subRubro} onChange={e => setFormMov({...formMov, subRubro: e.target.value})} className="w-full bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 text-sm font-black text-slate-800 outline-none">
                      <option value="">-- Seleccionar --</option>
                      {conceptosGlobalList[formMov.categoriaEgreso][formMov.rubro].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}

                {formMov.area === 'Oficina' && formMov.tipo === 'Egreso' && conceptosOficinaList[formMov.categoriaEgreso] && conceptosOficinaList[formMov.categoriaEgreso][formMov.rubro] && conceptosOficinaList[formMov.categoriaEgreso][formMov.rubro].length > 0 && (
                  <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Concepto</label>
                    <select required value={formMov.subRubro} onChange={e => setFormMov({...formMov, subRubro: e.target.value})} className="w-full bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 text-sm font-black text-slate-800 outline-none">
                      <option value="">-- Seleccionar --</option>
                      {conceptosOficinaList[formMov.categoriaEgreso][formMov.rubro].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
                {formMov.area === 'Directorio' && formMov.tipo === 'Egreso' && subrubrosDirectorio[formMov.rubro] && (
                  <div className="space-y-1 animate-in fade-in slide-in-from-left-2">
                    <label className="text-[10px] font-black text-rose-500 uppercase ml-1">Subrubro Especifico</label>
                    <select required value={formMov.subRubro} onChange={e => setFormMov({...formMov, subRubro: e.target.value})} className="w-full bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm font-black text-rose-700 outline-none">
                      <option value="">-- Seleccionar --</option>
                      {subrubrosDirectorio[formMov.rubro].map(sr => <option key={sr} value={sr}>{sr}</option>)}
                    </select>
                  </div>
                )}
                
                {!(formMov.area === 'Directorio' && formMov.tipo === 'Egreso' && subrubrosDirectorio[formMov.rubro]) && 
                 !(formMov.area === 'Obras' && formMov.tipo === 'Ingreso' && ingresosObrasList[formMov.tipoObraIngreso] && ingresosObrasList[formMov.tipoObraIngreso].length > 0) &&
                 !(formMov.area === 'Oficina' && formMov.tipo === 'Egreso') &&
                 !(formMov.area === 'Oficina' && formMov.tipo === 'Ingreso') &&
                 !(['Obras', 'Alquileres'].includes(formMov.area) && formMov.tipo === 'Egreso' && conceptosGlobalList[formMov.categoriaEgreso] && conceptosGlobalList[formMov.categoriaEgreso][formMov.rubro] && conceptosGlobalList[formMov.categoriaEgreso][formMov.rubro].length > 0) && (
                   <div className="hidden md:block"></div>
                )}
              </div>

              {/* Caja de Origen */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Caja / Cuenta Origen</label>
                <select value={formMov.caja} onChange={e => setFormMov({...formMov, caja: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm font-bold outline-none">
                    {cajas.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {formMov.area === 'Oficina' && (
                 <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                   <label className="text-[10px] font-black text-blue-600 uppercase ml-1 flex items-center gap-1">Entidad / Cuenta Comercial</label>
                   <input type="text" placeholder="Ej: Edenor, Telefónica, Librería..." value={formMov.entidadCuenta} onChange={e => setFormMov({...formMov, entidadCuenta: e.target.value})} className="w-full bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm font-bold text-blue-900 outline-none focus:ring-2 focus:ring-blue-500/20"/>
                 </div>
              )}

              {formMov.area === 'Directorio' && (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-black text-indigo-400 uppercase ml-1 flex items-center gap-1"><UserCircle size={10} /> Director Asignado</label>
                  <select required value={formMov.directorId} onChange={e => setFormMov({...formMov, directorId: e.target.value})} className="w-full bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm font-black text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500/20">
                    <option value="">-- Seleccionar Director --</option>
                    {directores.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}

              {formMov.tipo === 'Egreso' && formMov.area !== 'Directorio' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Proveedor</label>
                  <select value={formMov.proveedorId} onChange={e => setFormMov({...formMov, proveedorId: e.target.value})} className="w-full bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm font-black text-indigo-700 outline-none">
                    <option value="">-- Seleccionar Proveedor --</option>
                    {proveedores.map(pv => <option key={pv.id} value={pv.id}>{pv.nombre} ({pv.tipo})</option>)}
                  </select>
                </div>
              )}

              {formMov.area === 'Obras' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Obra</label>
                  <select required value={formMov.obraId} onChange={e => setFormMov({...formMov, obraId: e.target.value})} className="w-full bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm font-black text-orange-700 outline-none">
                    <option value="">-- Seleccione Obra --</option>
                    {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                  </select>
                </div>
              )}

              {formMov.area === 'Alquileres' && formMov.tipo === 'Egreso' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Propiedad</label>
                  <select required value={formMov.propiedadId} onChange={e => setFormMov({...formMov, propiedadId: e.target.value})} className="w-full bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm font-black text-blue-700 outline-none">
                    <option value="">-- Seleccione Propiedad --</option>
                    <optgroup label="Propiedades Alquilables">
                      {propiedades.filter(p => !p.esCentroCostos).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </optgroup>
                    <optgroup label="Centros de Costos">
                      {propiedades.filter(p => p.esCentroCostos).map(p => <option key={p.id} value={p.id}>{p.nombre} (Shared)</option>)}
                    </optgroup>
                  </select>
                </div>
              )}

              {formMov.area === 'Alquileres' && formMov.tipo === 'Ingreso' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><UserCircle size={10} /> Inquilino (Cliente)</label>
                  <select required value={formMov.clienteId || ''} onChange={e => {
                     const selectedClienteId = e.target.value;
                     // Buscar el contrato de este cliente
                     const contratoCliente = contratos.find(c => c.clienteId === selectedClienteId);
                     const pId = contratoCliente ? contratoCliente.propiedadId : '';
                     setFormMov({...formMov, clienteId: selectedClienteId, propiedadId: pId});
                  }} className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-black text-emerald-700 outline-none">
                    <option value="">-- Seleccione Inquilino --</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
                  </select>
                  {formMov.propiedadId && (
                     <p className="text-[9px] font-black text-blue-500 ml-1 mt-1 uppercase">
                       Propiedad Auto-vinculada: {propiedades.find(p => p.id === formMov.propiedadId)?.nombre || 'Desconocida'}
                     </p>
                  )}
                </div>
              )}

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">{formMov.moneda === 'USD' ? 'u$d' : '$'}</span>
                <input type="number" step="0.01" required placeholder="0.00" value={formMov.monto} onChange={e => setFormMov({...formMov, monto: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-4 text-2xl font-black outline-none focus:ring-2 focus:ring-blue-500/20"/>
              </div>

              <input type="text" required placeholder="Concepto / Detalle..." value={formMov.concepto} onChange={e => setFormMov({...formMov, concepto: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>

              <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-black transition-all mt-2">CONFIRMAR REGISTRO</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVO PROVEEDOR */}
      {isModalProvOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden my-auto animate-in zoom-in duration-200">
            <div className="p-8 bg-indigo-700 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black italic tracking-tighter uppercase">REGISTRO DE PROVEEDOR</h3>
                <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mt-1">Gestión de Cuentas y Contacto</p>
              </div>
              <button onClick={() => setIsModalProvOpen(false)}><X /></button>
            </div>
            <form onSubmit={handleSaveProv} className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nombre / Razón Social</label>
                  <input type="text" required placeholder="Ej: Corralón San José" value={formProv.nombre} onChange={e => setFormProv({...formProv, nombre: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">CUIT</label>
                  <input type="text" placeholder="20-XXXXXXXX-X" value={formProv.cuit} onChange={e => setFormProv({...formProv, cuit: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Teléfono</label>
                  <input type="text" placeholder="Número de contacto" value={formProv.telefono} onChange={e => setFormProv({...formProv, telefono: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Email</label>
                  <input type="email" placeholder="correo@ejemplo.com" value={formProv.mail} onChange={e => setFormProv({...formProv, mail: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nombre Vendedor (Contacto)</label>
                <input type="text" placeholder="Ej: Juan Pérez" value={formProv.nombreVendedor} onChange={e => setFormProv({...formProv, nombreVendedor: e.target.value})} className="w-full bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm font-black text-indigo-700 outline-none"/>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tipo</label>
                  <select value={formProv.tipo} onChange={e => setFormProv({...formProv, tipo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none">
                    {tiposProv.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Rubro Específico</label>
                  <input type="text" placeholder="Ej: Materiales Eléctricos" value={formProv.rubro} onChange={e => setFormProv({...formProv, rubro: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><CreditCard size={10}/> Alias / CBU 1</label>
                  <input type="text" placeholder="Alias de pago principal" value={formProv.alias1} onChange={e => setFormProv({...formProv, alias1: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono font-bold outline-none"/>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><CreditCard size={10}/> Alias / CBU 2 (Opcional)</label>
                  <input type="text" placeholder="Cuenta secundaria" value={formProv.alias2} onChange={e => setFormProv({...formProv, alias2: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono font-bold outline-none"/>
                </div>
              </div>

              <textarea placeholder="Concepto o notas internas sobre el proveedor..." value={formProv.concepto} onChange={e => setFormProv({...formProv, concepto: e.target.value})} className="w-full h-20 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none resize-none"/>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalProvOpen(false)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">GUARDAR PROVEEDOR</button>
              </div>
            </form>
          </div>
        </div>
      )}

        {/* Modal Importar Alquileres */}
        {isImportarAlquileresOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-black text-slate-800">Importar Spreadsheet de Alquileres</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1">Pegá los datos tabulares debajo. Columnas requeridas:</p>
                  <p className="text-[10px] font-mono text-blue-500 mt-1">FECHA | tipo | moneda | monto | caja | propiedad | categoria | RUBRO | CONCEPTO | proveedor/inquilino</p>
                </div>
                <button onClick={() => setIsImportarAlquileresOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                <textarea 
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Pegá tus datos desde Excel/Sheets acá..."
                  className="w-full h-64 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-700 outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsImportarAlquileresOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={handleImportarAlquileres} 
                  className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-lg shadow-blue-100"
                >
                  Importar Datos
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </main>

      {/* MODAL OBRA */}
      {isModalObraOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50 flex items-center justify-center p-8">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
             <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
                <h3 className="text-2xl font-black italic tracking-tighter uppercase leading-none">NUEVO <br/> PROYECTO OBRA</h3>
                <button onClick={() => setIsModalObraOpen(false)} className="p-4 hover:rotate-90 transition-transform"><X size={32}/></button>
             </div>
             <div className="p-10 space-y-6">
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">Formulario Técnico en Desarrollo</p>
                <button className="w-full py-5 bg-blue-600 text-white font-black uppercase tracking-widest rounded-3xl shadow-2xl">Confirmar Registro</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, val, color, bg, symbol }) {
  const isInvalid = val === undefined || val === null || isNaN(val);
  const numericVal = isInvalid ? 0 : Number(val);

  return (
    <div className="glass-card p-6 rounded-[2rem] border-white/5 flex flex-col gap-2 transition-all hover:bg-white/[0.03] group">
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] group-hover:text-slate-400 transition-colors">{title}</p>
      <p className={`text-xl font-black ${color} tracking-tighter truncate`}>
        {symbol} {numericVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}

export default App;

