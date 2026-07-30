import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const PROJECT_ID = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;

/**
 * Requests notification permission and returns an Expo push token for this
 * device, or null if unsupported/denied/failed. Never throws — push
 * registration must never block login or app startup.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    // Simulators/emulators can't receive real push notifications.
    return null;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') {
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    return token;
  } catch (e) {
    console.error('Failed to register for push notifications', e);
    return null;
  }
}

export function getDevicePlatform(): 'android' | 'ios' {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}
