import React, { useState } from 'react';
import { X, Pencil, Check, Plus, CreditCard } from 'lucide-react';
import { SearchableSelect } from '@darq/ui';
import { doc, updateDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { DataTable } from '../modules/ui/DataTable';

const TIPOS = ['Materiales', 'Mano de Obra', 'Servicios', 'Profesionales', 'Otros'];

export default function Proveedores({ proveedores, userRole, userData }) {
  const [editId, setEd] = useState(null);
  const [draft,  setDft] = useState({});
  const [newF,   setNewF] = useState(null);
  const canAdd = ['superadmin', 'admin_general'].includes(userRole);
  const fi     = 'w-full px-1 py-1 glass-panel border border-white/10 rounded outline-none text-slate-100 focus:border-indigo-400 text-[10px]';

  const startEdit  = (p)  => { setEd(p.id); setDft({ ...p }); };
  const cancelEdit = ()   => { setEd(null); setDft({}); };

  const saveEdit = async () => {
    const { id, ...fields } = draft;
    const original = proveedores.find(p => p.id === id) || {};
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'proveedores', id), fields);
    if (userRole === 'admin_general') {
      const cambios = {};
      Object.keys(fields).forEach(k => { if (String(fields[k]) !== String(original[k] ?? '')) cambios[k] = fields[k]; });
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'solicitudes'), {
        tipo: 'editar_entidad', entidad: 'proveedores', entidadId: id,
        entidadNombre: fields.nombre || original.nombre || '',
        snapshot_anterior: original, cambios,
        solicitanteNombre: userData?.nombre || 'Admin', solicitanteRol: userRole,
        estado: 'info', createdAt: new Date().toISOString(),
      });
    }
    cancelEdit();
  };

  const addItem = async () => {
    if (!newF?.nombre?.trim()) return;
    const data = {
      nombre: newF.nombre, tipo: newF.tipo || '', rubro: newF.rubro || '',
      telefono: newF.telefono || '', cuit: newF.cuit || '', alias1: newF.alias || '',
      createdAt: new Date().toISOString(),
    };
    const ref = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'proveedores'), data);
    if (userRole === 'admin_general') {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'solicitudes'), {
        tipo: 'crear_entidad', entidad: 'proveedores', entidadId: ref.id,
        entidadNombre: data.nombre, cambios: data,
        solicitanteNombre: userData?.nombre || 'Admin', solicitanteRol: userRole,
        estado: 'info', createdAt: new Date().toISOString(),
      });
    }
    setNewF(null);
  };

  const handleBorrar = async (prov) => {
    if (userRole === 'superadmin') {
      if (window.confirm('¿Borrar proveedor?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'proveedores', prov.id));
    } else {
      if (window.confirm('Se enviará una solicitud de borrado. ¿Continuar?')) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'solicitudes'), {
          tipo: 'borrar', entidad: 'proveedores', entidadId: prov.id, entidadNombre: prov.nombre || '',
          entidadSnapshot: { nombre: prov.nombre, tipo: prov.tipo, rubro: prov.rubro, cuit: prov.cuit },
          solicitanteRol: userRole, estado: 'pendiente', createdAt: new Date().toISOString(),
        });
        alert('✅ Solicitud de borrado enviada.');
      }
    }
  };

  const nombres = [...new Set(proveedores.map(p => p.nombre).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const rubros  = [...new Set(proveedores.map(p => p.rubro).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const columns = [
    {
      key: 'nombre', label: 'Razón Social / Proveedor',
      sortable: true, filterable: true, filterList: nombres,
      render: (val, row) => editId === row.id
        ? <input value={draft.nombre || ''} onChange={e => setDft(d => ({ ...d, nombre: e.target.value }))} className={fi} />
        : <span className="font-bold">{val}</span>,
    },
    {
      key: 'tipo', label: 'Categoría', align: 'center', width: 'w-28',
      sortable: true, filterable: true, filterList: TIPOS,
      render: (val, row) => editId === row.id
        ? <SearchableSelect value={draft.tipo || ''} onChange={e => setDft(d => ({ ...d, tipo: e.target.value }))} className={`${fi} uppercase`}>
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </SearchableSelect>
        : <span className="text-[10px]">{val}</span>,
    },
    {
      key: 'rubro', label: 'Rubro / Especialidad',
      filterable: true, filterList: rubros,
      render: (val, row) => editId === row.id
        ? <input value={draft.rubro || ''} onChange={e => setDft(d => ({ ...d, rubro: e.target.value }))} className={fi} />
        : <span className="text-[10px]">{val}</span>,
    },
    {
      key: 'contacto', label: 'Contacto', filterable: true,
      render: (_, row) => editId === row.id
        ? <div className="flex gap-1">
            <input placeholder="Tel" value={draft.telefono || ''} onChange={e => setDft(d => ({ ...d, telefono: e.target.value }))} className={`${fi} w-1/2`} />
            <input placeholder="Email" value={draft.mail || ''} onChange={e => setDft(d => ({ ...d, mail: e.target.value }))} className={`${fi} w-1/2`} />
          </div>
        : <span className="text-[10px]">{[row.telefono, row.mail].filter(Boolean).join(' · ') || '—'}</span>,
    },
    {
      key: 'cuit', label: 'CUIT Fiscal', filterable: true,
      render: (val, row) => editId === row.id
        ? <input value={draft.cuit || ''} onChange={e => setDft(d => ({ ...d, cuit: e.target.value }))} className={`${fi} font-mono`} />
        : <span className="font-mono text-[10px] text-slate-400">{val}</span>,
    },
    {
      key: 'alias1', label: 'Alias / CBU', filterable: true,
      render: (val, row) => editId === row.id
        ? <input value={draft.alias1 || ''} onChange={e => setDft(d => ({ ...d, alias1: e.target.value }))} className={`${fi} font-mono`} />
        : <span className="font-mono text-[10px] flex items-center gap-1">
            {val && <CreditCard size={9} className="text-indigo-400 flex-shrink-0" />}
            {val}
          </span>,
    },
    {
      key: '_actions', label: '', width: 'w-14',
      render: (_, row) => (
        <div className="flex items-center justify-center gap-1">
          {editId === row.id ? (
            <>
              <button onClick={saveEdit} title="Guardar" className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10 transition-colors"><Check size={12} /></button>
              <button onClick={cancelEdit} title="Cancelar" className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"><X size={11} /></button>
            </>
          ) : (
            <>
              <button onClick={() => startEdit(row)} title="Editar" className="p-1 rounded text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"><Pencil size={11} /></button>
              <button onClick={() => handleBorrar(row)} className={`p-1 rounded transition-colors ${userRole === 'superadmin' ? 'text-slate-400 hover:text-rose-500 hover:bg-rose-500/10' : 'text-amber-500/60 hover:text-amber-400 hover:bg-amber-500/10'}`} title={userRole === 'superadmin' ? 'Borrar' : 'Solicitar borrado'}><X size={11} /></button>
            </>
          )}
        </div>
      ),
    },
  ];

  const headerAction = canAdd && !newF && (
    <button onClick={() => setNewF({ nombre: '', tipo: '', rubro: '', telefono: '', cuit: '', alias: '' })}
      className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 px-3 py-1.5 rounded-lg glass-panel hover:bg-indigo-500/10 border border-white/10 transition-colors">
      <Plus size={11} /> Nuevo Proveedor
    </button>
  );

  return (
    <>
      {canAdd && newF && (
        <div className="bg-[#1a2235] border border-indigo-500/30 rounded-xl p-3 mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Nuevo Proveedor</p>
          <div className="flex flex-wrap gap-2 items-end">
            <input autoFocus value={newF.nombre || ''} onChange={e => setNewF(v => ({ ...v, nombre: e.target.value }))} placeholder="Nombre *" className={fi} style={{ flex: '2 1 140px' }} />
            <SearchableSelect value={newF.tipo || ''} onChange={e => setNewF(v => ({ ...v, tipo: e.target.value }))} className={`${fi} uppercase`} style={{ flex: '1 1 110px' }}>
              <option value="">Categoría</option>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </SearchableSelect>
            <input value={newF.rubro || ''} onChange={e => setNewF(v => ({ ...v, rubro: e.target.value }))} placeholder="Rubro" className={fi} style={{ flex: '1 1 110px' }} />
            <input value={newF.telefono || ''} onChange={e => setNewF(v => ({ ...v, telefono: e.target.value }))} placeholder="Teléfono" className={fi} style={{ flex: '1 1 100px' }} />
            <input value={newF.cuit || ''} onChange={e => setNewF(v => ({ ...v, cuit: e.target.value }))} placeholder="CUIT" className={fi} style={{ flex: '1 1 100px' }} />
            <input value={newF.alias || ''} onChange={e => setNewF(v => ({ ...v, alias: e.target.value }))} placeholder="Alias/CBU" className={fi} style={{ flex: '1 1 100px' }} />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={addItem} className="flex items-center gap-1 text-[10px] font-black text-emerald-400 uppercase tracking-widest px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 border border-emerald-500/30 transition-colors"><Check size={11} /> Guardar</button>
            <button onClick={() => setNewF(null)} className="flex items-center gap-1 darq-label px-3 py-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-400 border border-white/10 transition-colors"><X size={11} /> Cancelar</button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={proveedores}
        emptyMessage="No hay proveedores registrados."
        accentColor="indigo"
        headerAction={headerAction}
        rowClassName={(row) => editId === row.id ? 'ring-1 ring-inset ring-indigo-500/40 bg-indigo-500/[0.07]' : ''}
      />
    </>
  );
}
