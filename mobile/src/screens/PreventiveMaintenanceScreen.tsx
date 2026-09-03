import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Check, RotateCcw, Wrench } from 'lucide-react-native';
import { completePreventiveTask, getPreventiveTasks, uncompletePreventiveTask } from '../lib/api';
import type { PreventiveTask, TaskFrequency, TaskSite } from '../types/api';
import { colors } from '../theme';
import { EmptyState, ErrorState, LoadingState } from '../components/ScreenState';
import { formatAppDate } from '../components/OrderCard';

const FREQUENCIES: Record<TaskFrequency, string> = {
  DAILY: 'Chaque jour',
  WEEKLY: 'Chaque semaine',
  MONTHLY: 'Chaque mois',
  QUARTERLY: 'Tous les 3 mois',
  SEMI_ANNUAL: 'Tous les 6 mois',
  YEARLY: 'Chaque année',
};

export default function PreventiveMaintenanceScreen() {
  const [tasks, setTasks] = useState<PreventiveTask[]>([]);
  const [site, setSite] = useState<TaskSite>('INEWA');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try { setTasks(await getPreventiveTasks()); }
    catch { setError('Les tâches préventives n’ont pas pu être chargées.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function toggle(task: PreventiveTask) {
    setBusyId(task.id);
    try {
      if (task.isDue) {
        const updated = await completePreventiveTask(task.id);
        setTasks((current) => current.map((candidate) => candidate.id === task.id ? updated : candidate));
      } else if (task.lastCompletionId) {
        await uncompletePreventiveTask(task.id, task.lastCompletionId);
        await load();
      }
    } catch {
      Alert.alert('Action impossible', 'La tâche n’a pas été modifiée.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading && tasks.length === 0) return <LoadingState label="Chargement de l’entretien préventif..." />;
  if (error && tasks.length === 0) return <ErrorState message={error} onRetry={() => void load()} />;

  const filtered = tasks.filter((task) => task.site === site).sort((a, b) => a.displayOrder - b.displayOrder);
  const due = filtered.filter((task) => task.isDue).length;

  return (
    <FlatList
      style={styles.root}
      data={filtered}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={[styles.list, filtered.length === 0 && styles.emptyList]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
      ListHeaderComponent={(
        <View>
          <View style={styles.hero}><Wrench size={23} color="#9FD3BC" /><View><Text style={styles.heroValue}>{due}</Text><Text style={styles.heroLabel}>tâche{due === 1 ? '' : 's'} à effectuer</Text></View></View>
          <View style={styles.segments}>
            <Segment label="INEWA" selected={site === 'INEWA'} onPress={() => setSite('INEWA')} />
            <Segment label="DHN · Horizon Nature" selected={site === 'HORIZON_NATURE'} onPress={() => setSite('HORIZON_NATURE')} />
          </View>
        </View>
      )}
      renderItem={({ item }) => (
        <Pressable style={({ pressed }) => [styles.item, !item.isDue && styles.itemDone, pressed && styles.itemPressed]} disabled={busyId === item.id} onPress={() => void toggle(item)}>
          <View style={[styles.check, !item.isDue && styles.checkDone]}>{item.isDue ? null : <Check size={17} color="#FFFFFF" />}</View>
          <View style={styles.itemBody}>
            <Text style={[styles.name, !item.isDue && styles.nameDone]}>#{item.displayOrder} · {item.name}</Text>
            <Text style={styles.frequency}>{FREQUENCIES[item.frequency]}</Text>
            {!item.isDue && item.lastCompletedAt ? <Text style={styles.completed}>Terminé le {formatAppDate(item.lastCompletedAt)}{item.lastCompletedByEmail ? ` · ${item.lastCompletedByEmail}` : ''}</Text> : null}
          </View>
          {!item.isDue ? <RotateCcw size={18} color={colors.textMuted} /> : null}
        </Pressable>
      )}
      ListEmptyComponent={<EmptyState title="Aucune tâche" message="Aucune tâche préventive n’est configurée pour ce site." />}
    />
  );
}

function Segment({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable style={[styles.segment, selected && styles.segmentSelected]} onPress={onPress}><Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, flex: 1 },
  list: { paddingBottom: 30 },
  emptyList: { flexGrow: 1 },
  hero: { alignItems: 'center', backgroundColor: colors.charcoal, flexDirection: 'row', gap: 12, padding: 18 },
  heroValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  heroLabel: { color: '#CBD8D1', fontSize: 11 },
  segments: { backgroundColor: colors.surface, flexDirection: 'row', gap: 8, padding: 12 },
  segment: { alignItems: 'center', borderColor: colors.border, borderRadius: 7, borderWidth: 1, flex: 1, padding: 10 },
  segmentSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  segmentTextSelected: { color: '#FFFFFF' },
  item: { alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 12, padding: 15 },
  itemDone: { backgroundColor: '#F4F7F5' },
  itemPressed: { opacity: 0.7 },
  check: { borderColor: colors.primary, borderRadius: 12, borderWidth: 2, height: 24, width: 24 },
  checkDone: { alignItems: 'center', backgroundColor: colors.green, borderColor: colors.green, justifyContent: 'center' },
  itemBody: { flex: 1 },
  name: { color: colors.text, fontSize: 14, fontWeight: '700', lineHeight: 19 },
  nameDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  frequency: { color: colors.amber, fontSize: 11, fontWeight: '700', marginTop: 4 },
  completed: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
});