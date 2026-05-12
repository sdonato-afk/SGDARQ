import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, OBRAS_COL } from '../config/firebase';
import { TEMPLATE_TAREAS } from '../lib/checklistTemplate';

export function useTareas(obraId) {
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!obraId) return;
    const q = query(collection(db, OBRAS_COL, obraId, 'tareas'), orderBy('faseNum', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setTareas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [obraId]);

  const add = (data) => addDoc(collection(db, OBRAS_COL, obraId, 'tareas'), {
    ...data,
    estado: data.estado || 'pendiente',
    createdAt: new Date().toISOString(),
  });

  const update = (id, data) => updateDoc(doc(db, OBRAS_COL, obraId, 'tareas', id), data);
  const remove = (id) => deleteDoc(doc(db, OBRAS_COL, obraId, 'tareas', id));

  // Precargar template completo (se usa al inicializar el checklist de una obra)
  const initFromTemplate = async () => {
    const batch = writeBatch(db);
    TEMPLATE_TAREAS.forEach(t => {
      const ref = doc(collection(db, OBRAS_COL, obraId, 'tareas'));
      batch.set(ref, {
        ...t,
        estado: 'pendiente',
        responsable: '',
        fechaInstalacion: '',
        fechaLimite: '',
        completadaPor: '',
        completadaFecha: '',
        fotoEvidencia: '',
        notas: '',
        prioridad: t.leadTimeDias >= 30 ? 'urgente' : 'normal',
        createdAt: new Date().toISOString(),
      });
    });
    await batch.commit();
  };

  return { tareas, loading, add, update, remove, initFromTemplate };
}
