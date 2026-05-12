import React from 'react';

/**
 * SectionHeader — encabezado de sección reutilizable (título + botón de acción)
 *
 * Props:
 *   title       {string}      Texto del título (requerido)
 *   ActionIcon  {Component}   Ícono Lucide para el botón (opcional)
 *   actionLabel {string}      Label del botón (opcional)
 *   onAction    {fn}          Click handler del botón (opcional)
 *   actionDisabled {bool}     Deshabilitar el botón (opcional)
 *   style       {object}      Estilos extra para el contenedor (opcional)
 *   children    {ReactNode}   Contenido custom en lugar del botón estándar (opcional)
 */
export default function SectionHeader({
  title,
  ActionIcon,
  actionLabel,
  onAction,
  actionDisabled = false,
  style,
  children,
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 10,
        ...style,
      }}
    >
      <h3
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {title}
      </h3>
      {children || (onAction && (
        <button
          className="btn btn-primary btn-sm"
          onClick={onAction}
          disabled={actionDisabled}
        >
          {ActionIcon && <ActionIcon size={13} />}
          {actionLabel}
        </button>
      ))}
    </div>
  );
}
