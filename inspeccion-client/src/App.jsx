import React, { useState, useEffect } from 'react';
import { Camera, Receipt, Box, ListTodo, ClipboardList } from 'lucide-react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from './config/firebase';
import { SearchableSelect } from '@darq/ui';
import SubirGasto from './components/SubirGasto';
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
    // Traer todas las solicitudes del inspector logueado (todos los estados para tener historial completo)
    const q = query(
      collection(db, 'artifacts', 'sg-darq', 'public', 'data', 'requerimientos'),
      where('solicitanteUid', '==', user.uid)
    );
    const unsub = onSnapshot(q, snap => {
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setSolicitudesPendientes(lista);
    }, () => {});
    return unsub;
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
                <button onClick={() => setView('gasto')}
                  className="glass-card relative overflow-hidden flex flex-col items-center justify-center p-8 gap-4 active:scale-95 transition-transform rounded-3xl">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/[0.15] rounded-full blur-[32px] pointer-events-none" />
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center z-10" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <Receipt size={32} color="#818cf8" />
                  </div>
                  <span className="font-black text-[11px] uppercase tracking-widest text-slate-200 z-10">Subir Gasto</span>
                </button>

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
                  className="glass-card relative overflow-hidden flex flex-col items-center justify-center p-8 gap-4 active:scale-95 transition-transform rounded-3xl col-span-2">
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

        {view === 'gasto'         && <SubirGasto         onBack={() => setView('home')} user={user} selectedObra={selectedObra} />}
        {view === 'bitacora'      && <BitacoraVisual     onBack={() => setView('home')} selectedObra={selectedObra} />}
        {view === 'solicitud'     && <SubirSolicitud     onBack={() => setView('home')} user={user} selectedObra={selectedObra} />}
        {view === 'documentacion' && <SubirDocumentacion onBack={() => setView('home')} user={user} selectedObra={selectedObra} />}
        {view === 'pendientes'    && <PendientesList solicitudes={solicitudesPendientes.filter(s => s.obraId === selectedObraId)} onBack={() => setView('home')} selectedObra={selectedObra} />}
      </main>
    </div>
  );
}

// ── Lista de solicitudes del inspector (historial completo con estado) ───────────
function PendientesList({ solicitudes, onBack }) {
  const TIPO_COLOR = { material: '#fbbf24', servicio: '#818cf8', pago: '#34d399' };

  const ESTADO_DISPLAY = {
    pendiente:            { label: 'Pendiente',       color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
    pendiente_aprobacion: { label: 'Esp. aprobación', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    aprobado:             { label: '\u2713 Aprobado',    color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
    ejecutado:            { label: '\u2713 Pagado',      color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
    comprado:             { label: 'En proceso',     color: '#38bdf8', bg: 'rgba(56,189,248,0.12)'  },
    entregado:            { label: '\u2713 Entregado',   color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
    rechazado:            { label: 'Rechazado',       color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  };

  const activas = solicitudes.filter(s => ['pendiente', 'pendiente_aprobacion', 'aprobado', 'comprado'].includes(s.estado));
  const resueltas = solicitudes.filter(s => ['ejecutado', 'entregado', 'rechazado'].includes(s.estado));

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full active:bg-slate-800 text-slate-400">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h2 className="text-xl font-bold text-slate-100">Mis Solicitudes</h2>
      </div>

      {solicitudes.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold">Sin solicitudes enviadas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Activas */}
          {activas.length > 0 && (
            <>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">En proceso</p>
              {activas.map(s => {
                const est = ESTADO_DISPLAY[s.estado] || ESTADO_DISPLAY.pendiente;
                return (
                  <div key={s.id} className="p-4 rounded-2xl border"
                    style={{ background: 'rgba(255,255,255,0.03)', borderColor: est.color + '40' }}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-lg"
                        style={{ background: `${TIPO_COLOR[s.tipo] || '#64748b'}20`, color: TIPO_COLOR[s.tipo] || '#64748b' }}>
                        {s.tipo}
                      </span>
                      {s.urgencia === 'urgente' && <span className="text-xs font-black text-rose-400">⚡ Urgente</span>}
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg ml-auto"
                        style={{ background: est.bg, color: est.color }}>
                        {est.label}
                      </span>
                    </div>
                    <p className="font-bold text-slate-200 text-sm mb-1">{s.descripcion}</p>
                    {s.tipo === 'pago' && s.proveedor && (
                      <p className="text-xs text-slate-400 mt-1">💸 {s.proveedor} · {s.moneda === 'USD' ? 'u$d ' : '$ '}{(s.monto || 0).toLocaleString('es-AR')}</p>
                    )}
                    {s.estado === 'aprobado' && (
                      <div className="mt-2 text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg">
                        ✓ Aprobado — en espera de ejecución de pago
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* Resueltas */}
          {resueltas.length > 0 && (
            <>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest px-1 mt-4">Historial</p>
              {resueltas.map(s => {
                const est = ESTADO_DISPLAY[s.estado] || ESTADO_DISPLAY.pendiente;
                return (
                  <div key={s.id} className="p-4 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', opacity: 0.8 }}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-bold text-slate-300 text-sm flex-1 truncate">{s.descripcion}</p>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg shrink-0"
                        style={{ background: est.bg, color: est.color }}>
                        {est.label}
                      </span>
                    </div>
                    {s.tipo === 'pago' && s.ejecutadoFecha && (
                      <p className="text-xs text-slate-500 mt-1">
                        Pagado el {new Date(s.ejecutadoFecha).toLocaleDateString('es-AR')}
                        {s.monto_real ? ` · $ ${s.monto_real.toLocaleString('es-AR')}` : ''}
                      </p>
                    )}
                    {s.estado === 'rechazado' && s.motivoRechazo && (
                      <p className="text-xs text-rose-400 mt-1">Motivo: {s.motivoRechazo}</p>
                    )}
                  </div>
                );
              })}
            </>
          )}
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
