import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Calendar, Check, File as FileIcon, Image as ImageIcon, Trash2, X } from 'lucide-react-native';
import type { WorkOrderPriority } from '../types/api';
import type { PickedFile } from '../lib/api';
import { openSecureFile } from '../lib/secureFile';
import { useLang } from '../context/LangContext';
import { colors } from '../theme';
import { formatAppDate } from './OrderCard';

export interface OrderFormValue {
  title: string;
  description: string;
  location: string;
  dueDate: string;
  priority: WorkOrderPriority;
  photos: PickedFile[];
  invoice: PickedFile | null;
  removeAttachment: boolean;
  removeInvoice: boolean;
}

export interface OrderFormExisting {
  attachmentFilename?: string | null;
  attachmentDownloadUrl?: string | null;
  invoiceFilename?: string | null;
  invoiceDownloadUrl?: string | null;
}

interface Props {
  visible: boolean;
  urgent?: boolean;
  mode?: 'create' | 'edit';
  saving: boolean;
  initialValue?: Partial<Omit<OrderFormValue, 'photos' | 'invoice' | 'removeAttachment' | 'removeInvoice'>>;
  existing?: OrderFormExisting;
  onClose: () => void;
  onSubmit: (value: OrderFormValue) => Promise<void>;
}

const LOCATIONS: Array<{ value: string; labelKey: 'horizonNature' | 'inewa' }> = [
  { value: 'horizon-nature', labelKey: 'horizonNature' },
  { value: 'inewa', labelKey: 'inewa' },
];

const PRIORITIES: Array<{ value: WorkOrderPriority; labelKey: 'priorityLow' | 'priorityMedium' | 'priorityHigh' | 'priorityUrgent' }> = [
  { value: 'LOW', labelKey: 'priorityLow' },
  { value: 'MEDIUM', labelKey: 'priorityMedium' },
  { value: 'HIGH', labelKey: 'priorityHigh' },
  { value: 'URGENT', labelKey: 'priorityUrgent' },
];

