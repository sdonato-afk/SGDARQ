/**
 * useDropbox.js
 *
 * Hook base para interacción con la API de Dropbox.
 * Lee credenciales de Firestore (_config/dropbox) y gestiona
 * el ciclo de vida del access_token (auto-refresh cada 4hs).
 *
 * Expone:
 *   upload(obraId, obraNombre, file, descripcion) → { path, name }
 *   createSharedLink(path) → url string
 *   listFolder(obraId, obraNombre) → [{ name, path_display, ... }]
 *   createFolder(obraId, obraNombre) → { path }
 *   deleteFile(path)
 */

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// ─── Singleton: config y token cacheados en memoria ───────────────────────────
let _cfg        = null;   // { refresh_token, app_key, app_secret }
let _accessToken = null;
let _tokenExpiry = 0;

const BASE_PATH = import.meta.env.VITE_DROPBOX_BASE_PATH || '/D+ARQ/Obras';

async function loadCfg() {
  if (_cfg) return _cfg;
  const snap = await getDoc(doc(db, '_config', 'dropbox'));
  if (!snap.exists()) throw new Error('Dropbox: config no encontrada en Firestore (_config/dropbox)');
  _cfg = snap.data();
  return _cfg;
}

async function getToken() {
  // Reutilizamos el token si todavía es válido (margen de 2 min)
  if (_accessToken && Date.now() < _tokenExpiry - 120_000) return _accessToken;

  const { refresh_token, app_key, app_secret } = await loadCfg();

  const resp = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token,
      client_id:     app_key,
      client_secret: app_secret,
    }),
  });

  const data = await resp.json();
  if (data.error) throw new Error(`Dropbox auth: ${data.error_description}`);

  _accessToken = data.access_token;
  _tokenExpiry = Date.now() + data.expires_in * 1000;
  return _accessToken;
}

// ─── Helper: llamadas a la API JSON de Dropbox ────────────────────────────────
async function dbxApi(endpoint, body) {
  const token = await getToken();
  const resp = await fetch(`https://api.dropboxapi.com/2/${endpoint}`, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error_summary || `Dropbox ${endpoint}: ${resp.status}`);
  }
  return resp.json();
}

// ─── Helper: upload de archivo binario ───────────────────────────────────────
async function dbxUpload(path, file) {
  const token = await getToken();
  const resp = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method:  'POST',
    headers: {
      'Authorization':   `Bearer ${token}`,
      'Content-Type':    'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({ path, mode: 'add', autorename: true, mute: false }),
    },
    body: file,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error_summary || 'Dropbox upload error');
  }
  return resp.json(); // { name, path_display, id, ... }
}

// ─── Helper: convertir URL a link de descarga directa ────────────────────────
function toDirectUrl(url) {
  return url
    .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
    .replace('?dl=0', '');
}

// ─── Helper: construir path de carpeta de obra ────────────────────────────────
function obraFolderPath(obraId, obraNombre) {
  const slug = (obraNombre || obraId)
    .normalize('NFC')
    .replace(/[^\w\sáéíóúÁÉÍÓÚñÑüÜ-]/g, '')
    .trim();
  return `${BASE_PATH}/${slug} (${obraId})`;
}

// ─── Operaciones públicas ─────────────────────────────────────────────────────
export async function dropboxCreateFolder(obraId, obraNombre) {
  const path = obraFolderPath(obraId, obraNombre);
  try {
    const res = await dbxApi('files/create_folder_v2', { path, autorename: false });
    return res.metadata ?? res;
  } catch (e) {
    // Si la carpeta ya existe no es un error
    if (e.message?.includes('conflict/folder')) return { path_display: path };
    throw e;
  }
}

export async function dropboxUpload(obraId, obraNombre, file, descripcion = '') {
  const fecha   = new Date().toISOString().slice(0, 10);
  const descSlug = descripcion.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // quitar tildes
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 40) || 'foto';
  const ext      = file.name.split('.').pop().toLowerCase();
  const fileName = `${fecha}_${descSlug}.${ext}`;
  const path     = `${obraFolderPath(obraId, obraNombre)}/${fileName}`;
  return dbxUpload(path, file); // devuelve { path_display, name, id }
}

export async function dropboxCreateSharedLink(path) {
  try {
    const data = await dbxApi('sharing/create_shared_link_with_settings', {
      path,
      settings: { requested_visibility: { '.tag': 'public' } },
    });
    return toDirectUrl(data.url);
  } catch (e) {
    if (e.message?.includes('shared_link_already_exists')) {
      const data = await dbxApi('sharing/list_shared_links', { path, direct_only: true });
      const url  = data.links?.[0]?.url;
      return url ? toDirectUrl(url) : null;
    }
    throw e;
  }
}

export async function dropboxListImages(obraId, obraNombre) {
  const path = obraFolderPath(obraId, obraNombre);
  const data = await dbxApi('files/list_folder', { path, recursive: false });
  return data.entries
    .filter(e => e['.tag'] === 'file' && /\.(jpg|jpeg|png|webp|heic|gif)$/i.test(e.name))
    .sort((a, b) => b.name.localeCompare(a.name)); // más recientes primero
}

export async function dropboxDeleteFile(path) {
  return dbxApi('files/delete_v2', { path });
}

// ─── Hook React ───────────────────────────────────────────────────────────────
export function useDropbox() {
  const [ready, setReady]   = useState(false);
  const [error, setError]   = useState(null);

  useEffect(() => {
    loadCfg()
      .then(() => setReady(true))
      .catch(e => setError(e.message));
  }, []);

  return {
    ready,
    error,
    createFolder: dropboxCreateFolder,
    upload:       dropboxUpload,
    createLink:   dropboxCreateSharedLink,
    listImages:   dropboxListImages,
    deleteFile:   dropboxDeleteFile,
  };
}
