import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import appEnv from '../config/env';

const API_BASE_URL = appEnv.apiBaseUrl;

export interface DeliveryFeeInfo {
  baseFee: number;
  distanceKm: number;
  surgeMultiplier: number;
  finalFee: number;
  isFreeDelivery: boolean;
  freeDeliveryThreshold?: number;
}

export interface ETAInfo {
  restaurantPrepTime: number;
  deliveryTime: number;
  totalTime: number;
  estimatedArrival: string;
  distanceKm: number;
}

export interface DeliveryQuote {
  deliveryFee: DeliveryFeeInfo;
  eta: ETAInfo;
  canDeliver: boolean;
  reason?: string;
}

class DeliveryService {
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

  async getDeliveryQuote(
    restaurantId: string,
    addressId: string,
    orderValue?: number,
  ): Promise<{
    success: boolean;
    quote?: DeliveryQuote;
    error?: string;
  }> {
    try {
      const response = await this.api.post('/delivery/quote', {
        restaurantId,
        addressId,
        orderValue,
      });
      return { success: true, quote: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get delivery quote',
      };
    }
  }

  async getDeliveryFee(
    restaurantId: string,
    addressId: string,
  ): Promise<{
    success: boolean;
    deliveryFee?: DeliveryFeeInfo;
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/restaurants/${restaurantId}/delivery-fee`,
        {
          params: { addressId },
        },
      );
      return { success: true, deliveryFee: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get delivery fee',
      };
    }
  }

  async getETA(
    restaurantId: string,
    addressId: string,
  ): Promise<{
    success: boolean;
    eta?: ETAInfo;
    error?: string;
  }> {
    try {
      const response = await this.api.get(`/restaurants/${restaurantId}/eta`, {
        params: { addressId },
      });
      return { success: true, eta: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get ETA',
      };
    }
  }

  async getDeliveryChargeByDistance(
    restaurantId: string,
    distanceKm: number,
  ): Promise<{
    success: boolean;
    charge?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.get(`/delivery/calculate`, {
        params: { restaurantId, distance: distanceKm },
      });
      return { success: true, charge: response.data.charge };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to calculate charge',
      };
    }
  }

  async checkDeliveryCoverage(
    restaurantId: string,
    addressId: string,
  ): Promise<{
    success: boolean;
    canDeliver: boolean;
    minOrderValue?: number;
    maxDistance?: number;
    reason?: string;
  }> {
    try {
      const response = await this.api.get(
        `/restaurants/${restaurantId}/delivery-coverage`,
        {
          params: { addressId },
        },
      );
      return {
        success: true,
        canDeliver: response.data.canDeliver,
        minOrderValue: response.data.minOrderValue,
        maxDistance: response.data.maxDistance,
        reason: response.data.reason,
      };
    } catch (error: any) {
      return {
        success: false,
        canDeliver: false,
        reason:
          error.response?.data?.message || 'Unable to check delivery coverage',
      };
    }
  }

  calculateLocalDeliveryFee(
    distanceKm: number,
    baseFee: number = 20,
    perKmRate: number = 5,
    maxFee: number = 80,
  ): number {
    const calculatedFee = baseFee + distanceKm * perKmRate;
    return Math.min(calculatedFee, maxFee);
  }

  calculateLocalETA(distanceKm: number, basePrepTime: number = 25): number {
    const deliveryTime = Math.ceil(distanceKm * 3);
    return basePrepTime + deliveryTime;
  }
}

export const deliveryService = new DeliveryService();
export default deliveryService;


