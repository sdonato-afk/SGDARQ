import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db, MAIN_COL } from '../config/firebase';
import SearchableSelect from './SearchableSelect';
import CascadeTaxonomy from './CascadeTaxonomy';

const AREAS = ['Oficina', 'Obras', 'Directorio', 'Alquileres'];
const PERIODICIDAD = [
  { value: 'unica',      label: 'Única' },
  { value: 'mensual',    label: 'Mensual' },
  { value: 'bimestral',  label: 'Bimestral' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'anual',      label: 'Anual' },
];

export default function ModalNuevoVencimiento({ onGuardar, onClose, vencimientoEditar }) {
  const [proveedores, setProveedores] = useState([]);
  const [obras,       setObras]       = useState([]);
  const [propiedades, setPropiedades] = useState([]);

  useEffect(() => {
    getDocs(collection(db, ...MAIN_COL('proveedores'))).then(snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      setProveedores(data);
    });
    getDocs(collection(db, ...MAIN_COL('obras'))).then(snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setObras(data.filter(o => o.estado && o.estado !== 'Finalizada')
                   .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')));
    });
    getDocs(collection(db, ...MAIN_COL('propiedades'))).then(snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      setPropiedades(data);
    });
  }, []);

  const empty = {
    area: 'Oficina', categoria: '', rubro: '', concepto: '',
    proveedorId: '', entidadId: '', fecha: '',
    monto: '', moneda: 'ARS', periodicidad: 'unica',
  };

  const [form, setForm] = useState(vencimientoEditar ? {
    area:            vencimientoEditar.area || 'Oficina',
    categoria:       vencimientoEditar.categoria || vencimientoEditar.categoriaEgreso || '',
    rubro:           vencimientoEditar.rubro || '',
    concepto:        vencimientoEditar.concepto || '',
    proveedorId:     vencimientoEditar.proveedorId || '',
    entidadId:       vencimientoEditar.entidadId || '',
    fecha:           vencimientoEditar.fecha || '',
    monto:           vencimientoEditar.monto || '',
    moneda:          vencimientoEditar.moneda || 'ARS',
    periodicidad:    vencimientoEditar.periodicidad || 'unica',
  } : empty);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.fecha || !form.categoria || !form.rubro || !form.proveedorId) {
      alert('Por favor complete Categoría, Rubro, Proveedor y Fecha.');
      return;
    }
    const prov = proveedores.find(p => p.id === form.proveedorId);
    const provNombre = prov ? prov.nombre : form.rubro;
    let entidadNombre = '';
    const propMatch = propiedades.find(p => p.id === form.entidadId);
    if (propMatch) entidadNombre = propMatch.nombre;
    else { const obraMatch = obras.find(o => o.id === form.entidadId); if (obraMatch) entidadNombre = obraMatch.nombre; }

    // NOTA: ahora respetamos el concepto ingresado desde CascadeTaxonomy (form.concepto)
    // El proveedorNombre se envía separado.
    onGuardar({ 
      ...form, 
      monto: Number(form.monto) || 0, 
      proveedorNombre: provNombre, 
      concepto: form.concepto || provNombre, 
      categoria: form.categoria, 
      entidadNombre 
    });
    onClose();
  };

  const opcionesEntidad = [
    { value: '', label: 'Ninguno (General)' },
    ...obras.map(o       => ({ value: o.id, label: `Obra: ${o.nombre}` })),
    ...propiedades.map(p => ({ value: p.id, label: `Prop: ${p.nombre}` })),
  ];

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 480 }}>

        {/* Header — acento indigo, igual que el sidebar de la agenda */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' }}>
          <div className="flex items-center gap-3">
            <Calendar size={18} className="text-indigo-200" />
            <div>
              <p className="darq-label text-indigo-300 mb-0.5">Agenda de Gestión</p>
              <h3 className="text-base font-black italic text-white uppercase tracking-tight">
                {vencimientoEditar ? 'Editar Vencimiento' : 'Nuevo Vencimiento'}
              </h3>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/15 transition-all hover:rotate-90">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="modal-body space-y-4">

          {/* Área / Taxonomía Cascade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="label">Área</label>
              <SearchableSelect
                className="input"
                value={form.area}
                options={AREAS.map(a => ({ value: a, label: a }))}
                onChange={val => setForm(f => ({ ...f, area: val, categoria: '', rubro: '', concepto: '' }))}
              />
            </div>
            
            <CascadeTaxonomy 
              area={form.area}
              tipo="Egreso" // Los vencimientos son siempre salidas de dinero
              values={form}
              onChange={(updates) => setForm(f => ({ ...f, ...updates }))}
            />
          </div>

          {/* Proveedor / Entidad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Proveedor *</label>
              <SearchableSelect
                className="input"
                value={form.proveedorId}
                placeholder="Seleccionar..."
                options={proveedores.map(p => ({ value: p.id, label: p.nombre + (p.cuit ? ` (${p.cuit})` : '') }))}
                onChange={val => set('proveedorId', val)}
              />
            </div>
            <div>
              <label className="label">Obra / Edificio</label>
              <SearchableSelect
                className="input"
                value={form.entidadId}
                placeholder="Ninguno (General)"
                options={opcionesEntidad}
                onChange={val => set('entidadId', val)}
              />
            </div>
          </div>

          {/* Fecha / Monto / Moneda */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Fecha *</label>
              <input type="date" className="input" value={form.fecha}
                onChange={e => set('fecha', e.target.value)} required />
            </div>
            <div>
              <label className="label">Monto (opc.)</label>
              <input type="number" step="0.01" className="input" placeholder="0"
                value={form.monto} onChange={e => set('monto', e.target.value)} />
            </div>
            <div>
              <label className="label">Moneda</label>
              <select className="input" value={form.moneda} onChange={e => set('moneda', e.target.value)}>
                <option value="ARS">Pesos (ARS)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>
          </div>

          {/* Periodicidad */}
          <div>
            <label className="label">Periodicidad</label>
            <div className="flex gap-1.5">
              {PERIODICIDAD.map(p => (
                <button key={p.value} type="button" onClick={() => set('periodicidad', p.value)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all border ${
                    form.periodicidad === p.value
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/30'
                      : 'bg-white/[0.04] border-white/10 text-white/40 hover:text-white hover:bg-white/[0.07]'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
            {form.periodicidad !== 'unica' && (
              <p className="text-[10px] text-indigo-400/70 mt-2 font-medium">
                ✓ Al pagar se creará automáticamente el próximo vencimiento ({form.periodicidad})
              </p>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
            Cancelar
          </button>
          <button onClick={handleSubmit}
            className="btn btn-primary">
            {vencimientoEditar ? 'Guardar Cambios' : 'Guardar Vencimiento'}
          </button>
        </div>

      </div>
    </div>
  );
}
