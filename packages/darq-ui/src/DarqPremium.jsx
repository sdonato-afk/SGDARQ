import React, { useState } from 'react';

// ── DarqKpiCard ──────────────────────────────────────────────────────────
export function DarqKpiCard({ label, value, icon: Icon, active, numColor, bgColor, borderColor }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '16px 20px', borderRadius: 18,
      background: active ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: `1px solid ${active ? borderColor : 'rgba(255,255,255,0.05)'}`,
      boxShadow: active ? `0 0 30px ${bgColor.replace('0.10', '0.05').replace('0.1', '0.05')}` : 'none',
      transition: 'all 0.3s ease',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 14, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? bgColor : 'rgba(255,255,255,0.05)',
        color: active ? numColor : 'rgba(255,255,255,0.4)',
        border: `1px solid ${active ? borderColor : 'transparent'}`,
        transition: 'all 0.3s ease',
      }}>
        <Icon size={20} />
      </div>
      <div>
        <p style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
          {label}
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 42, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', color: active ? numColor : 'rgba(255,255,255,0.15)' }}>
            {value}
          </span>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.25)' }}>
            {value === 1 ? 'ítem' : 'ítems'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── DarqSectionDivider ────────────────────────────────────────────────────────
export function DarqSectionDivider({ label, count, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <div style={{ width: 3, height: 20, borderRadius: 4, background: color, flexShrink: 0 }} />
      <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.45)' }}>
        {label}
      </p>
      {count !== undefined && (
        <span style={{
          fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.3)',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
          padding: '2px 8px', borderRadius: 8,
        }}>{count}</span>
      )}
    </div>
  );
}

// ── DarqItemRow ────────────────────────────────────────────────────────
export function DarqItemRow({ 
  title, subtitle, 
  badgeText, badgeColor, badgeBg, 
  amountText, amountColor = '#34d399',
  accentColor = '#6366f1', 
  icon: Icon,
  isOverdue = false,
  isToday = false,
  actions = null
}) {
  const [hovered, setHovered] = useState(false);
  const bar = isOverdue ? '#f87171' : isToday ? '#fbbf24' : accentColor;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minHeight: 56, padding: '0 16px', gap: 16,
        borderRadius: 12,
        background: isOverdue ? 'rgba(220,38,38,0.05)' : hovered ? 'rgba(255,255,255,0.04)' : 'rgba(10,13,24,0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${isOverdue ? 'rgba(248,113,113,0.3)' : hovered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}`,
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.4)' : 'none',
        transition: 'all 0.2s ease',
      }}>
      
      {/* Tiny Rounded Pill Accent */}
      <div style={{ width: 4, height: 24, background: bar, borderRadius: 4, flexShrink: 0, boxShadow: `0 0 10px ${bar}` }} />

      {/* Info */}
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, padding: '8px 0' }}>
        <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: isOverdue ? '#fecaca' : 'rgba(255,255,255,0.85)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </p>
          <p style={{ fontSize: 12, color: isOverdue ? 'rgba(248,113,113,0.6)' : 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {subtitle}
          </p>
          {Icon && (
             <span style={{
               fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em',
               padding: '2px 6px', borderRadius: 6,
               background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)',
               display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 'auto'
             }}>
               <Icon size={10} />
             </span>
          )}
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {badgeText && (
          <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 12, background: badgeBg || 'rgba(255,255,255,0.05)', color: badgeColor || 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
            {badgeText}
          </span>
        )}
        {amountText && (
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: amountColor }}>
            {amountText}
          </span>
        )}
        {actions ? (
          <div style={{ display: 'flex', gap: 6 }}>
            {actions}
          </div>
        ) : (
          <button style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', padding: '4px 16px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.02)', transition: 'all 0.2s', marginLeft: 8 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}>
            View
          </button>
        )}
      </div>
    </div>
  );
}
