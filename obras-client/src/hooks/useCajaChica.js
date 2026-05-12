import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, OBRAS_COL } from '../config/firebase';

export function useCajaChica(obraId) {
  const [rendiciones, setRendiciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!obraId) return;
    const q = query(collection(db, OBRAS_COL, obraId, 'caja_chica'), orderBy('semana', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setRendiciones(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [obraId]);

  const add    = (data)     => addDoc(collection(db, OBRAS_COL, obraId, 'caja_chica'), { ...data, createdAt: new Date().toISOString() });
  const update = (id, data) => updateDoc(doc(db, OBRAS_COL, obraId, 'caja_chica', id), data);
  const remove = (id)       => deleteDoc(doc(db, OBRAS_COL, obraId, 'caja_chica', id));

  return { rendiciones, loading, add, update, remove };
}
