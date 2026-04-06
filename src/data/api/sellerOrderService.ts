import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Order, OrderStatus } from '../../domain/types';
import { parseSecurityActionError } from './securityGuard';

const API_BASE_URL = 'https://api.foodiego.in/api/v1';

export interface SellerOrder extends Order {
  acceptedAt?: string;
  startedPrepAt?: string;
  readyAt?: string;
  pickedAt?: string;
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  inProgressOrders: number;
  completedToday: number;
  cancelledToday: number;
  averagePrepTime: number;
  revenueToday: number;
  revenueWeek: number;
}

class SellerOrderService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.api.interceptors.request.use(async config => {
      if (!this.token) {
        this.token = await AsyncStorage.getItem('auth_token');
      }
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  async getOrders(
    restaurantId: string,
    options: {
      status?: OrderStatus;
      page?: number;
      limit?: number;
      date?: string;
    } = {},
  ): Promise<{
    success: boolean;
    orders?: SellerOrder[];
    total?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/seller/restaurants/${restaurantId}/orders`,
        {
          params: {
            status: options.status,
            page: options.page || 1,
            limit: options.limit || 20,
            date: options.date,
          },
        },
      );
      return {
        success: true,
        orders: response.data.orders,
        total: response.data.total,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch orders',
      };
    }
  }

  async getOrderById(
    restaurantId: string,
    orderId: string,
  ): Promise<{
    success: boolean;
    order?: SellerOrder;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      const response = await this.api.get(
        `/seller/restaurants/${restaurantId}/orders/${orderId}`,
      );
      return { success: true, order: response.data.order };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch order',
      };
    }
  }

  async acceptOrder(
    restaurantId: string,
    orderId: string,
  ): Promise<{
    success: boolean;
    order?: SellerOrder;
    error?: string;
  }> {
    try {
      const response = await this.api.post(
        `/seller/restaurants/${restaurantId}/orders/${orderId}/accept`,
      );
      return { success: true, order: response.data.order };
    } catch (error: any) {
      const parsed = parseSecurityActionError(error, 'Failed to accept order');
      return {
        success: false,
        error: parsed.message,
        errorCode: parsed.errorCode,
        retryAfterSec: parsed.retryAfterSec,
      };
    }
  }

  async rejectOrder(
    restaurantId: string,
    orderId: string,
    reason: string,
  ): Promise<{
    success: boolean;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      await this.api.post(
        `/seller/restaurants/${restaurantId}/orders/${orderId}/reject`,
        { reason },
      );
      return { success: true };
    } catch (error: any) {
      const parsed = parseSecurityActionError(error, 'Failed to reject order');
      return {
        success: false,
        error: parsed.message,
        errorCode: parsed.errorCode,
        retryAfterSec: parsed.retryAfterSec,
      };
    }
  }

  async startPreparing(
    restaurantId: string,
    orderId: string,
  ): Promise<{
    success: boolean;
    order?: SellerOrder;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      const response = await this.api.post(
        `/seller/restaurants/${restaurantId}/orders/${orderId}/start-prep`,
      );
      return { success: true, order: response.data.order };
    } catch (error: any) {
      const parsed = parseSecurityActionError(error, 'Failed to start preparing');
      return {
        success: false,
        error: parsed.message,
        errorCode: parsed.errorCode,
        retryAfterSec: parsed.retryAfterSec,
      };
    }
  }

  async markReady(
    restaurantId: string,
    orderId: string,
  ): Promise<{
    success: boolean;
    order?: SellerOrder;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      const response = await this.api.post(
        `/seller/restaurants/${restaurantId}/orders/${orderId}/ready`,
      );
      return { success: true, order: response.data.order };
    } catch (error: any) {
      const parsed = parseSecurityActionError(error, 'Failed to mark ready');
      return {
        success: false,
        error: parsed.message,
        errorCode: parsed.errorCode,
        retryAfterSec: parsed.retryAfterSec,
      };
    }
  }

  async updateOrderStatus(
    restaurantId: string,
    orderId: string,
    status: OrderStatus,
    notes?: string,
  ): Promise<{
    success: boolean;
    order?: SellerOrder;
    error?: string;
  }> {
    try {
      const response = await this.api.patch(
        `/seller/restaurants/${restaurantId}/orders/${orderId}/status`,
        { status, notes },
      );
      return { success: true, order: response.data.order };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update status',
      };
    }
  }

  async getOrderStats(restaurantId: string): Promise<{
    success: boolean;
    stats?: OrderStats;
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/seller/restaurants/${restaurantId}/orders/stats`,
      );
      return { success: true, stats: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch stats',
      };
    }
  }

  async getPendingOrders(restaurantId: string): Promise<{
    success: boolean;
    orders?: SellerOrder[];
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/seller/restaurants/${restaurantId}/orders/pending`,
      );
      return { success: true, orders: response.data.orders };
    } catch (error: any) {
      return {
        success: false,
        error:
          error.response?.data?.message || 'Failed to fetch pending orders',
      };
    }
  }

  async getActiveOrders(restaurantId: string): Promise<{
    success: boolean;
    orders?: SellerOrder[];
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/seller/restaurants/${restaurantId}/orders/active`,
      );
      return { success: true, orders: response.data.orders };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch active orders',
      };
    }
  }

  async addOrderNote(
    restaurantId: string,
    orderId: string,
    note: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post(
        `/seller/restaurants/${restaurantId}/orders/${orderId}/notes`,
        { note },
      );
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to add note',
      };
    }
  }

  async getPrepTimeHistory(
    restaurantId: string,
    days: number = 7,
  ): Promise<{
    success: boolean;
    history?: { date: string; avgPrepTime: number; orderCount: number }[];
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/seller/restaurants/${restaurantId}/prep-time-history`,
        { params: { days } },
      );
      return { success: true, history: response.data.history };
    } catch (error: any) {
      return {
        success: false,
        error:
          error.response?.data?.message || 'Failed to fetch prep time history',
      };
    }
  }

  async getCancelReasons(restaurantId: string): Promise<{
    success: boolean;
    reasons?: { reason: string; count: number }[];
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/seller/restaurants/${restaurantId}/cancel-reasons`,
      );
      return { success: true, reasons: response.data.reasons };
    } catch (error: any) {
      return {
        success: false,
        error:
          error.response?.data?.message || 'Failed to fetch cancel reasons',
      };
    }
  }
}

export const sellerOrderService = new SellerOrderService();
export default sellerOrderService;
