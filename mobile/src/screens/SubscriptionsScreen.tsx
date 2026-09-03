import React, { useCallback, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CalendarClock, CreditCard, Pencil, Plus, Trash2, X } from 'lucide-react-native';
import { createSubscription, deleteSubscription, getSubscriptionReport, getSubscriptions, updateSubscription } from '../lib/api';
import type { Subscription, SubscriptionBillingCycle, SubscriptionInput, SubscriptionReport, SubscriptionStatus } from '../types/api';
import { colors } from '../theme';
import { EmptyState, ErrorState, LoadingState } from '../components/ScreenState';
import { formatAppDate } from '../components/OrderCard';

const CATEGORIES = ['ERP', 'ACCOUNTING', 'SECURITY', 'INFRASTRUCTURE', 'COMMUNICATION', 'PRODUCTIVITY', 'DOMAIN', 'HOSTING', 'STORAGE', 'MONITORING', 'HR', 'CRM', 'OTHER'];
const CYCLES: SubscriptionBillingCycle[] = ['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'YEARLY'];
const STATUSES: SubscriptionStatus[] = ['ACTIVE', 'TRIAL', 'PAUSED', 'CANCELLED', 'EXPIRED'];
const CYCLE_LABELS: Record<SubscriptionBillingCycle, string> = { MONTHLY: 'Mensuel', QUARTERLY: 'Trimestriel', SEMI_ANNUAL: 'Semestriel', YEARLY: 'Annuel' };
const STATUS_LABELS: Record<SubscriptionStatus, string> = { ACTIVE: 'Actif', TRIAL: 'Essai', PAUSED: 'En pause', CANCELLED: 'Annulé', EXPIRED: 'Expiré' };

function emptyForm(): SubscriptionInput { return { name: '', vendor: '', category: 'OTHER', cost: 0, currency: 'CAD', billingCycle: 'MONTHLY', status: 'ACTIVE', autoRenew: true }; }

export default function SubscriptionsScreen() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [report, setReport] = useState<SubscriptionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [form, setForm] = useState<SubscriptionInput>(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [items, summary] = await Promise.all([getSubscriptions(), getSubscriptionReport()]);
      setSubscriptions(items);
      setReport(summary);
    } catch { setError('Les abonnements n’ont pas pu être chargés.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function open(subscription?: Subscription) {
    setEditing(subscription || null);
    setForm(subscription ? {
      name: subscription.name, vendor: subscription.vendor, category: subscription.category,
      cost: subscription.cost, currency: subscription.currency, billingCycle: subscription.billingCycle,
      status: subscription.status, startDate: subscription.startDate, nextDueDate: subscription.nextDueDate,
      autoRenew: subscription.autoRenew, websiteUrl: subscription.websiteUrl,
      contactEmail: subscription.contactEmail, notes: subscription.notes,
    } : emptyForm());
    setVisible(true);
  }

  async function save() {
    if (!form.name.trim() || !form.category || form.cost < 0) {
      Alert.alert('Informations invalides', 'Le nom, la catégorie et un coût valide sont requis.');
      return;
    }
    setSaving(true);
    try {
      if (editing) await updateSubscription(editing.id, form);
      else await createSubscription(form);
      setVisible(false);
      await load();
    } catch { Alert.alert('Enregistrement impossible', 'L’abonnement n’a pas été enregistré.'); }
    finally { setSaving(false); }
  }

  function remove(subscription: Subscription) {
    Alert.alert('Supprimer cet abonnement?', subscription.name, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => void deleteSubscription(subscription.id).then(load).catch(() => Alert.alert('Suppression impossible')) },
    ]);
  }

  if (loading) return <LoadingState label="Chargement des abonnements..." />;
  if (error && subscriptions.length === 0) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <View style={styles.root}>
      <FlatList
        data={subscriptions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, subscriptions.length === 0 && styles.emptyList]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={report ? <View><View style={styles.hero}><CreditCard size={24} color="#9FD3BC" /><View><Text style={styles.heroValue}>{formatMoney(report.totalMonthlyCost, 'CAD')} / mois</Text><Text style={styles.heroLabel}>{formatMoney(report.totalYearlyCost, 'CAD')} par année</Text></View></View><View style={styles.metrics}><Metric value={String(report.activeSubscriptions)} label="actifs" /><Metric value={String(report.upcomingRenewals30d)} label="à renouveler sous 30 j" /><Metric value={String(report.expiredCount)} label="expirés" /></View></View> : null}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.itemBody}><View style={styles.titleRow}><Text style={styles.name}>{item.name}</Text><View style={[styles.badge, item.status !== 'ACTIVE' && styles.badgeMuted]}><Text style={styles.badgeText}>{STATUS_LABELS[item.status]}</Text></View></View><Text style={styles.vendor}>{item.vendor || item.category}</Text><Text style={styles.cost}>{formatMoney(item.cost, item.currency)} · {CYCLE_LABELS[item.billingCycle]}</Text>{item.nextDueDate ? <View style={styles.due}><CalendarClock size={13} color={colors.textMuted} /><Text style={styles.dueText}>Échéance {formatAppDate(item.nextDueDate)}</Text></View> : null}</View>
            <View style={styles.actions}><Pressable accessibilityLabel="Modifier" hitSlop={9} onPress={() => open(item)}><Pencil size={19} color={colors.primary} /></Pressable><Pressable accessibilityLabel="Supprimer" hitSlop={9} onPress={() => remove(item)}><Trash2 size={19} color={colors.red} /></Pressable></View>
          </View>
        )}
        ListEmptyComponent={<EmptyState title="Aucun abonnement" message="Ajoutez les logiciels et services récurrents de l’entreprise." />}
      />
      <Pressable accessibilityLabel="Ajouter un abonnement" style={styles.fab} onPress={() => open()}><Plus size={26} color="#FFFFFF" /></Pressable>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVisible(false)}>
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>{editing ? 'Modifier l’abonnement' : 'Nouvel abonnement'}</Text><Pressable accessibilityLabel="Fermer" onPress={() => setVisible(false)}><X size={24} color={colors.text} /></Pressable></View>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Field label="Nom" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
            <Field label="Fournisseur" value={form.vendor || ''} onChangeText={(vendor) => setForm({ ...form, vendor })} />
            <View style={styles.inline}><View style={styles.flex}><Field label="Coût" value={String(form.cost)} onChangeText={(value) => setForm({ ...form, cost: Number(value.replace(',', '.')) || 0 })} keyboardType="decimal-pad" /></View><View style={styles.currency}><Field label="Devise" value={form.currency} onChangeText={(currency) => setForm({ ...form, currency: currency.toUpperCase().slice(0, 3) })} autoCapitalize="characters" /></View></View>
            <ChoiceField label="Facturation" values={CYCLES} current={form.billingCycle} labelFor={(value) => CYCLE_LABELS[value]} onSelect={(billingCycle) => setForm({ ...form, billingCycle })} />
            <ChoiceField label="Statut" values={STATUSES} current={form.status || 'ACTIVE'} labelFor={(value) => STATUS_LABELS[value]} onSelect={(status) => setForm({ ...form, status })} />
            <Text style={styles.label}>Catégorie</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>{CATEGORIES.map((category) => <Choice key={category} label={category} selected={form.category === category} onPress={() => setForm({ ...form, category })} />)}</ScrollView>
            <Field label="Date de début" value={form.startDate || ''} onChangeText={(startDate) => setForm({ ...form, startDate })} placeholder="AAAA-MM-JJ" />
            <Field label="Prochaine échéance" value={form.nextDueDate || ''} onChangeText={(nextDueDate) => setForm({ ...form, nextDueDate })} placeholder="AAAA-MM-JJ" />
            <View style={styles.switchRow}><View><Text style={styles.switchTitle}>Renouvellement automatique</Text><Text style={styles.switchHelp}>Inclure ce service dans les renouvellements prévus</Text></View><Switch value={form.autoRenew ?? true} onValueChange={(autoRenew) => setForm({ ...form, autoRenew })} trackColor={{ false: '#C9D2CD', true: '#8BC6AD' }} thumbColor={form.autoRenew ? colors.primary : '#F5F5F5'} /></View>
            <Field label="Site web" value={form.websiteUrl || ''} onChangeText={(websiteUrl) => setForm({ ...form, websiteUrl })} autoCapitalize="none" keyboardType="url" />
            <Field label="Courriel de contact" value={form.contactEmail || ''} onChangeText={(contactEmail) => setForm({ ...form, contactEmail })} autoCapitalize="none" keyboardType="email-address" />
            <Field label="Notes" value={form.notes || ''} onChangeText={(notes) => setForm({ ...form, notes })} multiline />
            <Pressable style={[styles.save, saving && styles.disabled]} disabled={saving} onPress={() => void save()}><Text style={styles.saveText}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Text></Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function formatMoney(value: number, currency: string) { try { return new Intl.NumberFormat('fr-CA', { style: 'currency', currency }).format(value); } catch { return `${value.toFixed(2)} ${currency}`; } }
