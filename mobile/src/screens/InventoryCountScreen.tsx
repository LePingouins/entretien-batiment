import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Check, Search } from 'lucide-react-native';
import { getInventorySession, getInventorySessionItems, recordInventoryCount } from '../lib/api';
import type { RootStackParamList } from '../navigation/types';
import type { InventoryCountItem, InventorySession } from '../types/api';
import { colors } from '../theme';
import { EmptyState, ErrorState, LoadingState } from '../components/ScreenState';

export default function InventoryCountScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'InventoryCount'>>();
  const [session, setSession] = useState<InventorySession | null>(null);
  const [items, setItems] = useState<InventoryCountItem[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [sessionData, itemData] = await Promise.all([getInventorySession(route.params.sessionId), getInventorySessionItems(route.params.sessionId)]);
      setSession(sessionData);
      setItems(itemData);
      setDrafts(Object.fromEntries(itemData.map((item) => [item.productId, item.countedQty?.toString() ?? ''])));
    } catch { setError('Cette session d’inventaire n’a pas pu être chargée.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [route.params.sessionId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function save(item: InventoryCountItem) {
    const value = Number((drafts[item.productId] || '').replace(',', '.'));
    if (!Number.isFinite(value) || value < 0) {
      Alert.alert('Quantité invalide', 'Entrez une quantité égale ou supérieure à zéro.');
      return;
    }
    setSavingId(item.productId);
    try {
      const updated = await recordInventoryCount(route.params.sessionId, item.productId, value);
      setItems((current) => current.map((candidate) => candidate.productId === item.productId ? updated : candidate));
    } catch { Alert.alert('Enregistrement impossible', 'La quantité n’a pas été enregistrée.'); }
    finally { setSavingId(null); }
  }

  if (loading) return <LoadingState label="Chargement du comptage..." />;
  if (!session || error) return <ErrorState message={error || 'Session introuvable.'} onRetry={() => void load()} />;

  const filtered = items.filter((item) => `${item.productSku} ${item.productName} ${item.zone || ''}`.toLowerCase().includes(query.toLowerCase()));
  const editable = session.status === 'IN_PROGRESS';

  return (
    <View style={styles.root}>
      <View style={styles.summary}><Text style={styles.summaryValue}>{items.filter((item) => item.countedQty !== undefined && item.countedQty !== null).length}/{items.length}</Text><Text style={styles.summaryLabel}> produits comptés · {session.discrepancyCount} écart{session.discrepancyCount === 1 ? '' : 's'}</Text></View>
      <View style={styles.search}><Search size={18} color={colors.textMuted} /><TextInput value={query} onChangeText={setQuery} placeholder="Produit, SKU ou zone" placeholderTextColor="#87938D" style={styles.searchInput} /></View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.productId)}
        contentContainerStyle={filtered.length === 0 ? styles.empty : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.itemTop}><View style={styles.itemBody}><Text style={styles.sku}>{item.productSku}</Text><Text style={styles.name}>{item.productName}</Text><Text style={styles.meta}>Attendu: {item.expectedQty} {item.unit}{item.zone ? ` · ${item.zone}` : ''}</Text></View>{item.countedQty !== undefined && item.countedQty !== null ? <Check size={20} color={colors.green} /> : null}</View>
            <View style={styles.countRow}>
              <TextInput editable={editable} value={drafts[item.productId] ?? ''} onChangeText={(value) => setDrafts((current) => ({ ...current, [item.productId]: value }))} keyboardType="decimal-pad" placeholder="Quantité comptée" placeholderTextColor="#87938D" style={[styles.countInput, !editable && styles.readOnly]} />
              {editable ? <Pressable style={[styles.save, savingId === item.productId && styles.disabled]} disabled={savingId === item.productId} onPress={() => void save(item)}><Text style={styles.saveText}>Valider</Text></Pressable> : null}
            </View>
            {item.discrepancy !== undefined && item.discrepancy !== null ? <Text style={[styles.discrepancy, item.discrepancy === 0 && styles.noDiscrepancy]}>Écart: {item.discrepancy > 0 ? '+' : ''}{item.discrepancy}</Text> : null}
          </View>
        )}
        ListEmptyComponent={<EmptyState title="Aucun produit" message="Aucun produit ne correspond à cette recherche." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, flex: 1 }, summary: { alignItems: 'baseline', backgroundColor: colors.charcoal, flexDirection: 'row', padding: 18 }, summaryValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' }, summaryLabel: { color: '#CBD8D1', fontSize: 11 }, search: { alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 9, paddingHorizontal: 15 }, searchInput: { color: colors.text, flex: 1, minHeight: 48 }, list: { paddingBottom: 25 }, empty: { flexGrow: 1 }, item: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, padding: 15 }, itemTop: { alignItems: 'center', flexDirection: 'row' }, itemBody: { flex: 1 }, sku: { color: colors.teal, fontSize: 10, fontWeight: '800' }, name: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 2 }, meta: { color: colors.textMuted, fontSize: 11, marginTop: 4 }, countRow: { flexDirection: 'row', gap: 9, marginTop: 11 }, countInput: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 7, borderWidth: 1, color: colors.text, flex: 1, minHeight: 43, paddingHorizontal: 11 }, readOnly: { color: colors.textMuted }, save: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 7, justifyContent: 'center', paddingHorizontal: 15 }, saveText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' }, disabled: { opacity: 0.5 }, discrepancy: { color: colors.red, fontSize: 11, fontWeight: '800', marginTop: 8 }, noDiscrepancy: { color: colors.green },
});