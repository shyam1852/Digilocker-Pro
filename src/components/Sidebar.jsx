import React, { useState } from 'react';
import {
  LayoutDashboard,
  Shield,
  FolderLock,
  ShieldCheck,
  History,
  RotateCcw,
  Flame,
  ShieldAlert,
  FileBarChart,
  Settings,
  HelpCircle,
  HeartPulse,
  Landmark,
  GraduationCap,
  Sparkles,
  RefreshCw,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import { useAuth } from '../context/AuthContext';

export const PHOENIX_NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'vault', label: 'My Documents', icon: FolderLock },
  { id: 'integrity', label: 'Integrity Verification', icon: ShieldCheck, badge: 'SHA-256' },
  { id: 'versions', label: 'Version History', icon: History },
  { id: 'recovery', label: 'Recovery Center', icon: RotateCcw },
  { id: 'rehearsal', label: 'Breach Rehearsal', icon: Flame, badge: 'PROVE' },
  { id: 'events', label: 'Security Events', icon: ShieldAlert },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Help & Security Info', icon: HelpCircle }
];

export const WORKSPACE_ITEMS = [
  { id: 'healthcare', label: 'Healthcare Hub', icon: HeartPulse },
  { id: 'finance', label: 'Finance & LIC Hub', icon: Landmark },
  { id: 'career', label: 'Career & Education', icon: GraduationCap },
  { id: 'assistant', label: 'DM Assistant', icon: Sparkles, badge: 'AI' },
  { id: 'renewals', label: 'Renewals & Alerts', icon: RefreshCw },
  { id: 'privacy', label: 'Emergency & Shamir', icon: Shield }
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
  const [showWorkspaces, setShowWorkspaces] = useState(false);

  const handleNavClick = (id) => {
    onSelectTab(id);
    if (onClose) onClose();
  };

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header" style={{ position: 'relative' }}>
        <div className="brand-mark" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #aa3bff 100%)' }} title="PHOENIX - Self-Defending Document Vault">
          <Shield size={18} strokeWidth={2.4} />
        </div>
        {!isCollapsed && (
          <>
            <div className="brand-text">PHOENIX</div>
            <span className="brand-badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--status-danger)' }}>VAULT</span>
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

      {/* Main PHOENIX Navigation */}
      <nav className="sidebar-nav">
        {PHOENIX_NAV_ITEMS.map((item) => {
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
                    backgroundColor: item.badge === 'PROVE' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                    color: item.badge === 'PROVE' ? 'var(--status-danger)' : '#60a5fa',
                    border: item.badge === 'PROVE' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)'
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Collapsible Specialized Workspaces Section */}
        {!isCollapsed && (
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              onClick={() => setShowWorkspaces(s => !s)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.4rem 0.65rem',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <span>Specialized Workspaces</span>
              <ChevronDown size={13} style={{ transform: showWorkspaces ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
            </button>

            {showWorkspaces && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.35rem' }}>
                {WORKSPACE_ITEMS.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`nav-link ${isActive ? 'active' : ''}`}
                      style={{ fontSize: '0.8rem', padding: '0.45rem 0.65rem' }}
                    >
                      <Icon size={15} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
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
