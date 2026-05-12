import React, { useState, useEffect } from 'react';
import { doc, getDoc, getDocFromServer } from 'firebase/firestore';
import { db, OBRAS_COL } from '../config/firebase.js';
import { sanitizarConfig, filtrarHonorariosCliente } from '../lib/security.js';
import { AlertCircle, HardHat, TrendingUp, FileUp, ClipboardList, Wallet, Archive, DollarSign, Package, ShoppingBag, Camera, Menu, X } from 'lucide-react';
import { useResumenFinanciero } from '../hooks/useResumenFinanciero.js';
import { useOrdenesCambio, useFotos, useGastosCliente } from '../hooks/useObras.js';

// Tabs del cliente
import TabResumen        from './tabs/TabResumen.jsx';
import TabPagos          from './tabs/TabPagos.jsx';
import TabCertificaciones from './tabs/TabCertificaciones.jsx';
import TabHonorarios     from './tabs/TabHonorarios.jsx';
import TabAcopios        from './tabs/TabAcopios.jsx';
import TabCajaChica      from './tabs/TabCajaChica.jsx';
import TabAdicionales    from './tabs/TabAdicionales.jsx';
import TabFotos          from './tabs/TabFotos.jsx';
import TabMisGastos      from './tabs/TabMisGastos.jsx';
import { fmt } from '../lib/calculadora.jsx';

// ─── Entry point ──────────────────────────────────────────────────────────────
export default function ClienteApp({ obraIdParam, token }) {
  const [obraId,    setObraId]    = useState(null);
  const [config,    setConfig]    = useState(null);
  const [rawConfig, setRawConfig] = useState(null);
  const [obraMain,  setObraMain]  = useState(null);
  const [error,     setError]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('resumen');
  const [showPagos, setShowPagos] = useState(false);

  useEffect(() => {
    let mounted = true;

    const timeoutPromise = (ms) => new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Firebase timeout (se colgó esperando respuesta)')), ms)
    );

    const resolve = async () => {
      try {
        const configRef  = doc(db, OBRAS_COL, obraIdParam);
        console.log("Fetching configRef from server...");
        const configSnap = await Promise.race([getDocFromServer(configRef), timeoutPromise(8000)]);
        console.log("configSnap received");

        if (!configSnap.exists()) { setError('Obra no encontrada o acceso no autorizado'); setLoading(false); return; }
        const cfg = configSnap.data();
        if (cfg.token_cliente !== token) { setError('Obra no encontrada o acceso no autorizado'); setLoading(false); return; }
        
        if (mounted) {
          setObraId(configSnap.id);
          setRawConfig(cfg);
          setConfig(sanitizarConfig(cfg));
        }

        const obraRef  = doc(db, 'artifacts', 'sg-darq', 'public', 'data', 'obras', obraIdParam);
        console.log("Fetching obraRef from server...");
        const obraSnap = await Promise.race([getDocFromServer(obraRef), timeoutPromise(8000)]);
        console.log("obraSnap received");

        if (obraSnap.exists() && mounted) setObraMain({ id: obraSnap.id, ...obraSnap.data() });
        
        if (mounted) setLoading(false);
      } catch (e) {
        console.error('Error in ClienteApp:', e);
        if (mounted) {
          setError('Error de conexión con la base de datos: ' + e.message);
          setLoading(false);
        }
      }
    };
    resolve();
    return () => { mounted = false; };
  }, [obraIdParam, token]);

  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen msg={error} />;

  return (
    <ClientePortal
      obraId={obraId} config={config} rawConfig={rawConfig} obraMain={obraMain}
      activeTab={activeTab} setActiveTab={setActiveTab}
      showPagos={showPagos} setShowPagos={setShowPagos}
    />
  );
}

