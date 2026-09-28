import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Android remote push notifications functionality provided by expo-notifications
 * was completely removed from Expo Go starting with SDK 53.
 *
 * CRITICAL: Do NOT statically `import * as Notifications from 'expo-notifications'`.
 * The module `expo-notifications/build/index.js` automatically imports
 * `DevicePushTokenAutoRegistration.fx`, which immediately calls:
 *   addPushTokenListener() -> warnOfExpoGoPushUsage()
 * which THROWS an uncatchable fatal error on Android in Expo Go:
 *   "Error: expo-notifications: Android Push notifications (remote notifications)
 *    functionality provided by expo-notifications was removed from Expo Go with the
 *    release of SDK 53. Use a development build instead of Expo Go."
 *
 * Therefore, we must conditionally load `expo-notifications` ONLY when NOT running
 * in Expo Go (`isExpoGo === false`).
 */
export const isExpoGo =
  Constants?.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as any)?.appOwnership === 'expo';

// Safe reference to expo-notifications module (only loaded outside Expo Go)
let Notifications: typeof import('expo-notifications') | null = null;

if (!isExpoGo && Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.warn('[NotificationService] Failed to initialize expo-notifications handler:', e);
  }
} else {
  console.log(
    '[NotificationService] Running inside Expo Go: expo-notifications remote push registration is disabled to prevent Android crash.'
  );
}

class NotificationService {
  private hasConfiguredChannel = false;

  /**
   * Safe check / request for notification permissions.
   * In Expo Go, returns false gracefully without throwing errors.
   */
  public async requestPermissions(): Promise<boolean> {
    if (isExpoGo || !Notifications) {
      console.log(
        '[NotificationService] Notification permissions skipped: not supported in Expo Go on Android (SDK 53+).'
      );
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted' && Platform.OS === 'android' && !this.hasConfiguredChannel) {
        await Notifications.setNotificationChannelAsync('smartstudyhub-reminders', {
          name: 'SmartStudyHub: Напоминания',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#007aff',
          sound: 'default',
          showBadge: true,
        });
        this.hasConfiguredChannel = true;
      }

      return finalStatus === 'granted';
    } catch (e) {
      console.warn('[NotificationService] Permission error:', e);
      return false;
    }
  }

  /**
   * Safely obtain an Expo Push Token.
   * In Expo Go, skips registration and returns null without crashing.
   */
  public async getExpoPushTokenAsync(): Promise<string | null> {
    if (isExpoGo || !Notifications) {
      console.log(
        '[NotificationService] getExpoPushTokenAsync skipped: remote push notifications are not supported in Expo Go (SDK 53+).'
      );
      return null;
    }

    try {
      const granted = await this.requestPermissions();
      if (!granted) return null;

      const tokenData = await Notifications.getExpoPushTokenAsync();
      return tokenData.data;
    } catch (e) {
      console.warn('[NotificationService] Failed to get push token:', e);
      return null;
    }
  }

  /**
   * Safely obtain a Device Push Token.
   * In Expo Go, skips registration and returns null.
   */
  public async getDevicePushTokenAsync(): Promise<string | null> {
    if (isExpoGo || !Notifications) {
      console.log(
        '[NotificationService] getDevicePushTokenAsync skipped: not supported in Expo Go (SDK 53+).'
      );
      return null;
    }

    try {
      const granted = await this.requestPermissions();
      if (!granted) return null;

      const tokenData = await Notifications.getDevicePushTokenAsync();
      return typeof tokenData === 'object' && tokenData?.data ? tokenData.data : String(tokenData);
    } catch (e) {
      console.warn('[NotificationService] Failed to get device push token:', e);
      return null;
    }
  }

  /**
   * Safely add a push token listener.
   * In Expo Go, returns a dummy subscription to prevent warnOfExpoGoPushUsage crash.
   */
  public addPushTokenListener(listener: (token: any) => void): { remove: () => void } {
    if (isExpoGo || !Notifications) {
      console.log(
        '[NotificationService] addPushTokenListener skipped: not supported in Expo Go (SDK 53+).'
      );
      return {
        remove: () => {},
      };
    }

    try {
      return Notifications.addPushTokenListener(listener);
    } catch (e) {
      console.warn('[NotificationService] Failed to add push token listener:', e);
      return {
        remove: () => {},
      };
    }
  }

  /**
   * Safely schedule a reminder.
   * In Expo Go, gracefully returns null and logs an informational message.
   */
  public async scheduleReminder(
    noteId: string,
    title: string,
    body: string,
    triggerDate: Date
  ): Promise<string | null> {
    if (isExpoGo || !Notifications) {
      console.log('[NotificationService] Skipping reminder scheduling in Expo Go.');
      return null;
    }

    try {
      const granted = await this.requestPermissions();
      if (!granted) return null;

      const diffMs = triggerDate.getTime() - Date.now();
      if (diffMs <= 3000) {
        console.warn('[NotificationService] Trigger date is not in future, skipping immediate alert:', diffMs);
        return null;
      }

      const notifTitle = title && title.trim().length > 0
        ? `SmartStudyHub: ${title.trim()}`
        : 'SmartStudyHub: Напоминание';

      const notifBody = body && body.trim().length > 0
        ? body.trim()
        : 'Пора вернуться к вашей заметке в SmartStudyHub';

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notifTitle,
          body: notifBody,
          data: { noteId },
          sound: 'default',
          color: '#007aff',
          channelId: 'smartstudyhub-reminders',
        },
        trigger: {
          date: triggerDate,
        } as any,
      });

      console.log('[NotificationService] Reminder scheduled id:', notificationId, 'at:', triggerDate.toISOString());
      return notificationId;
    } catch (e) {
      console.warn('[NotificationService] Failed to schedule reminder:', e);
      return null;
    }
  }

  /**
   * Safely cancel a scheduled reminder.
   */
  public async cancelReminder(notificationId: string): Promise<void> {
    if (!notificationId || isExpoGo || !Notifications) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (e) {
      console.warn('[NotificationService] Cancel error:', e);
    }
  }
}

export const notificationService = new NotificationService();

// Standalone helper exports for convenience and safety
export const getExpoPushTokenAsync = () => notificationService.getExpoPushTokenAsync();
export const getDevicePushTokenAsync = () => notificationService.getDevicePushTokenAsync();
export const addPushTokenListener = (listener: (token: any) => void) =>
  notificationService.addPushTokenListener(listener);
