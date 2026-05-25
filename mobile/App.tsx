import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getToken, clearToken } from './src/lib/storage';
import LoginScreen from './src/screens/LoginScreen';
import TripsScreen from './src/screens/TripsScreen';

export default function App() {
  const [authState, setAuthState] = useState<'loading' | 'guest' | 'auth'>('loading');

  useEffect(() => {
    getToken().then((t) => setAuthState(t ? 'auth' : 'guest'));
  }, []);

  if (authState === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1D4ED8" />
      </View>
    );
  }

  if (authState === 'guest') {
    return (
      <>
        <StatusBar style="dark" />
        <LoginScreen onLoginSuccess={() => setAuthState('auth')} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <TripsScreen
        onLogout={async () => {
          await clearToken();
          setAuthState('guest');
        }}
      />
    </>
  );
}
