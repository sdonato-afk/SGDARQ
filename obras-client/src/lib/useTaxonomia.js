import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase.js';

/**
 * Hook para gestionar la taxonomía global del módulo de obras.
 * Lee desde el sistema central en modo solo lectura.
 */
export function useTaxonomia() {
  const [taxonomia, setTaxonomia] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = doc(db, 'artifacts', 'sg-darq', 'public', 'data', 'taxonomias', 'obras_egreso');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setTaxonomia(snap.data().categorias || []);
      } else {
        setTaxonomia([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error al cargar taxonomía:', error);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Helpers de consulta
  const getCategorias = () => taxonomia;

  const getRubros = (categoriaId) => {
    const cat = taxonomia.find(c => c.id === categoriaId);
    return cat?.rubros || [];
  };

  const getConceptos = (categoriaId, rubroId) => {
    const cat = taxonomia.find(c => c.id === categoriaId);
    const rub = cat?.rubros?.find(r => r.id === rubroId);
    return rub?.conceptos || [];
  };

  return { taxonomia, loading, getCategorias, getRubros, getConceptos };
}
