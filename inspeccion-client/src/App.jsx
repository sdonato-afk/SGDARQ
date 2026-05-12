import React, { useState, useEffect } from 'react';
import { Camera, Receipt, Box, ListTodo, ClipboardList, ChevronDown, ArrowLeft } from 'lucide-react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from './config/firebase';
import { SearchableSelect } from '@darq/ui';
import BitacoraVisual from './components/BitacoraVisual';
import SubirSolicitud from './components/SubirSolicitud';
import SubirDocumentacion from './components/SubirDocumentacion';

function MainApp({ user, onLogout }) {
  const [view, setView] = useState('home');
  const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
  const [obrasActivas, setObrasActivas] = useState([]);
  const [selectedObraId, setSelectedObraId] = useState('');

  // Fetch obras
  useEffect(() => {
    const q = query(
      collection(db, 'artifacts', 'sg-darq', 'public', 'data', 'obras'),
      where('estado', '==', 'En Proceso')
    );
    const unsub = onSnapshot(q, snap => {
      setObrasActivas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const qReq = query(
      collection(db, 'artifacts', 'sg-darq', 'public', 'data', 'requerimientos'),
      where('solicitanteUid', '==', user.uid)
    );
    const qGas = query(
      collection(db, 'artifacts', 'sg-darq', 'public', 'data', 'inbox_movimientos'),
      where('solicitanteUid', '==', user.uid)
    );
    
    let listReq = [];
    let listGas = [];
    
    const updateCombined = () => {
      const combined = [...listReq, ...listGas].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setSolicitudesPendientes(combined);
    };

    const unsubReq = onSnapshot(qReq, snap => {
      listReq = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateCombined();
    }, () => {});

    const unsubGas = onSnapshot(qGas, snap => {
      // Forzamos el tipo 'gasto' para la UI
      listGas = snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(), 
        tipo: 'gasto', 
        descripcion: `Rendición de Gasto${d.data().proveedor ? ' - ' + d.data().proveedor : ''}` 
      }));
      updateCombined();
    }, () => {});

    return () => { unsubReq(); unsubGas(); };
  }, [user]);

  const pendienteCount = selectedObraId
    ? solicitudesPendientes.filter(s => s.obraId === selectedObraId && ['pendiente', 'pendiente_aprobacion'].includes(s.estado)).length
    : solicitudesPendientes.filter(s => ['pendiente', 'pendiente_aprobacion'].includes(s.estado)).length;
  const selectedObra = obrasActivas.find(o => o.id === selectedObraId);

  return (
    <div className="min-h-screen pb-safe bg-[#060811] text-[#f8fafc]">

      {/* Header */}
      <header className="sticky top-0 z-50 p-4 border-b" style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] leading-none font-black tracking-tight text-white mb-1">D<span style={{ color: '#38bdf8' }}>+</span>ARQ</h1>
            <div className="text-[9px] font-extrabold uppercase tracking-[0.25em]" style={{ color: '#38bdf8' }}>Inspección</div>
          </div>
          <button onClick={onLogout} className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 active:bg-slate-700">
            {user.email?.substring(0, 2).toUpperCase() || 'JO'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4">
        {view === 'home' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-6 bg-slate-900/50 p-4 rounded-3xl border border-white/5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Ubicación / Obra Actual</label>
              <SearchableSelect 
                value={selectedObraId} 
                onChange={e => setSelectedObraId(e.target.value)}
                options={obrasActivas.map(o => ({ value: o.id, label: o.nombre }))}
                placeholder="-- Seleccione donde se encuentra --"
                className="w-full bg-[#0f172a] border border-slate-700/50 rounded-2xl px-4 py-4 text-sm font-bold text-white outline-none focus:border-indigo-500 transition-colors shadow-inner"
              />
            </div>

            {!selectedObraId ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 mx-auto bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700 shadow-xl">
                  <Box size={24} className="text-slate-500" />
                </div>
                <p className="text-[14px] font-black text-slate-300">Seleccione una obra</p>
                <p className="text-[11px] text-slate-500 font-bold mt-1">Para acceder a planos, pedidos y gastos.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <button onClick={() => setView('bitacora')}
                  className="glass-card relative overflow-hidden flex flex-col items-center justify-center p-8 gap-4 active:scale-95 transition-transform rounded-3xl">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.15] rounded-full blur-[32px] pointer-events-none" />
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center z-10" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                    <Camera size={32} color="#34d399" />
                  </div>
                  <span className="font-black text-[11px] uppercase tracking-widest text-slate-200 z-10">Bitácora</span>
                </button>

                <button onClick={() => setView('solicitud')}
                  className="glass-card relative overflow-hidden flex flex-col items-center justify-center p-8 gap-4 active:scale-95 transition-transform rounded-3xl">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/[0.15] rounded-full blur-[32px] pointer-events-none" />
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center z-10" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
                    <Box size={32} color="#fbbf24" />
                  </div>
                  <span className="font-black text-[11px] uppercase tracking-widest text-slate-200 z-10">Solicitudes</span>
                </button>

                <button onClick={() => setView('pendientes')}
                  className="glass-card relative overflow-hidden flex flex-col items-center justify-center p-8 gap-4 active:scale-95 transition-transform rounded-3xl">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/[0.15] rounded-full blur-[32px] pointer-events-none" />
                  {pendienteCount > 0 && (
                    <span className="absolute top-4 right-4 z-20 w-6 h-6 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.5)]">
                      {pendienteCount}
                    </span>
                  )}
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center z-10" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)' }}>
                    <ListTodo size={32} color="#fb7185" />
                  </div>
                  <span className="font-black text-[11px] uppercase tracking-widest text-slate-200 z-10">Pendientes</span>
                </button>
                
                <button onClick={() => setView('documentacion')}
                  className="glass-card relative overflow-hidden flex flex-col items-center justify-center p-8 gap-4 active:scale-95 transition-transform rounded-3xl">
                  <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/[0.15] rounded-full blur-[32px] pointer-events-none" />
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center z-10" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                  </div>
                  <span className="font-black text-[11px] uppercase tracking-widest text-slate-200 z-10">Planos / Docs</span>
                </button>
              </div>
            )}
          </div>
        )}


        {view === 'bitacora'      && <BitacoraVisual     onBack={() => setView('home')} selectedObra={selectedObra} />}
        {view === 'solicitud'     && <SubirSolicitud     onBack={() => setView('home')} user={user} selectedObra={selectedObra} />}
        {view === 'documentacion' && <SubirDocumentacion onBack={() => setView('home')} user={user} selectedObra={selectedObra} />}
        {view === 'pendientes'    && <PendientesList solicitudes={solicitudesPendientes.filter(s => s.obraId === selectedObraId)} onBack={() => setView('home')} selectedObra={selectedObra} />}
      </main>
    </div>
  );
}

