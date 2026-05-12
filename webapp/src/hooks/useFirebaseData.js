import { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { normalizeDate } from '../helpers/financieros';

/**
 * Hook que gestiona todas las suscripciones a Firestore.
 * Se activa solo cuando `user` está autenticado.
 *
 * @param {object|null} user - Usuario de Firebase Auth
 * @returns {{ movimientos, obras, propiedades, proveedores, clientes, contratos, vencimientos }}
 */
export function useFirebaseData(user) {
  const [movimientos, setMovimientos] = useState([]);
  const [obras, setObras] = useState([]);
  const [propiedades, setPropiedades] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [vencimientos, setVencimientos] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [inboxTickets, setInboxTickets] = useState([]);

  useEffect(() => {
    if (!user) return;

    const col = (name, ...orderArgs) =>
      query(collection(db, 'artifacts', appId, 'public', 'data', name), orderBy(...orderArgs));

    const unsubMov = onSnapshot(col('movimientos', 'fecha', 'desc'), (snap) => {
      setMovimientos(snap.docs.map(d => {
        const data = d.data();
        return { id: d.id, ...data, fecha: normalizeDate(data.fecha) };
      }));
    });

    const unsubObras = onSnapshot(col('obras', 'nombre', 'asc'), (snap) => {
      setObras(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubProps = onSnapshot(col('propiedades', 'nombre', 'asc'), (snap) => {
      setPropiedades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubProvs = onSnapshot(col('proveedores', 'nombre', 'asc'), (snap) => {
      setProveedores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubClientes = onSnapshot(col('clientes', 'nombre', 'asc'), (snap) => {
      setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubContratos = onSnapshot(col('contratos', 'fechaInicio', 'desc'), (snap) => {
      setContratos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubVenc = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'vencimientos'),
      snap => setVencimientos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubSolicitudes = onSnapshot(
      query(collection(db, 'artifacts', appId, 'public', 'data', 'solicitudes'), orderBy('createdAt', 'desc')),
      snap => setSolicitudes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubInbox = onSnapshot(
      query(collection(db, 'artifacts', appId, 'public', 'data', 'inbox_movimientos'), orderBy('createdAt', 'desc')),
      snap => setInboxTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    return () => {
      unsubMov();
      unsubObras();
      unsubProps();
      unsubProvs();
      unsubClientes();
      unsubContratos();
      unsubVenc();
      unsubSolicitudes();
      unsubInbox();
    };
  }, [user]);

  return { movimientos, obras, propiedades, proveedores, clientes, contratos, vencimientos, solicitudes, inboxTickets };
}
