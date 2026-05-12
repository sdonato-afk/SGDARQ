import React, { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus,
  Plus, Pencil, Trash2, X, Save, AlertTriangle, History
} from 'lucide-react';
import { calcPosicionIVA, calcTotalesPorAlicuota, calcSaldoAcumulado } from '../helpers/ivaCalc';
import { SearchableSelect } from '@darq/ui';
import { useComprobantes } from '../hooks/useComprobantes';

const EMPRESAS   = ['AMECON', 'BLUE ELEPHANT'];
const TIPO_OPTS  = ['emitidos', 'recibidos'];
const TIPOS_CBTE = [
  { codigo: '001', nombre: 'Factura A' },
  { codigo: '002', nombre: 'Nota Débito A' },
  { codigo: '003', nombre: 'Nota Crédito A' },
  { codigo: '006', nombre: 'Factura B' },
  { codigo: '007', nombre: 'Nota Débito B' },
  { codigo: '008', nombre: 'Nota Crédito B' },
  { codigo: '011', nombre: 'Factura C' },
  { codigo: '012', nombre: 'Nota Débito C' },
  { codigo: '013', nombre: 'Nota Crédito C' },
  { codigo: '051', nombre: 'Factura M' },
];

const EMPTY_FORM = {
  empresa: 'AMECON',
  tipoImport: 'emitidos',
  fecha: '',
  tipoCodigo: '001',
  puntoVenta: '0001',
  numero: '',
  cuit: '',
  denominacion: '',
  impTotal: '',
  impNetoGravado: '',
  impIVA: '',
  impNoGravados: '',
  impOpExentas: '',
  otrosTributos: '',
};

// ─── helpers ────────────────────────────────────────────────────────────────

function navMes(ym, dir) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + dir, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function labelMes(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('es-AR', { month: 'long', year: 'numeric' });
}

function fmt(n) { return Math.round(n || 0).toLocaleString('es-AR'); }

// ─── StatBox ────────────────────────────────────────────────────────────────

