import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getToken, clearToken } from './src/lib/storage';
import LoginScreen from './src/screens/LoginScreen';
import TripsScreen from './src/screens/TripsScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';

type Tab = 'trips' | 'expenses';

export default function App() {
  const [authState, setAuthState] = useState<'loading' | 'guest' | 'auth'>('loading');
  const [tab, setTab] = useState<Tab>('trips');

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

  const handleLogout = async () => {
    await clearToken();
    setAuthState('guest');
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        {tab === 'trips'
          ? <TripsScreen onLogout={handleLogout} />
          : <ExpensesScreen onLogout={handleLogout} />}
      </View>
      <View style={styles.tabBar}>
        <TabButton label="Kilométrage" icon="🚗" active={tab === 'trips'} onPress={() => setTab('trips')} />
        <TabButton label="Dépenses" icon="🧾" active={tab === 'expenses'} onPress={() => setTab('expenses')} />
      </View>
    </View>
  );
}

function TabButton({ label, icon, active, onPress }: { label: string; icon: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.tabButton} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{icon}</Text>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#CBD5E1',
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabIcon: { fontSize: 20, opacity: 0.55 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '500' },
  tabLabelActive: { color: '#1D4ED8', fontWeight: '700' },
});
