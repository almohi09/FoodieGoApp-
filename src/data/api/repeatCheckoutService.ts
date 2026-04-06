import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PaymentMethod } from '../../domain/types';
import { paymentService, SavedPaymentMethod } from './paymentService';

const API_BASE_URL = 'https://api.foodiego.in/api/v1';

export interface SavedAddress {
  id: string;
  label: 'home' | 'work' | 'other';
  address: string;
  landmark?: string;
  lat: number;
  lng: number;
  isDefault: boolean;
  instructions?: string;
}

export interface SavedOrderPreference {
  id: string;
  restaurantId: string;
  restaurantName: string;
  items: {
    menuItemId: string;
    name: string;
    quantity: number;
    customizations?: string;
  }[];
  lastUsedAt: string;
  useCount: number;
}

export interface QuickOrderData {
  restaurantId: string;
  items: {
    menuItemId: string;
    quantity: number;
    customizations?: string;
  }[];
  addressId: string;
  paymentMethodId: string;
  couponCode?: string;
}

class RepeatCheckoutService {
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

  async getSavedAddresses(): Promise<{
    success: boolean;
    addresses?: SavedAddress[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/addresses');
      return { success: true, addresses: response.data.addresses };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch addresses',
      };
    }
  }

  async addAddress(address: Omit<SavedAddress, 'id'>): Promise<{
    success: boolean;
    address?: SavedAddress;
    error?: string;
  }> {
    try {
      const response = await this.api.post('/addresses', address);
      return { success: true, address: response.data.address };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to add address',
      };
    }
  }

  async updateAddress(
    addressId: string,
    data: Partial<SavedAddress>,
  ): Promise<{
    success: boolean;
    address?: SavedAddress;
    error?: string;
  }> {
    try {
      const response = await this.api.put(`/addresses/${addressId}`, data);
      return { success: true, address: response.data.address };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update address',
      };
    }
  }

  async deleteAddress(addressId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.delete(`/addresses/${addressId}`);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete address',
      };
    }
  }

  async setDefaultAddress(addressId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.put(`/addresses/${addressId}/default`);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to set default',
      };
    }
  }

  async getSavedPaymentMethods(): Promise<{
    success: boolean;
    methods?: SavedPaymentMethod[];
    error?: string;
  }> {
    return paymentService.getSavedPaymentMethods();
  }

  async setDefaultPaymentMethod(methodId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    return paymentService.setDefaultPaymentMethod(methodId);
  }

  async removePaymentMethod(methodId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    return paymentService.removePaymentMethod(methodId);
  }

  async getOrderPreferences(): Promise<{
    success: boolean;
    preferences?: SavedOrderPreference[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/orders/preferences');
      return { success: true, preferences: response.data.preferences };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch preferences',
      };
    }
  }

  async updateOrderPreference(
    preferenceId: string,
    items: SavedOrderPreference['items'],
  ): Promise<{
    success: boolean;
    preference?: SavedOrderPreference;
    error?: string;
  }> {
    try {
      const response = await this.api.put(
        `/orders/preferences/${preferenceId}`,
        {
          items,
        },
      );
      return { success: true, preference: response.data.preference };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update preference',
      };
    }
  }

  async deleteOrderPreference(preferenceId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.delete(`/orders/preferences/${preferenceId}`);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete preference',
      };
    }
  }

  async placeQuickOrder(data: QuickOrderData): Promise<{
    success: boolean;
    orderId?: string;
    paymentDetails?: {
      amount: number;
      method: PaymentMethod;
    };
    error?: string;
  }> {
    try {
      const response = await this.api.post('/orders/quick', data);
      return {
        success: true,
        orderId: response.data.orderId,
        paymentDetails: response.data.paymentDetails,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to place order',
      };
    }
  }

  async getRepeatOrderEstimate(
    preferenceId: string,
    addressId: string,
  ): Promise<{
    success: boolean;
    estimate?: {
      subtotal: number;
      deliveryFee: number;
      total: number;
      items: { name: string; quantity: number; price: number }[];
    };
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/orders/preferences/${preferenceId}/estimate`,
        {
          params: { addressId },
        },
      );
      return { success: true, estimate: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get estimate',
      };
    }
  }
}

export const repeatCheckoutService = new RepeatCheckoutService();
export default repeatCheckoutService;
