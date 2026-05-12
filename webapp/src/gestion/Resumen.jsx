import React, { useState, useEffect } from 'react';
import { SearchableSelect, DarqItemRow, DarqSectionDivider } from '@darq/ui';
import { Plus, X, Calendar, PieChart, ExternalLink, Edit3, Receipt, Package, FileCheck, ArrowRight, DollarSign, Check, TrendingUp, HardHat } from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, query, onSnapshot, where, orderBy, updateDoc, getDocs, collectionGroup } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { convertToUSD as _convertToUSD } from '../helpers/financieros';
import ModalRequerimientos from '../components/ModalRequerimientos';
import { useAgendaData }       from '../hooks/useAgendaData';
import { useAgendaAuto }       from '../hooks/useAgendaAuto';
import { useVencimientosData } from '../hooks/useVencimientosData';
import { useEventosData }      from '../hooks/useEventosData';
import { urgenciaScore }       from '../helpers/prioridad';

function diasHasta(s) {
  if (!s) return 999;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const f = new Date((s.length > 10 ? s.slice(0,10) : s) + 'T00:00:00'); f.setHours(0,0,0,0);
  return Math.floor((f - hoy) / 86400000);
}
const cajas = ['Caja Dólares', 'Caja Pesos', 'Banco Amecon', 'Banco Blue', 'MP Amecon', 'MP Blue'];
const areas = ['Obras', 'Alquileres', 'Oficina', 'Directorio'];

const cajasDisplay = [
  { label: 'Caja Dólares', key: 'Caja Dólares', textColor: 'text-amber-400', isUSD: true },
  { label: 'Caja Pesos', key: 'Caja Pesos', textColor: 'text-slate-300', isUSD: false },
  { label: 'Banco Amecon', key: 'Banco Amecon', textColor: 'text-blue-400', isUSD: false },
  { label: 'Banco Blue', key: 'Banco Blue', textColor: 'text-sky-400', isUSD: false },
  { label: 'MP Amecon', key: 'MP Amecon', textColor: 'text-emerald-400', isUSD: false },
  { label: 'MP Blue', key: 'MP Blue', textColor: 'text-teal-400', isUSD: false },
];

/**
 * Tab Resumen — Dashboard global de finanzas
 * Props: movimientos, vencimientos, cotizacionBlue, stats,
 *        onOpenMovimiento, onOpenCobro, onOpenImportar(area)
 */
