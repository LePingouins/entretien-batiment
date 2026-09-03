import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Bell, ClipboardList, Ellipsis, House, MapPinned, ReceiptText, Siren } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import type { MainTabParamList, RootStackParamList } from './types';
import { colors } from '../theme';
import HomeScreen from '../screens/HomeScreen';
import WorkOrdersScreen from '../screens/WorkOrdersScreen';
import WorkOrderDetailScreen from '../screens/WorkOrderDetailScreen';
import UrgentWorkOrdersScreen from '../screens/UrgentWorkOrdersScreen';
import UrgentWorkOrderDetailScreen from '../screens/UrgentWorkOrderDetailScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import TripsScreen from '../screens/TripsScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import MoreScreen from '../screens/MoreScreen';
import MileageScreen from '../screens/MileageScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import ShoppingListScreen from '../screens/ShoppingListScreen';
import PreventiveMaintenanceScreen from '../screens/PreventiveMaintenanceScreen';
import InventoryScreen from '../screens/InventoryScreen';
import InventoryCountScreen from '../screens/InventoryCountScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import SubscriptionsScreen from '../screens/SubscriptionsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    border: colors.border,
    card: colors.surface,
    primary: colors.primary,
    text: colors.text,
  },
};

export default function AppNavigator() {
  const { signOut } = useAuth();
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerBackTitle: 'Retour',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontSize: 17, fontWeight: '700' },
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="WorkOrderDetail" component={WorkOrderDetailScreen} options={{ title: 'Bon de travail' }} />
        <Stack.Screen name="UrgentWorkOrderDetail" component={UrgentWorkOrderDetailScreen} options={{ title: 'Urgence' }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
        <Stack.Screen name="Mileage" component={MileageScreen} options={{ title: 'Kilométrage' }} />
        <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Statistiques' }} />
        <Stack.Screen name="ShoppingList" component={ShoppingListScreen} options={{ title: 'Liste d’achats' }} />
        <Stack.Screen name="PreventiveMaintenance" component={PreventiveMaintenanceScreen} options={{ title: 'Entretien préventif' }} />
        <Stack.Screen name="Inventory" component={InventoryScreen} options={{ title: 'Inventaire' }} />
        <Stack.Screen name="InventoryCount" component={InventoryCountScreen} options={({ route }) => ({ title: route.params.name })} />
        <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: 'Utilisateurs' }} />
        <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} options={{ title: 'Abonnements' }} />
        <Stack.Screen name="Trips" options={{ headerShown: false }}>
          {() => <TripsScreen onLogout={signOut} />}
        </Stack.Screen>
        <Stack.Screen name="Expenses" options={{ headerShown: false }}>
          {() => <ExpensesScreen onLogout={signOut} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function MainTabs() {
  const { user, canAccess, signOut } = useAuth();
  const isRepresentative = user?.role === 'REPRESENTANT';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text, fontSize: 17, fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 64, paddingBottom: 7, paddingTop: 6 },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Accueil', tabBarIcon: icon(House) }} />
      {isRepresentative ? (
        <>
          <Tab.Screen name="TripsTab" options={{ title: 'Trajets', headerShown: false, tabBarIcon: icon(MapPinned) }}>
            {() => <TripsScreen onLogout={signOut} />}
          </Tab.Screen>
          <Tab.Screen name="ExpensesTab" options={{ title: 'Dépenses', headerShown: false, tabBarIcon: icon(ReceiptText) }}>
            {() => <ExpensesScreen onLogout={signOut} />}
          </Tab.Screen>
        </>
      ) : (
        <>
          {canAccess('WORK_ORDERS') ? <Tab.Screen name="Orders" component={WorkOrdersScreen} options={{ title: 'Bons', tabBarIcon: icon(ClipboardList) }} /> : null}
          {canAccess('URGENT_WORK_ORDERS') ? <Tab.Screen name="Urgent" component={UrgentWorkOrdersScreen} options={{ title: 'Urgences', tabBarIcon: icon(Siren) }} /> : null}
        </>
      )}
      <Tab.Screen name="More" component={MoreScreen} options={{ title: 'Plus', tabBarIcon: icon(Ellipsis) }} />
    </Tab.Navigator>
  );
}

function icon(Icon: typeof Bell) {
  return ({ color, size }: { color: string; size: number }) => <Icon color={color} size={size} />;
}