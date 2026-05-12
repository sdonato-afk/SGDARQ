import { Clock, Send, CheckCircle2, AlertCircle } from 'lucide-react';

// Tipos de honorario — compartido entre TabHonorarios y HonorarioModal
export const TIPOS = [
  { id: 'proyecto',       label: 'Proyecto',       color: '#6366f1', configKey: 'honorarios_proyecto_total' },
  { id: 'direccion',      label: 'Dirección',       color: '#34d399', configKey: 'honorarios_direccion_total' },
  { id: 'administracion', label: 'Administración',  color: '#fbbf24', configKey: 'honorarios_admin_total' },
];

// Metadata visual por estado de cuota
export const ESTADO_META = {
  pendiente: { label: 'Pendiente', color: '#64748b', icon: Clock,         badge: 'badge-gray'  },
  emitido:   { label: 'Emitido',   color: '#818cf8', icon: Send,          badge: 'badge-blue'  },
  cobrado:   { label: 'Cobrado',   color: '#34d399', icon: CheckCircle2,  badge: 'badge-green' },
  alertado:  { label: 'Alertado',  color: '#f87171', icon: AlertCircle,   badge: 'badge-red'   },
};

// Convierte un movimiento a USD usando su TC histórico
export function movToUSD(m, tcFallback) {
  if (m.moneda === 'USD') return parseFloat(m.monto) || 0;
  const tc = parseFloat(m.cotizacionHistorica || m.tipoCambioReferencia || m.tc || tcFallback) || 1;
  return (parseFloat(m.monto) || 0) / tc;
}

// Filtro: cobros de honorarios registrados en asientos del sistema principal
export const esCobroHonorarios = (m) =>
  m.tipo === 'Ingreso' && (m.concepto === 'Honorarios' || m.subRubro === 'Honorarios');
