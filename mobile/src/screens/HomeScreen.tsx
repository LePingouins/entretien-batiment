import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bell, ClipboardList, Gauge, MapPinned, ReceiptText, Siren } from 'lucide-react-native';
import { getDashboardStats, getNotifications } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import type { DashboardStats } from '../types/api';
import { colors } from '../theme';

type HomeNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const ROLE_LABELS = {
  ADMIN: 'Administration',
  DEVELOPPER: 'Développement',
  TECH: 'Technique',
  WORKER: 'Opérations',
  REPRESENTANT: 'Représentation',
} as const;

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const { user, canAccess } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [dashboard, notifications] = await Promise.all([
        canAccess('DASHBOARD') ? getDashboardStats() : Promise.resolve(null),
        getNotifications(),
      ]);
      setStats(dashboard);
      setUnread(notifications.filter((item) => !item.read).length);
    } catch {
      setError('Certaines données ne sont pas disponibles pour le moment.');
    }
  }, [canAccess]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />}
    >
      <View style={styles.intro}>
        <Text style={styles.kicker}>{user ? ROLE_LABELS[user.role] : 'Entretien'}</Text>
        <Text style={styles.heading}>Vue d’ensemble</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {stats ? (
        <View style={styles.statsGrid}>
          <Metric label="Bons actifs" value={stats.activeWorkOrders} total={stats.totalWorkOrders} color={colors.blue} />
          <Metric label="Urgences actives" value={stats.activeUrgentWorkOrders} total={stats.urgentWorkOrders} color={colors.red} />
          <Metric label="Kilométrages" value={stats.mileageEntries} color={colors.green} />
          <Metric label="Non lues" value={unread} color={colors.amber} />
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Accès rapide</Text>
      <View style={styles.actions}>
        {canAccess('WORK_ORDERS') ? (
          <Action icon={ClipboardList} label="Bons de travail" detail="Consulter et mettre à jour" onPress={() => navigation.navigate('Orders')} />
        ) : null}
        {canAccess('URGENT_WORK_ORDERS') ? (
          <Action icon={Siren} label="Urgences" detail="Interventions prioritaires" color={colors.red} onPress={() => navigation.navigate('Urgent')} />
        ) : null}
        {canAccess('NOTIFICATIONS') ? (
          <Action icon={Bell} label="Notifications" detail={`${unread} non lue${unread === 1 ? '' : 's'}`} color={colors.amber} onPress={() => navigation.navigate('Notifications')} />
        ) : null}
        {canAccess('REP_TRIPS') ? (
          <Action icon={MapPinned} label="Trajets" detail="Kilométrage GPS" color={colors.teal} onPress={() => navigation.navigate('Trips')} />
        ) : null}
        {canAccess('REP_EXPENSES') ? (
          <Action icon={ReceiptText} label="Dépenses" detail="Reçus et remboursements" color={colors.green} onPress={() => navigation.navigate('Expenses')} />
        ) : null}
      </View>
    </ScrollView>
  );
}

function Metric({ label, value, total, color }: { label: string; value: number; total?: number; color: string }) {
  return (
    <View style={styles.metric}>
      <View style={[styles.metricMarker, { backgroundColor: color }]} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}{total !== undefined ? ` / ${total}` : ''}</Text>
    </View>
  );
}

function Action({
  icon: Icon,
  label,
  detail,
  color = colors.primary,
  onPress,
}: {
  icon: typeof Gauge;
  label: string;
  detail: string;
  color?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.action, pressed && styles.actionPressed]} onPress={onPress}>
      <View style={[styles.actionIcon, { borderColor: color }]}>
        <Icon size={22} color={color} />
      </View>
      <View style={styles.actionText}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionDetail}>{detail}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: 32 },
  intro: { backgroundColor: colors.charcoal, paddingHorizontal: 20, paddingBottom: 24, paddingTop: 22 },
  kicker: { color: '#9FD3BC', fontSize: 11, fontWeight: '800' },
  heading: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', marginTop: 5 },
  email: { color: '#CBD8D1', fontSize: 13, marginTop: 6 },
  error: { color: colors.red, fontSize: 13, marginHorizontal: 16, marginTop: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 },
  metric: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 104,
    padding: 14,
    width: '48%',
  },
  metricMarker: { borderRadius: 2, height: 4, marginBottom: 12, width: 28 },
  metricValue: { color: colors.text, fontSize: 27, fontWeight: '800' },
  metricLabel: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginHorizontal: 16, marginBottom: 8, marginTop: 8 },
  actions: { gap: 8, paddingHorizontal: 16 },
  action: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    padding: 13,
  },
  actionPressed: { backgroundColor: '#EFF5F1' },
  actionIcon: { alignItems: 'center', borderRadius: 7, borderWidth: 1, height: 42, justifyContent: 'center', width: 42 },
  actionText: { flex: 1 },
  actionLabel: { color: colors.text, fontSize: 15, fontWeight: '700' },
  actionDetail: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});