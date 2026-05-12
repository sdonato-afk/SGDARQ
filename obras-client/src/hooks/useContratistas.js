import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, OBRAS_COL } from '../config/firebase';

export function useContratistas(obraId) {
  const [contratistas, setContratistas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!obraId) return;
    const q = query(collection(db, OBRAS_COL, obraId, 'contratistas'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setContratistas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [obraId]);

  const add    = (data)     => addDoc(collection(db, OBRAS_COL, obraId, 'contratistas'), { ...data, createdAt: new Date().toISOString() });
  const update = (id, data) => updateDoc(doc(db, OBRAS_COL, obraId, 'contratistas', id), data);
  const remove = (id)       => deleteDoc(doc(db, OBRAS_COL, obraId, 'contratistas', id));

  return { contratistas, loading, add, update, remove };
}
