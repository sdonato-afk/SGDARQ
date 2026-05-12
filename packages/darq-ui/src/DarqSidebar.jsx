import React, { useState, useEffect } from 'react';
import { PanelLeftClose, PanelLeft, LogOut, ExternalLink, X } from 'lucide-react';
import './DarqSidebar.css';

export default function DarqSidebar({
  appName,
  appAccent = 'indigo',
  menuGroups = [],
  activeTab,
  onTabSelect,
  user,
  onLogout,
  externalLinks = [],
  extraContent = null,
  mobileOpen = false,
  onMobileClose = null,
}) {
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem('darq_sidebar_collapsed') === 'true'
  );

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('darq_sidebar_collapsed', String(next));
  };

  const handleTabSelect = (id) => {
    onTabSelect(id);
    if (onMobileClose) onMobileClose(); // siempre cierra en mobile tras navegar
  };

  const accentColors = {
    emerald: { glow: 'rgba(16, 185, 129, 0.1)',  color: '#34d399', activeBg: 'rgba(16, 185, 129, 0.1)',  activeBorder: 'rgba(16, 185, 129, 0.2)' },
    amber:   { glow: 'rgba(245, 158, 11, 0.1)',  color: '#f59e0b', activeBg: 'rgba(245, 158, 11, 0.1)',  activeBorder: 'rgba(245, 158, 11, 0.2)' },
    violet:  { glow: 'rgba(139, 92, 246, 0.1)',  color: '#a78bfa', activeBg: 'rgba(139, 92, 246, 0.1)',  activeBorder: 'rgba(139, 92, 246, 0.2)' },
    sky:     { glow: 'rgba(56, 189, 248, 0.1)',  color: '#38bdf8', activeBg: 'rgba(56, 189, 248, 0.1)',  activeBorder: 'rgba(56, 189, 248, 0.2)' },
    indigo:  { glow: 'rgba(99, 102, 241, 0.1)',  color: '#818cf8', activeBg: 'rgba(99, 102, 241, 0.1)',  activeBorder: 'rgba(99, 102, 241, 0.2)' },
    blue:    { glow: 'rgba(59, 130, 246, 0.1)',  color: '#60a5fa', activeBg: 'rgba(59, 130, 246, 0.1)',  activeBorder: 'rgba(59, 130, 246, 0.2)' },
  };
  const theme = accentColors[appAccent] || accentColors.indigo;

  return (
    <>
      {/* Overlay — CSS lo oculta en desktop, lo muestra en mobile cuando está abierto */}
      {mobileOpen && (
        <div className="darq-sidebar-overlay" onClick={onMobileClose} />
      )}

      <aside className={`darq-sidebar-wrapper ${
        collapsed ? 'collapsed' : 'expanded'
      } ${
        mobileOpen ? 'darq-sidebar-mobile--open' : ''
      }`}>
        <div className="darq-sidebar glass-panel">

          {/* Glow effect interno */}
          <div
            className="darq-sidebar-glow"
            style={{ background: theme.glow }}
          />

          {/* ── Header ── */}
          <div className="darq-sidebar-header">
            {!collapsed && (
              <div className="darq-sidebar-brand fade-in">
              <h1 style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1, color: '#fff', marginBottom: '4px' }}>
                  D<span style={{ color: theme.color }}>+</span>ARQ
                </h1>
                <p style={{ margin: 0, fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em', color: theme.color }}>
                  {appName}
                </p>
              </div>
            )}
            {collapsed && (
              <div className="darq-sidebar-brand-mini fade-in" title="D+ARQ">
                <span style={{ fontSize: '14px', fontWeight: 900, letterSpacing: '-0.02em', color: '#fff' }}>D+Q</span>
              </div>
            )}

            {/* Botón: X en mobile (cierra drawer), colapsar en desktop */}
            {onMobileClose ? (
              <button onClick={onMobileClose} className="collapse-btn" title="Cerrar menú">
                <X size={16} />
              </button>
            ) : (
              <button onClick={toggleCollapse} className="collapse-btn" title={collapsed ? "Expandir" : "Colapsar"}>
                {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
              </button>
            )}
          </div>

          {/* ── Extra Content (e.g. MiniCalendar) ── */}
          {!collapsed && extraContent && (
            <div className="darq-sidebar-extra">
              {extraContent}
            </div>
          )}

          {/* ── Menú Principal ── */}
          <div className="darq-sidebar-scroll">
            {menuGroups.map((group, gIdx) => (
              <div key={gIdx} className="menu-group">
                {!collapsed && group.title && (
                  <div className="menu-group-title">
                    <span className="darq-label">{group.title}</span>
                  </div>
                )}
                {collapsed && group.title && <div className="menu-group-divider" />}

                <div className="menu-items">
                  {group.items.map(item => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleTabSelect(item.id)}
                        className={`nav-item ${isActive ? 'active' : ''} ${collapsed ? 'rail-mode' : ''}`}
                        style={isActive ? {
                          background: theme.activeBg,
                          borderColor: theme.activeBorder
                        } : {}}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon size={18} className={isActive ? '' : 'icon-muted'} style={isActive ? { color: theme.color } : {}} />
                        {!collapsed && (
                          <span className="nav-label" style={{ fontWeight: isActive ? 700 : 500, color: isActive ? '#fff' : 'var(--text-muted, #94a3b8)' }}>
                            {item.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* External Links */}
            {externalLinks.length > 0 && (
              <div className="menu-group" style={{ marginTop: '20px' }}>
                {!collapsed && (
                  <div className="menu-group-title">
                    <span className="darq-label">Ecosistema</span>
                  </div>
                )}
                {collapsed && <div className="menu-group-divider" />}
                <div className="menu-items">
                  {externalLinks.map((link, idx) => {
                    const Icon = link.icon || ExternalLink;
                    return (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`nav-item ${collapsed ? 'rail-mode' : ''}`}
                        title={collapsed ? link.label : undefined}
                      >
                        <Icon size={16} className="icon-muted" />
                        {!collapsed && <span className="nav-label" style={{ color: 'var(--text-muted, #94a3b8)' }}>{link.label}</span>}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Footer / User ── */}
          <div className="darq-sidebar-footer">
            {collapsed ? (
              <button onClick={onLogout} className="logout-btn-mini" title="Cerrar Sesión">
                <LogOut size={16} className="text-rose-400" />
              </button>
            ) : (
              <>
                <button onClick={onLogout} className="logout-btn" title="Cerrar Sesión">
                  <LogOut size={16} className="text-rose-400 hover:text-rose-300 transition-colors" />
                </button>
                <div className="user-info">
                  {user && (
                    <div className="avatar" style={{ backgroundColor: user.avatarColor || '#4f46e5' }}>
                      {(user.email || user.nombre || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

        </div>
      </aside>
    </>
  );
}
