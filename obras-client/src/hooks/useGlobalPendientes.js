import { useState, useEffect } from 'react';
import { collection, collectionGroup, onSnapshot, query, where } from 'firebase/firestore';
import { db, MAIN_PATH } from '../config/firebase';

const APP_ID = 'sg-darq';

const esCobroHonorarios = (m) =>
  m.tipo === 'Ingreso' && (m.concepto === 'Honorarios' || m.subRubro === 'Honorarios');

function movToUSD(m, tcFallback = 1300) {
  if (m.moneda === 'USD') return parseFloat(m.monto) || 0;
  const tc = parseFloat(m.cotizacionHistorica || m.tipoCambioReferencia || m.tc || tcFallback) || 1;
  return (parseFloat(m.monto) || 0) / tc;
}

export function useGlobalPendientes() {
  const [reqs,        setReqs]        = useState([]);
  const [certs,       setCerts]       = useState([]);
  const [honorarios,  setHonorarios]  = useState([]);
  const [movsIngreso, setMovsIngreso] = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    let done = { reqs: false, certs: false, hon: false, movs: false };
    const check = () => {
      if (done.reqs && done.certs && done.hon && done.movs) setLoading(false);
    };

    const unsubReqs = onSnapshot(
      query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'requerimientos')),
      snap => { setReqs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); done.reqs = true; check(); },
      () => { done.reqs = true; check(); }
    );

    const unsubCerts = onSnapshot(
      query(collectionGroup(db, 'certificaciones')),
      snap => {
        setCerts(snap.docs.map(d => {
          const parts = d.ref.path.split('/');
          const obraId = parts[parts.length - 3];
          return { id: d.id, obraId, ...d.data() };
        }));
        done.certs = true; check();
      },
      () => { done.certs = true; check(); }
    );

    const unsubHon = onSnapshot(
      query(collectionGroup(db, 'honorarios')),
      snap => {
        setHonorarios(snap.docs.map(d => {
          const parts = d.ref.path.split('/');
          const obraId = parts[parts.length - 3];
          return { id: d.id, obraId, ...d.data() };
        }));
        done.hon = true; check();
      },
      () => { done.hon = true; check(); }
    );

    const unsubMovs = onSnapshot(
      query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'movimientos'),
        where('tipo', '==', 'Ingreso'),
        where('area', '==', 'Obras')
      ),
      snap => {
        setMovsIngreso(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        done.movs = true; check();
      },
      (err) => {
        console.warn('[useGlobalPendientes] movimientos query failed:', err.code, err.message);
        done.movs = true; check();
      }
    );

    return () => { unsubReqs(); unsubCerts(); unsubHon(); unsubMovs(); };
  }, []);

  // Cobros de honorarios agrupados por obraId — espejo de TabHonorarios
  const cobradoMovsPorObra = {};
  movsIngreso
    .filter(esCobroHonorarios)
    .forEach(m => {
      if (!m.obraId) return;
      cobradoMovsPorObra[m.obraId] = (cobradoMovsPorObra[m.obraId] || 0) + movToUSD(m);
    });

  const reqsActivos     = reqs.filter(r => ['pendiente', 'comprado'].includes(r.estado));
  const certsPendientes = certs.filter(c =>
    (c.aprobada || c.estado === 'aprobada') && c.pago_cliente_estado !== 'pagado'
  );

  // Honorarios — lógica operativa: si hay cobros en asientos no alertar
  const honPendientes = honorarios.filter(h => {
    if (!['pendiente', 'emitido'].includes(h.estado)) return false;
    return (cobradoMovsPorObra[h.obraId] || 0) <= 0;
  });

  const byObra = {};
  const add = (obraId, key, items) => {
    if (!byObra[obraId]) byObra[obraId] = { reqs: [], certs: [], honorarios: [] };
    byObra[obraId][key].push(...items);
  };
  reqsActivos.forEach(r => add(r.obraId, 'reqs', [r]));
  certsPendientes.forEach(c => add(c.obraId, 'certs', [c]));
  honPendientes.forEach(h => add(h.obraId, 'honorarios', [h]));

  return {
    byObra,
    totales: {
      reqs:       reqsActivos.length,
      urgentes:   reqsActivos.filter(r => r.urgencia === 'urgente').length,
      certs:      certsPendientes.length,
      honorarios: honPendientes.length,
    },
    loading,
  };
}
