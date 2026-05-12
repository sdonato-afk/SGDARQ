import React, { useState, useEffect } from 'react';
import {
  HardHat, LogOut, Settings, TrendingUp, FileText,
  Users, Package, Truck, ClipboardList, AlertCircle,
  ChevronDown, Link, Copy, Check, RefreshCw, Camera,
  Wallet, Calendar, LayoutDashboard, FileUp, ShoppingBag, CheckCircle, XCircle
} from 'lucide-react';
import { useObrasMain, useObraConfig } from '../hooks/useObras.js';
import TabResumen          from './TabResumen.jsx';
import TabTransacciones    from './tabs/TabTransacciones.jsx';
import TabContratistas     from './tabs/TabContratistas.jsx';
import TabCertificaciones  from './tabs/TabCertificaciones.jsx';
import TabHonorarios       from './tabs/TabHonorarios.jsx';
import TabAcopios          from './tabs/TabAcopios.jsx';
import TabOrdenesCambio    from './tabs/TabOrdenesCambio.jsx';
import TabCajaChica        from './tabs/TabCajaChica.jsx';
import TabPagosDirectos   from './tabs/TabPagosDirectos.jsx';
import TaxonomiaManager    from './tabs/TaxonomiaManager.jsx';
import DashboardRentabilidad from './DashboardRentabilidad.jsx';
import ConfigModal         from './ConfigModal.jsx';
import { useGastosCliente } from '../hooks/useObras.js';
import TabBitacora         from './tabs/TabBitacora.jsx';
import TabRequerimientos   from './tabs/TabRequerimientos.jsx';
import TabChecklist        from './tabs/TabChecklist.jsx';
import TabVisionGlobal     from './TabVisionGlobal.jsx';
import { DarqSidebar } from '@darq/ui';
import { useRequerimientosCount } from '../hooks/useRequerimientosCount.js';

// ─── Definición de tabs ───────────────────────────────────────────
const TABS = [
  // ── Seguimiento de Obra (Campo / Proyecto) ──────────────────────
  { id: 'resumen',         label: 'Resumen',         icon: LayoutDashboard, group: 'seguimiento' },
  { id: 'checklist',       label: 'Checklist',       icon: ClipboardList,   group: 'seguimiento' },
  { id: 'bitacora',        label: 'Bitácora',        icon: Camera,          group: 'seguimiento' },
  { id: 'requerimientos',  label: 'Requerimientos',  icon: Package,         group: 'seguimiento' },
  // ── Administración de Obra (Admin / Directores) ────────────────
  { id: 'certificaciones', label: 'Certificaciones', icon: ClipboardList,   group: 'admin' },
  { id: 'facturas',        label: 'Pagos Directos',  icon: FileUp,          group: 'admin' },
  { id: 'honorarios',      label: 'Honorarios',      icon: TrendingUp,      group: 'admin' },
  { id: 'ordenes',         label: 'Adicionales',     icon: AlertCircle,     group: 'admin' },
  { id: 'acopios',         label: 'Acopios',         icon: Package,         group: 'admin' },
  { id: 'caja_chica',      label: 'Caja Chica',      icon: Wallet,          group: 'admin' },
  // ── Soporte / Análisis ─────────────────────────────────────────
  { id: 'transacciones',   label: 'Registros',       icon: FileText,        group: 'sup'  },
  { id: 'contratistas',    label: 'Contratistas',    icon: Users,           group: 'sup'  },
  { id: 'gastos_cliente',  label: 'Gastos Cliente',  icon: ShoppingBag,     group: 'sup'  },
  { id: 'rentabilidad',    label: 'Rentabilidad',    icon: TrendingUp,      group: 'sup'  },
];

