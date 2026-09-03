import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus, Search } from 'lucide-react-native';
import { createWorkOrder, getWorkOrders } from '../lib/api';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import type { WorkOrder, WorkOrderStatus } from '../types/api';
import { colors } from '../theme';
import { EmptyState, ErrorState, LoadingState } from '../components/ScreenState';
import { OrderCard } from '../components/OrderCard';
import OrderFormModal, { type OrderFormValue } from '../components/OrderFormModal';

type OrdersNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Orders'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const FILTERS: Array<{ value?: WorkOrderStatus; label: string }> = [
  { label: 'Actifs' },
  { value: 'OPEN', label: 'Ouverts' },
  { value: 'ASSIGNED', label: 'Assignés' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'COMPLETED', label: 'Terminés' },
];

export default function WorkOrdersScreen() {
  const navigation = useNavigation<OrdersNavigation>();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
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
      const response = await getWorkOrders({ status, q: appliedQuery || undefined });
      const active = status ? response.content : response.content.filter((order) => !['COMPLETED', 'CANCELLED'].includes(order.status));
      setOrders(active);
    } catch {
      setError('Les bons de travail n’ont pas pu être chargés.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appliedQuery, status]);

  useFocusEffect(useCallback(() => {
    void load(true);
  }, [load]));

  async function create(value: OrderFormValue) {
    setSaving(true);
    try {
      await createWorkOrder(
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

  if (loading && orders.length === 0) return <LoadingState label="Chargement des bons de travail..." />;
  if (error && orders.length === 0) return <ErrorState message={error} onRetry={() => void load(true)} />;

  return (
    <View style={styles.root}>
      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <OrderCard order={item} onPress={() => navigation.navigate('WorkOrderDetail', { id: item.id })} />
        )}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); void load(); }}
            tintColor={colors.primary}
          />
        )}
        contentContainerStyle={[styles.list, orders.length === 0 && styles.emptyList]}
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
        ListEmptyComponent={<EmptyState title="Aucun bon de travail" message="Modifiez les filtres ou créez une nouvelle demande." />}
      />
      <Pressable
        accessibilityLabel="Créer un bon de travail"
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => setFormVisible(true)}
      >
        <Plus size={26} color="#FFFFFF" />
      </Pressable>
      <OrderFormModal visible={formVisible} saving={saving} onClose={() => setFormVisible(false)} onSubmit={create} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, flex: 1 },
  list: { paddingBottom: 92 },
  emptyList: { flexGrow: 1 },
  controls: { paddingBottom: 6 },
  searchRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  searchInput: { color: colors.text, flex: 1, fontSize: 15, minHeight: 38 },
  searchButton: { backgroundColor: colors.charcoal, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8 },
  searchButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  filters: { gap: 7, paddingHorizontal: 16, paddingVertical: 11 },
  filter: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  filterSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  filterTextSelected: { color: '#FFFFFF' },
  inlineError: { color: colors.red, fontSize: 12, marginHorizontal: 16, marginBottom: 8 },
  fab: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 26,
    bottom: 20,
    elevation: 5,
    height: 52,
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
    width: 52,
  },
  fabPressed: { backgroundColor: colors.primaryPressed },
});