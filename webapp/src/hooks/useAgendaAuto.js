import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { encontrarPagoParaVencimiento } from '../lib/conciliacion';

let globalCache = null;
let lastFetchTime = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutos de caché

export function useAgendaAuto() {
  const [contratos,    setContratos]    = useState([]);
  const [movimientos,  setMovimientos]  = useState([]);
  const [obras,        setObras]        = useState([]);
  const [propiedades,  setPropiedades]  = useState([]);
  const [vencimientos, setVencimientos] = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      if (globalCache && (Date.now() - lastFetchTime < CACHE_TTL)) {
        setContratos(globalCache.contratos);
        setMovimientos(globalCache.movimientos);
        setObras(globalCache.obras);
        setPropiedades(globalCache.propiedades);
        setVencimientos(globalCache.vencimientos);
        setLoading(false);
        return;
      }

      // 1. Fetch colecciones base
      const [sContratos, sObras, sProps, sVenc] = await Promise.all([
        getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'contratos')),
        getDocs(query(collection(db, 'artifacts', appId, 'public', 'data', 'obras'), where('estado', '==', 'En Proceso'))),
        getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'propiedades')),
        getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'vencimientos')),
      ]);

      const obrasActivas = sObras.docs.map(d => ({ id: d.id, ...d.data() }));

      // 2. Fetch Movimientos: única query para los últimos 60 días (reemplaza N queries por obra)
      // Cubre tanto la detección de alquileres del mes como la inactividad de obras (> 30 días)
      const hoy = new Date();
      const hace60 = new Date();
      hace60.setDate(hoy.getDate() - 60);
      const hace60str = hace60.toISOString().slice(0, 10);

      const sMovsGlobal = await getDocs(query(
        collection(db, 'artifacts', appId, 'public', 'data', 'movimientos'),
        where('fecha', '>=', hace60str)
      ));

      const uniqueMovs = sMovsGlobal.docs.map(d => ({ id: d.id, ...d.data() }));

      const data = {
        contratos: sContratos.docs.map(d => ({ id: d.id, ...d.data() })),
        obras: obrasActivas,
        propiedades: sProps.docs.map(d => ({ id: d.id, ...d.data() })),
        vencimientos: sVenc.docs.map(d => ({ id: d.id, ...d.data() })).filter(v => !v.pagado),
        movimientos: uniqueMovs
      };

      globalCache = data;
      lastFetchTime = Date.now();

      setContratos(data.contratos);
      setObras(data.obras);
      setPropiedades(data.propiedades);
      setVencimientos(data.vencimientos);
      setMovimientos(data.movimientos);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const items = useMemo(() => {
    const hoy     = new Date();
    const mes     = hoy.getMonth();
    const anio    = hoy.getFullYear();
    const results = [];

    // ── 1. Contratos por vencer en < 30 días ──────────────────────────
    contratos.forEach(c => {
      if (!c.fechaFin) return;
      const vence = new Date(c.fechaFin);
      const dias  = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
      if (dias > 0 && dias <= 30) {
        const prop = propiedades.find(p => p.id === c.propiedadId);
        results.push({
          id:             `auto-contrato-${c.id}`,
          titulo:         `Renovación de contrato`,
          descripcion:    `${prop?.nombre || c.propiedadId} vence en ${dias} días`,
          area:           'Alquileres',
          prioridad:      dias <= 7 ? 'critica' : 'alta',
          tipo:           'automatica',
          id_referencia:  c.id,
          tipo_referencia:'contrato',
          responsable:    'General',
          fechaVencimiento: c.fechaFin,
          montoPotencial: c.monto || 0,
        });
      }
    });

    // ── 2. Alquileres y Expensas pendientes de cobro este mes ──────────
    // Helpers para detectar tipo de ingreso (igual que AreaAlquileres)
    const esIngAlquiler = (m) => ['alquiler','alquileres'].includes((m.rubro||m.categoriaEgreso||'').toLowerCase());
    const esIngExpensas = (m) => (m.rubro||m.categoriaEgreso||'').toLowerCase().includes('expens');

    contratos.forEach(c => {
      if (!c.clienteId || !c.propiedadId) return;
      const inicio = c.fechaInicio ? new Date(c.fechaInicio) : null;
      const fin    = c.fechaFin    ? new Date(c.fechaFin)    : null;
      if (inicio && inicio > hoy) return;
      if (fin    && fin    < hoy) return;

      const prop    = propiedades.find(p => p.id === c.propiedadId);
      const propNom = (prop?.nombre || '').toUpperCase();
      const esVO    = propNom.startsWith('VO');

      const movsEsteMes = movimientos.filter(m => {
        if (m.area !== 'Alquileres' || m.tipo !== 'Ingreso' || m.propiedadId !== c.propiedadId || !m.fecha) return false;
        const [y, mm] = m.fecha.split('-');
        if (!y || !mm) return false;
        return parseInt(y, 10) === anio && (parseInt(mm, 10) - 1) === mes;
      });

      // ── Alquiler sin cobrar (solo alerta a partir del día 10) ──
      const alquilerCobrado = movsEsteMes.some(m => esIngAlquiler(m));
      if (!alquilerCobrado && hoy.getDate() >= 10) {
        results.push({
          id:             `auto-cobro-alq-${c.id}`,
          titulo:         `Alquiler sin cobrar`,
          descripcion:    `${prop?.nombre || c.propiedadId} — sin ingreso de alquiler este mes`,
          area:           'Alquileres',
          prioridad:      hoy.getDate() > 15 ? 'critica' : 'alta',
          tipo:           'automatica',
          id_referencia:  c.id,
          tipo_referencia:'contrato',
          responsable:    'General',
          fechaVencimiento: null,
          montoPotencial: c.montoAlquiler || c.monto || 0,
        });
      }

      // ── Expensas sin cobrar (solo propiedades VO) ──
      if (esVO) {
        const expensasCobradas = movsEsteMes.some(m => esIngExpensas(m));
        if (!expensasCobradas) {
          results.push({
            id:             `auto-cobro-exp-${c.id}`,
            titulo:         `Expensas sin cobrar`,
            descripcion:    `${prop?.nombre || c.propiedadId} — sin ingreso de expensas este mes`,
            area:           'Alquileres',
            prioridad:      hoy.getDate() > 20 ? 'critica' : 'alta',
            tipo:           'automatica',
            id_referencia:  c.id,
            tipo_referencia:'contrato',
            responsable:    'General',
            fechaVencimiento: null,
            montoPotencial: 0,
          });
        }
      }
    });

    // ── 3. Obras activas sin movimiento hace > 30 días ───────────────
    obras.forEach(o => {
      const movsObra = movimientos.filter(m => m.obraId === o.id);
      if (movsObra.length === 0) {
        results.push({
          id:             `auto-obra-${o.id}`,
          titulo:         `Sin actividad registrada`,
          descripcion:    `${o.nombre} — sin movimientos en Firestore`,
          area:           'Obras',
          prioridad:      'alta',
          tipo:           'automatica',
          id_referencia:  o.id,
          tipo_referencia:'obra',
          responsable:    'General',
          fechaVencimiento: null,
          montoPotencial: 0,
        });
        return;
      }
      const ultimaMov = movsObra
        .map(m => new Date(m.fecha))
        .sort((a, b) => b - a)[0];
      const diasSinMov = Math.floor((hoy - ultimaMov) / (1000 * 60 * 60 * 24));
      if (diasSinMov > 30) {
        results.push({
          id:             `auto-obra-${o.id}`,
          titulo:         `Sin actividad de obra`,
          descripcion:    `${o.nombre} — último movimiento hace ${diasSinMov} días`,
          area:           'Obras',
          prioridad:      diasSinMov > 60 ? 'critica' : 'alta',
          tipo:           'automatica',
          id_referencia:  o.id,
          tipo_referencia:'obra',
          responsable:    'General',
          fechaVencimiento: null,
          montoPotencial: 0,
        });
      }
    });

    // ── 4. Vencimientos regulatorios < 14 días (únicamente si no tienen pago conciliado) ──
    vencimientos.forEach(v => {
      if (!v.fecha) return;

      // Delegar la lógica de conciliación a la función central
      const pagado = encontrarPagoParaVencimiento(movimientos, v);
      if (pagado) return; // ya tiene un asiento de pago → no alertar

      const vence = new Date(v.fecha);
      const dias  = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
      if (dias >= 0 && dias <= 14) {
        results.push({
          id:             `auto-venc-${v.id}`,
          titulo:         `Pago regulatorio`,
          descripcion:    `${v.concepto || v.tipo || 'Vencimiento'} — ${dias === 0 ? 'HOY' : `en ${dias} días`}`,
          area:           'Oficina',
          prioridad:      dias <= 3 ? 'critica' : 'alta',
          tipo:           'automatica',
          id_referencia:  v.id,
          tipo_referencia:'vencimiento',
          responsable:    'General',
          fechaVencimiento: v.fecha,
          montoPotencial: v.monto || 0,
        });
      }
    });

    return results;
  }, [contratos, movimientos, obras, propiedades, vencimientos]);

  return { items, loading };
}
