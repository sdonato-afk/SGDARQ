import React from 'react';

/**
 * KPICard — Tarjeta de indicador clave reutilizable
 *
 * Props:
 *  label       — string: etiqueta superior
 *  value       — ReactNode: valor principal (string, número, o JSX como DualResult)
 *  sub         — ReactNode: texto secundario debajo del valor
 *  color       — string: color del valor (ej: '#34d399')
 *  borderColor — string: color del borde del contenedor (ej: 'rgba(52,211,153,0.2)')
 *  background  — string: background del contenedor (ej: 'rgba(52,211,153,0.04)')
 *  style       — object: estilos adicionales para el contenedor
 */
export default function KPICard({ label, value, sub, color, borderColor, background, style }) {
  return (
    <div
      className="kpi"
      style={{
        ...(borderColor ? { borderColor } : {}),
        ...(background  ? { background  } : {}),
        ...style,
      }}
    >
      <div className="darq-label" style={{ marginBottom: '8px' }}>{label}</div>
      <div className="darq-monto-lg" style={color ? { color } : {}}>{value}</div>
      {sub != null && <div className="darq-value" style={{ color: 'var(--muted)', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}
