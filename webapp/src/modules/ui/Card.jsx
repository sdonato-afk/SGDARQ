import React from 'react';

/**
 * Universal Card Component
 * Enforces the glassmorphism aesthetic across the application
 */
export function Card({ 
  children, 
  title, 
  subtitle,
  headerAction,
  className = '',
  bodyClassName = 'p-6',
  variant = 'default' // default | glowing | dark
}) {

  const variants = {
    default: "glass-panel/60 backdrop-blur-xl border border-white/10",
    glowing: "bg-[#111827] shadow-[0_0_40px_-15px_rgba(16,185,129,0.15)] border border-emerald-500/10",
    dark: "bg-black/80 border border-white/5",
  };

  return (
    <div className={`rounded-2xl overflow-hidden shadow-2xl ${variants[variant]} ${className}`}>
      {(title || subtitle || headerAction) && (
        <div className="px-6 py-5 border-b border-white/5 flex flex-wrap gap-4 items-center justify-between bg-white/[0.02]">
          <div>
            {subtitle && <p className="darq-value text-emerald-500/80 uppercase tracking-[0.2em] mb-1">{subtitle}</p>}
            {title && <h3 className="text-xl font-black italic tracking-tight text-white uppercase">{title}</h3>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className={bodyClassName}>
        {children}
      </div>
    </div>
  );
}
