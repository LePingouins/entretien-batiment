import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Check, ShoppingCart } from 'lucide-react-native';
import { getShoppingList, setShoppingItemBought } from '../lib/api';
import type { ShoppingListItem } from '../types/api';
import { colors } from '../theme';
import { EmptyState, ErrorState, LoadingState } from '../components/ScreenState';

export default function ShoppingListScreen() {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await getShoppingList();
      setItems(response.items.sort((a, b) => Number(a.bought) - Number(b.bought)));
    } catch {
      setError('La liste d’achats n’a pas pu être chargée.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function toggle(item: ShoppingListItem) {
    setBusyId(item.materialId);
    try {
      await setShoppingItemBought(item, !item.bought);
      setItems((current) => current.map((candidate) => candidate.materialId === item.materialId && candidate.workOrderType === item.workOrderType
        ? { ...candidate, bought: !candidate.bought }
        : candidate));
    } catch {
      Alert.alert('Mise à jour impossible', 'L’article n’a pas été modifié.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading && items.length === 0) return <LoadingState label="Chargement de la liste..." />;
  if (error && items.length === 0) return <ErrorState message={error} onRetry={() => void load()} />;

  const bought = items.filter((item) => item.bought).length;
  return (
    <FlatList
      style={styles.root}
      data={items}
      keyExtractor={(item) => `${item.workOrderType}-${item.materialId}`}
      contentContainerStyle={[styles.list, items.length === 0 && styles.emptyList]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
      ListHeaderComponent={<View style={styles.summary}><ShoppingCart size={23} color="#9FD3BC" /><Text style={styles.summaryText}>{items.length - bought} à acheter · {bought} terminé{bought === 1 ? '' : 's'}</Text></View>}
      renderItem={({ item }) => (
        <Pressable style={({ pressed }) => [styles.item, pressed && styles.itemPressed]} disabled={busyId === item.materialId} onPress={() => void toggle(item)}>
          <View style={[styles.checkbox, item.bought && styles.checkboxChecked]}>{item.bought ? <Check size={16} color="#FFFFFF" /> : null}</View>
          <View style={styles.itemBody}>
            <Text style={[styles.name, item.bought && styles.nameBought]}>{item.name}{item.quantity ? ` · ${item.quantity}` : ''}</Text>
            <Text style={styles.order} numberOfLines={1}>{item.workOrderTitle}</Text>
            {item.supplier ? <Text style={styles.supplier}>{item.supplier}</Text> : null}
          </View>
          <View style={[styles.kind, item.workOrderType === 'URGENT' && styles.kindUrgent]}><Text style={[styles.kindText, item.workOrderType === 'URGENT' && styles.kindTextUrgent]}>{item.workOrderType === 'URGENT' ? 'Urgent' : 'Régulier'}</Text></View>
        </Pressable>
      )}
      ListEmptyComponent={<EmptyState title="Liste vide" message="Les matériaux ajoutés aux bons de travail apparaîtront ici." />}
    />
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, flex: 1 },
  list: { paddingBottom: 30 },
  emptyList: { flexGrow: 1 },
  summary: { alignItems: 'center', backgroundColor: colors.charcoal, flexDirection: 'row', gap: 11, padding: 18 },
  summaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  item: { alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 12, padding: 15 },
  itemPressed: { backgroundColor: '#EFF5F1' },
  checkbox: { alignItems: 'center', borderColor: colors.textMuted, borderRadius: 5, borderWidth: 1.5, height: 24, justifyContent: 'center', width: 24 },
  checkboxChecked: { backgroundColor: colors.green, borderColor: colors.green },
  itemBody: { flex: 1 },
  name: { color: colors.text, fontSize: 14, fontWeight: '700' },
  nameBought: { color: colors.textMuted, textDecorationLine: 'line-through' },
  order: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  supplier: { color: colors.teal, fontSize: 11, marginTop: 2 },
  kind: { backgroundColor: colors.surfaceMuted, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  kindUrgent: { backgroundColor: '#FBE7E5' },
  kindText: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  kindTextUrgent: { color: colors.red },
});