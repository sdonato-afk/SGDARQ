import React from 'react';
import { X } from 'lucide-react';
import ModalPortal from './ModalPortal.jsx';

/**
 * Modal — componente compartido para todos los diálogos del sistema.
 *
 * Props:
 *   title      {string}    Título del header (requerido)
 *   subtitle   {string}    Línea secundaria debajo del título (opcional)
 *   onClose    {fn}        Cierra el modal (requerido)
 *   footer     {ReactNode} Botones del pie (opcional)
 *   maxWidth   {number}    Ancho máximo del modal en px (default: 580)
 *   children   {ReactNode} Contenido del body
 */
export default function Modal({ title, subtitle, onClose, footer, maxWidth = 580, children }) {
  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth, maxHeight: '90vh', overflowY: 'auto' }}>

          {/* Header */}
          <div className="modal-header">
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 900, color: '#e2e8f0' }}>{title}</h2>
              {subtitle && (
                <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', flexShrink: 0 }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="modal-body">
            {children}
          </div>

          {/* Footer — solo si se pasa */}
          {footer && (
            <div className="modal-footer">
              {footer}
            </div>
          )}

        </div>
      </div>
    </ModalPortal>
  );
}
