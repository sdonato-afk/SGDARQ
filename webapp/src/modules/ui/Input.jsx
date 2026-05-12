import React from 'react';
import { SearchableSelect } from '@darq/ui';

/**
 * Universal Input Component
 * Dark theme ready with floating labels and error handling
 */
export function Input({ 
  label, 
  error,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className = '',
  wrapperClassName = '',
  ...props 
}) {
  return (
    <div className={`space-y-1 ${wrapperClassName}`}>
      {label && (
        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1 tracking-widest">
          {label}
        </label>
      )}
      <div className="relative">
        {LeftIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
            <LeftIcon size={16} />
          </div>
        )}
        
        <input 
          className={`
            w-full bg-black/40 border rounded-xl py-3 text-sm font-bold text-white outline-none transition-colors
            ${LeftIcon ? 'pl-11' : 'px-4'}
            ${RightIcon ? 'pr-11' : 'px-4'}
            ${error 
              ? 'border-rose-500/50 focus:border-rose-500 shadow-[0_0_15px_-3px_rgba(244,63,94,0.2)]' 
              : 'border-white/10 focus:border-emerald-500/50'
            }
            ${className}
          `}
          {...props}
        />

        {RightIcon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
            <RightIcon size={16} />
          </div>
        )}
      </div>
      {error && <p className="text-[10px] text-rose-500 font-bold ml-1">{error}</p>}
    </div>
  );
}

export function Select({ 
  label, 
  options = [], 
  error,
  className = '',
  wrapperClassName = '',
  ...props 
}) {
  return (
    <div className={`space-y-1 ${wrapperClassName}`}>
      {label && (
        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">
          {label}
        </label>
      )}
      <SearchableSelect 
        className={className}
        style={{ height: '46px', fontSize: '14px', background: 'rgba(0,0,0,0.4)', borderRadius: '12px' }}
        value={props.value}
        onChange={props.onChange}
        name={props.name}
        options={options}
        placeholder="Seleccionar..."
        {...props}
      />
    </div>
  );
}