export default function OrderFormModal({ visible, urgent = false, mode = 'create', saving, initialValue, existing, onClose, onSubmit }: Props) {
  const { t } = useLang();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<WorkOrderPriority>(urgent ? 'URGENT' : 'MEDIUM');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photos, setPhotos] = useState<PickedFile[]>([]);
  const [invoice, setInvoice] = useState<PickedFile | null>(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [removeInvoice, setRemoveInvoice] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(initialValue?.title ?? '');
      setDescription(initialValue?.description ?? '');
      setLocation(initialValue?.location ?? '');
      setDueDate(initialValue?.dueDate ?? '');
      setPriority(initialValue?.priority ?? (urgent ? 'URGENT' : 'MEDIUM'));
      setPhotos([]);
      setInvoice(null);
      setRemoveAttachment(false);
      setRemoveInvoice(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  async function addPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setPhotos((prev) => [...prev, { uri: asset.uri, name: asset.fileName || `photo-${Date.now()}.jpg`, mimeType: asset.mimeType || 'image/jpeg' }]);
  }

  async function addFile() {
    const result = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setPhotos((prev) => [...prev, { uri: asset.uri, name: asset.name, mimeType: asset.mimeType }]);
  }

  async function pickInvoice() {
    const result = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setInvoice({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
    setRemoveInvoice(false);
  }

  function removePhotoAt(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit() {
    if (!title.trim() || (urgent && (!description.trim() || !location.trim()))) {
      Alert.alert(t.required, t.requiredFields);
      return;
    }
    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      location,
      dueDate,
      priority,
      photos,
      invoice,
      removeAttachment,
      removeInvoice,
    });
  }

  const heading = mode === 'edit'
    ? (urgent ? t.editUrgentWorkOrder : t.editWorkOrder)
    : (urgent ? t.newUrgentWorkOrder : t.newWorkOrder);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.heading}>{heading}</Text>
          <Pressable accessibilityLabel={t.close} hitSlop={12} onPress={onClose} disabled={saving}>
            <X size={24} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Field label={t.title} value={title} onChangeText={setTitle} />
          <Field label={t.description} value={description} onChangeText={setDescription} multiline />

          <Text style={styles.label}>{t.location}</Text>
          <View style={styles.segmented}>
            {LOCATIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[styles.segment, location === option.value && styles.segmentActive]}
                onPress={() => setLocation(option.value)}
              >
                <Text style={[styles.segmentText, location === option.value && styles.segmentTextActive]}>{t[option.labelKey]}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>{t.priority}</Text>
          <View style={styles.segmented}>
            {PRIORITIES.map((option) => (
              <Pressable
                key={option.value}
                style={[styles.segment, priority === option.value && styles.segmentActive]}
                onPress={() => setPriority(option.value)}
              >
                <Text style={[styles.segmentText, priority === option.value && styles.segmentTextActive]}>{t[option.labelKey]}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>{t.dueDate}</Text>
          <Pressable style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Calendar size={18} color={colors.textMuted} />
            <Text style={styles.dateButtonText}>{dueDate ? formatAppDate(dueDate) : t.selectDate}</Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={dueDate ? new Date(`${dueDate}T00:00:00`) : new Date()}
              mode="date"
              onChange={(event, selected) => {
                setShowDatePicker(false);
                if (event.type === 'set' && selected) {
                  setDueDate(selected.toISOString().slice(0, 10));
                }
              }}
            />
          )}

          <Text style={styles.label}>{t.attachments}</Text>
          {existing?.attachmentFilename && !removeAttachment && (
            <ExistingFileRow
              name={existing.attachmentFilename}
              onOpen={() => void openSecureFile(existing.attachmentDownloadUrl || '', existing.attachmentFilename || 'attachment')}
              onRemove={() => setRemoveAttachment(true)}
            />
          )}
          <View style={styles.fileButtonsRow}>
            <Pressable style={styles.fileButton} onPress={() => void addPhoto()}>
              <ImageIcon size={16} color={colors.primary} />
              <Text style={styles.fileButtonText}>{t.addPhoto}</Text>
            </Pressable>
            <Pressable style={styles.fileButton} onPress={() => void addFile()}>
              <FileIcon size={16} color={colors.primary} />
              <Text style={styles.fileButtonText}>{t.addFile}</Text>
            </Pressable>
          </View>
          {photos.map((photo, index) => (
            <View key={`${photo.uri}-${index}`} style={styles.pickedFileRow}>
              <Text style={styles.pickedFileName} numberOfLines={1}>{photo.name}</Text>
              <Pressable onPress={() => removePhotoAt(index)} hitSlop={8}>
                <Trash2 size={17} color={colors.red} />
              </Pressable>
            </View>
          ))}

          <Text style={styles.label}>{t.invoiceDocument}</Text>
          {existing?.invoiceFilename && !removeInvoice && !invoice && (
            <ExistingFileRow
              name={existing.invoiceFilename}
              onOpen={() => void openSecureFile(existing.invoiceDownloadUrl || '', existing.invoiceFilename || 'invoice')}
              onRemove={() => setRemoveInvoice(true)}
            />
          )}
          {invoice ? (
            <View style={styles.pickedFileRow}>
              <Text style={styles.pickedFileName} numberOfLines={1}>{invoice.name}</Text>
              <Pressable onPress={() => setInvoice(null)} hitSlop={8}>
                <Trash2 size={17} color={colors.red} />
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.fileButton} onPress={() => void pickInvoice()}>
              <FileIcon size={16} color={colors.primary} />
              <Text style={styles.fileButtonText}>{t.chooseFile}</Text>
            </Pressable>
          )}
        </ScrollView>
        <View style={styles.actions}>
          <Pressable style={styles.cancelButton} onPress={onClose} disabled={saving}>
            <Text style={styles.cancelText}>{t.cancel}</Text>
          </Pressable>
          <Pressable style={[styles.saveButton, saving && styles.disabled]} onPress={() => void submit()} disabled={saving}>
            <Check size={18} color="#FFFFFF" />
            <Text style={styles.saveText}>{saving ? t.saving : (mode === 'edit' ? t.save : t.create)}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ExistingFileRow({ name, onOpen, onRemove }: { name: string; onOpen: () => void; onRemove: () => void }) {
  return (
    <View style={styles.existingRow}>
      <Pressable style={styles.existingLink} onPress={onOpen}>
        <Text style={styles.existingLinkText} numberOfLines={1}>{name}</Text>
      </Pressable>
      <Pressable onPress={onRemove} hitSlop={8}>
        <Trash2 size={17} color={colors.red} />
      </Pressable>
    </View>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, multiline, ...inputProps } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        multiline={multiline}
        placeholderTextColor="#8A9891"
        style={[styles.input, multiline && styles.textarea]}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, flex: 1 },
  header: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  heading: { color: colors.text, fontSize: 20, fontWeight: '800' },
  form: { padding: 20, paddingBottom: 32 },
  field: { marginBottom: 17 },
  label: { color: colors.charcoal, fontSize: 13, fontWeight: '700', marginBottom: 7, marginTop: 4 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 7,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  textarea: { minHeight: 112 },
  segmented: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  segment: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  segmentActive: { backgroundColor: colors.charcoal, borderColor: colors.charcoal },
  segmentText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  segmentTextActive: { color: '#FFFFFF' },
  dateButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 7,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginBottom: 14,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  dateButtonText: { color: colors.text, fontSize: 15 },
  fileButtonsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  fileButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 7,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  fileButtonText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  pickedFileRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 7,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  pickedFileName: { color: colors.text, flex: 1, fontSize: 13 },
  existingRow: {
    alignItems: 'center',
    backgroundColor: '#EFF5F1',
    borderColor: colors.border,
    borderRadius: 7,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  existingLink: { flex: 1 },
  existingLinkText: { color: colors.primary, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  actions: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },
  cancelButton: { alignItems: 'center', borderColor: colors.border, borderRadius: 7, borderWidth: 1, flex: 1, padding: 13 },
  cancelText: { color: colors.text, fontWeight: '700' },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 7,
    flex: 2,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    padding: 13,
  },
  saveText: { color: '#FFFFFF', fontWeight: '800' },
  disabled: { opacity: 0.55 },
});
