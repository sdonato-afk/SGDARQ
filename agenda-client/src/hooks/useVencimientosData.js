import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db, MAIN_COL } from '../config/firebase';
import { encontrarPagoParaVencimiento } from '../lib/conciliacion';

/**
 * Calcula la próxima fecha según periodicidad.
 */
function proximaFecha(fechaStr, periodicidad) {
  const d = new Date(fechaStr + 'T00:00:00');
  switch (periodicidad) {
    case 'mensual':     d.setMonth(d.getMonth() + 1);  break;
    case 'bimestral':   d.setMonth(d.getMonth() + 2);  break;
    case 'trimestral':  d.setMonth(d.getMonth() + 3);  break;
    case 'anual':       d.setFullYear(d.getFullYear() + 1); break;
    default: return null;
  }
  return d.toISOString().slice(0, 10);
}

/**
 * useVencimientosData — CRUD completo para la colección vencimientos.
 * Agenda-client es el propietario. El ERP solo lee.
 */
export function useVencimientosData() {
  const [vencimientosRAW, setVencimientosRAW] = useState([]);
  const [inboxRAW, setInboxRAW] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = collection(db, ...MAIN_COL('vencimientos'));
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
      setVencimientosRAW(data);
      setLoading(false);
    });

    const refInbox = query(collection(db, ...MAIN_COL('inbox_movimientos')), where('estado', '==', 'pendiente'));
    const unsubInbox = onSnapshot(refInbox, (snap) => {
      setInboxRAW(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsub(); unsubInbox(); };
  }, []);

  // Movimientos (Asientos) para conciliación — solo últimos 3 meses, one-shot
  useEffect(() => {
    const hace3meses = new Date();
    hace3meses.setMonth(hace3meses.getMonth() - 3);
    const desde = hace3meses.toISOString().slice(0, 10);

    getDocs(query(
      collection(db, ...MAIN_COL('movimientos')),
      where('fecha', '>=', desde)
    )).then(snap => {
      const filtrados = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(m => m.tipo === 'Egreso');
      setMovimientos(filtrados);
    });
  }, []);

  // Motor de Conciliación Read-Only
  // Delega toda la lógica a la función central de lib/conciliacion.js
  const vencimientos = useMemo(() => {
    const list = vencimientosRAW.map(v => {
      if (v.pagado) return v; // Ya pagado manualmente — no tocar

      // Sin identificador en el vencimiento → no intentar conciliar
      const tieneIdentificador = !!(v.proveedorId || (v.proveedorNombre || '').trim() || (v.concepto || '').trim());
      if (!tieneIdentificador) return v;

      const match = encontrarPagoParaVencimiento(movimientos, v);

      if (match) {
        return { ...v, autoPagado: true, movimientoId: match.id, fechaPagoAuto: match.fecha };
      }
      return v;
    });

    const tickets = inboxRAW.map(t => {
      let fechaVal = new Date().toISOString().slice(0, 10);
      if (t.createdAt && typeof t.createdAt.toDate === 'function') {
        fechaVal = t.createdAt.toDate().toISOString().slice(0, 10);
      } else if (typeof t.createdAt === 'string') {
        fechaVal = t.createdAt.slice(0, 10);
      }
      return {
        id: t.id,
        esTicketInbox: true,
        concepto: `Ticket: ${t.nota || 'Sin nota'}`,
        proveedorNombre: t.proveedor || 'Proveedor s/d',
        obraNombre: t.obraNombre || 'Obra s/d',
        monto: t.monto || 0,
        moneda: 'ARS',
        fecha: fechaVal,
        categoria: 'Gastos Obra',
        pagado: false
      };
    });

    return [...list, ...tickets];
  }, [vencimientosRAW, movimientos, inboxRAW]);

  const agregarVencimiento = async (item) => {
    await addDoc(collection(db, ...MAIN_COL('vencimientos')), {
      ...item,
      monto: Number(item.monto) || 0,
      pagado: false,
      createdAt: serverTimestamp(),
    });
  };

  const actualizarVencimiento = async (id, data) => {
    await updateDoc(doc(db, ...MAIN_COL('vencimientos'), id), {
      ...data,
      monto: Number(data.monto) || 0,
    });
  };

  /**
   * Marcar como pagado. Si tiene periodicidad, crea el siguiente automáticamente.
   */
  const marcarPagado = async (id, item) => {
    await updateDoc(doc(db, ...MAIN_COL('vencimientos'), id), { pagado: true });

    if (item.periodicidad && item.periodicidad !== 'unica') {
      const next = proximaFecha(item.fecha, item.periodicidad);
      if (next) {
        await addDoc(collection(db, ...MAIN_COL('vencimientos')), {
          concepto:     item.concepto,
          categoria:    item.categoria,
          moneda:       item.moneda || 'ARS',
          monto:        item.monto || 0,
          periodicidad: item.periodicidad,
          fecha:        next,
          pagado:       false,
          createdAt:    serverTimestamp(),
        });
      }
    }
  };

  const eliminarVencimiento = async (id) => {
    await deleteDoc(doc(db, ...MAIN_COL('vencimientos'), id));
  };

  return { vencimientos, loading, agregarVencimiento, actualizarVencimiento, marcarPagado, eliminarVencimiento };
}
