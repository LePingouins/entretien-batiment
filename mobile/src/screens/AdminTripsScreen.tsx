import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Check, MapPinned, X } from 'lucide-react-native';
import { approveTrip, getPendingApprovalTrips, rejectTrip, type RepTrip } from '../lib/api';
import { colors } from '../theme';
import { EmptyState, ErrorState, LoadingState } from '../components/ScreenState';
import { formatAppDate } from '../components/OrderCard';
import { useLang } from '../context/LangContext';

function formatMoney(cents?: number | null): string {
  if (cents == null) return '—';
  return `${(cents / 100).toFixed(2)} $`;
}

export default function AdminTripsScreen() {
  const { t } = useLang();
  const [trips, setTrips] = useState<RepTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RepTrip | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      setTrips(await getPendingApprovalTrips());
    } catch {
      setError('Les trajets en attente n’ont pas pu être chargés.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function handleApprove(trip: RepTrip) {
    setProcessingId(trip.id);
    try {
      await approveTrip(trip.id);
      setTrips((prev) => prev.filter((t) => t.id !== trip.id));
    } catch {
      Alert.alert('Erreur', 'Impossible d’approuver ce trajet.');
    } finally {
      setProcessingId(null);
    }
  }

  function openReject(trip: RepTrip) {
    setRejectTarget(trip);
    setRejectNote('');
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    setProcessingId(rejectTarget.id);
    try {
      await rejectTrip(rejectTarget.id, rejectNote.trim() || undefined);
      setTrips((prev) => prev.filter((t) => t.id !== rejectTarget.id));
      setRejectTarget(null);
    } catch {
      Alert.alert('Erreur', 'Impossible de refuser ce trajet.');
    } finally {
      setProcessingId(null);
    }
  }

  if (loading && trips.length === 0) return <LoadingState label="Chargement des trajets en attente..." />;
  if (error && trips.length === 0) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <View style={styles.root}>
      <FlatList
        data={trips}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, trips.length === 0 && styles.emptyList]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        ListEmptyComponent={<EmptyState title={t.noPendingTrips} message={t.allTripsProcessed} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MapPinned size={17} color={colors.primary} />
              <Text style={styles.cardUser}>{item.userEmail || `Utilisateur #${item.id}`}</Text>
            </View>
            <Text style={styles.cardMeta}>{formatAppDate(item.date)} · {item.purpose || 'Sans motif'}</Text>
            <Text style={styles.cardAddress} numberOfLines={2}>{item.startAddress ?? '—'} → {item.endAddress ?? '—'}</Text>
            <View style={styles.cardStatsRow}>
              <Text style={styles.cardStat}>{item.totalKm != null ? `${item.totalKm} km` : '—'}</Text>
              <Text style={styles.cardStat}>{formatMoney(item.reimbursementCents)}</Text>
            </View>
            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.actionButton, styles.rejectButton]}
                disabled={processingId === item.id}
                onPress={() => openReject(item)}
              >
                <X size={16} color="#DC2626" />
                <Text style={styles.rejectText}>{t.reject}</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.approveButton]}
                disabled={processingId === item.id}
                onPress={() => void handleApprove(item)}
              >
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.approveText}>{processingId === item.id ? '...' : t.approve}</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <Modal visible={!!rejectTarget} transparent animationType="fade" onRequestClose={() => setRejectTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Refuser ce trajet</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Raison du refus (optionnel)"
              placeholderTextColor={colors.textMuted}
              value={rejectNote}
              onChangeText={setRejectNote}
              multiline
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setRejectTarget(null)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </Pressable>
              <Pressable style={styles.modalConfirm} onPress={() => void confirmReject()}>
                <Text style={styles.modalConfirmText}>Confirmer le refus</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, flex: 1 },
  list: { padding: 16 },
  emptyList: { flexGrow: 1 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, marginBottom: 12, padding: 15 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 5 },
  cardUser: { color: colors.text, fontSize: 15, fontWeight: '800' },
  cardMeta: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  cardAddress: { color: colors.charcoal, fontSize: 13, marginBottom: 8 },
  cardStatsRow: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  cardStat: { color: colors.green, fontSize: 14, fontWeight: '800' },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionButton: { alignItems: 'center', borderRadius: 8, flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', paddingVertical: 10 },
  rejectButton: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1 },
  rejectText: { color: '#DC2626', fontSize: 13, fontWeight: '700' },
  approveButton: { backgroundColor: colors.primary },
  approveText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  modalOverlay: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', flex: 1, justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 20, width: '100%' },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 14 },
  modalInput: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 8, borderWidth: 1, color: colors.text, minHeight: 80, padding: 12, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancel: { alignItems: 'center', borderColor: colors.border, borderRadius: 8, borderWidth: 1, flex: 1, paddingVertical: 12 },
  modalCancelText: { color: colors.textMuted, fontWeight: '700' },
  modalConfirm: { alignItems: 'center', backgroundColor: '#DC2626', borderRadius: 8, flex: 1, paddingVertical: 12 },
  modalConfirmText: { color: '#FFFFFF', fontWeight: '700' },
});
