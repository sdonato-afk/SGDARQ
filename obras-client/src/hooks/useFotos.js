import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, orderBy, addDoc, deleteDoc } from 'firebase/firestore';
import { db, OBRAS_COL } from '../config/firebase';

export function useFotos(obraId) {
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!obraId) return;
    const q = query(collection(db, OBRAS_COL, obraId, 'fotos'), orderBy('fecha', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setFotos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [obraId]);

  const add    = (data) => addDoc(collection(db, OBRAS_COL, obraId, 'fotos'), { ...data, createdAt: new Date().toISOString() });
  const remove = (id)   => deleteDoc(doc(db, OBRAS_COL, obraId, 'fotos', id));

  return { fotos, loading, add, remove };
}

export function useGastosCliente(obraId) {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!obraId) return;
    const q = query(collection(db, OBRAS_COL, obraId, 'gastos_cliente'), orderBy('fecha', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setGastos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [obraId]);

  const add    = (data)     => addDoc(collection(db, OBRAS_COL, obraId, 'gastos_cliente'), {
    ...data,
    cargado_por:   'cliente',
    estado:        'pendiente',   // admin puede marcar 'validado' o 'rechazado'
    visible_admin: true,
    createdAt:     new Date().toISOString(),
  });
  const update = (id, data) => updateDoc(doc(db, OBRAS_COL, obraId, 'gastos_cliente', id), data);
  const remove = (id)       => deleteDoc(doc(db, OBRAS_COL, obraId, 'gastos_cliente', id));

  return { gastos, loading, add, update, remove };
}
