import React from 'react';
import {
  LayoutDashboard,
  Shield,
  RefreshCw,
  Activity,
  Users,
  ShieldAlert,
  History,
  Settings,
  Lock,
  LogOut,
  X
} from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import { useAuth } from '../context/AuthContext';

export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'vault', label: 'Document Vault', icon: Shield },
  { id: 'renewal', label: 'Renewal Center', icon: RefreshCw },
  { id: 'health', label: 'Policy Health', icon: Activity },
  { id: 'claims', label: 'Nominee Claim Pilot', icon: Users },
  { id: 'emergency', label: 'Emergency Access', icon: ShieldAlert },
  { id: 'activities', label: 'Activity Log', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activeTab, onSelectTab, isOpen, onClose }) {
  const { user, logout } = useAuth();

  const handleNavClick = (id) => {
    onSelectTab(id);
    if (onClose) onClose();
  };

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-mark">
          <Shield size={18} strokeWidth={2.2} />
        </div>
        <div className="brand-text">DM Locker Pro</div>
        <span className="brand-badge">SECURE</span>

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
            >
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Permanent Bottom Theme Switcher & User Profile Footer */}
      <div className="sidebar-footer">
        {/* Label for Theme Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.2rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            Appearance
          </span>
        </div>

        {/* Permanent Bottom Theme Switcher */}
        <ThemeSwitcher />

        {/* User Card */}
        {user && (
          <div className="user-profile-badge">
            <div className="user-avatar">
              {user.username.slice(0, 1).toUpperCase()}
            </div>
            <div className="user-meta">
              <div className="user-name">@{user.username}</div>
              <div className="user-role">{user.email}</div>
            </div>
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
                alignItems: 'center'
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