function Metric({ value, label }: { value: string; label: string }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }
function Field({ label, ...input }: React.ComponentProps<typeof TextInput> & { label: string }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...input} style={[styles.input, input.multiline && styles.textarea]} placeholderTextColor="#87938D" /></View>; }
function ChoiceField<T extends string>({ label, values, current, labelFor, onSelect }: { label: string; values: readonly T[]; current: T; labelFor: (value: T) => string; onSelect: (value: T) => void }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>{values.map((value) => <Choice key={value} label={labelFor(value)} selected={current === value} onPress={() => onSelect(value)} />)}</ScrollView></View>; }
function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { return <Pressable style={[styles.choice, selected && styles.choiceSelected]} onPress={onPress}><Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, flex: 1 }, list: { paddingBottom: 90 }, emptyList: { flexGrow: 1 }, hero: { alignItems: 'center', backgroundColor: colors.charcoal, flexDirection: 'row', gap: 12, padding: 18 }, heroValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' }, heroLabel: { color: '#CBD8D1', fontSize: 11, marginTop: 2 }, metrics: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', padding: 13 }, metric: { alignItems: 'center', borderRightColor: colors.border, borderRightWidth: StyleSheet.hairlineWidth, flex: 1, paddingHorizontal: 4 }, metricValue: { color: colors.text, fontSize: 17, fontWeight: '800' }, metricLabel: { color: colors.textMuted, fontSize: 9, marginTop: 3, textAlign: 'center' }, item: { alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 15, padding: 15 }, itemBody: { flex: 1 }, titleRow: { alignItems: 'center', flexDirection: 'row', gap: 8 }, name: { color: colors.text, flexShrink: 1, fontSize: 14, fontWeight: '800' }, vendor: { color: colors.textMuted, fontSize: 11, marginTop: 4 }, cost: { color: colors.green, fontSize: 12, fontWeight: '800', marginTop: 5 }, badge: { backgroundColor: '#E0F2E9', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 }, badgeMuted: { backgroundColor: colors.surfaceMuted }, badgeText: { color: colors.charcoal, fontSize: 9, fontWeight: '800' }, due: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 5 }, dueText: { color: colors.textMuted, fontSize: 10 }, actions: { flexDirection: 'row', gap: 16 }, fab: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 26, bottom: 20, elevation: 5, height: 52, justifyContent: 'center', position: 'absolute', right: 20, width: 52 }, modal: { backgroundColor: colors.background, flex: 1 }, modalHeader: { alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: 18 }, modalTitle: { color: colors.text, flex: 1, fontSize: 20, fontWeight: '800' }, form: { padding: 20 }, field: { marginBottom: 15 }, label: { color: colors.charcoal, fontSize: 13, fontWeight: '700', marginBottom: 7 }, input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 7, borderWidth: 1, color: colors.text, fontSize: 15, minHeight: 48, paddingHorizontal: 13 }, textarea: { minHeight: 90, paddingTop: 12, textAlignVertical: 'top' }, inline: { flexDirection: 'row', gap: 10 }, flex: { flex: 1 }, currency: { width: 95 }, choices: { gap: 7, paddingBottom: 1 }, choice: { borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 }, choiceSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, choiceText: { color: colors.textMuted, fontSize: 10, fontWeight: '700' }, choiceTextSelected: { color: '#FFFFFF' }, switchRow: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 7, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, padding: 13 }, switchTitle: { color: colors.text, fontSize: 13, fontWeight: '700' }, switchHelp: { color: colors.textMuted, fontSize: 9, marginTop: 3, maxWidth: 240 }, save: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 7, marginTop: 5, padding: 14 }, saveText: { color: '#FFFFFF', fontWeight: '800' }, disabled: { opacity: 0.5 },
});