import React, { useState, useEffect } from 'react';
import { SearchableSelect } from '@darq/ui';
import { X, FileSignature, UserCircle, Building2, Calendar, DollarSign } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db, appId } from '../../../config/firebase';
import { Input, Select } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/Toast';

const defaultContrato = {
  propiedadId: '',
  clienteId: '',
  montoAlquiler: '',
  moneda: 'ARS',
  fechaInicio: new Date().toISOString().split('T')[0],
  duracionMeses: 24,
  periodoActualizacion: 3,
  proximaActualizacion: '',
  fechaFin: '',
};

export default function ModalContrato({ open, onClose, initialData, propiedades, clientes, calcularFechasContrato }) {
  const { success, error, warning } = useToast();
  const [formData, setFormData] = useState(defaultContrato);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(initialData ? { ...defaultContrato, ...initialData } : defaultContrato);
    }
  }, [open, initialData]);

  const set = (field) => (e) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const handleFechaChange = (e) => {
    const nuevInicio = e.target.value;
    const c = calcularFechasContrato(nuevInicio, formData.periodoActualizacion, formData.duracionMeses);
    setFormData((prev) => ({ ...prev, fechaInicio: nuevInicio, proximaActualizacion: c.dtProx, fechaFin: c.dtFin }));
  };

  const handlePeriodoChange = (e) => {
    const nuevoPer = e.target.value;
    const c = calcularFechasContrato(formData.fechaInicio, nuevoPer, formData.duracionMeses);
    setFormData((prev) => ({ ...prev, periodoActualizacion: nuevoPer, proximaActualizacion: c.dtProx, fechaFin: c.dtFin }));
  };

  const handleDuracionChange = (e) => {
    const nuevaDur = e.target.value;
    const c = calcularFechasContrato(formData.fechaInicio, formData.periodoActualizacion, nuevaDur);
    setFormData((prev) => ({ ...prev, duracionMeses: nuevaDur, proximaActualizacion: c.dtProx, fechaFin: c.dtFin }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.propiedadId) { warning('Seleccioná una propiedad.'); return; }
    if (!formData.clienteId)   { warning('Seleccioná un inquilino.'); return; }
    setIsSaving(true);
    try {
      await addDoc(
        collection(db, 'artifacts', appId, 'public', 'data', 'contratos'),
        { ...formData, createdAt: new Date().toISOString() }
      );
      onClose();
      setFormData(defaultContrato);
      success('Contrato registrado correctamente.');
    } catch (err) {
      console.error(err);
      error('Error al guardar el contrato.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  const propOpts = [
    { value: '', label: '-- Seleccionar Propiedad --' },
    ...propiedades.filter((p) => !p.esCentroCostos).map((p) => ({ value: p.id, label: `${p.nombre} (${p.direccion || 'S/D'})` })),
  ];
  const clienteOpts = [
    { value: '', label: '-- Seleccionar Inquilino --' },
    ...clientes.map((c) => ({ value: c.id, label: `${c.nombre} ${c.apellido || ''} · CUIT: ${c.cuit || 'S/N'}` })),
  ];
  const periodoOpts = [
    { value: '3', label: 'Cada 3 meses' },
    { value: '4', label: 'Cada 4 meses' },
    { value: '6', label: 'Cada 6 meses' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#111827] w-full max-w-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden my-auto animate-in zoom-in-95 duration-200">

        {/* ── Header ── */}
        <div className="px-6 py-5 bg-amber-700/80 border-b border-white/10 flex justify-between items-center">
          <div>
            <p className="text-amber-300 text-[10px] font-black uppercase tracking-[0.25em] mb-0.5">
              Módulo Alquileres
            </p>
            <h3 className="text-xl font-black italic tracking-tighter uppercase text-white flex items-center gap-2">
              <FileSignature size={18} />
              Nuevo Contrato
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all hover:rotate-90"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSave} className="p-6 space-y-4">

          {/* Propiedad */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest flex items-center gap-1">
              <Building2 size={11} /> Propiedad Involucrada
            </label>
            <SearchableSelect
              required
              value={formData.propiedadId}
              onChange={e => setFormData(prev => ({ ...prev, propiedadId: e.target.value }))}
              options={propOpts}
              placeholder="-- Seleccionar Propiedad --"
            />
          </div>

          {/* Inquilino */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest flex items-center gap-1">
              <UserCircle size={11} /> Inquilino Asignado
            </label>
            <SearchableSelect
              required
              value={formData.clienteId}
              onChange={e => setFormData(prev => ({ ...prev, clienteId: e.target.value }))}
              options={clienteOpts}
              placeholder="-- Seleccionar Inquilino --"
            />
          </div>

          {/* Monto + Moneda */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="💵 Monto de Alquiler *"
              type="number"
              min="0"
              required
              placeholder="Ej: 350000"
              value={formData.montoAlquiler}
              onChange={set('montoAlquiler')}
              leftIcon={DollarSign}
              className="text-emerald-300"
            />
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Moneda</label>
              <div className="flex bg-black/40 border border-white/10 p-1 rounded-xl h-[46px]">
                {['ARS', 'USD'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, moneda: m }))}
                    className={`flex-1 rounded-lg text-[10px] font-black transition-all ${
                      formData.moneda === m ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fecha inicio */}
          <Input
            label="Fecha de Inicio *"
            type="date"
            required
            value={formData.fechaInicio}
            onChange={handleFechaChange}
            leftIcon={Calendar}
          />

          {/* Período + Duración */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Actualización"
              value={formData.periodoActualizacion}
              onChange={handlePeriodoChange}
              options={periodoOpts}
            />
            <Input
              label="Duración (meses)"
              type="number"
              min="1"
              required
              value={formData.duracionMeses}
              onChange={handleDuracionChange}
            />
          </div>

          {/* Calculado automático */}
          {(formData.proximaActualizacion || formData.fechaFin) && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-1">Próxima Act.</span>
                <span className="text-sm font-black text-amber-200">{formData.proximaActualizacion || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-1">Finalización</span>
                <span className="text-sm font-black text-amber-200">{formData.fechaFin || '—'}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 !bg-amber-600 hover:!bg-amber-500 shadow-amber-900/30"
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Guardar Contrato'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
