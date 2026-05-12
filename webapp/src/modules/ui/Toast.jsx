import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─── Context ───────────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

let _toastId = 0;

// ─── Provider ──────────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(({ message, type = 'success', duration = 3500 }) => {
    const id = ++_toastId;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  // Atajos semánticos
  const success = useCallback((msg, opts) => toast({ message: msg, type: 'success', ...opts }), [toast]);
  const error   = useCallback((msg, opts) => toast({ message: msg, type: 'error',   duration: 5000, ...opts }), [toast]);
  const warning = useCallback((msg, opts) => toast({ message: msg, type: 'warning', ...opts }), [toast]);
  const info    = useCallback((msg, opts) => toast({ message: msg, type: 'info',    ...opts }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info, dismiss }}>
      {children}
      <Toaster toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ─── Config visual por tipo ────────────────────────────────────────────────────
const CONFIGS = {
  success: {
    icon: CheckCircle2,
    bar:  'bg-emerald-500',
    ring: 'border-emerald-500/30',
    iconCls: 'text-emerald-400',
    glow: 'shadow-emerald-900/30',
  },
  error: {
    icon: XCircle,
    bar:  'bg-rose-500',
    ring: 'border-rose-500/30',
    iconCls: 'text-rose-400',
    glow: 'shadow-rose-900/30',
  },
  warning: {
    icon: AlertTriangle,
    bar:  'bg-amber-500',
    ring: 'border-amber-500/30',
    iconCls: 'text-amber-400',
    glow: 'shadow-amber-900/30',
  },
  info: {
    icon: Info,
    bar:  'bg-sky-500',
    ring: 'border-sky-500/30',
    iconCls: 'text-sky-400',
    glow: 'shadow-sky-900/30',
  },
};

// ─── Individual Toast ──────────────────────────────────────────────────────────
function ToastItem({ toast, dismiss }) {
  const [visible, setVisible] = useState(false);
  const cfg = CONFIGS[toast.type] || CONFIGS.success;
  const Icon = cfg.icon;

  // Entrada con micro-delay para que la animación CSS tenga tiempo
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => dismiss(toast.id), 350); // espera la animación de salida
    }, toast.duration);
    return () => clearTimeout(t);
  }, [toast.id, toast.duration, dismiss]);

  return (
    <div
      className={`
        relative flex items-start gap-3 w-full max-w-sm
        bg-[#111827] border ${cfg.ring}
        rounded-2xl shadow-2xl ${cfg.glow}
        px-4 py-3 overflow-hidden
        transition-all duration-350 ease-out
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
      `}
    >
      {/* Barra de color lateral */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.bar} rounded-l-2xl`} />

      {/* Ícono */}
      <Icon size={18} className={`flex-shrink-0 mt-0.5 ${cfg.iconCls}`} />

      {/* Mensaje */}
      <p className="flex-1 darq-value text-slate-200 leading-snug pr-2">
        {toast.message}
      </p>

      {/* Cerrar */}
      <button
        onClick={() => { setVisible(false); setTimeout(() => dismiss(toast.id), 350); }}
        className="flex-shrink-0 text-slate-500 hover:text-white transition-colors mt-0.5"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Toaster (contenedor global) ───────────────────────────────────────────────
function Toaster({ toasts, dismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto w-full max-w-sm">
          <ToastItem toast={t} dismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}
