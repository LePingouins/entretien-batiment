import React, { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CalendarDays, MapPin, Package, Paperclip, Pencil, Plus, ReceiptText, Trash2, UserRound, X } from 'lucide-react-native';
import { getWorkOrder, updateWorkOrder, deleteWorkOrder, getWorkOrderMaterials, addWorkOrderMaterial, deleteWorkOrderMaterial, toggleWorkOrderMaterialBought } from '../lib/api';
import type { RootStackParamList } from '../navigation/types';
import type { Material, WorkOrder, WorkOrderStatus } from '../types/api';
import { colors } from '../theme';
import { ErrorState, LoadingState } from '../components/ScreenState';
import { formatAppDate, PriorityPill, StatusPill } from '../components/OrderCard';
import OrderFormModal, { type OrderFormValue } from '../components/OrderFormModal';
import SecureImage from '../components/SecureImage';
import { openSecureFile } from '../lib/secureFile';
import { useLang } from '../context/LangContext';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkOrderDetail'>;

const STATUSES: Array<{ value: WorkOrderStatus; label: string }> = [
  { value: 'OPEN', label: 'Ouvert' },
  { value: 'ASSIGNED', label: 'Assigné' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'COMPLETED', label: 'Terminé' },
  { value: 'CANCELLED', label: 'Annulé' },
];

