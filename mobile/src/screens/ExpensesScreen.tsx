import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import {
  Expense,
  ExpenseRequest,
  getMyExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  uploadExpenseReceipt,
} from '../lib/api';

interface Props {
  onLogout: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMoney(cents?: number | null): string {
  if (cents == null) return '—';
  return `${(cents / 100).toFixed(2)} $`;
}

function statusLabel(s: string): string {
  if (s === 'APPROVED') return '✓ Approuvée';
  if (s === 'REJECTED') return '✗ Refusée';
  return '⏳ En attente';
}

function statusColor(s: string): string {
  if (s === 'APPROVED') return '#16A34A';
  if (s === 'REJECTED') return '#DC2626';
  return '#CA8A04';
}

// Parse "12.34" or "12,34" → cents (1234). Empty → undefined.
function parseDollarsToCents(s: string): number | undefined {
  const t = s.replace(',', '.').trim();
  if (!t) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n * 100);
}

function centsToDollarsStr(cents?: number | null): string {
  if (cents == null) return '';
  return (cents / 100).toFixed(2);
}

export default function ExpensesScreen({ onLogout }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit / create modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [date, setDate] = useState(todayIso());
  const [supplier, setSupplier] = useState('');
  const [description, setDescription] = useState('');
  const [subtotalStr, setSubtotalStr] = useState('');
  const [tpsStr, setTpsStr] = useState('');
  const [tvqStr, setTvqStr] = useState('');
  const [tipStr, setTipStr] = useState('');
  const [totalStr, setTotalStr] = useState('');
  const [notes, setNotes] = useState('');

  // Pending receipt to upload after creation
  const [pendingReceiptUri, setPendingReceiptUri] = useState<string | null>(null);
  const [existingReceipts, setExistingReceipts] = useState<Expense['receipts']>([]);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const list = await getMyExpenses();
      setExpenses(list);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger les dépenses.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function resetForm() {
    setEditingId(null);
    setDate(todayIso());
    setSupplier('');
    setDescription('');
    setSubtotalStr('');
    setTpsStr('');
    setTvqStr('');
    setTipStr('');
    setTotalStr('');
    setNotes('');
    setPendingReceiptUri(null);
    setExistingReceipts([]);
  }

  function openCreate() {
    resetForm();
    setModalVisible(true);
  }

  function openEdit(e: Expense) {
    setEditingId(e.id);
    setDate(e.date);
    setSupplier(e.supplier ?? '');
    setDescription(e.description ?? '');
    setSubtotalStr(centsToDollarsStr(e.subtotalCents));
    setTpsStr(centsToDollarsStr(e.tpsCents));
    setTvqStr(centsToDollarsStr(e.tvqCents));
    setTipStr(centsToDollarsStr(e.tipCents));
    setTotalStr(centsToDollarsStr(e.totalCents));
    setNotes(e.notes ?? '');
    setPendingReceiptUri(null);
    setExistingReceipts(e.receipts);
    setModalVisible(true);
  }

  async function pickReceiptFromCamera() {
    try {
      const ImagePicker = require('expo-image-picker');
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission requise', 'Autorisez l’appareil photo pour prendre une facture.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 'Images',
        quality: 0.7,
        allowsEditing: false,
      });
      if (result?.canceled) return;
      const uri = result?.assets?.[0]?.uri ?? null;
      if (uri) setPendingReceiptUri(uri);
    } catch {
      Alert.alert('Module manquant', 'expo-image-picker n’est pas installé dans ce build.');
    }
  }

  async function pickReceiptFromLibrary() {
    try {
      const ImagePicker = require('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission requise', 'Autorisez la galerie pour choisir une facture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 'Images',
        quality: 0.7,
        allowsEditing: false,
      });
      if (result?.canceled) return;
      const uri = result?.assets?.[0]?.uri ?? null;
      if (uri) setPendingReceiptUri(uri);
    } catch {
      Alert.alert('Module manquant', 'expo-image-picker n’est pas installé dans ce build.');
    }
  }

  async function handleSave() {
    if (!date) {
      Alert.alert('Date requise', 'Veuillez sélectionner une date.');
      return;
    }
    const req: ExpenseRequest = {
      date,
      supplier: supplier.trim() || undefined,
      description: description.trim() || undefined,
      subtotalCents: parseDollarsToCents(subtotalStr),
      tpsCents: parseDollarsToCents(tpsStr),
      tvqCents: parseDollarsToCents(tvqStr),
      tipCents: parseDollarsToCents(tipStr),
      totalCents: parseDollarsToCents(totalStr),
      notes: notes.trim() || undefined,
    };
    setSaving(true);
    try {
      let saved: Expense;
      if (editingId == null) {
        saved = await createExpense(req);
      } else {
        saved = await updateExpense(editingId, req);
      }
      // Upload pending receipt if any
      if (pendingReceiptUri) {
        try {
          setUploadingReceipt(true);
          saved = await uploadExpenseReceipt(saved.id, pendingReceiptUri);
        } catch (err: any) {
          Alert.alert('Photo non envoyée', err?.response?.data?.error || 'Échec de l’envoi de la photo.');
        } finally {
          setUploadingReceipt(false);
        }
      }
      setExpenses((prev) => {
        const idx = prev.findIndex((x) => x.id === saved.id);
        if (idx === -1) return [saved, ...prev];
        const next = [...prev];
        next[idx] = saved;
        return next;
      });
      setModalVisible(false);
      resetForm();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.error || 'Impossible d’enregistrer.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(e: Expense) {
    Alert.alert(
      'Supprimer cette dépense ?',
      e.supplier || e.description || 'Dépense',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(e.id);
              setExpenses((prev) => prev.filter((x) => x.id !== e.id));
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer.');
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1D4ED8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Dépenses</Text>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.newButton} onPress={openCreate}>
        <Text style={styles.newButtonText}>+ Nouvelle dépense</Text>
      </TouchableOpacity>

      {expenses.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucune dépense pour l’instant.</Text>
          <Text style={styles.emptyHint}>Appuyez sur « + Nouvelle dépense » pour commencer.</Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => openEdit(item)}>
              <View style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardSupplier}>{item.supplier || 'Sans fournisseur'}</Text>
                  <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
                  {!!item.description && (
                    <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.cardTotal}>{fmtMoney(item.totalCents)}</Text>
                  <Text style={[styles.cardStatus, { color: statusColor(item.status) }]}>
                    {statusLabel(item.status)}
                  </Text>
                </View>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.cardMeta}>
                  📎 {item.receipts.length} photo{item.receipts.length !== 1 ? 's' : ''}
                </Text>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  {item.status === 'PENDING' && (
                    <TouchableOpacity onPress={() => confirmDelete(item)}>
                      <Text style={styles.actionDelete}>Supprimer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Create / Edit modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={false} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} disabled={saving}>
              <Text style={styles.modalCancel}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingId == null ? 'Nouvelle dépense' : 'Modifier'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.modalSave, saving && { opacity: 0.5 }]}>
                {saving ? '…' : 'Sauver'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
            {/* Receipt photo block */}
            <View style={styles.receiptBox}>
              <Text style={styles.fieldLabel}>Facture</Text>
              {pendingReceiptUri ? (
                <View>
                  <Image source={{ uri: pendingReceiptUri }} style={styles.receiptPreview} resizeMode="contain" />
                  <TouchableOpacity onPress={() => setPendingReceiptUri(null)} style={styles.removePhotoBtn}>
                    <Text style={styles.removePhotoText}>Retirer la photo</Text>
                  </TouchableOpacity>
                </View>
              ) : existingReceipts.length > 0 ? (
                <Text style={styles.existingReceiptsHint}>
                  {existingReceipts.length} photo{existingReceipts.length !== 1 ? 's' : ''} déjà attachée{existingReceipts.length !== 1 ? 's' : ''}.
                </Text>
              ) : (
                <Text style={styles.existingReceiptsHint}>Aucune photo.</Text>
              )}

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity style={styles.photoBtn} onPress={pickReceiptFromCamera}>
                  <Text style={styles.photoBtnText}>📷 Caméra</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.photoBtn, { backgroundColor: '#475569' }]} onPress={pickReceiptFromLibrary}>
                  <Text style={styles.photoBtnText}>🖼️ Galerie</Text>
                </TouchableOpacity>
              </View>
              {uploadingReceipt && (
                <Text style={styles.existingReceiptsHint}>Envoi de la photo…</Text>
              )}
            </View>

            <View>
              <Text style={styles.fieldLabel}>Date *</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                autoCapitalize="none"
              />
            </View>

            <View>
              <Text style={styles.fieldLabel}>Fournisseur</Text>
              <TextInput
                value={supplier}
                onChangeText={setSupplier}
                placeholder="ex. Home Depot"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />
            </View>

            <View>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Détails de l’achat"
                placeholderTextColor="#94A3B8"
                style={[styles.input, { minHeight: 60 }]}
                multiline
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Sous-total ($)</Text>
                <TextInput
                  value={subtotalStr}
                  onChangeText={setSubtotalStr}
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Total ($) *</Text>
                <TextInput
                  value={totalStr}
                  onChangeText={setTotalStr}
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>TPS ($)</Text>
                <TextInput
                  value={tpsStr}
                  onChangeText={setTpsStr}
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>TVQ ($)</Text>
                <TextInput
                  value={tvqStr}
                  onChangeText={setTvqStr}
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Pourboire ($)</Text>
                <TextInput
                  value={tipStr}
                  onChangeText={setTipStr}
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View>
              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes optionnelles"
                placeholderTextColor="#94A3B8"
                style={[styles.input, { minHeight: 60 }]}
                multiline
              />
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1D4ED8',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  logoutText: { color: '#fff', fontSize: 14, opacity: 0.9 },
  newButton: {
    margin: 16,
    backgroundColor: '#1D4ED8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  newButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#475569', fontSize: 15, marginBottom: 4 },
  emptyHint: { color: '#94A3B8', fontSize: 13 },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cardSupplier: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  cardDate: { fontSize: 12, color: '#64748B', marginTop: 2 },
  cardDesc: { fontSize: 13, color: '#475569', marginTop: 4 },
  cardTotal: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  cardStatus: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  cardMeta: { fontSize: 12, color: '#64748B' },
  actionDelete: { fontSize: 13, color: '#DC2626', fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: '#F1F5F9' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  modalCancel: { fontSize: 16, color: '#475569' },
  modalSave: { fontSize: 16, color: '#1D4ED8', fontWeight: '700' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4 },
  input: {
    backgroundColor: '#fff',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 15,
    color: '#0F172A',
  },
  receiptBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  receiptPreview: {
    width: '100%',
    height: 220,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  removePhotoBtn: { alignSelf: 'flex-start', marginTop: 6 },
  removePhotoText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  existingReceiptsHint: { color: '#64748B', fontSize: 13, marginTop: 4 },
  photoBtn: {
    flex: 1,
    backgroundColor: '#1D4ED8',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  photoBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
