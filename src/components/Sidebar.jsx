import React from 'react';
import {
  LayoutDashboard,
  Shield,
  FolderLock,
  HeartPulse,
  Landmark,
  GraduationCap,
  Sparkles,
  RefreshCw,
  ShieldAlert,
  Settings,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import { useAuth } from '../context/AuthContext';

export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'vault', label: 'My Vault', icon: FolderLock },
  { id: 'healthcare', label: 'Healthcare', icon: HeartPulse },
  { id: 'finance', label: 'Finance & Insurance', icon: Landmark },
  { id: 'career', label: 'Career & Education', icon: GraduationCap },
  { id: 'assistant', label: 'DM Assistant', icon: Sparkles, badge: 'AI' },
  { id: 'renewals', label: 'Renewals & Alerts', icon: RefreshCw },
  { id: 'privacy', label: 'Privacy & Emergency', icon: ShieldAlert },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse
}) {
  const { user, logout } = useAuth();

  const handleNavClick = (id) => {
    onSelectTab(id);
    if (onClose) onClose();
  };

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header" style={{ position: 'relative' }}>
        <div className="brand-mark" title="DM Locker Pro - AES-256-GCM Secure">
          <Shield size={18} strokeWidth={2.4} />
        </div>
        {!isCollapsed && (
          <>
            <div className="brand-text">DM Locker Pro</div>
            <span className="brand-badge">SECURE</span>
          </>
        )}

        {/* Desktop Collapse Toggle */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="collapse-toggle-btn hide-mobile"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        )}

        {/* Mobile Close Button */}
        {isOpen && (
          <button
            onClick={onClose}
            className="mobile-menu-btn"
            style={{ marginLeft: 'auto', display: 'flex' }}
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`nav-link ${isActive ? 'active' : ''}`}
              title={isCollapsed ? item.label : undefined}
              style={{ position: 'relative' }}
            >
              <Icon size={17} strokeWidth={isActive ? 2.3 : 1.8} />
              {!isCollapsed && <span>{item.label}</span>}
              {!isCollapsed && item.badge && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '0.62rem',
                    padding: '0.1rem 0.35rem',
                    borderRadius: '4px',
                    fontWeight: 700,
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Permanent Bottom Theme Switcher & User Profile Footer */}
      <div className="sidebar-footer">
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.2rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Appearance
            </span>
          </div>
        )}

        {/* Permanent Bottom Theme Switcher */}
        <ThemeSwitcher isCompact={isCollapsed} />

        {/* User Card */}
        {user && (
          <div className="user-profile-badge" title={isCollapsed ? `@${user.username}` : undefined}>
            <div className="user-avatar">
              {user.username.slice(0, 1).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="user-meta">
                <div className="user-name">@{user.username}</div>
                <div className="user-role">{user.email}</div>
              </div>
            )}
            <button
              onClick={logout}
              title="Sign Out"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.2rem',
                display: 'flex',
                alignItems: 'center',
                marginLeft: isCollapsed ? 0 : 'auto'
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
