import { createPortal } from 'react-dom';

/**
 * ModalPortal — renderiza sus hijos en document.body via createPortal.
 * Úsalo para envolver cualquier div.modal-overlay y garantizar que
 * position:fixed escapa todos los contenedores padres.
 */
export default function ModalPortal({ children }) {
  return createPortal(children, document.body);
}
