import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Bell,
  Boxes,
  ChartNoAxesCombined,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Gauge,
  Languages,
  LogOut,
  MapPinned,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Users,
  Wrench,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type MoreNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'More'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const ROLE_LABELS = {
  ADMIN: 'Administrateur',
  DEVELOPPER: 'Développeur',
  TECH: 'Technicien',
  WORKER: 'Employé',
  REPRESENTANT: 'Représentant',
} as const;

export default function MoreScreen() {
  const navigation = useNavigation<MoreNavigation>();
  const { user, canAccess, signOut } = useAuth();
  const { lang, setLang, t } = useLang();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.profile}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user?.email?.slice(0, 1).toUpperCase() || '?'}</Text></View>
        <View style={styles.profileText}>
          <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
          <View style={styles.roleRow}><ShieldCheck size={14} color="#9FD3BC" /><Text style={styles.role}>{user ? ROLE_LABELS[user.role] : ''}</Text></View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Outils</Text>
      <View style={styles.menu}>
        {canAccess('NOTIFICATIONS') ? <MenuItem icon={Bell} label="Notifications" onPress={() => navigation.navigate('Notifications')} /> : null}
        {canAccess('MILEAGE') ? <MenuItem icon={Gauge} label="Kilométrage" onPress={() => navigation.navigate('Mileage')} /> : null}
        {canAccess('ANALYTICS') ? <MenuItem icon={ChartNoAxesCombined} label="Statistiques" onPress={() => navigation.navigate('Analytics')} /> : null}
        {canAccess('WORK_ORDERS') || canAccess('URGENT_WORK_ORDERS') ? <MenuItem icon={ShoppingCart} label="Liste d’achats" onPress={() => navigation.navigate('ShoppingList')} /> : null}
        {canAccess('PREVENTIVE_MAINTENANCE') ? <MenuItem icon={Wrench} label="Entretien préventif" onPress={() => navigation.navigate('PreventiveMaintenance')} /> : null}
        {canAccess('INVENTORY') || canAccess('INVENTORY_PRODUCTS') ? <MenuItem icon={Boxes} label="Inventaire" onPress={() => navigation.navigate('Inventory')} /> : null}
        {canAccess('REP_TRIPS') ? <MenuItem icon={MapPinned} label="Trajets et kilométrage GPS" onPress={() => navigation.navigate('Trips')} /> : null}
        {canAccess('REP_EXPENSES') ? <MenuItem icon={ReceiptText} label="Dépenses et reçus" onPress={() => navigation.navigate('Expenses')} /> : null}
        {isAdmin && canAccess('USERS') ? <MenuItem icon={Users} label="Utilisateurs" onPress={() => navigation.navigate('AdminUsers')} /> : null}
        {isAdmin && canAccess('SUBSCRIPTIONS') ? <MenuItem icon={CreditCard} label="Abonnements logiciels" onPress={() => navigation.navigate('Subscriptions')} /> : null}
        <MenuItem icon={ExternalLink} label="Ouvrir le portail web" onPress={() => void Linking.openURL('https://entretien-batiment.com')} />
      </View>

      <Text style={styles.sectionTitle}>{t.settings}</Text>
      <View style={styles.menu}>
        <View style={styles.langRow}>
          <Languages size={21} color={colors.primary} />
          <Text style={styles.menuLabel}>{t.language}</Text>
          <View style={styles.langSwitch}>
            <Pressable
              style={[styles.langOption, lang === 'fr' && styles.langOptionActive]}
              onPress={() => setLang('fr')}
            >
              <Text style={[styles.langOptionText, lang === 'fr' && styles.langOptionTextActive]}>{t.languageFrench}</Text>
            </Pressable>
            <Pressable
              style={[styles.langOption, lang === 'en' && styles.langOptionActive]}
              onPress={() => setLang('en')}
            >
              <Text style={[styles.langOptionText, lang === 'en' && styles.langOptionTextActive]}>{t.languageEnglish}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Pressable style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]} onPress={() => void signOut()}>
        <LogOut size={19} color={colors.red} />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </Pressable>
      <Text style={styles.version}>Entretien Bâtiment mobile</Text>
    </ScrollView>
  );
}

function MenuItem({ icon: Icon, label, onPress }: { icon: typeof Bell; label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]} onPress={onPress}>
      <Icon size={21} color={colors.primary} />
      <Text style={styles.menuLabel}>{label}</Text>
      <ChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: 32 },
  profile: { alignItems: 'center', backgroundColor: colors.charcoal, flexDirection: 'row', gap: 14, padding: 20 },
  avatar: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 24, height: 48, justifyContent: 'center', width: 48 },
  avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  profileText: { flex: 1 },
  email: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  roleRow: { alignItems: 'center', flexDirection: 'row', gap: 5, marginTop: 5 },
  role: { color: '#CBD8D1', fontSize: 12 },
  sectionTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '800', marginHorizontal: 16, marginBottom: 7, marginTop: 20 },
  menu: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderTopColor: colors.border, borderWidth: 1 },
  menuItem: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 12, minHeight: 56, paddingHorizontal: 17 },
  menuItemPressed: { backgroundColor: '#EFF5F1' },
  menuLabel: { color: colors.text, flex: 1, fontSize: 14, fontWeight: '600' },
  langRow: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 56, paddingHorizontal: 17 },
  langSwitch: { flexDirection: 'row', gap: 6 },
  langOption: { borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 5 },
  langOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  langOptionText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  langOptionTextActive: { color: '#FFFFFF' },
  logout: { alignItems: 'center', backgroundColor: colors.surface, borderColor: '#E4C7C5', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 9, justifyContent: 'center', margin: 16, marginTop: 26, padding: 14 },
  logoutPressed: { backgroundColor: '#FFF4F3' },
  logoutText: { color: colors.red, fontSize: 14, fontWeight: '800' },
  version: { color: colors.textMuted, fontSize: 11, textAlign: 'center' },
});