import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, OBRAS_COL } from '../config/firebase';

export function useLogistica(obraId) {
  const [logistica, setLogistica] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!obraId) return;
    const q = query(collection(db, OBRAS_COL, obraId, 'logistica'), orderBy('semana', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setLogistica(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [obraId]);

  const add    = (data)     => addDoc(collection(db, OBRAS_COL, obraId, 'logistica'), { ...data, createdAt: new Date().toISOString() });
  const update = (id, data) => updateDoc(doc(db, OBRAS_COL, obraId, 'logistica', id), data);
  const remove = (id)       => deleteDoc(doc(db, OBRAS_COL, obraId, 'logistica', id));

  return { logistica, loading, add, update, remove };
}
