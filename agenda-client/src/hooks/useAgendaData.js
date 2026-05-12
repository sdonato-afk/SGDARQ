import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, AGENDA_COL } from '../config/firebase';

/**
 * useAgendaData — lee/escribe items manuales en agenda_items.
 * Los items automáticos los provee useAgendaAuto por separado.
 */
export function useAgendaData() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const ref  = collection(db, ...AGENDA_COL);
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setItems(data.filter(i => !i.resuelta)); // solo pendientes
      setLoading(false);
    });
    return unsub;
  }, []);

  const agregarItem = async (item) => {
    await addDoc(collection(db, ...AGENDA_COL), {
      ...item,
      tipo: 'manual',
      resuelta: false,
      creadaAt: serverTimestamp(),
    });
  };

  const resolverItem = async (id) => {
    await updateDoc(doc(db, ...AGENDA_COL, id), { resuelta: true });
  };

  const eliminarItem = async (id) => {
    await deleteDoc(doc(db, ...AGENDA_COL, id));
  };

  return { items, loading, agregarItem, resolverItem, eliminarItem };
}
