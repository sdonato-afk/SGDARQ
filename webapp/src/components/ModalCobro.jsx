import { useState, useMemo } from 'react';
import { SearchableSelect } from '@darq/ui';
import { X, CheckCircle, AlertCircle, ChevronDown, Edit3 } from 'lucide-react';

// Porcentajes de participación de cada unidad VO en las expensas del edificio
// Clientes que siempre facturan con Factura A (21% IVA incluido)
const FACTURA_A_KEYWORDS = ['BULKERS','BROOK BELGRANO','JAVIER PRIETO','DIEGO GROLL','W3 COMUNICACI\u00D3N','PVN TURISMO'];
const esClienteFacturaA = (nombre) => FACTURA_A_KEYWORDS.some(k => (nombre||'').toUpperCase().includes(k));

const VO_PORCENTAJES = {
  'VO-LOCAL': 12.03,
  'VO-1A':    4.91,
  'VO-1B':    3.93,
  'VO-1C':    4.30,
  'VO-2A':    4.91,
  'VO-2B':    3.93,
  'VO-2C':    4.30,
  'VO-3A':    4.91,
  'VO-3B':    3.93,
  'VO-3C':    4.30,
  'VO-4A':    4.91,
  'VO-4B':    3.93,
  'VO-4C':    4.30,
  'VO-5A':    4.91,
  'VO-5B':    3.93,
  'VO-5C':    4.30,
  'VO-6A':    5.34,
  'VO-COCHERA1': 2.23,
  'VO-COCHERA2': 2.23,
  'VO-COCHERA3': 2.23,
  'VO-COCHERA4': 2.23,
  'VO-COCHERA5': 2.23,
  'VO-COCHERA6': 2.23,
  'VO-COCHERA7': 2.23,
};

const CAJAS = ['Caja Pesos', 'Caja Dólares', 'Banco Amecon', 'Banco Blue', 'MP Amecon', 'MP Blue'];

