import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, orderBy, addDoc, updateDoc } from 'firebase/firestore';
import { db, OBRAS_COL } from '../config/firebase';

export function useAcopios(obraId) {
  const [acopios, setAcopios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!obraId) return;
    const q = query(collection(db, OBRAS_COL, obraId, 'acopios'), orderBy('fecha_compra', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setAcopios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [obraId]);

  const add    = (data)     => addDoc(collection(db, OBRAS_COL, obraId, 'acopios'), { ...data, createdAt: new Date().toISOString() });
  const update = (id, data) => updateDoc(doc(db, OBRAS_COL, obraId, 'acopios', id), data);

  return { acopios, loading, add, update };
}
