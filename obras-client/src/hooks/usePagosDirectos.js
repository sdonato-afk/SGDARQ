import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, OBRAS_COL } from '../config/firebase';

export function useFacturasDirectas(obraId) {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!obraId) return;
    const q = query(collection(db, OBRAS_COL, obraId, 'facturas_directas'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setFacturas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [obraId]);

  const add    = (data)     => addDoc(collection(db, OBRAS_COL, obraId, 'facturas_directas'), { ...data, estado: 'pendiente', createdAt: new Date().toISOString() });
  const update = (id, data) => updateDoc(doc(db, OBRAS_COL, obraId, 'facturas_directas', id), data);
  const remove = (id)       => deleteDoc(doc(db, OBRAS_COL, obraId, 'facturas_directas', id));

  return { facturas, loading, add, update, remove };
}

// Alias con nombre alineado a la UI
export function usePagosDirectos(obraId) {
  const { facturas, ...rest } = useFacturasDirectas(obraId);
  return { pagosDirectos: facturas, ...rest };
}
