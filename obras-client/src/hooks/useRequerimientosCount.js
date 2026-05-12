import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

const APP_ID = 'sg-darq';
const ESTADOS_ACTIVOS = ['pendiente', 'comprado'];

/**
 * Devuelve el conteo de requerimientos activos (no entregados ni rechazados)
 * para la obra seleccionada. Se suscribe en tiempo real a Firestore.
 */
export function useRequerimientosCount(obraId) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!obraId) { setCount(0); return; }

    const q = query(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'requerimientos'),
      where('obraId', '==', obraId),
      where('estado', 'in', ESTADOS_ACTIVOS)
    );

    const unsub = onSnapshot(q, snap => {
      setCount(snap.size);
    }, () => { setCount(0); });

    return unsub;
  }, [obraId]);

  return count;
}
