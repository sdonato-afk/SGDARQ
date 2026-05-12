import React, { useState, useRef, useEffect } from 'react';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle,
  RefreshCw, Building2, Tag, Zap, X
} from 'lucide-react';
import { doc, updateDoc, collection } from 'firebase/firestore';
import { SearchableSelect } from '@darq/ui';
import { db, appId } from '../../config/firebase';
import { parseARCA, detectARCAMeta } from '../helpers/arcaParser';
import { useComprobantes } from '../hooks/useComprobantes';

const EMPRESAS = ['AMECON', 'BLUE ELEPHANT'];

// CUITs oficiales de las empresas — siempre deben estar correctamente mapeados
const CUITS_CONOCIDOS = {
  '30715128140': 'BLUE ELEPHANT',
  '30694337194': 'AMECON',
};

export default function ImportARCA() {
  const [archivo,     setArchivo]     = useState(null);
  const [meta,        setMeta]        = useState(null);   // { tipoImport, cuit, titleText }
  const [empresa,     setEmpresa]     = useState(null);   // resuelta (auto o manual)
  const [tipoImport,  setTipoImport]  = useState(null);   // resuelta (auto o manual)
  const [guardarCuit, setGuardarCuit] = useState(true);   // checkbox "recordar CUIT"
  const [preview,     setPreview]     = useState(null);
  const [estado,      setEstado]      = useState('idle'); // idle|detecting|confirming_meta|parsing|confirming|importing|done|error
  const [mensaje,     setMensaje]     = useState('');
  const fileRef = useRef();

  const { guardarBatch, limpiarImportacion, limpiarEmpresa, configContable, guardarConfig } = useComprobantes();

  // Mapa CUIT → empresa guardado en Firestore config
  const cuitMap = configContable?.cuitEmpresaMap || {};

  // Sincronizar CUITs conocidos: reemplaza el mapa completo en Firestore
  // Usa updateDoc para REEMPLAZAR el campo (no merge que preserva claves viejas)
  useEffect(() => {
    if (!configContable) return;
    const mapaActual = configContable.cuitEmpresaMap || {};
    const necesitaCorreccion =
      Object.entries(CUITS_CONOCIDOS).some(([c, e]) => mapaActual[c] !== e) ||
      Object.keys(mapaActual).some(c => !CUITS_CONOCIDOS[c]);

    if (necesitaCorreccion) {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'config_contable', 'general');
      updateDoc(docRef, { cuitEmpresaMap: { ...CUITS_CONOCIDOS } });
    }
  }, [configContable]);

  // ── Paso 1: seleccionar archivo → detectar meta ───────────────────────────
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArchivo(file);
    setEstado('detecting');
    setMensaje('');
    setPreview(null);
    setMeta(null);

    try {
      const buffer = await file.arrayBuffer();
      const detected = detectARCAMeta(buffer, file.name);

      // Resolver empresa desde el mapa guardado
      const empresaResuelta = detected.cuit ? (cuitMap[detected.cuit] ?? null) : null;

      setMeta({ ...detected, buffer });
      setTipoImport(detected.tipoImport);
      setEmpresa(empresaResuelta);

      // Si detectamos todo → ir directo al paso de parseo
      if (detected.tipoImport && empresaResuelta) {
        await doParse(buffer, detected.tipoImport, empresaResuelta);
      } else {
        // Pedir confirmación de lo que no pudimos detectar
        setEstado('confirming_meta');
      }
    } catch (err) {
      setEstado('error');
      setMensaje(`Error al leer el archivo: ${err.message}`);
    }
  };

  // ── Paso 2: parsear con empresa + tipo confirmados ────────────────────────
  const doParse = async (buffer, tipo, emp) => {
    setEstado('parsing');
    try {
      const items = parseARCA(buffer, tipo, emp);
      if (items.length === 0) {
        setEstado('error');
        setMensaje('No se encontraron comprobantes. Verificá que el XLS sea de ARCA y que las columnas estén correctas.');
        return;
      }

      // Agrupar períodos detectados
      const periodosEnArchivo = [...new Set(items.map(c => c.periodo).filter(Boolean))].sort();
      setPreview({ items, periodosEnArchivo });
      setEstado('confirming');
    } catch (err) {
      setEstado('error');
      setMensaje(`Error al parsear el archivo: ${err.message}`);
    }
  };

  // Confirmación de meta (cuando no pudimos detectar algo)
  const handleConfirmMeta = async () => {
    if (!empresa || !tipoImport || !meta?.buffer) return;

    // Guardar asociación CUIT → empresa si aplica y el usuario lo pidió
    if (guardarCuit && meta.cuit && !cuitMap[meta.cuit]) {
      await guardarConfig({
        ...configContable,
        cuitEmpresaMap: { ...cuitMap, [meta.cuit]: empresa },
      });
    }

    await doParse(meta.buffer, tipoImport, empresa);
  };

  // ── Paso 3: importar ──────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!preview) return;
    setEstado('importing');
    try {
      // Limpiar TODOS los períodos del archivo antes de guardar (evita duplicados)
      for (const p of preview.periodosEnArchivo) {
        await limpiarImportacion(empresa, p, tipoImport);
      }
      await guardarBatch(preview.items);
      setEstado('done');
      setMensaje(
        `✅ ${preview.items.length} comprobantes importados. ` +
        `Períodos: ${preview.periodosEnArchivo.join(', ')}`
      );
    } catch (err) {
      setEstado('error');
      setMensaje(`Error al guardar: ${err.message}`);
    }
  };

  const reset = () => {
    setArchivo(null); setMeta(null); setPreview(null);
    setEmpresa(null); setTipoImport(null);
    setEstado('idle'); setMensaje('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const labelMes = (ym) => {
    if (!ym) return ym;
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-base font-black text-white uppercase tracking-widest">Importar ARCA</h2>
        <p className="text-[10px] text-slate-500 mt-1">
          El sistema detecta automáticamente la empresa (por CUIT) y el tipo de comprobantes.
        </p>
      </div>

      {/* ── Drop zone (idle / error) */}
      {(estado === 'idle' || estado === 'error') && (
        <>
          <div
            onClick={() => fileRef.current?.click()}
            className="glass-panel rounded-2xl border-2 border-dashed border-white/10 hover:border-indigo-500/50 p-14 flex flex-col items-center gap-4 cursor-pointer transition-all group">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-all">
              <FileSpreadsheet size={28} className="text-indigo-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-white">Seleccionar archivo de ARCA</p>
              <p className="text-[10px] text-slate-500 mt-1">
                Emitidos o Recibidos — formatos XLS, XLSX o CSV
              </p>
            </div>
            <input ref={fileRef} type="file" accept=".xls,.xlsx,.csv" onChange={handleFile} className="hidden" />
          </div>

          {estado === 'error' && mensaje && (
            <div className="glass-panel rounded-2xl border border-rose-500/20 p-4 flex items-center gap-3">
              <AlertTriangle size={16} className="text-rose-400 shrink-0" />
              <p className="text-xs font-bold text-rose-300">{mensaje}</p>
            </div>
          )}
        </>
      )}

      {/* ── Detectando */}
      {estado === 'detecting' && (
        <div className="glass-panel rounded-2xl border border-white/10 p-8 flex items-center gap-4">
          <RefreshCw size={20} className="text-indigo-400 animate-spin" />
          <p className="text-sm font-bold text-white">Analizando archivo...</p>
        </div>
      )}

      {/* ── Confirmación de meta cuando no se detectó todo */}
      {estado === 'confirming_meta' && meta && (
        <div className="glass-panel rounded-2xl border border-amber-500/20 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-400" />
            <div>
              <p className="text-sm font-black text-white">Confirmá los datos del archivo</p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-mono truncate max-w-lg">
                {meta.titleText?.slice(0, 120)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipo auto-detectado o a elegir */}
            <div>
              <label className="darq-label block mb-2">
                Tipo de comprobantes
              </label>
              {meta.tipoImport ? (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
                  <Zap size={12} className="text-emerald-400" />
                  <span className="text-emerald-400 font-black text-sm uppercase">{meta.tipoImport}</span>
                  <span className="text-[10px] text-slate-500 ml-1">auto-detectado</span>
                </div>
              ) : (
                <div className="flex gap-2">
                  {['emitidos', 'recibidos'].map(t => (
                    <button key={t} onClick={() => setTipoImport(t)}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                        tipoImport === t ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Empresa: auto o manual */}
            <div>
              <label className="darq-label block mb-2">
                Empresa {meta.cuit && <span className="text-slate-600 normal-case font-normal">CUIT {meta.cuit}</span>}
              </label>
              {empresa && cuitMap[meta.cuit] ? (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
                  <Building2 size={12} className="text-emerald-400" />
                  <span className="text-emerald-400 font-black text-sm">{empresa}</span>
                  <span className="text-[10px] text-slate-500 ml-1">auto-detectada</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <SearchableSelect value={empresa || ''} onChange={e => setEmpresa(e.target.value)}
                    className="w-full text-xs font-bold bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none cursor-pointer">
                    <option value="">— Seleccioná empresa —</option>
                    {EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)}
                  </SearchableSelect>
                  {meta.cuit && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={guardarCuit} onChange={e => setGuardarCuit(e.target.checked)}
                        className="rounded" />
                      <span className="text-[10px] text-slate-500">
                        Recordar CUIT {meta.cuit} → {empresa || '...'}
                      </span>
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleConfirmMeta}
              disabled={!empresa || !tipoImport}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-black uppercase rounded-xl transition-all flex items-center justify-center gap-2">
              <Upload size={14} /> Continuar
            </button>
            <button onClick={reset}
              className="px-6 py-3 bg-white/5 text-slate-400 text-xs font-black uppercase rounded-xl hover:text-white transition-all">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Parseando */}
      {estado === 'parsing' && (
        <div className="glass-panel rounded-2xl border border-white/10 p-8 flex items-center gap-4">
          <RefreshCw size={20} className="text-indigo-400 animate-spin" />
          <p className="text-sm font-bold text-white">Procesando comprobantes...</p>
        </div>
      )}

      {/* ── Preview / Confirmar importación */}
      {estado === 'confirming' && preview && (
        <div className="glass-panel rounded-2xl border border-indigo-500/20 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-400" />
            <div>
              <h3 className="text-sm font-black text-white">Archivo leído correctamente</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">{archivo?.name}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total</p>
              <p className="text-2xl font-black text-white tabular-nums">{preview.items.length}</p>
              <p className="text-[10px] text-slate-600">comprobantes</p>
            </div>
            <div className="bg-indigo-500/10 rounded-xl p-4 border border-indigo-500/20">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Períodos</p>
              <p className="text-sm font-black text-indigo-300">
                {preview.periodosEnArchivo.map(p => labelMes(p)).join(', ')}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={11} className="text-slate-500" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Empresa</p>
              </div>
              <p className="text-sm font-black text-white">{empresa}</p>
              <div className="flex items-center gap-1 mt-1">
                <Tag size={9} className="text-slate-500" />
                <p className="text-[10px] text-slate-500 capitalize">{tipoImport}</p>
              </div>
            </div>
          </div>

          {/* Muestra primeros comprobantes */}
          <div className="space-y-0.5">
            {preview.items.slice(0, 5).map((c, i) => (
              <div key={i} className="flex items-center gap-4 py-2 border-t border-white/5 text-[10px]">
                <span className="text-slate-500 tabular-nums w-24">{c.fecha}</span>
                <span className="text-indigo-400 w-28 truncate">{c.tipoNombre}</span>
                <span className="text-slate-400 flex-1 truncate">{c.denominacion}</span>
                <span className="text-white tabular-nums font-black">
                  $ {Number(c.impTotal || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
            {preview.items.length > 5 && (
              <p className="text-[10px] text-slate-600 text-center pt-1">
                + {preview.items.length - 5} comprobantes más
              </p>
            )}
          </div>

          <p className="text-[10px] text-amber-500/80 bg-amber-500/5 border border-amber-500/10 rounded-xl px-4 py-2">
            ⚠ Se reemplazarán todos los comprobantes existentes para los períodos: {preview.periodosEnArchivo.join(', ')}
          </p>

          <div className="flex gap-3">
            <button onClick={handleImport}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase rounded-xl transition-all flex items-center justify-center gap-2">
              <Upload size={14} /> Importar {preview.items.length} comprobantes
            </button>
            <button onClick={reset}
              className="px-6 py-3 bg-white/5 text-slate-400 text-xs font-black uppercase rounded-xl hover:text-white transition-all">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Guardando */}
      {estado === 'importing' && (
        <div className="glass-panel rounded-2xl border border-white/10 p-8 flex items-center gap-4">
          <RefreshCw size={20} className="text-indigo-400 animate-spin" />
          <p className="text-sm font-bold text-white">Guardando en Firebase...</p>
        </div>
      )}

      {/* ── Listo */}
      {estado === 'done' && (
        <div className="glass-panel rounded-2xl border border-emerald-500/20 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-400" />
            <p className="text-sm font-bold text-white">{mensaje}</p>
          </div>
          <button onClick={reset}
            className="px-4 py-2 bg-white/5 text-slate-400 text-[10px] font-black uppercase rounded-xl hover:text-white transition-all">
            Nueva importación
          </button>
        </div>
      )}

      {/* ── Instructivo */}
      <div className="glass-panel rounded-2xl border border-white/5 p-5">
        <h4 className="darq-label mb-3">¿Cómo exportar desde ARCA?</h4>
        <ol className="space-y-1.5 text-[10px] text-slate-500">
          <li><span className="text-slate-400 font-bold">1.</span> Ingresá a ARCA → Mis Comprobantes → Emitidos <em>o</em> Recibidos</li>
          <li><span className="text-slate-400 font-bold">2.</span> Seleccioná el período (mes/año)</li>
          <li><span className="text-slate-400 font-bold">3.</span> Hacé clic en "Exportar" → elegí formato Excel (.xls) o CSV si XLS no está disponible</li>
          <li><span className="text-slate-400 font-bold">4.</span> Subí el archivo acá — el sistema detecta empresa y tipo automáticamente</li>
        </ol>
        {Object.keys(cuitMap).length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/5">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">CUITs reconocidos</p>
            {Object.entries(cuitMap).map(([cuit, emp]) => (
              <div key={cuit} className="flex items-center gap-2 text-[10px] text-slate-500 group">
                <span className="font-mono text-slate-300">{cuit}</span>
                <span className="text-slate-600">→</span>
                <span className={`font-black flex-1 ${
                  emp === 'BLUE ELEPHANT' ? 'text-indigo-400' : 'text-emerald-400'
                }`}>{emp}</span>
                {!CUITS_CONOCIDOS[cuit] && (
                  <button
                    onClick={async () => {
                      const nuevoMapa = { ...cuitMap };
                      delete nuevoMapa[cuit];
                      await guardarConfig({ ...configContable, cuitEmpresaMap: nuevoMapa });
                    }}
                    title="Eliminar asociación incorrecta"
                    className="p-0.5 rounded text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* ── Zona de limpieza */}
      <div className="glass-panel rounded-2xl border border-rose-500/10 p-5">
        <h4 className="text-[10px] font-black text-rose-500/60 uppercase tracking-widest mb-3">Limpiar datos incorrectos</h4>
        <p className="text-[10px] text-slate-600 mb-3">Borra TODOS los comprobantes ARCA de una empresa. Usá esto si importáste accidentalmente bajo la empresa incorrecta.</p>
        <div className="flex gap-2">
          {EMPRESAS.map(emp => (
            <button
              key={emp}
              onClick={async () => {
                if (!window.confirm(`¿Seguro que querés borrar TODOS los comprobantes ARCA de ${emp}? Esta acción no se puede deshacer.`)) return;
                setEstado('importing');
                setMensaje(`Limpiando ${emp}...`);
                const n = await limpiarEmpresa(emp);
                setEstado('done');
                setMensaje(`Se eliminaron ${n} comprobantes de ${emp}.`);
              }}
              className="flex-1 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase rounded-xl hover:bg-rose-500/20 transition-all"
            >
              Limpiar {emp}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
