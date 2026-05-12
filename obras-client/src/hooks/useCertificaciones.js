import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, OBRAS_COL } from '../config/firebase';

export function useCertificaciones(obraId) {
  const [certificaciones, setCertificaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!obraId) return;
    const q = query(collection(db, OBRAS_COL, obraId, 'certificaciones'));
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => {
        // Ordenar por fecha (YYYY-MM-DD) o periodo (YYYY-MM) descendente
        const fa = a.fecha || a.periodo || '';
        const fb = b.fecha || b.periodo || '';
        if (fb !== fa) return fb.localeCompare(fa);
        return String(b.numero_cert || '').localeCompare(String(a.numero_cert || ''));
      });
      setCertificaciones(docs);
      setLoading(false);
    });
    return unsub;
  }, [obraId]);

  const add     = (data)      => addDoc(collection(db, OBRAS_COL, obraId, 'certificaciones'), { ...data, createdAt: new Date().toISOString() });
  const update  = (id, data)  => updateDoc(doc(db, OBRAS_COL, obraId, 'certificaciones', id), data);
  const remove  = (id)        => deleteDoc(doc(db, OBRAS_COL, obraId, 'certificaciones', id));
  const approve = (id)        => updateDoc(doc(db, OBRAS_COL, obraId, 'certificaciones', id), { aprobada: true, aprobada_fecha: new Date().toISOString() });

  return { certificaciones, loading, add, update, remove, approve };
}
