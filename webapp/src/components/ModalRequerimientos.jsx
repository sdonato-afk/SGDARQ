import React, { useState, useEffect } from 'react';
import { SearchableSelect } from '@darq/ui';
import { X, Save, AlertCircle, Trash2, Plus } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, appId } from '../config/firebase';

export default function ModalRequerimientos({ open, onClose, cajasDisplay }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      cargarRequerimientos();
    }
  }, [open]);

  const cargarRequerimientos = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'configuracion', 'requerimientos_viernes');
      const snap = await getDoc(docRef);
      if (snap.exists() && snap.data().items) {
        setItems(snap.data().items);
      } else if (snap.exists() && snap.data().cajas) {
        // Migración
        const oldCajas = snap.data().cajas;
        const newItems = Object.entries(oldCajas).map(([cajaKey, req]) => ({
          id: Math.random().toString(36).substring(7),
          caja: cajaKey,
          ars: req.ars || '',
          usd: req.usd || '',
          concepto: req.concepto || ''
        })).filter(i => i.ars || i.usd || i.concepto);
        setItems(newItems);
      } else {
        setItems([]);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleGuardar = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'configuracion', 'requerimientos_viernes');
      await setDoc(docRef, {
        items: items,
        updatedAt: new Date().toISOString()
      });
      onClose();
    } catch (e) {
      console.error(e);
      alert('Error al guardar: ' + e.message);
    }
    setSaving(false);
  };

  const handleChangeItem = (id, field, value) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleFormattedChange = (id, field, value) => {
    const soloNumeros = value.replace(/\D/g, '');
    handleChangeItem(id, field, soloNumeros);
  };

  const handleAddItem = () => {
    setItems(prev => [...prev, { id: Math.random().toString(36).substring(7), caja: 'Caja Pesos', ars: '', usd: '', concepto: '' }]);
  };

  const handleRemoveItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-panel rounded-[2rem] shadow-2xl w-full max-w-4xl border border-white/10 p-8 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <h3 className="darq-h2 flex items-center gap-3">Requerimientos Prox. Viernes</h3>
            <p className="text-[10px] font-bold mt-1 uppercase tracking-widest text-slate-400">
              Carga manual de necesidades de fondos (se sobrescribe semanalmente)
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-2 bg-white/5 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
          {loading ? (
            <p className="text-center text-slate-400 py-10">Cargando...</p>
          ) : items.length === 0 ? (
            <div className="text-center py-10 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Sin requerimientos cargados</p>
              <button onClick={handleAddItem} className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors border border-emerald-500/20 inline-flex items-center gap-2">
                <Plus size={14} /> Cargar Primer Gasto
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map(item => (
                <div key={item.id} className="glass-card/40 p-5 rounded-2xl border border-white/[0.04] flex flex-col md:flex-row gap-4 items-center transition-colors hover:bg-white/[0.02]">
                  <div className="w-full md:w-[20%]">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Caja Origen</label>
                    <SearchableSelect 
                      value={item.caja} 
                      onChange={e => handleChangeItem(item.id, 'caja', e.target.value)}
                      options={cajasDisplay.map(c => ({ value: c.key, label: c.label }))}
                      placeholder="Seleccionar..."
                    />
                  </div>
                  <div className="w-full md:w-[35%] flex gap-3">
                    <div className="flex-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Monto ARS</label>
                      <input type="text" value={item.ars ? Number(item.ars).toLocaleString('es-AR') : ''} onChange={e => handleFormattedChange(item.id, 'ars', e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-base font-black text-white outline-none focus:border-emerald-500 transition-colors text-right" placeholder="0" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Monto USD</label>
                      <input type="text" value={item.usd ? Number(item.usd).toLocaleString('es-AR') : ''} onChange={e => handleFormattedChange(item.id, 'usd', e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-base font-black text-white outline-none focus:border-emerald-500 transition-colors text-right" placeholder="0" />
                    </div>
                  </div>
                  <div className="w-full md:w-[35%]">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Para qué y quién es</label>
                    <input type="text" value={item.concepto} onChange={e => handleChangeItem(item.id, 'concepto', e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white outline-none focus:border-emerald-500 transition-colors" placeholder="Ej: Pago albañiles y materiales..." />
                  </div>
                  <div className="w-full md:w-[10%] flex justify-end md:mt-4">
                    <button onClick={() => handleRemoveItem(item.id)} title="Eliminar fila"
                      className="text-rose-500 hover:text-rose-400 p-2.5 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <button onClick={handleAddItem}
                  className="w-full py-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] border-dashed text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex justify-center items-center gap-2">
                  <Plus size={14} /> Agregar otro gasto
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-white/5 shrink-0 flex gap-4">
          <button onClick={onClose}
            className="flex-1 py-4 bg-transparent border border-white/10 hover:bg-white/5 text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={saving}
            className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl hover:-translate-y-0.5 flex justify-center items-center gap-2">
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Requerimientos'}
          </button>
        </div>
        
      </div>
    </div>
  );
}
