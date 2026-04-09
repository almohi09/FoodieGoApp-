import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseSecurityActionError } from './securityGuard';
import appEnv from '../config/env';

const API_BASE_URL = appEnv.apiBaseUrl;

export interface User {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  role: 'customer' | 'seller' | 'admin';
  status: 'active' | 'suspended' | 'deleted';
  createdAt: string;
  lastLoginAt?: string;
  orderCount: number;
  totalSpend?: number;
}

export interface Seller {
  id: string;
  phone: string;
  name: string;
  email: string;
  businessName: string;
  businessType: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rating?: number;
  totalOrders: number;
  totalRevenue: number;
  createdAt: string;
  documents: {
    type: string;
    verified: boolean;
  }[];
}

class AdminUserService {
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

  async getUsers(
    options: {
      page?: number;
      limit?: number;
      role?: 'customer' | 'seller';
      status?: 'active' | 'suspended' | 'deleted';
      search?: string;
    } = {},
  ): Promise<{
    success: boolean;
    users?: User[];
    total?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/users', { params: options });
      return {
        success: true,
        users: response.data.users,
        total: response.data.total,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch users',
      };
    }
  }

  async getUserById(userId: string): Promise<{
    success: boolean;
    user?: User;
    error?: string;
  }> {
    try {
      const response = await this.api.get(`/admin/users/${userId}`);
      return { success: true, user: response.data.user };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch user',
      };
    }
  }

  async suspendUser(
    userId: string,
    reason: string,
  ): Promise<{
    success: boolean;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      await this.api.post(`/admin/users/${userId}/suspend`, { reason });
      return { success: true };
    } catch (error: any) {
      const parsed = parseSecurityActionError(error, 'Failed to suspend user');
      return {
        success: false,
        error: parsed.message,
        errorCode: parsed.errorCode,
        retryAfterSec: parsed.retryAfterSec,
      };
    }
  }

  async reactivateUser(userId: string): Promise<{
    success: boolean;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      await this.api.post(`/admin/users/${userId}/reactivate`);
      return { success: true };
    } catch (error: any) {
      const parsed = parseSecurityActionError(error, 'Failed to reactivate user');
      return {
        success: false,
        error: parsed.message,
        errorCode: parsed.errorCode,
        retryAfterSec: parsed.retryAfterSec,
      };
    }
  }

  async deleteUser(userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.delete(`/admin/users/${userId}`);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete user',
      };
    }
  }

  async getSellers(
    options: {
      page?: number;
      limit?: number;
      status?: 'pending' | 'approved' | 'rejected' | 'suspended';
      search?: string;
    } = {},
  ): Promise<{
    success: boolean;
    sellers?: Seller[];
    total?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/sellers', {
        params: options,
      });
      return {
        success: true,
        sellers: response.data.sellers,
        total: response.data.total,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch sellers',
      };
    }
  }

  async getSellerById(sellerId: string): Promise<{
    success: boolean;
    seller?: Seller;
    error?: string;
  }> {
    try {
      const response = await this.api.get(`/admin/sellers/${sellerId}`);
      return { success: true, seller: response.data.seller };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch seller',
      };
    }
  }

  async approveSeller(
    sellerId: string,
    notes?: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post(`/admin/sellers/${sellerId}/approve`, { notes });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to approve seller',
      };
    }
  }

  async rejectSeller(
    sellerId: string,
    reason: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post(`/admin/sellers/${sellerId}/reject`, { reason });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to reject seller',
      };
    }
  }

  async suspendSeller(
    sellerId: string,
    reason: string,
  ): Promise<{
    success: boolean;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      await this.api.post(`/admin/sellers/${sellerId}/suspend`, { reason });
      return { success: true };
    } catch (error: any) {
      const parsed = parseSecurityActionError(error, 'Failed to suspend seller');
      return {
        success: false,
        error: parsed.message,
        errorCode: parsed.errorCode,
        retryAfterSec: parsed.retryAfterSec,
      };
    }
  }

  async reactivateSeller(sellerId: string): Promise<{
    success: boolean;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      await this.api.post(`/admin/sellers/${sellerId}/reactivate`);
      return { success: true };
    } catch (error: any) {
      const parsed = parseSecurityActionError(error, 'Failed to reactivate seller');
      return {
        success: false,
        error: parsed.message,
        errorCode: parsed.errorCode,
        retryAfterSec: parsed.retryAfterSec,
      };
    }
  }

  async getUserActivity(
    userId: string,
    page: number = 1,
  ): Promise<{
    success: boolean;
    activities?: {
      type: string;
      description: string;
      timestamp: string;
    }[];
    error?: string;
  }> {
    try {
      const response = await this.api.get(`/admin/users/${userId}/activity`, {
        params: { page },
      });
      return { success: true, activities: response.data.activities };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch activity',
      };
    }
  }

  async getSellerPerformance(sellerId: string): Promise<{
    success: boolean;
    performance?: {
      totalOrders: number;
      totalRevenue: number;
      avgRating: number;
      avgPrepTime: number;
      cancellationRate: number;
      onTimeDeliveryRate: number;
    };
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/admin/sellers/${sellerId}/performance`,
      );
      return { success: true, performance: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch performance',
      };
    }
  }
}

export const adminUserService = new AdminUserService();
export default adminUserService;


