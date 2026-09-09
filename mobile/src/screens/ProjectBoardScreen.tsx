import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus, Search } from 'lucide-react-native';
import { createProjectBoardTask, getProjectBoardTasks } from '../lib/api';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import type { ProjectBoardTask, WorkOrderStatus } from '../types/api';
import { colors } from '../theme';
import { useLang } from '../context/LangContext';
import { EmptyState, ErrorState, LoadingState } from '../components/ScreenState';
import { OrderCard } from '../components/OrderCard';
import OrderFormModal, { type OrderFormValue } from '../components/OrderFormModal';

type ProjectBoardNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'ProjectBoard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const FILTERS: Array<{ value?: WorkOrderStatus; label: string }> = [
  { label: 'Actives' },
  { value: 'OPEN', label: 'Ouvertes' },
  { value: 'ASSIGNED', label: 'Assignées' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'COMPLETED', label: 'Terminées' },
  { value: 'CANCELLED', label: 'Annulées' },
];

export default function ProjectBoardScreen() {
  const navigation = useNavigation<ProjectBoardNavigation>();
  const { t } = useLang();
  const [tasks, setTasks] = useState<ProjectBoardTask[]>([]);
  const [status, setStatus] = useState<WorkOrderStatus | undefined>();
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const response = await getProjectBoardTasks({ status, q: appliedQuery || undefined });
      const active = status ? response : response.filter((task) => !['COMPLETED', 'CANCELLED'].includes(task.status));
      setTasks(active);
    } catch {
      setError('Les tâches n’ont pas pu être chargées.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appliedQuery, status]);

  useFocusEffect(useCallback(() => { void load(true); }, [load]));

  async function create(value: OrderFormValue) {
    setSaving(true);
    try {
      await createProjectBoardTask(
        {
          title: value.title,
          description: value.description,
          location: value.location,
          priority: value.priority,
          dueDate: value.dueDate || null,
        },
        { photos: value.photos, invoice: value.invoice },
      );
      setFormVisible(false);
      await load();
    } catch {
      Alert.alert('Création impossible', 'Vérifiez les champs et votre connexion.');
    } finally {
      setSaving(false);
    }
  }

  if (loading && tasks.length === 0) return <LoadingState label="Chargement du tableau de projets..." />;
  if (error && tasks.length === 0) return <ErrorState message={error} onRetry={() => void load(true)} />;

  return (
    <View style={styles.root}>
      <FlatList
        data={tasks}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <OrderCard order={item} onPress={() => navigation.navigate('ProjectBoardTaskDetail', { id: item.id })} />
        )}
        refreshControl={(
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />
        )}
        contentContainerStyle={[styles.list, tasks.length === 0 && styles.emptyList]}
        ListHeaderComponent={(
          <View style={styles.controls}>
            <View style={styles.searchRow}>
              <Search size={19} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={() => setAppliedQuery(query.trim())}
                placeholder="Rechercher un titre ou un lieu"
                placeholderTextColor="#7C8B83"
                returnKeyType="search"
              />
              {query !== appliedQuery ? (
                <Pressable style={styles.searchButton} onPress={() => setAppliedQuery(query.trim())}>
                  <Text style={styles.searchButtonText}>Chercher</Text>
                </Pressable>
              ) : null}
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={FILTERS}
              keyExtractor={(item) => item.value || 'ACTIVE'}
              contentContainerStyle={styles.filters}
              renderItem={({ item }) => {
                const selected = item.value === status;
                return (
                  <Pressable style={[styles.filter, selected && styles.filterSelected]} onPress={() => setStatus(item.value)}>
                    <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{item.label}</Text>
                  </Pressable>
                );
              }}
            />
            {error ? <Text style={styles.inlineError}>{error}</Text> : null}
          </View>
        )}
        ListEmptyComponent={<EmptyState title={t.noProjectBoardTasks || 'Aucune tâche'} message="Créez une nouvelle tâche pour commencer." />}
      />
      <Pressable
        accessibilityLabel={t.newProjectBoardTask || 'Créer une tâche'}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => setFormVisible(true)}
      >
        <Plus size={26} color="#FFFFFF" />
      </Pressable>
      <OrderFormModal
        visible={formVisible}
        saving={saving}
        titleOverride={t.newProjectBoardTask}
        onClose={() => setFormVisible(false)}
        onSubmit={create}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, flex: 1 },
  list: { paddingBottom: 92 },
  emptyList: { flexGrow: 1 },
  controls: { paddingBottom: 4 },
  searchRow: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 9, margin: 14, marginBottom: 8, paddingHorizontal: 13, paddingVertical: 10 },
  searchInput: { color: colors.text, flex: 1, fontSize: 14 },
  searchButton: { backgroundColor: colors.primary, borderRadius: 7, paddingHorizontal: 11, paddingVertical: 6 },
  searchButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  filters: { gap: 8, paddingHorizontal: 14, paddingBottom: 10 },
  filter: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 },
  filterSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  filterTextSelected: { color: '#FFFFFF' },
  inlineError: { color: colors.red, fontSize: 12, marginHorizontal: 14, marginBottom: 6 },
  fab: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 26, bottom: 20, elevation: 5, height: 52, justifyContent: 'center', position: 'absolute', right: 20, width: 52 },
  fabPressed: { opacity: 0.85 },
});
