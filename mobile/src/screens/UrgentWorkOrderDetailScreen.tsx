import React, { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CalendarDays, MapPin, Package, Paperclip, Pencil, ReceiptText, UserRound } from 'lucide-react-native';
import { getUrgentWorkOrder, updateUrgentWorkOrder } from '../lib/api';
import type { RootStackParamList } from '../navigation/types';
import type { UrgentWorkOrder, WorkOrderStatus } from '../types/api';
import { colors } from '../theme';
import { ErrorState, LoadingState } from '../components/ScreenState';
import { formatAppDate, PriorityPill, StatusPill } from '../components/OrderCard';
import OrderFormModal, { type OrderFormValue } from '../components/OrderFormModal';
import { openSecureFile } from '../lib/secureFile';
import { useLang } from '../context/LangContext';

type Props = NativeStackScreenProps<RootStackParamList, 'UrgentWorkOrderDetail'>;

const STATUSES: Array<{ value: WorkOrderStatus; label: string }> = [
  { value: 'OPEN', label: 'Ouverte' },
  { value: 'ASSIGNED', label: 'Assignée' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'COMPLETED', label: 'Terminée' },
  { value: 'CANCELLED', label: 'Annulée' },
];

export default function UrgentWorkOrderDetailScreen({ route, navigation }: Props) {
  const { t } = useLang();
  const [order, setOrder] = useState<UrgentWorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingStatus, setSavingStatus] = useState<WorkOrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await getUrgentWorkOrder(route.params.id);
      setOrder(result);
      navigation.setOptions({ title: `Urgence #${result.id}` });
    } catch {
      setError('Cette urgence est introuvable ou inaccessible.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation, route.params.id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function changeStatus(status: WorkOrderStatus) {
    if (!order || status === order.status) return;
    setSavingStatus(status);
    try {
      setOrder(await updateUrgentWorkOrder(order.id, { status }));
    } catch {
      Alert.alert('Mise à jour impossible', 'Le statut n’a pas été modifié.');
    } finally {
      setSavingStatus(null);
    }
  }

  async function saveEdit(value: OrderFormValue) {
    if (!order) return;
    setSavingEdit(true);
    try {
      const updated = await updateUrgentWorkOrder(
        order.id,
        {
          title: value.title,
          description: value.description,
          location: value.location,
          priority: value.priority,
          dueDate: value.dueDate || null,
        },
        {
          photos: value.photos,
          invoice: value.invoice,
          removeAttachment: value.removeAttachment,
          removeInvoice: value.removeInvoice,
        },
      );
      setOrder(updated);
      setEditVisible(false);
    } catch {
      Alert.alert('Mise à jour impossible', 'Vérifiez les champs et votre connexion.');
    } finally {
      setSavingEdit(false);
    }
  }

  if (loading) return <LoadingState label="Chargement de l’urgence..." />;
  if (!order || error) return <ErrorState message={error || 'Urgence indisponible.'} onRetry={() => void load()} />;

  const materials = Array.isArray(order.materialsPreview)
    ? order.materialsPreview
    : order.materialsPreview?.split(/,\s*/).filter(Boolean) || [];

  return (
    <>
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.red} />}
    >
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.id}>INTERVENTION PRIORITAIRE #{order.id}</Text>
          <Pressable accessibilityLabel={t.edit} style={styles.editButton} onPress={() => setEditVisible(true)}>
            <Pencil size={16} color="#FFFFFF" />
          </Pressable>
        </View>
        <Text style={styles.title}>{order.title}</Text>
        <View style={styles.pills}><StatusPill status={order.status} /><PriorityPill priority={order.priority} /></View>
      </View>
      <Section title="Détails">
        <Info icon={MapPin} label="Emplacement" value={order.location || 'Non précisé'} />
        <Info icon={CalendarDays} label="Échéance" value={formatAppDate(order.dueDate)} />
        <Info icon={UserRound} label="Assignée à" value={order.assignedToName || 'Non assignée'} />
        <Text style={styles.description}>{order.description || 'Aucune description.'}</Text>
      </Section>
      {(order.attachmentFilename || order.invoiceFilename) && (
        <Section title={t.attachments}>
          {order.attachmentFilename && (
            <Pressable style={styles.fileRow} onPress={() => void openSecureFile(order.attachmentDownloadUrl || '', order.attachmentFilename || 'attachment')}>
              <Paperclip size={17} color={colors.red} />
              <Text style={styles.fileRowText} numberOfLines={1}>{order.attachmentFilename}</Text>
            </Pressable>
          )}
          {order.invoiceFilename && (
            <Pressable style={styles.fileRow} onPress={() => void openSecureFile(order.invoiceDownloadUrl || '', order.invoiceFilename || 'invoice')}>
              <ReceiptText size={17} color={colors.red} />
              <Text style={styles.fileRowText} numberOfLines={1}>{order.invoiceFilename}</Text>
            </Pressable>
          )}
        </Section>
      )}
      <Section title="Statut">
        <View style={styles.statusGrid}>
          {STATUSES.map((item) => {
            const selected = order.status === item.value;
            return (
              <Pressable
                key={item.value}
                style={[styles.statusButton, selected && styles.statusButtonSelected]}
                disabled={savingStatus !== null}
                onPress={() => void changeStatus(item.value)}
              >
                <Text style={[styles.statusButtonText, selected && styles.statusButtonTextSelected]}>
                  {savingStatus === item.value ? 'Enregistrement...' : item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>
      <Section title={`Matériaux (${order.materialsCount || materials.length})`}>
        {materials.length ? materials.map((material) => (
          <View key={material} style={styles.materialRow}>
            <Package size={16} color={colors.textMuted} />
            <Text style={styles.materialText}>{material}</Text>
          </View>
        )) : <Text style={styles.muted}>Aucun matériau associé.</Text>}
      </Section>
    </ScrollView>
    <OrderFormModal
      visible={editVisible}
      urgent
      mode="edit"
      saving={savingEdit}
      initialValue={{
        title: order.title,
        description: order.description || '',
        location: order.location || '',
        dueDate: order.dueDate || '',
        priority: order.priority,
      }}
      existing={{
        attachmentFilename: order.attachmentFilename,
        attachmentDownloadUrl: order.attachmentDownloadUrl,
        invoiceFilename: order.invoiceFilename,
        invoiceDownloadUrl: order.invoiceDownloadUrl,
      }}
      onClose={() => setEditVisible(false)}
      onSubmit={saveEdit}
    />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function Info({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Icon size={19} color={colors.red} />
      <View style={styles.infoText}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, flex: 1 },
  hero: { backgroundColor: '#592D2B', padding: 20 },
  heroTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  editButton: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  id: { color: '#F2B8B4', fontSize: 11, fontWeight: '800' },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', lineHeight: 30, marginTop: 7 },
  pills: { flexDirection: 'row', gap: 7, marginTop: 15 },
  section: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, padding: 20 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 14 },
  infoRow: { alignItems: 'center', flexDirection: 'row', gap: 11, marginBottom: 13 },
  infoText: { flex: 1 },
  infoLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  infoValue: { color: colors.text, fontSize: 14, marginTop: 2 },
  description: { color: colors.charcoal, fontSize: 14, lineHeight: 21, marginTop: 5 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: { borderColor: colors.border, borderRadius: 7, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 10 },
  statusButtonSelected: { backgroundColor: colors.red, borderColor: colors.red },
  statusButtonText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  statusButtonTextSelected: { color: '#FFFFFF' },
  materialRow: { alignItems: 'center', flexDirection: 'row', gap: 9, marginBottom: 9 },
  materialText: { color: colors.text, flex: 1, fontSize: 14 },
  fileRow: { alignItems: 'center', backgroundColor: '#FBEDEC', borderColor: colors.border, borderRadius: 7, borderWidth: 1, flexDirection: 'row', gap: 9, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 10 },
  fileRowText: { color: '#B5433D', flex: 1, fontSize: 13, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 14 },
});