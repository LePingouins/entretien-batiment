import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { LangProvider } from './context/LangContext';
import AppRouter from './routes/AppRouter';

const queryClient = new QueryClient();

function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </LangProvider>
    </QueryClientProvider>
  );
}

export default Root;
