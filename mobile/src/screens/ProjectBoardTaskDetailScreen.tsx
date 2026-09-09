import React, { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CalendarDays, MapPin, Paperclip, Pencil, ReceiptText } from 'lucide-react-native';
import { getProjectBoardTask, updateProjectBoardTask } from '../lib/api';
import type { RootStackParamList } from '../navigation/types';
import type { ProjectBoardTask, WorkOrderStatus } from '../types/api';
import { colors } from '../theme';
import { ErrorState, LoadingState } from '../components/ScreenState';
import { formatAppDate, PriorityPill, StatusPill } from '../components/OrderCard';
import OrderFormModal, { type OrderFormValue } from '../components/OrderFormModal';
import { openSecureFile } from '../lib/secureFile';
import { useLang } from '../context/LangContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectBoardTaskDetail'>;

const STATUSES: Array<{ value: WorkOrderStatus; label: string }> = [
  { value: 'OPEN', label: 'Ouvert' },
  { value: 'ASSIGNED', label: 'Assigné' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'COMPLETED', label: 'Terminé' },
  { value: 'CANCELLED', label: 'Annulé' },
];

export default function ProjectBoardTaskDetailScreen({ route, navigation }: Props) {
  const { t } = useLang();
  const [task, setTask] = useState<ProjectBoardTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingStatus, setSavingStatus] = useState<WorkOrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await getProjectBoardTask(route.params.id);
      setTask(result);
      navigation.setOptions({ title: `Tâche #${result.id}` });
    } catch {
      setError('Cette tâche est introuvable ou inaccessible.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation, route.params.id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function changeStatus(status: WorkOrderStatus) {
    if (!task || status === task.status) return;
    setSavingStatus(status);
    try {
      const updated = await updateProjectBoardTask(task.id, {
        title: task.title,
        description: task.description,
        location: task.location,
        priority: task.priority,
        status,
        dueDate: task.dueDate,
        assignedToUserId: task.assignedToUserId,
      });
      setTask(updated);
    } catch {
      Alert.alert('Mise à jour impossible', 'Le statut n’a pas été modifié.');
    } finally {
      setSavingStatus(null);
    }
  }

  async function saveEdit(value: OrderFormValue) {
    if (!task) return;
    setSavingEdit(true);
    try {
      const updated = await updateProjectBoardTask(
        task.id,
        {
          title: value.title,
          description: value.description,
          location: value.location,
          priority: value.priority,
          status: task.status,
          dueDate: value.dueDate || null,
          assignedToUserId: task.assignedToUserId,
        },
        {
          photos: value.photos,
          invoice: value.invoice,
          removeAttachment: value.removeAttachment,
          removeInvoice: value.removeInvoice,
        },
      );
      setTask(updated);
      setEditVisible(false);
    } catch {
      Alert.alert('Mise à jour impossible', 'Vérifiez les champs et votre connexion.');
    } finally {
      setSavingEdit(false);
    }
  }

  if (loading) return <LoadingState label="Chargement de la tâche..." />;
  if (!task || error) return <ErrorState message={error || 'Tâche indisponible.'} onRetry={() => void load()} />;

  return (
    <>
      <ScrollView
        style={styles.root}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.id}>TÂCHE #{task.id}</Text>
            <Pressable accessibilityLabel={t.edit} style={styles.editButton} onPress={() => setEditVisible(true)}>
              <Pencil size={16} color="#FFFFFF" />
            </Pressable>
          </View>
          <Text style={styles.title}>{task.title}</Text>
          <View style={styles.pills}><StatusPill status={task.status} /><PriorityPill priority={task.priority} /></View>
        </View>

        <Section title="Détails">
          <Info icon={MapPin} label="Emplacement" value={task.location || 'Non précisé'} />
          <Info icon={CalendarDays} label="Échéance" value={formatAppDate(task.dueDate)} />
          <Text style={styles.description}>{task.description || 'Aucune description.'}</Text>
        </Section>

        {(task.attachmentFilename || task.invoiceFilename) && (
          <Section title={t.attachments}>
            {task.attachmentFilename && (
              <Pressable style={styles.fileRow} onPress={() => void openSecureFile(task.attachmentDownloadUrl || '', task.attachmentFilename || 'attachment')}>
                <Paperclip size={17} color={colors.primary} />
                <Text style={styles.fileRowText} numberOfLines={1}>{task.attachmentFilename}</Text>
              </Pressable>
            )}
            {task.invoiceFilename && (
              <Pressable style={styles.fileRow} onPress={() => void openSecureFile(task.invoiceDownloadUrl || '', task.invoiceFilename || 'invoice')}>
                <ReceiptText size={17} color={colors.primary} />
                <Text style={styles.fileRowText} numberOfLines={1}>{task.invoiceFilename}</Text>
              </Pressable>
            )}
          </Section>
        )}

        <Section title="Statut">
          <View style={styles.statusGrid}>
            {STATUSES.map((item) => {
              const selected = task.status === item.value;
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
      </ScrollView>
      <OrderFormModal
        visible={editVisible}
        mode="edit"
        saving={savingEdit}
        titleOverride={t.editProjectBoardTask}
        initialValue={{
          title: task.title,
          description: task.description,
          location: task.location,
          dueDate: task.dueDate || '',
          priority: task.priority,
        }}
        existing={{
          attachmentFilename: task.attachmentFilename,
          attachmentDownloadUrl: task.attachmentDownloadUrl,
          invoiceFilename: task.invoiceFilename,
          invoiceDownloadUrl: task.invoiceDownloadUrl,
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
      <Icon size={19} color={colors.primary} />
      <View style={styles.infoText}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, flex: 1 },
  hero: { backgroundColor: colors.charcoal, padding: 20 },
  heroTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  editButton: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  id: { color: '#9FD3BC', fontSize: 11, fontWeight: '800' },
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
  statusButtonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusButtonText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  statusButtonTextSelected: { color: '#FFFFFF' },
  fileRow: { alignItems: 'center', backgroundColor: '#EFF5F1', borderColor: colors.border, borderRadius: 7, borderWidth: 1, flexDirection: 'row', gap: 9, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 10 },
  fileRowText: { color: colors.primary, flex: 1, fontSize: 13, fontWeight: '700' },
});
