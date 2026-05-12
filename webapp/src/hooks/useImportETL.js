import { useState } from 'react';
import {
  collection, doc, addDoc, getDocs, writeBatch
} from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { processETL } from '../lib/etlProcessor';

/**
 * Hook que encapsula toda la lógica de importación ETL y borrado masivo.
 * Migrado desde App.jsx para descomprimir el componente raíz.
 *
 * @param {{ obras, proveedores, clientes, propiedades, contratos, movimientos, cotizacionBlue }} ctx
 * @returns {{ importText, setImportText, isImporting, importProgress, handleImport, handleClearMovimientos }}
 */
export function useImportETL(ctx) {
  const { obras, proveedores, clientes, propiedades, contratos, movimientos, cotizacionBlue } = ctx;

  const [importText, setImportText]       = useState('');
  const [isImporting, setIsImporting]     = useState(false);
  const [importProgress, setImportProgress] = useState(null); // {current, total, status, message?}
  const [clearProgress, setClearProgress] = useState(null);

  // ─────────────────────────────────────────────────────────────────
  // IMPORTADOR GENÉRICO — usa etlProcessor (v3.0)
  // ─────────────────────────────────────────────────────────────────
  const handleImport = async (type, onDone) => {
    if (!importText.trim()) return alert('Pegá los datos primero.');
    if (isImporting) return;
    setIsImporting(true);
    setImportProgress({ current: 0, total: 0, status: 'processing' });
    try {
      const etlCtx = { obras, proveedores, clientes, propiedades, contratos, movimientos, cotizacionBlue };
      const { rows, summary } = processETL(importText, type, etlCtx);

      const validRows = rows.filter(r => r.isValid && !r.isDuplicate);
      if (validRows.length === 0) {
        setImportProgress({ current: 0, total: 0, status: 'empty' });
        setTimeout(() => setImportProgress(null), 3000);
        setIsImporting(false);
        alert(`Sin filas válidas.\nDuplicados: ${summary.duplicados} | Errores: ${summary.errores}`);
        return;
      }

      const total = validRows.length;
      setImportProgress({ current: 0, total, status: 'importing' });

      // Cachés de entidades existentes
      const obrasCache   = new Map(obras.map(o    => [o.nombre.toLowerCase().trim(), o.id]));
      const propsCache   = new Map(propiedades.map(p => [p.nombre.toLowerCase().trim(), p.id]));
      const provsCache   = new Map(proveedores.map(p => [p.nombre.toLowerCase().trim(), p.id]));
      const cliCache     = new Map(clientes.map(c  => [c.nombre.toLowerCase().trim(), c.id]));

      // ── Detectar entidades nuevas ANTES de importar ──
      const obrasNuevas     = [...new Set(validRows.map(r => r.data.obraNueva).filter(Boolean))];
      const propiedadesNuevas = [...new Set(validRows.map(r => r.data.propiedadNueva).filter(Boolean))];

      if (obrasNuevas.length > 0) {
        setIsImporting(false);
        setImportProgress(null);
        const lista = obrasNuevas.map(n => `• "${n}"`).join('\n');
        alert(
          `⚠️ Se detectaron ${obrasNuevas.length} obra(s) que no existen en el sistema:\n\n` +
          lista +
          `\n\nPor favor creá o renombrá estas obras antes de importar.\n` +
          `(Esto evita duplicar obras que quizás ya existen con otro nombre.)`
        );
        return;
      }
      if (propiedadesNuevas.length > 0) {
        setIsImporting(false);
        setImportProgress(null);
        const lista = propiedadesNuevas.map(n => `• "${n}"`).join('\n');
        alert(
          `⚠️ Se detectaron ${propiedadesNuevas.length} propiedad(es) que no existen:\n\n` +
          lista +
          `\n\nCreálas primero en el módulo de Propiedades.`
        );
        return;
      }

      // Clientes y proveedores nuevos sí se crean automáticamente
      let importados = 0;
      const BATCH_SIZE = 400;
      for (let batchStart = 0; batchStart < validRows.length; batchStart += BATCH_SIZE) {
        const batchRows = validRows.slice(batchStart, batchStart + BATCH_SIZE);

        for (const row of batchRows) {
          const d = row.data;
          if (d.clienteNuevo && !cliCache.has(d.clienteNuevo.toLowerCase())) {
            const ref = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clientes'), {
              nombre: d.clienteNuevo, cuit: '', telefono: '', mail: '', createdAt: new Date().toISOString()
            });
            cliCache.set(d.clienteNuevo.toLowerCase(), ref.id);
          }
          if (d.proveedorNuevo && !provsCache.has(d.proveedorNuevo.toLowerCase())) {
            const ref = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'proveedores'), {
              nombre: d.proveedorNuevo, tipo: 'Varios', cuit: '', telefono: '', mail: '', createdAt: new Date().toISOString()
            });
            provsCache.set(d.proveedorNuevo.toLowerCase(), ref.id);
          }
        }

        // Crear movimientos en batch
        const batch = writeBatch(db);
        for (const row of batchRows) {
          const d = { ...row.data };
          if (d.obraNueva) { d.obraId = obrasCache.get(d.obraNueva.toLowerCase()) || d.obraId; }
          if (d.propiedadNueva) { d.propiedadId = propsCache.get(d.propiedadNueva.toLowerCase()) || d.propiedadId; }
          if (d.clienteNuevo) { d.clienteId = cliCache.get(d.clienteNuevo.toLowerCase()) || d.clienteId; }
          if (d.proveedorNuevo) { d.proveedorId = provsCache.get(d.proveedorNuevo.toLowerCase()) || d.proveedorId; }
          delete d.obraNueva; delete d.propiedadNueva; delete d.clienteNuevo; delete d.proveedorNuevo;

          const newRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'movimientos'));
          batch.set(newRef, { ...d, createdAt: new Date().toISOString() });
        }
        await batch.commit();
        importados += batchRows.length;
        setImportProgress({ current: importados, total, status: 'importing' });
      }

      setImportProgress({ current: importados, total, status: 'done' });
      setTimeout(() => setImportProgress(null), 4000);
      setImportText('');
      if (onDone) onDone();
      alert(`✅ Importación completada.\nMovimientos guardados: ${importados}\nDuplicados omitidos: ${summary.duplicados}\nErrores: ${summary.errores}`);
    } catch (err) {
      console.error('Error importación:', err);
      setImportProgress({ current: 0, total: 0, status: 'error', message: err.message });
      setTimeout(() => setImportProgress(null), 5000);
      alert('❌ Error durante la importación: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // BORRADO MASIVO
  // ─────────────────────────────────────────────────────────────────
  const handleClearMovimientos = async (areaFilter = null) => {
    console.log("Ejecutando handleClearMovimientos (Borrado por lotes)");
    setIsImporting(true);
    setClearProgress({ current: 0, total: 0, status: 'loading' });

    try {
      const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'movimientos');
      const snap = await getDocs(colRef);
      const filteredDocs = areaFilter
        ? snap.docs.filter(d => d.data().area === areaFilter)
        : snap.docs;
      console.log(`Documentos: ${filteredDocs.length}${areaFilter ? ' (area: ' + areaFilter + ')' : ' (todas)'}`);

      if (filteredDocs.length === 0) {
        setClearProgress({ current: 0, total: 0, status: 'empty' });
        setTimeout(() => setClearProgress(null), 2500);
        setIsImporting(false);
        return;
      }

      const total = filteredDocs.length;
      setClearProgress({ current: 0, total, status: 'deleting' });

      const BATCH_SIZE = 500;
      let deleted = 0;

      for (let i = 0; i < filteredDocs.length; i += BATCH_SIZE) {
        const chunk = filteredDocs.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(d => batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'movimientos', d.id)));
        await batch.commit();
        deleted += chunk.length;
        setClearProgress({ current: deleted, total, status: 'deleting' });
        console.log(`Lote borrado: ${deleted} / ${total}`);
      }

      console.log("Borrado finalizado con éxito.");
      setClearProgress({ current: deleted, total: deleted, status: 'done' });
      setTimeout(() => setClearProgress(null), 3000);
    } catch (e) {
      console.error("ERROR en handleClearMovimientos:", e);
      setClearProgress({ current: 0, total: 0, status: 'error', message: e.message });
      setTimeout(() => setClearProgress(null), 5000);
    } finally {
      setIsImporting(false);
    }
  };

  return {
    importText, setImportText,
    isImporting, setIsImporting,
    importProgress,
    clearProgress,
    handleImport,
    handleClearMovimientos,
  };
}
