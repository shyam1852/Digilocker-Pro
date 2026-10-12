import React, { createContext, useContext, useState, useEffect } from 'react';
import { deriveVaultKey } from '../utils/crypto';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('dmlocker_token'));
  const [vaultKey, setVaultKey] = useState(null);
  const [loading, setLoading] = useState(true);

  // Validate existing session on mount
  useEffect(() => {
    async function checkAuth() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          // Restore vault key from session storage or local storage
          const cachedPass = sessionStorage.getItem('dmlocker_session_pass') || localStorage.getItem('dmlocker_session_pass');
          if (cachedPass) {
            const derived = await deriveVaultKey(cachedPass, data.user.vault_salt);
            setVaultKey(derived);
          } else if (data.user.normalized_username === 'shyamkeshri') {
            // Auto-restore for demo account
            const derived = await deriveVaultKey('Password123!', data.user.vault_salt);
            setVaultKey(derived);
            localStorage.setItem('dmlocker_session_pass', 'Password123!');
          }
        } else {
          // Token invalid or expired
          logout();
        }
      } catch (err) {
        console.error('Session validation error:', err);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [token]);

  const login = async (identifier, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed.');
    }

    // Derive client AES-256-GCM vault key from password and vault_salt
    const derivedKey = await deriveVaultKey(password, data.user.vault_salt);
    setVaultKey(derivedKey);
    sessionStorage.setItem('dmlocker_session_pass', password);
    localStorage.setItem('dmlocker_session_pass', password);

    localStorage.setItem('dmlocker_token', data.token);
    setToken(data.token);
    setUser(data.user);

    return data.user;
  };

  const register = async (username, email, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      // Throw structured error object preserving field for inline UI targeting
      const error = new Error(data.error || 'Registration failed.');
      error.field = data.field;
      throw error;
    }

    // Derive vault key
    const derivedKey = await deriveVaultKey(password, data.user.vault_salt);
    setVaultKey(derivedKey);
    sessionStorage.setItem('dmlocker_session_pass', password);
    localStorage.setItem('dmlocker_session_pass', password);

    localStorage.setItem('dmlocker_token', data.token);
    setToken(data.token);
    setUser(data.user);

    return data.user;
  };

  const unlockVault = async (passphrase) => {
    if (!user || !user.vault_salt) {
      throw new Error('User session not active.');
    }
    const derivedKey = await deriveVaultKey(passphrase, user.vault_salt);
    setVaultKey(derivedKey);
    sessionStorage.setItem('dmlocker_session_pass', passphrase);
    localStorage.setItem('dmlocker_session_pass', passphrase);
    return derivedKey;
  };

  const logout = () => {
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
    }

    localStorage.removeItem('dmlocker_token');
    localStorage.removeItem('dmlocker_session_pass');
    sessionStorage.removeItem('dmlocker_session_pass');
    setToken(null);
    setUser(null);
    setVaultKey(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, vaultKey, loading, login, register, logout, unlockVault, setVaultKey }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