function fmt(n, moneda = 'ARS') {
  if (!n && n !== 0) return '-';
  return moneda === 'USD'
    ? `u$d ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : `$ ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getMesAnterior(hoy = new Date()) {
  const d = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  return {
    anio: String(d.getFullYear()),
    mes: String(d.getMonth() + 1).padStart(2, '0'),
    label: d.toLocaleString('es-AR', { month: 'long', year: 'numeric' })
  };
}

export default function ModalCobro({
  open,
  onClose,
  onSave,           // async fn(cobros: Array<{...movimientoFields}>) 
  propiedades = [],
  contratos = [],
  clientes = [],
  movimientos = [],
  cotizacionBlue = 1400,
}) {
  const hoy = new Date().toISOString().split('T')[0];
  const mesAnt = getMesAnterior();

  const [step, setStep] = useState(1); // 1: selección, 2: confirmación
  const [propiedadId, setPropiedadId] = useState('');
  const [fecha, setFecha] = useState(hoy);
  const [caja, setCaja] = useState(CAJAS[0]);
  const [moneda, setMoneda] = useState('ARS');
  const [tc, setTc] = useState('');
  const [concepto, setConcepto] = useState('');
  const [saving, setSaving] = useState(false);
  const [tipoFacturaOverride, setTipoFacturaOverride] = useState(null); // null = auto-detect

  // Montos editables (el usuario puede sobreescribir el cálculo)
  const [montoAlquilerEdit, setMontoAlquilerEdit] = useState('');
  const [montoExpensasEdit, setMontoExpensasEdit] = useState('');
  const [editingAlquiler, setEditingAlquiler] = useState(false);
  const [editingExpensas, setEditingExpensas] = useState(false);
  // ── Inclusión independiente por ítem ──
  const [incluirAlquiler, setIncluirAlquiler] = useState(true);
  const [incluirExpensas, setIncluirExpensas] = useState(true);

  // ── Propiedad seleccionada ──
  const propiedad = useMemo(
    () => propiedades.find(p => p.id === propiedadId) || null,
    [propiedadId, propiedades]
  );

  // ── Contrato activo para esa propiedad ──
  const contrato = useMemo(() => {
    if (!propiedadId) return null;
    const hoyDate = new Date();
    return contratos.find(c => {
      if (c.propiedadId !== propiedadId) return false;
      if (c.fechaFin && new Date(c.fechaFin) < hoyDate) return false;
      return true;
    }) || null;
  }, [propiedadId, contratos]);

  // ── Cliente del contrato ──
  const cliente = useMemo(
    () => clientes.find(c => c.id === contrato?.clienteId) || null,
    [contrato, clientes]
  );

  // ── Determinar si la propiedad es VO ──
  const esVO = useMemo(() => {
    if (!propiedad) return false;
    return propiedad.nombre?.toUpperCase().startsWith('VO-');
  }, [propiedad]);

  // ── Factura A: auto-detect del cliente, con posibilidad de override manual ──
  const clienteEsFacturaA = useMemo(() => esClienteFacturaA(cliente?.nombre), [cliente]);
  const tipoFactura = tipoFacturaOverride ?? (clienteEsFacturaA ? 'A' : 'B');

  // ── Gastos VO del mes anterior (egresos área Alquileres, propiedades VO) ──
  const gastosVOMesAnterior = useMemo(() => {
    if (!esVO) return 0;
    const propNombresVO = new Set(
      propiedades
        .filter(p => p.nombre?.toUpperCase().startsWith('VO-'))
        .map(p => p.id)
    );
    return movimientos
      .filter(m => {
        if (m.area !== 'Alquileres' || m.tipo !== 'Egreso') return false;
        if (m.propiedadId && !propNombresVO.has(m.propiedadId)) return false;
        // Filtrar por mes anterior
        const fm = String(m.fecha || '').slice(0, 7); // "YYYY-MM"
        return fm === `${mesAnt.anio}-${mesAnt.mes}`;
      })
      .reduce((s, m) => {
        // Convertir a ARS usando tc histórico o blue
        if (m.moneda === 'USD') {
          const rate = m.tipoCambioReferencia || cotizacionBlue;
          return s + (Number(m.monto) || 0) * rate;
        }
        return s + (Number(m.monto) || 0);
      }, 0);
  }, [esVO, movimientos, propiedades, mesAnt, cotizacionBlue]);

  // ── Cálculo de expensas para esta unidad ──
  const porcentajeUnidad = useMemo(() => {
    if (!propiedad || !esVO) return 0;
    return VO_PORCENTAJES[propiedad.nombre?.toUpperCase()] || 0;
  }, [propiedad, esVO]);

  const expensasCalculadas = useMemo(() => {
    if (!esVO || !porcentajeUnidad) return 0;
    return gastosVOMesAnterior * (porcentajeUnidad / 100);
  }, [esVO, porcentajeUnidad, gastosVOMesAnterior]);

  // ── Montos finales (calculados o editados por el usuario) ──
  const montoAlquilerFinal = montoAlquilerEdit !== '' ? parseFloat(montoAlquilerEdit) || 0 : (Number(contrato?.montoAlquiler) || 0);
  const montoExpensasFinal = montoExpensasEdit !== '' ? parseFloat(montoExpensasEdit) || 0 : expensasCalculadas;

  // ── TC efectivo ──
  const tcEfectivo = parseFloat(tc) > 0 ? parseFloat(tc) : cotizacionBlue;

  // ── Propiedades con contrato activo para el selector ──
  const propiedadesConContrato = useMemo(() => {
    const hoyDate = new Date();
    const propIds = new Set(
      contratos
        .filter(c => !c.fechaFin || new Date(c.fechaFin) >= hoyDate)
        .map(c => c.propiedadId)
    );
    return propiedades
      .filter(p => propIds.has(p.id))
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }, [propiedades, contratos]);

  // ── Reset al cerrar ──
  function handleClose() {
    setStep(1);
    setPropiedadId('');
    setFecha(hoy);
    setCaja(CAJAS[0]);
    setMoneda('ARS');
    setTc('');
    setConcepto('');
    setMontoAlquilerEdit('');
    setMontoExpensasEdit('');
    setEditingAlquiler(false);
    setEditingExpensas(false);
    setSaving(false);
    setTipoFacturaOverride(null);
    setIncluirAlquiler(true);
    setIncluirExpensas(true);
    onClose();
  }

  // ── Guardar ──
  async function handleSave() {
    if (!propiedadId || !contrato || !cliente) return;
    setSaving(true);
    try {
      const base = {
        fecha,
        area: 'Alquileres',
        tipo: 'Ingreso',
        categoriaEgreso: '',
        propiedadId,
        clienteId: cliente.id,
        obraId: '',
        proveedorId: '',
        directorId: '',
        moneda,
        caja,
        tipoCambioReferencia: tcEfectivo,
        cotizacionHistorica: tcEfectivo,
        concepto: concepto || '',
        subRubro: '',
        tipoObraIngreso: '',
      };

      // Solo generar asiento si el ítem está habilitado Y el monto es > 0
      // rubro y categoriaEgreso en minúsculas para alinear con datos importados vía ETL
      const cobros = [];
      if (incluirAlquiler && montoAlquilerFinal > 0)
        cobros.push({ ...base, categoriaEgreso: 'alquiler', rubro: 'alquiler', monto: montoAlquilerFinal, tipoFactura });
      if (incluirExpensas && esVO && montoExpensasFinal > 0)
        cobros.push({ ...base, categoriaEgreso: 'expensas', rubro: 'expensas', monto: montoExpensasFinal, tipoFactura: 'B' });
      if (cobros.length === 0) { setSaving(false); return; }

      await onSave(cobros);
      handleClose();
    } catch (err) {
      console.error('Error al guardar cobro:', err);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const canProceed = propiedadId && contrato && cliente;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-white/10 bg-black/20">
          <div>
            <h3 className="text-xl font-black text-white italic tracking-tight m-0">
              REGISTRAR COBRO
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
              Alquileres · Ingreso guiado
            </p>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-5">

          {/* ── Paso 1: Selección de propiedad y fecha ── */}
          <div>
            <label style={labelStyle}>PROPIEDAD</label>
            <SearchableSelect
              value={propiedadId}
              onChange={e => {
                setPropiedadId(e.target.value);
                setMontoAlquilerEdit('');
                setMontoExpensasEdit('');
                setEditingAlquiler(false);
                setEditingExpensas(false);
                setIncluirAlquiler(true);
                setIncluirExpensas(true);
              }}
              style={selectStyle}
              options={propiedadesConContrato.map(p => ({ value: p.id, label: p.nombre }))}
              placeholder="— Seleccioná una propiedad —"
            />
          </div>

          {/* Info auto-completada */}
          {canProceed && (
            <div className="bg-black/20 rounded-xl p-4 border border-white/5">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <InfoRow label="INQUILINO" value={cliente.nombre} />
                <InfoRow label="EDIFICIO" value={esVO ? 'VO+' : 'MO'} />
                <InfoRow label="CONTRATO DESDE" value={contrato.fechaInicio} />
                <InfoRow label="VENCE" value={contrato.fechaFin || 'Indefinido'} />
                {porcentajeUnidad > 0 && (
                  <InfoRow label="% EXPENSAS VO" value={`${porcentajeUnidad}%`} />
                )}
              </div>
            </div>
          )}

          {/* ── Montos calculados ── */}
          {canProceed && (
            <div>
              <label style={labelStyle}>DETALLE DEL COBRO</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

                {/* Alquiler */}
                <div style={montoRowStyle}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button type="button" onClick={() => setIncluirAlquiler(v => !v)}
                        style={{ width:16,height:16,borderRadius:3,border:incluirAlquiler?'none':'1.5px solid #bbb',background:incluirAlquiler?'#111':'transparent',color:'#fff',fontSize:'0.55rem',fontWeight:900,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,padding:0 }}
                        title={incluirAlquiler?'Quitar alquiler de este cobro':'Incluir alquiler'}
                      >{incluirAlquiler?'✓':''}</button>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: incluirAlquiler?'#94a3b8':'#475569', letterSpacing: '0.1em', fontStyle: 'italic', textTransform: 'uppercase' }}>Alquiler (según contrato)</div>
                      {/* Factura A badge/toggle */}
                      {moneda === 'ARS' && (
                        <button
                          type="button"
                          onClick={() => setTipoFacturaOverride(tipoFactura === 'A' ? 'B' : 'A')}
                          style={{
                            fontSize: '0.55rem', fontWeight: 900, padding: '1px 7px', borderRadius: 4,
                            border: 'none', cursor: 'pointer', fontStyle: 'italic', letterSpacing: '0.08em',
                            background: tipoFactura === 'A' ? '#059669' : 'rgba(255,255,255,0.1)',
                            color: tipoFactura === 'A' ? '#fff' : '#94a3b8',
                            transition: 'all 0.15s',
                          }}
                          title={tipoFactura === 'A' ? 'IVA 21% incluido en el monto — clic para desactivar' : 'Activar Factura A'}
                        >
                          {tipoFactura === 'A' ? 'FAC A ✓' : 'FAC B'}
                        </button>
                      )}
                      {clienteEsFacturaA && tipoFacturaOverride === null && (
                        <span style={{ fontSize: '0.5rem', color: '#059669', fontStyle: 'italic' }}>auto</span>
                      )}
                    </div>
                    {editingAlquiler ? (
                      <input
                        type="number"
                        autoFocus
                        value={montoAlquilerEdit}
                        onChange={e => setMontoAlquilerEdit(e.target.value)}
                        onBlur={() => setEditingAlquiler(false)}
                        placeholder={String(contrato?.montoAlquiler || 0)}
                        style={{ ...inputStyle, marginTop: 4, width: '100%' }}
                        className="focus:border-emerald-500/50 focus:bg-black/60"
                      />
                    ) : (
                      <div style={{ marginTop: 2 }}>
                        <div style={{ fontSize: '1.15rem', fontWeight: 900, fontStyle: 'italic', color: '#fff' }}>
                          {fmt(montoAlquilerFinal, moneda)}
                          {montoAlquilerEdit !== '' && (
                            <span style={{ fontSize: '0.6rem', color: '#059669', marginLeft: 6 }}>EDITADO</span>
                          )}
                        </div>
                        {tipoFactura === 'A' && moneda === 'ARS' && montoAlquilerFinal > 0 && (
                          <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontStyle: 'italic', marginTop: 2, display: 'flex', gap: 12 }}>
                            <span>Base: <strong style={{ color: '#e2e8f0' }}>$ {Math.round(montoAlquilerFinal / 1.21).toLocaleString('es-AR')}</strong></span>
                            <span>IVA 21%: <strong style={{ color: '#059669' }}>$ {Math.round(montoAlquilerFinal - montoAlquilerFinal / 1.21).toLocaleString('es-AR')}</strong></span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={() => { setEditingAlquiler(true); if (montoAlquilerEdit === '') setMontoAlquilerEdit(String(contrato?.montoAlquiler || '')); }} style={editBtnStyle} title="Editar monto">
                    <Edit3 size={13} />
                  </button>
                </div>

                {/* Expensas (solo VO) */}
                {esVO && (
                  <div style={montoRowStyle}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button type="button" onClick={() => setIncluirExpensas(v => !v)}
                          style={{ width:16,height:16,borderRadius:3,border:incluirExpensas?'none':'1.5px solid #bbb',background:incluirExpensas?'#111':'transparent',color:'#fff',fontSize:'0.55rem',fontWeight:900,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,padding:0 }}
                          title={incluirExpensas?'Quitar expensas de este cobro':'Incluir expensas'}
                        >{incluirExpensas?'✓':''}</button>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: incluirExpensas?'#94a3b8':'#475569', letterSpacing: '0.1em', fontStyle: 'italic', textTransform: 'uppercase' }}>
                          Expensas VO · {porcentajeUnidad}% de gastos {mesAnt.label}
                          {gastosVOMesAnterior === 0 && <span style={{ color: '#f59e0b', marginLeft: 6 }}>(sin gastos cargados)</span>}
                        </div>
                      </div>
                      {editingExpensas ? (
                        <input
                          type="number"
                          autoFocus
                          value={montoExpensasEdit}
                          onChange={e => setMontoExpensasEdit(e.target.value)}
                          onBlur={() => setEditingExpensas(false)}
                          placeholder={String(Math.round(expensasCalculadas))}
                          style={{ ...inputStyle, marginTop: 4, width: '100%' }}
                          className="focus:border-emerald-500/50 focus:bg-black/60"
                        />
                      ) : (
                        <div style={{ fontSize: '1.15rem', fontWeight: 900, fontStyle: 'italic', color: '#fff', marginTop: 2 }}>
                          {fmt(montoExpensasFinal, 'ARS')}
                          {montoExpensasEdit !== '' && (
                            <span style={{ fontSize: '0.6rem', color: '#059669', marginLeft: 6 }}>EDITADO</span>
                          )}
                        </div>
                      )}
                    </div>
                    <button onClick={() => { setEditingExpensas(true); if (montoExpensasEdit === '') setMontoExpensasEdit(String(Math.round(expensasCalculadas))); }} style={editBtnStyle} title="Editar monto">
                      <Edit3 size={13} />
                    </button>
                  </div>
                )}

                {/* Total */}
                <div style={{ ...montoRowStyle, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#34d399', letterSpacing: '0.12em', fontStyle: 'italic', textTransform: 'uppercase' }}>TOTAL A COBRAR</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, fontStyle: 'italic', color: '#10b981' }}>
                    {fmt(montoAlquilerFinal + (esVO ? montoExpensasFinal : 0), moneda)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Detalles del cobro: fecha / caja / moneda ── */}
          {canProceed && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>FECHA</label>
                  <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>CAJA</label>
                  <SearchableSelect 
                    value={caja} 
                    onChange={e => setCaja(e.target.value)} 
                    style={selectStyle}
                    options={CAJAS.map(c => ({ value: c, label: c }))}
                    placeholder="Seleccionar..."
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>MONEDA</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['ARS', 'USD'].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMoneda(m)}
                        style={{
                          flex: 1, padding: '0.6rem', fontWeight: 800, fontSize: '0.75rem', fontStyle: 'italic',
                          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', cursor: 'pointer',
                          background: moneda === m ? '#10b981' : 'rgba(0,0,0,0.4)',
                          color: moneda === m ? '#fff' : '#94a3b8',
                          transition: 'all 0.15s',
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>TC REFERENCIA</label>
                  <input
                    type="number"
                    value={tc}
                    onChange={e => setTc(e.target.value)}
                    placeholder={`Blue: $${cotizacionBlue}`}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>CONCEPTO (opcional)</label>
                <input
                  type="text"
                  value={concepto}
                  onChange={e => setConcepto(e.target.value)}
                  placeholder="Nota libre..."
                  style={inputStyle}
                />
              </div>
            </>
          )}

          {/* ── Botón Guardar ── */}
          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.4rem' }}>
            <button onClick={handleClose} className="flex-1 py-3 px-4 font-black italic text-xs border border-white/10 rounded-xl bg-black/20 text-slate-300 hover:bg-black/40 hover:text-white transition-colors">
              CANCELAR
            </button>
            <button
              onClick={handleSave}
              disabled={!canProceed || saving}
              style={{
                flex: 2, padding: '0.85rem', fontWeight: 900, fontStyle: 'italic', fontSize: '0.8rem',
                borderRadius: '0.75rem', cursor: canProceed ? 'pointer' : 'not-allowed', border: 'none',
                background: canProceed ? '#059669' : 'rgba(255,255,255,0.05)',
                color: canProceed ? '#fff' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.2s',
              }}
            >
              {saving ? 'GUARDANDO...' : `REGISTRAR COBRO${esVO ? ' (2 movimientos)' : ''}`}
            </button>
          </div>

          {/* Resumen de lo que se va a crear */}
          {canProceed && !saving && (
            <div style={{ fontSize: '0.62rem', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
              Se registrarán: <strong className="text-slate-300">Alquiler {fmt(montoAlquilerFinal, moneda)}</strong>
              {esVO && montoExpensasFinal > 0 ? ` + Expensas ${fmt(montoExpensasFinal, 'ARS')}` : ''}
              {' '}→ Caja: {caja}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-componentes ──
function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase', fontStyle: 'italic' }}>{label}</div>
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', fontStyle: 'italic', marginTop: 1 }}>{value || '-'}</div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '0.62rem',
  fontWeight: 800,
  color: '#94a3b8',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  fontStyle: 'italic',
  marginBottom: '0.35rem',
};

const inputStyle = {
  width: '100%',
  padding: '0.65rem 0.9rem',
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '0.75rem',
  fontSize: '0.8rem',
  fontWeight: 700,
  fontStyle: 'italic',
  color: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.9rem center',
  paddingRight: '2.2rem',
};

const montoRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: '0.75rem',
  padding: '0.75rem 1rem',
  border: '1px solid rgba(255,255,255,0.05)',
  gap: '0.5rem',
};

const editBtnStyle = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '0.4rem',
  cursor: 'pointer',
  padding: '5px 6px',
  color: '#94a3b8',
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
};
