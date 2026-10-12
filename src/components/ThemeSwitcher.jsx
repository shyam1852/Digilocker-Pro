import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeSwitcher({ className = '' }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={`theme-switcher-container ${className}`} role="radiogroup" aria-label="Appearance Theme Selection">
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'light'}
        className={`theme-button ${theme === 'light' ? 'active' : ''}`}
        onClick={() => setTheme('light')}
        title="Light Mode (Warm Alabaster)"
      >
        <Sun size={13} />
        <span>Light</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={theme === 'dark'}
        className={`theme-button ${theme === 'dark' ? 'active' : ''}`}
        onClick={() => setTheme('dark')}
        title="Dark Mode (Deep Charcoal)"
      >
        <Moon size={13} />
        <span>Dark</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={theme === 'system'}
        className={`theme-button ${theme === 'system' ? 'active' : ''}`}
        onClick={() => setTheme('system')}
        title="System Preference (Auto OS Match)"
      >
        <Laptop size={13} />
        <span>System</span>
      </button>
    </div>
  );
}
