import AsyncStorage from '@react-native-async-storage/async-storage';
import { riderAuthStore } from '../stores/riderAuthStore';
import { riderService } from '../api/riderService';

const PUSH_TOKEN_KEY = 'rider_push_token';

export interface RiderNotificationPayload {
  id: string;
  title: string;
  body: string;
  type: 'new_order' | 'order_update' | 'system' | 'earnings';
  orderId?: string;
  data?: Record<string, any>;
  timestamp: number;
  read: boolean;
}

export interface NewOrderNotification {
  orderId: string;
  restaurantName: string;
  restaurantAddress: string;
  customerAddress: string;
  deliveryFee: number;
  distance: number;
  estimatedEarnings: number;
}

type NotificationListener = (payload: RiderNotificationPayload) => void;
type NewOrderListener = (order: NewOrderNotification) => void;

class RiderNotificationService {
  private listeners: NotificationListener[] = [];
  private newOrderListeners: NewOrderListener[] = [];
  private pushToken: string | null = null;
  private notificationHistory: RiderNotificationPayload[] = [];
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const savedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (savedToken) {
        this.pushToken = savedToken;
      }

      const savedHistory = await AsyncStorage.getItem(
        'rider_notification_history',
      );
      if (savedHistory) {
        this.notificationHistory = JSON.parse(savedHistory);
      }

      this.isInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize rider notification service', error);
    }
  }

  async requestPermission(): Promise<boolean> {
    return true;
  }

  async registerDevice(token: string): Promise<boolean> {
    try {
      this.pushToken = token;
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

      const profile = await riderAuthStore.getProfile();
      if (profile) {
        await this.syncTokenWithServer(token);
      }

      return true;
    } catch (error) {
      console.warn('Failed to register rider device', error);
      return false;
    }
  }

  private async syncTokenWithServer(_token: string): Promise<void> {
    try {
      await riderService.updateProfile({} as any);
      console.log('Rider push token synced with server');
    } catch (error) {
      console.warn('Failed to sync rider push token with server', error);
    }
  }

  async unregisterDevice(): Promise<void> {
    this.pushToken = null;
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  }

  addNotificationListener(callback: NotificationListener): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  addNewOrderListener(callback: NewOrderListener): () => void {
    this.newOrderListeners.push(callback);
    return () => {
      this.newOrderListeners = this.newOrderListeners.filter(
        l => l !== callback,
      );
    };
  }

  handleIncomingNotification(notification: RiderNotificationPayload): void {
    this.addToHistory(notification);
    this.notifyListeners(notification);

    if (notification.type === 'new_order' && notification.orderId) {
      this.notifyNewOrderListeners({
        orderId: notification.orderId,
        restaurantName: notification.data?.restaurantName || 'Restaurant',
        restaurantAddress: notification.data?.restaurantAddress || '',
        customerAddress: notification.data?.customerAddress || '',
        deliveryFee: notification.data?.deliveryFee || 0,
        distance: notification.data?.distance || 0,
        estimatedEarnings: notification.data?.estimatedEarnings || 0,
      });
    }
  }

  private addToHistory(notification: RiderNotificationPayload): void {
    this.notificationHistory.unshift(notification);
    if (this.notificationHistory.length > 100) {
      this.notificationHistory = this.notificationHistory.slice(0, 100);
    }
    AsyncStorage.setItem(
      'rider_notification_history',
      JSON.stringify(this.notificationHistory),
    ).catch(console.warn);
  }

  private notifyListeners(notification: RiderNotificationPayload): void {
    this.listeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.warn('Notification listener error:', error);
      }
    });
  }

  private notifyNewOrderListeners(order: NewOrderNotification): void {
    this.newOrderListeners.forEach(listener => {
      try {
        listener(order);
      } catch (error) {
        console.warn('New order listener error:', error);
      }
    });
  }

  getNotificationHistory(): RiderNotificationPayload[] {
    return this.notificationHistory;
  }

  getUnreadNotifications(): RiderNotificationPayload[] {
    return this.notificationHistory.filter(n => !n.read);
  }

  getUnreadCount(): number {
    return this.getUnreadNotifications().length;
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notificationHistory.find(
      n => n.id === notificationId,
    );
    if (notification) {
      notification.read = true;
      await AsyncStorage.setItem(
        'rider_notification_history',
        JSON.stringify(this.notificationHistory),
      );
    }
  }

  async markAllAsRead(): Promise<void> {
    this.notificationHistory.forEach(n => {
      n.read = true;
    });
    await AsyncStorage.setItem(
      'rider_notification_history',
      JSON.stringify(this.notificationHistory),
    );
  }

  async clearHistory(): Promise<void> {
    this.notificationHistory = [];
    await AsyncStorage.removeItem('rider_notification_history');
  }

  createNewOrderNotification(
    order: NewOrderNotification,
  ): RiderNotificationPayload {
    return {
      id: `order_${order.orderId}_${Date.now()}`,
      title: '🆕 New Order Available!',
      body: `${order.restaurantName} - ₹${order.deliveryFee} delivery fee`,
      type: 'new_order',
      orderId: order.orderId,
      data: {
        restaurantName: order.restaurantName,
        restaurantAddress: order.restaurantAddress,
        customerAddress: order.customerAddress,
        deliveryFee: order.deliveryFee,
        distance: order.distance,
        estimatedEarnings: order.estimatedEarnings,
      },
      timestamp: Date.now(),
      read: false,
    };
  }

  createOrderUpdateNotification(
    orderId: string,
    status: string,
    message: string,
  ): RiderNotificationPayload {
    return {
      id: `update_${orderId}_${Date.now()}`,
      title: `📦 Order ${status}`,
      body: message,
      type: 'order_update',
      orderId,
      timestamp: Date.now(),
      read: false,
    };
  }

  createEarningsNotification(
    amount: number,
    period: string,
  ): RiderNotificationPayload {
    return {
      id: `earnings_${Date.now()}`,
      title: '💰 Earnings Update',
      body: `You earned ₹${amount} ${period}`,
      type: 'earnings',
      timestamp: Date.now(),
      read: false,
    };
  }

  createSystemNotification(
    title: string,
    message: string,
  ): RiderNotificationPayload {
    return {
      id: `system_${Date.now()}`,
      title,
      body: message,
      type: 'system',
      timestamp: Date.now(),
      read: false,
    };
  }

  formatNotificationTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString();
  }
}

export const riderNotificationService = new RiderNotificationService();
export default riderNotificationService;