// ─── Portal principal ─────────────────────────────────────────────────────────
function ClientePortal({ obraId, config, rawConfig, obraMain, activeTab, setActiveTab, showPagos, setShowPagos }) {
  const R = useResumenFinanciero(obraId, rawConfig);
  const { ordenes, aprobar } = useOrdenesCambio(obraId);
  const { fotos }            = useFotos(obraId);
  const { gastos: gastosCliente, add: addGasto, remove: removeGasto } = useGastosCliente(obraId);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { facturas, certificaciones, honorarios, rendiciones, acopios } = R.raw;
  const tc = R.tc;

  const honClienteSafe = filtrarHonorariosCliente(honorarios);
  const factSinContrat = facturas.filter(f => !f.contratista_id);
  const totalDeudaActual = R.jueves.totalARS;

  // Historial de pagos unificado
  const honIds  = new Set(R.hon.cobros.map(m => m.id));
  const adicIds = new Set(R.adic.pagos.map(m => m.id));
  const historialPagos = [
    ...R.hon.cobros.map(m => ({ id: m.id, fecha: m.fecha || '', tipo: 'Honorarios D+ARQ',       detalle: m.concepto || 'Cobro de honorarios',                                              monto: parseFloat(m.monto) || 0, moneda: m.moneda || 'ARS', color: '#818cf8' })),
    ...R.adic.pagos.filter(m => !honIds.has(m.id)).map(m => ({ id: m.id, fecha: m.fecha || '', tipo: 'Adicionales',             detalle: m.concepto || 'Pago adicional',                 monto: parseFloat(m.monto) || 0, moneda: m.moneda || 'ARS', color: '#f59e0b' })),
    ...R.paCuenta.items.filter(m => !honIds.has(m.id) && !adicIds.has(m.id)).map(m => ({ id: m.id, fecha: m.fecha || '', tipo: 'Pago a Cuenta',          detalle: m.concepto || m.descripcion || 'Pago a cuenta', monto: parseFloat(m.monto) || 0, moneda: m.moneda || 'ARS', color: '#34d399' })),
    ...certificaciones.filter(c => c.pago_cliente_estado === 'pagado').map(c => ({ id: c.id, fecha: c.pago_cliente_fecha || c.fecha_pago || c.fecha || '', tipo: 'Certificado Contratista', detalle: `${c.contratista_nombre || c.descripcion || ''} ${c.periodo ? `(${c.periodo})` : ''}`.trim(), monto: (parseFloat(c.total_sin_iva) || 0) + (parseFloat(c.iva_monto) || 0), moneda: 'ARS', color: '#38bdf8' })),
    ...acopios.map(a => ({ id: a.id, fecha: a.fecha_compra || '', tipo: 'Acopio de Material', detalle: a.material || a.taxonomia_rubro_nombre || a.taxonomia_categoria_nombre || 'Material', monto: (parseFloat(a.cantidad_comprada) || 0) * (parseFloat(a.precio_unitario) || 0), moneda: a.moneda || 'ARS', color: '#f97316' })),
    ...factSinContrat.filter(f => f.pagado).map(f => ({ id: f.id, fecha: f.fecha || '', tipo: 'Pago Directo', detalle: f.razon_social || f.proveedor || f.notas || 'Proveedor', monto: parseFloat(f.monto) || 0, moneda: f.moneda || 'ARS', color: '#94a3b8' })),
  ].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  const pendientesAprobacion = ordenes.filter(o => o.estado === 'pendiente');

  const TABS = [
    { id: 'resumen',          label: 'Dashboard',      Icon: TrendingUp },
    { id: 'pagos',            label: 'Pagos Directos', Icon: FileUp },
    { id: 'certificaciones',  label: 'Certificados',   Icon: ClipboardList },
    { id: 'honorarios',       label: 'Honorarios',     Icon: Wallet },
    { id: 'acopios',          label: 'Acopios',        Icon: Archive },
    { id: 'caja_chica',       label: 'Caja Chica',     Icon: DollarSign },
    { id: 'adicionales',      label: `Adicionales${pendientesAprobacion.length > 0 ? ` (${pendientesAprobacion.length})` : ''}`, Icon: Package },
    { id: 'mis_gastos',       label: `Mis Gastos${gastosCliente.length > 0 ? ` (${gastosCliente.length})` : ''}`, Icon: ShoppingBag },
    { id: 'fotos',            label: 'Bitácora',       Icon: Camera },
  ];

  const handleTabSelect = (id) => { setActiveTab(id); setSidebarOpen(false); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#030408', color: '#e2e8f0', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Overlay mobile ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, backdropFilter: 'blur(4px)' }}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`cliente-sidebar${sidebarOpen ? ' cliente-sidebar--open' : ''}`}>
        {/* Cerrar en mobile */}
        <button className="cliente-sidebar__close" onClick={() => setSidebarOpen(false)}>
          <X size={18} />
        </button>

        {/* Logo Unificado */}
        <div style={{ padding: '24px 18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 24, lineHeight: 1, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: 4 }}>D+ARQ</div>
            <div style={{ fontSize: 10, color: '#818cf8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em' }}>DOSSIER CLIENTE</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0', lineHeight: 1.3, marginBottom: 6 }}>{obraMain?.nombre || config?.nombre}</div>
          <span className={`badge ${obraMain?.estado === 'Finalizada' ? 'badge-green' : 'badge-blue'}`} style={{ fontSize: 9 }}>{obraMain?.estado || 'En Ejecución'}</span>
        </div>

        {/* KPI pendiente */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: totalDeudaActual > 0 ? 'rgba(248,113,113,0.04)' : 'rgba(52,211,153,0.04)' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Pendiente a Pagar</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: totalDeudaActual > 0 ? '#f87171' : '#34d399', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{fmt(totalDeudaActual)}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 }}>{fmt(R.jueves.totalUSD, 'USD')}</div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 8px', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '4px 10px 8px' }}>Secciones</div>
          {TABS.map(t => {
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => handleTabSelect(t.id)} style={{
                width: '100%', textAlign: 'left', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 9,
                borderRadius: 8, border: 'none', cursor: 'pointer',
                background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: active ? '#e2e8f0' : '#64748b', fontWeight: active ? 800 : 500, fontSize: 12,
                transition: 'all 0.12s', position: 'relative',
              }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}}
              >
                {active && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, background: '#818cf8', borderRadius: 4 }} />}
                <t.Icon size={13} color={active ? '#818cf8' : 'currentColor'} style={{ flexShrink: 0 }} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header mobile con hamburger */}
        <header className="cliente-header">
          <button className="cliente-hamburger" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f0' }}>{obraMain?.nombre || config?.nombre}</div>
          <div style={{ fontSize: 11, color: totalDeudaActual > 0 ? '#f87171' : '#34d399', fontFamily: 'monospace', fontWeight: 700 }}>
            {fmt(totalDeudaActual)}
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }} className="cliente-main">
          {activeTab === 'resumen'         && <TabResumen         R={R} tc={tc} obraMain={obraMain} showPagos={showPagos} setShowPagos={setShowPagos} historialPagos={historialPagos} certificaciones={certificaciones} />}
          {activeTab === 'pagos'           && <TabPagos           factSinContrat={factSinContrat} />}
          {activeTab === 'certificaciones' && <TabCertificaciones certificaciones={certificaciones} />}
          {activeTab === 'honorarios'      && <TabHonorarios      honClienteSafe={honClienteSafe} />}
          {activeTab === 'acopios'         && <TabAcopios         acopios={acopios} R={R} />}
          {activeTab === 'caja_chica'      && <TabCajaChica       rendiciones={rendiciones} R={R} />}
          {activeTab === 'adicionales'     && <TabAdicionales     ordenes={ordenes} aprobar={aprobar} />}
          {activeTab === 'mis_gastos'      && <TabMisGastos       gastosCliente={gastosCliente} addGasto={addGasto} removeGasto={removeGasto} tc={tc} />}
          {activeTab === 'fotos'           && <TabFotos           fotos={fotos} />}
        </main>
      </div>
    </div>
  );
}

// ─── Pantallas utilitarias ────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030408' }}>
      <div>
        <div style={{ width: 48, height: 48, border: '3px solid rgba(99,102,241,0.1)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Cargando Dossier...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

function ErrorScreen({ msg }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030408' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
        <div style={{ width: 64, height: 64, background: 'rgba(248,113,113,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <AlertCircle size={32} color="#f87171" />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 12 }}>Acceso Restringido</h1>
        <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>{msg}</p>
      </div>
    </div>
  );
}
