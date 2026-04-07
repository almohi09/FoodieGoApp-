import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import appEnv from '../../config/env';

const API_BASE_URL = appEnv.apiBaseUrl;

export interface DashboardStats {
  totalOrders: number;
  activeOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalUsers: number;
  totalSellers: number;
  ordersToday: number;
  revenueToday: number;
  newUsersToday: number;
  newSellersToday: number;
}

export interface OrderMetrics {
  total: number;
  pending: number;
  confirmed: number;
  preparing: number;
  outForDelivery: number;
  delivered: number;
  cancelled: number;
  refunded: number;
}

export interface SLAMetrics {
  avgPrepTime: number;
  avgDeliveryTime: number;
  onTimeDeliveryRate: number;
  avgFirstResponseTime: number;
  avgResolutionTime: number;
  slaBreaches: {
    prepTimeBreaches: number;
    deliveryTimeBreaches: number;
    responseTimeBreaches: number;
  };
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface TopPerformer {
  id: string;
  name: string;
  type: 'seller' | 'user';
  metric: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
}

export interface Alert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  category: 'orders' | 'sla' | 'revenue' | 'users';
  title: string;
  message: string;
  actionRequired: boolean;
  createdAt: string;
}

class AdminDashboardService {
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

  async getDashboardStats(): Promise<{
    success: boolean;
    stats?: DashboardStats;
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/dashboard/stats');
      return { success: true, stats: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch stats',
      };
    }
  }

  async getOrderMetrics(
    options: {
      startDate?: string;
      endDate?: string;
    } = {},
  ): Promise<{
    success: boolean;
    metrics?: OrderMetrics;
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/dashboard/order-metrics', {
        params: options,
      });
      return { success: true, metrics: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch metrics',
      };
    }
  }

  async getSLAMetrics(
    options: {
      startDate?: string;
      endDate?: string;
    } = {},
  ): Promise<{
    success: boolean;
    metrics?: SLAMetrics;
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/dashboard/sla-metrics', {
        params: options,
      });
      return { success: true, metrics: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch SLA metrics',
      };
    }
  }

  async getRevenueChart(period: 'day' | 'week' | 'month' = 'week'): Promise<{
    success: boolean;
    data?: ChartDataPoint[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/dashboard/revenue-chart', {
        params: { period },
      });
      return { success: true, data: response.data.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch chart',
      };
    }
  }

  async getOrdersChart(period: 'day' | 'week' | 'month' = 'week'): Promise<{
    success: boolean;
    data?: ChartDataPoint[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/dashboard/orders-chart', {
        params: { period },
      });
      return { success: true, data: response.data.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch chart',
      };
    }
  }

  async getTopSellers(limit: number = 10): Promise<{
    success: boolean;
    sellers?: {
      id: string;
      businessName: string;
      totalOrders: number;
      totalRevenue: number;
      avgRating: number;
      trend: 'up' | 'down' | 'stable';
    }[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/dashboard/top-sellers', {
        params: { limit },
      });
      return { success: true, sellers: response.data.sellers };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch top sellers',
      };
    }
  }

  async getTopRestaurants(limit: number = 10): Promise<{
    success: boolean;
    restaurants?: {
      id: string;
      name: string;
      sellerName: string;
      totalOrders: number;
      totalRevenue: number;
      avgPrepTime: number;
    }[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/dashboard/top-restaurants', {
        params: { limit },
      });
      return { success: true, restaurants: response.data.restaurants };
    } catch (error: any) {
      return {
        success: false,
        error:
          error.response?.data?.message || 'Failed to fetch top restaurants',
      };
    }
  }

  async getDeliveryDelayReport(
    options: {
      startDate?: string;
      endDate?: string;
      threshold?: number;
    } = {},
  ): Promise<{
    success: boolean;
    delays?: {
      orderId: string;
      restaurantName: string;
      expectedTime: string;
      actualTime: string;
      delayMinutes: number;
      riderId?: string;
    }[];
    total?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/reports/delivery-delays', {
        params: options,
      });
      return {
        success: true,
        delays: response.data.delays,
        total: response.data.total,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch delays',
      };
    }
  }

  async getPrepTimeReport(
    options: {
      startDate?: string;
      endDate?: string;
      threshold?: number;
    } = {},
  ): Promise<{
    success: boolean;
    breaches?: {
      orderId: string;
      restaurantName: string;
      expectedPrepTime: number;
      actualPrepTime: number;
      delayMinutes: number;
    }[];
    total?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/reports/prep-time-breaches', {
        params: options,
      });
      return {
        success: true,
        breaches: response.data.breaches,
        total: response.data.total,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch breaches',
      };
    }
  }

  async getCancellationReport(
    options: {
      startDate?: string;
      endDate?: string;
    } = {},
  ): Promise<{
    success: boolean;
    cancellations?: {
      orderId: string;
      restaurantName?: string;
      reason: string;
      cancelledBy: 'user' | 'seller' | 'system' | 'delivery';
      cancelledAt: string;
      refundStatus: string;
    }[];
    total?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/reports/cancellations', {
        params: options,
      });
      return {
        success: true,
        cancellations: response.data.cancellations,
        total: response.data.total,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch cancellations',
      };
    }
  }

  async getAlerts(): Promise<{
    success: boolean;
    alerts?: Alert[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/alerts');
      return { success: true, alerts: response.data.alerts };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch alerts',
      };
    }
  }

  async acknowledgeAlert(alertId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post(`/admin/alerts/${alertId}/acknowledge`);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to acknowledge alert',
      };
    }
  }

  async getUserGrowth(
    options: {
      period?: 'week' | 'month' | 'year';
    } = {},
  ): Promise<{
    success: boolean;
    data?: ChartDataPoint[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/dashboard/user-growth', {
        params: options,
      });
      return { success: true, data: response.data.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch user growth',
      };
    }
  }

  async getRetentionMetrics(): Promise<{
    success: boolean;
    metrics?: {
      dailyActiveUsers: number;
      weeklyActiveUsers: number;
      monthlyActiveUsers: number;
      retentionRate: number;
      churnRate: number;
    };
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/dashboard/retention');
      return { success: true, metrics: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch retention',
      };
    }
  }
}

export const adminDashboardService = new AdminDashboardService();
export default adminDashboardService;

