import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Archive, Gauge, Pencil, Plus, X } from 'lucide-react-native';
import { archiveMileageEntry, createMileageEntry, getMileageEntries, updateMileageEntry } from '../lib/api';
import type { MileageEntry, MileageEntryInput } from '../types/api';
import { colors } from '../theme';
import { EmptyState, ErrorState, LoadingState } from '../components/ScreenState';
import { formatAppDate } from '../components/OrderCard';

function emptyInput(): MileageEntryInput {
  return {
    date: new Date().toISOString().slice(0, 10),
    supplier: '',
    startKm: null,
    endKm: null,
    workOrderId: null,
    urgentWorkOrderId: null,
  };
}

export default function MileageScreen() {
  const [entries, setEntries] = useState<MileageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<MileageEntry | null>(null);
  const [form, setForm] = useState<MileageEntryInput>(emptyInput());
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setEntries(await getMileageEntries());
    } catch {
      setError('Les entrées de kilométrage n’ont pas pu être chargées.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function openCreate() {
    setEditing(null);
    setForm(emptyInput());
    setVisible(true);
  }

  function openEdit(entry: MileageEntry) {
    setEditing(entry);
    setForm({
      date: entry.date,
      supplier: entry.supplier || '',
      startKm: entry.startKm,
      endKm: entry.endKm,
      workOrderId: entry.workOrderId,
      urgentWorkOrderId: entry.urgentWorkOrderId,
    });
    setVisible(true);
  }

  async function save() {
    if (!form.date || !form.supplier.trim() || form.startKm === null || form.endKm === null) {
      Alert.alert('Champs requis', 'La date, le fournisseur et les deux relevés sont requis.');
      return;
    }
    if (form.endKm < form.startKm) {
      Alert.alert('Kilométrage invalide', 'Le relevé de fin doit être supérieur au relevé de départ.');
      return;
    }
    setSaving(true);
    try {
      if (editing) await updateMileageEntry(editing.id, form);
      else await createMileageEntry(form);
      setVisible(false);
      await load();
    } catch {
      Alert.alert('Enregistrement impossible', 'L’entrée n’a pas été enregistrée.');
    } finally {
      setSaving(false);
    }
  }

  function confirmArchive(entry: MileageEntry) {
    Alert.alert('Archiver cette entrée?', `${entry.supplier} · ${entry.totalKm ?? 0} km`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Archiver', style: 'destructive', onPress: () => void archiveMileageEntry(entry.id).then(load) },
    ]);
  }

  if (loading && entries.length === 0) return <LoadingState label="Chargement du kilométrage..." />;
  if (error && entries.length === 0) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <View style={styles.root}>
      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, entries.length === 0 && styles.emptyList]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={(
          <View style={styles.summary}>
            <Gauge size={23} color="#9FD3BC" />
            <View><Text style={styles.summaryValue}>{entries.reduce((sum, entry) => sum + (entry.totalKm ?? Math.max(0, (entry.endKm ?? 0) - (entry.startKm ?? 0))), 0)} km</Text><Text style={styles.summaryLabel}>total affiché</Text></View>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.itemBody}>
              <Text style={styles.supplier}>{item.supplier || 'Sans fournisseur'}</Text>
              <Text style={styles.meta}>{formatAppDate(item.date)} · {item.startKm ?? '—'} → {item.endKm ?? '—'}</Text>
              <Text style={styles.total}>{item.totalKm ?? Math.max(0, (item.endKm ?? 0) - (item.startKm ?? 0))} km</Text>
            </View>
            <Pressable accessibilityLabel="Modifier" hitSlop={10} onPress={() => openEdit(item)}><Pencil size={19} color={colors.primary} /></Pressable>
            <Pressable accessibilityLabel="Archiver" hitSlop={10} onPress={() => confirmArchive(item)}><Archive size={19} color={colors.textMuted} /></Pressable>
          </View>
        )}
        ListEmptyComponent={<EmptyState title="Aucun kilométrage" message="Créez une entrée avec le bouton d’ajout." />}
      />
      <Pressable accessibilityLabel="Ajouter un kilométrage" style={styles.fab} onPress={openCreate}><Plus size={26} color="#FFFFFF" /></Pressable>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVisible(false)}>
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editing ? 'Modifier le kilométrage' : 'Nouveau kilométrage'}</Text>
            <Pressable accessibilityLabel="Fermer" onPress={() => setVisible(false)}><X size={24} color={colors.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <FormField label="Date" value={form.date} onChangeText={(date) => setForm({ ...form, date })} placeholder="AAAA-MM-JJ" />
            <FormField label="Fournisseur ou véhicule" value={form.supplier} onChangeText={(supplier) => setForm({ ...form, supplier })} placeholder="Nom" />
            <FormField label="Kilométrage de départ" value={form.startKm?.toString() ?? ''} onChangeText={(value) => setForm({ ...form, startKm: toNumber(value) })} keyboardType="numeric" />
            <FormField label="Kilométrage de fin" value={form.endKm?.toString() ?? ''} onChangeText={(value) => setForm({ ...form, endKm: toNumber(value) })} keyboardType="numeric" />
            <Pressable style={[styles.saveButton, saving && styles.disabled]} disabled={saving} onPress={() => void save()}>
              <Text style={styles.saveText}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function toNumber(value: string): number | null {
  const parsed = Number(value.replace(',', '.'));
  return value.trim() && Number.isFinite(parsed) ? parsed : null;
}

function FormField(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...input } = props;
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...input} style={styles.input} placeholderTextColor="#87938D" /></View>;
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, flex: 1 },
  list: { paddingBottom: 90 },
  emptyList: { flexGrow: 1 },
  summary: { alignItems: 'center', backgroundColor: colors.charcoal, flexDirection: 'row', gap: 12, padding: 18 },
  summaryValue: { color: '#FFFFFF', fontSize: 21, fontWeight: '800' },
  summaryLabel: { color: '#CBD8D1', fontSize: 11 },
  item: { alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 17, padding: 16 },
  itemBody: { flex: 1 },
  supplier: { color: colors.text, fontSize: 15, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  total: { color: colors.green, fontSize: 13, fontWeight: '800', marginTop: 5 },
  fab: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 26, bottom: 20, elevation: 5, height: 52, justifyContent: 'center', position: 'absolute', right: 20, width: 52 },
  modal: { backgroundColor: colors.background, flex: 1 },
  modalHeader: { alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: 18 },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  form: { padding: 20 },
  field: { marginBottom: 16 },
  label: { color: colors.charcoal, fontSize: 13, fontWeight: '700', marginBottom: 7 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 7, borderWidth: 1, color: colors.text, fontSize: 16, minHeight: 48, paddingHorizontal: 13 },
  saveButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 7, marginTop: 8, padding: 14 },
  saveText: { color: '#FFFFFF', fontWeight: '800' },
  disabled: { opacity: 0.55 },
});