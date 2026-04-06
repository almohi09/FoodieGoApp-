import { Order, OrderStatus } from '../../domain/types';
import { createApiClient } from './httpClient';
import {
  asArray,
  asEnum,
  asErrorMessage,
  asObject,
  asOptionalString,
  asTypedObject,
} from './contracts';

interface GetOrdersParams {
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

interface CreateOrderData {
  restaurantId: string;
  items: {
    menuItemId: string;
    quantity: number;
    customizations?: string;
    specialInstructions?: string;
  }[];
  deliveryAddressId: string;
  paymentMethod: 'upi' | 'card' | 'wallet' | 'cod';
  couponCode?: string;
}

interface CancelOrderData {
  reason?: string;
}

const ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'refunded',
] as const;

class OrderService {
  private api = createApiClient();

  constructor() {
    // Shared client handles auth headers, refresh and idempotency.
  }

  async getOrders(params: GetOrdersParams = {}): Promise<{
    success: boolean;
    orders?: Order[];
    total?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.get('/orders', {
        params: {
          status: params.status,
          page: params.page || 1,
          limit: params.limit || 20,
        },
      });
      const data = asObject(response.data, 'orders.getOrders');
      return {
        success: true,
        orders: asArray(data.orders || [], 'orders.getOrders.orders', (item, path) =>
          asTypedObject<Order>(item, path),
        ),
        total: data.total as number | undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to fetch orders'),
      };
    }
  }

  async getOrderById(orderId: string): Promise<{
    success: boolean;
    order?: Order;
    error?: string;
  }> {
    try {
      const response = await this.api.get(`/orders/${orderId}`);
      const data = asObject(response.data, 'orders.getOrderById');
      return {
        success: true,
        order: asTypedObject<Order>(data.order, 'orders.getOrderById.order'),
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to fetch order'),
      };
    }
  }

  async createOrder(data: CreateOrderData): Promise<{
    success: boolean;
    order?: Order;
    error?: string;
  }> {
    try {
      const response = await this.api.post('/orders', data);
      const payload = asObject(response.data, 'orders.createOrder');
      return {
        success: true,
        order: asTypedObject<Order>(payload.order, 'orders.createOrder.order'),
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to create order'),
      };
    }
  }

  async cancelOrder(
    orderId: string,
    data?: CancelOrderData,
  ): Promise<{
    success: boolean;
    order?: Order;
    error?: string;
  }> {
    try {
      const response = await this.api.post(
        `/orders/${orderId}/cancel`,
        data || {},
      );
      const payload = asObject(response.data, 'orders.cancelOrder');
      return {
        success: true,
        order: asTypedObject<Order>(payload.order, 'orders.cancelOrder.order'),
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to cancel order'),
      };
    }
  }

  async reorder(orderId: string): Promise<{
    success: boolean;
    cartItems?: CreateOrderData['items'];
    error?: string;
  }> {
    try {
      const response = await this.api.post(`/orders/${orderId}/reorder`);
      const data = asObject(response.data, 'orders.reorder');
      return {
        success: true,
        cartItems: asArray(data.cartItems || [], 'orders.reorder.cartItems', item =>
          item as CreateOrderData['items'][number],
        ),
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to reorder'),
      };
    }
  }

  async getActiveOrders(): Promise<{
    success: boolean;
    orders?: Order[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/orders/active');
      const data = asObject(response.data, 'orders.getActiveOrders');
      return {
        success: true,
        orders: asArray(data.orders || [], 'orders.getActiveOrders.orders', (item, path) =>
          asTypedObject<Order>(item, path),
        ),
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to fetch active orders'),
      };
    }
  }

  async getOrderStatus(orderId: string): Promise<{
    success: boolean;
    status?: OrderStatus;
    estimatedDelivery?: string;
    error?: string;
  }> {
    try {
      const response = await this.api.get(`/orders/${orderId}/status`);
      const data = asObject(response.data, 'orders.getOrderStatus');
      return {
        success: true,
        status: asEnum(data.status, 'orders.getOrderStatus.status', ORDER_STATUSES),
        estimatedDelivery: asOptionalString(
          data.estimatedDelivery,
          'orders.getOrderStatus.estimatedDelivery',
        ),
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to fetch order status'),
      };
    }
  }

  async getOrderTracking(orderId: string): Promise<{
    success: boolean;
    order?: Order;
    events?: OrderTrackingEvent[];
    error?: string;
  }> {
    try {
      const response = await this.api.get(`/orders/${orderId}/tracking`);
      const data = asObject(response.data, 'orders.getOrderTracking');
      return {
        success: true,
        order: asTypedObject<Order>(data.order, 'orders.getOrderTracking.order'),
        events: asArray(data.events || [], 'orders.getOrderTracking.events', (item, path) =>
          asTypedObject<OrderTrackingEvent>(item, path),
        ),
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to fetch tracking'),
      };
    }
  }

  async rateOrder(
    orderId: string,
    rating: number,
    review?: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post(`/orders/${orderId}/rate`, { rating, review });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to rate order'),
      };
    }
  }
}

export interface OrderTrackingEvent {
  id: string;
  status: OrderStatus;
  timestamp: string;
  message: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export const orderService = new OrderService();
export default orderService;
