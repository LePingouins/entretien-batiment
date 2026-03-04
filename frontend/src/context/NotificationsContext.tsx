import React from 'react';

export type NotificationType = {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  href?: string;
  source?: string;
};

type NotificationsContextType = {
  count: number;
  notifications: NotificationType[];
  markAllRead: () => void;
  addNotification: (title: string, message: string, href?: string, source?: string) => void;
  removeNotification: (id: string) => void;
  markRead: (id: string) => void;
};

export const NotificationsContext = React.createContext<NotificationsContextType>({
  count: 0,
  notifications: [],
  markAllRead: () => {},
  addNotification: () => {},
  removeNotification: () => {},
  markRead: () => {},
});

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = React.useState<NotificationType[]>([]);

  // Load saved notifications from localStorage on first render
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('notifications');
      if (raw) {
        const parsed = JSON.parse(raw) as NotificationType[];
        setNotifications(parsed);
      }
    } catch (e) {
      // ignore parse errors
    }
  }, []);

  // Persist notifications to localStorage whenever they change
  React.useEffect(() => {
    try {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    } catch (e) {
      // ignore
    }
  }, [notifications]);

  const addNotification = React.useCallback((title: string, message: string, href?: string, source?: string) => {
    setNotifications(prev => [
      {
        id: Math.random().toString(36).substring(2, 9),
        title,
        message,
        date: new Date().toISOString(),
        read: false,
        href,
        source,
      },
      ...prev
    ]);
  }, []);

  const removeNotification = React.useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const markRead = React.useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = React.useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const count = notifications.filter(n => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ count, notifications, markAllRead, addNotification, removeNotification, markRead }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export default NotificationsProvider;
