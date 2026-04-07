import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import appEnv from '../../config/env';

const API_BASE_URL = appEnv.apiBaseUrl;

export interface EarningsSummary {
  totalEarnings: number;
  pendingPayout: number;
  availableBalance: number;
  thisWeek: number;
  thisMonth: number;
  lastMonth: number;
  averageOrderValue?: number;
}

export interface Payout {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  bankAccount: {
    accountNumber: string;
    ifsc: string;
    accountHolder: string;
  };
  createdAt: string;
  processedAt?: string;
  transactionId?: string;
  errorMessage?: string;
}

export interface Transaction {
  id: string;
  orderId?: string;
  type: 'order' | 'payout' | 'adjustment' | 'refund';
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  description: string;
  createdAt: string;
}

export interface BankAccount {
  accountNumber: string;
  ifsc: string;
  accountHolder: string;
  verified: boolean;
}

export interface EarningsChart {
  date: string;
  earnings: number;
  orders: number;
}

class SellerEarningsService {
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

  async getEarningsSummary(restaurantId: string): Promise<{
    success: boolean;
    summary?: EarningsSummary;
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/seller/restaurants/${restaurantId}/earnings/summary`,
      );
      return { success: true, summary: response.data };
    } catch (error: any) {
      return {
        success: false,
        error:
          error.response?.data?.message || 'Failed to fetch earnings summary',
      };
    }
  }

  async getEarningsChart(
    restaurantId: string,
    period: 'week' | 'month' | 'year' = 'week',
  ): Promise<{
    success: boolean;
    chart?: EarningsChart[];
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/seller/restaurants/${restaurantId}/earnings/chart`,
        { params: { period } },
      );
      return { success: true, chart: response.data.chart };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch chart',
      };
    }
  }

  async getTransactions(
    restaurantId: string,
    options: {
      page?: number;
      limit?: number;
      type?: Transaction['type'];
      startDate?: string;
      endDate?: string;
    } = {},
  ): Promise<{
    success: boolean;
    transactions?: Transaction[];
    total?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/seller/restaurants/${restaurantId}/earnings/transactions`,
        { params: options },
      );
      return {
        success: true,
        transactions: response.data.transactions,
        total: response.data.total,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch transactions',
      };
    }
  }

  async requestPayout(
    restaurantId: string,
    amount: number,
  ): Promise<{
    success: boolean;
    payout?: Payout;
    error?: string;
  }> {
    try {
      const response = await this.api.post(
        `/seller/restaurants/${restaurantId}/payouts`,
        { amount },
      );
      return { success: true, payout: response.data.payout };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to request payout',
      };
    }
  }

  async getPayouts(
    restaurantId: string,
    options: {
      page?: number;
      limit?: number;
      status?: Payout['status'];
    } = {},
  ): Promise<{
    success: boolean;
    payouts?: Payout[];
    total?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/seller/restaurants/${restaurantId}/payouts`,
        { params: options },
      );
      return {
        success: true,
        payouts: response.data.payouts,
        total: response.data.total,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch payouts',
      };
    }
  }

  async getPayoutById(
    restaurantId: string,
    payoutId: string,
  ): Promise<{
    success: boolean;
    payout?: Payout;
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/seller/restaurants/${restaurantId}/payouts/${payoutId}`,
      );
      return { success: true, payout: response.data.payout };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch payout',
      };
    }
  }

  async getBankDetails(restaurantId: string): Promise<{
    success: boolean;
    bankAccount?: BankAccount;
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/seller/restaurants/${restaurantId}/bank-details`,
      );
      return { success: true, bankAccount: response.data.bankAccount };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch bank details',
      };
    }
  }

  async updateBankDetails(
    restaurantId: string,
    bankAccount: Omit<BankAccount, 'verified'>,
  ): Promise<{
    success: boolean;
    bankAccount?: BankAccount;
    error?: string;
  }> {
    try {
      const response = await this.api.put(
        `/seller/restaurants/${restaurantId}/bank-details`,
        bankAccount,
      );
      return { success: true, bankAccount: response.data.bankAccount };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update bank details',
      };
    }
  }

  async verifyBankAccount(
    restaurantId: string,
    accountNumber: string,
    ifsc: string,
  ): Promise<{
    success: boolean;
    verified: boolean;
    error?: string;
  }> {
    try {
      const response = await this.api.post(
        `/seller/restaurants/${restaurantId}/bank-details/verify`,
        { accountNumber, ifsc },
      );
      return { success: true, verified: response.data.verified };
    } catch (error: any) {
      return {
        success: false,
        verified: false,
        error: error.response?.data?.message || 'Verification failed',
      };
    }
  }

  async getCommissionBreakdown(
    restaurantId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    success: boolean;
    breakdown?: {
      grossSales: number;
      platformCommission: number;
      tax: number;
      adjustments: number;
      netEarnings: number;
      orderCount: number;
    };
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/seller/restaurants/${restaurantId}/commission`,
        { params: { startDate, endDate } },
      );
      return { success: true, breakdown: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch breakdown',
      };
    }
  }

  async downloadInvoice(
    restaurantId: string,
    startDate: string,
    endDate: string,
  ): Promise<{
    success: boolean;
    invoiceUrl?: string;
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/seller/restaurants/${restaurantId}/invoice`,
        { params: { startDate, endDate } },
      );
      return { success: true, invoiceUrl: response.data.invoiceUrl };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to generate invoice',
      };
    }
  }
}

export const sellerEarningsService = new SellerEarningsService();
export default sellerEarningsService;
