import React from 'react';
import { Menu, ShieldCheck, Bell, Search, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TopBar({ title, description, onOpenMobileMenu, searchQuery, onSearchChange }) {
  const { vaultKey } = useAuth();

  return (
    <header className="app-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={onOpenMobileMenu}
          className="mobile-menu-btn"
          aria-label="Toggle navigation drawer"
        >
          <Menu size={18} />
        </button>

        <div className="topbar-left">
          <h1 className="topbar-title">{title}</h1>
          {description && <p className="topbar-desc">{description}</p>}
        </div>
      </div>

      <div className="topbar-right">
        {/* Contextual Quick Search */}
        {onSearchChange && (
          <div style={{ position: 'relative', width: '220px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '0.65rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            />
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="input-control"
              style={{
                paddingLeft: '2rem',
                paddingTop: '0.35rem',
                paddingBottom: '0.35rem',
                fontSize: '0.8rem'
              }}
            />
          </div>
        )}

        {/* Vault Encryption Status Badge */}
        <div className="vault-security-indicator" title="Client-Side AES-256-GCM Zero-Knowledge Encryption State">
          <div className="vault-status-dot" />
          {vaultKey ? (
            <>
              <ShieldCheck size={13} />
              <span>AES-256-GCM ACTIVE</span>
            </>
          ) : (
            <>
              <Lock size={13} />
              <span>VAULT SECURED</span>
            </>
          )}
        </div>

        {/* Notification Bell */}
        <button
          className="btn btn-secondary btn-sm"
          style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)' }}
          title="Security Notifications"
          aria-label="Security notifications"
        >
          <Bell size={15} />
        </button>
      </div>
    </header>
  );
}
