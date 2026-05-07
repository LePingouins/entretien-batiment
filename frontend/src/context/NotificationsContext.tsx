import React from 'react';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, createBroadcast, markBugReportAsRead, deleteBugReport } from '../lib/api';
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
  bugReportId?: number;
};

export type NotificationsContextType = {
  count: number;
  notifications: NotificationType[];
  broadcastNotifications: NotificationType[];
  bugReportNotifications: NotificationType[];
  filters: Record<string, boolean>;
  setFilters: (f: Record<string, boolean>) => void;
  toggleFilter: (key: string) => void;
  resetFilters: () => void;
  markAllRead: () => void;
  addBroadcastNotification: (id: string, title: string, message: string, href?: string, targetUserId?: number | null) => void;
  removeNotification: (id: string) => void;
  removeBroadcastNotification: (id: string) => void; // Added to the type
  removeBugReportNotification: (reportId: number) => void;
  markRead: (id: string) => void;
  markBroadcastRead: (id: string) => void;
  markBugReportRead: (reportId: number) => void;
  refreshNotifications: () => void;
};
 

export const NotificationsContext = React.createContext<NotificationsContextType>({
  count: 0,
  notifications: [],
  broadcastNotifications: [],
  bugReportNotifications: [],
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
    'bug-report-confirmed': true,
    'broadcast': true,
    other: true,
  },
  setFilters: () => {},
  toggleFilter: () => {},
  resetFilters: () => {},
  markAllRead: () => {},
  addBroadcastNotification: () => {},
  removeBroadcastNotification: () => {},
  removeBugReportNotification: () => {},
  removeNotification: () => {},
  markRead: () => {},
  markBroadcastRead: () => {},
  markBugReportRead: () => {},
  refreshNotifications: () => {},
});

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accessToken, userId } = useAuth();
  const [notifications, setNotifications] = React.useState<NotificationType[]>([]);
  const [broadcastNotifications, setBroadcastNotifications] = React.useState<NotificationType[]>([]);
  const [bugReportNotifications, setBugReportNotifications] = React.useState<NotificationType[]>([]);

  const fetchNotifications = React.useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await getNotifications();
      const bugReportSources = new Set(['bug-report-feature', 'bug-report-confirmed']);
      setNotifications(data.filter(n => n.source !== 'broadcast' && !bugReportSources.has(n.source || '')));
      setBroadcastNotifications(data.filter(n => n.source === 'broadcast'));
      setBugReportNotifications(data.filter(n => bugReportSources.has(n.source || '')));
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  }, [accessToken]);

  React.useEffect(() => {
    fetchNotifications();
    let socketCleanup: { disconnect: () => void } | undefined;
    if (accessToken && userId) {
      socketCleanup = createNotificationSocket(fetchNotifications, userId, accessToken);
    } else if (accessToken) {
      socketCleanup = createNotificationSocket(fetchNotifications, undefined, accessToken);
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
      'bug-report-confirmed': true,
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
      'bug-report-confirmed': true,
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

  const addBroadcastNotification = React.useCallback(async (id: string, title: string, message: string, href?: string, targetUserId?: number | null) => {
    try {
      await createBroadcast(title, message, href, targetUserId);
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

  const removeBugReportNotification = React.useCallback(async (reportId: number) => {
    if (!reportId) return;

    setBugReportNotifications(prev => prev.filter(n => n.bugReportId !== reportId));
    try {
      await deleteBugReport(reportId);
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

  const markBugReportRead = React.useCallback(async (reportId: number) => {
    if (!reportId) return;

    setBugReportNotifications(prev => prev.map(n => n.bugReportId === reportId ? { ...n, read: true } : n));
    try {
      await markBugReportAsRead(reportId);
    } catch (e) {}
  }, []);

  const markAllRead = React.useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setBroadcastNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setBugReportNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await markAllNotificationsAsRead();
    } catch (e) {}
  }, []);

  const toggleFilter = React.useCallback((key: string) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const count = notifications.filter(n => !n.read).length
    + broadcastNotifications.filter(n => !n.read).length
    + bugReportNotifications.filter(n => !n.read).length;

  return (
    <NotificationsContext.Provider value={{
      count,
      notifications,
      broadcastNotifications,
      bugReportNotifications,
      filters,
      setFilters,
      toggleFilter,
      resetFilters,
      markAllRead,
      addBroadcastNotification,
      removeNotification,
      removeBroadcastNotification,
      removeBugReportNotification,
      markRead,
      markBroadcastRead,
      markBugReportRead,
      refreshNotifications: fetchNotifications,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export default NotificationsProvider;
