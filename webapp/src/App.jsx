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
  Lock,
  LogOut
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

export default function App() {
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

  const areas = ['Obras', 'Alquileres', 'Oficina', 'Directorio'];
  const directores = ['Sebastian', 'Emiliano', 'Santiago'];
  const cajas = ['Caja Dólares', 'Caja Pesos', 'Banco Amecon', 'Banco Blue Elephant'];
  
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
      Ingreso: ['Aportes Socios', 'Reintegros', 'Otros Ingresos'],
      Egreso: [] // Manejado aparte con tipos y rubros anidados
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
    'Servicios': ['Gruesos', 'Instalaciones', 'Equipamiento', 'Servicios Públicos', 'Terminaciones', 'Profesionales', 'Asesores', 'Logística', 'Varios'],
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
       'Varios': ['Seguros', 'Limpieza', 'Destapaciones', 'Matafuegos', '-']
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
    concepto: ''
  });
  const [editingMovId, setEditingMovId] = useState(null);

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
  const [finanzasAreaSeleccionada, setFinanzasAreaSeleccionada] = useState('Obras');

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
      setMovimientos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
      // Usar historica o la referencia guardada, sino fallback al Blue actual
      const cotiz = Number(m.cotizacionHistorica) || Number(m.tipoCambioReferencia) || cotizacionBlue;
      const montoUSD = m.moneda === 'USD' ? monto : (monto / cotiz);
      
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

      // Cash Flow: Sólo egresos de los últimos 6 meses (Pesificado al valor actual)
      if(!isIngreso && new Date(m.fecha) >= seisMesesAtras) {
          egresosSeisMesesARS += (montoUSD * cotizacionBlue);
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

    return { 
      ingresosUSD_Equiv, egresosUSD_Equiv, saldoUSD_Equiv,
      roiGlobal, areaSaldosEquiv, areaShares, 
      saldosCajas, cashFlowEstimadoARS, proximoViernes: proximoViernes.toISOString().split('T')[0],
      obrasActivas, contratosActivos
    };
  }, [movimientos, obras, contratos, cotizacionBlue]);

  const statsFinanzasArea = useMemo(() => {
    const movsArea = movimientos.filter(m => m.area === finanzasAreaSeleccionada);
    const agrupar = { ars: { ingresos: 0, egresos: 0 }, usd: { ingresos: 0, egresos: 0 }, rubros: {}, edificios: { MO: {ingresos: 0, egresos: 0}, VO: {ingresos: 0, egresos: 0} } };
    
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

        if (finanzasAreaSeleccionada === 'Alquileres' && m.propiedadId) {
            const propName = propiedades.find(p => p.id === m.propiedadId)?.nombre || '';
            const propNameUpper = propName.toUpperCase();
            if (propNameUpper.startsWith('MO')) {
                if (m.tipo === 'Ingreso') agrupar.edificios.MO.ingresos += montoARS;
                else agrupar.edificios.MO.egresos += montoARS;
            } else if (propNameUpper.startsWith('VO')) {
                if (m.tipo === 'Ingreso') agrupar.edificios.VO.ingresos += montoARS;
                else agrupar.edificios.VO.egresos += montoARS;
            }
        }
    });
    return { movs: movsArea, agrupar };
  }, [movimientos, finanzasAreaSeleccionada, propiedades, cotizacionBlue]);

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
      setFormMov({ ...formMov, monto: '', concepto: '', clienteId: '' });
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
      tipoCambioReferencia: m.tipoCambioReferencia || cotizacionBlue
    });
    setEditingMovId(m.id);
    setIsModalMovOpen(true);
  };

  const handleSaveObra = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'obras'), { ...formObra, createdAt: new Date().toISOString() });
      setIsModalObraOpen(false);
    } catch (e) { console.error(e); }
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
              const mMoneda = (strMoneda.includes('usd') || strMoneda.includes('dolar') || strMoneda.includes('dólar')) ? 'USD' : 'ARS';
              let mMonto = parseFloat(montoStr?.replace(/[^0-9,-]+/g,"").replace(",","."));
              if(isNaN(mMonto)) mMonto = 0;
              
              const cCaja = cajaStr?.trim().toLowerCase();
              const mCaja = cajas.find(c => c.toLowerCase() === cCaja) || cajas[0];
              
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
          alert('¡Importación completada con éxito!');
          setImportText('');
          setIsImportarObrasOpen(false);
      } catch (err) {
          console.error(err);
          alert('Error importando datos: ' + err.message);
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
              const mMoneda = (strMoneda.includes('usd') || strMoneda.includes('dolar') || strMoneda.includes('dólar')) ? 'USD' : 'ARS';
              let mMonto = parseFloat(montoStr?.replace(/[^0-9,-]+/g,"").replace(",","."));
              if(isNaN(mMonto)) mMonto = 0;
              
              const cCaja = cajaStr?.trim().toLowerCase();
              const mCaja = cajas.find(c => c.toLowerCase() === cCaja) || cajas[0];
              
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
          alert('¡Importación de Alquileres completada con éxito!');
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

  const menuItemsAdmin = [
    { id: 'Resumen', icon: <LayoutDashboard size={20} />, label: 'Tablero General' },
    { id: 'Finanzas', icon: <Wallet size={20} />, label: 'Finanzas por Área' },
    { id: 'Obras', icon: <HardHat size={20} />, label: 'Obras', isList: true },
    { id: 'Propiedades en Alquiler', icon: <Building2 size={20} />, label: 'Propiedades', isList: true },
    { id: 'Contratos', icon: <FileSignature size={20} />, label: 'Contratos', isList: true },
    { id: 'Proveedores', icon: <Users size={20} />, label: 'Proveedores', isList: true },
    { id: 'Clientes', icon: <UserCircle size={20} />, label: 'Clientes', isList: true },
    { id: 'Asientos', icon: <FileText size={20} />, label: 'Asientos (Registros)', isList: true },
  ];

  const menuItemsEmpleado = [
    { id: 'Obras', icon: <HardHat size={20} />, label: 'Obras', isList: true },
    { id: 'Propiedades en Alquiler', icon: <Building2 size={20} />, label: 'Propiedades', isList: true },
    { id: 'Contratos', icon: <FileSignature size={20} />, label: 'Contratos', isList: true },
    { id: 'Proveedores', icon: <Users size={20} />, label: 'Proveedores', isList: true },
    { id: 'Clientes', icon: <UserCircle size={20} />, label: 'Clientes', isList: true },
    { id: 'Asientos', icon: <FileText size={20} />, label: 'Asientos (Registros)', isList: true },
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
      <div className="flex min-h-screen bg-slate-900 items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
              <Lock className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Sistema D+ARQ</h1>
            <p className="text-sm font-bold text-slate-500 mt-2">Acceso Restringido</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-2">Correo Electrónico</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
                placeholder="usuario@darq.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-2">Contraseña</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
            
            {authError && <p className="text-xs font-bold text-rose-500 text-center">{authError}</p>}
            
            <button 
              type="submit" 
              disabled={isLoggingIn}
              className={`w-full py-3 rounded-xl font-bold text-white shadow-xl transition-all mt-4 
                ${isLoggingIn ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-1 hover:shadow-blue-600/30'}`}
            >
              {isLoggingIn ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-[#0F172A] text-white transition-all duration-300 flex flex-col z-20 shadow-2xl`}>
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && <h1 className="font-black text-xl tracking-tight text-blue-400 italic">GESTIÓN PRO</h1>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {menuItems.filter(i => !i.isList).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center p-3 rounded-xl transition-all ${
                activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon}
              {isSidebarOpen && <span className="ml-3 font-bold text-sm">{item.label}</span>}
            </button>
          ))}

          {/* Listas y Bases de Datos Submenu */}
          {isSidebarOpen ? (
            <div className="pt-4 mt-4 border-t border-slate-800">
               <button 
                  onClick={() => setIsListasMenuOpen(!isListasMenuOpen)} 
                  className="w-full flex items-center justify-between p-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all group"
               >
                  <div className="flex items-center">
                     <Database size={18} className="text-slate-500 group-hover:text-blue-400" />
                     <span className="ml-3 font-bold text-xs tracking-wider uppercase">Bases de Datos</span>
                  </div>
                  {isListasMenuOpen ? <TrendingUp size={14} className="rotate-180" /> : <TrendingUp size={14} />}
               </button>
               {isListasMenuOpen && (
                 <div className="mt-2 pl-4 space-y-1 border-l border-slate-800 ml-4 animate-in slide-in-from-top-2">
                    {menuItems.filter(i => i.isList).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center p-2.5 rounded-xl transition-all ${
                          activeTab === item.id ? 'bg-blue-600/20 text-blue-400 font-black' : 'text-slate-500 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {React.cloneElement(item.icon, { size: 16 })}
                        <span className="ml-3 font-bold text-xs">{item.label}</span>
                      </button>
                    ))}
                 </div>
               )}
            </div>
          ) : (
             <div className="pt-4 mt-4 border-t border-slate-800 flex flex-col gap-1 items-center">
                <div className="w-8 h-[1px] bg-slate-800 mb-2"></div>
                {menuItems.filter(i => i.isList).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex justify-center p-3 rounded-xl transition-all ${
                      activeTab === item.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-800 hover:text-white'
                    }`}
                    title={item.label}
                  >
                    {item.icon}
                  </button>
                ))}
             </div>
          )}

          {/* Botón Flotante Global de Movimiento */}
          <div className="mt-6 px-1">
             <button
                onClick={() => {
                   setFormMov({
                     fecha: new Date().toISOString().split('T')[0],
                     area: 'Obras',
                     obraId: '',
                     propiedadId: '',
                     proveedorId: '',
                     directorId: '',
                     clienteId: '',
                     tipo: 'Egreso',
                     tipoObraIngreso: 'PAGO A CUENTA', 
                     categoriaEgreso: Object.keys(egresosGlobalList)[0], 
                     rubro: egresosGlobalList[Object.keys(egresosGlobalList)[0]][0],
                     subRubro: '',
                     moneda: 'ARS',
                     caja: cajas[1], 
                     monto: '',
                     concepto: '',
                     tipoCambioReferencia: cotizacionBlue
                   });
                   setEditingMovId(null);
                   setIsModalMovOpen(true);
                }}
                className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 group`}
                title="Registrar Nuevo Asiento"
             >
                <Plus size={isSidebarOpen ? 18 : 24} className="group-hover:scale-125 transition-transform" />
                {isSidebarOpen && <span className="font-black text-sm tracking-wide">Movimiento</span>}
             </button>
          </div>
        </nav>
        
        <div className="p-4 border-t border-slate-800">
           <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-rose-600 hover:text-white rounded-xl text-slate-400 font-bold transition-all text-sm">
             <LogOut size={16} /> {isSidebarOpen && 'Cerrar Sesión'}
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-black text-slate-900">{activeTab === 'Resumen' ? 'Tablero General' : activeTab}</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Panel Administrativo v2.0</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 mr-4">
               <TrendingUp size={14} className="text-blue-500" />
               <span className="text-[9px] font-black text-slate-400 uppercase">Blue Ref: ${cotizacionBlue}</span>
            </div>
            
            {activeTab === 'Asientos' && ['admin', 'empleadoadministrativo'].includes(userRole) && (
              <>
                <button onClick={() => setIsImportarObrasOpen(!isImportarObrasOpen)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-xl transition-all">
                  <Database size={18} /> Importar Obras
                </button>
                <button onClick={() => setIsImportarAlquileresOpen(!isImportarAlquileresOpen)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-xl transition-all">
                  <Database size={18} /> Importar Alquileres
                </button>
                <button onClick={() => setIsModalMovOpen(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 transition-all">
                  <Plus size={18} /> Movimiento
                </button>
              </>
            )}
            {activeTab === 'Obras' && ['admin', 'empleadoadministrativo'].includes(userRole) && (
              <button onClick={() => setIsModalObraOpen(true)} className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-xl transition-all">
                <Plus size={18} /> Nueva Obra
              </button>
            )}
            {activeTab === 'Propiedades en Alquiler' && ['admin', 'empleadoadministrativo'].includes(userRole) && (
              <button onClick={() => setIsModalPropOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-xl transition-all">
                <Plus size={18} /> Nueva Propiedad
              </button>
            )}
            {activeTab === 'Contratos' && ['admin', 'empleadoadministrativo'].includes(userRole) && (
              <button onClick={() => {
                const initCalc = calcularFechasContrato(formContrato.fechaInicio, formContrato.periodoActualizacion, formContrato.duracionMeses);
                setFormContrato({...formContrato, proximaActualizacion: initCalc.dtProx, fechaFin: initCalc.dtFin});
                setIsModalContratoOpen(true);
              }} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-xl transition-all">
                <Plus size={18} /> Nuevo Contrato
              </button>
            )}
            {activeTab === 'Proveedores' && ['admin', 'empleadoadministrativo'].includes(userRole) && (
              <button onClick={() => setIsModalProvOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-xl transition-all">
                <Plus size={18} /> Nuevo Proveedor
              </button>
            )}
            {activeTab === 'Clientes' && ['admin', 'empleadoadministrativo'].includes(userRole) && (
              <button onClick={() => setIsModalClienteOpen(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-xl transition-all">
                <Plus size={18} /> Nuevo Cliente
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-x-auto min-h-0 pl-1">
          {/* VISOR DE IMPORTACION Y REGISTRO GENERAL ASIENTOS */}
          {activeTab === 'Asientos' && (
            <div className="space-y-6">
              {isImportarObrasOpen && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 mb-6 mr-6 transition-all animate-in fade-in slide-in-from-top-4">
                   <h3 className="text-indigo-800 font-black text-lg mb-2 flex items-center gap-2"><Database size={20}/> Importar datos masivos</h3>
                   <p className="text-indigo-600 font-bold text-xs mb-4">Pega directamente las filas completas de tu Excel. Deben estar estrictamente en este orden: <span className="bg-white px-2 py-1 rounded text-indigo-900 mx-1">fecha | tipo | moneda | monto | caja | obra | Categoria | Rubro | concept | proveedor | tc</span></p>
                   <textarea 
                      value={importText} 
                      onChange={e => setImportText(e.target.value)} 
                      className="w-full h-40 bg-white border border-indigo-200 rounded-xl p-4 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                      placeholder="2025-01-01&#9;Ingreso&#9;USD&#9;1500&#9;Caja Dólares&#9;Edificio Lumiere&#9;CERTIFICACIONES&#9;-&#9;Pago adelanto&#9;-&#9;1200..."
                   />
                   <div className="flex justify-end gap-3">
                      <button disabled={isImporting} onClick={() => setIsImportarObrasOpen(false)} className="px-6 py-2.5 bg-white text-slate-500 font-bold text-sm border border-slate-200 rounded-xl hover:bg-slate-50">Cancelar</button>
                      <button disabled={isImporting} onClick={handleImportObras} className={`px-6 py-2.5 text-white font-bold text-sm rounded-xl transition-all shadow-xl shadow-indigo-200 ${isImporting ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                         {isImporting ? 'Procesando...' : 'Comenzar Importación Mágica'}
                      </button>
                   </div>
                </div>
              )}
              
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden mr-6">
                 <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileText size={20} className="text-indigo-600" />
                        <h3 className="font-black text-slate-800">Todos los Asientos (Registros)</h3>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-black uppercase tracking-widest">{movimientos.length} Registros</span>
                 </div>
                 <div className="overflow-x-auto max-h-[800px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                       <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 z-10">
                          <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                             <th className="px-8 py-4">Fecha</th>
                             <th className="px-8 py-4">Área / Rubro</th>
                             <th className="px-8 py-4">Concepto / Entidad</th>
                             <th className="px-8 py-4 text-right">Monto</th>
                             <th className="px-8 py-4 text-center">Acciones</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {movimientos.slice().sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).map((m) => (
                             <tr key={m.id} className="hover:bg-indigo-50/30 transition-colors group">
                                <td className="px-8 py-4 text-xs font-bold text-slate-500">{m.fecha}</td>
                                <td className="px-8 py-4">
                                     <span className="text-[10px] font-black text-indigo-600 block mb-1 uppercase">
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
                                       {m.propiedadId && <span className="text-[9px] text-blue-600 font-bold uppercase bg-blue-50 px-2 rounded">Prop.: {propiedades.find(p => p.id === m.propiedadId)?.nombre}</span>}
                                       {m.proveedorId && <span className="text-[9px] text-indigo-600 font-bold uppercase bg-indigo-50 px-2 rounded">Prov.: {proveedores.find(pv => pv.id === m.proveedorId)?.nombre}</span>}
                                   </div>
                                </td>
                                <td className={`px-8 py-4 text-right font-black ${m.tipo === 'Ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                   {m.tipo === 'Ingreso' ? '+' : '-'} {m.moneda === 'USD' ? 'u$d' : '$'} {m.monto.toLocaleString(undefined, {minimumFractionDigits:2})}
                                </td>
                                <td className="px-8 py-4 text-center">
                                   <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                      <button onClick={() => handleEditMov(m)} className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar Asiento">
                                         <Plus size={16} className="rotate-45" /> {/* Just using Plus rotated since Edit icon is not imported directly */}
                                      </button>
                                      <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'movimientos', m.id))} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Eliminar Asiento">
                                         <X size={16}/>
                                      </button>
                                   </div>
                                </td>
                             </tr>
                          ))}
                          {movimientos.length === 0 && (
                             <tr>
                                <td colSpan="5" className="px-8 py-12 text-center text-slate-400 font-bold">No hay asientos registrados.</td>
                             </tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'Resumen' && (
            <div className="space-y-6">
              {/* Tarjetas Superiores */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] shadow-sm transform transition-all hover:-translate-y-1 hover:shadow-lg">
                   <h4 className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-4 flex items-center gap-2"><TrendingUp size={14}/> INGRESOS GLOBALES (USD)</h4>
                   <div className="space-y-2">
                       <p className="text-xl font-black text-emerald-900 truncate">u$d {stats.ingresosUSD_Equiv.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                   </div>
                   <div className="mt-4 pt-4 border-t border-emerald-200/50">
                       <p className="text-[9px] font-bold text-emerald-600 uppercase">Totalizado en divisas</p>
                   </div>
                </div>

                <div className="bg-rose-50 border border-rose-100 p-6 rounded-[2rem] shadow-sm transform transition-all hover:-translate-y-1 hover:shadow-lg">
                   <h4 className="text-[10px] font-black uppercase text-rose-500 tracking-widest mb-4 flex items-center gap-2"><TrendingUp size={14} className="rotate-180"/> EGRESOS GLOBALES (USD)</h4>
                   <div className="space-y-2">
                       <p className="text-xl font-black text-rose-900 truncate">u$d {stats.egresosUSD_Equiv.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                   </div>
                   <div className="mt-4 pt-4 border-t border-rose-200/50">
                       <p className="text-[9px] font-bold text-rose-600 uppercase">Totalizado en divisas</p>
                   </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2rem] shadow-sm transform transition-all hover:-translate-y-1 hover:shadow-lg">
                   <h4 className="text-[10px] font-black uppercase text-blue-500 tracking-widest mb-4 flex items-center gap-2"><Wallet size={14}/> SALDO NETO (USD)</h4>
                   <div className="space-y-2">
                       <p className={`text-xl font-black truncate ${stats.saldoUSD_Equiv >= 0 ? 'text-blue-900' : 'text-rose-800'}`}>u$d {stats.saldoUSD_Equiv.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                   </div>
                   <div className="mt-4 pt-4 border-t border-blue-200/50">
                       <p className="text-[9px] font-bold text-blue-600 uppercase">Margen Equivalente</p>
                   </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 border-none p-6 rounded-[2rem] shadow-xl transform transition-all hover:-translate-y-1 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-white/5 w-32 h-32 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all"></div>
                   <h4 className="text-[10px] font-black uppercase text-indigo-300 tracking-widest mb-2 flex items-center gap-2">CASH FLOW VIERNES</h4>
                   <p className="text-[10px] text-indigo-200 mb-6 font-bold leading-tight">Proyección requerida <br/>(Provisión en ARS)</p>
                   <div className="flex items-end gap-2">
                       <p className={`text-3xl font-black tracking-tighter text-white truncate`}>
                           $ {stats.cashFlowEstimadoARS.toLocaleString(undefined, {maximumFractionDigits:0})}
                       </p>
                   </div>
                   <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs font-bold text-indigo-200">
                      <span>Próx. Viernes</span>
                      <span className="bg-indigo-900/50 px-3 py-1 rounded-full text-indigo-300">{stats.proximoViernes.split('-')[2]}/{stats.proximoViernes.split('-')[1]}</span>
                   </div>
                </div>
              </div>

              {/* Paneles de Proporción y Distribución */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                
                {/* Cuadro Dominante de Share de Área */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
                   <div className="flex items-center gap-3 mb-8">
                     <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                       <PieChart size={20} />
                     </div>
                     <div>
                       <h3 className="text-xl font-black text-slate-900">Distribución de Saldos por Área</h3>
                       <p className="text-xs font-bold text-slate-400 uppercase mt-1 tracking-widest">Aportación al flujo neto (Equivalente USD)</p>
                     </div>
                   </div>

                   <div className="space-y-6">
                      {areas.map(a => {
                          const valStr = stats.areaSaldosEquiv[a];
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

                {/* Accesos Rápidos o Tabla de Cajas Generales */}
                <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm flex flex-col justify-between">
                   <div>
                       <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><Building2 size={18} className="text-slate-400"/> VISTAZO GENERAL</h3>
                       <div className="space-y-4">
                          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
                             <div className="flex flex-col">
                                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Obras Activas</span>
                                 <span className="text-xl font-black text-slate-800 mt-1">{stats.obrasActivas}</span>
                             </div>
                             <HardHat size={24} className="text-slate-300" />
                          </div>
                          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
                             <div className="flex flex-col">
                                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Alquileres Activos</span>
                                 <span className="text-xl font-black text-slate-800 mt-1">{stats.contratosActivos}</span>
                             </div>
                             <FileSignature size={24} className="text-slate-300" />
                          </div>
                       </div>
                   </div>

                   <div className="mt-8">
                       <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Saldos de Cajas (Equivalente USD)</p>
                       <div className="space-y-2">
                           {cajas.map(c => (
                               <div key={c} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                                   <span className="text-xs font-bold text-slate-600 uppercase">{c.replace('Banco', 'B.')}</span>
                                   <span className="text-sm font-black text-slate-800">u$d {stats.saldosCajas[c].toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                               </div>
                           ))}
                       </div>
                   </div>
                </div>
                
              </div>

              {/* DETALLE ANALITICO */}
              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden mt-6">
                 <div className="px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><PieChart size={18} className="text-indigo-600"/> DETALLE ANALÍTICO</h3>
                     <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
                         {areas.map(area => (
                             <button 
                                 key={area}
                                 onClick={() => setResumenDetalleArea(area)}
                                 className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${resumenDetalleArea === area ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                             >
                                 {area}
                             </button>
                         ))}
                     </div>
                 </div>
                 
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50">
                           <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                               <th className="px-8 py-4">{resumenDetalleArea === 'Obras' ? 'Obra' : resumenDetalleArea === 'Alquileres' ? 'Propiedad' : 'Rubro / Clasificación'}</th>
                               <th className="px-8 py-4 text-right">Ingresos (USD)</th>
                               <th className="px-8 py-4 text-right">Egresos (USD)</th>
                               <th className="px-8 py-4 text-right">Saldo Neto (USD)</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {statsResumenDetalle.map(row => (
                               <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                   <td className="px-8 py-4">
                                       <span className="block text-sm font-black text-slate-800">{row.nombre}</span>
                                       <span className="block text-[10px] font-bold text-slate-400 uppercase mt-0.5">{row.subDetails}</span>
                                   </td>
                                   <td className="px-8 py-4 text-right text-emerald-600 font-bold text-sm">u$d {row.ingresos.toLocaleString()}</td>
                                   <td className="px-8 py-4 text-right text-rose-600 font-bold text-sm">u$d {row.egresos.toLocaleString()}</td>
                                   <td className={`px-8 py-4 text-right font-black text-sm ${row.saldo >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                                       u$d {row.saldo.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                                   </td>
                               </tr>
                           ))}
                           {statsResumenDetalle.length === 0 && (
                               <tr><td colSpan="4" className="px-8 py-8 text-center text-slate-400 font-bold text-sm">No hay datos financieros registrados para {resumenDetalleArea}.</td></tr>
                           )}
                        </tbody>
                    </table>
                 </div>
              </div>

            </div>
          )}

          {activeTab === 'Finanzas' && (
            <div className="space-y-8">
                {/* Selector de Área */}
                <div className="flex gap-2 p-1 bg-slate-200/50 rounded-2xl w-fit">
                    {areas.map(area => (
                        <button 
                            key={area}
                            onClick={() => setFinanzasAreaSeleccionada(area)}
                            className={`px-6 py-3 rounded-xl text-xs font-black uppercase transition-all ${finanzasAreaSeleccionada === area ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            {area}
                        </button>
                    ))}
                </div>

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

                {finanzasAreaSeleccionada === 'Alquileres' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t-2 border-slate-100">
                      {/* MO Edificio */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                            <Building2 size={14}/> Edificio Monroe (MO) - <span className="text-slate-400 text-[8px]">Equiv. Total ($)</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-blue-100 p-4 rounded-3xl bg-blue-50/20">
                            <StatCard title="Ingresos" val={statsFinanzasArea.agrupar.edificios.MO.ingresos} color="text-emerald-600" bg="bg-emerald-50" symbol="$" />
                            <StatCard title="Egresos" val={statsFinanzasArea.agrupar.edificios.MO.egresos} color="text-rose-600" bg="bg-rose-50" symbol="$" />
                            <StatCard title="Balance" val={statsFinanzasArea.agrupar.edificios.MO.ingresos - statsFinanzasArea.agrupar.edificios.MO.egresos} color="text-blue-800" bg="bg-blue-100" symbol="$" />
                        </div>
                      </div>
                      {/* VO Edificio */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                            <Building2 size={14}/> Edificio V. Obligado (VO) - <span className="text-slate-400 text-[8px]">Equiv. Total ($)</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-indigo-100 p-4 rounded-3xl bg-indigo-50/20">
                            <StatCard title="Ingresos" val={statsFinanzasArea.agrupar.edificios.VO.ingresos} color="text-emerald-600" bg="bg-emerald-50" symbol="$" />
                            <StatCard title="Egresos" val={statsFinanzasArea.agrupar.edificios.VO.egresos} color="text-rose-600" bg="bg-rose-50" symbol="$" />
                            <StatCard title="Balance" val={statsFinanzasArea.agrupar.edificios.VO.ingresos - statsFinanzasArea.agrupar.edificios.VO.egresos} color="text-indigo-800" bg="bg-indigo-100" symbol="$" />
                        </div>
                      </div>
                  </div>
                )}

                {/* Tabla Movimientos Área */}
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
            </div>
          )}

          {activeTab === 'Contratos' && (
             <div className="space-y-4">
                {contratos.map(c => {
                   const prop = propiedades.find(p => p.id === c.propiedadId);
                   const cli = clientes.find(cl => cl.id === c.clienteId);
                   return (
                     <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all relative group flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Izquierda: Info Principal */}
                        <div className="flex items-start md:items-center gap-4 flex-1">
                            <div className="bg-amber-50 p-3 rounded-xl hidden md:block">
                               <FileSignature className="text-amber-600" size={24} />
                            </div>
                            <div>
                               <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                 {prop ? prop.nombre : 'Propiedad Desconocida'}
                                 <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-widest">Activo</span>
                               </h3>
                               {prop && <p className="text-slate-400 text-xs font-bold uppercase mt-1"><MapPin size={12} className="inline mr-1"/>{prop.direccion}</p>}
                               {cli && <p className="text-emerald-600 text-[10px] font-black uppercase mt-1 flex items-center gap-1"><UserCircle size={10} /> Inquilino: {cli.nombre} {cli.apellido}</p>}
                            </div>
                        </div>
                        
                        {/* Centro: Fechas y Actualización */}
                        <div className="flex flex-col gap-1 md:w-64 text-sm font-bold text-slate-600">
                           <div className="flex items-center gap-2"><span className="text-[10px] font-black text-slate-400 uppercase">Inicio:</span> <span>{c.fechaInicio ? new Date(c.fechaInicio).toLocaleDateString() : '-'}</span></div>
                           <div className="flex items-center gap-2"><span className="text-[10px] font-black text-slate-400 uppercase">Act. Próx:</span> <span className="text-amber-600">{c.proximaActualizacion ? new Date(c.proximaActualizacion).toLocaleDateString() : '-'}</span></div>
                           <div className="flex items-center gap-2"><span className="text-[10px] font-black text-slate-400 uppercase">Actualiza:</span> <span>Cada {c.periodoActualizacion} meses</span></div>
                        </div>
                        
                        {/* Derecha: Financiero y Acciones */}
                        <div className="flex items-center justify-between md:justify-end gap-6 md:w-32 text-right">
                            <div className="flex-1">
                               <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Vencimiento</p>
                               <p className="text-xs font-bold text-slate-700">{c.fechaFin ? new Date(c.fechaFin).toLocaleDateString() : '-'}</p>
                            </div>
                            <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'contratos', c.id))} className="text-slate-300 hover:bg-rose-50 hover:text-rose-500 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                               <X size={18}/>
                            </button>
                        </div>
                     </div>
                   );
                })}
                {contratos.length === 0 && (
                  <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-[2rem]">
                    <FileSignature size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-bold">No hay contratos registrados.</p>
                  </div>
                )}
             </div>
          )}


          {activeTab === 'Proveedores' && (
             <div className="space-y-4">
               {proveedores.map((prov) => (
                 <div key={prov.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all relative group flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Izquierda: Info Principal */}
                      <div className="flex items-start md:items-center gap-4 flex-1">
                          <div className="bg-indigo-50 p-3 rounded-xl hidden md:block">
                             <Briefcase className="text-indigo-600" size={24} />
                          </div>
                          <div>
                             <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                               {prov.nombre}
                               <span className="text-[8px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-widest">{prov.tipo}</span>
                             </h3>
                             {prov.rubro && <p className="text-slate-400 text-xs font-bold uppercase mt-1">Rubro: {prov.rubro}</p>}
                          </div>
                      </div>
                      
                      {/* Centro: Contacto */}
                      <div className="flex flex-col gap-1 md:w-64 text-sm font-bold text-slate-600">
                         {prov.telefono && <div className="flex items-center gap-2"><Phone size={12} className="text-slate-400" /> <span>{prov.telefono}</span></div>}
                         {prov.mail && <div className="flex items-center gap-2"><Mail size={12} className="text-slate-400" /> <span className="truncate">{prov.mail}</span></div>}
                         <div className="flex items-center gap-2"><Hash size={12} className="text-slate-400" /> <span>CUIT: {prov.cuit || '-'}</span></div>
                      </div>

                      {/* Derecha: Financiero y Acciones */}
                      <div className="flex items-center justify-between md:justify-end gap-6 md:w-48 text-right">
                          <div className="flex-1">
                             <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5"><CreditCard size={10} className="inline mr-1"/> Alias / Cuenta</p>
                             <p className="text-[10px] font-mono font-bold text-slate-700 truncate">{prov.alias1 || 'No cargado'}</p>
                          </div>
                          <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'proveedores', prov.id))} className="text-slate-300 hover:bg-rose-50 hover:text-rose-500 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                             <X size={18}/>
                          </button>
                      </div>
                 </div>
               ))}
               {proveedores.length === 0 && (
                 <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-[2rem]">
                   <Users size={48} className="mx-auto text-slate-200 mb-4" />
                   <p className="text-slate-400 font-bold">No hay proveedores registrados.</p>
                 </div>
               )}
             </div>
          )}

          {activeTab === 'Obras' && (
             <div className="space-y-4">
                {obras.map(o => (
                   <div key={o.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all relative group flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      {/* Izquierda: Info Principal */}
                      <div className="flex items-start md:items-center gap-4 flex-1">
                          <div className="bg-slate-100 p-3 rounded-xl hidden md:block">
                             <HardHat className="text-slate-400" size={24} />
                          </div>
                          <div>
                             <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                               {o.nombre}
                               <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${o.estado === 'Finalizada' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{o.estado}</span>
                             </h3>
                             <p className="text-slate-400 text-xs font-bold uppercase mt-1"><MapPin size={12} className="inline mr-1"/>{o.direccion || 'Sin dirección'}</p>
                          </div>
                      </div>
                      
                      {/* Centro: Progreso */}
                      <div className="w-full md:w-48 xl:w-64 space-y-2">
                         <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
                             <span>Avance</span>
                             <span>{o.porcentajeAvance || 0}%</span>
                         </div>
                         <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${o.porcentajeAvance || 0}%` }}></div>
                         </div>
                      </div>

                      {/* Derecha: Fechas y Acciones */}
                      <div className="flex items-center justify-between md:justify-end gap-6 md:w-64">
                          <div className="text-right flex-1">
                             <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Cronograma</p>
                             <p className="text-xs font-bold text-slate-800">{o.fechaInicio && new Date(o.fechaInicio).toLocaleDateString()} <span className="text-slate-300 mx-1">→</span> {o.fechaEstimadaFin ? new Date(o.fechaEstimadaFin).toLocaleDateString() : 'TBD'}</p>
                          </div>
                          <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'obras', o.id))} className="text-slate-300 hover:bg-rose-50 hover:text-rose-500 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                             <X size={18}/>
                          </button>
                      </div>

                   </div>
                ))}
                {obras.length === 0 && (
                  <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-[2rem]">
                    <HardHat size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-bold">No hay obras registradas.</p>
                  </div>
                )}
             </div>
          )}

          {activeTab === 'Propiedades en Alquiler' && (
             <div className="space-y-4">
                {propiedades.map(p => (
                   <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all relative group flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Izquierda: Info Principal */}
                      <div className="flex items-start md:items-center gap-4 flex-1">
                          <div className="bg-blue-50 p-3 rounded-xl hidden md:block">
                             <Building2 className="text-blue-600" size={24} />
                          </div>
                          <div>
                             <h3 className="text-lg font-black text-slate-900">{p.nombre}</h3>
                             <p className="text-slate-400 text-xs font-bold uppercase mt-1"><MapPin size={12} className="inline mr-1"/>{p.direccion}</p>
                          </div>
                      </div>
                      
                      {/* Centro: Partidas */}
                      <div className="flex flex-col gap-1 md:w-64 text-sm font-bold text-slate-600">
                         <div className="flex items-center gap-2"><span className="text-[10px] font-black text-slate-400 uppercase">Partida:</span> <span>{p.partidaInmobiliaria}</span></div>
                         <div className="flex items-center gap-2"><span className="text-[10px] font-black text-slate-400 uppercase">Piso/UF:</span> <span>{p.piso} {p.depto} {p.unidadFuncional && `(${p.unidadFuncional})`}</span></div>
                      </div>

                      {/* Derecha: Acciones */}
                      <div className="flex items-center justify-end gap-6 md:w-32">
                          <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'propiedades', p.id))} className="text-slate-300 hover:bg-rose-50 hover:text-rose-500 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                             <X size={18}/>
                          </button>
                      </div>
                   </div>
                ))}
             </div>
          )}
          {activeTab === 'Clientes' && (
             <div className="space-y-4">
                {clientes.map(cl => (
                   <div key={cl.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all relative group flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Izquierda: Info Principal */}
                      <div className="flex items-start md:items-center gap-4 flex-1">
                          <div className="bg-green-50 p-3 rounded-xl hidden md:block">
                             <UserCircle className="text-green-600" size={24} />
                          </div>
                          <div>
                             <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                               {cl.nombre}
                               <span className="text-[8px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-widest">Activo</span>
                             </h3>
                             {cl.direccion && <p className="text-slate-400 text-xs font-bold uppercase mt-1"><MapPin size={12} className="inline mr-1"/>{cl.direccion}</p>}
                          </div>
                      </div>

                      {/* Centro: Contacto */}
                      <div className="flex flex-col gap-1 md:w-64 text-sm font-bold text-slate-600">
                         {cl.telefono && <div className="flex items-center gap-2"><Phone size={12} className="text-slate-400" /> <span>{cl.telefono}</span></div>}
                         {cl.mail && <div className="flex items-center gap-2"><Mail size={12} className="text-slate-400" /> <span className="truncate">{cl.mail}</span></div>}
                      </div>
                      
                      {/* Derecha: Fiscal y Acciones */}
                      <div className="flex items-center justify-between md:justify-end gap-6 md:w-48 text-right">
                          <div className="flex-1">
                             <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">CUIT</p>
                             <p className="text-xs font-bold text-slate-700">{cl.cuit || '-'}</p>
                          </div>
                          <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clientes', cl.id))} className="text-slate-300 hover:bg-rose-50 hover:text-rose-500 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                             <X size={18}/>
                          </button>
                      </div>
                   </div>
                ))}
                {clientes.length === 0 && (
                  <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-[2rem]">
                    <UserCircle size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-bold">No hay clientes registrados.</p>
                  </div>
                )}
             </div>
          )}
        </div>
      </main>

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
                    {propiedades.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.direccion})</option>)}
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
                        
                        if (['Obras', 'Alquileres', 'Oficina'].includes(formMov.area) && t === 'Egreso') {
                           nuevaCategoriaEgreso = Object.keys(egresosGlobalList)[0];
                           nuevoRubro = egresosGlobalList[nuevaCategoriaEgreso][0];
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
                
                {['Obras', 'Alquileres', 'Oficina'].includes(formMov.area) && formMov.tipo === 'Egreso' ? (
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
                
                {/* Segundo Nivel (Rubro para Egresos de Obras/Alquileres/Oficina O Concepto para Ingresos de Obras) */}
                {['Obras', 'Alquileres', 'Oficina'].includes(formMov.area) && formMov.tipo === 'Egreso' && (
                  <div className="space-y-1 animate-in fade-in slide-in-from-left-2">
                    <label className="text-[10px] font-black text-orange-500 uppercase ml-1">Rubro</label>
                    <select required value={formMov.rubro} onChange={e => setFormMov({...formMov, rubro: e.target.value, subRubro: ''})} className="w-full bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm font-black text-orange-700 outline-none">
                      {egresosGlobalList[formMov.categoriaEgreso] && egresosGlobalList[formMov.categoriaEgreso].map(sr => <option key={sr} value={sr}>{sr}</option>)}
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

                {/* Tercer Nivel dinámico para Global (Conceptos) */}
                {['Obras', 'Alquileres', 'Oficina'].includes(formMov.area) && formMov.tipo === 'Egreso' && conceptosGlobalList[formMov.categoriaEgreso] && conceptosGlobalList[formMov.categoriaEgreso][formMov.rubro] && conceptosGlobalList[formMov.categoriaEgreso][formMov.rubro].length > 0 && (
                  <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Concepto</label>
                    <select required value={formMov.subRubro} onChange={e => setFormMov({...formMov, subRubro: e.target.value})} className="w-full bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 text-sm font-black text-slate-800 outline-none">
                      <option value="">-- Seleccionar --</option>
                      {conceptosGlobalList[formMov.categoriaEgreso][formMov.rubro].map(c => <option key={c} value={c}>{c}</option>)}
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
                 !(['Obras', 'Alquileres', 'Oficina'].includes(formMov.area) && formMov.tipo === 'Egreso' && conceptosGlobalList[formMov.categoriaEgreso] && conceptosGlobalList[formMov.categoriaEgreso][formMov.rubro] && conceptosGlobalList[formMov.categoriaEgreso][formMov.rubro].length > 0) && (
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
                    {propiedades.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
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
                  onClick={handleImportAlquileres} 
                  disabled={isImporting}
                  className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all 
                  ${isImporting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5'}`}
                >
                  {isImporting ? 'Procesando...' : 'Iniciar Importación Alquileres'}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* RE-IMPLEMETACIÓN DE MODALES PREVIOS PARA CONSISTENCIA (OBRAS/PROP) */}
      {isModalObraOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden">
             <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                <h3 className="text-xl font-black italic uppercase">NUEVA OBRA</h3>
                <button onClick={() => setIsModalObraOpen(false)}><X/></button>
             </div>
             <form onSubmit={handleSaveObra} className="p-8 space-y-4">
                <input type="text" required placeholder="Nombre de Obra" value={formObra.nombre} onChange={e => setFormObra({...formObra, nombre: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
                <input type="text" required placeholder="Dirección" value={formObra.direccion} onChange={e => setFormObra({...formObra, direccion: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Fecha Inicio</label>
                     <input type="date" required value={formObra.fechaInicio} onChange={e => setFormObra({...formObra, fechaInicio: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Est. Finalización</label>
                     <input type="date" value={formObra.fechaEstimadaFin} onChange={e => setFormObra({...formObra, fechaEstimadaFin: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Avance (%)</label>
                     <input type="number" min="0" max="100" value={formObra.porcentajeAvance} onChange={e => setFormObra({...formObra, porcentajeAvance: e.target.value})} className="w-full bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm font-black text-blue-700 outline-none"/>
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Estado</label>
                     <select value={formObra.estado} onChange={e => setFormObra({...formObra, estado: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none">
                        <option value="En Proceso">En Proceso</option>
                        <option value="Finalizada">Finalizada</option>
                        <option value="Pausada">Pausada</option>
                     </select>
                   </div>
                </div>

                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black text-xs uppercase shadow-xl transition-all mt-4">Guardar Obra</button>
             </form>
          </div>
        </div>
      )}
      
      {isModalPropOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
              <div className="p-8 bg-blue-700 text-white flex justify-between items-center">
                 <h3 className="text-xl font-black italic uppercase">NUEVA PROPIEDAD</h3>
                 <button onClick={() => setIsModalPropOpen(false)}><X/></button>
              </div>
              <form onSubmit={handleSaveProp} className="p-8 space-y-4">
                 <input type="text" required placeholder="Nombre Ref." value={formProp.nombre} onChange={e => setFormProp({...formProp, nombre: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
                 <input type="text" required placeholder="Dirección" value={formProp.direccion} onChange={e => setFormProp({...formProp, direccion: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
                 <div className="grid grid-cols-3 gap-4">
                    <input type="text" placeholder="Piso" value={formProp.piso} onChange={e => setFormProp({...formProp, piso: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
                    <input type="text" placeholder="Depto" value={formProp.depto} onChange={e => setFormProp({...formProp, depto: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
                    <input type="text" placeholder="UF" value={formProp.unidadFuncional} onChange={e => setFormProp({...formProp, unidadFuncional: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Partida Inmobiliaria</label>
                    <input type="text" placeholder="Número de Partida" value={formProp.partidaInmobiliaria} onChange={e => setFormProp({...formProp, partidaInmobiliaria: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"/>
                 </div>
                 <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black text-xs shadow-xl transition-all mt-4 uppercase">Guardar Propiedad</button>
              </form>
           </div>
        </div>
      )}

      {/* Modal Nuevo Cliente */}
      {isModalClienteOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-green-600 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black flex items-center gap-2 uppercase tracking-tighter italic">NUEVO CLIENTE</h3>
                <p className="text-green-200 text-[10px] font-black uppercase tracking-widest mt-1">Directorio comercial</p>
              </div>
              <button onClick={() => setIsModalClienteOpen(false)} className="hover:rotate-90 transition-transform"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveCliente} className="p-8 space-y-4">
               <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-2">Nombre / Razón Social *</label>
                  <input required value={formCliente.nombre} onChange={e=>setFormCliente({...formCliente, nombre: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-green-500" placeholder="Ej: Perez Constructora" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-2">CUIT</label>
                    <input value={formCliente.cuit} onChange={e=>setFormCliente({...formCliente, cuit: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" placeholder="Opcional" />
                 </div>
                 <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-2">Teléfono</label>
                    <input value={formCliente.telefono} onChange={e=>setFormCliente({...formCliente, telefono: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" placeholder="Opcional" />
                 </div>
               </div>
               <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-2">Email</label>
                  <input value={formCliente.mail} onChange={e=>setFormCliente({...formCliente, mail: e.target.value})} type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" placeholder="Opcional" />
               </div>
               <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-2">Dirección</label>
                  <input value={formCliente.direccion} onChange={e=>setFormCliente({...formCliente, direccion: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" placeholder="Opcional" />
               </div>
               <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-xl transition-all mt-6">Guardar Cliente</button>
            </form>
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
    <div className={`p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1 transition-all hover:shadow-md ${bg}`}>
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
      <p className={`text-base font-black ${color} truncate`}>
        {symbol} {numericVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}
