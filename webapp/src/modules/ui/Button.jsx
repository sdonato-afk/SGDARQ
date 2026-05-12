import React from 'react';

/**
 * Universal Button Component
 * Maintains the premium dark, gradient, and glassmorphism styling parameters.
 */
export function Button({ 
  children, 
  variant = 'primary', // primary | outline | danger | glass | ghost
  size = 'md', // sm | md | lg
  className = '', 
  icon: Icon,
  disabled,
  ...props 
}) {
  const baseStyles = "inline-flex items-center justify-center font-black uppercase tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900";
  
  const sizes = {
    sm: "py-2 px-4 text-[10px] rounded-lg",
    md: "py-3 px-6 text-[10px] rounded-xl",
    lg: "py-4 px-8 text-xs rounded-2xl"
  };

  const variants = {
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30",
    danger: "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30",
    outline: "bg-transparent border-2 border-white/10 hover:border-white/30 text-slate-300 hover:text-white",
    glass: "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white backdrop-blur-md border border-white/5",
    ghost: "bg-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5"
  };

  const disabledStyles = disabled ? "opacity-50 cursor-not-allowed transform-none hover:bg-inherit hover:text-inherit" : "hover:-translate-y-0.5 active:translate-y-0";

  return (
    <button 
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${disabledStyles} ${className}`}
      disabled={disabled}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} className={children ? 'mr-2' : ''} />}
      {children}
    </button>
  );
}
