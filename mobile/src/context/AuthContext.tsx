import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getCurrentUser,
  getMyPageAccess,
  login as loginRequest,
  logout as logoutRequest,
  onSessionExpired,
} from '../lib/api';
import { clearToken, getToken, saveSession } from '../lib/storage';
import type { CurrentUser, PageKey } from '../types/api';

type AuthStatus = 'loading' | 'guest' | 'authenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: CurrentUser | null;
  canAccess: (pageKey: PageKey) => boolean;
  signIn: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  reloadSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [access, setAccess] = useState<Partial<Record<PageKey, boolean>>>({});

  async function loadAuthenticatedUser(): Promise<void> {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    try {
      const response = await getMyPageAccess();
      setAccess(Object.fromEntries(response.pages.map((entry) => [entry.pageKey, entry.allowed])));
    } catch {
      setAccess({});
    }
    setStatus('authenticated');
  }

  async function reloadSession(): Promise<void> {
    const token = await getToken();
    if (!token) {
      setUser(null);
      setAccess({});
      setStatus('guest');
      return;
    }

    try {
      await loadAuthenticatedUser();
    } catch {
      await clearToken();
      setUser(null);
      setAccess({});
      setStatus('guest');
    }
  }

  useEffect(() => {
    void reloadSession();
    return onSessionExpired(() => {
      setUser(null);
      setAccess({});
      setStatus('guest');
    });
  }, []);

  async function signIn(email: string, password: string, rememberMe: boolean): Promise<void> {
    const session = await loginRequest(email, password, rememberMe);
    await saveSession(session.accessToken, session.refreshToken);
    await loadAuthenticatedUser();
  }

  async function signOut(): Promise<void> {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
      setAccess({});
      setStatus('guest');
    }
  }

  function canAccess(pageKey: PageKey): boolean {
    return access[pageKey] ?? true;
  }

  return (
    <AuthContext.Provider value={{ status, user, canAccess, signIn, signOut, reloadSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}