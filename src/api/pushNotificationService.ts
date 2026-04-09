import AsyncStorage from '@react-native-async-storage/async-storage';
import { OrderStatus } from '../types';

import appEnv from '../config/env';

const API_BASE_URL = appEnv.apiBaseUrl;
const PUSH_TOKEN_KEY = '@push_token';
const NOTIFICATION_SETTINGS_KEY = '@notification_settings';

export interface NotificationSettings {
  orderUpdates: boolean;
  promotions: boolean;
  recommendations: boolean;
  deliveryUpdates: boolean;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: {
    type: 'order_update' | 'promotion' | 'system';
    orderId?: string;
    actionUrl?: string;
  };
}

class PushNotificationService {
  private pushToken: string | null = null;
  private listeners: Array<(payload: PushNotificationPayload) => void> = [];

  async initialize(): Promise<void> {
    try {
      const savedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (savedToken) {
        this.pushToken = savedToken;
      }
    } catch (error) {
      console.warn('Failed to initialize push notification service', error);
    }
  }

  async requestPermission(): Promise<boolean> {
    return true;
  }

  async getToken(): Promise<string | null> {
    return this.pushToken;
  }

  async setToken(token: string): Promise<void> {
    this.pushToken = token;
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  }

  async registerDevice(
    userId: string,
    token: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/register-device`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, token }),
        },
      );
      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
      };
      if (data.success) {
        await this.setToken(token);
      }
      return { success: data.success ?? false, error: data.error };
    } catch {
      return {
        success: false,
        error: 'Failed to register device',
      };
    }
  }

  async unregisterDevice(): Promise<void> {
    if (this.pushToken) {
      try {
        await fetch(`${API_BASE_URL}/notifications/unregister-device`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: this.pushToken }),
        });
      } catch (error) {
        console.warn('Failed to unregister device', error);
      }
    }
    this.pushToken = null;
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  }

  async subscribeToOrder(orderId: string): Promise<{ success: boolean }> {
    try {
      await fetch(`${API_BASE_URL}/notifications/subscribe/${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await AsyncStorage.getItem('auth_token')}`,
        },
      });
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  async unsubscribeFromOrder(orderId: string): Promise<{ success: boolean }> {
    try {
      await fetch(`${API_BASE_URL}/notifications/unsubscribe/${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await AsyncStorage.getItem('auth_token')}`,
        },
      });
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  async getNotificationSettings(): Promise<NotificationSettings> {
    try {
      const saved = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {
      orderUpdates: true,
      promotions: true,
      recommendations: true,
      deliveryUpdates: true,
    };
  }

  async updateNotificationSettings(
    settings: NotificationSettings,
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(
        NOTIFICATION_SETTINGS_KEY,
        JSON.stringify(settings),
      );
      await fetch(`${API_BASE_URL}/notifications/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await AsyncStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(settings),
      });
    } catch (error) {
      console.warn('Failed to update notification settings', error);
    }
  }

  addListener(
    callback: (payload: PushNotificationPayload) => void,
  ): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  handleNotification(payload: PushNotificationPayload): void {
    this.listeners.forEach(listener => listener(payload));
  }

  getOrderStatusNotification(
    status: OrderStatus,
    orderId: string,
  ): PushNotificationPayload {
    const messages: Record<OrderStatus, { title: string; body: string }> = {
      pending: {
        title: 'Order Placed!',
        body: 'Your order has been received and is being reviewed.',
      },
      confirmed: {
        title: 'Order Confirmed!',
        body: 'Restaurant has accepted your order.',
      },
      preparing: {
        title: 'Preparing Your Food',
        body: 'The restaurant is preparing your delicious meal.',
      },
      out_for_delivery: {
        title: 'Out for Delivery',
        body: 'Your order is on its way! Track the rider in real-time.',
      },
      delivered: {
        title: 'Order Delivered!',
        body: 'Your order has been delivered. Enjoy your meal!',
      },
      cancelled: {
        title: 'Order Cancelled',
        body: 'Your order has been cancelled. Refund will be processed.',
      },
      refunded: {
        title: 'Refund Processed',
        body: 'Your refund has been processed successfully.',
      },
    };

    const message = messages[status];
    return {
      title: message.title,
      body: message.body,
      data: {
        type: 'order_update',
        orderId,
        actionUrl: `/orders/${orderId}`,
      },
    };
  }

  getPromotionalNotification(
    title: string,
    body: string,
    promoCode?: string,
  ): PushNotificationPayload {
    return {
      title,
      body: promoCode ? `${body} Use code: ${promoCode}` : body,
      data: {
        type: 'promotion',
        actionUrl: promoCode ? `/promotions/${promoCode}` : '/promotions',
      },
    };
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;


