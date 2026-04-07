import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import appEnv from '../../config/env';
import { parseSecurityActionError } from './securityGuard';

const API_BASE_URL = appEnv.apiBaseUrl;

export interface RiderOrder {
  id: string;
  orderId: string;
  status:
    | 'assigned'
    | 'picked_up'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled';
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
  assignedAt: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  proofOfDelivery?: {
    type: 'otp' | 'photo' | 'signature';
    value?: string;
    photoUrl?: string;
    signatureUrl?: string;
    deliveredAt: string;
  };
  estimatedDeliveryTime?: string;
  deliveryInstructions?: string;
}

export interface RiderStats {
  totalDeliveries: number;
  completedToday: number;
  completedWeek: number;
  totalEarnings: number;
  earningsToday: number;
  earningsWeek: number;
  averageRating: number;
  acceptanceRate: number;
  onTimeDeliveryRate: number;
  totalDistance: number;
}

export interface DeliveryProof {
  type: 'otp' | 'photo' | 'signature';
  otp?: string;
  photoBase64?: string;
  signatureBase64?: string;
  notes?: string;
}

class RiderService {
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
        this.token = await AsyncStorage.getItem('rider_token');
      }
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  async getAssignedOrders(): Promise<{
    success: boolean;
    orders?: RiderOrder[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/rider/orders/assigned');
      return { success: true, orders: response.data.orders };
    } catch (error: any) {
      return {
        success: false,
        error:
          error.response?.data?.message || 'Failed to fetch assigned orders',
      };
    }
  }

  async getOrderDetails(orderId: string): Promise<{
    success: boolean;
    order?: RiderOrder;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      const response = await this.api.get(`/rider/orders/${orderId}`);
      return { success: true, order: response.data.order };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch order details',
      };
    }
  }

  async acceptOrder(orderId: string): Promise<{
    success: boolean;
    order?: RiderOrder;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      const response = await this.api.post(`/rider/orders/${orderId}/accept`);
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
    orderId: string,
    reason: string,
  ): Promise<{
    success: boolean;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      await this.api.post(`/rider/orders/${orderId}/reject`, { reason });
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

  async startPickup(orderId: string): Promise<{
    success: boolean;
    order?: RiderOrder;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      const response = await this.api.post(
        `/rider/orders/${orderId}/start-pickup`,
      );
      return { success: true, order: response.data.order };
    } catch (error: any) {
      const parsed = parseSecurityActionError(error, 'Failed to start pickup');
      return {
        success: false,
        error: parsed.message,
        errorCode: parsed.errorCode,
        retryAfterSec: parsed.retryAfterSec,
      };
    }
  }

  async confirmPickup(orderId: string): Promise<{
    success: boolean;
    order?: RiderOrder;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      const response = await this.api.post(
        `/rider/orders/${orderId}/confirm-pickup`,
      );
      return { success: true, order: response.data.order };
    } catch (error: any) {
      const parsed = parseSecurityActionError(
        error,
        'Failed to confirm pickup',
      );
      return {
        success: false,
        error: parsed.message,
        errorCode: parsed.errorCode,
        retryAfterSec: parsed.retryAfterSec,
      };
    }
  }

  async startDelivery(orderId: string): Promise<{
    success: boolean;
    order?: RiderOrder;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      const response = await this.api.post(
        `/rider/orders/${orderId}/start-delivery`,
      );
      return { success: true, order: response.data.order };
    } catch (error: any) {
      const parsed = parseSecurityActionError(
        error,
        'Failed to start delivery',
      );
      return {
        success: false,
        error: parsed.message,
        errorCode: parsed.errorCode,
        retryAfterSec: parsed.retryAfterSec,
      };
    }
  }

  async confirmDelivery(
    orderId: string,
    proof: DeliveryProof,
  ): Promise<{
    success: boolean;
    order?: RiderOrder;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      const response = await this.api.post(
        `/rider/orders/${orderId}/deliver`,
        proof,
      );
      return { success: true, order: response.data.order };
    } catch (error: any) {
      const parsed = parseSecurityActionError(
        error,
        'Failed to confirm delivery',
      );
      return {
        success: false,
        error: parsed.message,
        errorCode: parsed.errorCode,
        retryAfterSec: parsed.retryAfterSec,
      };
    }
  }

  async cancelDelivery(
    orderId: string,
    reason: string,
  ): Promise<{
    success: boolean;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      await this.api.post(`/rider/orders/${orderId}/cancel`, { reason });
      return { success: true };
    } catch (error: any) {
      const parsed = parseSecurityActionError(
        error,
        'Failed to cancel delivery',
      );
      return {
        success: false,
        error: parsed.message,
        errorCode: parsed.errorCode,
        retryAfterSec: parsed.retryAfterSec,
      };
    }
  }

  async updateLocation(
    lat: number,
    lng: number,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post('/rider/location', { lat, lng });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update location',
      };
    }
  }

  async getStats(): Promise<{
    success: boolean;
    stats?: RiderStats;
    error?: string;
  }> {
    try {
      const response = await this.api.get('/rider/stats');
      return { success: true, stats: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch stats',
      };
    }
  }

  async getEarnings(
    options: {
      period?: 'today' | 'week' | 'month';
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    success: boolean;
    earnings?: {
      total: number;
      orders: {
        orderId: string;
        amount: number;
        deliveredAt: string;
        distance: number;
      }[];
      pagination: { total: number; page: number; limit: number };
    };
    error?: string;
  }> {
    try {
      const response = await this.api.get('/rider/earnings', {
        params: options,
      });
      return { success: true, earnings: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch earnings',
      };
    }
  }

  async getDeliveryHistory(
    options: {
      page?: number;
      limit?: number;
      status?: 'delivered' | 'cancelled';
    } = {},
  ): Promise<{
    success: boolean;
    orders?: RiderOrder[];
    total?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.get('/rider/orders/history', {
        params: options,
      });
      return {
        success: true,
        orders: response.data.orders,
        total: response.data.total,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch history',
      };
    }
  }

  async getProfile(): Promise<{
    success: boolean;
    profile?: {
      id: string;
      name: string;
      phone: string;
      email?: string;
      vehicleType?: 'bike' | 'scooter' | 'cycle';
      vehicleNumber?: string;
      isOnline: boolean;
      rating: number;
      totalDeliveries: number;
    };
    error?: string;
  }> {
    try {
      const response = await this.api.get('/rider/profile');
      return { success: true, profile: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch profile',
      };
    }
  }

  async updateProfile(data: {
    name?: string;
    vehicleType?: 'bike' | 'scooter' | 'cycle';
    vehicleNumber?: string;
  }): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.patch('/rider/profile', data);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update profile',
      };
    }
  }

  async setOnlineStatus(isOnline: boolean): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post('/rider/status', { isOnline });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update status',
      };
    }
  }

  async uploadProofPhoto(
    orderId: string,
    photoBase64: string,
  ): Promise<{
    success: boolean;
    photoUrl?: string;
    error?: string;
  }> {
    try {
      const response = await this.api.post(
        `/rider/orders/${orderId}/upload-proof`,
        {
          photo: photoBase64,
        },
      );
      return { success: true, photoUrl: response.data.photoUrl };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to upload proof photo',
      };
    }
  }
}

export const riderService = new RiderService();
export default riderService;
