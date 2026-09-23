import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { registerPushToken, unregisterPushToken } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let registeredToken: string | null = null;

/**
 * Requests notification permission and registers this device's Expo push
 * token with the backend so it can receive push notifications (e.g. when a
 * work order is created/assigned). Best-effort — never throws.
 */
export async function registerForPushNotifications(): Promise<void> {
  try {
    if (!Device.isDevice) return; // push tokens require a physical device

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    registeredToken = tokenResponse.data;
    await registerPushToken(registeredToken, Platform.OS === 'ios' ? 'ios' : 'android');
  } catch {
    // Non-fatal: push notifications are a nice-to-have, not core functionality.
  }
}

export async function unregisterPushNotifications(): Promise<void> {
  if (!registeredToken) return;
  try {
    await unregisterPushToken(registeredToken);
  } catch {
    // Best-effort cleanup.
  } finally {
    registeredToken = null;
  }
}
