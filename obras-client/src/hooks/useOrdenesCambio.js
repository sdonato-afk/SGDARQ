import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, orderBy, addDoc, updateDoc } from 'firebase/firestore';
import { db, OBRAS_COL } from '../config/firebase';

export function useOrdenesCambio(obraId) {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!obraId) return;
    const q = query(collection(db, OBRAS_COL, obraId, 'ordenes_cambio'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setOrdenes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [obraId]);

  const add    = (data)     => addDoc(collection(db, OBRAS_COL, obraId, 'ordenes_cambio'), { ...data, estado: 'pendiente', createdAt: new Date().toISOString() });
  const update = (id, data) => updateDoc(doc(db, OBRAS_COL, obraId, 'ordenes_cambio', id), data);
  const aprobar = (id)      => update(id, { estado: 'aprobada_cliente', aprobacion_fecha: new Date().toISOString() });

  return { ordenes, loading, add, update, aprobar };
}
