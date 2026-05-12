import React, { useState, useEffect, useRef } from 'react';
import { SearchableSelect } from '@darq/ui';
import { X, UserCircle, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import CascadeTaxonomy from '../../../components/CascadeTaxonomy';


// Helpers que antes vivían en App.jsx:
const formatMontoDisplay = (val) => {
  if (!val && val !== 0) return '';
  const strVal = String(val);
  // Mantener comas parciales de la escritura
  if (strVal.endsWith('.')) return strVal.replace('.', ',');
  if (strVal.endsWith('.0')) return strVal.replace('.', ',');
  
  const num = parseFloat(strVal);
  if (isNaN(num)) return strVal.replace('.', ',');
  return num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const calcularNetoUSD = (form, tcFallback) => {
  const m = parseFloat(form.monto) || 0;
  const tc = parseFloat(form.tipoCambioReferencia) || tcFallback || 1250;
  if (form.moneda === 'USD') return m;
  return m / tc;
};

const calcularNetoUSDStr = (form, tcFallback) => {
  const val = calcularNetoUSD(form, tcFallback);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
};


export default function ModalMovimiento({ 
    open, onClose, initialData, movimientoId,
    areas, areaPermitida, cajas, directores, proveedores, 
    obras, propiedades, clientes, contratos, cotizacionBlue
}) {

  const defaultMov = { area: areaPermitida || 'Oficina', tipo: 'Ingreso', moneda: 'ARS', monto: '', fecha: new Date().toISOString().split('T')[0], caja: 'Tesoreria_General', tipoOperacion: 'normal' };
  const [formData, setFormData] = useState(defaultMov);

  // --- Zoom logic ---
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (initialData) setFormData({ ...defaultMov, ...initialData });
      else setFormData({ ...defaultMov, fecha: new Date().toISOString().split('T')[0] });
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [open, initialData]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const montoNum = parseFloat(formData.monto);
      if (isNaN(montoNum) || montoNum <= 0) return alert('Monto inválido');
      const tcNum = parseFloat(formData.tipoCambioReferencia) || cotizacionBlue;
      const tOper = formData.tipoOperacion || 'normal';
      const netoUSD = formData.moneda === 'USD' ? montoNum : montoNum / tcNum;

      const { collection, addDoc, updateDoc, doc } = await import('firebase/firestore');
      const { db, appId } = await import('../../../config/firebase');

      const payload = {
        ...formData,
        monto: montoNum,
        tipoCambioReferencia: tcNum,
        netoUSD,
        tipoOperacion: tOper,
      };

      if (formData.ticketInboxId) {
        const { aprobarTicketInbox } = await import('../../../services/finanzasService');
        await aprobarTicketInbox({ id: formData.ticketInboxId }, payload);
      } else if (movimientoId) {
        // Modo edición — actualizar doc existente
        await updateDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'movimientos', movimientoId),
          { ...payload, updatedAt: new Date().toISOString() }
        );

        // Registrar en historial de cambios
        await addDoc(
          collection(db, 'artifacts', appId, 'public', 'data', 'movimientos_historial'),
          {
            movimientoId,
            fechaCambio: new Date().toISOString(),
            estadoAnterior: initialData,
            estadoNuevo: payload,
            tipoCambioLog: 'edicion'
          }
        );
      } else {
        // Modo creación — nuevo doc
        await addDoc(
          collection(db, 'artifacts', appId, 'public', 'data', 'movimientos'),
          { ...payload, createdAt: new Date().toISOString() }
        );
      }

      onClose();
      setFormData(defaultMov);
    } catch (err) {
      console.error(err);
      alert("Error al guardar: " + err.message);
    }
  };

  if (!open) return null;

  const handleMontoChange = (rawValue) => {
    // 1. Quitar todo menos números, puntos y comas
    let cleaned = rawValue.replace(/[^\d.,]/g, '');
    // 2. En Argentina, los puntos son miles y la coma es decimal.
    // Quitamos los puntos de miles que haya tipeado o que vengan del formateador
    cleaned = cleaned.replace(/\./g, '');
    // 3. Convertimos la única coma a punto estándar de Javascript
    cleaned = cleaned.replace(',', '.');
    
    setFormData({...formData, monto: cleaned});
  };

  const handleAreaChange = (e) => {
    const nuevaArea = e.target.value;
    // Limpiar toda la taxonomía — CascadeTaxonomy la inicializa desde Firestore
    setFormData({
      ...formData,
      area: nuevaArea,
      categoriaEgreso: '',
      tipoObraIngreso: '',
      rubro: '',
      concepto: '',
      obraId: '',
      propiedadId: '',
      directorId: '',
      clienteId: '',
    });
  };

  const handleTipoChange = (t) => {
    // Limpiar taxonomía — CascadeTaxonomy la re-inicializa desde Firestore
    setFormData({
      ...formData,
      tipo: t,
      categoriaEgreso: '',
      tipoObraIngreso: '',
      rubro: '',
      concepto: '',
      clienteId: '',
      propiedadId: '',
    });
  };



  const handleClienteChange = (e) => {
    const selectedClienteId = e.target.value;
    const contratoCliente = contratos.find(c => c.clienteId === selectedClienteId);
    const pId = contratoCliente ? contratoCliente.propiedadId : '';
    setFormData({...formData, clienteId: selectedClienteId, propiedadId: pId});
  };

  const handleTaxonomyChange = (nuevos) => {
    const cambios = {};
    if ('categoria' in nuevos) cambios.categoriaEgreso = nuevos.categoria;
    if ('rubro' in nuevos) cambios.rubro = nuevos.rubro;
    if ('concepto' in nuevos) cambios.concepto = nuevos.concepto;
    if ('tipoObraIngreso' in nuevos) cambios.tipoObraIngreso = nuevos.tipoObraIngreso;
    setFormData({ ...formData, ...cambios });
  };

  const isTicketMode = !!formData.ticketUrl;

  const handleWheel = (e) => { e.preventDefault(); setScale(prev => Math.min(Math.max(0.5, prev - e.deltaY * 0.01), 4)); };
  const handleMouseDown = () => { if (scale > 1) setIsDragging(true); };
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e) => { if (isDragging) setPosition(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY })); };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-[#0f172a] w-full ${isTicketMode ? 'max-w-6xl h-[85vh] flex' : 'max-w-lg'} rounded-3xl shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-200`}>
        
        {isTicketMode && (
          <div className="flex-1 bg-black/50 border-r border-white/10 relative overflow-hidden flex flex-col">
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <button type="button" onClick={() => setScale(s => Math.min(s + 0.5, 4))} className="p-2 bg-black/60 text-white rounded-lg hover:bg-black/80 backdrop-blur-md"><ZoomIn size={20}/></button>
              <button type="button" onClick={() => setScale(s => Math.max(s - 0.5, 0.5))} className="p-2 bg-black/60 text-white rounded-lg hover:bg-black/80 backdrop-blur-md"><ZoomOut size={20}/></button>
              <button type="button" onClick={() => {setScale(1); setPosition({x:0, y:0})}} className="p-2 bg-black/60 text-white rounded-lg hover:bg-black/80 backdrop-blur-md"><Maximize size={20}/></button>
            </div>
            <div className="flex-1 w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing" onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onMouseMove={handleMouseMove}>
              <img ref={imageRef} src={formData.ticketUrl} alt="Ticket" className="max-w-full max-h-full object-contain transition-transform duration-75" style={{ transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)` }} draggable="false" />
            </div>
          </div>
        )}

        <div className={`${isTicketMode ? 'w-[480px] flex flex-col h-full shrink-0' : 'w-full'}`}>
          <div className={`px-6 py-5 ${isTicketMode ? 'bg-indigo-600' : 'bg-emerald-700/90'} border-b border-white/10 flex justify-between items-center ${isTicketMode ? 'shrink-0' : ''}`}>
            <div>
              <p className={`${isTicketMode ? 'text-indigo-200' : 'text-emerald-300'} text-[10px] font-black uppercase tracking-[0.25em] mb-0.5`}>
                {isTicketMode ? 'Inbox Inspección' : 'Caja y Tesorería'}
              </p>
              <h3 className="text-xl font-black italic tracking-tighter uppercase text-white">
                {isTicketMode ? 'CONTABILIZAR TICKET' : movimientoId ? 'EDITAR ASIENTO' : 'REGISTRAR FLUJO'}
              </h3>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all hover:rotate-90"><X size={20} /></button>
          </div>
          
          <form onSubmit={handleSave} className={`p-6 space-y-4 ${isTicketMode ? 'overflow-y-auto flex-1 custom-scrollbar' : ''}`}>
            <div className="grid grid-cols-2 gap-4">
            <input type="date" required value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} className="bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-500/60 transition-colors"/>
            <SearchableSelect 
              value={formData.area} 
              onChange={handleAreaChange} 
              options={(areaPermitida ? [areaPermitida] : areas).map(a => ({ value: a, label: a }))}
              placeholder="-- Seleccionar --"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex bg-white/5 p-1 rounded-xl">
              {['Ingreso', 'Egreso'].map(t => (
                <button 
                  key={t} 
                  type="button" 
                  onClick={() => handleTipoChange(t)} 
                  className={`flex-1 py-2.5 rounded-lg text-[10px] font-black transition-all ${formData.tipo === t ? (t==='Ingreso' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'bg-rose-600 text-white shadow-lg shadow-rose-900/40') : 'text-slate-400 hover:text-white'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex bg-black/40 border border-white/10 p-1 rounded-xl">
              {['ARS', 'USD'].map(m => (
                <button key={m} type="button" onClick={() => setFormData({...formData, moneda: m})} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black transition-all ${formData.moneda === m ? 'glass-panel text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>{m}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <CascadeTaxonomy 
              area={formData.area} 
              tipo={formData.tipo} 
              values={{ 
                categoria: formData.categoriaEgreso, 
                rubro: formData.rubro, 
                concepto: formData.concepto,
                tipoObraIngreso: formData.tipoObraIngreso
              }}
              onChange={handleTaxonomyChange}
            />

            {formData.area === 'Oficina' && formData.tipo === 'Egreso' && formData.categoriaEgreso === 'IMPUESTOS' && formData.rubro === 'IVA' && (
              <div className="col-span-2 space-y-1 animate-in fade-in slide-in-from-top-2">
                <label className="text-[10px] font-black text-amber-500 uppercase ml-1">
                  Período IVA que se paga (YYYY-MM)
                </label>
                <input
                  type="month"
                  required
                  value={formData.periodoIVA || ''}
                  onChange={e => setFormData({...formData, periodoIVA: e.target.value})}
                  className="w-full bg-amber-500/10 border border-amber-500/40 rounded-xl px-4 py-3 text-sm font-black text-amber-200 outline-none focus:border-amber-400"
                />
                <p className="text-[10px] text-amber-600 ml-1">Este campo vincula el pago con el módulo de IVA.</p>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-300 uppercase ml-1 tracking-widest">Caja / Cuenta Origen</label>
            <SearchableSelect 
              value={formData.caja} 
              onChange={e => setFormData({...formData, caja: e.target.value})} 
              options={cajas.map(c => ({ value: c, label: c }))}
              placeholder="-- Seleccionar --"
            />
          </div>

          {formData.area === 'Oficina' && (
             <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
               <label className="text-[10px] font-black text-blue-400 uppercase ml-1 tracking-widest flex items-center gap-1">Entidad / Cuenta Comercial</label>
               <input type="text" placeholder="Ej: Edenor, Telefónica, Librería..." value={formData.entidadCuenta || ''} onChange={e => setFormData({...formData, entidadCuenta: e.target.value})} className="w-full bg-blue-500/15 border border-blue-500/40 rounded-xl px-4 py-3 text-sm font-bold text-blue-200 outline-none focus:border-blue-400/60 transition-colors"/>
             </div>
          )}

          {formData.area === 'Directorio' && (
            <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
              <label className="text-[10px] font-black text-indigo-400 uppercase ml-1 tracking-widest flex items-center gap-1"><UserCircle size={10} /> Director Asignado</label>
              <SearchableSelect 
                required 
                value={formData.directorId || ''} 
                onChange={e => setFormData({...formData, directorId: e.target.value})} 
                options={directores.map(d => ({ value: d, label: d }))}
                placeholder="-- Seleccionar Director --"
              />
            </div>
          )}

          {formData.tipo === 'Egreso' && formData.area !== 'Directorio' && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-300 uppercase ml-1 tracking-widest">Proveedor</label>
              <SearchableSelect 
                value={formData.proveedorId || ''} 
                onChange={e => setFormData({...formData, proveedorId: e.target.value})} 
                options={proveedores.map(pv => ({ value: pv.id, label: `${pv.nombre} (${pv.tipo})` }))}
                placeholder="-- Seleccionar Proveedor --"
              />
            </div>
          )}

          {formData.area === 'Obras' && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-orange-400 uppercase ml-1 tracking-widest">Obra</label>
              <SearchableSelect 
                required 
                value={formData.obraId || ''} 
                onChange={e => setFormData({...formData, obraId: e.target.value})} 
                options={obras.map(o => ({ value: o.id, label: o.nombre }))}
                placeholder="-- Seleccione Obra --"
              />
            </div>
          )}

          {formData.area === 'Alquileres' && formData.tipo === 'Egreso' && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-blue-400 uppercase ml-1 tracking-widest">Propiedad</label>
              <SearchableSelect 
                required 
                value={formData.propiedadId || ''} 
                onChange={e => setFormData({...formData, propiedadId: e.target.value})} 
                options={[
                  ...propiedades.filter(p => !p.esCentroCostos).map(p => ({ value: p.id, label: p.nombre })),
                  ...propiedades.filter(p => p.esCentroCostos).map(p => ({ value: p.id, label: `${p.nombre} (Shared)` }))
                ]}
                placeholder="-- Seleccione Propiedad --"
              />
            </div>
          )}

          {formData.area === 'Alquileres' && formData.tipo === 'Egreso' && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tipo de Gasto</label>
              <div className="flex bg-white/5 p-1 rounded-xl">
                {['ordinario', 'extraordinario'].map(tg => (
                  <button key={tg} type="button" onClick={() => setFormData({...formData, tipoGasto: tg})} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${formData.tipoGasto === tg ? (tg === 'ordinario' ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white') : 'text-slate-500 hover:text-white'}`}>{tg}</button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 ml-1 italic">{formData.tipoGasto === 'ordinario' ? 'Computa para liquidación de expensas' : 'NO computa para liquidación de expensas'}</p>
            </div>
          )}

          {formData.area === 'Alquileres' && formData.tipo === 'Ingreso' && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-emerald-400 uppercase ml-1 tracking-widest flex items-center gap-1"><UserCircle size={10} /> Inquilino (Cliente)</label>
              <SearchableSelect 
                required 
                value={formData.clienteId || ''} 
                onChange={handleClienteChange} 
                options={clientes.map(c => ({ value: c.id, label: `${c.nombre} ${c.apellido}` }))}
                placeholder="-- Seleccione Inquilino --"
              />
              {formData.propiedadId && (
                 <p className="text-[10px] font-black text-blue-500 ml-1 mt-1 uppercase">
                   Propiedad Auto-vinculada: {propiedades.find(p => p.id === formData.propiedadId)?.nombre || 'Desconocida'}
                 </p>
              )}
            </div>
          )}

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">{formData.moneda === 'USD' ? 'u$d' : '$'}</span>
            <input type="text" inputMode="decimal" required placeholder="0.00"
              value={formData.monto ? formatMontoDisplay(formData.monto) : ''}
              onChange={e => handleMontoChange(e.target.value)}
              className="w-full bg-black/50 border border-white/20 rounded-xl pl-12 pr-4 py-4 text-2xl font-black text-white outline-none focus:border-white/40 transition-colors"/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
                TC <span className="text-[10px] text-slate-500 normal-case font-bold">(Tipo de Cambio)</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.tipoCambioReferencia || cotizacionBlue}
                onChange={e => setFormData({...formData, tipoCambioReferencia: e.target.value})}
                disabled={formData.moneda === 'USD'}
                className={`w-full border rounded-xl px-4 py-3 text-sm font-black outline-none transition-all
                  ${formData.moneda === 'USD'
                    ? 'bg-black/20 border-white/8 text-slate-500 cursor-not-allowed'
                    : 'bg-black/40 border-white/15 text-white focus:border-white/30'}`}
                placeholder={`${cotizacionBlue}`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Neto USD (auto)</label>
              <div className={`w-full rounded-xl px-4 py-3 text-sm font-black border flex items-center justify-between
                ${formData.tipo === 'Ingreso'
                  ? 'bg-emerald-500/10 border-emerald-200 text-emerald-700'
                  : 'bg-rose-500/10 border-rose-200 text-rose-700'}`}>
                <span className="text-[10px] font-black uppercase tracking-wider opacity-60">
                  {formData.tipo === 'Ingreso' ? '+' : '−'}
                </span>
                <span className="font-black tabular-nums">{calcularNetoUSDStr(formData, cotizacionBlue)}</span>
              </div>
            </div>
          </div>

          <button type="submit" className={`w-full ${isTicketMode ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/40' : 'bg-emerald-700 hover:bg-emerald-600 shadow-emerald-900/40'} text-white py-4 rounded-2xl font-black text-[10px] tracking-widest uppercase transition-all mt-2 shadow-lg`}>
            {isTicketMode ? 'GUARDAR Y APROBAR TICKET' : movimientoId ? 'GUARDAR CAMBIOS' : 'CONFIRMAR REGISTRO'}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}
