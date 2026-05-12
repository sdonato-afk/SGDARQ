// ─────────────────────────────────────────────────────────────────────────────
// useComprobantes.js — Hook Firebase para el módulo de Contabilidad
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  collection, onSnapshot, doc, setDoc, deleteDoc,
  query, where, writeBatch, getDocs, orderBy
} from 'firebase/firestore';
import { db, appId } from '../../config/firebase';

const BASE_PATH = ['artifacts', appId, 'public', 'data'];

function colRef(name) {
  return collection(db, ...BASE_PATH, name);
}

/**
 * Hook principal de contabilidad.
 * Carga comprobantes, configuración y expone funciones CRUD.
 */
export function useComprobantes({ empresa, periodo } = {}) {
  const [comprobantes, setComprobantes]             = useState([]);
  const [configContable, setConfigContable]         = useState(null);
  const [loading, setLoading]                       = useState(true);
  // Pagos de IVA registrados en Oficina (movimientos con rubro='IVA')
  const [pagosIVA, setPagosIVA]                     = useState({});

  // ── Suscripción a comprobantes ────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    let q = colRef('comprobantes');

    // Filtro opcional por empresa
    if (empresa && empresa !== 'Todas') {
      q = query(q, where('empresa', '==', empresa));
    }

    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Filtro de período en cliente (evita índice compuesto)
      const filtered = periodo
        ? docs.filter(c => c.periodo === periodo)
        : docs;
      setComprobantes(filtered.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')));
      setLoading(false);
    });

    return () => unsub();
  }, [empresa, periodo]);

  // ── Pagos de IVA desde Oficina ──────────────────────────────────────
  // Lee movimientos de la colección principal donde rubro='IVA'
  // y los agrupa por periodoIVA para consulta rápida en IVADashboard.
  useEffect(() => {
    const colMov = collection(db, 'artifacts', appId, 'public', 'data', 'movimientos');
    const unsub = onSnapshot(
      query(colMov, orderBy('fecha', 'desc')),
      (snap) => {
        const pagos = {};
        snap.docs.forEach(d => {
          const m = { id: d.id, ...d.data() };
          if (m.rubro === 'IVA' && m.periodoIVA) {
            if (!pagos[m.periodoIVA]) pagos[m.periodoIVA] = [];
            pagos[m.periodoIVA].push(m);
          }
        });
        setPagosIVA(pagos);
      }
    );
    return () => unsub();
  }, []);

  // ── Config contable (alícuotas, CUITs, etc.) ─────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, ...BASE_PATH, 'config_contable', 'general'),
      snap => {
        if (snap.exists()) setConfigContable(snap.data());
        else setConfigContable({ empresas: [], alicuotaIIBB: 4.9 });
      }
    );
    return () => unsub();
  }, []);

  // ── Guardar un comprobante ────────────────────────────────────────────────
  const guardarComprobante = useCallback(async (data) => {
    const id = data.id || `${data.empresa}-${data.tipoImport || 'manual'}-${data.fecha}-${data.numeroCompleto || Date.now()}`;
    await setDoc(doc(colRef('comprobantes'), id), {
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return id;
  }, []);

  // ── Guardar batch de comprobantes (importación ARCA) ─────────────────────
  const guardarBatch = useCallback(async (items) => {
    const CHUNK = 450;
    for (let i = 0; i < items.length; i += CHUNK) {
      const batch = writeBatch(db);
      items.slice(i, i + CHUNK).forEach(item => {
        const ref = doc(colRef('comprobantes'), item.id);
        batch.set(ref, { ...item, updatedAt: new Date().toISOString() }, { merge: true });
      });
      await batch.commit();
    }
  }, []);

  // ── Eliminar comprobante ──────────────────────────────────────────────────
  const eliminarComprobante = useCallback(async (id) => {
    await deleteDoc(doc(colRef('comprobantes'), id));
  }, []);

  // ── Eliminar todos los de una empresa + período ───────────────────────────
  const limpiarImportacion = useCallback(async (empresaFilter, periodoFilter, tipoImport) => {
    let q = query(colRef('comprobantes'),
      where('empresa', '==', empresaFilter),
      where('periodo', '==', periodoFilter),
      where('tipoImport', '==', tipoImport),
      where('origen', '==', 'arca')
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }, []);

  // ── Eliminar TODOS los comprobantes de una empresa (origen arca) ──────────
  const limpiarEmpresa = useCallback(async (empresaFilter) => {
    const snap = await getDocs(
      query(colRef('comprobantes'),
        where('empresa', '==', empresaFilter),
        where('origen',  '==', 'arca')
      )
    );
    const CHUNK = 450;
    for (let i = 0; i < snap.docs.length; i += CHUNK) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + CHUNK).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    return snap.docs.length;
  }, []);

  const guardarConfig = useCallback(async (data) => {
    await setDoc(
      doc(db, ...BASE_PATH, 'config_contable', 'general'),
      data, { merge: true }
    );
  }, []);

  return {
    comprobantes,
    configContable,
    pagosIVA,
    loading,
    guardarComprobante,
    guardarBatch,
    eliminarComprobante,
    limpiarImportacion,
    limpiarEmpresa,
    guardarConfig,
  };
}
