import React, { useCallback, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Plus, ShieldCheck, UserRound, X } from 'lucide-react-native';
import { getAdminUsers, inviteAdminUser, setAdminUserEnabled, updateAdminUserRole } from '../lib/api';
import type { AdminUser, UserRole } from '../types/api';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { EmptyState, ErrorState, LoadingState } from '../components/ScreenState';

const ROLES: UserRole[] = ['ADMIN', 'TECH', 'WORKER', 'REPRESENTANT'];
const ROLE_LABELS: Record<UserRole, string> = { ADMIN: 'Admin', DEVELOPPER: 'Développeur', TECH: 'Technicien', WORKER: 'Employé', REPRESENTANT: 'Représentant' };

export default function AdminUsersScreen() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setInviteRole] = useState<UserRole>('WORKER');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try { setUsers(await getAdminUsers()); }
    catch { setError('Les utilisateurs n’ont pas pu être chargés.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function invite() {
    if (!email.includes('@')) {
      Alert.alert('Courriel invalide', 'Entrez une adresse courriel valide.');
      return;
    }
    setInviting(true);
    try {
      await inviteAdminUser(email.trim(), role);
      setVisible(false);
      setEmail('');
      setInviteRole('WORKER');
      await load();
    } catch { Alert.alert('Invitation impossible', 'Le compte n’a pas été invité.'); }
    finally { setInviting(false); }
  }

  async function setEnabled(target: AdminUser, enabled: boolean) {
    if (target.id === currentUser?.id && !enabled) {
      Alert.alert('Action refusée', 'Vous ne pouvez pas désactiver votre propre compte.');
      return;
    }
    setBusyId(target.id);
    try {
      const updated = await setAdminUserEnabled(target.id, enabled);
      setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
    } catch { Alert.alert('Mise à jour impossible'); }
    finally { setBusyId(null); }
  }

  async function updateRole(target: AdminUser, nextRole: UserRole) {
    if (target.role === nextRole) return;
    setBusyId(target.id);
    try {
      const updated = await updateAdminUserRole(target.id, nextRole);
      setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
    } catch { Alert.alert('Mise à jour impossible', 'Le rôle n’a pas été modifié.'); }
    finally { setBusyId(null); }
  }

  if (loading) return <LoadingState label="Chargement des utilisateurs..." />;
  if (error && users.length === 0) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <View style={styles.root}>
      <FlatList
        data={users}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, users.length === 0 && styles.emptyList]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={<View style={styles.hero}><ShieldCheck size={24} color="#9FD3BC" /><View><Text style={styles.heroValue}>{users.filter((user) => user.enabled).length}</Text><Text style={styles.heroLabel}>comptes actifs sur {users.length}</Text></View></View>}
        renderItem={({ item }) => (
          <View style={[styles.user, !item.enabled && styles.userDisabled]}>
            <View style={styles.userHeading}>
              <View style={styles.avatar}><UserRound size={19} color={colors.primary} /></View>
              <View style={styles.userBody}><Text style={styles.email}>{item.email}</Text><Text style={styles.status}>{item.enabled ? 'Actif' : 'Désactivé'}{item.id === currentUser?.id ? ' · Vous' : ''}</Text></View>
              <Switch accessibilityLabel="Compte actif" disabled={busyId === item.id} value={item.enabled} onValueChange={(enabled) => void setEnabled(item, enabled)} trackColor={{ false: '#C9D2CD', true: '#8BC6AD' }} thumbColor={item.enabled ? colors.primary : '#F5F5F5'} />
            </View>
            <View style={styles.roles}>{ROLES.map((candidate) => <Pressable key={candidate} disabled={busyId === item.id || item.id === currentUser?.id} style={[styles.role, item.role === candidate && styles.roleSelected]} onPress={() => void updateRole(item, candidate)}><Text style={[styles.roleText, item.role === candidate && styles.roleTextSelected]}>{ROLE_LABELS[candidate]}</Text></Pressable>)}</View>
          </View>
        )}
        ListEmptyComponent={<EmptyState title="Aucun utilisateur" message="Invitez un utilisateur pour créer son compte." />}
      />
      <Pressable accessibilityLabel="Inviter un utilisateur" style={styles.fab} onPress={() => setVisible(true)}><Plus size={26} color="#FFFFFF" /></Pressable>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVisible(false)}>
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Inviter un utilisateur</Text><Pressable accessibilityLabel="Fermer" onPress={() => setVisible(false)}><X size={24} color={colors.text} /></Pressable></View>
          <View style={styles.form}>
            <Text style={styles.label}>Adresse courriel</Text>
            <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="nom@entreprise.com" placeholderTextColor="#87938D" style={styles.input} />
            <Text style={[styles.label, styles.roleLabel]}>Rôle initial</Text>
            <View style={styles.inviteRoles}>{ROLES.map((candidate) => <Pressable key={candidate} style={[styles.inviteRole, role === candidate && styles.roleSelected]} onPress={() => setInviteRole(candidate)}><Text style={[styles.roleText, role === candidate && styles.roleTextSelected]}>{ROLE_LABELS[candidate]}</Text></Pressable>)}</View>
            <Pressable style={[styles.save, inviting && styles.disabled]} disabled={inviting} onPress={() => void invite()}><Text style={styles.saveText}>{inviting ? 'Invitation...' : 'Envoyer l’invitation'}</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, flex: 1 }, list: { paddingBottom: 90 }, emptyList: { flexGrow: 1 }, hero: { alignItems: 'center', backgroundColor: colors.charcoal, flexDirection: 'row', gap: 12, padding: 18 }, heroValue: { color: '#FFFFFF', fontSize: 21, fontWeight: '800' }, heroLabel: { color: '#CBD8D1', fontSize: 11 }, user: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, padding: 15 }, userDisabled: { opacity: 0.68 }, userHeading: { alignItems: 'center', flexDirection: 'row', gap: 11 }, avatar: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 19, height: 38, justifyContent: 'center', width: 38 }, userBody: { flex: 1 }, email: { color: colors.text, fontSize: 14, fontWeight: '700' }, status: { color: colors.textMuted, fontSize: 11, marginTop: 3 }, roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }, role: { borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 6 }, roleSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, roleText: { color: colors.textMuted, fontSize: 10, fontWeight: '700' }, roleTextSelected: { color: '#FFFFFF' }, fab: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 26, bottom: 20, elevation: 5, height: 52, justifyContent: 'center', position: 'absolute', right: 20, width: 52 }, modal: { backgroundColor: colors.background, flex: 1 }, modalHeader: { alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: 18 }, modalTitle: { color: colors.text, fontSize: 20, fontWeight: '800' }, form: { padding: 20 }, label: { color: colors.charcoal, fontSize: 13, fontWeight: '700', marginBottom: 7 }, roleLabel: { marginTop: 18 }, input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 7, borderWidth: 1, color: colors.text, fontSize: 15, minHeight: 48, paddingHorizontal: 13 }, inviteRoles: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, inviteRole: { borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 }, save: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 7, marginTop: 25, padding: 14 }, saveText: { color: '#FFFFFF', fontWeight: '800' }, disabled: { opacity: 0.5 },
});