import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import appEnv from '../../config/env';

const API_BASE_URL = appEnv.apiBaseUrl;

export type EventName =
  | 'app_open'
  | 'app_close'
  | 'page_view'
  | 'search'
  | 'restaurant_view'
  | 'menu_view'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'view_cart'
  | 'checkout_start'
  | 'checkout_complete'
  | 'order_placed'
  | 'order_cancelled'
  | 'payment_initiated'
  | 'payment_success'
  | 'payment_failed'
  | 'review_submitted'
  | 'support_contacted';

export interface AnalyticsEvent {
  name: EventName;
  properties?: Record<string, any>;
  timestamp?: string;
}

export interface FunnelStep {
  step: string;
  users: number;
  dropoff: number;
  conversionRate: number;
}

export interface FunnelData {
  name: string;
  steps: FunnelStep[];
  overallConversion: number;
}

export interface UserMetric {
  date: string;
  newUsers: number;
  activeUsers: number;
  returningUsers: number;
  sessions: number;
  avgSessionDuration: number;
}

export interface RevenueMetric {
  date: string;
  revenue: number;
  orders: number;
  aov: number;
}

export interface CohortData {
  cohort: string;
  retention: number[];
}

class AnalyticsService {
  private api: AxiosInstance;
  private token: string | null = null;
  private eventQueue: AnalyticsEvent[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;

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

    this.startFlushInterval();
  }

  private startFlushInterval(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 10000);
  }

  async track(
    event: AnalyticsEvent | EventName,
    properties?: Record<string, any>,
  ): Promise<void> {
    const analyticsEvent: AnalyticsEvent = {
      name: typeof event === 'string' ? event : event.name,
      properties: typeof event === 'string' ? properties : event.properties,
      timestamp: new Date().toISOString(),
    };

    this.eventQueue.push(analyticsEvent);

    if (this.eventQueue.length >= 10) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await this.api.post('/analytics/events', { events });
    } catch {
      this.eventQueue = [...events, ...this.eventQueue];
    }
  }

  async getFunnel(
    funnelId: string,
    options: {
      startDate?: string;
      endDate?: string;
    } = {},
  ): Promise<{
    success: boolean;
    funnel?: FunnelData;
    error?: string;
  }> {
    try {
      const response = await this.api.get(`/analytics/funnels/${funnelId}`, {
        params: options,
      });
      return { success: true, funnel: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch funnel',
      };
    }
  }

  async getUserMetrics(
    options: {
      startDate?: string;
      endDate?: string;
      granularity?: 'day' | 'week' | 'month';
    } = {},
  ): Promise<{
    success: boolean;
    metrics?: UserMetric[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/analytics/users', {
        params: options,
      });
      return { success: true, metrics: response.data.metrics };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch metrics',
      };
    }
  }

  async getRevenueMetrics(
    options: {
      startDate?: string;
      endDate?: string;
      granularity?: 'day' | 'week' | 'month';
    } = {},
  ): Promise<{
    success: boolean;
    metrics?: RevenueMetric[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/analytics/revenue', {
        params: options,
      });
      return { success: true, metrics: response.data.metrics };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch revenue',
      };
    }
  }

  async getConversionRates(
    options: {
      startDate?: string;
      endDate?: string;
    } = {},
  ): Promise<{
    success: boolean;
    rates?: {
      searchToView: number;
      viewToCart: number;
      cartToCheckout: number;
      checkoutToOrder: number;
      overall: number;
    };
    error?: string;
  }> {
    try {
      const response = await this.api.get('/analytics/conversion', {
        params: options,
      });
      return { success: true, rates: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch rates',
      };
    }
  }

  async getRetentionCohorts(
    options: {
      startDate?: string;
      endDate?: string;
      cohortType?: 'weekly' | 'monthly';
    } = {},
  ): Promise<{
    success: boolean;
    cohorts?: CohortData[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/analytics/cohorts', {
        params: options,
      });
      return { success: true, cohorts: response.data.cohorts };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch cohorts',
      };
    }
  }

  async getTopProducts(
    options: {
      startDate?: string;
      endDate?: string;
      limit?: number;
    } = {},
  ): Promise<{
    success: boolean;
    products?: {
      id: string;
      name: string;
      orderCount: number;
      revenue: number;
    }[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/analytics/top-products', {
        params: options,
      });
      return { success: true, products: response.data.products };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch products',
      };
    }
  }

  async getUserSegments(): Promise<{
    success: boolean;
    segments?: {
      id: string;
      name: string;
      userCount: number;
      description: string;
    }[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/analytics/segments');
      return { success: true, segments: response.data.segments };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch segments',
      };
    }
  }

  async setUserProperties(
    userId: string,
    properties: Record<string, any>,
  ): Promise<void> {
    try {
      await this.api.put(`/analytics/users/${userId}/properties`, {
        properties,
      });
    } catch {}
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;

