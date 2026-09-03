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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Boxes, ChevronRight, ClipboardCheck, Pencil, Play, Plus, Search, X } from 'lucide-react-native';
import {
  changeInventorySessionStatus,
  createInventoryProduct,
  createInventorySession,
  getInventoryCategories,
  getInventoryProducts,
  getInventorySessions,
  updateInventoryProduct,
} from '../lib/api';
import type { RootStackParamList } from '../navigation/types';
import type { InventoryCategory, InventoryProduct, InventoryProductInput, InventorySession } from '../types/api';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { EmptyState, ErrorState, LoadingState } from '../components/ScreenState';

type Section = 'sessions' | 'products';

export default function InventoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { canAccess } = useAuth();
  const canSeeSessions = canAccess('INVENTORY');
  const canSeeProducts = canAccess('INVENTORY_PRODUCTS');
  const [section, setSection] = useState<Section>(canSeeSessions ? 'sessions' : 'products');
  const [sessions, setSessions] = useState<InventorySession[]>([]);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productModal, setProductModal] = useState(false);
  const [sessionModal, setSessionModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const [productForm, setProductForm] = useState<InventoryProductInput>(emptyProduct());
  const [sessionName, setSessionName] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [sessionData, productData, categoryData] = await Promise.all([
        canSeeSessions ? getInventorySessions() : Promise.resolve([]),
        canSeeProducts ? getInventoryProducts() : Promise.resolve([]),
        canSeeProducts ? getInventoryCategories() : Promise.resolve([]),
      ]);
      setSessions(sessionData);
      setProducts(productData);
      setCategories(categoryData);
    } catch {
      setError('L’inventaire n’a pas pu être chargé.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canSeeProducts, canSeeSessions]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function openProduct(product?: InventoryProduct) {
    setEditingProduct(product || null);
    setProductForm(product ? {
      sku: product.sku,
      name: product.name,
      categoryId: product.categoryId,
      unit: product.unit,
      barcode: product.barcode,
      expectedQty: product.expectedQty,
      locationZone: product.locationZone,
      notes: product.notes,
    } : emptyProduct());
    setProductModal(true);
  }

  async function saveProduct() {
    if (!productForm.sku.trim() || !productForm.name.trim()) {
      Alert.alert('Champs requis', 'Le SKU et le nom du produit sont requis.');
      return;
    }
    setSaving(true);
    try {
      if (editingProduct) await updateInventoryProduct(editingProduct.id, productForm);
      else await createInventoryProduct(productForm);
      setProductModal(false);
      await load();
    } catch {
      Alert.alert('Enregistrement impossible', 'Le produit n’a pas été enregistré.');
    } finally { setSaving(false); }
  }

  async function saveSession() {
    if (!sessionName.trim()) return;
    setSaving(true);
    try {
      await createInventorySession(sessionName.trim(), sessionNotes.trim() || undefined);
      setSessionModal(false);
      setSessionName('');
      setSessionNotes('');
      await load();
    } catch {
      Alert.alert('Création impossible', 'La session n’a pas été créée.');
    } finally { setSaving(false); }
  }

  function changeStatus(session: InventorySession, action: 'start' | 'complete' | 'cancel') {
    const labels = { start: 'Démarrer', complete: 'Terminer', cancel: 'Annuler' };
    Alert.alert(`${labels[action]} la session?`, session.name, [
      { text: 'Retour', style: 'cancel' },
      { text: labels[action], style: action === 'cancel' ? 'destructive' : 'default', onPress: () => void changeInventorySessionStatus(session.id, action).then(load).catch(() => Alert.alert('Action impossible')) },
    ]);
  }

  if (loading) return <LoadingState label="Chargement de l’inventaire..." />;
  if (error && sessions.length === 0 && products.length === 0) return <ErrorState message={error} onRetry={() => void load()} />;

  const visibleProducts = products.filter((product) => `${product.sku} ${product.name} ${product.locationZone || ''}`.toLowerCase().includes(query.toLowerCase()));
  const data = section === 'sessions' ? sessions : visibleProducts;

  return (
    <View style={styles.root}>
      <View style={styles.hero}><Boxes size={23} color="#9FD3BC" /><View><Text style={styles.heroValue}>{products.length}</Text><Text style={styles.heroLabel}>produits · {sessions.filter((item) => item.status === 'IN_PROGRESS').length} session active</Text></View></View>
      {canSeeSessions && canSeeProducts ? <View style={styles.segments}><Segment label="Comptages" selected={section === 'sessions'} onPress={() => setSection('sessions')} /><Segment label="Produits" selected={section === 'products'} onPress={() => setSection('products')} /></View> : null}
      {section === 'products' ? <View style={styles.search}><Search size={18} color={colors.textMuted} /><TextInput value={query} onChangeText={setQuery} placeholder="SKU, produit ou zone" placeholderTextColor="#87938D" style={styles.searchInput} /></View> : null}
      <FlatList<InventorySession | InventoryProduct>
        data={data}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, data.length === 0 && styles.emptyList]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        renderItem={({ item }) => section === 'sessions'
          ? <SessionRow session={item as InventorySession} onOpen={() => navigation.navigate('InventoryCount', { sessionId: item.id, name: (item as InventorySession).name })} onChangeStatus={changeStatus} />
          : <ProductRow product={item as InventoryProduct} onEdit={() => openProduct(item as InventoryProduct)} />}
        ListEmptyComponent={<EmptyState title={section === 'sessions' ? 'Aucun comptage' : 'Aucun produit'} message={section === 'sessions' ? 'Créez une session pour commencer un inventaire.' : 'Ajoutez le premier produit du catalogue.'} />}
      />
      <Pressable accessibilityLabel={section === 'sessions' ? 'Créer une session' : 'Ajouter un produit'} style={styles.fab} onPress={() => section === 'sessions' ? setSessionModal(true) : openProduct()}><Plus size={26} color="#FFFFFF" /></Pressable>

      <Modal visible={sessionModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSessionModal(false)}>
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ModalHeader title="Nouvelle session" onClose={() => setSessionModal(false)} />
          <View style={styles.form}>
            <Field label="Nom" value={sessionName} onChangeText={setSessionName} placeholder="Inventaire mensuel" />
            <Field label="Notes" value={sessionNotes} onChangeText={setSessionNotes} placeholder="Facultatif" multiline />
            <SaveButton disabled={!sessionName.trim() || saving} label={saving ? 'Création...' : 'Créer la session'} onPress={() => void saveSession()} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={productModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setProductModal(false)}>
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ModalHeader title={editingProduct ? 'Modifier le produit' : 'Nouveau produit'} onClose={() => setProductModal(false)} />
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Field label="SKU" value={productForm.sku} onChangeText={(sku) => setProductForm({ ...productForm, sku })} autoCapitalize="characters" />
            <Field label="Nom" value={productForm.name} onChangeText={(name) => setProductForm({ ...productForm, name })} />
            <Field label="Quantité attendue" value={String(productForm.expectedQty ?? '')} onChangeText={(value) => setProductForm({ ...productForm, expectedQty: Number(value.replace(',', '.')) || 0 })} keyboardType="decimal-pad" />
            <Field label="Unité" value={productForm.unit || ''} onChangeText={(unit) => setProductForm({ ...productForm, unit })} placeholder="unité" />
            <Field label="Zone" value={productForm.locationZone || ''} onChangeText={(locationZone) => setProductForm({ ...productForm, locationZone })} />
            <Field label="Code-barres" value={productForm.barcode || ''} onChangeText={(barcode) => setProductForm({ ...productForm, barcode })} keyboardType="numeric" />
            {categories.length ? <View style={styles.field}><Text style={styles.label}>Catégorie</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{categories.map((category) => <Pressable key={category.id} style={[styles.chip, productForm.categoryId === category.id && styles.chipSelected]} onPress={() => setProductForm({ ...productForm, categoryId: productForm.categoryId === category.id ? undefined : category.id })}><Text style={[styles.chipText, productForm.categoryId === category.id && styles.chipTextSelected]}>{category.name}</Text></Pressable>)}</ScrollView></View> : null}
            <Field label="Notes" value={productForm.notes || ''} onChangeText={(notes) => setProductForm({ ...productForm, notes })} multiline />
            <SaveButton disabled={saving} label={saving ? 'Enregistrement...' : 'Enregistrer'} onPress={() => void saveProduct()} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function emptyProduct(): InventoryProductInput { return { sku: '', name: '', unit: 'unité', expectedQty: 0 }; }

function SessionRow({ session, onOpen, onChangeStatus }: { session: InventorySession; onOpen: () => void; onChangeStatus: (session: InventorySession, action: 'start' | 'complete' | 'cancel') => void }) {
  const status = { DRAFT: 'Brouillon', IN_PROGRESS: 'En cours', COMPLETED: 'Terminée', CANCELLED: 'Annulée' }[session.status];
  return (
    <View style={styles.row}>
      <Pressable style={styles.rowMain} onPress={onOpen}>
        <ClipboardCheck size={21} color={session.status === 'IN_PROGRESS' ? colors.green : colors.primary} />
        <View style={styles.rowBody}><Text style={styles.rowTitle}>{session.name}</Text><Text style={styles.rowMeta}>{status} · {session.countedItems}/{session.totalItems} comptés · {session.discrepancyCount} écart{session.discrepancyCount === 1 ? '' : 's'}</Text></View>
        <ChevronRight size={18} color={colors.textMuted} />
      </Pressable>
      {session.status === 'DRAFT' ? <View style={styles.actions}><SmallAction icon={Play} label="Démarrer" onPress={() => onChangeStatus(session, 'start')} /><SmallAction label="Annuler" destructive onPress={() => onChangeStatus(session, 'cancel')} /></View> : null}
      {session.status === 'IN_PROGRESS' ? <View style={styles.actions}><SmallAction label="Terminer" onPress={() => onChangeStatus(session, 'complete')} /><SmallAction label="Annuler" destructive onPress={() => onChangeStatus(session, 'cancel')} /></View> : null}
    </View>
  );
}

function ProductRow({ product, onEdit }: { product: InventoryProduct; onEdit: () => void }) {
  return <View style={styles.product}><View style={styles.rowBody}><Text style={styles.sku}>{product.sku}</Text><Text style={styles.rowTitle}>{product.name}</Text><Text style={styles.rowMeta}>{product.expectedQty} {product.unit}{product.locationZone ? ` · ${product.locationZone}` : ''}{product.categoryName ? ` · ${product.categoryName}` : ''}</Text></View><Pressable accessibilityLabel="Modifier" hitSlop={10} onPress={onEdit}><Pencil size={19} color={colors.primary} /></Pressable></View>;
}

function Segment({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { return <Pressable style={[styles.segment, selected && styles.segmentSelected]} onPress={onPress}><Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{label}</Text></Pressable>; }
function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) { return <View style={styles.modalHeader}><Text style={styles.modalTitle}>{title}</Text><Pressable accessibilityLabel="Fermer" onPress={onClose}><X size={24} color={colors.text} /></Pressable></View>; }
function Field({ label, ...input }: React.ComponentProps<typeof TextInput> & { label: string }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...input} style={[styles.input, input.multiline && styles.textarea]} placeholderTextColor="#87938D" /></View>; }
function SaveButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) { return <Pressable style={[styles.save, disabled && styles.disabled]} disabled={disabled} onPress={onPress}><Text style={styles.saveText}>{label}</Text></Pressable>; }
function SmallAction({ icon: Icon, label, destructive, onPress }: { icon?: typeof Play; label: string; destructive?: boolean; onPress: () => void }) { return <Pressable style={styles.smallAction} onPress={onPress}>{Icon ? <Icon size={14} color={destructive ? colors.red : colors.primary} /> : null}<Text style={[styles.smallActionText, destructive && styles.destructive]}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, flex: 1 }, hero: { alignItems: 'center', backgroundColor: colors.charcoal, flexDirection: 'row', gap: 12, padding: 18 }, heroValue: { color: '#FFFFFF', fontSize: 21, fontWeight: '800' }, heroLabel: { color: '#CBD8D1', fontSize: 11 },
  segments: { backgroundColor: colors.surface, flexDirection: 'row', gap: 8, padding: 11 }, segment: { alignItems: 'center', borderColor: colors.border, borderRadius: 7, borderWidth: 1, flex: 1, padding: 9 }, segmentSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, segmentText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' }, segmentTextSelected: { color: '#FFFFFF' },
  search: { alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 9, paddingHorizontal: 15 }, searchInput: { color: colors.text, flex: 1, minHeight: 48 }, list: { paddingBottom: 90 }, emptyList: { flexGrow: 1 },
  row: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1 }, rowMain: { alignItems: 'center', flexDirection: 'row', gap: 12, padding: 15 }, rowBody: { flex: 1 }, rowTitle: { color: colors.text, fontSize: 14, fontWeight: '700' }, rowMeta: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 4 }, actions: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 11 }, smallAction: { alignItems: 'center', flexDirection: 'row', gap: 5, padding: 11 }, smallActionText: { color: colors.primary, fontSize: 11, fontWeight: '800' }, destructive: { color: colors.red },
  product: { alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 14, padding: 15 }, sku: { color: colors.teal, fontSize: 10, fontWeight: '800', marginBottom: 3 }, fab: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 26, bottom: 20, elevation: 5, height: 52, justifyContent: 'center', position: 'absolute', right: 20, width: 52 },
  modal: { backgroundColor: colors.background, flex: 1 }, modalHeader: { alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: 18 }, modalTitle: { color: colors.text, fontSize: 20, fontWeight: '800' }, form: { padding: 20 }, field: { marginBottom: 15 }, label: { color: colors.charcoal, fontSize: 13, fontWeight: '700', marginBottom: 7 }, input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 7, borderWidth: 1, color: colors.text, fontSize: 15, minHeight: 48, paddingHorizontal: 13 }, textarea: { minHeight: 90, paddingTop: 12, textAlignVertical: 'top' }, save: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 7, marginTop: 5, padding: 14 }, saveText: { color: '#FFFFFF', fontWeight: '800' }, disabled: { opacity: 0.5 }, chips: { gap: 7 }, chip: { borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 7 }, chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' }, chipTextSelected: { color: '#FFFFFF' },
});