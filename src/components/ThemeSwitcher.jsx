import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeSwitcher({ className = '', isCompact = false }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={`theme-switcher-container ${className}`}
      role="radiogroup"
      aria-label="Appearance Theme Selection"
      style={isCompact ? { padding: '0.2rem', justifyContent: 'center', gap: '0.2rem' } : undefined}
    >
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'light'}
        className={`theme-button ${theme === 'light' ? 'active' : ''}`}
        onClick={() => setTheme('light')}
        title="Light Mode (Warm Alabaster)"
        style={isCompact ? { padding: '0.35rem' } : undefined}
      >
        <Sun size={13} />
        {!isCompact && <span>Light</span>}
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={theme === 'dark'}
        className={`theme-button ${theme === 'dark' ? 'active' : ''}`}
        onClick={() => setTheme('dark')}
        title="Dark Mode (Deep Charcoal)"
        style={isCompact ? { padding: '0.35rem' } : undefined}
      >
        <Moon size={13} />
        {!isCompact && <span>Dark</span>}
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={theme === 'system'}
        className={`theme-button ${theme === 'system' ? 'active' : ''}`}
        onClick={() => setTheme('system')}
        title="System Preference (Auto OS Match)"
        style={isCompact ? { padding: '0.35rem' } : undefined}
      >
        <Laptop size={13} />
        {!isCompact && <span>System</span>}
      </button>
    </div>
  );
}
