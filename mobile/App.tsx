import React, { useEffect } from 'react';
import { ActivityIndicator, AppState, Platform, StyleSheet, View } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LangProvider } from './src/context/LangContext';
import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotifications } from './src/lib/push';
import { colors } from './src/theme';

export default function App() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const hideSystemNavigation = async () => {
      await NavigationBar.setVisibilityAsync('hidden');
      await NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => undefined);
    };

    void hideSystemNavigation().catch(() => undefined);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void hideSystemNavigation().catch(() => undefined);
    });
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <LangProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LangProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { status, signIn } = useAuth();

  useEffect(() => {
    if (status === 'authenticated') void registerForPushNotifications();
  }, [status]);

  if (status === 'loading') {
    return (
      <View style={styles.loading}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (status === 'guest') {
    return (
      <>
        <StatusBar style="dark" />
        <LoginScreen onLogin={signIn} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <AppNavigator />
    </>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' },
});