function StatBox({ label, value, color = 'text-white', sub, sign }) {
  return (
    <div className="glass-panel rounded-2xl border border-white/10 p-5">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-2xl font-black tabular-nums tracking-tighter ${color}`}>
        {sign && <span className="text-[18px] mr-0.5 opacity-80">{sign}</span>}$ {fmt(value)}
      </p>
      {sub && <p className="text-[10px] text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Modal Comprobante ───────────────────────────────────────────────────────

function ModalComprobante({ form, onChange, onSave, onClose, saving, editId }) {
  const tipoNombre = TIPOS_CBTE.find(t => t.codigo === form.tipoCodigo)?.nombre || '';

  const campo = (label, key, { type = 'text', opts } = {}) => (
    <div>
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
        {label}
      </label>
      {opts ? (
        <SearchableSelect
          value={form[key]}
          onChange={e => onChange(key, e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white focus:outline-none focus:border-slate-500"
        >
          {opts.map(o => (
            <option key={o.value ?? o} value={o.value ?? o}>
              {o.label ?? o}
            </option>
          ))}
        </SearchableSelect>
      ) : (
        <input
          type={type}
          value={form[key]}
          onChange={e => onChange(key, e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white placeholder:text-slate-600 focus:outline-none focus:border-slate-500"
        />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {editId ? 'Editar comprobante' : 'Nuevo comprobante manual'}
            </p>
            <p className="text-sm font-black text-white mt-0.5">
              {tipoNombre || 'Comprobante'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          {/* Identificación */}
          {campo('Empresa', 'empresa', { opts: EMPRESAS.map(e => ({ value: e, label: e })) })}
          {campo('Tipo', 'tipoImport', { opts: TIPO_OPTS.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })) })}
          {campo('Fecha', 'fecha', { type: 'date' })}
          {campo('Tipo comprobante', 'tipoCodigo', {
            opts: TIPOS_CBTE.map(t => ({ value: t.codigo, label: `${t.codigo} – ${t.nombre}` }))
          })}
          {campo('Punto de venta', 'puntoVenta')}
          {campo('Número', 'numero')}
          {campo('CUIT contraparte', 'cuit')}

          {/* Denominación ocupa 2 columnas */}
          <div className="col-span-2">
            {campo('Denominación / Razón social', 'denominacion')}
          </div>

          {/* Separador importes */}
          <div className="col-span-2">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest border-t border-white/5 pt-4">
              Importes
            </p>
          </div>

          {campo('Imp. Total', 'impTotal', { type: 'number' })}
          {campo('Neto Gravado', 'impNetoGravado', { type: 'number' })}
          {campo('IVA', 'impIVA', { type: 'number' })}
          {campo('No Gravados', 'impNoGravados', { type: 'number' })}
          {campo('Op. Exentas', 'impOpExentas', { type: 'number' })}
          {campo('Otros Tributos', 'otrosTributos', { type: 'number' })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest">
            Cancelar
          </button>
          <button onClick={onSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl glass-panel hover:glass-panel text-white text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40">
            <Save size={12} />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirmación de borrado ─────────────────────────────────────────────────

function ConfirmDelete({ comp, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-panel border border-rose-500/20 rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={18} className="text-rose-400 shrink-0" />
          <p className="text-sm font-black text-white">Eliminar comprobante</p>
        </div>
        <p className="text-[11px] text-slate-400 mb-1">
          <span className="text-white font-black">{comp.tipoNombre || comp.tipoCodigo}</span>
          {' '}— {comp.numeroCompleto}
        </p>
        <p className="text-[10px] text-slate-500">{comp.denominacion} · {comp.fecha}</p>
        <p className="text-[10px] text-rose-400 mt-3">Esta acción no se puede deshacer.</p>
        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest transition-all">
            <Trash2 size={12} />
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard principal ─────────────────────────────────────────────────────

export default function IVADashboard() {
  const now = new Date();
  const [empresa,          setEmpresa]          = useState('AMECON');
  const [periodo,          setPeriodo]          = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [modoVista,        setModoVista]        = useState('mes');   // 'mes' | 'anio'
  const [anioSeleccionado, setAnioSeleccionado] = useState(String(now.getFullYear()));

  // Modal estado
  const [modal,    setModal]    = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [delComp,  setDelComp]  = useState(null);

  const { comprobantes: todosLosComprobantes, loading, guardarComprobante, eliminarComprobante,
          configContable, guardarConfig, pagosIVA } =
    useComprobantes({ empresa });

  // Saldo de apertura declarado por el usuario para esta empresa
  // (negativo = a favor, 0 = sin saldo previo)
  const saldoApertura = Number(configContable?.saldoInicioIVA?.[empresa] ?? 0);

  // Estado para el panel de apertura
  const [showApertura,    setShowApertura]    = useState(false);
  const [aperturaInput,   setAperturaInput]   = useState('');
  const [savingApertura,  setSavingApertura]  = useState(false);

  // ── Datos del mes seleccionado ────────────────────────────────────────────
  const comprobantes = useMemo(
    () => todosLosComprobantes.filter(c => c.periodo === periodo),
    [todosLosComprobantes, periodo]
  );
  const emitidos  = useMemo(() => comprobantes.filter(c => c.tipoImport === 'emitidos'),  [comprobantes]);
  const recibidos = useMemo(() => comprobantes.filter(c => c.tipoImport === 'recibidos'), [comprobantes]);
  const posicion  = useMemo(() => calcPosicionIVA(emitidos, recibidos), [emitidos, recibidos]);
  const alicuotas = useMemo(() => calcTotalesPorAlicuota(emitidos), [emitidos]);

  // Saldo acumulado de meses anteriores al mes actual (parte desde saldoApertura)
  const { saldoAnterior, historial } = useMemo(
    () => calcSaldoAcumulado(todosLosComprobantes, periodo, saldoApertura),
    [todosLosComprobantes, periodo, saldoApertura]
  );
  const posicionFinal = saldoAnterior + posicion.creditoFiscal - posicion.debitoFiscal;
  const aPagarFinal   = posicionFinal < 0;   // negativo = impuesto a pagar
  const aFavorFinal   = posicionFinal > 0;   // positivo = saldo técnico a favor
  const PosIcon   = aPagarFinal ? TrendingDown : aFavorFinal ? TrendingUp : Minus;
  const posColor  = aPagarFinal ? 'text-rose-400' : aFavorFinal ? 'text-emerald-400' : 'text-slate-400';
  const posBorder = aPagarFinal ? 'border-rose-500/20' : aFavorFinal ? 'border-emerald-500/20' : 'border-white/10';

  // ── Años disponibles ──────────────────────────────────────────────────────
  const aniosDisponibles = useMemo(() => {
    const years = [...new Set(
      todosLosComprobantes.map(c => c.periodo?.slice(0, 4)).filter(Boolean)
    )].sort();
    if (!years.includes(String(now.getFullYear()))) years.push(String(now.getFullYear()));
    return years;
  }, [todosLosComprobantes]);

  // pagosIVA viene del hook: movimientos de Oficina donde rubro='IVA', agrupados por periodoIVA
  // Reemplaza el sistema manual de pagosConfirmados en configContable

  const historialAnio = useMemo(() => {
    const anio     = parseInt(anioSeleccionado);
    const hoy      = new Date();
    const esActual = anio === hoy.getFullYear();
    const maxMes   = esActual ? hoy.getMonth() + 1 : 12;

    const { saldoAnterior: saldoInicio } = calcSaldoAcumulado(
      todosLosComprobantes, `${anio}-01`, saldoApertura
    );

    let saldo = saldoInicio;
    const meses = [];

    for (let m = 1; m <= maxMes; m++) {
      const p     = `${anio}-${String(m).padStart(2, '0')}`;
      const comps = todosLosComprobantes.filter(c => c.periodo === p);
      const emit  = comps.filter(c => c.tipoImport === 'emitidos');
      const recib = comps.filter(c => c.tipoImport === 'recibidos');
      const { debitoFiscal, creditoFiscal } = calcPosicionIVA(emit, recib);
      const posicionMes  = saldo + creditoFiscal - debitoFiscal;  // + = a favor, - = a pagar
      // Pago real de Oficina para este período (viene de movimientos)
      const pagosDelMes = pagosIVA[p] || [];
      const montoPagado = pagosDelMes.reduce((s, m) => s + Number(m.monto || 0), 0);
      const tienePago   = pagosDelMes.length > 0;

      meses.push({
        periodo:      p,
        debitoFiscal,
        creditoFiscal,
        saldoAnterior: saldo,
        posicionMes,
        aPagar:        posicionMes < 0,
        aFavor:        posicionMes > 0,
        pagado:        posicionMes < 0 ? Math.abs(posicionMes) : 0,
        aFavorMonto:   posicionMes > 0 ? posicionMes : 0,
        tieneData:     comps.length > 0,
        tienePago,
        montoPagado,
        pagosDelMes,
        sinPago:       posicionMes < 0 && !tienePago && p >= '2026-01',  // solo alertar desde 2026
      });

      saldo = posicionMes > 0 ? posicionMes : 0;   // positivo arrastra; negativo se paga
    }

    return {
      meses,
      saldoInicio,
      saldoFinal:      saldo,
      totalDebito:     meses.reduce((s, m) => s + m.debitoFiscal,  0),
      totalCredito:    meses.reduce((s, m) => s + m.creditoFiscal, 0),
      totalPagado:     meses.reduce((s, m) => s + m.pagado,        0),
      totalAFavor:     meses.reduce((s, m) => s + m.aFavorMonto,   0),
      pagosPendientes: meses.filter(m => m.sinPago && m.tieneData),
    };
  }, [todosLosComprobantes, anioSeleccionado, saldoApertura, pagosIVA]);

  // ── Posición consolidada: saldo neto real HOY con toda la historia ────────
  const posicionConsolidada = useMemo(() => {
    const hoy    = new Date();
    const mesHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

    // Saldo acumulado hasta ayer (sin incluir mes actual)
    const { saldoAnterior: saldoHastaAyer } = calcSaldoAcumulado(
      todosLosComprobantes, mesHoy, saldoApertura
    );
    // Débito/crédito del mes actual
    const compsHoy = todosLosComprobantes.filter(c => c.periodo === mesHoy);
    const emitHoy  = compsHoy.filter(c => c.tipoImport === 'emitidos');
    const recibHoy = compsHoy.filter(c => c.tipoImport === 'recibidos');
    const { debitoFiscal, creditoFiscal } = calcPosicionIVA(emitHoy, recibHoy);
    const posicion = saldoHastaAyer + creditoFiscal - debitoFiscal;  // + = a favor, - = a pagar

    // Cuántos meses con pago sin confirmar hay en toda la historia
    let pagosSinConfirmar = 0;
    const allPeriods = [...new Set(todosLosComprobantes.map(c => c.periodo).filter(Boolean))].sort();
    let sCheck = saldoApertura;
    for (const p of allPeriods) {
      if (p > mesHoy) break;
      const comps = todosLosComprobantes.filter(c => c.periodo === p);
      const emit  = comps.filter(c => c.tipoImport === 'emitidos');
      const recib = comps.filter(c => c.tipoImport === 'recibidos');
      const { debitoFiscal: db, creditoFiscal: cr } = calcPosicionIVA(emit, recib);
      const pos = sCheck + cr - db;  // + = a favor, - = a pagar
      if (pos < 0 && !pagosIVA[p] && p >= '2026-01') pagosSinConfirmar++;
      sCheck = pos > 0 ? pos : 0;   // positivo arrastra
    }

    return { posicion, debitoFiscal, creditoFiscal, saldoHastaAyer, mesHoy, pagosSinConfirmar };
  }, [todosLosComprobantes, saldoApertura, pagosIVA]);

  // ── Alerta IVA: últimos 10 días del mes ───────────────────────────────────
  const alertaIVA = (() => {
    if (!aPagarFinal || posicionFinal >= 0) return null;   // solo si es negativo (a pagar)
    const [y, m] = periodo.split('-').map(Number);
    if (now.getFullYear() !== y || now.getMonth() + 1 !== m) return null;
    const ultimoDia     = new Date(y, m, 0).getDate();
    const diasRestantes = ultimoDia - now.getDate();
    if (diasRestantes > 10) return null;
    return { monto: Math.abs(posicionFinal), diasRestantes, ultimoDia };
  })();

  // ── Handlers modal ────────────────────────────────────────────────────────
  const openNew = () => {
    setForm({ ...EMPTY_FORM, empresa, tipoImport: 'emitidos', fecha: `${periodo}-01` });
    setModal('new');
  };

  const openEdit = (c) => {
    setForm({
      empresa:        c.empresa        || empresa,
      tipoImport:     c.tipoImport     || 'emitidos',
      fecha:          c.fecha          || '',
      tipoCodigo:     c.tipoCodigo     || '001',
      puntoVenta:     c.puntoVenta     || '',
      numero:         c.numero         || '',
      cuit:           c.cuit           || '',
      denominacion:   c.denominacion   || '',
      impTotal:       c.impTotal       ?? '',
      impNetoGravado: c.impNetoGravado ?? '',
      impIVA:         c.impIVA         ?? '',
      impNoGravados:  c.impNoGravados  ?? '',
      impOpExentas:   c.impOpExentas   ?? '',
      otrosTributos:  c.otrosTributos  ?? '',
      _editId:        c.id,
    });
    setModal('edit');
  };

  const onFieldChange = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.fecha) return;
    setSaving(true);
    try {
      const pv  = String(form.puntoVenta).padStart(4, '0');
      const nro = String(form.numero).padStart(8, '0');
      const numeroCompleto = pv && nro ? `${pv}-${nro}` : null;
      const tipoNombre = TIPOS_CBTE.find(t => t.codigo === form.tipoCodigo)?.nombre || form.tipoCodigo;
      await guardarComprobante({
        id: form._editId,
        empresa: form.empresa, tipoImport: form.tipoImport,
        fecha: form.fecha, periodo: form.fecha.slice(0, 7),
        tipoCodigo: form.tipoCodigo, tipoNombre,
        puntoVenta: pv, numero: nro, numeroCompleto,
        cuit: form.cuit || null, denominacion: form.denominacion || null,
        impTotal:       Number(form.impTotal       || 0),
        impNetoGravado: Number(form.impNetoGravado || 0),
        impIVA:         Number(form.impIVA         || 0),
        impNoGravados:  Number(form.impNoGravados  || 0),
        impOpExentas:   Number(form.impOpExentas   || 0),
        otrosTributos:  Number(form.otrosTributos  || 0),
        origen: 'manual', estadoPDF: 'pendiente',
      });
      setModal(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!delComp) return;
    await eliminarComprobante(delComp.id);
    setDelComp(null);
  };

  // Confirmar pago de un mes
  const handleConfirmarPago = async (periodo, monto) => {
    await guardarConfig({
      ...(configContable || {}),
      pagosIVA: {
        ...(configContable?.pagosIVA || {}),
        [empresa]: {
          ...(configContable?.pagosIVA?.[empresa] || {}),
          [periodo]: { monto, fecha: new Date().toISOString().slice(0, 10), confirmado: true },
        },
      },
    });
  };

  // Guardar saldo de apertura IVA por empresa
  const handleGuardarApertura = async () => {
    setSavingApertura(true);
    try {
      const monto = parseFloat(aperturaInput) || 0;
      await guardarConfig({
        ...(configContable || {}),
        saldoInicioIVA: {
          ...(configContable?.saldoInicioIVA || {}),
          // Saldo a favor = positivo (crédito > débito)
          [empresa]: Math.abs(monto),
        },
      });
      setShowApertura(false);
      setAperturaInput('');
    } finally {
      setSavingApertura(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-white uppercase tracking-widest">Posición IVA</h2>
          <p className="text-[10px] text-slate-500 mt-1">Débito fiscal vs. Crédito fiscal por período.</p>
        </div>
        <button
          onClick={() => { setShowApertura(v => !v); setAperturaInput(saldoApertura ? String(Math.abs(saldoApertura)) : ''); }}
          className="shrink-0 text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-slate-400 transition-colors px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 flex items-center gap-1.5">
          Saldo apertura
          {saldoApertura !== 0 && (
            <span className="text-emerald-400 ml-1">$ {fmt(Math.abs(saldoApertura))}</span>
          )}
        </button>
      </div>

      {/* Panel saldo de apertura */}
      {showApertura && (
        <div className="glass-panel rounded-2xl border border-indigo-500/20 p-5 space-y-3">
          <div>
            <p className="darq-label">Saldo técnico de apertura — {empresa}</p>
            <p className="text-[10px] text-slate-600 mt-1">
              Si tenías saldo a favor de IVA antes del primer período importado, ingresá el monto aquí.
              El sistema lo usará como punto de partida para todos los cálculos acumulados.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                Saldo a favor (monto positivo = crédito fiscal a favor)
              </label>
              <input
                type="number" min="0" step="0.01"
                placeholder="0.00"
                value={aperturaInput}
                onChange={e => setAperturaInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-black focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={handleGuardarApertura}
              disabled={savingApertura}
              className="mt-5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40">
              {savingApertura ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={() => setShowApertura(false)}
              className="mt-5 px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all">
              Cancelar
            </button>
          </div>
          {saldoApertura !== 0 && (
            <p className="text-[10px] text-emerald-400">
              Saldo actual configurado: $ {fmt(Math.abs(saldoApertura))} a favor
            </p>
          )}
        </div>
      )}

      {/* Alerta IVA — últimos 10 días del mes */}
      {alertaIVA && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-rose-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-rose-300">
              ⚡ Posición IVA del mes: $ {fmt(alertaIVA.monto)} a pagar
            </p>
            <p className="text-[11px] text-rose-400/80 mt-1">
              Quedan <span className="font-black">{alertaIVA.diasRestantes} días</span> para el cierre de posición del mes.
              {alertaIVA.diasRestantes <= 3 && ' ¡Últimos días!'}
            </p>
            <p className="text-[10px] text-slate-400 mt-2">
              Si registrás compras antes del <span className="font-black text-white">día {alertaIVA.ultimoDia}</span>, generás crédito fiscal
              que reduce o elimina este saldo. Objetivo: cerrar el mes en <span className="font-black text-emerald-400">cero o a favor</span>.
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-black text-rose-500/60 uppercase tracking-widest">Cierre día {alertaIVA.ultimoDia}</p>
            <p className="text-2xl font-black text-rose-400 tabular-nums mt-1">-{alertaIVA.diasRestantes}d</p>
            <p className="text-[10px] text-slate-600 mt-1">Pago: 20 del próx. mes</p>
          </div>
        </div>
      )}

      {/* Controles: empresa + toggle mes/año */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
            {EMPRESAS.map(e => (
              <button key={e} onClick={() => setEmpresa(e)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                  empresa === e ? 'glass-panel text-white' : 'text-slate-500 hover:text-slate-200'
                }`}>
                {e}
              </button>
            ))}
          </div>
          <div className="flex gap-1 p-1 bg-white/5 rounded-2xl ml-auto">
            {[['mes', 'Vista mes'], ['anio', 'Vista año']].map(([v, label]) => (
              <button key={v} onClick={() => setModoVista(v)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                  modoVista === v ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-200'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Navegación según modo */}
        {modoVista === 'mes' ? (
          <div className="flex items-center gap-2">
            <button onClick={() => setPeriodo(v => navMes(v, -1))}
              className="p-2 rounded-xl bg-white/5 text-slate-500 hover:text-white transition-all">
              <ChevronLeft size={14} />
            </button>
            <span className="text-[10px] font-black text-white uppercase tracking-widest min-w-[130px] text-center capitalize">
              {labelMes(periodo)}
            </span>
            <button onClick={() => setPeriodo(v => navMes(v, 1))}
              className="p-2 rounded-xl bg-white/5 text-slate-500 hover:text-white transition-all">
              <ChevronRight size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {aniosDisponibles.map(anio => (
              <button key={anio} onClick={() => setAnioSeleccionado(anio)}
                className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                  anioSeleccionado === anio
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}>
                {anio}
                {anio === String(now.getFullYear()) && (
                  <span className="ml-1.5 text-[10px] text-indigo-300 normal-case">YTD</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="glass-panel rounded-2xl border border-white/10 p-10 text-center">
          <p className="text-[10px] text-slate-500 font-black uppercase animate-pulse">Cargando...</p>
        </div>
      ) : modoVista === 'anio' ? (

        /* ══════════════ VISTA AÑO ══════════════ */
        <div className="space-y-5">
          {/* KPIs anuales */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatBox label={`Débito ${anioSeleccionado}`} value={historialAnio.totalDebito}
              color="text-rose-400" sign="-" sub="IVA total ventas del año" />
            <StatBox label={`Crédito ${anioSeleccionado}`} value={historialAnio.totalCredito}
              color="text-emerald-400" sign="+" sub="IVA total compras del año" />
            <StatBox label="Total pagado al fisco" value={historialAnio.totalPagado}
              color="text-amber-400" sub="Suma de meses a pagar" />
            <div className={`glass-panel rounded-2xl border ${
              historialAnio.saldoFinal > 0 ? 'border-emerald-500/20' : 'border-white/10'
            } p-5`}>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Saldo al cierre</p>
              <p className={`text-2xl font-black tabular-nums tracking-tighter ${
                historialAnio.saldoFinal > 0 ? 'text-emerald-400' : 'text-slate-400'
              }`}>
                $ {fmt(historialAnio.saldoFinal)}
              </p>
              <p className={`text-[10px] font-black mt-1 ${
                historialAnio.saldoFinal > 0 ? 'text-emerald-400' : 'text-slate-400'
              }`}>
                {historialAnio.saldoFinal > 0 ? 'A FAVOR → se arrastra' : 'SIN SALDO'}
              </p>
            </div>
          </div>

          {/* Tabla mensual del año */}
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5">
              <h3 className="darq-label">
                Evolución mensual — {anioSeleccionado}
                {anioSeleccionado === String(now.getFullYear()) && (
                  <span className="ml-2 text-indigo-400 normal-case">
                    YTD hasta {labelMes(periodo)}
                  </span>
                )}
              </h3>
              {historialAnio.saldoInicio > 0 && (
                <p className="text-[10px] text-emerald-400 mt-1">
                  Saldo a favor arrastrado de años anteriores: $ {fmt(historialAnio.saldoInicio)}
                </p>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    <th className="px-5 py-3">Mes</th>
                    <th className="px-5 py-3 text-right">Débito</th>
                    <th className="px-5 py-3 text-right">Crédito</th>
                    <th className="px-5 py-3 text-right">Saldo arrastrado</th>
                    <th className="px-5 py-3 text-right">Posición</th>
                    <th className="px-5 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {historialAnio.meses.map(h => (
                    <tr key={h.periodo}
                      className={`border-t border-white/5 text-[10px] ${!h.tieneData && h.saldoAnterior === 0 ? 'opacity-25' : ''}`}>
                      <td className="px-5 py-2.5 text-slate-400 font-black capitalize">
                        {new Date(h.periodo + '-02').toLocaleString('es-AR', { month: 'long' })}
                      </td>
                      <td className="px-5 py-2.5 text-right text-rose-400 tabular-nums">
                        {h.tieneData ? fmt(h.debitoFiscal) : '—'}
                      </td>
                      <td className="px-5 py-2.5 text-right text-emerald-400 tabular-nums">
                        {h.tieneData ? fmt(h.creditoFiscal) : '—'}
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums">
                        {h.saldoAnterior > 0
                          ? <span className="text-emerald-400">(+{fmt(h.saldoAnterior)})</span>
                          : <span className="text-slate-600">—</span>}
                      </td>
                      <td className={`px-5 py-2.5 text-right font-black tabular-nums ${
                        h.aPagar ? 'text-rose-400' : h.aFavor ? 'text-emerald-400' : 'text-slate-500'
                      }`}>
                        {!h.tieneData && h.saldoAnterior === 0 ? '—'
                          : h.aPagar ? `(${fmt(Math.abs(h.posicionMes))})`
                          : fmt(h.posicionMes)}
                      </td>
                      <td className="px-5 py-2.5 text-center">
                        {(h.tieneData || h.saldoAnterior !== 0) ? (
                          h.aPagar ? (
                            h.tienePago ? (
                              // Pagado en Oficina ✓
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-500/10">
                                  ✓ Pagado
                                </span>
                                <span className="text-[10px] text-slate-600">
                                  ${Number(h.montoPagado).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                </span>
                              </div>
                            ) : (
                              // A pagar, sin movimiento en Oficina
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-amber-400 bg-amber-500/10">
                                ⚠ A pagar
                              </span>
                            )
                          ) : h.aFavor ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-500/10">
                              A favor →
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">Neutro</span>
                          )
                        ) : (
                          <span className="text-slate-700 text-[10px]">sin datos</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      ) : (

        /* ══════════════ VISTA MES ══════════════ */
        <>
          {/* KPIs del mes */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatBox label="Débito Fiscal del mes" value={posicion.debitoFiscal}
              color="text-rose-400" sign="-" sub={`${emitidos.length} comprobantes emitidos`} />
            <StatBox label="Crédito Fiscal del mes" value={posicion.creditoFiscal}
              color="text-emerald-400" sign="+" sub={`${recibidos.length} comprobantes recibidos`} />

            <div className="glass-panel rounded-2xl border border-white/10 p-5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Saldo a favor anterior
              </p>
              <p className={`text-2xl font-black tabular-nums tracking-tighter ${
                saldoAnterior > 0 ? 'text-emerald-400' : 'text-slate-400'
              }`}>
                $ {fmt(saldoAnterior)}
              </p>
              <p className="text-[10px] text-slate-600 mt-1">
                {saldoAnterior > 0
                  ? `Crédito acumulado de ${historial.length} período${historial.length !== 1 ? 's' : ''}`
                  : 'Sin saldo previo'}
              </p>
            </div>

            <div className={`glass-panel rounded-2xl border ${posBorder} p-5`}>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Posición final</p>
              <div className="flex items-center gap-2">
                <PosIcon size={18} className={posColor} />
                <p className={`text-2xl font-black tabular-nums tracking-tighter ${posColor}`}>
                  $ {fmt(Math.abs(posicionFinal))}
                </p>
              </div>
              <p className={`text-[10px] font-black mt-1 ${posColor}`}>
                {aPagarFinal ? 'A PAGAR (próx. vto.)' : aFavorFinal ? 'SALDO A FAVOR → arrastra' : 'SIN SALDO'}
              </p>
            </div>
          </div>

          {/* Detalle por alícuota */}
          {comprobantes.length > 0 && (
            <div className="glass-panel rounded-2xl border border-white/10 p-5">
              <h3 className="darq-label mb-4">
                Ventas por alícuota de IVA
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[21, 10.5, 27, 'otros'].map(aliq => {
                  const d = alicuotas[aliq] || { base: 0, iva: 0 };
                  if (d.base === 0 && d.iva === 0) return null;
                  return (
                    <div key={aliq} className="bg-white/5 rounded-xl p-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-2">
                        {aliq === 'otros' ? 'Exentas / NC' : `IVA ${aliq}%`}
                      </p>
                      <p className="text-xs font-black text-slate-400 tabular-nums">Neto: $ {fmt(d.base)}</p>
                      <p className="text-xs font-black text-rose-400 tabular-nums">IVA: $ {fmt(d.iva)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabla comprobantes */}
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between gap-3">
              <h3 className="darq-label">
                Detalle de comprobantes — {labelMes(periodo)}
              </h3>
              <div className="flex items-center gap-3">
                {comprobantes.length > 0 && (
                  <div className="flex gap-2 text-[10px]">
                    <span className="text-rose-400 font-black">{emitidos.length} emitidos</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-emerald-400 font-black">{recibidos.length} recibidos</span>
                  </div>
                )}
                <button onClick={openNew}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">
                  <Plus size={11} />
                  Nuevo manual
                </button>
              </div>
            </div>

            {comprobantes.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-[10px] text-slate-500 font-black uppercase">
                  No hay comprobantes de {empresa} para {labelMes(periodo)}.
                </p>
                <p className="text-[10px] text-slate-600 mt-2">
                  Importá el XLS de ARCA o creá uno manualmente.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#0d1724] z-10">
                    <tr className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                      <th className="px-5 py-3">Fecha</th>
                      <th className="px-5 py-3">Tipo</th>
                      <th className="px-5 py-3">Nro.</th>
                      <th className="px-5 py-3">Contraparte</th>
                      <th className="px-5 py-3 text-right">Neto</th>
                      <th className="px-5 py-3 text-right">IVA</th>
                      <th className="px-5 py-3 text-right">Total</th>
                      <th className="px-3 py-3 text-center w-16">Acc.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comprobantes.map(c => (
                      <tr key={c.id}
                        className="border-t border-white/5 hover:bg-white/[0.03] transition-colors text-[10px] group">
                        <td className="px-5 py-2.5 text-slate-500 tabular-nums whitespace-nowrap">{c.fecha}</td>
                        <td className="px-5 py-2.5">
                          <span className={`font-black uppercase text-[10px] px-2 py-0.5 rounded-full ${
                            c.tipoImport === 'emitidos'
                              ? 'text-rose-400 bg-rose-500/10'
                              : 'text-emerald-400 bg-emerald-500/10'
                          }`}>{c.tipoNombre || c.tipoCodigo}</span>
                        </td>
                        <td className="px-5 py-2.5 text-slate-400 tabular-nums font-mono text-[10px]">
                          {c.numeroCompleto}
                          {c.origen === 'manual' && (
                            <span className="ml-1 text-[10px] text-slate-600 uppercase">manual</span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 max-w-[200px]">
                          <p className="text-slate-200 font-medium truncate text-[10px] leading-snug">
                            {c.denominacion || <span className="text-slate-600 italic">sin datos</span>}
                          </p>
                          {c.cuit && (
                            <span className="inline-flex items-center gap-1.5 mt-0.5">
                              <span className="text-slate-300 font-mono text-[10px] tracking-wider">{c.cuit}</span>
                              <span className={`text-[6px] font-black uppercase px-1 py-px rounded ${
                                c.tipoImport === 'recibidos'
                                  ? 'text-emerald-400 bg-emerald-500/10'
                                  : 'text-rose-400 bg-rose-500/10'
                              }`}>
                                {c.tipoImport === 'recibidos' ? 'Emisor' : 'Receptor'}
                              </span>
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-2.5 text-right text-slate-400 tabular-nums">{fmt(c.impNetoGravado)}</td>
                        <td className={`px-5 py-2.5 text-right tabular-nums font-mono text-[10px] ${
                          c.tipoImport === 'emitidos' ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          {c.tipoImport === 'emitidos' ? '-' : '+'}{fmt(c.impIVA)}
                        </td>
                        <td className="px-5 py-2.5 text-right font-black text-white tabular-nums">{fmt(c.impTotal)}</td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(c)} title="Editar"
                              className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                              <Pencil size={11} />
                            </button>
                            <button onClick={() => setDelComp(c)} title="Eliminar"
                              className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal edición / nuevo */}
      {(modal === 'edit' || modal === 'new') && (
        <ModalComprobante
          form={form} onChange={onFieldChange}
          onSave={handleSave} onClose={() => setModal(null)}
          saving={saving} editId={modal === 'edit' ? form._editId : null}
        />
      )}

      {/* Confirm delete */}
      {delComp && (
        <ConfirmDelete
          comp={delComp} onConfirm={handleDelete}
          onClose={() => setDelComp(null)}
        />
      )}
    </div>
  );
}
