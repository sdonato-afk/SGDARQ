/**
 * useObras.js — Barrel de re-exports
 *
 * Mantiene compatibilidad total con todos los imports existentes.
 * Cada hook vive ahora en su propio archivo en src/hooks/.
 */

export { useObrasMain, useObraConfig }         from './useObrasCore';
export { useMovimientosMain, useTcGlobal,
         useProveedoresMain }                   from './useMovimientosMain';
export { useCertificaciones }                   from './useCertificaciones';
export { useContratistas }                      from './useContratistas';
export { useHonorarios }                        from './useHonorarios';
export { useLogistica }                         from './useLogistica';
export { useAcopios }                           from './useAcopios';
export { useOrdenesCambio }                     from './useOrdenesCambio';
export { useCajaChica }                         from './useCajaChica';
export { useTransacciones }                     from './useTransacciones';
export { useFacturasDirectas, usePagosDirectos } from './usePagosDirectos';
export { useFotos, useGastosCliente }           from './useFotos';
export { useEstadoCuentaObra }                  from './useEstadoCuenta';
export { useTareas }                            from './useTareas';