export default function WorkOrderDetailScreen({ route, navigation }: Props) {
  const { t } = useLang();
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingStatus, setSavingStatus] = useState<WorkOrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [addMaterialVisible, setAddMaterialVisible] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialQty, setNewMaterialQty] = useState('');
  const [savingMaterial, setSavingMaterial] = useState(false);


  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await getWorkOrder(route.params.id);
      setOrder(result);
      navigation.setOptions({ title: `Bon #${result.id}` });
      try {
        setMaterials(await getWorkOrderMaterials(result.id));
      } catch {
        // Materials are a secondary feature — don't fail the whole screen if this 404s.
      }
    } catch {
      setError('Ce bon de travail est introuvable ou inaccessible.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation, route.params.id]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  async function changeStatus(status: WorkOrderStatus) {
    if (!order || status === order.status) return;
    setSavingStatus(status);
    try {
      const updated = await updateWorkOrder(order.id, {
        title: order.title,
        description: order.description || '',
        location: order.location || '',
        priority: order.priority,
        status,
        dueDate: order.dueDate,
        assignedToUserId: order.assignedToUserId,
      });
      setOrder(updated);
    } catch {
      Alert.alert('Mise à jour impossible', 'Le statut n’a pas été modifié.');
    } finally {
      setSavingStatus(null);
    }
  }

  function confirmDelete() {
    if (!order) return;
    Alert.alert(
      t.deleteWorkOrder,
      t.deleteWorkOrderConfirm,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteWorkOrder(order.id);
              navigation.goBack();
            } catch {
              Alert.alert('Suppression impossible', 'Vérifiez votre connexion et réessayez.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  async function submitNewMaterial() {
    if (!order || !newMaterialName.trim()) return;
    setSavingMaterial(true);
    try {
      const qty = newMaterialQty.trim() ? Number(newMaterialQty.replace(',', '.')) : undefined;
      const material = await addWorkOrderMaterial(order.id, {
        name: newMaterialName.trim(),
        quantity: Number.isFinite(qty) ? qty : undefined,
      });
      setMaterials((prev) => [...prev, material]);
      setNewMaterialName('');
      setNewMaterialQty('');
      setAddMaterialVisible(false);
    } catch {
      Alert.alert('Ajout impossible', 'Le matériau n’a pas été ajouté.');
    } finally {
      setSavingMaterial(false);
    }
  }

  async function toggleMaterialBought(material: Material) {
    if (!order) return;
    try {
      const updated = await toggleWorkOrderMaterialBought(order.id, material.id, !material.bought);
      setMaterials((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre à jour ce matériau.');
    }
  }

  function confirmDeleteMaterial(material: Material) {
    if (!order) return;
    Alert.alert('Retirer ce matériau ?', material.name, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWorkOrderMaterial(order.id, material.id);
            setMaterials((prev) => prev.filter((m) => m.id !== material.id));
          } catch {
            Alert.alert('Erreur', 'Impossible de retirer ce matériau.');
          }
        },
      },
    ]);
  }

  async function saveEdit(value: OrderFormValue) {
    if (!order) return;
    setSavingEdit(true);
    try {
      const updated = await updateWorkOrder(
        order.id,
        {
          title: value.title,
          description: value.description,
          location: value.location,
          priority: value.priority,
          status: order.status,
          dueDate: value.dueDate || null,
          assignedToUserId: order.assignedToUserId,
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

  if (loading) return <LoadingState label="Chargement du bon..." />;
  if (!order || error) return <ErrorState message={error || 'Bon indisponible.'} onRetry={() => void load()} />;

  return (
    <>
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
    >
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.id}>BON DE TRAVAIL #{order.id}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable accessibilityLabel={t.edit} style={styles.editButton} onPress={() => setEditVisible(true)}>
              <Pencil size={16} color="#FFFFFF" />
            </Pressable>
            <Pressable accessibilityLabel="Supprimer" style={styles.editButton} disabled={deleting} onPress={confirmDelete}>
              <Trash2 size={16} color="#FCA5A5" />
            </Pressable>
          </View>
        </View>
        <Text style={styles.title}>{order.title}</Text>
        <View style={styles.pills}><StatusPill status={order.status} /><PriorityPill priority={order.priority} /></View>
      </View>

      <Section title="Détails">
        <Info icon={MapPin} label="Emplacement" value={order.location || 'Non précisé'} />
        <Info icon={CalendarDays} label="Échéance" value={formatAppDate(order.dueDate)} />
        <Info icon={UserRound} label="Assigné à" value={order.assignedToName || 'Non assigné'} />
        <Text style={styles.description}>{order.description || 'Aucune description.'}</Text>
      </Section>

      {(order.attachmentFilename || order.invoiceFilename) && (
        <Section title={t.attachments}>
          {order.attachmentFilename && (
            <View style={{ marginBottom: 10 }}>
              <SecureImage
                downloadUrl={order.attachmentDownloadUrl || ''}
                filename={order.attachmentFilename}
                contentType={order.attachmentContentType}
                onOpenFallback={() => void openSecureFile(order.attachmentDownloadUrl || '', order.attachmentFilename || 'attachment')}
              />
              <Pressable style={styles.fileRow} onPress={() => void openSecureFile(order.attachmentDownloadUrl || '', order.attachmentFilename || 'attachment')}>
                <Paperclip size={17} color={colors.primary} />
                <Text style={styles.fileRowText} numberOfLines={1}>{order.attachmentFilename}</Text>
              </Pressable>
            </View>
          )}
          {order.invoiceFilename && (
            <View>
              <SecureImage
                downloadUrl={order.invoiceDownloadUrl || ''}
                filename={order.invoiceFilename}
                contentType={order.invoiceContentType}
                onOpenFallback={() => void openSecureFile(order.invoiceDownloadUrl || '', order.invoiceFilename || 'invoice')}
              />
              <Pressable style={styles.fileRow} onPress={() => void openSecureFile(order.invoiceDownloadUrl || '', order.invoiceFilename || 'invoice')}>
                <ReceiptText size={17} color={colors.primary} />
                <Text style={styles.fileRowText} numberOfLines={1}>{order.invoiceFilename}</Text>
              </Pressable>
            </View>
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

      <Section title={`${t.materials} (${materials.length})`}>
        {materials.length ? materials.map((material) => (
          <View key={material.id} style={styles.materialRow}>
            <Pressable style={styles.materialCheckbox} onPress={() => void toggleMaterialBought(material)}>
              {material.bought ? <View style={styles.materialCheckboxChecked} /> : null}
            </Pressable>
            <Package size={16} color={colors.textMuted} />
            <Text style={[styles.materialText, material.bought && styles.materialTextBought]}>
              {material.name}{material.quantity ? ` × ${material.quantity}` : ''}
            </Text>
            <Pressable accessibilityLabel={t.remove} hitSlop={10} onPress={() => confirmDeleteMaterial(material)}>
              <X size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        )) : <Text style={styles.muted}>{t.noMaterials}</Text>}

        {addMaterialVisible ? (
          <View style={styles.addMaterialForm}>
            <TextInput
              style={styles.addMaterialInput}
              placeholder={t.materialName}
              placeholderTextColor={colors.textMuted}
              value={newMaterialName}
              onChangeText={setNewMaterialName}
            />
            <TextInput
              style={[styles.addMaterialInput, { maxWidth: 90 }]}
              placeholder={t.quantity}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={newMaterialQty}
              onChangeText={setNewMaterialQty}
            />
            <Pressable style={styles.addMaterialSave} disabled={savingMaterial || !newMaterialName.trim()} onPress={() => void submitNewMaterial()}>
              <Text style={styles.addMaterialSaveText}>{savingMaterial ? '...' : t.save}</Text>
            </Pressable>
            <Pressable onPress={() => setAddMaterialVisible(false)}><X size={20} color={colors.textMuted} /></Pressable>
          </View>
        ) : (
          <Pressable style={styles.addMaterialButton} onPress={() => setAddMaterialVisible(true)}>
            <Plus size={16} color={colors.primary} />
            <Text style={styles.addMaterialButtonText}>{t.addMaterial}</Text>
          </Pressable>
        )}
      </Section>
    </ScrollView>
    <OrderFormModal
      visible={editVisible}
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
  materialRow: { alignItems: 'center', flexDirection: 'row', gap: 9, marginBottom: 9 },
  materialText: { color: colors.text, flex: 1, fontSize: 14 },
  materialTextBought: { color: colors.textMuted, textDecorationLine: 'line-through' },
  materialCheckbox: { alignItems: 'center', borderColor: colors.border, borderRadius: 5, borderWidth: 1.5, height: 20, justifyContent: 'center', width: 20 },
  materialCheckboxChecked: { backgroundColor: colors.primary, borderRadius: 3, height: 12, width: 12 },
  addMaterialButton: { alignItems: 'center', flexDirection: 'row', gap: 7, marginTop: 6 },
  addMaterialButtonText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  addMaterialForm: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 6 },
  addMaterialInput: { borderColor: colors.border, borderRadius: 7, borderWidth: 1, color: colors.text, flex: 1, fontSize: 14, paddingHorizontal: 10, paddingVertical: 8 },
  addMaterialSave: { backgroundColor: colors.primary, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9 },
  addMaterialSaveText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  fileRow: { alignItems: 'center', backgroundColor: '#EFF5F1', borderColor: colors.border, borderRadius: 7, borderWidth: 1, flexDirection: 'row', gap: 9, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 10 },
  fileRowText: { color: colors.primary, flex: 1, fontSize: 13, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 14 },
});