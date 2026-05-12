import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy
} from 'firebase/firestore';
import { db, USUARIOS_COL } from '../config/firebase';

/**
 * useUsuariosData — CRUD para la colección `usuarios_agenda`.
 * Schema:
 *   nombre, email, whatsapp (intl: +549...), color (hex), activo, createdAt
 */
export function useUsuariosData() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const q = query(collection(db, ...USUARIOS_COL), orderBy('nombre', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const agregarUsuario = async (data) => {
    await addDoc(collection(db, ...USUARIOS_COL), {
      ...data,
      activo: true,
      createdAt: new Date().toISOString(),
    });
  };

  const actualizarUsuario = async (id, data) => {
    await updateDoc(doc(db, ...USUARIOS_COL, id), data);
  };

  const eliminarUsuario = async (id) => {
    await deleteDoc(doc(db, ...USUARIOS_COL, id));
  };

  // Solo los activos, para usar en selects
  const usuariosActivos = usuarios.filter(u => u.activo !== false);

  return { usuarios, usuariosActivos, loading, agregarUsuario, actualizarUsuario, eliminarUsuario };
}
