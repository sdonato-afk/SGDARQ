import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  signOut,
  signInAnonymously,
  onAuthStateChanged
} from 'firebase/auth';
import { app, auth, db, appId } from './config/firebase';
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
  Landmark,
  ChevronRight,
  ChevronLeft,
  Bell,
  Receipt,
  Settings 
} from 'lucide-react';
import ReconciliarModal from './components/ReconciliarModal';
import ModalCobro from './components/ModalCobro';
import SolicitudesPanel from './components/SolicitudesPanel';
import ModalSolicitud from './components/ModalSolicitud';

import ModalMovimiento from './modules/finanzas/modals/ModalMovimiento';
import ModalContrato from './modules/entidades/modals/ModalContrato';
import ModalObra from './modules/entidades/modals/ModalObra';
import ModalPropiedad from './modules/entidades/modals/ModalPropiedad';
import ModalProveedor from './modules/entidades/modals/ModalProveedor';
import ModalCliente from './modules/entidades/modals/ModalCliente';
import InboxTickets from './gestion/InboxTickets';
import { useFinanzasGlobal }     from './hooks/useFinanzasGlobal';
import { useFinanzasArea }       from './hooks/useFinanzasArea';
import { useResumenDetalle }     from './hooks/useResumenDetalle';
import { useCobrosPendientes }   from './hooks/useCobrosPendientes';
import { useImportETL }          from './hooks/useImportETL';
import ImportSpreadsheetModal    from './components/ImportSpreadsheetModal';
import {
  convertToUSD as _convertToUSD,
  normalizeYearMonth,
  normalizeDate,
  parseMontoImport,
  calcularFechasContrato,
} from './helpers/financieros';

import { useFirebaseData } from './hooks/useFirebaseData';
import Oficina from './areas/Oficina';
import Directorio from './areas/Directorio';
import AreaObras from './areas/AreaObras';
import AreaAlquileres from './areas/AreaAlquileres';
import Resumen from './gestion/Resumen';
import Contratos from './gestion/Contratos';
import Proveedores from './gestion/Proveedores';
import Clientes from './gestion/Clientes';
import TaxonomiaMaestra from './admin/TaxonomiaMaestra';
import Obras from './gestion/Obras';
import Propiedades from './gestion/Propiedades';
import Asientos from './gestion/Asientos';
import Tesoreria from './gestion/Tesoreria';
import Contabilidad from './contabilidad/Contabilidad';
import { DarqSidebar } from '@darq/ui';

import { categoriasFinancieras, rubrosDirectorio, conceptosDirectorio, ingresosObrasList, egresosGlobalList, conceptosGlobalList, ingresosOficinaList, egresosOficinaList, conceptosOficinaList } from './config/taxonomiaEstatica';


