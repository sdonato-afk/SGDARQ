import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../config/firebase';

/**
 * useAgendaData — lee/escribe items manuales en agenda_items.
 * Los items automáticos los provee useAgendaAuto por separado.
 */
export function useAgendaData() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const ref  = collection(db, 'artifacts', appId, 'public', 'data', 'agenda_items');
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setItems(data.filter(i => !i.resuelta)); // solo pendientes
      setLoading(false);
    });
    return unsub;
  }, []);

  const agregarItem = async (item) => {
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'agenda_items'), {
      ...item,
      tipo: 'manual',
      resuelta: false,
      creadaAt: serverTimestamp(),
    });
  };

  const resolverItem = async (id) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'agenda_items', id), { resuelta: true });
  };

  const eliminarItem = async (id) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'agenda_items', id));
  };

  return { items, loading, agregarItem, resolverItem, eliminarItem };
}
