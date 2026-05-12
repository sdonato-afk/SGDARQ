import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, appId, firebaseConfig } from '../config/firebase';
import { Users, Save, CheckCircle2, AlertTriangle, Shield, Trash2, Mail, LayoutDashboard, Copy, Plus } from 'lucide-react';

const ROLES_DISPONIBLES = [
  { id: 'superadmin', label: 'Super Admin', color: '#f43f5e', desc: 'Acceso total y configuración del sistema' },
  { id: 'director', label: 'Director', color: '#8b5cf6', desc: 'Acceso a toda la información, modo lectura/aprobación' },
  { id: 'admin_general', label: 'Admin General', color: '#3b82f6', desc: 'Operación, finanzas, tesorería (ej. Violeta)' },
  { id: 'admin_alquileres', label: 'Admin Alquileres', color: '#10b981', desc: 'Solo acceso a módulo alquileres (ej. Celeste)' },
  { id: 'inspector', label: 'Inspector', color: '#f59e0b', desc: 'Solo PWA (App Celular), SIN acceso a WebApp' },
  { id: 'deposito', label: 'Depósito', color: '#06b6d4', desc: 'Logística y Recepción de Materiales' },
];

export default function UsuariosConfig() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for creating a real Auth user
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('darq2026');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('inspector');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'usuarios'));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsuarios(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const actualizarRol = async (id, nuevoRol) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', id), {
        rol: nuevoRol
      });
    } catch (e) {
      console.error(e);
      alert('Error al actualizar el rol');
    }
  };

  const actualizarNombre = async (id, nuevoNombre) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', id), {
        nombre: nuevoNombre
      });
    } catch (e) {
      console.error(e);
      alert('Error al actualizar el nombre');
    }
  };

  const crearUsuarioFirebase = async (e) => {
    e.preventDefault();
    if (!newEmail || !newName || !newPassword) {
      alert('Completá Email, Contraseña y Nombre.');
      return;
    }
    
    setIsCreating(true);
    try {
      // 1. Initialize secondary app so main user doesn't get signed out
      const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
      const secondaryAuth = getAuth(secondaryApp);
      
      // 2. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword);
      const newUid = userCredential.user.uid;
      
      // 3. Sign out the secondary app just in case (best practice)
      await signOut(secondaryAuth);
      
      // 4. Create the Firestore document in our collection
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', newUid), {
        email: newEmail,
        nombre: newName,
        rol: newRole,
        createdAt: new Date().toISOString()
      });
      
      setNewEmail(''); setNewName(''); setNewPassword('darq2026');
      alert(`¡Usuario creado con éxito!\n\nEmail: ${newEmail}\nContraseña: ${newPassword}`);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        alert('Este correo ya está registrado en Firebase. Podés intentar usar otra cuenta o desvincularla.');
      } else if (err.code === 'auth/weak-password') {
        alert('La contraseña debe tener al menos 6 caracteres.');
      } else {
        alert('Error al crear el usuario. Revisá la consola.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const eliminarUsuarioDoc = async (id) => {
    if (window.confirm('¿Seguro que querés desvincular este registro? (No borra el login de Firebase Auth, solo sus permisos en D+ARQ)')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', id));
    }
  };

  const migrateAgendaToUsuarios = async () => {
    if (!window.confirm('¿Migrar la colección antigua "usuarios_agenda" agregando rol="inspector" por defecto?')) return;
    try {
        const { getDocs } = await import('firebase/firestore');
        const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'usuarios_agenda'));
        for (const docSnap of snap.docs) {
            const data = docSnap.data();
            // Crearemos un doc nuevo usando su email como ID ficticio o el mismo ID si queremos
            const targetId = data.email || docSnap.id;
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', targetId), {
                nombre: data.nombre || '',
                email: data.email || '',
                rol: 'inspector',
                whatsapp: data.whatsapp || '',
                migradoDesdeAgenda: true
            }, { merge: true });
        }
        alert('Migración completada. Revisá la lista.');
    } catch (e) {
        console.error(e);
        alert('Error en migración');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 pb-32">
       <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex items-center justify-between">
              <div>
                 <h1 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                    <Shield className="text-emerald-500" size={32} /> Accesos y Equipo
                 </h1>
                 <p className="text-sm text-slate-400 mt-2 font-medium">Asignación de roles y permisos para D+ARQ WebApp y PWA.</p>
              </div>
              <button onClick={migrateAgendaToUsuarios} className="px-4 py-2 border border-white/10 bg-white/5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                  Migrar desde Agenda Vieja
              </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Usuarios Registrados ({usuarios.length})</h2>
              
              {loading ? (
                <div className="text-slate-500 text-center p-10 animate-pulse">Cargando base de datos...</div>
              ) : (
                <div className="space-y-3">
                  {usuarios.map(u => {
                    const rolInfo = ROLES_DISPONIBLES.find(r => r.id === u.rol) || ROLES_DISPONIBLES[4];
                    return (
                      <div key={u.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4 transition-all hover:bg-white/10">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-lg"
                             style={{ background: rolInfo.color + '20', color: rolInfo.color, border: `1px solid ${rolInfo.color}40` }}>
                          {u.nombre?.[0]?.toUpperCase() || '?'}
                        </div>
                        
                        <div className="flex-1">
                          <input 
                            value={u.nombre || ''}
                            onChange={(e) => actualizarNombre(u.id, e.target.value)}
                            className="bg-transparent border-none text-white font-bold outline-none w-full mb-1"
                            placeholder="Nombre del usuario"
                          />
                          <p className="text-xs text-slate-400 flex items-center gap-1"><Mail size={10}/> {u.email || 'Sin email'}</p>
                          <p className="text-[9px] text-slate-500 font-mono mt-1 flex items-center gap-1" title={u.id}>UID: {u.id.substring(0,8)}... <Copy size={8}/></p>
                        </div>

                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <select 
                            value={u.rol || 'inspector'}
                            onChange={(e) => actualizarRol(u.id, e.target.value)}
                            className="bg-black/50 border border-white/10 text-xs font-bold rounded-lg px-3 py-2 outline-none appearance-none"
                            style={{ color: rolInfo.color }}
                          >
                            {ROLES_DISPONIBLES.map(r => (
                              <option key={r.id} value={r.id}>{r.label}</option>
                            ))}
                          </select>
                        </div>
                        
                        <button onClick={() => eliminarUsuarioDoc(u.id)} className="p-2 text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
                          <Trash2 size={18}/>
                        </button>
                      </div>
                    );
                  })}
                  {usuarios.length === 0 && <p className="text-slate-500 text-sm p-4">No hay usuarios en la base de datos de permisos.</p>}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20">
                 <h3 className="font-black text-emerald-400 flex items-center gap-2 mb-4"><Plus size={18}/> Crear Nuevo Usuario</h3>
                 <p className="text-xs text-emerald-400/70 mb-4 font-medium leading-relaxed">
                   Ingresá los datos. El sistema creará la cuenta automáticamente para que la persona ya pueda iniciar sesión.
                 </p>
                 <form onSubmit={crearUsuarioFirebase} className="space-y-3">
                    <input value={newEmail} onChange={e=>setNewEmail(e.target.value)} required type="email" placeholder="Correo Electrónico" className="w-full bg-black/50 border border-emerald-500/30 rounded-xl px-4 py-2 text-xs text-emerald-200 outline-none focus:border-emerald-500" />
                    <input value={newName} onChange={e=>setNewName(e.target.value)} required placeholder="Nombre Completo" className="w-full bg-black/50 border border-emerald-500/30 rounded-xl px-4 py-2 text-xs text-emerald-200 outline-none focus:border-emerald-500" />
                    <input value={newPassword} onChange={e=>setNewPassword(e.target.value)} required placeholder="Contraseña Inicial" className="w-full bg-black/50 border border-emerald-500/30 rounded-xl px-4 py-2 text-xs font-mono text-emerald-200 outline-none focus:border-emerald-500" />
                    <select value={newRole} onChange={e=>setNewRole(e.target.value)} className="w-full bg-black/50 border border-emerald-500/30 rounded-xl px-4 py-2 text-xs font-bold text-emerald-400 outline-none focus:border-emerald-500">
                      {ROLES_DISPONIBLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                    <button type="submit" disabled={isCreating} className="w-full py-2.5 bg-emerald-500 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50">
                      {isCreating ? 'CREANDO...' : 'Crear Usuario Real'}
                    </button>
                 </form>
              </div>

              <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                 <h3 className="font-black text-slate-300 mb-4 text-sm">Niveles de Acceso</h3>
                 <ul className="space-y-3">
                   {ROLES_DISPONIBLES.map(r => (
                     <li key={r.id} className="text-xs">
                       <span className="font-bold px-2 py-0.5 rounded-md" style={{ background: r.color+'20', color: r.color }}>{r.label}</span>
                       <p className="text-slate-400 mt-1 opacity-80 leading-relaxed">{r.desc}</p>
                     </li>
                   ))}
                 </ul>
              </div>
            </div>

          </div>
       </div>
    </div>
  );
}