// ── COMPONENTE ACORDEÓN PARA CADA SOLICITUD ──────────────────────────────────────────
function PendienteItem({ s, est, tipoColor }) {
  const [expanded, setExpanded] = useState(false);
  const items = s.items || [];
  
  return (
    <div className="rounded-2xl border transition-all duration-300 overflow-hidden"
      style={{ 
        background: expanded ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)', 
        borderColor: est.color + '40',
        transform: expanded ? 'scale(1.01)' : 'scale(1)'
      }}>
      
      {/* Cabecera (siempre visible) */}
      <div className="p-4 flex flex-col gap-2 cursor-pointer active:bg-white/5" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between gap-2">
          {s.urgencia === 'urgente' && <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"/> Urgente</span>}
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg ml-auto uppercase tracking-wider" style={{ background: est.bg, color: est.color }}>
            {est.label}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <p className="font-bold text-slate-200 text-sm leading-snug flex-1">{s.descripcion}</p>
          <button className={`p-1.5 rounded-full bg-white/5 text-slate-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
            <ChevronDown size={16} />
          </button>
        </div>
        
        {/* Info resumen */}
        {(s.tipo === 'pago' || s.tipo === 'gasto') && s.proveedor && (
          <p className="text-xs text-slate-400 font-medium">💸 {s.proveedor} · {s.moneda === 'USD' ? 'u$d ' : '$ '}{(s.monto || 0).toLocaleString('es-AR')}</p>
        )}
      </div>

      {/* Contenido Desplegable (Acordeón) */}
      <div className={`grid transition-all duration-300 ease-in-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="p-4 pt-0 border-t border-white/5 mt-2 space-y-3">
            
            {/* Lista de Ítems */}
            {items.length > 0 && (
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Ítems solicitados</p>
                <ul className="space-y-1.5">
                  {items.map((it, idx) => (
                    <li key={idx} className="text-xs text-slate-300 bg-black/20 p-2.5 rounded-xl border border-white/5 flex gap-2">
                      <span className="text-indigo-400 font-bold opacity-50">{idx + 1}.</span>
                      <span className="flex-1">{it.descripcion}</span>
                      {it.cantidad && <span className="font-black text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">{it.cantidad} {it.unidad}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Foto de Referencia / Comprobante */}
            {s.fotoUrl && (
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Archivo Adjunto</p>
                <a href={s.fotoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-2 rounded-xl active:scale-95 transition-transform">
                  <Camera size={14} /> Ver Foto / Comprobante
                </a>
              </div>
            )}

            {/* Nota */}
            {s.nota && (
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Nota</p>
                <p className="text-xs text-slate-400 italic bg-black/20 p-2.5 rounded-xl border border-white/5">{s.nota}</p>
              </div>
            )}

            {/* Logs de estado histórico */}
            {s.tipo === 'pago' && s.ejecutadoFecha && (
              <p className="text-[10px] text-emerald-400/80 font-bold bg-emerald-500/10 p-2 rounded-lg">
                ✓ Pagado el {new Date(s.ejecutadoFecha).toLocaleDateString('es-AR')}
                {s.monto_real ? ` · $ ${s.monto_real.toLocaleString('es-AR')}` : ''}
              </p>
            )}
            {s.estado === 'rechazado' && s.motivoRechazo && (
              <p className="text-[10px] text-rose-400/80 font-bold bg-rose-500/10 p-2 rounded-lg">Motivo del rechazo: {s.motivoRechazo}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Lista de solicitudes del inspector (Agrupada por tipo) ───────────
function PendientesList({ solicitudes, onBack }) {
  const TIPO_COLOR = { material: '#fbbf24', servicio: '#818cf8', pago: '#34d399', gasto: '#f43f5e' };
  const TIPO_LABEL = { material: 'Materiales', servicio: 'Servicios', pago: 'Pagos a Proveedores', gasto: 'Rendiciones de Gastos' };

  const ESTADO_DISPLAY = {
    pendiente:            { label: 'Pendiente',       color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
    pendiente_aprobacion: { label: 'Esp. aprobación', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    aprobado:             { label: '\u2713 Aprobado', color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
    comprado:             { label: 'Comprado',        color: '#38bdf8', bg: 'rgba(56,189,248,0.12)'  }, // en tránsito
    entregado_deposito:   { label: 'En Depósito',     color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
    entregado_obra:       { label: '\u2713 En Obra',  color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
    ejecutado:            { label: '\u2713 Pagado',   color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
    entregado:            { label: '\u2713 Entregado',color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
    rechazado:            { label: 'Rechazado',       color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  };

  // Filtrar y agrupar
  // Excluimos las finalizadas de la vista principal para no ensuciar, salvo que hagamos un tab de historial. 
  // Por ahora las dejamos, pero agrupadas por tipo.
  const activas = solicitudes.filter(s => !['ejecutado', 'entregado', 'entregado_obra', 'rechazado'].includes(s.estado));
  const resueltas = solicitudes.filter(s => ['ejecutado', 'entregado', 'entregado_obra', 'rechazado'].includes(s.estado));

  const agruparPorTipo = (lista) => {
    return lista.reduce((acc, s) => {
      const t = s.tipo || 'otro';
      if (!acc[t]) acc[t] = [];
      acc[t].push(s);
      return acc;
    }, {});
  };

  const activasAgrupadas = agruparPorTipo(activas);
  const resueltasAgrupadas = agruparPorTipo(resueltas);

  const renderGrupo = (grupos, titulo) => {
    if (Object.keys(grupos).length === 0) return null;
    return (
      <div className="space-y-6 mt-4">
        {titulo && <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] px-2 text-center">{titulo}</h3>}
        {Object.entries(grupos).map(([tipo, items]) => (
          <div key={tipo} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px bg-white/10 flex-1"/>
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
                style={{ color: TIPO_COLOR[tipo] || '#64748b', background: `${TIPO_COLOR[tipo] || '#64748b'}15` }}>
                {TIPO_LABEL[tipo] || tipo} ({items.length})
              </span>
              <div className="h-px bg-white/10 flex-1"/>
            </div>
            <div className="space-y-3">
              {items.map(s => {
                const est = ESTADO_DISPLAY[s.estado] || ESTADO_DISPLAY.pendiente;
                return <PendienteItem key={s.id} s={s} est={est} tipoColor={TIPO_COLOR[s.tipo]} />;
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 max-w-md mx-auto pb-safe">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full active:bg-slate-800 text-slate-400">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold text-slate-100">Mis Solicitudes</h2>
      </div>

      {solicitudes.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold">Sin solicitudes enviadas</p>
        </div>
      ) : (
        <div className="space-y-8">
          {renderGrupo(activasAgrupadas, "En Proceso")}
          {renderGrupo(resueltasAgrupadas, "Historial (Resueltas)")}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => { setUser(u); });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  if (user === undefined) {
    return <div className="flex items-center justify-center min-h-screen text-slate-400">Cargando...</div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: '#0f172a' }}>
        <div className="w-full max-w-sm p-8 glass-card rounded-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black tracking-tight text-white mb-1">D<span style={{ color: '#38bdf8' }}>+</span>ARQ</h1>
            <div className="text-[9px] font-extrabold uppercase tracking-[0.25em]" style={{ color: '#38bdf8' }}>Inspección</div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} required
              className="w-full p-3 rounded-xl glass-input" />
            <input type="password" placeholder="Contraseña" value={password}
              onChange={e => setPassword(e.target.value)} required
              className="w-full p-3 rounded-xl glass-input" />
            {error && <div className="text-red-400 text-sm font-bold text-center">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full p-3 rounded-xl bg-indigo-600 active:bg-indigo-700 text-white font-bold transition-colors">
              {loading ? 'Entrando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <MainApp user={user} onLogout={() => signOut(auth)} />;
}
