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

const queryClient = new QueryClient();

function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <AuthProvider>
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
        </AuthProvider>
      </LangProvider>
    </QueryClientProvider>
  );
}

export default Root;
