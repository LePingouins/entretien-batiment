import SockJS from 'sockjs-client';
import { Client, Stomp } from '@stomp/stompjs';

export function createNotificationSocket(onUpdate: () => void, userId?: string | number) {
  const wsBase = import.meta.env.VITE_API_URL || window.location.origin;
  const socket = new SockJS(`${wsBase}/ws-notifications`);
  const stompClient = Stomp.over(socket);
  let connected = false;

  stompClient.connect({}, () => {
    connected = true;
    if (userId) {
      stompClient.subscribe(`/topic/notifications/${userId}`, () => {
        onUpdate();
      });
    }
    stompClient.subscribe('/topic/notifications/broadcast', () => {
      onUpdate();
    });
  });

  return {
    disconnect: () => {
      if (connected) stompClient.disconnect();
    }
  };
}
