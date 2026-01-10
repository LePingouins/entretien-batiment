import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthResponse } from '../types/api';

interface AuthContextType {
  accessToken: string | null;
  role: 'ADMIN' | 'TECH' | null;
  userId: number | null;
  login: (data: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to validate and cast role from storage
function parseRole(value: string | null): 'ADMIN' | 'TECH' | null {
  if (value === 'ADMIN' || value === 'TECH') return value;
  return null;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [role, setRole] = useState<'ADMIN' | 'TECH' | null>(parseRole(localStorage.getItem('role')));
  const [userId, setUserId] = useState<number | null>(localStorage.getItem('userId') ? Number(localStorage.getItem('userId')) : null);

  // Sync state from localStorage on mount and when storage is updated (e.g., after token refresh)
  useEffect(() => {
    const syncFromStorage = () => {
      setAccessToken(localStorage.getItem('accessToken'));
      setRole(parseRole(localStorage.getItem('role')));
      setUserId(localStorage.getItem('userId') ? Number(localStorage.getItem('userId')) : null);
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

  const login = (data: AuthResponse) => {
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
    
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('role', String(decodedRole));
    localStorage.setItem('userId', String(decodedUserId));
  };

  const logout = () => {
    setAccessToken(null);
    setRole(null);
    setUserId(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
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
