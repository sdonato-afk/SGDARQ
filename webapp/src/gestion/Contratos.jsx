import React, { useState } from 'react';
import { X, Pencil, Check, Plus, FileSignature } from 'lucide-react';
import { SearchableSelect } from '@darq/ui';
import { doc, updateDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { calcularFechasContrato } from '../helpers/financieros';
import { DataTable } from '../modules/ui/DataTable';

const isVigente = (c) => {
  const hoy = new Date();
  return new Date(c.fechaInicio) <= hoy && new Date(c.fechaFin) >= hoy;
};

const fmt = (dateStr) => dateStr ? dateStr.split('-').reverse().join('/') : '—';

export default function Contratos({ contratos, propiedades, clientes, onNuevoContrato, userRole, userData }) {
  const [editId, setEd] = useState(null);
  const [draft,  setDft] = useState({});
  const fi = 'w-full px-1 py-1 glass-panel border border-white/10 rounded outline-none text-slate-100 focus:border-amber-400 text-[10px]';

  const startEdit  = (c) => { setEd(c.id); setDft({ ...c }); };
  const cancelEdit = ()  => { setEd(null); setDft({}); };

  const saveEdit = async () => {
    const { id, ...fields } = draft;
    const original = contratos.find(c => c.id === id) || {};
    if (draft.fechaInicio !== original.fechaInicio) {
      const { dtProx, dtFin } = calcularFechasContrato(draft.fechaInicio, draft.periodoActualizacion, draft.duracionMeses);
      fields.proximaActualizacion = dtProx;
      fields.fechaFin = dtFin;
    }
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'contratos', id), fields);
    if (userRole === 'admin_general') {
      const cambios = {};
      Object.keys(fields).forEach(k => { if (String(fields[k]) !== String(original[k] ?? '')) cambios[k] = fields[k]; });
      const prop = propiedades.find(p => p.id === (fields.propiedadId || original.propiedadId));
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'solicitudes'), {
        tipo: 'editar_entidad', entidad: 'contratos', entidadId: id,
        entidadNombre: prop?.nombre || 'Contrato',
        snapshot_anterior: { propiedad: prop?.nombre, montoAlquiler: original.montoAlquiler, fechaInicio: original.fechaInicio, fechaFin: original.fechaFin }, cambios,
        solicitanteNombre: userData?.nombre || 'Admin', solicitanteRol: userRole,
        estado: 'info', createdAt: new Date().toISOString(),
      });
    }
    cancelEdit();
  };

  const handleBorrar = async (c) => {
    const prop = propiedades.find(p => p.id === c.propiedadId);
    if (userRole === 'superadmin') {
      if (window.confirm('¿Borrar contrato?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'contratos', c.id));
    } else {
      if (window.confirm('Se enviará una solicitud de borrado. ¿Continuar?')) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'solicitudes'), {
          tipo: 'borrar', entidad: 'contratos', entidadId: c.id, entidadNombre: prop?.nombre || 'Contrato',
          entidadSnapshot: { propiedad: prop?.nombre, fechaInicio: c.fechaInicio, fechaFin: c.fechaFin },
          solicitanteRol: userRole, estado: 'pendiente', createdAt: new Date().toISOString(),
        });
        alert('✅ Solicitud de borrado enviada.');
      }
    }
  };

  const propNombres = [...new Set(propiedades.map(p => p.nombre).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const cliNombres  = [...new Set(clientes.map(c => c.nombre).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  // Enriquecer data para que DataTable pueda filtrar/ordenar por nombre resuelto
  const data = contratos.map(c => ({
    ...c,
    _propNombre: propiedades.find(p => p.id === c.propiedadId)?.nombre || '—',
    _cliNombre:  clientes.find(cl => cl.id === c.clienteId)?.nombre || '—',
    _vigente:    isVigente(c),
  }));

  const columns = [
    {
      key: '_propNombre', label: 'Propiedad',
      sortable: true, filterable: true, filterList: propNombres,
      render: (val, row) => editId === row.id
        ? <SearchableSelect value={draft.propiedadId || ''} onChange={e => setDft(d => ({ ...d, propiedadId: e.target.value }))} className={fi}>
            <option value="">— Propiedad —</option>
            {propiedades.filter(p => !p.esCentroCostos).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </SearchableSelect>
        : <span title={propiedades.find(p => p.id === row.propiedadId)?.direccion || ''}>{val}</span>,
    },
    {
      key: '_cliNombre', label: 'Inquilino',
      sortable: true, filterable: true, filterList: cliNombres,
      render: (val, row) => editId === row.id
        ? <SearchableSelect value={draft.clienteId || ''} onChange={e => setDft(d => ({ ...d, clienteId: e.target.value }))} className={fi}>
            <option value="">— Inquilino —</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido || ''}</option>)}
          </SearchableSelect>
        : <span className="text-[10px]">{val}</span>,
    },
    {
      key: 'montoAlquiler', label: 'Monto Alquiler', align: 'right', width: 'w-36',
      sortable: true,
      render: (val, row) => editId === row.id
        ? <input type="number" value={draft.montoAlquiler || ''} onChange={e => setDft(d => ({ ...d, montoAlquiler: parseFloat(e.target.value) || 0 }))} className={`${fi} text-right text-emerald-400 font-black`} placeholder="0" />
        : <span className="text-emerald-400 font-black">{(Number(val) || 0).toLocaleString('es-AR')}</span>,
    },
    {
      key: 'moneda', label: 'Mon.', align: 'center', width: 'w-20',
      filterable: true, filterList: ['ARS', 'USD'],
      render: (val, row) => editId === row.id
        ? <SearchableSelect value={draft.moneda || 'ARS'} onChange={e => setDft(d => ({ ...d, moneda: e.target.value }))} className={`${fi} text-center text-[10px] font-black`}>
            <option value="ARS">ARS</option><option value="USD">USD</option>
          </SearchableSelect>
        : <span className="text-[10px] font-black">{val || 'ARS'}</span>,
    },
    {
      key: 'fechaInicio', label: 'Inicio', align: 'center', width: 'w-24',
      sortable: true,
      render: (val, row) => editId === row.id
        ? <input type="date" value={draft.fechaInicio || ''} onChange={e => setDft(d => ({ ...d, fechaInicio: e.target.value }))} className={`${fi} text-center text-[10px]`} />
        : <span className="text-[10px]">{fmt(val)}</span>,
    },
    {
      key: 'proximaActualizacion', label: 'Próx. Act.', align: 'center', width: 'w-28',
      render: (val, row) => editId === row.id
        ? <input type="date" value={draft.proximaActualizacion || ''} onChange={e => setDft(d => ({ ...d, proximaActualizacion: e.target.value }))} className={`${fi} text-amber-400 font-black text-center text-[10px]`} />
        : <div className="flex items-center gap-1 justify-center">
            <span className="text-amber-400 font-black text-[10px]">{fmt(val)}</span>
            {row.periodoActualizacion && <span className="text-[10px] text-slate-500">({row.periodoActualizacion}m)</span>}
          </div>,
    },
    {
      key: 'fechaFin', label: 'Vencimiento', align: 'center', width: 'w-24',
      sortable: true,
      render: (val, row) => {
        const vigente = row._vigente;
        return editId === row.id
          ? <input type="date" value={draft.fechaFin || ''} onChange={e => setDft(d => ({ ...d, fechaFin: e.target.value }))} className={`${fi} text-center text-[10px]`} />
          : <span className={`text-[10px] font-bold ${vigente ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(val)}</span>;
      },
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
              <button onClick={() => startEdit(row)} title="Editar" className="p-1 rounded text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"><Pencil size={11} /></button>
              <button onClick={() => handleBorrar(row)} className={`p-1 rounded transition-colors ${userRole === 'superadmin' ? 'text-slate-400 hover:text-rose-500 hover:bg-rose-500/10' : 'text-amber-500/60 hover:text-amber-400 hover:bg-amber-500/10'}`} title={userRole === 'superadmin' ? 'Borrar' : 'Solicitar borrado'}><X size={11} /></button>
            </>
          )}
        </div>
      ),
    },
  ];

  const headerAction = onNuevoContrato && (
    <button onClick={onNuevoContrato}
      className="flex items-center gap-2 text-[10px] font-black text-amber-400 uppercase tracking-widest hover:text-amber-300 px-3 py-1.5 rounded-lg glass-panel hover:bg-amber-500/10 border border-white/10 transition-colors">
      <Plus size={11} /> <FileSignature size={11} /> Nuevo Contrato
    </button>
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      emptyMessage="No hay contratos registrados."
      accentColor="amber"
      headerAction={headerAction}
      rowClassName={(row) =>
        editId === row.id
          ? 'ring-1 ring-inset ring-amber-500/40 bg-amber-500/[0.07]'
          : !row._vigente ? 'opacity-50' : ''
      }
    />
  );
}
