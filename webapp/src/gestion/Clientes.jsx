import React, { useState } from 'react';
import { X, Pencil, Check, Plus } from 'lucide-react';
import { doc, updateDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { DataTable } from '../modules/ui/DataTable';

const EMPTY = { nombre: '', direccion: '', telefono: '', mail: '', cuit: '' };

export default function Clientes({ clientes, userRole, userData }) {
  const [editId, setEd] = useState(null);
  const [draft, setDft] = useState({});
  const [newF,  setNewF] = useState(null);
  const canAdd = ['superadmin', 'admin_general'].includes(userRole);

  const startEdit  = (cl) => { setEd(cl.id); setDft({ ...cl }); };
  const cancelEdit = () =>   { setEd(null); setDft({}); };

  const saveEdit = async () => {
    const { id, ...fields } = draft;
    const original = clientes.find(c => c.id === id) || {};
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clientes', id), fields);
    if (userRole === 'admin_general') {
      const cambios = {};
      Object.keys(fields).forEach(k => {
        if (String(fields[k]) !== String(original[k] ?? '')) cambios[k] = fields[k];
      });
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'solicitudes'), {
        tipo: 'editar_entidad', entidad: 'clientes', entidadId: id,
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
      nombre: newF.nombre, direccion: newF.direccion || '',
      telefono: newF.telefono || '', mail: newF.mail || '',
      cuit: newF.cuit || '', createdAt: new Date().toISOString(),
    };
    const ref = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clientes'), data);
    if (userRole === 'admin_general') {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'solicitudes'), {
        tipo: 'crear_entidad', entidad: 'clientes', entidadId: ref.id,
        entidadNombre: data.nombre, cambios: data,
        solicitanteNombre: userData?.nombre || 'Admin', solicitanteRol: userRole,
        estado: 'info', createdAt: new Date().toISOString(),
      });
    }
    setNewF(null);
  };

  const handleBorrar = async (cl) => {
    if (userRole === 'superadmin') {
      if (window.confirm('¿Borrar cliente?'))
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clientes', cl.id));
    } else {
      if (window.confirm('Se enviará una solicitud de borrado. ¿Continuar?')) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'solicitudes'), {
          tipo: 'borrar', entidad: 'clientes', entidadId: cl.id, entidadNombre: cl.nombre || '',
          entidadSnapshot: { nombre: cl.nombre, cuit: cl.cuit, telefono: cl.telefono },
          solicitanteRol: userRole, estado: 'pendiente', createdAt: new Date().toISOString(),
        });
        alert('✅ Solicitud de borrado enviada.');
      }
    }
  };

  const fi = 'w-full px-1 py-1 glass-panel border border-white/10 rounded outline-none text-slate-100 focus:border-emerald-400 text-[10px]';

  // ── Nombres únicos para datalists
  const nombres     = [...new Set(clientes.map(c => c.nombre).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const direcciones = [...new Set(clientes.map(c => c.direccion).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  // ── Definición de columnas para DataTable
  const columns = [
    {
      key: 'nombre', label: 'Nombre Inquilino/Cliente',
      sortable: true, filterable: true, filterList: nombres,
      render: (val, row) => editId === row.id
        ? <input value={draft.nombre || ''} onChange={e => setDft(d => ({ ...d, nombre: e.target.value }))} className={fi} />
        : <span>{val}</span>,
    },
    {
      key: 'direccion', label: 'Dirección / Módulo',
      sortable: true, filterable: true, filterList: direcciones,
      render: (val, row) => editId === row.id
        ? <input value={draft.direccion || ''} onChange={e => setDft(d => ({ ...d, direccion: e.target.value }))} className={fi} />
        : <span>{val}</span>,
    },
    {
      key: 'telefono', label: 'Teléfono',
      filterable: true,
      render: (val, row) => editId === row.id
        ? <input value={draft.telefono || ''} onChange={e => setDft(d => ({ ...d, telefono: e.target.value }))} className={fi} />
        : <span>{val}</span>,
    },
    {
      key: 'mail', label: 'Email',
      filterable: true,
      render: (val, row) => editId === row.id
        ? <input value={draft.mail || ''} onChange={e => setDft(d => ({ ...d, mail: e.target.value }))} className={fi} />
        : <span>{val}</span>,
    },
    {
      key: 'cuit', label: 'CUIT / ID Fiscal',
      filterable: true,
      render: (val, row) => editId === row.id
        ? <input value={draft.cuit || ''} onChange={e => setDft(d => ({ ...d, cuit: e.target.value }))} className={`${fi} font-mono`} />
        : <span className="font-mono text-slate-400">{val}</span>,
    },
    {
      key: '_actions', label: '',
      width: 'w-14',
      render: (_, row) => (
        <div className="flex items-center justify-center gap-1">
          {editId === row.id ? (
            <>
              <button onClick={saveEdit} title="Guardar" className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10 transition-colors"><Check size={12} /></button>
              <button onClick={cancelEdit} title="Cancelar" className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"><X size={11} /></button>
            </>
          ) : (
            <>
              <button onClick={() => startEdit(row)} title="Editar" className="p-1 rounded text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"><Pencil size={11} /></button>
              <button
                onClick={() => handleBorrar(row)}
                className={`p-1 rounded transition-colors ${userRole === 'superadmin' ? 'text-slate-400 hover:text-rose-500 hover:bg-rose-500/10' : 'text-amber-500/60 hover:text-amber-400 hover:bg-amber-500/10'}`}
                title={userRole === 'superadmin' ? 'Borrar' : 'Solicitar borrado'}
              >
                <X size={11} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const headerAction = canAdd && !newF && (
    <button
      onClick={() => setNewF(EMPTY)}
      className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:text-emerald-300 px-3 py-1.5 rounded-lg glass-panel hover:bg-emerald-500/10 border border-white/10 transition-colors"
    >
      <Plus size={11} /> Nuevo Cliente
    </button>
  );

  return (
    <>
      {/* Formulario inline de nuevo cliente */}
      {canAdd && newF && (
        <div className="bg-[#1a2235] border border-emerald-500/30 rounded-xl p-3 mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Nuevo Cliente</p>
          <div className="flex flex-wrap gap-2 items-end">
            {[['nombre','Nombre *','2 1 160px'],['direccion','Dirección','2 1 140px'],['telefono','Teléfono','1 1 100px'],['mail','Email','1 1 120px'],['cuit','CUIT','1 1 100px']].map(([k,p,flex]) => (
              <input key={k} autoFocus={k==='nombre'} value={newF[k]||''} onChange={e=>setNewF(v=>({...v,[k]:e.target.value}))} placeholder={p} className={fi} style={{flex}} />
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={addItem} className="flex items-center gap-1 text-[10px] font-black text-emerald-400 uppercase tracking-widest px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 border border-emerald-500/30 transition-colors"><Check size={11}/> Guardar</button>
            <button onClick={()=>setNewF(null)} className="flex items-center gap-1 darq-label px-3 py-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-400 border border-white/10 transition-colors"><X size={11}/> Cancelar</button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={clientes}
        emptyMessage="No hay clientes registrados."
        accentColor="emerald"
        headerAction={headerAction}
        rowClassName={(row) => editId === row.id ? 'ring-1 ring-inset ring-emerald-500/40 bg-emerald-500/[0.07]' : ''}
      />
    </>
  );
}
