import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { X, CheckCircle, AlertTriangle, Info, Upload } from 'lucide-react';
import { processETL } from '../lib/etlProcessor';

export default function ETLModal({ config, onClose, context }) {
    const { isOpen, type, title } = config;
    const { db, appId } = context;

    const [importText, setImportText] = useState('');
    const [previewData, setPreviewData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handlePreview = () => {
        if (!importText.trim()) return alert("Pegá los datos tabulares primero.");
        setIsProcessing(true);
        setTimeout(() => {
            const result = processETL(importText, type, context);
            setPreviewData(result);
            setIsProcessing(false);
        }, 300); // UI feedback
    };

    const handleConfirmImport = async () => {
        if (!previewData || previewData.rows.length === 0) return;
        setIsSaving(true);
        try {
            const { rows } = previewData;
            const validRows = rows.filter(r => r.isValid && !r.isDuplicate);

            let collectionName = 'movimientos';
            if (type === 'obras' || type === 'maestra_obras') collectionName = 'obras';
            if (type === 'maestra_propiedades' || type === 'propiedades') collectionName = 'propiedades';
            if (type === 'maestra_contratos' || type === 'contratos') collectionName = 'contratos';
            if (type === 'maestra_proveedores' || type === 'proveedores') collectionName = 'proveedores';
            if (type === 'maestra_clientes' || type === 'clientes') collectionName = 'clientes';

            for (let row of validRows) {
                const newData = { ...row.data, createdAt: new Date().toISOString() };
                
                // Si es un movimiento y creó nuevas entidades en backend, el etlProcessor le asignó los IDs o advirtió
                // Si falta ID en la BD, tal vez tengamos que crearlo al vuelo aca
                if (type === 'movimientos_obras' && !row.data.obraId && row.data.entidad) {
                     const existObra = context.obras?.find(o => o.nombre.toLowerCase().trim() === row.data.entidad.toLowerCase().trim());
                     if (existObra) {
                         newData.obraId = existObra.id;
                     } else {
                         const newRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'obras'), {
                             nombre: row.data.entidad, estado: 'En Proceso', porcentajeAvance: 0, createdAt: new Date().toISOString()
                         });
                         newData.obraId = newRef.id;
                         if (context.obras) context.obras.push({ id: newRef.id, nombre: row.data.entidad });
                     }
                }
                
                if (type === 'movimientos_alquileres' && !row.data.propiedadId && row.data.propiedadNueva) {
                     const existProp = context.propiedades?.find(p => p.nombre.toLowerCase().trim() === row.data.propiedadNueva.toLowerCase().trim());
                     if (existProp) {
                         newData.propiedadId = existProp.id;
                     } else {
                         const nPropRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'propiedades'), {
                             nombre: row.data.propiedadNueva, createdAt: new Date().toISOString()
                         });
                         newData.propiedadId = nPropRef.id;
                         if (context.propiedades) context.propiedades.push({ id: nPropRef.id, nombre: row.data.propiedadNueva });
                     }
                 }
                
                if (type.startsWith('movimientos_') && row.data.proveedorNombre) {
                     const existProv = context.proveedores?.find(p => p.nombre.toLowerCase().trim() === row.data.proveedorNombre.toLowerCase().trim());
                     if (existProv) {
                         newData.proveedorId = existProv.id;
                     } else {
                         const nProvRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'proveedores'), {
                             nombre: row.data.proveedorNombre, tipo: newData.categoria || 'Varios', createdAt: new Date().toISOString()
                         });
                         newData.proveedorId = nProvRef.id;
                         if (context.proveedores) context.proveedores.push({ id: nProvRef.id, nombre: row.data.proveedorNombre });
                     }
                }
                if (type === 'movimientos_alquileres' && row.data.tipo === 'Ingreso' && row.data.proveedorNombre) {
                     const existCli = context.clientes?.find(c => c.nombre.toLowerCase().trim() === row.data.proveedorNombre.toLowerCase().trim());
                     if (existCli) {
                         newData.clienteId = existCli.id;
                     } else {
                         const nCliRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clientes'), {
                             nombre: row.data.proveedorNombre, createdAt: new Date().toISOString()
                         });
                         newData.clienteId = nCliRef.id;
                         if (context.clientes) context.clientes.push({ id: nCliRef.id, nombre: row.data.proveedorNombre });
                     }
                }
                // ── Contratos: crear inquilino si no existe, buscar propiedad ──
                if (type === 'maestra_contratos') {
                    // Buscar/crear inquilino
                    if (row.data.inquilinoNombre && !row.data.clienteId) {
                        const existCli = context.clientes.find(c => c.nombre.toLowerCase().trim() === row.data.inquilinoNombre.toLowerCase().trim());
                        if (existCli) {
                            newData.clienteId = existCli.id;
                        } else {
                            const nCliRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clientes'), {
                                nombre: row.data.inquilinoNombre, tipoCliente: 'Inquilino', createdAt: new Date().toISOString()
                            });
                            newData.clienteId = nCliRef.id;
                            // Add to context so next rows can find it
                            context.clientes.push({ id: nCliRef.id, nombre: row.data.inquilinoNombre });
                        }
                    }
                    // Buscar propiedad por nombre si no tiene ID
                    if (row.data.propiedadNombre && !row.data.propiedadId) {
                        const existProp = context.propiedades.find(p => p.nombre.toLowerCase().trim() === row.data.propiedadNombre.toLowerCase().trim());
                        if (existProp) {
                            newData.propiedadId = existProp.id;
                        }
                    }
                    // Limpiar campos de display antes de guardar
                    delete newData.inquilinoNombre;
                    delete newData.propiedadNombre;
                }

                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', collectionName), newData);
            }

            alert(`¡Importación exitosa! ${validRows.length} registros añadidos.`);
            onClose();
        } catch (e) {
            console.error(e);
            alert("Error al importar: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 glass-panel/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="glass-panel rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden border border-white/10 animate-fade-in flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-white/10 glass-card/50">
                    <div>
                        <h3 className="text-lg font-black text-white italic">{title || 'Importador Inteligente (ETL)'}</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                             Normalización automática y detección de duplicados
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-2 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                    {!previewData ? (
                        <>
                            <textarea 
                                value={importText}
                                onChange={(e) => setImportText(e.target.value)}
                                placeholder={`Pega aquí tus datos copiados desde Excel (tabulados)... \n\nColumnas esperadas varian según el tipo de importación.`}
                                className="w-full flex-1 min-h-[300px] bg-slate-950 border border-white/10 rounded-xl p-4 text-xs font-mono text-slate-300 outline-none focus:border-blue-500 transition-colors resize-none"
                            />
                            <div className="flex justify-end mt-2">
                                <button
                                    onClick={handlePreview}
                                    disabled={!importText.trim() || isProcessing}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Upload size={14} />
                                    {isProcessing ? 'Analizando...' : 'Previsualizar y Analizar'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            {/* Resumen */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                                    <CheckCircle size={20} className="text-emerald-400 mb-1" />
                                    <span className="text-2xl font-black text-emerald-400">{previewData.summary.procesadas}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Listas / Válidas</span>
                                </div>
                                <div className="bg-amber-900/30 border border-amber-500/30 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                                    <Info size={20} className="text-amber-400 mb-1" />
                                    <span className="text-2xl font-black text-amber-400">{previewData.summary.duplicados}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Duplicados (Ignorados)</span>
                                </div>
                                <div className="bg-rose-900/30 border border-rose-500/30 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                                    <AlertTriangle size={20} className="text-rose-400 mb-1" />
                                    <span className="text-2xl font-black text-rose-400">{previewData.summary.errores}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Errores de Formato</span>
                                </div>
                            </div>

                            {/* Detalle Tabulación */}
                            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden mt-4">
                                <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse min-w-max">
                                        <thead className="glass-panel sticky top-0 border-b border-white/10 z-10">
                                            <tr>
                                                <th className="px-3 py-2 text-[10px] font-black uppercase text-slate-400">Estado</th>
                                                <th className="px-3 py-2 text-[10px] font-black uppercase text-slate-400">Datos Limpios</th>
                                                <th className="px-3 py-2 text-[10px] font-black uppercase text-slate-400">Observaciones ETL</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                            {previewData.rows.map((row, idx) => (
                                                <tr key={idx} className={`${!row.isValid ? 'bg-rose-950/20' : row.isDuplicate ? 'bg-amber-950/20' : 'hover:glass-panel/30'} transition-colors`}>
                                                    <td className="px-3 py-2 text-xs">
                                                        {!row.isValid ? <span className="text-rose-400 font-bold">ERROR</span> :
                                                         row.isDuplicate ? <span className="text-amber-400 font-bold">DUPLICADO</span> :
                                                         <span className="text-emerald-400 font-bold">OK</span>}
                                                    </td>
                                                    <td className="px-3 py-2 text-[10px] font-mono text-slate-300">
                                                        {row.data.inquilinoNombre ? (
                                                            <span><strong className="text-blue-300">{row.data.inquilinoNombre}</strong> → <span className="text-amber-300">{row.data.propiedadNombre || row.data.nombre || ''}</span> {row.data.fechaInicio ? `| ${row.data.fechaInicio}` : ''} {row.data.monto ? `| $${Number(row.data.monto).toLocaleString()}` : ''}</span>
                                                        ) : (
                                                            <span>{Object.entries(row.data).filter(([k,v]) => v && k !== 'createdAt').slice(0, 6).map(([k,v]) => `${v}`).join(' | ')}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-[10px] text-slate-400">
                                                        {row.warnings.map((w,i)=><div key={i} className={w.toLowerCase().includes('vacío') ? 'text-amber-300' : 'text-blue-300'}>{w}</div>)}
                                                        {row.warnings.length===0 && "-"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 glass-card/30 flex justify-between items-center">
                    {previewData && (
                        <button onClick={() => setPreviewData(null)} disabled={isSaving} className="text-xs font-bold text-slate-400 hover:text-white transition-colors">
                            ← Volver a pegar
                        </button>
                    )}
                    <div className="flex gap-2 ml-auto">
                        <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-lg transition-colors">
                            Cancelar
                        </button>
                        {previewData && (
                            <button 
                                onClick={handleConfirmImport}
                                disabled={isSaving || previewData.rows.filter(r=>r.isValid && !r.isDuplicate).length === 0}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-all shadow-lg"
                            >
                                {isSaving ? 'Guardando...' : `Confirmar Inserción (${previewData.rows.filter(r=>r.isValid && !r.isDuplicate).length})`}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
