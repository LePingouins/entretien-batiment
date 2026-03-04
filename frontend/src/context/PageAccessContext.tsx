import * as React from 'react';
import { getMyPageAccess } from '../lib/api';
import { PAGE_KEYS, getRoleFallbackOrder, getRolePagePath } from '../lib/pageAccess';
import type { MyPageAccessResponse, PageKey, UserRole } from '../types/api';
import { useAuth } from './AuthContext';

type AccessMap = Record<PageKey, boolean>;

const ALLOW_ALL_MAP: AccessMap = PAGE_KEYS.reduce((acc, pageKey) => {
  acc[pageKey] = true;
  return acc;
}, {} as AccessMap);

interface PageAccessContextType {
  loading: boolean;
  accessMap: AccessMap;
  canAccess: (pageKey: PageKey) => boolean;
  refresh: () => Promise<void>;
  firstAllowedPath: (role: UserRole | null | undefined) => string | null;
}

const PageAccessContext = React.createContext<PageAccessContextType | undefined>(undefined);

function buildAccessMap(response: MyPageAccessResponse): AccessMap {
  const next: AccessMap = { ...ALLOW_ALL_MAP };
  response.pages.forEach((entry) => {
    next[entry.pageKey] = entry.allowed;
  });
  return next;
}

export function PageAccessProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, userId } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [accessMap, setAccessMap] = React.useState<AccessMap>(ALLOW_ALL_MAP);

  const refresh = React.useCallback(async () => {
    if (!accessToken) {
      setAccessMap(ALLOW_ALL_MAP);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getMyPageAccess();
      setAccessMap(buildAccessMap(data));
    } catch (error) {
      setAccessMap(ALLOW_ALL_MAP);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  React.useEffect(() => {
    void refresh();
  }, [refresh, userId]);

  const canAccess = React.useCallback((pageKey: PageKey) => {
    return accessMap[pageKey] ?? true;
  }, [accessMap]);

  const firstAllowedPath = React.useCallback((role: UserRole | null | undefined) => {
    if (!role) return null;

    const orderedPages = getRoleFallbackOrder(role);
    const firstAllowed = orderedPages.find((pageKey) => canAccess(pageKey));
    if (!firstAllowed) return null;
    return getRolePagePath(role, firstAllowed);
  }, [canAccess]);

  return (
    <PageAccessContext.Provider value={{ loading, accessMap, canAccess, refresh, firstAllowedPath }}>
      {children}
    </PageAccessContext.Provider>
  );
}

export function usePageAccess() {
  const ctx = React.useContext(PageAccessContext);
  if (!ctx) {
    throw new Error('usePageAccess must be used within PageAccessProvider');
  }
  return ctx;
}
