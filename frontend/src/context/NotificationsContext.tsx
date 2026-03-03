import React from 'react';

type NotificationsContextType = {
  count: number;
  markAllRead: () => void;
  // For future: add function to fetch or push notifications
};

export const NotificationsContext = React.createContext<NotificationsContextType>({
  count: 0,
  markAllRead: () => {},
});

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [count, setCount] = React.useState<number>(0);

  // Mock live updates: increment count every 10s by 0-2 items
  React.useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => c + Math.floor(Math.random() * 3));
    }, 10000);
    return () => clearInterval(id);
  }, []);

  const markAllRead = React.useCallback(() => setCount(0), []);

  return (
    <NotificationsContext.Provider value={{ count, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export default NotificationsProvider;