export default function Resumen({ movimientos, vencimientos, cotizacionBlue, cotizacionCompra, cotizacionVenta, cotizacionUpdated, stats, onOpenMovimiento, onOpenCobro, onOpenImportar, userRole, canLoad, isReadOnly, inboxTickets, onOpenInbox }) {

  // Estado interno
  const [isTransferenciaOpen, setIsTransferenciaOpen] = useState(false);
  const [transForm, setTransForm] = useState({ cajaOrigen: '', cajaDestino: '', monto: '', moneda: 'ARS', tipoCambio: '', concepto: '', fecha: new Date().toISOString().slice(0, 10) });
  const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false);
  const [obrasActivas,  setObrasActivas]  = useState([]);
  
  const [isModalReqOpen, setIsModalReqOpen] = useState(false);
  const [requerimientosData, setRequerimientosData] = useState({ cajas: {}, updatedAt: null });
  const [showPagosPanel, setShowPagosPanel] = useState(false);

  // Fetch requerimientos
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'configuracion', 'requerimientos_viernes'), snap => {
      if (snap.exists()) {
        setRequerimientosData(snap.data());
      } else {
        setRequerimientosData({ cajas: {}, updatedAt: null });
      }
    }, () => {});
    return unsub;
  }, []);

  // Fetch requerimientos de campo (solicitudes desde inspeccion-client)
  const [reqPendientes, setReqPendientes] = useState([]);
  useEffect(() => {
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'requerimientos'),
      where('estado', '==', 'pendiente')
    );
    const unsub = onSnapshot(q, snap => {
      setReqPendientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return unsub;
  }, []);

  // Fetch solicitudes de pago pendientes de aprobación
  const [pagosPendientes, setPagosPendientes] = useState([]);
  useEffect(() => {
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'requerimientos'),
      where('estado', '==', 'pendiente_aprobacion')
    );
    const unsub = onSnapshot(q, snap => {
      setPagosPendientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return unsub;
  }, []);

  // Handlers para aprobar/rechazar solicitudes de pago
  const handleAprobarPago = async (id) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'requerimientos', id), {
      estado: 'aprobada',
      aprobadoPor: 'Director',
      aprobadoFecha: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };
  const handleRechazarPago = async (id) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'requerimientos', id), {
      estado: 'rechazada',
      aprobadoPor: 'Director',
      aprobadoFecha: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  // Fetch pagos aprobados (pendientes de ejecución por Violeta)
  const [pagosAprobados, setPagosAprobados] = useState([]);
  useEffect(() => {
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'requerimientos'),
      where('estado', '==', 'aprobada'),
      where('tipo', '==', 'pago')
    );
    const unsub = onSnapshot(q, snap => {
      setPagosAprobados(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return unsub;
  }, []);

  // Handler para marcar pago como ejecutado
  const handleEjecutarPago = async (id) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'requerimientos', id), {
      estado: 'ejecutada',
      ejecutadoPor: 'Administración',
      ejecutadoFecha: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  // Fetch progreso del checklist por obra
  const [obrasProgreso, setObrasProgreso] = useState({});
  useEffect(() => {
    if (obrasActivas.length === 0) return;
    const fetchTareas = async () => {
      const progreso = {};
      for (const obra of obrasActivas) {
        try {
          const snap = await getDocs(collection(db, 'obras_seguimiento', obra.id, 'tareas'));
          const tareas = snap.docs.map(d => d.data());
          const total = tareas.length;
          const completadas = tareas.filter(t => t.estado === 'completada').length;
          const vencidas = tareas.filter(t => {
            if (t.estado === 'completada') return false;
            if (!t.fechaLimite) return false;
            return new Date(t.fechaLimite) < new Date();
          }).length;
          progreso[obra.id] = { total, completadas, vencidas, pct: total > 0 ? Math.round((completadas / total) * 100) : 0 };
        } catch { progreso[obra.id] = { total: 0, completadas: 0, vencidas: 0, pct: 0 }; }
      }
      setObrasProgreso(progreso);
    };
    fetchTareas();
  }, [obrasActivas]);

  const rawReqItems = requerimientosData.items || Object.entries(requerimientosData.cajas || {}).map(([cajaKey, req]) => ({ caja: cajaKey, ars: req.ars, usd: req.usd, concepto: req.concepto }));
  const reqARS = rawReqItems.reduce((acc, curr) => acc + (parseFloat(curr.ars) || 0), 0);
  const reqUSD = rawReqItems.reduce((acc, curr) => acc + (parseFloat(curr.usd) || 0), 0);

  const convertToUSD = (monto, moneda, tc) => _convertToUSD(monto, moneda, tc, cotizacionBlue);

  // Saldos de caja
  const getCajaSaldo = (cajaKey, asUSD) => {
    return movimientos.filter(m => m.caja === cajaKey).reduce((acc, m) => {
      const monto = Number(m.monto) || 0;
      const val = asUSD
        ? convertToUSD(monto, m.moneda, m.cotizacionHistorica || m.tipoCambioReferencia)
        : (m.moneda === 'USD' ? monto * (m.cotizacionHistorica || m.tipoCambioReferencia || cotizacionBlue) : monto);
      return acc + (m.tipo === 'Ingreso' ? val : -val);
    }, 0);
  };

  const totalLiquidezARS = movimientos.filter(m => cajasDisplay.some(c => c.key === m.caja) && m.moneda === 'ARS').reduce((acc, m) => acc + (m.tipo === 'Ingreso' ? (Number(m.monto) || 0) : -(Number(m.monto) || 0)), 0);
  const totalLiquidezUSD = movimientos.filter(m => cajasDisplay.some(c => c.key === m.caja) && m.moneda === 'USD').reduce((acc, m) => acc + (m.tipo === 'Ingreso' ? (Number(m.monto) || 0) : -(Number(m.monto) || 0)), 0);

  const cashFlowViernes = stats?.cashFlowEstimadoARS || 0;
  const cashFlowInsuficiente = stats?.cashFlowInsuficiente ?? true;
  const proximoViernes = stats?.proximoViernes || '';


  // Handlers Firebase
  const handleTransferencia = async () => {
    if (!transForm.cajaOrigen || !transForm.cajaDestino || !transForm.monto) return alert('Complete todos los campos');
    if (transForm.cajaOrigen === transForm.cajaDestino) return alert('Origen y destino deben ser diferentes');
    const monto = parseFloat(transForm.monto);
    if (isNaN(monto) || monto <= 0) return alert('Monto inválido');
    const isCambioDivisa = transForm.moneda === 'CAMBIO';
    const tc = parseFloat(transForm.tipoCambio) || cotizacionBlue;
    const fechaStr = transForm.fecha || new Date().toISOString().slice(0, 10);
    const concepto = transForm.concepto || (isCambioDivisa ? 'Cambio de divisa' : 'Transferencia entre cajas');
    try {
      const batch = [];
      if (isCambioDivisa) {
        batch.push(addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'movimientos'), {
          fecha: fechaStr, area: 'Tesoreria', tipo: 'Egreso', moneda: 'USD', monto,
          caja: transForm.cajaOrigen, categoriaEgreso: 'cambio_divisa', tipoOperacion: 'cambio_divisa', rubro: 'cambio_divisa', concepto,
          tipoCambioReferencia: tc, cotizacionHistorica: tc, directorId: '', obraId: '', proveedorId: '', clienteId: '', propiedadId: ''
        }));
        batch.push(addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'movimientos'), {
          fecha: fechaStr, area: 'Tesoreria', tipo: 'Ingreso', moneda: 'ARS', monto: monto * tc,
          caja: transForm.cajaDestino, categoriaEgreso: 'cambio_divisa', tipoOperacion: 'cambio_divisa', rubro: 'cambio_divisa', concepto,
          tipoCambioReferencia: tc, cotizacionHistorica: tc, directorId: '', obraId: '', proveedorId: '', clienteId: '', propiedadId: ''
        }));
      } else {
        const monedaMov = transForm.moneda || 'ARS';
        batch.push(addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'movimientos'), {
          fecha: fechaStr, area: 'Tesoreria', tipo: 'Egreso', moneda: monedaMov, monto,
          caja: transForm.cajaOrigen, categoriaEgreso: 'transferencia', tipoOperacion: 'transferencia', rubro: 'transferencia', concepto,
          tipoCambioReferencia: tc, cotizacionHistorica: tc, directorId: '', obraId: '', proveedorId: '', clienteId: '', propiedadId: ''
        }));
        batch.push(addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'movimientos'), {
          fecha: fechaStr, area: 'Tesoreria', tipo: 'Ingreso', moneda: monedaMov, monto,
          caja: transForm.cajaDestino, categoriaEgreso: 'transferencia', tipoOperacion: 'transferencia', rubro: 'transferencia', concepto,
          tipoCambioReferencia: tc, cotizacionHistorica: tc, directorId: '', obraId: '', proveedorId: '', clienteId: '', propiedadId: ''
        }));
      }
      await Promise.all(batch);
      alert('✅ Transferencia registrada');
      setTransForm({ cajaOrigen: '', cajaDestino: '', monto: '', moneda: 'ARS', tipoCambio: '', concepto: '', fecha: new Date().toISOString().slice(0, 10) });
      setIsTransferenciaOpen(false);
    } catch (e) { alert('Error: ' + e.message); }
  };

  // ── HOOKS DE AGENDA (Paridad con Agenda Client) ──
  const { items: manuales,    resolverItem }    = useAgendaData();
  const { items: automaticos }                  = useAgendaAuto();
  const { vencimientos: vcsAgenda }             = useVencimientosData();
  const { eventos }                             = useEventosData();

  // Fetch obras activas
  useEffect(() => {
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'obras'),
      where('estado', '==', 'En Proceso')
    );
    const unsub = onSnapshot(q, snap => {
      setObrasActivas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return unsub;
  }, []);

  // Fetch certificaciones pendientes de cobro
  const [certsPendientes, setCertsPendientes] = useState([]);
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'certificaciones'),
      snap => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCertsPendientes(all.filter(c => c.pago_cliente_estado === 'pendiente' || (!c.pago_cliente_estado && !c.pagada)));
      },
      () => {}
    );
    return unsub;
  }, []);

  const inboxPendientes = (inboxTickets || []).filter(t => t.estado === 'pendiente');

  const agendaUnificada = React.useMemo(() => {
    const list = [];
    // 1. Items Manuales y Automáticos
    [...manuales, ...automaticos].forEach(i => {
      const d = diasHasta(i.fechaVencimiento);
      list.push({ id: i.id, origen: i.tipo === 'automatica' ? 'agenda_auto' : 'agenda_manual',
        titulo: i.titulo, descripcion: i.descripcion || `Prioridad: ${i.prioridad}`,
        area: i.area || 'Oficina', monto: i.montoPotencial || 0, raw: i,
        responsable: i.responsable,
        prioridad: i.prioridad || 'media',
        dias: d === 999 ? (i.prioridad === 'critica' ? 0 : i.prioridad === 'alta' ? 2 : 10) : d,
        score: urgenciaScore(i),
        tipo: 'manual'
      });
    });
    // 2. Vencimientos
    vcsAgenda.filter(v => !v.pagado && !v.autoPagado).forEach(v => {
      const d = diasHasta(v.fecha);
      list.push({ id: v.id, origen: v.esTicketInbox ? 'ticket_inbox' : 'vencimiento', titulo: v.concepto,
        descripcion: v.esTicketInbox ? `Ticket subido por Jefe de Obra · ${v.proveedorNombre}` : `${v.categoria}${v.periodicidad && v.periodicidad !== 'unica' ? ' · ↻ ' + v.periodicidad : ''}`,
        area: v.esTicketInbox ? 'Obras' : 'Oficina', dias: d, monto: v.monto || 0, raw: v,
        prioridad: d < 0 ? 'critica' : d <= 3 ? 'alta' : 'media',
        score: d < 0 ? 100 : d === 0 ? 90 : d <= 3 ? 70 : 30,
        tipo: 'vencimiento'
      });
    });
    // 3. Eventos
    eventos.filter(e => !e.completado).forEach(e => {
      const d = diasHasta(e.fechaHora);
      list.push({ id: e.id, origen: 'evento', titulo: e.titulo,
        descripcion: `${e.fechaHora?.slice(11,16)}hs${e.lugar ? ` · ${e.lugar}` : ''}`,
        area: 'Oficina', dias: d, monto: 0, raw: e,
        prioridad: d < 0 ? 'critica' : d <= 2 ? 'alta' : 'media',
        score: d < 0 ? 95 : d === 0 ? 85 : d <= 2 ? 65 : 25,
        tipo: 'evento'
      });
    });
    // 4. Obras inactivas
    obrasActivas.forEach(o => {
      const m = (movimientos || []).filter(x => x.obraId === o.id);
      if (m.length > 0) {
        const last = m.map(x => new Date(x.fecha)).sort((a,b) => b-a)[0];
        const d = Math.floor((new Date() - last) / (1000 * 60 * 60 * 24));
        if (d > 30) {
          list.push({
            id: o.id,
            titulo: `Sin actividad: ${o.nombre}`,
            area: 'Obras',
            prioridad: d > 60 ? 'critica' : 'alta',
            dias: -d,
            tipo: 'obra',
            score: d
          });
        }
      }
    });

    return list.sort((a, b) => {
      if (a.dias < 0 && b.dias >= 0) return -1;
      if (b.dias < 0 && a.dias >= 0) return 1;
      return a.dias !== b.dias ? a.dias - b.dias : b.score - a.score;
    });
  }, [manuales, automaticos, vcsAgenda, eventos, obrasActivas, movimientos]);

  const agendaUrgentes = agendaUnificada.filter(i => i.prioridad === 'critica' || i.prioridad === 'alta' || i.dias <= 3);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pt-4">

      {/* SECCION HERO: Pendientes, Liquidez */}
      <div className="flex flex-col gap-6">
        
        {/* Cotización Dólar Blue */}
        {cotizacionCompra && cotizacionVenta && (
          <div className="flex items-center gap-3 px-1">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
              <DollarSign size={14} className="text-blue-400" />
              <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Blue</span>
              <span className="text-[11px] font-bold text-slate-400">C {cotizacionCompra?.toLocaleString('es-AR')}</span>
              <span className="text-[10px] text-slate-600">/</span>
              <span className="text-[11px] font-bold text-slate-400">V {cotizacionVenta?.toLocaleString('es-AR')}</span>
              <span className="text-[9px] text-slate-600 ml-1">Prom. ${cotizacionBlue?.toLocaleString('es-AR')}</span>
            </div>
          </div>
        )}

        {/* TOP ROW: Requerimientos, Estado Operativo, Acciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-stretch">
          
          {/* 1. Panorama Financiero (Hero) */}
          <div className="xl:col-span-3 glass-card rounded-[2rem] border border-emerald-900/20 p-6 relative overflow-hidden shadow-xl flex flex-col justify-between min-h-[220px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.15] rounded-full blur-[32px] pointer-events-none -mt-8 -mr-8" />
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                  Panorama Financiero
                  {requerimientosData.updatedAt && (
                    <span className="ml-2 bg-white/10 px-1.5 py-0.5 rounded text-[8px] tracking-normal text-slate-400">
                      act. {new Date(requerimientosData.updatedAt).toLocaleDateString('es-AR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </p>
                {canLoad && (
                  <button onClick={() => setIsModalReqOpen(true)} className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors border border-emerald-500/20">
                    <Edit3 size={10} /> Req. Viernes
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-3 mt-auto">
                {/* Requerimientos Viernes */}
                <div className="rounded-xl p-3" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
                  <p className="text-[8px] font-black text-emerald-500/70 uppercase tracking-widest mb-1">Req. Viernes</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-light text-slate-500">$</span>
                    <span className="text-xl font-black tracking-tighter text-white">
                      {reqARS.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  {reqUSD > 0 && (
                    <p className="text-[10px] font-bold text-slate-500 mt-0.5">u$d {reqUSD.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
                  )}
                  {/* Desglose por caja */}
                  {rawReqItems.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/[0.06] space-y-1">
                      {cajasDisplay
                        .filter(c => rawReqItems.some(i => i.caja === c.key))
                        .map(c => {
                          const cajaItems = rawReqItems.filter(i => i.caja === c.key);
                          const cajaARS = cajaItems.reduce((a, i) => a + (parseFloat(i.ars) || 0), 0);
                          const cajaUSD = cajaItems.reduce((a, i) => a + (parseFloat(i.usd) || 0), 0);
                          const shortLabel = c.label.replace('Banco ', '').replace('Caja ', '');
                          return (
                            <div key={c.key} className="flex justify-between items-center">
                              <span className={`text-[9px] font-black ${c.textColor}`}>{shortLabel}</span>
                              <span className="text-[9px] font-bold text-slate-400">
                                {cajaARS > 0 && `$${cajaARS.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
                                {cajaARS > 0 && cajaUSD > 0 && ' · '}
                                {cajaUSD > 0 && `u$d${cajaUSD.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Certificaciones pendientes de cobro */}
                <div className="rounded-xl p-3" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                  <p className="text-[8px] font-black text-indigo-400/70 uppercase tracking-widest mb-1">Certificaciones</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-light text-slate-500">$</span>
                    <span className="text-xl font-black tracking-tighter text-white">
                      {certsPendientes.reduce((acc, c) => acc + (c.moneda !== 'USD' ? (c.total_con_iva || c.monto || 0) : 0), 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  {certsPendientes.some(c => c.moneda === 'USD') && (
                    <p className="text-[10px] font-bold text-slate-500 mt-0.5">u$d {certsPendientes.reduce((acc, c) => acc + (c.moneda === 'USD' ? (c.total_con_iva || c.monto || 0) : 0), 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
                  )}
                  <p className="text-[9px] text-slate-600 mt-0.5">{certsPendientes.length} pendiente{certsPendientes.length !== 1 ? 's' : ''}</p>
                </div>

                {/* Pagos solicitados desde campo — clickeable para aprobar */}
                <div
                  className={`rounded-xl p-3 transition-all ${pagosPendientes.length > 0 ? 'cursor-pointer hover:ring-1 hover:ring-amber-500/30' : ''}`}
                  style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}
                  onClick={() => pagosPendientes.length > 0 && setShowPagosPanel(prev => !prev)}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[8px] font-black text-amber-400/70 uppercase tracking-widest mb-1">Pagos Campo</p>
                    {pagosPendientes.length > 0 && (
                      <span className="text-[8px] text-amber-400 animate-pulse">● {pagosPendientes.length} por aprobar</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-light text-slate-500">$</span>
                    <span className="text-xl font-black tracking-tighter text-white">
                      {[...pagosPendientes, ...pagosAprobados].reduce((acc, p) => acc + (p.moneda !== 'USD' ? (p.monto || 0) : 0), 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  {[...pagosPendientes, ...pagosAprobados].some(p => p.moneda === 'USD') && (
                    <p className="text-[10px] font-bold text-slate-500 mt-0.5">u$d {[...pagosPendientes, ...pagosAprobados].reduce((acc, p) => acc + (p.moneda === 'USD' ? (p.monto || 0) : 0), 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
                  )}
                  <p className="text-[9px] text-slate-600 mt-0.5">
                    {pagosPendientes.length} pendiente{pagosPendientes.length !== 1 ? 's' : ''} · {pagosAprobados.length} aprobado{pagosAprobados.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Panel desplegable de pagos pendientes de aprobación */}
              {showPagosPanel && pagosPendientes.length > 0 && (
                <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3 space-y-2">
                  <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-2">Pagos pendientes de aprobación</p>
                  {pagosPendientes.map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 bg-white/[0.03] border border-white/[0.05]">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-white truncate">{p.proveedor || 'Sin proveedor'}</p>
                        <p className="text-[9px] text-slate-500 truncate">{p.obraNombre} · {p.descripcion || '—'}</p>
                      </div>
                      <span className="text-[11px] font-black text-white whitespace-nowrap">{p.moneda === 'USD' ? 'u$d' : '$'} {(p.monto || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); handleAprobarPago(p.id); }}
                          className="flex items-center gap-1 py-1 px-2 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded-md font-black text-[8px] uppercase tracking-widest transition-all">
                          <Check size={9} /> Sí
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleRechazarPago(p.id); }}
                          className="flex items-center gap-1 py-1 px-2 bg-white/5 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-md font-black text-[8px] uppercase tracking-widest transition-all">
                          <X size={9} /> No
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 6. Pagos Aprobados — para ejecutar (Violeta) */}
          <div className="xl:col-span-2 glass-card rounded-[2rem] border border-amber-900/30 p-6 relative overflow-hidden h-full shadow-2xl flex flex-col min-h-[220px]">
             <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/[0.15] rounded-full blur-[32px] pointer-events-none -mt-8 -mr-8" />
             <div className="relative z-10 flex items-center justify-between mb-4">
               <DarqSectionDivider label="Por Ejecutar" count={pagosAprobados.length} color="#f59e0b" />
             </div>
             <div className="relative z-10 flex flex-col gap-2 flex-1 overflow-y-auto">
                {pagosAprobados.length === 0 ? (
                   <div className="flex-1 flex items-center justify-center"><p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Sin pagos por ejecutar</p></div>
                ) : (
                   pagosAprobados.slice(0, 3).map(p => (
                     <div key={p.id} className="rounded-xl px-3 py-2 border border-amber-900/20 bg-amber-500/[0.03]">
                       <div className="flex items-center justify-between mb-1">
                         <span className="text-[10px] font-black text-amber-400 truncate">{p.proveedor}</span>
                         <span className="text-[11px] font-black text-white">{p.moneda === 'USD' ? 'u$d' : '$'} {(p.monto || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                       </div>
                       <p className="text-[9px] text-slate-500 truncate mb-1">{p.obraNombre} · Aprobado por {p.aprobadoPor}</p>
                       <button onClick={() => handleEjecutarPago(p.id)}
                         className="w-full flex items-center justify-center gap-1 py-1.5 bg-amber-600/80 hover:bg-amber-500 text-white rounded-lg font-black text-[8px] uppercase tracking-widest transition-all">
                         <Check size={10} /> Marcar Ejecutado
                       </button>
                     </div>
                   ))
                )}
             </div>
          </div>

          {/* 5. Acciones Rápidas */}
          <div className="xl:col-span-1 bg-[#0a0d16] rounded-[2rem] border border-white/[0.04] p-6 flex flex-col shrink-0 min-h-[220px]">
            <h3 className="text-white font-bold text-sm mb-4">Acciones Rápidas</h3>
            <div className="flex flex-col gap-2 h-full justify-center">
              {canLoad && onOpenMovimiento && (
                <button onClick={onOpenMovimiento} className="bg-[#121622] hover:bg-[#1a1f30] border border-white/[0.03] rounded-xl py-3 px-4 flex items-center justify-between transition-colors group">
                  <span className="text-[10px] font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors uppercase tracking-widest">Movimiento</span>
                  <ArrowRight size={14} className="text-emerald-500/50 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                </button>
              )}
              <button onClick={() => setIsTransferenciaOpen(true)} className="bg-[#121622] hover:bg-[#1a1f30] border border-white/[0.03] rounded-xl py-3 px-4 flex items-center justify-between transition-colors group">
                <span className="text-[10px] font-bold text-white group-hover:text-slate-300 transition-colors uppercase tracking-widest">Transferencia</span>
                <ArrowRight size={14} className="text-white/30 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
              </button>
              {canLoad && onOpenCobro && (
                <button onClick={onOpenCobro} className="bg-[#121622] hover:bg-[#1a1f30] border border-white/[0.03] rounded-xl py-3 px-4 flex items-center justify-between transition-colors group">
                  <span className="text-[10px] font-bold text-blue-400 group-hover:text-blue-300 transition-colors uppercase tracking-widest">Cobrar</span>
                  <ArrowRight size={14} className="text-blue-500/50 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </button>
              )}
              {canLoad && onOpenImportar && (
                <button onClick={() => onOpenImportar('General')} className="bg-[#121622] hover:bg-[#1a1f30] border border-white/[0.03] rounded-xl py-3 px-4 flex items-center justify-between transition-colors group">
                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-300 transition-colors uppercase tracking-widest">Importar</span>
                  <ArrowRight size={14} className="text-white/30 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* === SALDOS DE CAJA (Unified Premium Grid) === */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
          {cajasDisplay.map(c => {
            const saldo = getCajaSaldo(c.key, c.isUSD);
            const saldoAlt = c.isUSD ? getCajaSaldo(c.key, false) : getCajaSaldo(c.key, true);
            const sym = c.isUSD ? 'u$d' : '$';
            const symAlt = c.isUSD ? '$' : 'u$d';
            
            // Premium Theme Assignment
            let theme = { bg: 'rgba(10, 13, 24, 0.6)', border: 'rgba(255,255,255,0.05)', iconBg: 'bg-slate-700', badgeBg: 'bg-slate-500/20 text-slate-400', symColor: 'text-white', glowColor: 'bg-slate-500/[0.15]' };
            if (c.key === 'Caja Pesos') theme = { border: 'rgba(16, 185, 129, 0.4)', iconBg: 'bg-emerald-500', badgeBg: 'bg-emerald-500/20 text-emerald-500', symColor: 'text-white', glowColor: 'bg-emerald-500/[0.15]' };
            else if (c.key === 'Caja Dólares') theme = { border: 'rgba(59, 130, 246, 0.4)', iconBg: 'bg-blue-500', badgeBg: 'bg-blue-500/20 text-blue-500', symColor: 'text-white', glowColor: 'bg-blue-500/[0.15]' };
            else if (c.key === 'Banco Amecon') theme = { border: 'rgba(139, 92, 246, 0.4)', iconBg: 'bg-violet-500', badgeBg: 'bg-violet-500/20 text-violet-500', symColor: 'text-white', glowColor: 'bg-violet-500/[0.15]' };
            else if (c.key === 'Banco Blue') theme = { border: 'rgba(14, 165, 233, 0.4)', iconBg: 'bg-sky-500', badgeBg: 'bg-sky-500/20 text-sky-500', symColor: 'text-white', glowColor: 'bg-sky-500/[0.15]' };
            else if (c.key === 'MP Amecon') theme = { border: 'rgba(249, 115, 22, 0.4)', iconBg: 'bg-orange-500', badgeBg: 'bg-orange-500/20 text-orange-500', symColor: 'text-white', glowColor: 'bg-orange-500/[0.15]' };
            else if (c.key === 'MP Blue') theme = { border: 'rgba(236, 72, 153, 0.4)', iconBg: 'bg-pink-500', badgeBg: 'bg-pink-500/20 text-pink-500', symColor: 'text-white', glowColor: 'bg-pink-500/[0.15]' };

            return (
              <div key={c.key} className="relative overflow-hidden p-4 rounded-[1rem] flex flex-col justify-between h-32 transition-all hover:-translate-y-1" style={{ background: 'rgba(10, 13, 24, 0.6)', border: `1px solid ${theme.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', backdropFilter: 'blur(16px)' }}>
                 <div className={`absolute top-0 right-0 w-32 h-32 ${theme.glowColor} rounded-full blur-[32px] pointer-events-none -mt-8 -mr-8`} />
                 <div className="relative z-10 flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg ${theme.iconBg} flex items-center justify-center text-white shrink-0 shadow-lg`}>
                       <span className="font-black text-[13px]">$</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                       <span className="text-[13px] font-medium text-white truncate max-w-[100px]" title={c.label}>{c.label}</span>
                       <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${theme.badgeBg}`}>{c.isUSD ? 'USD' : 'ARS'}</span>
                    </div>
                 </div>
                 <div className="relative z-10 mt-2">
                    <p className="text-[9px] text-slate-500 font-semibold mb-0.5">Cash Balance</p>
                    <div className="flex items-baseline gap-1">
                       <span className={`text-xl font-black ${theme.symColor}`}>{sym === 'u$d' ? 'U$D' : '$'} {saldo.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <p className="text-[9px] font-bold mt-0.5 opacity-40 text-slate-400">
                       {symAlt === 'u$d' ? 'u$d' : '$'} {saldoAlt.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                    </p>
                 </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* === CARDS MÓDULOS: Agenda + Obras === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Card Agenda de Gestión */}
        <div className="glass-card rounded-[2rem] border border-violet-900/20 p-8 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/[0.04] rounded-full blur-3xl pointer-events-none" />
          <div className="flex justify-between items-center mb-6 relative z-10">
            <div>
              <p className="text-[10px] font-black text-violet-500/60 uppercase tracking-[0.3em]">D+ARQ</p>
              <h3 className="darq-h2">Agenda de Gestión</h3>
              <p className="text-[10px] font-bold mt-1 uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
                {agendaUrgentes.length > 0 ? `${agendaUrgentes.length} alerta${agendaUrgentes.length > 1 ? 's' : ''} urgente${agendaUrgentes.length > 1 ? 's' : ''}` : 'Sin alertas urgentes'}
              </p>
            </div>
            <a href={import.meta.env.DEV ? 'http://localhost:5175' : 'https://sg-darq.web.app/agenda/'}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-700/40 hover:bg-violet-700/60 text-violet-300 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-violet-700/30 hover:border-violet-600/50 hover:-translate-y-0.5">
              <Calendar size={12} /> Abrir <ExternalLink size={9} className="opacity-50" />
            </a>
          </div>
          <div className="relative z-10">
            {agendaUnificada.length === 0 ? (
              <div className="text-center py-10 bg-black/10 rounded-2xl border border-white/[0.02]">
                <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>Sin alertas pendientes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {agendaUnificada.slice(0, 5).map(item => {
                  const esUrgente = item.prioridad === 'critica' || item.prioridad === 'alta';
                  return (
                    <div key={item.id} className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
                      esUrgente ? 'bg-rose-500/[0.04] border-rose-900/20' : 'bg-black/10 border-white/[0.03]'
                    }`}>
                      <div>
                        <p className={`text-xs font-semibold ${esUrgente ? 'text-rose-200' : 'text-white/80'}`}>{item.titulo}</p>
                        <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {item.area}
                          {item.responsable ? ` · ${item.responsable}` : ''}
                          {item.tipo === 'vencimiento' ? (item.dias < 0 ? ` · Venció hace ${Math.abs(item.dias)}d` : ` · En ${item.dias} días`) : ''}
                        </p>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg flex-shrink-0 ${
                        item.prioridad === 'critica' ? 'bg-rose-900/40 text-rose-400' :
                        item.prioridad === 'alta'    ? 'bg-amber-900/40 text-amber-400' : 'bg-white/10'
                      }`} style={item.prioridad !== 'critica' && item.prioridad !== 'alta' ? { color: 'var(--text-muted)' } : {}}>{item.prioridad || 'media'}</span>
                    </div>
                  );
                })}
                {agendaUnificada.length > 5 && (
                  <p className="text-center text-[10px] font-bold pt-1" style={{ color: 'var(--text-dim)' }}>+ {agendaUnificada.length - 5} más en el módulo</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Card Seguimiento de Obras con Checklist */}
        <div className="glass-card/30 rounded-[2rem] border border-amber-900/20 p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/[0.04] rounded-full blur-3xl pointer-events-none" />
          <div className="flex justify-between items-center mb-6 relative z-10">
            <div>
              <p className="text-[10px] font-black text-amber-500/60 uppercase tracking-[0.3em]">D+ARQ</p>
              <h3 className="darq-h2">Seguimiento de Obras</h3>
              <p className="text-[10px] font-bold mt-1 uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
                {obrasActivas.length} obra{obrasActivas.length !== 1 ? 's' : ''} activa{obrasActivas.length !== 1 ? 's' : ''}
              </p>
            </div>
            <a href={import.meta.env.DEV ? 'http://localhost:5174' : '/obras/'}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-900/40 hover:bg-amber-800/60 text-amber-300 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-amber-700/30 hover:border-amber-600/50 hover:-translate-y-0.5">
              <HardHat size={12} /> Abrir <ExternalLink size={9} className="opacity-50" />
            </a>
          </div>
          <div className="relative z-10 grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest mb-4">Progreso Checklists</p>
              {obrasActivas.length === 0 ? (
                <div className="text-center py-10 bg-black/10 rounded-2xl border border-white/[0.02]">
                  <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>Sin obras activas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {obrasActivas.map(obra => {
                    const prog = obrasProgreso[obra.id] || { total: 0, completadas: 0, vencidas: 0, pct: 0 };
                    return (
                      <div key={obra.id} className="bg-black/20 rounded-xl px-4 py-3 border border-amber-900/10 hover:border-amber-700/30 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-amber-100 truncate">{obra.nombre}</p>
                          <div className="flex items-center gap-2">
                            {prog.vencidas > 0 && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">⚠ {prog.vencidas}</span>
                            )}
                            <span className="text-[10px] font-black text-amber-400">{prog.pct}%</span>
                          </div>
                        </div>
                        {prog.total > 0 && (
                          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${prog.pct}%`, background: prog.pct === 100 ? '#34d399' : '#f59e0b' }} />
                          </div>
                        )}
                        {prog.total === 0 && (
                          <p className="text-[9px] text-slate-600 italic">Sin checklist</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Buzones incrustados */}
            <div className="flex flex-col gap-6">
              
              {/* Inbox Tickets Mini */}
              <div className="bg-black/20 rounded-2xl border border-indigo-900/20 p-5 flex flex-col flex-1 min-h-[160px]">
                <div className="flex items-center justify-between mb-4">
                  <DarqSectionDivider label="Inbox Tickets" count={inboxPendientes.length} color="#6366f1" />
                  {onOpenInbox && (
                    <button onClick={onOpenInbox} className="text-[10px] text-indigo-400 hover:text-indigo-300">
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1">
                   {inboxPendientes.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center"><p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Bandeja Vacía</p></div>
                   ) : (
                      inboxPendientes.slice(0, 3).map(t => (
                         <DarqItemRow key={t.id} title={t.obraNombre || 'Obra'} subtitle={t.proveedor || '-'} amountText={`$ ${(t.monto || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`} accentColor="#6366f1" icon={Receipt} />
                      ))
                   )}
                </div>
              </div>

              {/* Req de Campo Mini */}
              <div className="bg-black/20 rounded-2xl border border-orange-900/20 p-5 flex flex-col flex-1 min-h-[160px]">
                <div className="flex items-center justify-between mb-4">
                  <DarqSectionDivider label="Req. de Campo" count={reqPendientes.length} color="#f97316" />
                </div>
                <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1">
                   {reqPendientes.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center"><p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Sin Pedidos</p></div>
                   ) : (
                      reqPendientes.slice(0, 3).map(r => (
                         <div key={r.id} onClick={() => window.open(import.meta.env.DEV ? 'http://localhost:5174' : 'https://sg-darq.web.app/obras/', '_blank')} className="cursor-pointer">
                           <DarqItemRow title={r.descripcion} subtitle={r.obraNombre} accentColor="#f97316" isOverdue={r.urgencia === 'urgente'} badgeText={r.urgencia === 'urgente' ? 'URGENTE' : undefined} badgeBg={r.urgencia === 'urgente' ? 'rgba(244,63,94,0.15)' : undefined} badgeColor={r.urgencia === 'urgente' ? '#fb7185' : undefined} icon={Package} />
                         </div>
                      ))
                   )}
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>



      {/* Modal Transferencia */}
      {isTransferenciaOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsTransferenciaOpen(false)}>
          <div className="glass-panel rounded-[2rem] shadow-2xl w-full max-w-lg border border-white/10 p-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="darq-h2">Transferencia</h3>
              <button onClick={() => setIsTransferenciaOpen(false)} className="text-slate-500 hover:text-white p-2 bg-white/5 rounded-full"><X size={18} /></button>
            </div>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="darq-label mb-1.5 block">Caja Origen</label>
                  <SearchableSelect value={transForm.cajaOrigen} onChange={e => setTransForm({ ...transForm, cajaOrigen: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-blue-500 transition-colors">
                    <option value="">Seleccionar...</option>
                    {cajas.map(c => <option key={c} value={c}>{c}</option>)}
                  </SearchableSelect>
                </div>
                <div>
                  <label className="darq-label mb-1.5 block">Caja Destino</label>
                  <SearchableSelect value={transForm.cajaDestino} onChange={e => setTransForm({ ...transForm, cajaDestino: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-blue-500 transition-colors">
                    <option value="">Seleccionar...</option>
                    {cajas.map(c => <option key={c} value={c}>{c}</option>)}
                  </SearchableSelect>
                </div>
              </div>
              <div>
                <label className="darq-label mb-1.5 block">Tipo de Operación</label>
                <div className="flex gap-2">
                  {[{ l: 'Pesos', v: 'ARS' }, { l: 'Dólares', v: 'USD' }, { l: 'Cambio Divisa', v: 'CAMBIO' }].map(o => (
                    <button key={o.v} onClick={() => setTransForm({ ...transForm, moneda: o.v })}
                      className={"flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border " + (transForm.moneda === o.v ? 'bg-blue-600 text-white border-blue-500 shadow-lg' : 'bg-black/20 text-slate-400 border-white/5 hover:bg-black/30')}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="darq-label mb-1.5 block">
                    Monto {transForm.moneda === 'CAMBIO' ? '(USD)' : '(' + transForm.moneda + ')'}
                  </label>
                  <input type="number" step="0.01" value={transForm.monto} onChange={e => setTransForm({ ...transForm, monto: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm font-black text-white outline-none focus:border-blue-500 transition-colors" placeholder="0" />
                </div>
                <div>
                  <label className="darq-label mb-1.5 block">Tipo de Cambio</label>
                  <input type="number" step="0.01" value={transForm.tipoCambio} onChange={e => setTransForm({ ...transForm, tipoCambio: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm font-black text-white outline-none focus:border-blue-500 transition-colors" placeholder={String(cotizacionBlue)} />
                </div>
              </div>
              {transForm.moneda === 'CAMBIO' && transForm.monto && transForm.tipoCambio && (
                <div className="bg-blue-500/[0.08] border border-blue-500/20 rounded-xl p-4 text-center">
                  <p className="text-[10px] font-black text-blue-400/80 uppercase tracking-widest">Resultado</p>
                  <p className="text-xl font-black text-blue-300 mt-1">$ {(parseFloat(transForm.monto) * parseFloat(transForm.tipoCambio)).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="darq-label mb-1.5 block">Fecha</label>
                  <input type="date" value={transForm.fecha} onChange={e => setTransForm({ ...transForm, fecha: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="darq-label mb-1.5 block">Concepto (Opc.)</label>
                  <input type="text" value={transForm.concepto} onChange={e => setTransForm({ ...transForm, concepto: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-blue-500 transition-colors" placeholder="Referencia" />
                </div>
              </div>
              <button onClick={handleTransferencia}
                className="w-full mt-2 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors shadow-xl hover:-translate-y-0.5">
                Confirmar Operación
              </button>
            </div>
          </div>
        </div>
      )}

      {false && false && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsVencimientoOpen(false)}>
          <div className="glass-panel rounded-[2rem] shadow-2xl w-full max-w-md border border-white/10 p-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="darq-h2 flex items-center gap-3"><Calendar size={22} /> Nuevo Compromiso</h3>
              <button onClick={() => setIsVencimientoOpen(false)} className="text-slate-500 hover:text-white p-2 bg-white/5 rounded-full"><X size={18} /></button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="darq-label mb-1.5 block">Concepto</label>
                <input type="text" value={vencForm.concepto} onChange={e => setVencForm({ ...vencForm, concepto: e.target.value })}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-slate-500 transition-colors" placeholder="Ej: Monotributo, ABL..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="darq-label mb-1.5 block">Fecha</label>
                  <input type="date" value={vencForm.fecha} onChange={e => setVencForm({ ...vencForm, fecha: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-slate-500 transition-colors" />
                </div>
                <div>
                  <label className="darq-label mb-1.5 block">Categoría</label>
                  <SearchableSelect value={vencForm.categoria} onChange={e => setVencForm({ ...vencForm, categoria: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-slate-500 transition-colors">
                    {['Impuestos', 'Servicios', 'Seguros', 'Sueldos', 'Alquileres', 'Otros'].map(c => <option key={c} value={c}>{c}</option>)}
                  </SearchableSelect>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="darq-label mb-1.5 block">Monto</label>
                  <input type="number" step="0.01" value={vencForm.monto} onChange={e => setVencForm({ ...vencForm, monto: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm font-black text-white outline-none focus:border-slate-500 transition-colors" placeholder="Opcional" />
                </div>
                <div>
                  <label className="darq-label mb-1.5 block">Moneda</label>
                  <SearchableSelect value={vencForm.moneda} onChange={e => setVencForm({ ...vencForm, moneda: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm font-black text-white outline-none focus:border-slate-500 transition-colors">
                    <option value="ARS">Pesos (ARS)</option><option value="USD">Dólares (USD)</option>
                  </SearchableSelect>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer bg-white/[0.03] p-3 rounded-xl border border-white/[0.03] hover:bg-white/[0.06] transition-colors">
                <input type="checkbox" checked={vencForm.recurrente} onChange={e => setVencForm({ ...vencForm, recurrente: e.target.checked })} className="accent-slate-500 w-4 h-4 rounded" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Renovar mensualmente</span>
              </label>
              <button onClick={handleGuardarVencimiento}
                className="w-full mt-2 py-4 bg-slate-200 hover:bg-white text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl hover:-translate-y-0.5">
                Guardar Compromiso
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Requerimientos */}
      <ModalRequerimientos 
        open={isModalReqOpen} 
        onClose={() => setIsModalReqOpen(false)} 
        cajasDisplay={cajasDisplay} 
      />

    </div>
  );
}
