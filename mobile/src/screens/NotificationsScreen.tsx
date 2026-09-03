import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Bell, CheckCheck, ChevronRight, Trash2 } from 'lucide-react-native';
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../lib/api';
import type { RootStackParamList } from '../navigation/types';
import type { AppNotification } from '../types/api';
import { colors } from '../theme';
import { EmptyState, ErrorState, LoadingState } from '../components/ScreenState';
import { formatAppDate } from '../components/OrderCard';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

export default function NotificationsScreen({ navigation }: Props) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await getNotifications());
    } catch {
      setError('Les notifications n’ont pas pu être chargées.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function markAllRead() {
    try {
      await markAllNotificationsRead();
      setItems((current) => current.map((item) => ({ ...item, read: true })));
    } catch {
      Alert.alert('Action impossible', 'Les notifications n’ont pas été modifiées.');
    }
  }

  async function remove(item: AppNotification) {
    try {
      await deleteNotification(item.id);
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    } catch {
      Alert.alert('Suppression impossible', 'La notification n’a pas été supprimée.');
    }
  }

  async function open(item: AppNotification) {
    if (!item.read) {
      await markNotificationRead(item.id).catch(() => undefined);
      setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, read: true } : candidate));
    }

    const regularMatch = item.href?.match(/\/work-orders\/(\d+)/);
    const urgentMatch = item.href?.match(/\/urgent-work-orders\/(\d+)/);
    if (urgentMatch) {
      navigation.navigate('UrgentWorkOrderDetail', { id: Number(urgentMatch[1]) });
    } else if (regularMatch) {
      navigation.navigate('WorkOrderDetail', { id: Number(regularMatch[1]) });
    }
  }

  if (loading && items.length === 0) return <LoadingState label="Chargement des notifications..." />;
  if (error && items.length === 0) return <ErrorState message={error} onRetry={() => void load()} />;

  const unread = items.filter((item) => !item.read).length;

  return (
    <View style={styles.root}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, items.length === 0 && styles.emptyList]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={(
          <View style={styles.summary}>
            <View><Text style={styles.summaryValue}>{unread}</Text><Text style={styles.summaryLabel}>non lue{unread === 1 ? '' : 's'}</Text></View>
            {unread > 0 ? (
              <Pressable style={styles.markAllButton} onPress={() => void markAllRead()}>
                <CheckCheck size={17} color={colors.primary} />
                <Text style={styles.markAllText}>Tout marquer comme lu</Text>
              </Pressable>
            ) : null}
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable style={({ pressed }) => [styles.item, !item.read && styles.itemUnread, pressed && styles.itemPressed]} onPress={() => void open(item)}>
            <View style={[styles.icon, !item.read && styles.iconUnread]}>
              <Bell size={19} color={!item.read ? colors.primary : colors.textMuted} />
            </View>
            <View style={styles.itemBody}>
              <View style={styles.itemHeading}>
                <Text style={[styles.itemTitle, !item.read && styles.itemTitleUnread]} numberOfLines={2}>{item.title}</Text>
                {!item.read ? <View style={styles.unreadDot} /> : null}
              </View>
              <Text style={styles.message} numberOfLines={3}>{item.message}</Text>
              <Text style={styles.date}>{formatAppDate(item.date)}</Text>
            </View>
            <Pressable accessibilityLabel="Supprimer la notification" hitSlop={10} onPress={() => void remove(item)}>
              <Trash2 size={18} color={colors.textMuted} />
            </Pressable>
            {item.href ? <ChevronRight size={17} color={colors.textMuted} /> : null}
          </Pressable>
        )}
        ListEmptyComponent={<EmptyState title="Aucune notification" message="Les nouveaux événements apparaîtront ici." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, flex: 1 },
  list: { paddingBottom: 28 },
  emptyList: { flexGrow: 1 },
  summary: { alignItems: 'center', backgroundColor: colors.charcoal, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 15 },
  summaryValue: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  summaryLabel: { color: '#CBD8D1', fontSize: 11 },
  markAllButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 7, flexDirection: 'row', gap: 7, paddingHorizontal: 12, paddingVertical: 9 },
  markAllText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  item: { alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 10, padding: 15 },
  itemUnread: { backgroundColor: '#F0F8F4' },
  itemPressed: { opacity: 0.72 },
  icon: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 7, height: 38, justifyContent: 'center', width: 38 },
  iconUnread: { backgroundColor: '#DDF0E7' },
  itemBody: { flex: 1 },
  itemHeading: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  itemTitle: { color: colors.text, flexShrink: 1, fontSize: 14, fontWeight: '600' },
  itemTitleUnread: { fontWeight: '800' },
  unreadDot: { backgroundColor: colors.primary, borderRadius: 4, height: 7, width: 7 },
  message: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  date: { color: '#849189', fontSize: 10, marginTop: 6 },
});