import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, OBRAS_COL } from '../config/firebase';

export function useHonorarios(obraId) {
  const [honorarios, setHonorarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!obraId) return;
    const q = query(collection(db, OBRAS_COL, obraId, 'honorarios'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setHonorarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [obraId]);

  const add    = (data)     => addDoc(collection(db, OBRAS_COL, obraId, 'honorarios'), { ...data, createdAt: new Date().toISOString() });
  const update = (id, data) => updateDoc(doc(db, OBRAS_COL, obraId, 'honorarios', id), data);
  const remove = (id)       => deleteDoc(doc(db, OBRAS_COL, obraId, 'honorarios', id));

  return { honorarios, loading, add, update, remove };
}
