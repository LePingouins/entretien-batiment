import React from 'react';

export type NotificationType = {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
};

type NotificationsContextType = {
  count: number;
  notifications: NotificationType[];
  markAllRead: () => void;
  addNotification: (title: string, message: string) => void;
};

export const NotificationsContext = React.createContext<NotificationsContextType>({
  count: 0,
  notifications: [],
  markAllRead: () => {},
  addNotification: () => {},
});

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = React.useState<NotificationType[]>([]);

  const addNotification = React.useCallback((title: string, message: string) => {
    setNotifications(prev => [
      {
        id: Math.random().toString(36).substring(2, 9),
        title,
        message,
        date: new Date().toISOString(),
        read: false
      },
      ...prev
    ]);
  }, []);

  const markAllRead = React.useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const count = notifications.filter(n => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ count, notifications, markAllRead, addNotification }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export default NotificationsProvider;