function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'superadmin' | 'admin_general' | 'admin_alquileres' | 'director'
  const [userData, setUserData] = useState(null); // Full user data from Firestore
  const [isSolicitudesPanelOpen, setIsSolicitudesPanelOpen] = useState(false);
  const [solicitudModal, setSolicitudModal] = useState(null); // { mov, tipo, campo, valorActual }
  const [activeTab, setActiveTab] = useState('Resumen');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { movimientos, obras, propiedades, proveedores, clientes, contratos, vencimientos, solicitudes, inboxTickets } = useFirebaseData(user);
  
  // Modales
  const [isModalMovOpen, setIsModalMovOpen] = useState(false);
  const [isModalCobroOpen, setIsModalCobroOpen] = useState(false);
  const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false);
  const [isModalObraOpen, setIsModalObraOpen] = useState(false);
  const [isModalPropOpen, setIsModalPropOpen] = useState(false);
  const [isModalProvOpen, setIsModalProvOpen] = useState(false);
  const [isModalContratoOpen, setIsModalContratoOpen] = useState(false);
  const [isModalClienteOpen, setIsModalClienteOpen] = useState(false);

  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [clearArea, setClearArea] = useState(null);
  const [directorDetalle, setDirectorDetalle] = useState(null);
  const [showDirSeb, setShowDirSeb] = useState(true);
  const [isReconciliarOpen, setIsReconciliarOpen] = useState(false);
  const [importModalArea, setImportModalArea] = useState(null); // null = cerrado

  // Estado Transferencias — movido a Resumen.jsx
  // Estado Vencimientos — movido a Resumen.jsx
  // isImportDropdownOpen — movido a Resumen.jsx

  // States de Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [cotizacionBlue, setCotizacionBlue] = useState(1250);
  const [cotizacionCompra, setCotizacionCompra] = useState(null);
  const [cotizacionVenta, setCotizacionVenta] = useState(null);
  const [cotizacionUpdated, setCotizacionUpdated] = useState(null);
  useEffect(() => {
    fetch('https://dolarapi.com/v1/dolares/blue')
      .then(r => r.json())
      .then(data => {
        if (data.compra) setCotizacionCompra(data.compra);
        if (data.venta) setCotizacionVenta(data.venta);
        const promedio = data.compra && data.venta ? Math.round((data.compra + data.venta) / 2) : data.venta || 1250;
        setCotizacionBlue(promedio);
        setCotizacionUpdated(data.fechaActualizacion || new Date().toISOString());
      })
      .catch(() => {});
  }, []);
  const [resumenDetalleArea, setResumenDetalleArea] = useState('Obras');
  const [finanzasSubNivel, setFinanzasSubNivel] = useState('Edificios'); // 'Edificios' | 'Detalle'
  const [edificioSeleccionado, setEdificioSeleccionado] = useState(null); // 'MO' | 'VO' | null
  const [finanzasItemSeleccionado, setFinanzasItemSeleccionado] = useState(null); // ID de Obra, Nombre de Director o Categoria

  // ── State moved to child components: ──
  // AreaObras: selectedObraId, obrasView, reporteObraId, reporteObraSearch, showObrasIng/Egr, etc.
  // AreaAlquileres: alqView, alqChartEdificio, liquidacionMes/Anio, rentPeriodo, balanceAnioVO/MO, etc.
  // Asientos: asientosPage, asientosEditCell, bdAreaFilter, bdFilters
  const areas = ['Obras', 'Alquileres', 'Oficina', 'Directorio', 'Sistema'];
  const directores = ['Sebastián', 'Emiliano', 'Santiago', 'Florencia'];
  const cajas = ['Caja Dólares', 'Caja Pesos', 'Banco Amecon', 'Banco Blue', 'MP Amecon', 'MP Blue'];
  
  // Estados Ligeros de Navegación (Para pre-llenar modales al abrirlos)
  const [formMov, setFormMov] = useState({});
  const [formObra, setFormObra] = useState(null);
  const [formProp, setFormProp] = useState(null);
  const [formProv, setFormProv] = useState(null);
  const [formContrato, setFormContrato] = useState(null);
  const [editingMovId, setEditingMovId] = useState(null);
  const [editingObraId, setEditingObraId] = useState(null);


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





  // ── HOOKS DE DOMINIO ── KPIs financieros (extraídos de App.jsx a hooks dedicados)
  const stats = useFinanzasGlobal(movimientos, obras, contratos, propiedades, cotizacionBlue);

  const statsFinanzasArea = useFinanzasArea(
    movimientos, propiedades,
    finanzasAreaSeleccionada, cotizacionBlue,
    finanzasSubNivel, finanzasItemSeleccionado, edificioSeleccionado
  );

  const statsResumenDetalle = useResumenDetalle(
    movimientos, obras, propiedades, resumenDetalleArea, cotizacionBlue
  );

  const cobrosPendientes = useCobrosPendientes(
    movimientos, contratos, propiedades, clientes, finanzasAreaSeleccionada
  );

  // ─── IMPORTADORES ETL ───
  const { importText, setImportText, isImporting, importProgress, handleImport } = useImportETL(
    { obras, proveedores, clientes, propiedades, contratos, movimientos, cotizacionBlue }
  );

  const handleSaveCobro = async (cobros) => {
    try {
      for (const cobro of cobros) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'movimientos'), {
          ...cobro, tipoOperacion: 'cobro_alquiler',
          createdAt: new Date().toISOString()
        });
      }
      setIsModalCobroOpen(false);
    } catch (err) { console.error('Error guardando cobro:', err); }
  };

  const handleEditMov = (m) => {
    setFormMov(m);
    setEditingMovId(m.id);
    setIsModalMovOpen(true);
  };

  const handleEditObra = (o) => {
    setFormObra(o);
    setEditingObraId(o.id);
    setIsModalObraOpen(true);
  };

  // handleSaveCliente → migrado a ModalCliente.jsx (autónomo con UI Library)


  // ─── IMPORTADORES: lógica migrada a useImportETL ───



  // ─── BORRADO MASIVO: lógica migrada a useImportETL ───

  // ── Menu items por rol ──
  const allMenuItems = [
    { id: 'Resumen',         icon: LayoutDashboard, label: 'Inicio',      type: 'main',  roles: ['superadmin', 'admin_general', 'admin_alquileres', 'director'] },
    { id: 'Inbox_Tickets',   icon: Receipt,         label: 'Inbox Tickets', type: 'main',  roles: ['superadmin', 'admin_general', 'admin_alquileres', 'director'] },
    { id: 'Tesoreria',       icon: Wallet,          label: 'Tesorería',   type: 'main',  roles: ['superadmin', 'director'] },
    { id: 'Contabilidad',    icon: Receipt,         label: 'Contabilidad', type: 'main',  roles: ['superadmin', 'admin_general'] },
    { id: 'Area_Obras',      icon: HardHat,         label: 'Obras',       type: 'area',  roles: ['superadmin', 'admin_alquileres', 'director'] },
    { id: 'Area_Alquileres', icon: Building2,       label: 'Alquileres',  type: 'area',  roles: ['superadmin', 'admin_alquileres', 'director'] },
    { id: 'Area_Oficina',    icon: Briefcase,       label: 'Oficina',     type: 'area',  roles: ['superadmin', 'director'] },
    { id: 'Area_Directorio', icon: Landmark,        label: 'Directorio',  type: 'area',  roles: ['superadmin', 'director'] },
    { id: 'Configuracion',   icon: Settings,        label: 'Configuración', type: 'main', roles: ['superadmin'] }
  ];
  const [isDbOpen, setIsDbOpen] = useState(false);

  const menuItemsLists = [
    { id: 'Asientos', icon: FileText, label: 'Asientos' },
    { id: 'Obras', icon: HardHat, label: 'Lista Obras' },
    { id: 'Propiedades en Alquiler', icon: Building2, label: 'Propiedades' },
    { id: 'Contratos', icon: FileSignature, label: 'Contratos' },
    { id: 'Proveedores', icon: Users, label: 'Proveedores' },
    { id: 'Clientes', icon: UserCircle, label: 'Clientes' },
  ];

  const menuItems = allMenuItems.filter(item => !userRole || item.roles.includes(userRole));

  // Helper: permisos por rol
  const canEdit   = userRole === 'superadmin';               // editar celdas inline
  const canDelete = userRole === 'superadmin';               // borrar directamente
  const canLoad   = ['superadmin', 'admin_general', 'admin_alquileres'].includes(userRole);
  const isReadOnly = userRole === 'director' || userRole === 'admin_general' || userRole === 'admin_alquileres';
  // Área permitida para carga de movimientos (null = todas)
  const areaPermitida = userRole === 'admin_alquileres' ? 'Alquileres' : null;

  // --- Funciones de Autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Buscar el rol en la colección usuarios usando el UID como ID del documento
        try {
          const { getDoc } = await import('firebase/firestore');
          const userDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserRole(data.rol);
            setUserData(data);
          } else {
            // Usuario autenticado pero sin registro en la colección usuarios
            console.warn('Usuario sin rol asignado:', currentUser.email);
            setUserRole('director'); // Por defecto solo lectura
            setUserData({ nombre: currentUser.email, rol: 'director' });
          }
        } catch (e) {
          console.error('Error obteniendo rol:', e);
          setUserRole('director'); // Fallback seguro: solo lectura
          setUserData(null);
        }
      } else {
        setUserRole(null);
        setUserData(null);
      }
    });
    return () => unsubscribe();
  }, []);

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
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', position: 'relative', overflow: 'hidden' }}>
        {/* Capas de fondo */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at top left, rgba(16,185,129,0.08) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '-6rem', left: '-6rem', width: '24rem', height: '24rem', background: 'rgba(16,185,129,0.06)', borderRadius: '50%', filter: 'blur(48px)', pointerEvents: 'none' }} />

        <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: 420, borderRadius: 24, padding: '2.5rem', position: 'relative', zIndex: 10 }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 8px 24px rgba(16,185,129,0.25)' }}>
              <Lock className="text-white" size={30} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', fontStyle: 'italic', textTransform: 'uppercase', marginBottom: 8 }}>NESS<span style={{ color: 'var(--accent)' }}>.</span></h1>
            <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3em' }}>GESTIÓN ESTRATÉGICA</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Usuario Administrador</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="glass-input"
                style={{ width: '100%', borderRadius: 14, padding: '14px 18px', fontSize: 13, fontWeight: 600 }}
                placeholder="admin@ness.com"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="glass-input"
                style={{ width: '100%', borderRadius: 14, padding: '14px 18px', fontSize: 13, fontWeight: 600 }}
                placeholder="••••••••"
                required
              />
            </div>

            {authError && <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', textAlign: 'center' }}>{authError}</p>}

            <button
              type="submit"
              disabled={isLoggingIn}
              style={{
                width: '100%', padding: '14px', borderRadius: 14,
                fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em',
                color: '#fff', border: 'none', cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                background: isLoggingIn ? 'rgba(255,255,255,0.05)' : 'var(--accent)',
                boxShadow: isLoggingIn ? 'none' : '0 4px 20px rgba(16,185,129,0.30)',
                transition: 'var(--transition)', marginTop: 4,
              }}
            >
              {isLoggingIn ? 'Verificando...' : 'Entrar al Sistema'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const menuGroups = [
    {
      title: 'OPERACIÓN',
      items: menuItems.filter(i => i.type === 'main')
    },
    {
      title: 'ÁREAS DE NEGOCIO',
      items: menuItems.filter(i => i.type === 'area')
    },
    {
      title: 'BASE DE DATOS',
      items: menuItemsLists
    }
  ];

  const externalLinks = [
    { label: 'Agenda de Gestión', url: import.meta.env.DEV ? 'http://localhost:5175' : 'https://sg-darq.web.app/agenda/',     icon: Calendar  },
    { label: 'Obras Client',      url: import.meta.env.DEV ? 'http://localhost:5174' : 'https://sg-darq.web.app/obras/',      icon: HardHat   },
    { label: 'Inspección Campo',  url: import.meta.env.DEV ? 'http://localhost:5176' : 'https://sg-darq.web.app/inspeccion/', icon: HardHat },

  ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-sans)', overflow: 'hidden', position: 'relative' }}>
      <div className="absolute inset-0 z-0"></div>
      <div className="hidden"></div>
      
      <DarqSidebar
        appName="Administración"
        appAccent="emerald"
        menuGroups={menuGroups}
        activeTab={activeTab}
        onTabSelect={(id) => { setActiveTab(id); setDirectorDetalle(null); }}
        user={user}
        onLogout={() => signOut(auth)}
        externalLinks={externalLinks}
        mobileOpen={isSidebarOpen}
        onMobileClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content */}
      <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10, minWidth: 0 }}>
        <header style={{
          padding: '0.75rem 1.5rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, zIndex: 20,
          background: 'rgba(6,8,17,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Hamburger — solo visible en mobile */}
            <button
              className="md:hidden"
              style={{ padding: '6px 8px', borderRadius: 8, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border)', transition: 'var(--transition)', cursor: 'pointer' }}
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Abrir menú"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                {activeTab.replace('Area_', '')}
              </h2>
            </div>
            {/* Search Bar */}
            <div className="relative hidden md:block">
              <input type="text" placeholder="Buscar... (Ctrl+K)" style={{ width: 280, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 16px', fontSize: 13, color: 'var(--text-muted)', outline: 'none' }} readOnly />
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>⌘K</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Campana de notificaciones */}
            {userRole === 'superadmin' && (
              <button
                onClick={() => setIsSolicitudesPanelOpen(true)}
                style={{ position: 'relative', padding: 7, borderRadius: 8, color: 'var(--text-muted)', background: 'transparent', border: '1px solid transparent', transition: 'var(--transition)', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <Bell size={18} />
                {solicitudes.filter(s => s.estado === 'pendiente').length > 0 && (
                  <span style={{ position: 'absolute', top: -2, right: -2, background: 'var(--red)', color: '#fff', fontSize: 8, fontWeight: 800, minWidth: 16, height: 16, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                    {solicitudes.filter(s => s.estado === 'pendiente').length}
                  </span>
                )}
              </button>
            )}
            {/* Campana de Inbox Tickets */}
            {['superadmin', 'director', 'admin_general'].includes(userRole) && (
              <button
                onClick={() => setActiveTab('Inbox_Tickets')}
                style={{ position: 'relative', padding: 7, borderRadius: 8, color: 'var(--text-muted)', background: 'transparent', border: '1px solid transparent', transition: 'var(--transition)', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <Receipt size={18} />
                {inboxTickets?.filter(t => t.estado === 'pendiente').length > 0 && (
                  <span style={{ position: 'absolute', top: -2, right: -2, background: 'var(--indigo, #6366f1)', color: '#fff', fontSize: 8, fontWeight: 800, minWidth: 16, height: 16, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                    {inboxTickets.filter(t => t.estado === 'pendiente').length}
                  </span>
                )}
              </button>
            )}
            {/* Cotización */}
            <div className="hidden sm:flex" style={{ alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
              <TrendingUp size={14} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>USD/ARS</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)' }}>$ {cotizacionBlue}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800 }}>{userData?.nombre?.[0] || 'U'}</div>
              <div className="hidden lg:block">
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{userData?.nombre || 'Usuario'}</p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{userRole === 'superadmin' ? 'Super Admin' : userRole === 'admin_general' ? 'Admin General' : userRole === 'admin_alquileres' ? 'Admin Alquileres' : 'Director'}</p>
              </div>
            </div>
            <button
              onClick={() => handleLogout()}
              style={{ padding: 7, borderRadius: 8, color: 'var(--text-dim)', background: 'transparent', border: '1px solid transparent', transition: 'var(--transition)', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-bg)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 px-4 md:px-8 pb-8 overflow-y-auto custom-scrollbar">
          {activeTab === 'Area_Obras' && (
            <AreaObras
              movimientos={movimientos}
              obras={obras}
              proveedores={proveedores}
              cotizacionBlue={cotizacionBlue}
              setFormMov={setFormMov}
              setIsModalMovOpen={setIsModalMovOpen}
              formMov={formMov}
              handleEditObra={handleEditObra}
              userRole={userRole}
              canEdit={canEdit}
              canLoad={canLoad}
              isReadOnly={isReadOnly}
            />
          )}



          {activeTab === 'Area_Alquileres' && (
            <AreaAlquileres
              movimientos={movimientos}
              propiedades={propiedades}
              clientes={clientes}
              contratos={contratos}
              proveedores={proveedores}
              cotizacionBlue={cotizacionBlue}
              setFormMov={setFormMov}
              setIsModalMovOpen={setIsModalMovOpen}
              formMov={formMov}
              setIsModalCobroOpen={setIsModalCobroOpen}
              userRole={userRole}
              canEdit={canEdit}
              canLoad={canLoad}
              isReadOnly={isReadOnly}
            />
          )}

          {activeTab === 'Inbox_Tickets' && (
            <InboxTickets 
              tickets={inboxTickets || []} 
              onContabilizar={(ticket) => {
                const provMatch = proveedores.find(p => p.nombre.toLowerCase().includes((ticket.proveedor || '').toLowerCase()));
                const d = ticket.createdAt && typeof ticket.createdAt.toDate === 'function' ? ticket.createdAt.toDate() : new Date();
                setFormMov({
                  area: 'Obras', // Obras por defecto ya que vienen del inspector
                  tipo: 'Egreso',
                  moneda: 'ARS',
                  caja: 'Caja Pesos',
                  monto: ticket.monto || '',
                  obraId: ticket.obraId || '',
                  proveedorId: provMatch ? provMatch.id : '',
                  concepto: ticket.nota || '',
                  fecha: d.toISOString().split('T')[0],
                  ticketInboxId: ticket.id,
                  ticketUrl: ticket.fotoUrl
                });
                setIsModalMovOpen(true);
              }}
            />
          )}

          {activeTab === 'Resumen' && (
            <Resumen
              movimientos={movimientos}
              vencimientos={vencimientos}
              cotizacionBlue={cotizacionBlue}
              cotizacionCompra={cotizacionCompra}
              cotizacionVenta={cotizacionVenta}
              cotizacionUpdated={cotizacionUpdated}
              stats={stats}
            onOpenMovimiento={canLoad ? () => {
                if (areaPermitida) setFormMov(prev => ({ ...prev, area: areaPermitida }));
                setIsModalMovOpen(true);
              } : undefined}
              onOpenCobro={canLoad ? () => setIsModalCobroOpen(true) : undefined}
              onOpenImportar={canLoad ? (area) => {
                // 'General' (desde el botón de Resumen) → abre Obras por defecto
                const mapped = area === 'General' ? 'Obras' : area;
                setImportModalArea(mapped);
              } : undefined}
              userRole={userRole}
              canLoad={canLoad}
              isReadOnly={isReadOnly}
              inboxTickets={inboxTickets}
              onOpenInbox={() => setActiveTab('Inbox_Tickets')}
            />
          )}

          {activeTab === 'Area_Oficina' && (
            <Oficina
              movimientos={movimientos}
              proveedores={proveedores}
              cotizacionBlue={cotizacionBlue}
            />
          )}

          {activeTab === 'Area_Directorio' && (
            <Directorio
              movimientos={movimientos}
              cotizacionBlue={cotizacionBlue}
            />
          )}


          {activeTab === 'Tesoreria' && (
            <Tesoreria
              movimientos={movimientos}
              obras={obras}
              propiedades={propiedades}
              proveedores={proveedores}
              cotizacionBlue={cotizacionBlue}
              userRole={userRole}
            />
          )}

          {activeTab === 'Contabilidad' && (
            <Contabilidad />
          )}


          {activeTab === 'Proveedores' && (
            <Proveedores proveedores={proveedores} userRole={userRole} />
          )}

          {activeTab === 'Asientos' && (
            <Asientos
              movimientos={movimientos}
              obras={obras}
              propiedades={propiedades}
              clientes={clientes}
              proveedores={proveedores}
              contratos={contratos}
              ingresosObrasList={ingresosObrasList}
              cotizacionBlue={cotizacionBlue}

              userRole={userRole}
              canEdit={canEdit}
              canDelete={canDelete}
              isReadOnly={isReadOnly}
            />
          )}





          {activeTab === 'Obras' && (
            <Obras obras={obras} movimientos={movimientos} userRole={userRole} />
          )}

          {activeTab === 'Propiedades en Alquiler' && (
            <Propiedades
              propiedades={propiedades}
              onAgregarPropiedad={(datos) => { setFormProp(datos); setIsModalPropOpen(true); }}
              userRole={userRole}
            />
          )}

          {activeTab === 'Clientes' && (
            <Clientes clientes={clientes} userRole={userRole} />
          )}

          {activeTab === 'Contratos' && (
            <Contratos
              contratos={contratos}
              propiedades={propiedades}
              clientes={clientes}
              onNuevoContrato={canEdit ? () => setIsModalContratoOpen(true) : undefined}
              userRole={userRole}
            />
          )}

          {activeTab === 'Configuracion' && (
             <TaxonomiaMaestra />
          )}


      {/* MODAL CONTRATO */}
      <ModalContrato open={isModalContratoOpen} onClose={() => setIsModalContratoOpen(false)} initialData={formContrato} propiedades={propiedades} clientes={clientes} calcularFechasContrato={calcularFechasContrato}/>
      {/* MODAL OBRA */}
      <ModalObra open={isModalObraOpen} onClose={() => {setIsModalObraOpen(false); setEditingObraId(null);}} initialData={formObra} editingObraId={editingObraId}/>
      {/* MODAL PROPIEDAD */}
      <ModalPropiedad open={isModalPropOpen} onClose={() => setIsModalPropOpen(false)} initialData={formProp} />
      {/* MODAL MOVIMIENTO */}
      <ModalMovimiento open={isModalMovOpen} onClose={() => setIsModalMovOpen(false)} initialData={formMov} areas={areas} areaPermitida={areaPermitida} cajas={cajas} directores={directores} proveedores={proveedores} obras={obras} propiedades={propiedades} clientes={clientes} contratos={contratos} cotizacionBlue={cotizacionBlue} />

      {/* MODAL NUEVO PROVEEDOR */}
      <ModalProveedor open={isModalProvOpen} onClose={() => setIsModalProvOpen(false)} initialData={formProv} tiposProv={tiposProv}/>
      {/* MODAL CLIENTE */}
      <ModalCliente open={isModalClienteOpen} onClose={() => setIsModalClienteOpen(false)} />

      {/* MODAL IMPORTAR SPREADSHEET */}
      <ImportSpreadsheetModal
        open={!!importModalArea}
        area={importModalArea || 'Obras'}
        importText={importText}
        onChangeText={setImportText}
        onImport={() => handleImport(importModalArea, () => setImportModalArea(null))}
        onClose={() => setImportModalArea(null)}
        isImporting={isImporting}
        importProgress={importProgress}
      />




        </div>
      </main>


      <ReconciliarModal
        isOpen={isReconciliarOpen}
        onClose={() => setIsReconciliarOpen(false)}
        context={{ db, appId, movimientos, propiedades, obras, proveedores, clientes, contratos }}
      />
      <ModalCobro
        open={isModalCobroOpen}
        onClose={() => setIsModalCobroOpen(false)}
        onSave={handleSaveCobro}
        propiedades={propiedades}
        contratos={contratos}
        clientes={clientes}
        movimientos={movimientos}
        cotizacionBlue={cotizacionBlue}
      />
      <SolicitudesPanel
        solicitudes={solicitudes}
        movimientos={movimientos}
        userData={userData}
        isOpen={isSolicitudesPanelOpen}
        onClose={() => setIsSolicitudesPanelOpen(false)}
      />
      {solicitudModal && (
        <ModalSolicitud
          mov={solicitudModal.mov}
          tipo={solicitudModal.tipo}
          campo={solicitudModal.campo}
          valorActual={solicitudModal.valorActual}
          userData={userData}
          userUid={user?.uid}
          onClose={() => setSolicitudModal(null)}
        />
      )}
    </div>
  );
}

function StatCard({ title, val, color, bg, symbol }) {
  const isInvalid = val === undefined || val === null || isNaN(val);
  const numericVal = isInvalid ? 0 : Number(val);

  return (
    <div className="glass-card p-6 rounded-xl border-white/5 flex flex-col gap-2 transition-all hover:bg-white/[0.03] group">
      <p className="darq-label group-hover:text-slate-400 transition-colors">{title}</p>
      <p className={`text-xl font-black ${color} tracking-tighter truncate`}>
        {symbol} {numericVal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </p>
    </div>
  );
}

export default App;
