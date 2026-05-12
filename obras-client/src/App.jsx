import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from './config/firebase';
import AdminApp from './admin/AdminApp.jsx';
import ClienteApp from './cliente/ClienteApp.jsx';

// ── Roles permitidos en el módulo de obras ────────────────────────
const ROLES_ADMIN = ['superadmin', 'admin_general', 'director'];

export default function App() {
  // Detectar si es vista cliente por query params: /obras/?obra=:id&token=:token
  // (más confiable que path-based en Firebase Hosting)
  const params = new URLSearchParams(window.location.search);
  const obraIdQP = params.get('obra');
  const tokenQP  = params.get('token');
  if (obraIdQP && tokenQP) {
    return <ClienteApp obraIdParam={obraIdQP} token={tokenQP} />;
  }

  // Soporte legacy: /obras/cliente/:obraId/:token (path-based)
  const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const rawPath = window.location.pathname;
  const relativePath = basePath && rawPath.startsWith(basePath) ? rawPath.slice(basePath.length) : rawPath;
  const clienteMatch = relativePath.match(/^\/cliente\/([^/]+)\/([^/]+)/);
  if (clienteMatch) {
    return <ClienteApp obraIdParam={clienteMatch[1]} token={clienteMatch[2]} />;
  }

  return <AdminGate />;
}

function AdminGate() {
  const [user, setUser] = useState(undefined); // undefined = cargando
  const [userRole, setUserRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Leer rol del sistema principal
        try {
          const snap = await getDocs(query(
            collection(db, 'artifacts', 'sg-darq', 'public', 'data', 'usuarios'),
            where('uid', '==', u.uid)
          ));
          if (!snap.empty) {
            setUserRole(snap.docs[0].data().rol || 'viewer');
          } else {
            setUserRole('director'); // fallback para usuarios sin doc
          }
        } catch {
          setUserRole('director');
        }
        setUser(u);
      } else {
        setUser(null);
        setUserRole(null);
      }
    });
    return unsub;
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
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!user) return <LoginScreen email={email} setEmail={setEmail} password={password} setPassword={setPassword} error={error} loading={loading} onSubmit={handleLogin} />;

  return <AdminApp user={user} userRole={userRole} onLogout={() => signOut(auth)} />;
}

function LoginScreen({ email, setEmail, password, setPassword, error, loading, onSubmit }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 60%), #060811'
    }}>
      <div className="fade-in" style={{ width: '100%', maxWidth: 400, padding: 24 }}>
        {/* Logo Unificado */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.02em', color: '#fff', marginBottom: 6 }}>
            D+ARQ
          </h1>
          <p style={{ fontSize: 11, color: '#818cf8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.25em' }}>
            OBRAS
          </p>
          <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 16 }}>
            Panel de Administración
          </p>
        </div>

        <form onSubmit={onSubmit} className="glass" style={{ padding: 32 }}>
          <div style={{ marginBottom: 18 }}>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="tu@email.com" autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label className="label">Contraseña</label>
            <input className="input" type="password" placeholder="••••••••" autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, color: '#f87171', fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
              {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }} disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
