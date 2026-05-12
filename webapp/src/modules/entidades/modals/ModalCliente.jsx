import React, { useState, useEffect } from 'react';
import { X, UserCircle, Phone, Mail, MapPin, Hash } from 'lucide-react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../../../config/firebase';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/Toast';

const COLLECTION = (suffix = '') =>
  `artifacts/${appId}/public/data/clientes${suffix ? '/' + suffix : ''}`;

const defaultCliente = {
  nombre: '',
  apellido: '',
  cuit: '',
  telefono: '',
  mail: '',
  direccion: '',
};

export default function ModalCliente({ open, onClose, initialData }) {
  const { success, error } = useToast();
  const [formData, setFormData] = useState(defaultCliente);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const isEditing = Boolean(initialData?.id);

  useEffect(() => {
    if (open) {
      setFormData(initialData ? { ...defaultCliente, ...initialData } : defaultCliente);
      setErrors({});
    }
  }, [open, initialData]);

  const set = (field) => (e) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!formData.nombre.trim()) errs.nombre = 'El nombre es obligatorio';
    if (formData.mail && !/\S+@\S+\.\S+/.test(formData.mail))
      errs.mail = 'Email inválido';
    if (formData.cuit && !/^\d{2}-\d{8}-\d{1}$/.test(formData.cuit) && !/^\d{11}$/.test(formData.cuit.replace(/-/g, '')))
      errs.cuit = 'Formato: 20-12345678-9';
    return errs;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setIsSaving(true);
    try {
      const payload = { ...formData, updatedAt: new Date().toISOString() };

      if (isEditing) {
        await updateDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'clientes', initialData.id),
          payload
        );
      } else {
        await addDoc(
          collection(db, 'artifacts', appId, 'public', 'data', 'clientes'),
          { ...payload, createdAt: new Date().toISOString() }
        );
      }
      onClose();
      setFormData(defaultCliente);
      success(isEditing ? 'Cliente actualizado correctamente.' : 'Nuevo cliente registrado.');
    } catch (err) {
      console.error('Error al guardar cliente:', err);
      error('Error al guardar el cliente. Intentá de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#111827] w-full max-w-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden my-auto animate-in zoom-in-95 duration-200">

        {/* ── Header ── */}
        <div className="px-6 py-5 bg-sky-700/80 border-b border-white/10 flex justify-between items-center">
          <div>
            <p className="text-sky-300 text-[10px] font-black uppercase tracking-[0.25em] mb-0.5">
              Directorio de Personas
            </p>
            <h3 className="text-xl font-black italic tracking-tighter uppercase text-white">
              {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
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

          {/* Nombre + Apellido */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre *"
              placeholder="Ej: Juan"
              value={formData.nombre}
              onChange={set('nombre')}
              error={errors.nombre}
              leftIcon={UserCircle}
              required
            />
            <Input
              label="Apellido"
              placeholder="Ej: García"
              value={formData.apellido}
              onChange={set('apellido')}
            />
          </div>

          {/* CUIT */}
          <Input
            label="CUIT / ID Fiscal"
            placeholder="20-12345678-9"
            value={formData.cuit}
            onChange={set('cuit')}
            error={errors.cuit}
            leftIcon={Hash}
          />

          {/* Teléfono + Mail */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Teléfono"
              placeholder="+54 11 xxxx-xxxx"
              value={formData.telefono}
              onChange={set('telefono')}
              leftIcon={Phone}
              type="tel"
            />
            <Input
              label="Email"
              placeholder="correo@ejemplo.com"
              value={formData.mail}
              onChange={set('mail')}
              error={errors.mail}
              leftIcon={Mail}
              type="email"
            />
          </div>

          {/* Dirección */}
          <Input
            label="Dirección / Módulo"
            placeholder="Ej: VO 2789 — Piso 3 Dto B"
            value={formData.direccion}
            onChange={set('direccion')}
            leftIcon={MapPin}
          />

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 !bg-sky-600 hover:!bg-sky-500 shadow-sky-900/30"
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : isEditing ? 'Actualizar Cliente' : 'Guardar Cliente'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
