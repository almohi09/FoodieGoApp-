import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import appEnv from '../../config/env';

const API_BASE_URL = appEnv.apiBaseUrl;

export type FraudRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface FraudCheckResult {
  riskLevel: FraudRiskLevel;
  flags: FraudFlag[];
  score: number;
  action: 'allow' | 'review' | 'block';
}

export interface FraudFlag {
  type: FraudFlagType;
  severity: 'low' | 'medium' | 'high';
  message: string;
  description: string;
}

export type FraudFlagType =
  | 'unusual_location'
  | 'multiple_accounts'
  | 'velocity_check'
  | 'coupon_abuse'
  | 'payment_anomaly'
  | 'order_anomaly'
  | 'device_anomaly'
  | 'ip_anomaly'
  | 'phone_anomaly'
  | 'address_anomaly';

export interface RiskProfile {
  userId: string;
  riskLevel: FraudRiskLevel;
  totalFlags: number;
  lastChecked: string;
  isWhitelisted: boolean;
  isBlacklisted: boolean;
}

export interface CouponAbuseCheck {
  couponCode: string;
  attempts: number;
  successRate: number;
  differentAccounts: number;
  lastAttempt: string;
}

export interface PaymentAnomalyCheck {
  amount: number;
  expectedRange: { min: number; max: number };
  isAnomalous: boolean;
  deviation: number;
}

class FraudDetectionService {
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

  async checkOrder(orderData: {
    userId: string;
    amount: number;
    items: { menuItemId: string; quantity: number }[];
    addressId: string;
    couponCode?: string;
    paymentMethod: string;
  }): Promise<FraudCheckResult> {
    try {
      const response = await this.api.post('/fraud/check/order', orderData);
      return response.data;
    } catch {
      return {
        riskLevel: 'low',
        flags: [],
        score: 0,
        action: 'allow',
      };
    }
  }

  async checkPayment(paymentData: {
    userId: string;
    amount: number;
    method: string;
    upiId?: string;
    cardLast4?: string;
  }): Promise<FraudCheckResult> {
    try {
      const response = await this.api.post('/fraud/check/payment', paymentData);
      return response.data;
    } catch {
      return {
        riskLevel: 'low',
        flags: [],
        score: 0,
        action: 'allow',
      };
    }
  }

  async checkCouponUsage(
    userId: string,
    couponCode: string,
  ): Promise<{
    success: boolean;
    allowed: boolean;
    reason?: string;
  }> {
    try {
      const response = await this.api.post('/fraud/check/coupon', {
        userId,
        couponCode,
      });
      return response.data;
    } catch {
      return { success: true, allowed: true };
    }
  }

  async checkAccount(userId: string): Promise<FraudCheckResult> {
    try {
      const response = await this.api.get(`/fraud/check/account/${userId}`);
      return response.data;
    } catch {
      return {
        riskLevel: 'low',
        flags: [],
        score: 0,
        action: 'allow',
      };
    }
  }

  async getRiskProfile(userId: string): Promise<{
    success: boolean;
    profile?: RiskProfile;
    error?: string;
  }> {
    try {
      const response = await this.api.get(`/fraud/profile/${userId}`);
      return { success: true, profile: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch profile',
      };
    }
  }

  async reportFraud(data: {
    type: 'order' | 'restaurant' | 'user' | 'rider';
    entityId: string;
    reason: string;
    evidence?: string[];
  }): Promise<{
    success: boolean;
    reportId?: string;
    error?: string;
  }> {
    try {
      const response = await this.api.post('/fraud/reports', data);
      return { success: true, reportId: response.data.reportId };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to submit report',
      };
    }
  }

  async getAbuseHistory(userId: string): Promise<{
    success: boolean;
    history?: {
      type: string;
      date: string;
      details: string;
      status: string;
    }[];
    error?: string;
  }> {
    try {
      const response = await this.api.get(`/fraud/history/${userId}`);
      return { success: true, history: response.data.history };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch history',
      };
    }
  }

  async checkCouponAbuse(couponCode: string): Promise<{
    success: boolean;
    abuse?: CouponAbuseCheck;
    error?: string;
  }> {
    try {
      const response = await this.api.get('/fraud/coupon-abuse', {
        params: { code: couponCode },
      });
      return { success: true, abuse: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to check abuse',
      };
    }
  }

  async checkPaymentAnomaly(userId: string): Promise<{
    success: boolean;
    anomaly?: PaymentAnomalyCheck;
    error?: string;
  }> {
    try {
      const response = await this.api.get('/fraud/payment-anomaly', {
        params: { userId },
      });
      return { success: true, anomaly: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to check anomaly',
      };
    }
  }

  async whitelistUser(userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post(`/fraud/whitelist/${userId}`);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to whitelist',
      };
    }
  }

  async blacklistUser(
    userId: string,
    reason: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post(`/fraud/blacklist/${userId}`, { reason });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to blacklist',
      };
    }
  }

  localCheckCouponUsage(
    orderHistory: { couponCode?: string; date: string }[],
    couponCode: string,
    maxUsesPerDay: number = 2,
  ): boolean {
    const today = new Date().toISOString().split('T')[0];
    const todayUses = orderHistory.filter(
      o => o.couponCode === couponCode && o.date.startsWith(today),
    ).length;
    return todayUses < maxUsesPerDay;
  }

  localCheckVelocity(
    orderTimestamps: string[],
    maxOrdersPerHour: number = 5,
  ): boolean {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentOrders = orderTimestamps.filter(
      t => new Date(t).getTime() > oneHourAgo,
    ).length;
    return recentOrders < maxOrdersPerHour;
  }

  localCheckAmountAnomaly(
    amounts: number[],
    newAmount: number,
    stdDevMultiplier: number = 3,
  ): boolean {
    if (amounts.length < 3) return true;

    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance =
      amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      amounts.length;
    const stdDev = Math.sqrt(variance);

    return Math.abs(newAmount - mean) <= stdDev * stdDevMultiplier;
  }
}

export const fraudDetectionService = new FraudDetectionService();
export default fraudDetectionService;

