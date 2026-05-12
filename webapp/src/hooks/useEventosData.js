import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy
} from 'firebase/firestore';
import { db, appId } from '../config/firebase';

/**
 * useEventosData — CRUD para la colección `eventos`.
 * Schema:
 *   titulo, tipoEvento, fechaHora, contacto, lugar,
 *   area, asignadoA (userId), notificacion ('app'|'email'|'whatsapp'|'todos'),
 *   periodicidad ('ninguna'|'diaria'|'semanal'|'quincenal'|'mensual'),
 *   descripcion, completado, createdAt
 */

// Calcula la fecha del siguiente evento según periodicidad
function calcNextFechaHora(fechaHora, periodicidad) {
  const d = new Date(fechaHora);
  switch (periodicidad) {
    case 'diaria':    d.setDate(d.getDate() + 1);   break;
    case 'semanal':   d.setDate(d.getDate() + 7);   break;
    case 'quincenal': d.setDate(d.getDate() + 15);  break;
    case 'mensual':   d.setMonth(d.getMonth() + 1); break;
    default: return null;
  }
  // Formato datetime-local: YYYY-MM-DDTHH:mm
  return d.toISOString().slice(0, 16);
}

export function useEventosData() {
  const [eventos,  setEventos]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'eventos'),
      orderBy('fechaHora', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      setEventos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const agregarEvento = async (data) => {
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'eventos'), {
      ...data,
      completado: false,
      createdAt: new Date().toISOString(),
    });
  };

  /**
   * Marca el evento como completado.
   * Si tiene periodicidad, crea automáticamente el siguiente.
   */
  const completarEvento = async (id) => {
    const evento = eventos.find(e => e.id === id);
    if (!evento) return;

    // Marcar completado
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'eventos', id), { completado: true });

    // Si es recurrente, crear la siguiente ocurrencia
    if (evento.periodicidad && evento.periodicidad !== 'ninguna') {
      const nextFecha = calcNextFechaHora(evento.fechaHora, evento.periodicidad);
      if (nextFecha) {
        const { id: _id, completado: _c, createdAt: _ca, ...rest } = evento;
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'eventos'), {
          ...rest,
          fechaHora:  nextFecha,
          completado: false,
          createdAt:  new Date().toISOString(),
        });
      }
    }
  };

  const eliminarEvento = async (id) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'eventos', id));
  };

  return { eventos, loading, agregarEvento, completarEvento, eliminarEvento };
}
