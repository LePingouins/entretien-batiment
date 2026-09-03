export type RootStackParamList = {
  Main: undefined;
  WorkOrderDetail: { id: number };
  UrgentWorkOrderDetail: { id: number };
  Notifications: undefined;
  Trips: undefined;
  Expenses: undefined;
  Mileage: undefined;
  Analytics: undefined;
  ShoppingList: undefined;
  PreventiveMaintenance: undefined;
  Inventory: undefined;
  InventoryCount: { sessionId: number; name: string };
  AdminUsers: undefined;
  Subscriptions: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Orders: undefined;
  Urgent: undefined;
  TripsTab: undefined;
  ExpensesTab: undefined;
  More: undefined;
};