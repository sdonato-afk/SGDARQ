import { sumarEquiv } from '../lib/calculadora.jsx';
import { useCertificaciones } from './useCertificaciones';
import { useContratistas }    from './useContratistas';
import { useLogistica }       from './useLogistica';
import { useHonorarios }      from './useHonorarios';
import { useTcGlobal }        from './useMovimientosMain';

// ─── Estado de cuenta consolidado (devengado + rentabilidad) ──────
export function useEstadoCuentaObra(obraId) {
  const { certificaciones } = useCertificaciones(obraId);
  const { contratistas }    = useContratistas(obraId);
  const { logistica }       = useLogistica(obraId);
  const { honorarios }      = useHonorarios(obraId);
  const { tc }              = useTcGlobal(obraId);

  const cAprob               = certificaciones.filter(c => c.aprobada || c.estado === 'aprobada');
  const certifAprobadas      = sumarEquiv(cAprob,       tc, 'monto_neto');
  const honorariosFacturados = sumarEquiv(honorarios,   tc, 'monto');
  const logisticaFacturada   = sumarEquiv(logistica,    tc, 'monto');
  const pptosContratistas    = sumarEquiv(contratistas, tc, 'presupuesto_cliente');
  const margenOpContratistas = sumarEquiv(contratistas, tc, 'margen_operativo');

  const devengado = {
    usd: certifAprobadas.usd + honorariosFacturados.usd + logisticaFacturada.usd + pptosContratistas.usd,
    ars: certifAprobadas.ars + honorariosFacturados.ars + logisticaFacturada.ars + pptosContratistas.ars,
  };

  const rentabilidad = {
    usd: margenOpContratistas.usd + honorariosFacturados.usd + logisticaFacturada.usd,
    ars: margenOpContratistas.ars + honorariosFacturados.ars + logisticaFacturada.ars,
  };

  return { devengado, rentabilidad, tc };
}
