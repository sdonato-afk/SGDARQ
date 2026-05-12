import React, { useState, useEffect } from 'react';
import { Camera, Receipt, Box, ListTodo, ClipboardList } from 'lucide-react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from './config/firebase';
import SubirGasto from './components/SubirGasto';
import BitacoraVisual from './components/BitacoraVisual';
import SubirSolicitud from './components/SubirSolicitud';

function MainApp({ user, onLogout }) {
  const [view, setView] = useState('home');
  const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, 'artifacts', 'sg-darq', 'public', 'data', 'requerimientos'),
      where('estado', '==', 'pendiente')
    );
    const unsub = onSnapshot(q, snap => {
      setSolicitudesPendientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return unsub;
  }, []);

  const pendienteCount = solicitudesPendientes.length;

  return (
    <div className="min-h-screen pb-safe bg-[#060811] text-[#f8fafc]">

      {/* Header */}
      <header className="sticky top-0 z-50 p-4 border-b" style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] leading-none font-black tracking-tight text-white mb-1">D+ARQ</h1>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ color: '#818cf8' }}>Inspección</div>
          </div>
          <button onClick={onLogout} className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 active:bg-slate-700">
            {user.email?.substring(0, 2).toUpperCase() || 'JO'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4">
        {view === 'home' && (
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

          </div>
        )}

        {view === 'gasto'      && <SubirGasto     onBack={() => setView('home')} user={user} />}
        {view === 'bitacora'   && <BitacoraVisual onBack={() => setView('home')} />}
        {view === 'solicitud'  && <SubirSolicitud onBack={() => setView('home')} user={user} />}
        {view === 'pendientes' && <PendientesList solicitudes={solicitudesPendientes} onBack={() => setView('home')} />}
      </main>
    </div>
  );
}

// ── Lista de solicitudes pendientes ─────────────────────────────────
function PendientesList({ solicitudes, onBack }) {
  const TIPO_COLOR = { material: '#fbbf24', servicio: '#818cf8', pago: '#34d399' };
  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full active:bg-slate-800 text-slate-400">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h2 className="text-xl font-bold text-slate-100">Solicitudes Activas</h2>
      </div>

      {solicitudes.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold">Sin solicitudes pendientes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {solicitudes.map(s => (
            <div key={s.id} className="p-4 rounded-2xl border"
              style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-lg"
                  style={{ background: `${TIPO_COLOR[s.tipo] || '#64748b'}20`, color: TIPO_COLOR[s.tipo] || '#64748b' }}>
                  {s.tipo}
                </span>
                {s.urgencia === 'urgente' && <span className="text-xs font-black text-rose-400">⚡ Urgente</span>}
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg ml-auto"
                  style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
                  {s.estado}
                </span>
              </div>
              <p className="font-bold text-slate-200 text-sm mb-1">{s.descripcion}</p>
              <p className="text-xs text-slate-500">{s.obraNombre} · {s.solicitanteNombre}</p>
              {s.items?.filter(it => it.descripcion).slice(0, 3).map((it, i) => (
                <p key={i} className="text-xs text-slate-400 mt-0.5">
                  • {it.descripcion}{it.cantidad ? ` (${it.cantidad} ${it.unidad})` : ''}
                </p>
              ))}
            </div>
          ))}
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
            <h1 className="text-4xl font-black tracking-tight text-white mb-1">D+ARQ</h1>
            <div className="text-xs font-extrabold uppercase tracking-widest" style={{ color: '#818cf8' }}>Inspección</div>
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
