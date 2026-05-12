import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db, appId } from '../../../config/firebase';
import { Input, Select } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/Toast';

const defaultProp = {
    nombre: '', direccion: '', piso: '', depto: '',
    unidadFuncional: '', partidaInmobiliaria: '', valorActualUSD: '', esCentroCostos: false, edificio: ''
};

export default function ModalPropiedad({ open, onClose, initialData }) {
  const { success, error } = useToast();
  const [formData, setFormData] = useState(defaultProp);

  useEffect(() => {
    if (open) {
      if (initialData) setFormData(initialData);
      else setFormData(defaultProp);
    }
  }, [open, initialData]);

  const handleSaveProp = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'propiedades'), { ...formData, createdAt: new Date().toISOString() });
      onClose();
      setFormData(defaultProp);
      success('Propiedad guardada correctamente.');
    } catch (err) {
      console.error(err);
      error('Error al guardar la propiedad.');
    }
  };

  if (!open) return null;
  return (
        <div className="fixed inset-0 glass-panel/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-md rounded-xl shadow-lg overflow-hidden my-auto animate-in zoom-in duration-200 border border-white/10">
            <div className="p-5 bg-blue-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black italic tracking-tighter uppercase">NUEVA PROPIEDAD</h3>
                <p className="text-blue-100 darq-label mt-1">Activos Inmobiliarios</p>
              </div>
              <button type="button" onClick={onClose} className="hover:rotate-90 transition-transform"><X /></button>
            </div>
            <form onSubmit={handleSaveProp} className="p-5 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nombre / Identificador" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} placeholder="Ej: VO 2789 1A" />
                
                <div className="w-full">
                  <Input 
                    label="Edificio / Consorcio" 
                    value={formData.edificio} 
                    onChange={e => setFormData({...formData, edificio: e.target.value})} 
                    placeholder="Ej: MO, VO, Laprida..."
                    list="edificios-sugeridos"
                  />
                  <datalist id="edificios-sugeridos">
                    <option value="MO" label="Mendoza" />
                    <option value="VO" label="Viamonte" />
                  </datalist>
                </div>
              </div>
              <Input label="Dirección Completa" required value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} />
              
              <div className="grid grid-cols-3 gap-4">
                <Input placeholder="Piso" value={formData.piso} onChange={e => setFormData({...formData, piso: e.target.value})} />
                <Input placeholder="Depto" value={formData.depto} onChange={e => setFormData({...formData, depto: e.target.value})} />
                <Input placeholder="UF" value={formData.unidadFuncional} onChange={e => setFormData({...formData, unidadFuncional: e.target.value})} />
              </div>
              
              <Input label="Partida Inmobiliaria" value={formData.partidaInmobiliaria} onChange={e => setFormData({...formData, partidaInmobiliaria: e.target.value})} />
              <Input label="Valor Actual (USD)" type="number" value={formData.valorActualUSD} onChange={e => setFormData({...formData, valorActualUSD: e.target.value})} className="text-blue-400" />
              
              <div className="flex items-center gap-2 py-2">
                <input type="checkbox" checked={formData.esCentroCostos} onChange={e => setFormData({...formData, esCentroCostos: e.target.checked})} id="chkCC" className="w-4 h-4 rounded border-slate-300"/>
                <label htmlFor="chkCC" className="darq-value text-slate-400 cursor-pointer">Es Centro de Costos (No Rentable)</label>
              </div>
              
              <Button type="submit" variant="primary" className="w-full mt-4 !bg-blue-600 hover:!bg-blue-500 shadow-blue-900/30">Guardar Propiedad</Button>
            </form>
          </div>
        </div>
  );
}