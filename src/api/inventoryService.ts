import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import appEnv from '../config/env';

const API_BASE_URL = appEnv.apiBaseUrl;

export interface ItemAvailability {
  menuItemId: string;
  isAvailable: boolean;
  availableQuantity?: number;
  message?: string;
}

export interface RestaurantStatus {
  isOpen: boolean;
  nextOpensAt?: string;
  nextClosesAt?: string;
  reason?: string;
}

export interface CartValidation {
  valid: boolean;
  restaurantOpen: boolean;
  items: ItemAvailability[];
  issues: string[];
  estimatedPrepTime?: number;
}

class InventoryService {
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

  async checkRestaurantStatus(restaurantId: string): Promise<RestaurantStatus> {
    try {
      const response = await this.api.get(
        `/restaurants/${restaurantId}/status`,
      );
      return response.data;
    } catch (error: any) {
      return {
        isOpen: false,
        reason:
          error.response?.data?.message || 'Unable to check restaurant status',
      };
    }
  }

  async checkItemAvailability(
    restaurantId: string,
    menuItemIds: string[],
  ): Promise<{
    success: boolean;
    items?: ItemAvailability[];
    error?: string;
  }> {
    try {
      const response = await this.api.post(
        `/restaurants/${restaurantId}/check-availability`,
        {
          menuItemIds,
        },
      );
      return { success: true, items: response.data.items };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to check availability',
      };
    }
  }

  async validateCart(
    restaurantId: string,
    items: { menuItemId: string; quantity: number }[],
  ): Promise<{
    success: boolean;
    validation?: CartValidation;
    error?: string;
  }> {
    try {
      const response = await this.api.post(
        `/restaurants/${restaurantId}/validate-cart`,
        {
          items,
        },
      );
      return { success: true, validation: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to validate cart',
      };
    }
  }

  async getEstimatedPrepTime(restaurantId: string): Promise<{
    success: boolean;
    prepTime?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/restaurants/${restaurantId}/prep-time`,
      );
      return { success: true, prepTime: response.data.prepTime };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get prep time',
      };
    }
  }

  async getRestaurantHours(restaurantId: string): Promise<{
    success: boolean;
    hours?: {
      openingTime: string;
      closingTime: string;
      is24Hours: boolean;
    };
    error?: string;
  }> {
    try {
      const response = await this.api.get(`/restaurants/${restaurantId}/hours`);
      return { success: true, hours: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get hours',
      };
    }
  }
}

export const inventoryService = new InventoryService();
export default inventoryService;


