import { riderAuthStore } from '../stores/riderAuthStore';
import {
  riderNotificationService,
  NewOrderNotification,
} from './riderNotificationService';
import { riderService } from '../api/riderService';

export interface WebSocketMessage {
  type: 'new_order' | 'order_update' | 'rider_alert' | 'ping' | 'pong';
  orderId?: string;
  data?: any;
  timestamp?: number;
}

export interface OrderAssignment {
  orderId: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantLat: number;
  restaurantLng: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerLat: number;
  customerLng: number;
  items: { name: string; quantity: number }[];
  totalAmount: number;
  deliveryFee: number;
  distance: number;
  estimatedDeliveryTime: string;
  expiresAt: number;
}

type MessageCallback = (message: WebSocketMessage) => void;
type OrderAssignmentCallback = (order: OrderAssignment) => void;
type ConnectionCallback = (connected: boolean) => void;

interface NativeWebSocket {
  readyState: number;
  send: (data: string) => void;
  close: (code?: number, reason?: string) => void;
  onopen: ((event: any) => void) | null;
  onmessage: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onclose: ((event: any) => void) | null;
}

class RiderWebSocketService {
  private socket: NativeWebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private messageCallbacks: MessageCallback[] = [];
  private orderCallbacks: OrderAssignmentCallback[] = [];
  private connectionCallbacks: ConnectionCallback[] = [];
  private isConnecting = false;
  private shouldReconnect = true;
  private baseUrl: string;

  constructor() {
    const apiUrl = __DEV__
      ? 'ws://localhost:3000'
      : 'wss://foodiegoapp-backend.onrender.com';
    this.baseUrl = `${apiUrl}/api/v1/rider/ws`;
  }

  async connect(): Promise<boolean> {
    if (this.socket?.readyState === 1 || this.isConnecting) {
      return true;
    }

    this.isConnecting = true;
    this.shouldReconnect = true;

    try {
      const session = await riderAuthStore.getSession();
      if (!session) {
        console.warn('No rider session found, cannot connect WebSocket');
        this.isConnecting = false;
        return false;
      }

      const wsUrl = `${this.baseUrl}?token=${session.token}`;
      this.socket = new (WebSocket as any)(wsUrl) as NativeWebSocket;

      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      this.socket.onclose = this.handleClose.bind(this);

      return true;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      return false;
    }
  }

  private handleOpen(): void {
    console.log('Rider WebSocket connected');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.notifyConnectionCallbacks(true);
    this.startPing();
  }

  private handleMessage(event: any): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'new_order':
          this.handleNewOrder(message);
          break;
        case 'order_update':
          this.notifyMessageCallbacks(message);
          break;
        case 'pong':
          break;
        default:
          this.notifyMessageCallbacks(message);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private handleError(error: any): void {
    console.error('Rider WebSocket error:', error);
    this.isConnecting = false;
  }

  private handleClose(event: any): void {
    console.log('Rider WebSocket closed:', event.code, event.reason);
    this.isConnecting = false;
    this.stopPing();
    this.notifyConnectionCallbacks(false);

    if (
      this.shouldReconnect &&
      this.reconnectAttempts < this.maxReconnectAttempts
    ) {
      this.scheduleReconnect();
    }
  }

  private handleNewOrder(message: WebSocketMessage): void {
    if (message.data) {
      const orderAssignment: OrderAssignment = {
        orderId: message.data.orderId || message.orderId || '',
        restaurantName: message.data.restaurantName || 'Restaurant',
        restaurantAddress: message.data.restaurantAddress || '',
        restaurantLat: message.data.restaurantLat || 0,
        restaurantLng: message.data.restaurantLng || 0,
        customerName: message.data.customerName || 'Customer',
        customerPhone: message.data.customerPhone || '',
        customerAddress: message.data.customerAddress || '',
        customerLat: message.data.customerLat || 0,
        customerLng: message.data.customerLng || 0,
        items: message.data.items || [],
        totalAmount: message.data.totalAmount || 0,
        deliveryFee: message.data.deliveryFee || 0,
        distance: message.data.distance || 0,
        estimatedDeliveryTime: message.data.estimatedDeliveryTime || '',
        expiresAt: message.data.expiresAt || Date.now() + 60000,
      };

      this.notifyOrderCallbacks(orderAssignment);

      const notification: NewOrderNotification = {
        orderId: orderAssignment.orderId,
        restaurantName: orderAssignment.restaurantName,
        restaurantAddress: orderAssignment.restaurantAddress,
        customerAddress: orderAssignment.customerAddress,
        deliveryFee: orderAssignment.deliveryFee,
        distance: orderAssignment.distance,
        estimatedEarnings: orderAssignment.deliveryFee,
      };

      riderNotificationService.handleIncomingNotification(
        riderNotificationService.createNewOrderNotification(notification),
      );
    }
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping', timestamp: Date.now() });
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(
      `Scheduling WebSocket reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`,
    );

    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect();
      }
    }, delay);
  }

  send(message: WebSocketMessage): boolean {
    if (this.socket?.readyState === 1) {
      this.socket.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.stopPing();

    if (this.socket) {
      this.socket.close(1000, 'User disconnected');
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.readyState === 1;
  }

  addMessageListener(callback: MessageCallback): () => void {
    this.messageCallbacks.push(callback);
    return () => {
      this.messageCallbacks = this.messageCallbacks.filter(
        cb => cb !== callback,
      );
    };
  }

  addOrderListener(callback: OrderAssignmentCallback): () => void {
    this.orderCallbacks.push(callback);
    return () => {
      this.orderCallbacks = this.orderCallbacks.filter(cb => cb !== callback);
    };
  }

  addConnectionListener(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.push(callback);
    return () => {
      this.connectionCallbacks = this.connectionCallbacks.filter(
        cb => cb !== callback,
      );
    };
  }

  private notifyMessageCallbacks(message: WebSocketMessage): void {
    this.messageCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Message callback error:', error);
      }
    });
  }

  private notifyOrderCallbacks(order: OrderAssignment): void {
    this.orderCallbacks.forEach(callback => {
      try {
        callback(order);
      } catch (error) {
        console.error('Order callback error:', error);
      }
    });
  }

  private notifyConnectionCallbacks(connected: boolean): void {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Connection callback error:', error);
      }
    });
  }

  async acceptOrderFromWebSocket(
    orderId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await riderService.acceptOrder(orderId);
      return { success: result.success, error: result.error };
    } catch {
      return { success: false, error: 'Failed to accept order' };
    }
  }

  async rejectOrderFromWebSocket(
    orderId: string,
    reason: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await riderService.rejectOrder(orderId, reason);
      return { success: result.success, error: result.error };
    } catch {
      return { success: false, error: 'Failed to reject order' };
    }
  }
}

export const riderWebSocketService = new RiderWebSocketService();
export default riderWebSocketService;
