/**
 * useDropboxFotos.js
 *
 * Hook de alto nivel para gestión de fotos de obra via Dropbox.
 * Combina la API de Dropbox con la colección Firestore `fotos`.
 *
 * Flujos:
 *   subirFoto()           → upload a Dropbox → shared link → guarda en Firestore
 *   sincronizarDesdeDropbox() → lee carpeta → registra fotos nuevas en Firestore
 *   eliminarFoto()        → borra en Firestore + en Dropbox
 */

import { useState } from 'react';
import {
  collection, doc, addDoc, deleteDoc, query, getDocs
} from 'firebase/firestore';
import { db, OBRAS_COL } from '../config/firebase';
import {
  dropboxUpload,
  dropboxCreateSharedLink,
  dropboxListImages,
  dropboxDeleteFile,
  dropboxCreateFolder,
} from './useDropbox';

export function useDropboxFotos(obraId, obraNombre) {
  const [uploading, setUploading]     = useState(false);
  const [syncing, setSyncing]         = useState(false);
  const [uploadProgress, setProgress] = useState(null); // { current, total }
  const [syncResult, setSyncResult]   = useState(null); // { added, skipped }

  /**
   * Sube una foto al Dropbox de la obra y la registra en Firestore.
   * @param {File} file — archivo de imagen
   * @param {string} descripcion — texto descriptivo (se usa para el nombre de archivo)
   * @returns {string} url pública del shared link
   */
  const subirFoto = async (file, descripcion = '') => {
    if (!obraId || !obraNombre) throw new Error('obraId y obraNombre son requeridos');
    setUploading(true);
    try {
      // 1. Asegurar que la carpeta existe
      await dropboxCreateFolder(obraId, obraNombre);

      // 2. Subir archivo a Dropbox
      const meta = await dropboxUpload(obraId, obraNombre, file, descripcion);

      // 3. Crear shared link público
      const url = await dropboxCreateSharedLink(meta.path_display);

      // 4. Guardar en Firestore
      await addDoc(collection(db, OBRAS_COL, obraId, 'fotos'), {
        fecha:        new Date().toISOString().slice(0, 10),
        descripcion:  descripcion || meta.name,
        url,
        dropbox_path: meta.path_display,
        subida_por:   'admin',
        createdAt:    new Date().toISOString(),
      });

      return url;
    } finally {
      setUploading(false);
    }
  };

  /**
   * Sube múltiples fotos en secuencia.
   */
  const subirFotos = async (files, descripcion = '') => {
    setUploading(true);
    setProgress({ current: 0, total: files.length });
    const urls = [];
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress({ current: i + 1, total: files.length });
        const url = await subirFoto(files[i], descripcion || files[i].name.replace(/\.[^.]+$/, ''));
        urls.push(url);
      }
    } finally {
      setUploading(false);
      setProgress(null);
    }
    return urls;
  };

  /**
   * Escanea la carpeta de Dropbox de la obra y registra en Firestore
   * todas las imágenes que todavía no estén registradas.
   */
  const sincronizarDesdeDropbox = async () => {
    if (!obraId || !obraNombre) throw new Error('obraId y obraNombre son requeridos');
    setSyncing(true);
    setSyncResult(null);

    try {
      // 1. Leer imágenes en Dropbox
      const dbxImages = await dropboxListImages(obraId, obraNombre);

      // 2. Leer fotos ya registradas en Firestore (para detectar duplicados por path)
      const q    = query(collection(db, OBRAS_COL, obraId, 'fotos'));
      const snap = await getDocs(q);
      const registeredPaths = new Set(snap.docs.map(d => d.data().dropbox_path).filter(Boolean));

      // 3. Registrar solo las nuevas
      let added = 0;
      let skipped = 0;

      for (const img of dbxImages) {
        if (registeredPaths.has(img.path_display)) {
          skipped++;
          continue;
        }

        // Obtener/crear shared link
        const url = await dropboxCreateSharedLink(img.path_display);

        // Extraer fecha del nombre de archivo (formato YYYY-MM-DD_...)
        const dateMatch = img.name.match(/^(\d{4}-\d{2}-\d{2})/);
        const fecha = dateMatch ? dateMatch[1] : img.server_modified?.slice(0, 10) || new Date().toISOString().slice(0, 10);

        await addDoc(collection(db, OBRAS_COL, obraId, 'fotos'), {
          fecha,
          descripcion:  img.name.replace(/^\d{4}-\d{2}-\d{2}_/, '').replace(/\.[^.]+$/, '').replace(/_/g, ' '),
          url,
          dropbox_path: img.path_display,
          subida_por:   'sync',
          createdAt:    new Date().toISOString(),
        });

        added++;
      }

      const result = { added, skipped, total: dbxImages.length };
      setSyncResult(result);
      return result;
    } finally {
      setSyncing(false);
    }
  };

  /**
   * Elimina una foto de Firestore y de Dropbox.
   */
  const eliminarFoto = async (fotoId, dropboxPath) => {
    await deleteDoc(doc(db, OBRAS_COL, obraId, 'fotos', fotoId));
    if (dropboxPath) {
      await dropboxDeleteFile(dropboxPath).catch(() => {}); // silencioso si ya no existe
    }
  };

  /**
   * Crea la carpeta en Dropbox cuando se registra una obra nueva.
   */
  const inicializarCarpeta = () => dropboxCreateFolder(obraId, obraNombre);

  return {
    uploading,
    syncing,
    uploadProgress,
    syncResult,
    subirFoto,
    subirFotos,
    sincronizarDesdeDropbox,
    eliminarFoto,
    inicializarCarpeta,
  };
}
