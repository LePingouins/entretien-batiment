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


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [role, setRole] = useState<string | null>(localStorage.getItem('role'));
  const [userId, setUserId] = useState<number | null>(localStorage.getItem('userId') ? Number(localStorage.getItem('userId')) : null);

  useEffect(() => {
    setAccessToken(localStorage.getItem('accessToken'));
    setRole(localStorage.getItem('role'));
    setUserId(localStorage.getItem('userId') ? Number(localStorage.getItem('userId')) : null);
  }, []);

  const login = (data: AuthResponse) => {
    setAccessToken(data.accessToken);
    setRole(data.role);
    setUserId(data.userId);
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
      console.log('Decoded JWT:', decoded);
      const role = decoded.role || '';
      console.log('Extracted role:', role);
      const userId = decoded.sub || '';
      setAccessToken(accessToken);
      setRole(role);
      setUserId(userId);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('role', String(role));
      localStorage.setItem('userId', String(userId));
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
