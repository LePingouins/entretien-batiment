import React, { createContext, useContext, ReactNode } from 'react';
import { NotificationsContext } from './NotificationsContext';

export type Broadcast = {
  id: string;
  message: string;
  createdAt: string;
};

type BroadcastContextType = {
  broadcast: Broadcast | null;
  createBroadcast: (message: string) => void;
  clearBroadcast: () => void;
  dismissBroadcastForThisUser: () => void;
};

const BroadcastContext = createContext<BroadcastContextType | undefined>(undefined);

export const BroadcastProvider = ({ children }: { children: ReactNode }) => {
  const notificationsCtx = React.useContext(NotificationsContext) as any;

  // Derive the active broadcast from the notifications
  const activeUnreadBroadcasts = (notificationsCtx?.broadcastNotifications || [])
    .filter((n: any) => !n.read)
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const active = activeUnreadBroadcasts.length > 0 ? activeUnreadBroadcasts[0] : null;

  const broadcast: Broadcast | null = active ? {
    id: active.id,
    message: active.message,
    createdAt: active.date
  } : null;

  const createBroadcast = async (message: string) => {
    try {
      if (notificationsCtx && typeof notificationsCtx.addBroadcastNotification === 'function') {
        notificationsCtx.addBroadcastNotification('', 'Broadcast', message, '/notifications');
      }
    } catch (e) {}
  };

  const clearBroadcast = async () => {
    // There is no "global clear" anymore, but we can mark all as read for this user.
    if (active && notificationsCtx?.markBroadcastRead) {
       notificationsCtx.markBroadcastRead(active.id);
    }
  };

  const dismissBroadcastForThisUser = async () => {
    if (!broadcast) return;
    try {
      if (notificationsCtx && typeof notificationsCtx.markBroadcastRead === 'function') {
        notificationsCtx.markBroadcastRead(broadcast.id);
      }
    } catch (e) {}
  };

  return (
    <BroadcastContext.Provider value={{ broadcast, createBroadcast, clearBroadcast, dismissBroadcastForThisUser }}>
      {children}
    </BroadcastContext.Provider>
  );
};

export const useBroadcast = () => {
  const ctx = useContext(BroadcastContext);
  if (!ctx) throw new Error('useBroadcast must be used within BroadcastProvider');
  return ctx;
};

export default BroadcastProvider;
