import SockJS from 'sockjs-client';
import { Client, Stomp } from '@stomp/stompjs';

export function createNotificationSocket(onUpdate: () => void, userId?: string | number) {
  // Use full backend URL to avoid Vite dev proxy issues with SockJS
  const socket = new SockJS('http://localhost:8080/ws-notifications');
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
