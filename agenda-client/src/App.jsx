import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';
import AdminApp from './admin/AdminApp';

export default function App() {
  const [user,       setUser]      = useState(null);
  const [loading,    setLoading]   = useState(true);
  const [email,      setEmail]     = useState('');
  const [password,   setPassword]  = useState('');
  const [error,      setError]     = useState('');
  const [loggingIn,  setLoggingIn] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, u => { setUser(u); setLoading(false); });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError('Credenciales incorrectas');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSignOut = () => signOut(auth);

  if (loading) return (
    <div className="min-h-screen bg-[#060811] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-[#060811] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-violet-400 darq-label mb-2">D+ARQ</p>
          <h1 className="text-2xl font-black italic uppercase text-white tracking-tighter">Agenda de Gestión</h1>
        </div>
        <form onSubmit={handleLogin} className="bg-[#060811]/40 rounded-2xl border border-white/10 p-6 space-y-4">
          <input
            type="email" required placeholder="Email"
            value={email} onChange={e => setEmail(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-500/60 transition-colors"
          />
          <input
            type="password" required placeholder="Contraseña"
            value={password} onChange={e => setPassword(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-500/60 transition-colors"
          />
          {error && <p className="text-rose-400 text-xs text-center">{error}</p>}
          <button type="submit" disabled={loggingIn}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-black uppercase tracking-wider rounded-xl text-sm transition-all">
            {loggingIn ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );

  return <AdminApp user={user} onSignOut={handleSignOut} />;
}