export default function AdminApp({ user, userRole, onLogout }) {
  const { obras, loading: loadingObras } = useObrasMain();
  const [selectedObraId, setSelectedObraId]   = useState(null);
  const [activeTab, setActiveTab]             = useState('inicio');
  const [obraDropdownOpen, setObraDropdownOpen] = useState(false);
  const [obraSearch, setObraSearch]           = useState('');
  const [mostrarFinalizadas, setMostrarFinalizadas] = useState(false);
  const [showConfig, setShowConfig]           = useState(false);
  const [copied, setCopied]                   = useState(false);

  const selectedObra = obras.find(o => o.id === selectedObraId);
  const { config, loading: loadingConfig, initConfig, updateConfig } = useObraConfig(selectedObraId);

  // No auto-seleccionar — el usuario elige la obra desde el panorama global

  // Inicializar config si no existe
  useEffect(() => {
    if (selectedObra && config === null && !loadingConfig) {
      initConfig(selectedObra);
    }
  }, [selectedObra, config, loadingConfig]);

  const obrasVisibles  = mostrarFinalizadas ? obras : obras.filter(o => o.estado !== 'Finalizada');
  const obrasFiltradas = obraSearch.trim()
    ? obrasVisibles.filter(o => o.nombre?.toLowerCase().includes(obraSearch.toLowerCase()))
    : obrasVisibles;

  const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const clienteUrl = config
    ? `${window.location.origin}${basePath}/?obra=${config.obraId}&token=${config.token_cliente}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(clienteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectObra = (id) => {
    setSelectedObraId(id);
    setObraDropdownOpen(false);
    setActiveTab('resumen');
    window.history.pushState({ tab: 'resumen', obraId: id }, '');
  };

  // Badge dinámico en tab Requerimientos
  const reqCount = useRequerimientosCount(selectedObraId);

  // Navegar directo a obra + tab desde la visión global
  const handleNavigate = (obraId, tab) => {
    setSelectedObraId(obraId);
    setActiveTab(tab);
    window.history.pushState({ tab, obraId }, '');
  };

  // Botón Atrás del navegador → restaura tab anterior
  useEffect(() => {
    const onPop = (e) => {
      if (e.state?.tab)               setActiveTab(e.state.tab);
      if (e.state?.obraId !== undefined) setSelectedObraId(e.state.obraId);
    };
    window.addEventListener('popstate', onPop);
    window.history.replaceState({ tab: 'inicio', obraId: null }, '');
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ── Tabs agrupados (label dinámico según conteo) ──────────────────
  const buildTabs = (tabs) => tabs.map(t =>
    t.id === 'requerimientos' && reqCount > 0
      ? { ...t, label: `Requerimientos (${reqCount})` }
      : t
  );
  const tabsSeguimiento = buildTabs(TABS.filter(t => t.group === 'seguimiento'));
  const tabsAdmin       = buildTabs(TABS.filter(t => t.group === 'admin'));
  const tabsSoporte     = buildTabs(TABS.filter(t => t.group === 'sup'));
  const enInicio    = activeTab === 'inicio';

  const extraContent = (
    <div style={{ padding: '0 16px 16px', position: 'relative' }}>
      {/* Botón Panorama — siempre visible */}
      <button
        onClick={() => { setActiveTab('inicio'); window.history.pushState({ tab: 'inicio', obraId: null }, ''); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
          width: '100%', marginBottom: 8, borderRadius: 10, cursor: 'pointer',
          background: enInicio ? 'rgba(99,102,241,0.15)' : 'transparent',
          border: enInicio ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
          color: enInicio ? '#818cf8' : '#64748b', fontSize: 13, fontWeight: 600,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (!enInicio) e.currentTarget.style.color = '#94a3b8'; }}
        onMouseLeave={e => { if (!enInicio) e.currentTarget.style.color = '#64748b'; }}
      >
        <LayoutDashboard size={13} />
        General
      </button>

      {!enInicio && (
        <>
          <button
            onClick={() => { setObraDropdownOpen(v => !v); setObraSearch(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, cursor: 'pointer', color: '#e2e8f0', width: '100%',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: selectedObra?.estado === 'Finalizada' ? '#34d399' : selectedObra?.estado === 'Pausada' ? '#fbbf24' : '#6366f1' }} />
            <span style={{ fontSize: 13, fontWeight: 700, flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedObra?.nombre || 'Seleccionar obra...'}
            </span>
            <ChevronDown size={13} color="#64748b" />
          </button>

          {obraDropdownOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 39 }} onClick={() => setObraDropdownOpen(false)} />
              <div className="glass" style={{
                position: 'absolute', top: '100%', left: 16, right: 16, zIndex: 40, marginTop: 8,
                maxHeight: 340, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                background: 'rgba(10, 13, 24, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12
              }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input className="input" placeholder="Buscar obra..." value={obraSearch}
                    onChange={e => setObraSearch(e.target.value)} autoFocus style={{ padding: '7px 12px', fontSize: 12 }} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '2px 4px' }}>
                    <input type="checkbox" checked={mostrarFinalizadas} onChange={e => setMostrarFinalizadas(e.target.checked)} style={{ accentColor: '#6366f1', width: 13, height: 13 }} />
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Mostrar finalizadas</span>
                  </label>
                </div>
                <div style={{ overflowY: 'auto', maxHeight: 260 }}>
                  {obrasFiltradas.map(o => (
                    <button key={o.id} onClick={() => selectObra(o.id)} style={{
                      width: '100%', textAlign: 'left', padding: '10px 16px',
                      background: o.id === selectedObraId ? 'rgba(99,102,241,0.15)' : 'transparent',
                      border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                        background: o.estado === 'Finalizada' ? '#34d399' : o.estado === 'Pausada' ? '#fbbf24' : '#6366f1' }} />
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{o.nombre}</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>{o.estado} · {o.tipoObra || 'Servicio'}</div>
                      </div>
                    </button>
                  ))}
                  {obrasFiltradas.length === 0 && (
                    <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 12 }}>Sin resultados</div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#060811' }}>
      <DarqSidebar
        appName="Obras"
        appAccent="amber"
        menuGroups={[
          { title: 'SEGUIMIENTO',     items: tabsSeguimiento },
          { title: 'ADMINISTRACIÓN',  items: tabsAdmin      },
          { title: 'SOPORTE',         items: tabsSoporte    }
        ]}
        activeTab={activeTab}
        onTabSelect={setActiveTab}
        user={user}
        onLogout={onLogout}
        extraContent={extraContent}
        externalLinks={[
          { label: 'Sistema de Gestión', url: import.meta.env.DEV ? 'http://localhost:5173'  : 'https://sg-darq.web.app',            icon: FileText  },
          { label: 'Agenda de Gestión',  url: import.meta.env.DEV ? 'http://localhost:5175'  : 'https://sg-darq.web.app/agenda/',    icon: Calendar  },
          { label: 'Inspección Campo',   url: import.meta.env.DEV ? 'http://localhost:5176'  : 'https://sg-darq.web.app/inspeccion/', icon: Camera    },
        ]}
      />

      {/* ── CONTENIDO PRINCIPAL ── */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column' }}>
        
        {/* Header Acciones */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em', color: '#e2e8f0' }}>
              {TABS.find(t => t.id === activeTab)?.label || 'Gestión de Obras'}
            </h1>
            {config && activeTab !== 'taxonomia' && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link size={11} color="#818cf8" />
                <span style={{ fontSize: 11, color: '#818cf8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
                  {clienteUrl}
                </span>
                <button onClick={copyLink} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818cf8', flexShrink: 0 }}>
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {config && (
              <button onClick={copyLink} className="btn btn-ghost btn-sm" style={{ gap: 6 }}>
                {copied ? <Check size={13} /> : <Link size={13} />}
                {copied ? 'Copiado!' : 'Link cliente'}
              </button>
            )}
            {selectedObraId && (
              <button onClick={() => setShowConfig(true)} className="btn btn-ghost btn-sm">
                <Settings size={13} /> Config
              </button>
            )}
          </div>
        </header>

        {/* Tab content */}
        {loadingObras ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>
        ) : activeTab === 'inicio' ? (
          <TabVisionGlobal obras={obras} onNavigate={handleNavigate} />
        ) : !selectedObraId ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <div style={{ textAlign: 'center' }}>
              <HardHat size={40} style={{ marginBottom: 12, opacity: 0.3, margin: '0 auto' }} />
              <p>Seleccioná una obra para comenzar</p>
            </div>
          </div>
        ) : (
          <div className="fade-in" key={activeTab} style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
            {activeTab === 'resumen'        && <TabResumen         obraId={selectedObraId} config={config} />}
            {activeTab === 'transacciones'  && <TabTransacciones   obraId={selectedObraId} config={config} />}
            {activeTab === 'facturas'       && <TabPagosDirectos    obraId={selectedObraId} config={config} />}
            {activeTab === 'contratistas'   && <TabContratistas    obraId={selectedObraId} config={config} />}
            {activeTab === 'caja_chica'     && <TabCajaChica       obraId={selectedObraId} config={config} />}
            {activeTab === 'certificaciones'&& <TabCertificaciones obraId={selectedObraId} config={config} />}
            {activeTab === 'honorarios'     && <TabHonorarios      obraId={selectedObraId} config={config} />}
            {activeTab === 'acopios'        && <TabAcopios         obraId={selectedObraId} config={config} />}
            {activeTab === 'ordenes'        && <TabOrdenesCambio   obraId={selectedObraId} config={config} />}
            {activeTab === 'bitacora'       && <TabBitacora          obraId={selectedObraId} obraNombre={selectedObra?.nombre || selectedObra?.name || selectedObraId} />}
            {activeTab === 'requerimientos' && <TabRequerimientos     obraId={selectedObraId} />}
            {activeTab === 'checklist'      && <TabChecklist           obraId={selectedObraId} />}
            {activeTab === 'rentabilidad'   && <DashboardRentabilidad obraId={selectedObraId} config={config} />}
            {activeTab === 'gastos_cliente'  && <TabGastosCliente obraId={selectedObraId} />}
          </div>
        )}
      </main>

      {/* Config Modal */}
      {showConfig && selectedObraId && config && (
        <ConfigModal config={config} onSave={updateConfig} onClose={() => setShowConfig(false)} />
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ width: 32, height: 32, border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Tab Gastos del Cliente (admin) ────────────────────────────────────────────
function TabGastosCliente({ obraId }) {
  const { gastos, loading, update, remove } = useGastosCliente(obraId);
  const { fmt } = { fmt: (v, m = 'ARS') => new Intl.NumberFormat('es-AR', { style: 'currency', currency: m === 'USD' ? 'USD' : 'ARS', minimumFractionDigits: 0 }).format(v || 0) };

  const pendientes  = gastos.filter(g => g.estado === 'pendiente');
  const validados   = gastos.filter(g => g.estado === 'validado');
  const rechazados  = gastos.filter(g => g.estado === 'rechazado');

  if (loading) return <div style={{ padding: 40, color: '#64748b', textAlign: 'center' }}>Cargando...</div>;

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#e2e8f0', marginBottom: 6 }}>Gastos del Cliente</h2>
        <p style={{ fontSize: 13, color: '#64748b' }}>Compras y gastos autodeclarados por el cliente. Validalos para incluirlos en el resumen de inversión.</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <div style={{ padding: 16, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', marginBottom: 6 }}>Pendientes</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#e2e8f0' }}>{pendientes.length}</div>
        </div>
        <div style={{ padding: 16, background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#34d399', textTransform: 'uppercase', marginBottom: 6 }}>Validados</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#e2e8f0' }}>{validados.length}</div>
        </div>
        <div style={{ padding: 16, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#f87171', textTransform: 'uppercase', marginBottom: 6 }}>Rechazados</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#e2e8f0' }}>{rechazados.length}</div>
        </div>
      </div>

      {gastos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>El cliente aún no registró gastos propios.</div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Fecha', 'Descripción', 'Categoría', 'Monto', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: h === 'Monto' ? 'right' : 'left', fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gastos.map(g => (
                <tr key={g.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{g.fecha}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{g.descripcion}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{g.categoria}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color: '#e2e8f0' }}>{fmt(parseFloat(g.monto), g.moneda)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {g.estado === 'validado'  && <span style={{ fontSize: 9, fontWeight: 800, color: '#34d399', background: 'rgba(52,211,153,0.12)', borderRadius: 20, padding: '3px 10px', textTransform: 'uppercase' }}>Validado</span>}
                    {g.estado === 'rechazado' && <span style={{ fontSize: 9, fontWeight: 800, color: '#f87171', background: 'rgba(248,113,113,0.12)', borderRadius: 20, padding: '3px 10px', textTransform: 'uppercase' }}>Rechazado</span>}
                    {g.estado === 'pendiente' && <span style={{ fontSize: 9, fontWeight: 800, color: '#fbbf24', background: 'rgba(251,191,36,0.12)', borderRadius: 20, padding: '3px 10px', textTransform: 'uppercase' }}>Pendiente</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {g.estado !== 'validado' && (
                        <button onClick={() => update(g.id, { estado: 'validado' })} title="Validar"
                          style={{ padding: '5px 10px', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 8, color: '#34d399', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={12} /> Validar
                        </button>
                      )}
                      {g.estado !== 'rechazado' && (
                        <button onClick={() => update(g.id, { estado: 'rechazado' })} title="Rechazar"
                          style={{ padding: '5px 10px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 8, color: '#f87171', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <XCircle size={12} /> Rechazar
                        </button>
                      )}
                      <button onClick={() => window.confirm('¿Eliminar este gasto?') && remove(g.id)}
                        style={{ padding: '5px 8px', background: 'none', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, color: '#475569', fontSize: 11, cursor: 'pointer' }}>
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
