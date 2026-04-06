import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Coupon } from '../../domain/types';
import {
  clearGuardState,
  enforceLocalVelocityGuard,
  parseRateLimitMessage,
  recordGuardedFailure,
} from './securityGuard';

const API_BASE_URL = 'https://api.foodiego.in/api/v1';

export interface CouponValidation {
  valid: boolean;
  coupon?: Coupon;
  discount?: number;
  message?: string;
  errorCode?:
    | 'MIN_ORDER_NOT_MET'
    | 'ALREADY_USED'
    | 'EXPIRED'
    | 'NOT_ELIGIBLE'
    | 'RESTAURANT_NOT_ELIGIBLE';
}

export interface CouponUsage {
  couponId: string;
  usedAt: string;
  orderId: string;
  discount: number;
}

class CouponService {
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

  async validateCoupon(
    code: string,
    restaurantId: string,
    orderValue: number,
  ): Promise<CouponValidation> {
    try {
      const response = await this.api.post('/coupons/validate', {
        code,
        restaurantId,
        orderValue,
      });
      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data;
      if (errorData?.errorCode) {
        return {
          valid: false,
          message: errorData.message,
          errorCode: errorData.errorCode,
        };
      }
      return {
        valid: false,
        message: errorData?.message || 'Failed to validate coupon',
      };
    }
  }

  async applyCoupon(
    code: string,
    restaurantId: string,
    orderValue: number,
  ): Promise<{
    success: boolean;
    discount?: number;
    coupon?: Coupon;
    error?: string;
    errorCode?: string;
  }> {
    const localGuard = await enforceLocalVelocityGuard('coupon_apply', {
      maxAttempts: 10,
      windowSec: 300,
      cooldownSec: 120,
      blockedMessage: 'Too many coupon attempts',
    });
    if (!localGuard.allowed) {
      return {
        success: false,
        error: localGuard.message || 'Try again later',
        errorCode: 'RATE_LIMITED_LOCAL',
      };
    }

    try {
      const response = await this.api.post('/coupons/apply', {
        code,
        restaurantId,
        orderValue,
      });
      await clearGuardState('coupon_apply');
      return {
        success: true,
        discount: response.data.discount,
        coupon: response.data.coupon,
      };
    } catch (error: any) {
      await recordGuardedFailure('coupon_apply');
      const parsed = parseRateLimitMessage(
        error,
        error.response?.data?.message || 'Failed to apply coupon',
      );
      return {
        success: false,
        error: parsed.message,
        errorCode:
          parsed.isRateLimited ? 'RATE_LIMITED' : error.response?.data?.errorCode,
      };
    }
  }

  async removeCoupon(restaurantId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post('/coupons/remove', { restaurantId });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to remove coupon',
      };
    }
  }

  async getAvailableCoupons(restaurantId?: string): Promise<{
    success: boolean;
    coupons?: Coupon[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/coupons/available', {
        params: { restaurantId },
      });
      return { success: true, coupons: response.data.coupons };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch coupons',
      };
    }
  }

  async getCouponDetails(code: string): Promise<{
    success: boolean;
    coupon?: Coupon;
    error?: string;
  }> {
    try {
      const response = await this.api.get(`/coupons/${code}`);
      return { success: true, coupon: response.data.coupon };
    } catch (error: any) {
      return {
        success: false,
        error:
          error.response?.data?.message || 'Failed to fetch coupon details',
      };
    }
  }

  async getUsageHistory(): Promise<{
    success: boolean;
    usage?: CouponUsage[];
    totalSavings?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.get('/coupons/history');
      return {
        success: true,
        usage: response.data.usage,
        totalSavings: response.data.totalSavings,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch history',
      };
    }
  }

  calculateDiscount(coupon: Coupon, orderValue: number): number {
    if (coupon.discountType === 'flat') {
      return Math.min(coupon.discountValue, orderValue);
    }

    if (coupon.discountType === 'percentage') {
      const discount = (orderValue * coupon.discountValue) / 100;
      return coupon.maximumDiscount
        ? Math.min(discount, coupon.maximumDiscount)
        : discount;
    }

    return 0;
  }

  validateLocal(
    coupon: Coupon,
    orderValue: number,
    _isNewUser: boolean = false,
  ): CouponValidation {
    if (!coupon.isActive) {
      return {
        valid: false,
        message: 'This coupon is no longer active',
        errorCode: 'EXPIRED',
      };
    }

    if (new Date(coupon.expiresAt) < new Date()) {
      return {
        valid: false,
        message: 'This coupon has expired',
        errorCode: 'EXPIRED',
      };
    }

    if (coupon.minimumOrder && orderValue < coupon.minimumOrder) {
      return {
        valid: false,
        message: `Minimum order of ₹${coupon.minimumOrder} required`,
        errorCode: 'MIN_ORDER_NOT_MET',
      };
    }

    const discount = this.calculateDiscount(coupon, orderValue);

    return {
      valid: true,
      coupon,
      discount,
      message: `You save ₹${discount}!`,
    };
  }
}

export const couponService = new CouponService();
export default couponService;
