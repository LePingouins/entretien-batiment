import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { LangProvider } from './context/LangContext';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import AppRouter from './routes/AppRouter';
import NotificationsProvider from './context/NotificationsContext';
import { BroadcastProvider } from './context/BroadcastContext';
import { PageAccessProvider } from './context/PageAccessContext';
import BroadcastOverlay from './components/BroadcastOverlay';
import KeyboardNavigator from './lib/KeyboardNavigator';
import { ToastProvider } from './context/ToastContext';
import Toaster from './components/Toaster';
import { ConfirmProvider } from './context/ConfirmContext';

/**
 * QueryClient configuration with caching:
 *
 * staleTime: 2 minutes — data fetched via useQuery is considered "fresh" for 2 min.
 *   During this window, navigating back to a page will NOT trigger a new network
 *   request; the cached result is served instantly.
 *
 * gcTime: 10 minutes — unused cached data is kept in memory for 10 min after the
 *   last component that subscribed unmounts. This enables instant back-navigation.
 *
 * retry: 1 — failed requests retry once before surfacing an error.
 *
 * refetchOnWindowFocus: false — avoids surprise re-fetches when the user switches
 *   browser tabs and returns.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,       // 2 minutes
      gcTime: 10 * 60 * 1000,          // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <PageAccessProvider>
                <KeyboardNavigator />
                <NotificationsProvider>
                  <BroadcastProvider>
                    <AppRouter />
                    <BroadcastOverlay />
                  </BroadcastProvider>
                </NotificationsProvider>
              </PageAccessProvider>
              <PWAUpdatePrompt />
              {/* Global toast stack — rendered above everything */}
              <Toaster />
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </LangProvider>
    </QueryClientProvider>
  );
}

export default Root;
