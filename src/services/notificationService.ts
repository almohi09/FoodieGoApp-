import { Alert, PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import supabase from '../config/supabase';

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  orderId?: string;
  type?: string;
}

interface SendNotificationInput {
  user_id: string;
  title: string;
  body: string;
  type: 'order_update' | 'promo' | 'system';
  order_id?: string;
}

type Listener = (notification: InAppNotification) => void;

const ASK_COUNT_KEY = 'notifications_permission_ask_count';
const ALLOWED_KEY = 'notifications_permission_allowed';
const ORDER_SUCCESS_COUNT_KEY = 'notifications_order_success_count';

class NotificationService {
  private listeners: Listener[] = [];
  private tokenRefreshUnsubscribe: (() => void) | null = null;
  private foregroundUnsubscribe: (() => void) | null = null;
  private initialized = false;

  addListener(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(item => item !== listener);
    };
  }

  private emit(notification: InAppNotification) {
    this.listeners.forEach(listener => listener(notification));
  }

  async initNotifications(
    userId: string,
    options: { requestPermission?: boolean } = { requestPermission: true },
  ): Promise<void> {
    if (!userId) {
      return;
    }

    if (this.initialized) {
      return;
    }

    const allowed = options.requestPermission === false
      ? await this.hasPermission()
      : await this.requestPermissionIfNeeded();
    if (!allowed) {
      return;
    }

    try {
      const token = await messaging().getToken();
      if (token) {
        await this.saveToken(userId, token);
      }

      this.tokenRefreshUnsubscribe = messaging().onTokenRefresh(nextToken => {
        void this.saveToken(userId, nextToken);
      });

      this.foregroundUnsubscribe = messaging().onMessage(message => {
        const payload = this.mapMessage(message);
        this.emit(payload);
      });
    } catch (e) {
      console.log('[FCM disabled] google-services.json not configured yet');
      return;
    }

    this.initialized = true;
  }

  async initIfPreviouslyAllowed(userId: string): Promise<void> {
    const hasAllowed = (await AsyncStorage.getItem(ALLOWED_KEY)) === 'true';
    if (!hasAllowed) {
      return;
    }

    await this.initNotifications(userId, { requestPermission: false });
  }

  async requestPermissionIfNeeded(): Promise<boolean> {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    try {
      const status = await messaging().requestPermission();
      return (
        status === messaging.AuthorizationStatus.AUTHORIZED ||
        status === messaging.AuthorizationStatus.PROVISIONAL
      );
    } catch (e) {
      console.log('[FCM disabled] google-services.json not configured yet');
      return false;
    }
  }

  async hasPermission(): Promise<boolean> {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }

    try {
      const status = await messaging().hasPermission();
      return (
        status === messaging.AuthorizationStatus.AUTHORIZED ||
        status === messaging.AuthorizationStatus.PROVISIONAL
      );
    } catch (e) {
      console.log('[FCM disabled] google-services.json not configured yet');
      return false;
    }
  }

  async promptForOrderNotifications(userId: string): Promise<void> {
    const hasAllowed = (await AsyncStorage.getItem(ALLOWED_KEY)) === 'true';
    if (hasAllowed) {
      await this.initNotifications(userId);
      return;
    }

    const orderSuccessCount = Number(
      (await AsyncStorage.getItem(ORDER_SUCCESS_COUNT_KEY)) || '0',
    ) + 1;
    await AsyncStorage.setItem(ORDER_SUCCESS_COUNT_KEY, String(orderSuccessCount));

    if (orderSuccessCount !== 1 && orderSuccessCount !== 2) {
      return;
    }

    const askCount = Number((await AsyncStorage.getItem(ASK_COUNT_KEY)) || '0');
    Alert.alert(
      'Get notified when your order is confirmed and on the way?',
      '',
      [
        {
          text: 'Maybe later',
          style: 'cancel',
          onPress: () => {
            void AsyncStorage.setItem(ASK_COUNT_KEY, String(askCount + 1));
          },
        },
        {
          text: 'Allow',
          onPress: () => {
            void AsyncStorage.setItem(ALLOWED_KEY, 'true');
            void AsyncStorage.setItem(ASK_COUNT_KEY, String(askCount + 1));
            void this.initNotifications(userId);
          },
        },
      ],
    );
  }

  async sendNotification(input: SendNotificationInput): Promise<void> {
    await supabase.functions.invoke('send-notification', {
      body: input,
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  }

  private async saveToken(userId: string, token: string): Promise<void> {
    await supabase
      .from('fcm_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,token' },
      );
  }

  private mapMessage(message: FirebaseMessagingTypes.RemoteMessage): InAppNotification {
    const toText = (value: unknown) => (typeof value === 'string' ? value : '');
    const title = toText(message.notification?.title) || toText(message.data?.title) || 'Notification';
    const body = toText(message.notification?.body) || toText(message.data?.body);
    return {
      id: message.messageId || `${Date.now()}`,
      title,
      body,
      orderId: toText(message.data?.order_id) || undefined,
      type: toText(message.data?.type) || undefined,
    };
  }

  cleanup() {
    this.tokenRefreshUnsubscribe?.();
    this.foregroundUnsubscribe?.();
    this.tokenRefreshUnsubscribe = null;
    this.foregroundUnsubscribe = null;
    this.initialized = false;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
