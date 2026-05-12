import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../config/firebase.js';

/**
 * Hook para gestionar las taxonomías (Obras, Oficina, Alquileres, Directorio)
 * Lee/escribe en Firestore: {appId}/public/data/taxonomias/{docId}
 */
export function useTaxonomia(docId = 'obras_egreso') {
  const [taxonomia, setTaxonomia] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuchar directamente el documento correspondiente
    const ref = doc(db, `artifacts/${appId}/public/data/taxonomias`, docId);
    const unsub = onSnapshot(ref, async (snap) => {
      if (snap.exists()) {
        setTaxonomia(snap.data().categorias || []);
      } else {
        // Inicializar vacío si no existiese en la BD
        setTaxonomia([]);
      }
      setLoading(false);
    });
    return unsub;
  }, [docId]);

  const save = async (categorias) => {
    await setDoc(doc(db, `artifacts/${appId}/public/data/taxonomias`, docId), { categorias });
  };

  return { taxonomia, loading, save };
}
