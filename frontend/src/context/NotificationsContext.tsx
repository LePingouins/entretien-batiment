import React from 'react';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, createBroadcast } from '../lib/api';
import { useAuth } from './AuthContext';
import { createNotificationSocket } from '../lib/notificationSocket';

export type NotificationType = {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  href?: string;
  source?: string;
};

export type NotificationsContextType = {
  count: number;
  notifications: NotificationType[];
  broadcastNotifications: NotificationType[];
  filters: Record<string, boolean>;
  setFilters: (f: Record<string, boolean>) => void;
  toggleFilter: (key: string) => void;
  resetFilters: () => void;
  markAllRead: () => void;
  addBroadcastNotification: (id: string, title: string, message: string, href?: string) => void;
  removeNotification: (id: string) => void;
  removeBroadcastNotification: (id: string) => void; // Added to the type
  markRead: (id: string) => void;
  markBroadcastRead: (id: string) => void;
  refreshNotifications: () => void;
};
 

export const NotificationsContext = React.createContext<NotificationsContextType>({
  count: 0,
  notifications: [],
  broadcastNotifications: [],
  filters: {
    'workorder-create': true,
    'workorder-delete': true,
    'urgent-create': true,
    'urgent-delete': true,
    'mileage-create': true,
    'mileage-delete': true,
    'user-invite': true,
    'user-welcome': true,
    'user-reset-password': true,
    'user-email-change': true,
    'user-delete': true,
    'user-activate': true,
    'user-deactivate': true,
    'broadcast': true,
    other: true,
  },
  setFilters: () => {},
  toggleFilter: () => {},
  resetFilters: () => {},
  markAllRead: () => {},
  addBroadcastNotification: () => {},
  removeBroadcastNotification: () => {},
  removeNotification: () => {},
  markRead: () => {},
  markBroadcastRead: () => {},
  refreshNotifications: () => {},
});

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accessToken, userId } = useAuth();
  const [notifications, setNotifications] = React.useState<NotificationType[]>([]);
  const [broadcastNotifications, setBroadcastNotifications] = React.useState<NotificationType[]>([]);

  const fetchNotifications = React.useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await getNotifications();
      // split into regular and broadcast notifications based on source
      setNotifications(data.filter(n => n.source !== 'broadcast'));
      setBroadcastNotifications(data.filter(n => n.source === 'broadcast'));
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  }, [accessToken]);

  React.useEffect(() => {
    fetchNotifications();
    let socketCleanup: { disconnect: () => void } | undefined;
    if (accessToken && userId) {
      socketCleanup = createNotificationSocket(fetchNotifications, userId);
    } else if (accessToken) {
      socketCleanup = createNotificationSocket(fetchNotifications);
    }
    return () => {
      if (socketCleanup) socketCleanup.disconnect();
    };
  }, [fetchNotifications, accessToken, userId]);

  const [filters, setFilters] = React.useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('notification_filters');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      // ignore
    }
    return {
      'workorder-create': true,
      'workorder-delete': true,
      'urgent-create': true,
      'urgent-delete': true,
      'mileage-create': true,
      'mileage-delete': true,
      'user-invite': true,
      'user-welcome': true,
      'user-reset-password': true,
      'user-email-change': true,
      'user-delete': true,
      'user-activate': true,
      'user-deactivate': true,
      'broadcast': true,
      other: true,
    };
  });

  const resetFilters = React.useCallback(() => {
    setFilters({
      'workorder-create': true,
      'workorder-delete': true,
      'urgent-create': true,
      'urgent-delete': true,
      'mileage-create': true,
      'mileage-delete': true,
      'user-invite': true,
      'user-welcome': true,
      'user-reset-password': true,
      'user-email-change': true,
      'user-delete': true,
      'user-activate': true,
      'user-deactivate': true,
      'broadcast': true,
      other: true,
    });
  }, []);

  // Listen for storage events to sync cross-tab filters
  React.useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'notification_filters') {
        try {
          if (e.newValue) {
            setFilters(JSON.parse(e.newValue));
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem('notification_filters', JSON.stringify(filters));
    } catch (e) {}
  }, [filters]);

  const addBroadcastNotification = React.useCallback(async (id: string, title: string, message: string, href?: string) => {
    try {
      await createBroadcast(title, message, href);
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  }, [fetchNotifications]);

  const removeBroadcastNotification = React.useCallback(async (id: string) => {
    setBroadcastNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await deleteNotification(id);
    } catch (e) {}
  }, []);

  const removeNotification = React.useCallback(async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await deleteNotification(id);
    } catch (e) {}
  }, []);

  const markRead = React.useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await markNotificationAsRead(id);
    } catch (e) {}
  }, []);

  const markBroadcastRead = React.useCallback(async (id: string) => {
    setBroadcastNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await markNotificationAsRead(id);
    } catch (e) {}
  }, []);

  const markAllRead = React.useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setBroadcastNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await markAllNotificationsAsRead();
    } catch (e) {}
  }, []);

  const toggleFilter = React.useCallback((key: string) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const count = notifications.filter(n => !n.read).length + broadcastNotifications.filter(n => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ count, notifications, broadcastNotifications, filters, setFilters, toggleFilter, resetFilters, markAllRead, addBroadcastNotification, removeNotification, removeBroadcastNotification, markRead, markBroadcastRead, refreshNotifications: fetchNotifications }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export default NotificationsProvider;
