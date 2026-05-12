import React, { useState, useMemo } from 'react';
import { X, Check, Pencil, Download, History } from 'lucide-react';
import { useToast } from '../modules/ui/Toast';
import { collection, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { getColDefs } from './asientos/asientosColumns';
import { renderAsientoCell } from './asientos/AsientosCellRenderer';
import { ColumnFilter, useTableFilter } from '@darq/ui';
import ModalMovimiento from '../modules/finanzas/modals/ModalMovimiento';
import PanelHistorial from '../modules/finanzas/modals/PanelHistorial';
import { areas as AREAS_LIST, directores as DIRECTORES_LIST, cajas as CAJAS_LIST } from '../helpers/financieros';

const ROWS_PER_PAGE = 100;

/**
 * Tab Asientos — libro contable de movimientos.
 * - Filtros por columna con ColumnFilter (dropdown multi-select + sort)
 * - Edición al clickear la fila → abre ModalMovimiento (con taxonomía en cascada)
 * - Solo usuarios con rol != 'director' pueden editar
 */
export default function Asientos({
  movimientos, obras, propiedades, clientes, proveedores, contratos,
  ingresosObrasList, cotizacionBlue,
  isImporting, setIsImporting,
  userRole, canEdit, canDelete, isReadOnly
}) {
  const [bdAreaFilter, setBdAreaFilter] = useState('Todas');
  const [asientosPage,  setAsientosPage]  = useState(0);
  const [confirmingId,  setConfirmingId]  = useState(null);
  const [editingMov,    setEditingMov]    = useState(null);  // movimiento que se está editando
  const [isHistorialOpen, setIsHistorialOpen] = useState(false);
  const toast = useToast();

  const { filters, sort, setFilter, setSort, clearAll, filterRows, sortRows, hasActiveFilters, activeCount } = useTableFilter();

  const canEditRow = userRole !== 'director';

  // ── Helpers de lookup ──
  const obraNameFn    = (id) => obras.find(o => o.id === id)?.nombre || '';
  const propNameFn    = (id) => propiedades.find(p => p.id === id)?.nombre || '';
  const clienteNameFn = (id) => clientes.find(c => c.id === id)?.nombre || '';
  const provNameFn    = (id) => proveedores.find(p => p.id === id)?.nombre || '';
  const usdEquivFn    = (m)  => {
    const mt = Number(m.monto) || 0;
    if (m.moneda === 'USD') return mt;
    const tc = Number(m.cotizacionHistorica || m.tipoCambioReferencia) || cotizacionBlue;
    return mt / tc;
  };

  // ── Columnas dinámicas ──
  const colDefs = getColDefs(bdAreaFilter);

  // ── valueGetters por colKey para ColumnFilter ──
  const valueGetters = useMemo(() => ({
    fecha:           m => m.fecha || '',
    area:            m => m.area || '',
    tipo:            m => m.tipo || '',
    moneda:          m => m.moneda || '',
    monto:           m => String(m.monto || ''),
    caja:            m => m.caja || '',
    categoriaEgreso: m => m.categoriaEgreso || m.tipoObraIngreso || '',
    rubro:           m => m.rubro || '',
    concepto:        m => m.concepto || '',
    obraId:          m => obraNameFn(m.obraId),
    tipoObraIngreso: m => m.tipoObraIngreso || '',
    propiedadId:     m => propNameFn(m.propiedadId),
    clienteId:       m => clienteNameFn(m.clienteId),
    directorId:      m => m.directorId || '',
    proveedorId:     m => provNameFn(m.proveedorId),
    tc:              m => String(m.tipoCambioReferencia || ''),
    usdEq:           m => usdEquivFn(m).toFixed(2),
  }), [obras, propiedades, clientes, proveedores, cotizacionBlue]); // eslint-disable-line

  // ── Contexto compartido para el renderer ──
  const lookups = { obraNameFn, propNameFn, clienteNameFn, provNameFn, usdEquivFn };

  // ── Datos filtrados y ordenados ──
  const areaFiltered = movimientos.filter(m =>
    bdAreaFilter === 'Todas' || m.area === bdAreaFilter
  );

  const filtered = filterRows(areaFiltered, valueGetters);

  const asientosData = sortRows(
    filtered,
    valueGetters,
    (a, b) => new Date(b.fecha) - new Date(a.fecha)
  );

  const totalPages    = Math.ceil(asientosData.length / ROWS_PER_PAGE);
  const paginatedData = asientosData.slice(asientosPage * ROWS_PER_PAGE, (asientosPage + 1) * ROWS_PER_PAGE);

  // ── Borrado de asiento ──
  const handleDelete = async (m) => {
    if (userRole === 'superadmin') {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'movimientos', m.id));
      toast.success('Asiento eliminado');
    } else {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'solicitudes'), {
        tipo: 'borrar', movimientoId: m.id,
        movimientoSnapshot: { fecha: m.fecha, area: m.area, tipo: m.tipo, moneda: m.moneda, monto: m.monto, concepto: m.concepto || '' },
        solicitanteRol: userRole, estado: 'pendiente', createdAt: new Date().toISOString(),
      });
      toast.success('Solicitud de borrado enviada');
    }
    setConfirmingId(null);
  };

  // ── Exportar a CSV ──
  const handleExportCSV = async () => {
    if (asientosData.length === 0) return toast.info('No hay asientos para exportar.');
    
    const headers = colDefs.map(c => c.label).join(',');
    const rows = asientosData.map(m => {
      return colDefs.map(c => {
        let val = valueGetters[c.key](m);
        if (typeof val === 'string') {
          val = val.replace(/"/g, '""');
          if (val.includes(',') || val.includes('\n')) val = `"${val}"`;
        }
        return val;
      }).join(',');
    });
    
    const csvContent = '\ufeff' + [headers, ...rows].join('\n');
    const fileName = `asientos_export_${new Date().toISOString().slice(0,10)}.csv`;

    try {
      if ('showSaveFilePicker' in window) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: 'Archivo CSV', accept: { 'text/csv': ['.csv'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(csvContent);
        await writable.close();
        toast.success('Archivo guardado correctamente');
      } else {
        // Fallback for older browsers
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error al guardar:', err);
        toast.error('Error al guardar el archivo');
      }
    }
  };

  // ── Render ──
  return (
    <>
      <div className="space-y-4 animate-in fade-in duration-500">

        {/* Selector de área + contador + limpiar filtros */}
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
            {['Todas', 'Obras', 'Alquileres', 'Oficina', 'Directorio', 'Tesoreria', 'Sistema'].map(a => (
              <button key={a} onClick={() => { setBdAreaFilter(a); setAsientosPage(0); }}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  bdAreaFilter === a
                    ? a === 'Sistema' ? 'bg-violet-700 text-white' : 'bg-blue-600 text-white'
                    : 'text-slate-500 hover:text-white'
                }`}>
                {a}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
            {asientosData.length} asientos
          </span>
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-1.5 ml-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-all">
            <Download size={10} /> CSV
          </button>
          {userRole !== 'invitado' && (
            <button onClick={() => setIsHistorialOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 ml-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/10 transition-all">
              <History size={10} /> Historial
            </button>
          )}
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-400 border border-rose-500/30 hover:bg-rose-500/10 transition-all"
            >
              <X size={10} />
              Limpiar {activeCount} filtro{activeCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* Tabla */}
        <div className="bg-[#1a2235] rounded-2xl border border-white/10 shadow-xl overflow-hidden flex flex-col" style={{ height: '75vh' }}>
          <div className="overflow-auto table-scrollbar flex-1">
            <table className="w-full text-left border-collapse text-[10px]"
              style={{ minWidth: colDefs.reduce((s, c) => s + c.w, 0) + 40 }}>

              <thead className="sticky top-0 z-10 bg-[#1a2235]/95 backdrop-blur-sm border-b border-white/10">
                <tr className="border-b border-white/10 text-slate-500 uppercase font-black tracking-widest">
                  {colDefs.map(c => (
                    <th key={c.key} className="p-2 border-r border-white/10" style={{ minWidth: c.w, width: c.w }}>
                      <ColumnFilter
                        label={c.label}
                        colKey={c.key}
                        rows={areaFiltered}
                        valueGetter={valueGetters[c.key]}
                        filterState={filters[c.key]}
                        onFilterChange={setFilter}
                        sortDir={sort.key === c.key ? sort.dir : null}
                        onSortChange={setSort}
                      />
                    </th>
                  ))}
                  <th className="p-2 w-20" />
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {paginatedData.map(m => (
                  <tr
                    key={m.id}
                    className={`font-bold text-slate-300 transition-colors ${
                      canEditRow
                        ? 'hover:bg-blue-500/10 cursor-pointer'
                        : 'hover:bg-white/[0.02]'
                    }`}
                    onClick={canEditRow ? () => setEditingMov(m) : undefined}
                  >
                    {colDefs.map(col => (
                      <td key={col.key}
                        className={`p-1 border-r border-white/5 ${col.key === 'monto' || col.key === 'usdEq' ? 'text-right' : ''}`}>
                        {renderAsientoCell({ m, col, lookups })}
                      </td>
                    ))}

                    {/* Columna de acciones */}
                    <td className="p-1 text-center w-20" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {/* Botón editar — solo visible para no-directores */}
                        {canEditRow && (
                          <button
                            onClick={() => setEditingMov(m)}
                            className="p-1 rounded text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                            title="Editar asiento"
                          >
                            <Pencil size={10} />
                          </button>
                        )}

                        {/* Botón borrar */}
                        {userRole !== 'director' && (
                          confirmingId === m.id ? (
                            <div className="flex items-center justify-center gap-0.5">
                              <button
                                onClick={() => handleDelete(m)}
                                className="p-1 rounded text-rose-400 hover:bg-rose-500/20 transition-colors"
                                title="Confirmar borrado"
                              >
                                <Check size={10} />
                              </button>
                              <button onClick={() => setConfirmingId(null)}
                                className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-white/10 transition-colors"
                                title="Cancelar">
                                <X size={10} />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmingId(m.id)}
                              className={`p-1 rounded transition-colors ${
                                userRole === 'superadmin'
                                  ? 'text-slate-400 hover:text-rose-500 hover:bg-rose-500/10'
                                  : 'text-amber-500/60 hover:text-amber-400 hover:bg-amber-500/10'
                              }`}
                              title={userRole === 'superadmin' ? 'Borrar asiento' : 'Solicitar borrado'}>
                              <X size={10} />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 bg-[#1a2235] border border-white/10 rounded-xl">
            <span className="darq-label">
              {asientosPage * ROWS_PER_PAGE + 1}–{Math.min((asientosPage + 1) * ROWS_PER_PAGE, asientosData.length)} de {asientosData.length}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setAsientosPage(0)} disabled={asientosPage === 0}
                className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-white/5 transition-colors">⟨⟨</button>
              <button onClick={() => setAsientosPage(p => Math.max(0, p - 1))} disabled={asientosPage === 0}
                className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-white/5 transition-colors">⟨ Anterior</button>
              <span className="px-4 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-black">{asientosPage + 1} / {totalPages}</span>
              <button onClick={() => setAsientosPage(p => Math.min(totalPages - 1, p + 1))} disabled={asientosPage >= totalPages - 1}
                className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-white/5 transition-colors">Siguiente ⟩</button>
              <button onClick={() => setAsientosPage(totalPages - 1)} disabled={asientosPage >= totalPages - 1}
                className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-white/5 transition-colors">⟩⟩</button>
            </div>
          </div>
        )}

        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
          {canEditRow
            ? 'Click en fila para editar · Taxonomía enforced en cascada · Filtros multi-valor por columna'
            : 'Modo solo lectura · Filtros multi-valor por columna'}
        </p>
      </div>

      {/* Modal de edición */}
      <ModalMovimiento
        open={!!editingMov}
        onClose={() => setEditingMov(null)}
        initialData={editingMov}
        movimientoId={editingMov?.id}
        areas={AREAS_LIST}
        areaPermitida={null}
        cajas={CAJAS_LIST}
        directores={DIRECTORES_LIST}
        proveedores={proveedores}
        obras={obras}
        propiedades={propiedades}
        clientes={clientes}
        contratos={contratos || []}
        cotizacionBlue={cotizacionBlue}
      />

      {/* Historial Panel */}
      <PanelHistorial 
        open={isHistorialOpen} 
        onClose={() => setIsHistorialOpen(false)} 
      />
    </>
  );
}
