import React, { useState, useEffect } from 'react';
import { X, HardHat, Calendar, TrendingUp } from 'lucide-react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db, appId } from '../../../config/firebase';
import { Input, Select } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/Toast';

const defaultObra = {
  nombre: '',
  direccion: '',
  fechaInicio: new Date().toISOString().split('T')[0],
  fechaEstimadaFin: '',
  porcentajeAvance: 0,
  estado: 'En Proceso',
};

const ESTADOS = ['En Proceso', 'Pausada', 'Finalizada'];

export default function ModalObra({ open, onClose, initialData, editingObraId }) {
  const { success, error } = useToast();
  const [formData, setFormData] = useState(defaultObra);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = Boolean(editingObraId);

  useEffect(() => {
    if (open) {
      setFormData(initialData ? { ...defaultObra, ...initialData } : defaultObra);
    }
  }, [open, initialData]);

  const set = (field) => (e) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        porcentajeAvance: Number(formData.porcentajeAvance) || 0,
      };
      if (isEditing) {
        await updateDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'obras', editingObraId),
          { ...payload, updatedAt: new Date().toISOString() }
        );
      } else {
        await addDoc(
          collection(db, 'artifacts', appId, 'public', 'data', 'obras'),
          { ...payload, createdAt: new Date().toISOString() }
        );
      }
      onClose();
      setFormData(defaultObra);
      success(isEditing ? 'Obra actualizada correctamente.' : 'Nueva obra creada.');
    } catch (err) {
      console.error(err);
      error('Error al guardar la obra. Intentá de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  const avancePct = Math.min(100, Math.max(0, Number(formData.porcentajeAvance) || 0));

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#111827] w-full max-w-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden my-auto animate-in zoom-in-95 duration-200">

        {/* ── Header ── */}
        <div className="px-6 py-5 bg-orange-700/80 border-b border-white/10 flex justify-between items-center">
          <div>
            <p className="text-orange-300 text-[10px] font-black uppercase tracking-[0.25em] mb-0.5">
              Gestión de Proyectos
            </p>
            <h3 className="text-xl font-black italic tracking-tighter uppercase text-white flex items-center gap-2">
              <HardHat size={18} />
              {isEditing ? 'Editar Obra' : 'Nueva Obra'}
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

          <Input
            label="Nombre de la Obra *"
            placeholder="Ej: Reforma Edificio MO"
            value={formData.nombre}
            onChange={set('nombre')}
            required
          />

          <Input
            label="Dirección"
            placeholder="Ej: Mendoza 2325, CABA"
            value={formData.direccion}
            onChange={set('direccion')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha Inicio"
              type="date"
              value={formData.fechaInicio}
              onChange={set('fechaInicio')}
              leftIcon={Calendar}
            />
            <Input
              label="Est. Finalización"
              type="date"
              value={formData.fechaEstimadaFin}
              onChange={set('fechaEstimadaFin')}
              leftIcon={Calendar}
            />
          </div>

          {/* Avance con barra visual */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <TrendingUp size={11} /> Avance
              </label>
              <span className="text-sm font-black text-orange-400">{avancePct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={avancePct}
              onChange={set('porcentajeAvance')}
              className="w-full accent-orange-500 cursor-pointer"
            />
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-300"
                style={{ width: `${avancePct}%` }}
              />
            </div>
          </div>

          <Select
            label="Estado"
            value={formData.estado}
            onChange={set('estado')}
            options={ESTADOS}
          />

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 !bg-orange-600 hover:!bg-orange-500 shadow-orange-900/30"
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : isEditing ? 'Actualizar Obra' : 'Guardar Obra'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
