import React, { useState } from 'react';
import { X, Pencil, Check, Plus, HardHat } from 'lucide-react';
import { SearchableSelect } from '@darq/ui';
import { doc, updateDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { DataTable } from '../modules/ui/DataTable';

const TIPOS   = ['servicio', 'desarrollo', 'departamento'];
const ESTADOS = ['En Ejecución', 'Finalizada', 'Pausada', 'Presupuesto'];

const estadoColor = (estado) => {
  switch (estado) {
    case 'Finalizada':  return 'text-emerald-400';
    case 'En Ejecución':return 'text-blue-400';
    case 'Pausada':     return 'text-amber-400';
    default:            return 'text-slate-400';
  }
};

export default function Obras({ obras, movimientos, userRole, userData }) {
  const [editId, setEd] = useState(null);
  const [draft,  setDft] = useState({});
  const [newF,   setNewF] = useState(null);
  const canAdd = ['superadmin', 'admin_general'].includes(userRole);
  const fi     = 'w-full px-1 py-1 glass-panel border border-white/10 rounded outline-none text-slate-100 focus:border-orange-400 text-[10px]';

  const startEdit  = (o)  => { setEd(o.id); setDft({ ...o }); };
  const cancelEdit = ()   => { setEd(null);  setDft({}); };

  const saveEdit = async () => {
    const { id, ...fields } = draft;
    const original = obras.find(o => o.id === id) || {};
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'obras', id), fields);
    if (userRole === 'admin_general') {
      const cambios = {};
      Object.keys(fields).forEach(k => { if (String(fields[k]) !== String(original[k] ?? '')) cambios[k] = fields[k]; });
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'solicitudes'), {
        tipo: 'editar_entidad', entidad: 'obras', entidadId: id,
        entidadNombre: fields.nombre || original.nombre || '',
        snapshot_anterior: { nombre: original.nombre, estado: original.estado, direccion: original.direccion }, cambios,
        solicitanteNombre: userData?.nombre || 'Admin', solicitanteRol: userRole,
        estado: 'info', createdAt: new Date().toISOString(),
      });
    }
    cancelEdit();
  };

  const addItem = async () => {
    if (!newF?.nombre?.trim()) return;
    const data = {
      nombre: newF.nombre, tipoObra: newF.tipo || 'servicio',
      estado: newF.estado || 'En Ejecución', direccion: newF.direccion || '',
      createdAt: new Date().toISOString(),
    };
    const ref = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'obras'), data);
    if (userRole === 'admin_general') {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'solicitudes'), {
        tipo: 'crear_entidad', entidad: 'obras', entidadId: ref.id,
        entidadNombre: data.nombre, cambios: data,
        solicitanteNombre: userData?.nombre || 'Admin', solicitanteRol: userRole,
        estado: 'info', createdAt: new Date().toISOString(),
      });
    }
    setNewF(null);
  };

  const handleBorrar = async (o) => {
    if (userRole === 'superadmin') {
      if (window.confirm('¿Borrar obra?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'obras', o.id));
    } else {
      if (window.confirm('Se enviará una solicitud de borrado. ¿Continuar?')) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'solicitudes'), {
          tipo: 'borrar', entidad: 'obras', entidadId: o.id, entidadNombre: o.nombre || '',
          entidadSnapshot: { nombre: o.nombre, direccion: o.direccion, estado: o.estado },
          solicitanteRol: userRole, estado: 'pendiente', createdAt: new Date().toISOString(),
        });
        alert('✅ Solicitud de borrado enviada.');
      }
    }
  };

  // Mapear fechas de movimientos para mostrar en tabla
  const dateRange = (obraId) => {
    const fechas = movimientos
      .filter(m => m.obraId === obraId && m.tipo === 'Egreso')
      .map(m => m.fecha).filter(Boolean).sort();
    return { inicio: fechas[0] || '', fin: fechas[fechas.length - 1] || '' };
  };

  const nombres = [...new Set(obras.map(o => o.nombre).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const columns = [
    {
      key: 'tipoObra', label: 'Tipo', width: 'w-24',
      sortable: true, filterable: true, filterList: TIPOS,
      render: (val, row) => editId === row.id
        ? <SearchableSelect value={draft.tipoObra || 'servicio'} onChange={e => setDft(d => ({ ...d, tipoObra: e.target.value }))} className={`${fi} uppercase text-[10px]`}>
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </SearchableSelect>
        : <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">{val || 'servicio'}</span>,
    },
    {
      key: 'nombre', label: 'Nombre / Identificador',
      sortable: true, filterable: true, filterList: nombres,
      render: (val, row) => editId === row.id
        ? <input value={draft.nombre || ''} onChange={e => setDft(d => ({ ...d, nombre: e.target.value }))} className={fi} />
        : <span className="font-bold">{val}</span>,
    },
    {
      key: 'direccion', label: 'Dirección', filterable: true,
      render: (val, row) => editId === row.id
        ? <input value={draft.direccion || ''} onChange={e => setDft(d => ({ ...d, direccion: e.target.value }))} className={fi} />
        : <span>{val}</span>,
    },
    {
      key: 'porcentajeAvance', label: 'Avance', align: 'center', width: 'w-28',
      sortable: true,
      render: (val, row) => {
        const pct = editId === row.id ? (Number(draft.porcentajeAvance) || 0) : (Number(val) || 0);
        return editId === row.id
          ? <input type="number" value={draft.porcentajeAvance || 0} min="0" max="100"
              onChange={e => setDft(d => ({ ...d, porcentajeAvance: Number(e.target.value) }))}
              className={`${fi} w-16 text-center`} />
          : <div className="flex items-center gap-2 px-1">
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[10px] font-black text-orange-400 w-7 text-right">{pct}%</span>
            </div>;
      },
    },
    {
      key: 'fechaInicio', label: 'Inicio', align: 'center', width: 'w-24',
      render: (val, row) => {
        const { inicio } = dateRange(row.id);
        const fechaReal = row.fechaInicioReal || inicio;
        return editId === row.id
          ? <input type="date" value={draft.fechaInicioReal || fechaReal}
              onChange={e => setDft(d => ({ ...d, fechaInicioReal: e.target.value }))}
              className={`${fi} text-center text-[10px]`} />
          : <span className="text-[10px]">{fechaReal ? fechaReal.split('-').reverse().join('/') : '—'}</span>;
      },
    },
    {
      key: 'fechaFin', label: 'Fecha Fin', align: 'center', width: 'w-24',
      render: (val, row) => {
        const { fin } = dateRange(row.id);
        const fechaReal = row.fechaFinReal || fin;
        if (row.estado !== 'Finalizada' && editId !== row.id)
          return <span className="text-[10px] text-slate-600 italic">En curso</span>;
        return editId === row.id
          ? <input type="date" value={draft.fechaFinReal || fechaReal}
              onChange={e => setDft(d => ({ ...d, fechaFinReal: e.target.value }))}
              className={`${fi} text-center text-[10px]`} />
          : <span className="text-[10px]">{fechaReal ? fechaReal.split('-').reverse().join('/') : '—'}</span>;
      },
    },
    {
      key: 'estado', label: 'Estado',
      sortable: true, filterable: true, filterList: ESTADOS,
      render: (val, row) => editId === row.id
        ? <SearchableSelect value={draft.estado || ''} onChange={e => setDft(d => ({ ...d, estado: e.target.value }))} className={`${fi} text-[10px] uppercase`}>
            {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
          </SearchableSelect>
        : <span className={`text-[10px] uppercase font-black ${estadoColor(val)}`}>{val}</span>,
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
              <button onClick={() => startEdit(row)} title="Editar" className="p-1 rounded text-slate-500 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"><Pencil size={11} /></button>
              <button onClick={() => handleBorrar(row)} className={`p-1 rounded transition-colors ${userRole === 'superadmin' ? 'text-slate-400 hover:text-rose-500 hover:bg-rose-500/10' : 'text-amber-500/60 hover:text-amber-400 hover:bg-amber-500/10'}`} title={userRole === 'superadmin' ? 'Borrar' : 'Solicitar borrado'}><X size={11} /></button>
            </>
          )}
        </div>
      ),
    },
  ];

  const headerAction = canAdd && !newF && (
    <button onClick={() => setNewF({ tipo: '', nombre: '', estado: '', direccion: '' })}
      className="flex items-center gap-2 text-[10px] font-black text-orange-400 uppercase tracking-widest hover:text-orange-300 px-3 py-1.5 rounded-lg glass-panel hover:bg-orange-500/10 border border-white/10 transition-colors">
      <Plus size={11} /> <HardHat size={11} /> Nueva Obra
    </button>
  );

  return (
    <>
      {canAdd && newF && (
        <div className="bg-[#1a2235] border border-orange-500/30 rounded-xl p-3 mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-2">Nueva Obra</p>
          <div className="flex flex-wrap gap-2 items-end">
            <SearchableSelect value={newF.tipo || ''} onChange={e => setNewF(v => ({ ...v, tipo: e.target.value }))} className={`${fi} uppercase`} style={{ flex: '1 1 110px' }}>
              <option value="">Tipo</option>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </SearchableSelect>
            <input autoFocus value={newF.nombre || ''} onChange={e => setNewF(v => ({ ...v, nombre: e.target.value }))} placeholder="Nombre / ID *" className={fi} style={{ flex: '3 1 180px' }} />
            <SearchableSelect value={newF.estado || ''} onChange={e => setNewF(v => ({ ...v, estado: e.target.value }))} className={fi} style={{ flex: '1 1 120px' }}>
              <option value="">Estado</option>
              {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
            </SearchableSelect>
            <input value={newF.direccion || ''} onChange={e => setNewF(v => ({ ...v, direccion: e.target.value }))} placeholder="Dirección" className={fi} style={{ flex: '2 1 150px' }} />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={addItem} className="flex items-center gap-1 text-[10px] font-black text-emerald-400 uppercase tracking-widest px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 border border-emerald-500/30 transition-colors"><Check size={11} /> Guardar</button>
            <button onClick={() => setNewF(null)} className="flex items-center gap-1 darq-label px-3 py-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-400 border border-white/10 transition-colors"><X size={11} /> Cancelar</button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={obras}
        emptyMessage="No hay obras registradas."
        accentColor="orange"
        headerAction={headerAction}
        rowClassName={(row) => editId === row.id ? 'ring-1 ring-inset ring-orange-500/40 bg-orange-500/[0.07]' : ''}
      />
    </>
  );
}
