import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, APP_ID } from '../config/firebase.js';

export function useTaxonomia(docId = 'obras_egreso') {
  const [taxonomia, setTaxonomia] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!docId) return;
    const ref = doc(db, `artifacts/${APP_ID}/public/data/taxonomias`, docId);
    const unsub = onSnapshot(ref, async (snap) => {
      if (snap.exists()) {
        setTaxonomia(snap.data().categorias || []);
      } else {
        setTaxonomia([]);
      }
      setLoading(false);
    });
    return unsub;
  }, [docId]);

  return { taxonomia, loading };
}
