import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import {
  getCurrentUser,
  getMyPageAccess,
  login as loginRequest,
  logout as logoutRequest,
  onSessionExpired,
  syncPendingTrips,
  isNetworkError,
} from '../lib/api';
import {
  claimLegacyActiveTrip,
  clearCachedAuthData,
  clearToken,
  getCachedAuth,
  getToken,
  saveCachedAuth,
  saveSession,
} from '../lib/storage';
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

  async function loadAuthenticatedUser(claimLegacyTrip = false): Promise<void> {
    const currentUser = await getCurrentUser();
    if (claimLegacyTrip) await claimLegacyActiveTrip(currentUser.id);
    setUser(currentUser);
    let nextAccess: Partial<Record<PageKey, boolean>> = {};
    try {
      const response = await getMyPageAccess();
      nextAccess = Object.fromEntries(response.pages.map((entry) => [entry.pageKey, entry.allowed]));
    } catch (error) {
      const cached = isNetworkError(error) ? await getCachedAuth() : null;
      nextAccess = cached?.user.id === currentUser.id ? cached.access : {};
    }
    setAccess(nextAccess);
    await saveCachedAuth({ user: currentUser, access: nextAccess });
    setStatus('authenticated');
    void syncPendingTrips(currentUser.id).catch(() => undefined);
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
      await loadAuthenticatedUser(true);
    } catch (error) {
      const cached = isNetworkError(error) ? await getCachedAuth() : null;
      if (cached) {
        setUser(cached.user);
        setAccess(cached.access);
        setStatus('authenticated');
      } else {
        setUser(null);
        setAccess({});
        setStatus('guest');
      }
    }
  }

  useEffect(() => {
    void reloadSession();
    const removeSessionListener = onSessionExpired(() => {
      setUser(null);
      setAccess({});
      setStatus('guest');
    });
    const removeNetworkListener = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        void getCachedAuth().then((cached) => (
          cached ? syncPendingTrips(cached.user.id) : undefined
        )).catch(() => undefined);
      }
    });
    return () => {
      removeSessionListener();
      removeNetworkListener();
    };
  }, []);

  async function signIn(email: string, password: string, rememberMe: boolean): Promise<void> {
    const session = await loginRequest(email, password, rememberMe);
    await clearCachedAuthData();
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