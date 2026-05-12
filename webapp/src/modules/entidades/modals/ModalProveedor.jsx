import React, { useState, useEffect } from 'react';
import { X, Users, CreditCard, Phone, Mail, Hash, Briefcase } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db, appId } from '../../../config/firebase';
import { Input, Select } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/Toast';

const defaultProv = {
  nombre: '',
  cuit: '',
  telefono: '',
  mail: '',
  nombreVendedor: '',
  alias1: '',
  alias2: '',
  tipo: 'Materiales',
  rubro: '',
  concepto: '',
};

export default function ModalProveedor({ open, onClose, initialData, tiposProv }) {
  const { success, error } = useToast();
  const [formData, setFormData] = useState(defaultProv);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(initialData ? { ...defaultProv, ...initialData } : defaultProv);
    }
  }, [open, initialData]);

  const set = (field) => (e) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await addDoc(
        collection(db, 'artifacts', appId, 'public', 'data', 'proveedores'),
        { ...formData, createdAt: new Date().toISOString() }
      );
      onClose();
      setFormData(defaultProv);
      success('Proveedor registrado correctamente.');
    } catch (err) {
      console.error(err);
      error('Error al guardar el proveedor.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  const tiposOpts = (tiposProv || ['Materiales', 'Mano de Obra', 'Impuestos', 'Servicios', 'Sueldos', 'Varios']);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#111827] w-full max-w-2xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden my-auto animate-in zoom-in-95 duration-200">

        {/* ── Header ── */}
        <div className="px-6 py-5 bg-indigo-700/80 border-b border-white/10 flex justify-between items-center">
          <div>
            <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.25em] mb-0.5">
              Gestión de Cuentas y Contacto
            </p>
            <h3 className="text-xl font-black italic tracking-tighter uppercase text-white flex items-center gap-2">
              <Users size={18} />
              Registro de Proveedor
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

          {/* Nombre + CUIT */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre / Razón Social *"
              placeholder="Ej: Corralón San José"
              value={formData.nombre}
              onChange={set('nombre')}
              leftIcon={Briefcase}
              required
            />
            <Input
              label="CUIT"
              placeholder="20-XXXXXXXX-X"
              value={formData.cuit}
              onChange={set('cuit')}
              leftIcon={Hash}
            />
          </div>

          {/* Teléfono + Mail */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Teléfono"
              placeholder="Número de contacto"
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
              leftIcon={Mail}
              type="email"
            />
          </div>

          {/* Vendedor */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-indigo-400 uppercase ml-1 tracking-widest">
              Nombre Vendedor / Contacto Interno
            </label>
            <input
              type="text"
              placeholder="Ej: Juan Pérez"
              value={formData.nombreVendedor}
              onChange={set('nombreVendedor')}
              className="w-full bg-indigo-500/10 border border-indigo-500/40 focus:border-indigo-400/70 rounded-xl px-4 py-3 text-sm font-bold text-indigo-200 outline-none transition-colors"
            />
          </div>

          {/* Tipo + Rubro */}
          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Tipo"
              value={formData.tipo}
              onChange={set('tipo')}
              options={tiposOpts}
            />
            <div className="col-span-2">
              <Input
                label="Rubro Específico"
                placeholder="Ej: Materiales Eléctricos"
                value={formData.rubro}
                onChange={set('rubro')}
              />
            </div>
          </div>

          {/* Alias CBU */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest flex items-center gap-1">
                <CreditCard size={10} /> Alias / CBU 1
              </label>
              <input
                type="text"
                placeholder="Alias de pago principal"
                value={formData.alias1}
                onChange={set('alias1')}
                className="w-full bg-black/40 border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-xs font-mono font-bold text-white outline-none transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest flex items-center gap-1">
                <CreditCard size={10} /> Alias / CBU 2 (Opcional)
              </label>
              <input
                type="text"
                placeholder="Cuenta secundaria"
                value={formData.alias2}
                onChange={set('alias2')}
                className="w-full bg-black/40 border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-xs font-mono font-bold text-white outline-none transition-colors"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">
              Notas Internas
            </label>
            <textarea
              placeholder="Concepto o notas sobre el proveedor..."
              value={formData.concepto}
              onChange={set('concepto')}
              rows={3}
              className="w-full bg-black/40 border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 !bg-indigo-600 hover:!bg-indigo-500 shadow-indigo-900/30"
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Guardar Proveedor'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
