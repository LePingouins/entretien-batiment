import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { LangProvider } from './context/LangContext';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import AppRouter from './routes/AppRouter';

const queryClient = new QueryClient();

function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <AuthProvider>
          <AppRouter />
          <PWAUpdatePrompt />
        </AuthProvider>
      </LangProvider>
    </QueryClientProvider>
  );
}

export default Root;
