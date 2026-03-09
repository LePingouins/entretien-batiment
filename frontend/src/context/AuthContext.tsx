import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthResponse, UserRole } from '../types/api';
import { clearStoredAuth, getStoredAuth, setStoredAuth } from '../lib/authStorage';

interface AuthContextType {
  accessToken: string | null;
  role: UserRole | null;
  userId: number | null;
  login: (data: AuthResponse, rememberMe: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to validate and cast role from storage
function parseRole(value: string | null): UserRole | null {
  if (value === 'ADMIN' || value === 'DEVELOPPER' || value === 'TECH' || value === 'WORKER') return value;
  return null;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const initial = getStoredAuth();
  const [accessToken, setAccessToken] = useState<string | null>(initial.accessToken);
  const [role, setRole] = useState<UserRole | null>(parseRole(initial.role));
  const [userId, setUserId] = useState<number | null>(initial.userId ? Number(initial.userId) : null);

  // Sync state from active auth storage on mount and when storage is updated.
  useEffect(() => {
    const syncFromStorage = () => {
      const stored = getStoredAuth();
      setAccessToken(stored.accessToken);
      setRole(parseRole(stored.role));
      setUserId(stored.userId ? Number(stored.userId) : null);
    };

    // Listen for custom event dispatched by api.ts after token refresh
    window.addEventListener('auth-storage-update', syncFromStorage);
    // Also listen for storage events from other tabs
    window.addEventListener('storage', syncFromStorage);

    return () => {
      window.removeEventListener('auth-storage-update', syncFromStorage);
      window.removeEventListener('storage', syncFromStorage);
    };
  }, []);

  const login = (data: AuthResponse, rememberMe: boolean) => {
    const { accessToken } = data;
    // Decode JWT to extract role and userId
    function decodeJwt(token: string) {
      try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        return decoded;
      } catch (e) {
        return {};
      }
    }
    const decoded = decodeJwt(accessToken);
    const decodedRole = decoded.role || '';
    const decodedUserId = decoded.sub || '';
    
    setAccessToken(accessToken);
    setRole(parseRole(decodedRole));
    setUserId(Number(decodedUserId) || null);

    setStoredAuth(accessToken, String(decodedRole), String(decodedUserId), rememberMe);
    window.dispatchEvent(new Event('auth-storage-update'));
  };

  const logout = () => {
    setAccessToken(null);
    setRole(null);
    setUserId(null);
    clearStoredAuth();
    window.dispatchEvent(new Event('auth-storage-update'));
  };

  return (
    <AuthContext.Provider value={{ accessToken, role, userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
