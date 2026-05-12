import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, orderBy, setDoc, getDoc } from 'firebase/firestore';
import { db, MAIN_PATH, OBRAS_COL } from '../config/firebase';
import { slugify, generateToken } from '../lib/slugify';

// ─── Lee TODAS las obras del sistema principal (READ-ONLY) ───────
export function useObrasMain() {
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, ...MAIN_PATH, 'obras'), orderBy('nombre', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setObras(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  return { obras, loading };
}

// ─── Config de seguimiento de una obra (read/write) ───────────────
export function useObraConfig(obraId) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!obraId) { setLoading(false); return; }
    const unsub = onSnapshot(doc(db, OBRAS_COL, obraId), snap => {
      setConfig(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    });
    return unsub;
  }, [obraId]);

  const initConfig = async (obraData) => {
    const docRef = doc(db, OBRAS_COL, obraId);
    const snap = await getDoc(docRef);
    if (snap.exists()) return;
    await setDoc(docRef, {
      obraId,
      slug: slugify(obraData.nombre),
      token_cliente: generateToken(),
      nombre: obraData.nombre,
      fee_gestion_pct: 12,
      caja_chica_sin_comprobante_pct: 30,
      honorarios_proyecto_total: 0,
      honorarios_direccion_total: 0,
      honorarios_admin_total: 0,
      honorarios_moneda: 'USD',
      caja_chica_fondo: 4000,
      caja_chica_moneda: 'USD',
      logistica_semanal: 0,
      logistica_moneda: 'USD',
      retencion_reparo_pct: 5,
      createdAt: new Date().toISOString(),
    });
  };

  const updateConfig = async (data) => {
    await setDoc(doc(db, OBRAS_COL, obraId), data, { merge: true });
  };

  return { config, loading, initConfig, updateConfig };
}
