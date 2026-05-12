import React, { useState } from 'react';
import { X, Pencil, Check, Plus, Building2 } from 'lucide-react';
import { doc, updateDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { DataTable } from '../modules/ui/DataTable';

const getEdif = (p) => {
  const raw = (p.edificio || '').trim().toUpperCase();
  if (raw) return raw;
  return (p.nombre || '').toUpperCase().startsWith('VO') ? 'VO' : 'MO';
};

export default function Propiedades({ propiedades, onAgregarPropiedad, userRole, userData }) {
  const [editId, setEd] = useState(null);
  const [draft,  setDft] = useState({});
  const fi = 'w-full px-1 py-1 glass-panel border border-white/10 rounded outline-none text-slate-100 focus:border-sky-400 text-[10px]';

  const startEdit  = (p) => { setEd(p.id); setDft({ ...p, edificio: getEdif(p) }); };
  const cancelEdit = ()  => { setEd(null); setDft({}); };

  const saveEdit = async () => {
    const { id, ...fields } = draft;
    const original = propiedades.find(p => p.id === id) || {};
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'propiedades', id), fields);
    if (userRole === 'admin_general') {
      const cambios = {};
      Object.keys(fields).forEach(k => { if (String(fields[k]) !== String(original[k] ?? '')) cambios[k] = fields[k]; });
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'solicitudes'), {
        tipo: 'editar_entidad', entidad: 'propiedades', entidadId: id,
        entidadNombre: fields.nombre || original.nombre || '',
        snapshot_anterior: { nombre: original.nombre, direccion: original.direccion, edificio: original.edificio }, cambios,
        solicitanteNombre: userData?.nombre || 'Admin', solicitanteRol: userRole,
        estado: 'info', createdAt: new Date().toISOString(),
      });
    }
    cancelEdit();
  };

  const handleBorrar = async (p) => {
    if (userRole === 'superadmin') {
      if (window.confirm('¿Borrar propiedad?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'propiedades', p.id));
    } else {
      if (window.confirm('Se enviará una solicitud de borrado. ¿Continuar?')) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'solicitudes'), {
          tipo: 'borrar', entidad: 'propiedades', entidadId: p.id, entidadNombre: p.nombre || '',
          entidadSnapshot: { nombre: p.nombre, direccion: p.direccion, edificio: p.edificio },
          solicitanteRol: userRole, estado: 'pendiente', createdAt: new Date().toISOString(),
        });
        alert('✅ Solicitud de borrado enviada.');
      }
    }
  };

  const nombres = [...new Set(propiedades.map(p => p.nombre).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  // Ordenar: propiedades reales primero, centros de costos después
  const data = [...propiedades].sort((a, b) =>
    a.esCentroCostos === b.esCentroCostos ? 0 : a.esCentroCostos ? 1 : -1
  );

  const columns = [
    {
      key: 'esCentroCostos', label: 'Tipo', align: 'center', width: 'w-28',
      filterable: true, filterList: ['Propiedad', 'Centro Costos'],
      render: (val) => val
        ? <span className="bg-white/5 text-slate-500 px-2 py-0.5 rounded-lg uppercase text-[10px] font-black">C. Costos</span>
        : <span className="bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-lg uppercase text-[10px] font-black">Propiedad</span>,
    },
    {
      key: 'edificio', label: 'Edificio', align: 'center', width: 'w-20',
      sortable: true, filterable: true, filterList: ['VO', 'MO'],
      render: (val, row) => editId === row.id
        ? <input list="prop-edif-opts" value={draft.edificio ?? ''} maxLength={10}
            onChange={e => setDft(d => ({ ...d, edificio: e.target.value.toUpperCase() }))}
            className={`${fi} text-center uppercase w-14`} />
        : <span className="font-black text-[10px] uppercase text-slate-300">{getEdif(row)}</span>,
    },
    {
      key: 'nombre', label: 'Propiedad',
      sortable: true, filterable: true, filterList: nombres,
      render: (val, row) => editId === row.id
        ? <input value={draft.nombre || ''} onChange={e => setDft(d => ({ ...d, nombre: e.target.value }))} className={fi} />
        : <span className="font-bold">{val}</span>,
    },
    {
      key: 'direccion', label: 'Dirección', filterable: true,
      render: (val, row) => editId === row.id
        ? <input value={draft.direccion || ''} onChange={e => setDft(d => ({ ...d, direccion: e.target.value }))} className={fi} />
        : <span className="text-[10px]">{val}</span>,
    },
    {
      key: 'partidaInmobiliaria', label: 'Partida Inmob.', align: 'center', filterable: true,
      render: (val, row) => editId === row.id
        ? <input value={draft.partidaInmobiliaria || ''} onChange={e => setDft(d => ({ ...d, partidaInmobiliaria: e.target.value }))} className={`${fi} text-center`} />
        : <span className="text-[10px] font-mono">{val}</span>,
    },
    {
      key: 'pisoDepto', label: 'Piso / Dpto / UF', align: 'center', width: 'w-32',
      render: (_, row) => editId === row.id
        ? <div className="flex items-center gap-1">
            <input value={draft.piso || ''} placeholder="Piso" onChange={e => setDft(d => ({ ...d, piso: e.target.value }))} className={`${fi} w-10 text-center`} />
            <span className="text-slate-500">/</span>
            <input value={draft.depto || ''} placeholder="Dpto" onChange={e => setDft(d => ({ ...d, depto: e.target.value }))} className={`${fi} w-10 text-center`} />
            <span className="text-slate-500">/</span>
            <input value={draft.unidadFuncional || ''} placeholder="UF" onChange={e => setDft(d => ({ ...d, unidadFuncional: e.target.value }))} className={`${fi} w-10 text-center`} />
          </div>
        : <span className="text-[10px] text-slate-400">{[row.piso, row.depto, row.unidadFuncional].filter(Boolean).join('/') || '—'}</span>,
    },
    {
      key: 'valorActualUSD', label: 'Valor Venta USD', align: 'right', width: 'w-36',
      sortable: true,
      render: (val, row) => editId === row.id
        ? <div className="flex items-center justify-end gap-1">
            <span className="text-slate-400 text-[10px]">u$d</span>
            <input type="number" value={draft.valorActualUSD || 0}
              onChange={e => setDft(d => ({ ...d, valorActualUSD: Number(e.target.value) }))}
              className={`${fi} w-24 text-right text-sky-400 font-black`} />
          </div>
        : <span className="text-sky-400 font-black text-[10px]">
            u$d {(Number(val) || 0).toLocaleString('es-AR')}
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
              <button onClick={() => startEdit(row)} title="Editar" className="p-1 rounded text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition-colors"><Pencil size={11} /></button>
              <button onClick={() => handleBorrar(row)} className={`p-1 rounded transition-colors ${userRole === 'superadmin' ? 'text-slate-400 hover:text-rose-500 hover:bg-rose-500/10' : 'text-amber-500/60 hover:text-amber-400 hover:bg-amber-500/10'}`} title={userRole === 'superadmin' ? 'Borrar' : 'Solicitar borrado'}><X size={11} /></button>
            </>
          )}
        </div>
      ),
    },
  ];

  const headerAction = onAgregarPropiedad && (
    <button
      onClick={() => onAgregarPropiedad({ nombre: '', direccion: '', piso: '', depto: '', unidadFuncional: '', partidaInmobiliaria: '', valorActualUSD: 0, esCentroCostos: false, estado: 'Alquilada' })}
      className="flex items-center gap-2 text-[10px] font-black text-sky-400 uppercase tracking-widest hover:text-sky-300 px-3 py-1.5 rounded-lg glass-panel hover:bg-sky-500/10 border border-white/10 transition-colors"
    >
      <Plus size={11} /> <Building2 size={11} /> Nueva Propiedad
    </button>
  );

  return (
    <>
      {/* Alerta Correa 3212 si falta */}
      {!propiedades.some(p => p.nombre?.includes('Correa 3212')) && onAgregarPropiedad && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-2 mb-3 flex justify-between items-center">
          <p className="text-[10px] font-black text-orange-400 uppercase">Falta agregar Correa 3212</p>
          <button
            onClick={() => onAgregarPropiedad({ nombre: 'Correa 3212', direccion: 'Correa 3212', piso: '-', depto: '-', unidadFuncional: '-', partidaInmobiliaria: '-', valorActualUSD: 0, esCentroCostos: false, estado: 'Alquilada' })}
            className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-[10px] font-bold transition-colors"
          >
            Agregar Rápido
          </button>
        </div>
      )}

      <datalist id="prop-edif-opts">
        <option value="VO" /><option value="MO" />
      </datalist>

      <DataTable
        columns={columns}
        data={data}
        emptyMessage="No hay propiedades registradas."
        accentColor="sky"
        headerAction={headerAction}
        rowClassName={(row) =>
          editId === row.id
            ? 'ring-1 ring-inset ring-sky-500/40 bg-sky-500/[0.07]'
            : row.esCentroCostos ? 'opacity-60' : ''
        }
      />
    </>
  );
}
