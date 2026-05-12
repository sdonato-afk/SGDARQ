import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, MAIN_PATH } from '../config/firebase';

// ─── Movimientos del sistema principal para una obra (READ-ONLY) ──
export function useMovimientosMain(obraId) {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Forzar re-fetch del servidor (útil tras editar en consola de Firebase)
  const refresh = useCallback(() => setRefreshTick(t => t + 1), []);

  useEffect(() => {
    if (!obraId) { setLoading(false); return; }

    let cancelled = false;

    const q = query(
      collection(db, ...MAIN_PATH, 'movimientos'),
      where('obraId', '==', obraId)
    );

    // Si hay un refreshTick > 0 hacemos un getDocs que ignora el cache
    if (refreshTick > 0) {
      setLoading(true);
      getDocs(q).then(snap => {
        if (cancelled) return;
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
        setMovimientos(docs);
        setLoading(false);
        setError(null);
      }).catch(err => {
        if (cancelled) return;
        console.error('[useMovimientosMain] refresh', err);
        setError(err.message);
        setLoading(false);
      });
      return () => { cancelled = true; };
    }

    // Suscripción normal con includeMetadataChanges para capturar actualizaciones
    // del servidor aunque el cache local esté activo
    const unsub = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        // Ignoramos snapshots que vienen solo del cache pendiente de sync
        if (snap.metadata.fromCache && snap.metadata.hasPendingWrites) return;
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
        setMovimientos(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[useMovimientosMain]', err);
        setError(err.message);
        setLoading(false);
      }
    );
    return () => { cancelled = true; unsub(); };
  }, [obraId, refreshTick]);

  return { movimientos, loading, error, refresh };
}

// ─── TC Promedio ponderado de la obra ────────────────────────────
export function useTcGlobal(obraId) {
  const { movimientos, loading } = useMovimientosMain(obraId);
  let sumUSD = 0, sumARS = 0;

  for (const m of movimientos) {
    const mnt = Math.abs(parseFloat(m.monto || 0));
    const tc  = parseFloat(m.tipoCambioReferencia || m.cotizacionHistorica || 1000) || 1000;
    if (m.moneda === 'USD') { sumUSD += mnt; sumARS += mnt * tc; }
    else                    { sumARS += mnt; sumUSD += mnt / tc; }
  }

  const tc = sumUSD > 0 ? sumARS / sumUSD : 1000;
  return { tc, loading };
}

// ─── Proveedores del sistema principal (READ-ONLY) ────────────────
export function useProveedoresMain() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, ...MAIN_PATH, 'proveedores'), orderBy('nombre', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setProveedores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  return { proveedores, loading };
}
