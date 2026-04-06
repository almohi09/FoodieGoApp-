import { createApiClient } from './httpClient';
import {
  asArray,
  asBoolean,
  asErrorMessage,
  asNumber,
  asObject,
  asOptionalNumber,
  asOptionalString,
  asString,
} from './contracts';
import { parseSecurityActionError } from './securityGuard';

export interface PayoutSummary {
  pendingCount: number;
  pendingAmount: number;
  processingCount: number;
  processingAmount: number;
  paidToday: number;
}

export interface PayoutItem {
  id: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  status: 'pending' | 'processing' | 'paid' | 'on_hold' | 'failed';
  cycle?: string;
  createdAt?: string;
}

class AdminPayoutService {
  private api = createApiClient();

  async getPayoutSummary(): Promise<{
    success: boolean;
    summary?: PayoutSummary;
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/payouts/summary');
      const data = asObject(response.data, 'adminPayout.getPayoutSummary');
      return {
        success: true,
        summary: {
          pendingCount: asNumber(
            data.pendingCount,
            'adminPayout.getPayoutSummary.pendingCount',
          ),
          pendingAmount: asNumber(
            data.pendingAmount,
            'adminPayout.getPayoutSummary.pendingAmount',
          ),
          processingCount: asNumber(
            data.processingCount,
            'adminPayout.getPayoutSummary.processingCount',
          ),
          processingAmount: asNumber(
            data.processingAmount,
            'adminPayout.getPayoutSummary.processingAmount',
          ),
          paidToday: asNumber(data.paidToday, 'adminPayout.getPayoutSummary.paidToday'),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to load payout summary'),
      };
    }
  }

  async getPayoutQueue(options: {
    page?: number;
    limit?: number;
    status?: PayoutItem['status'];
  } = {}): Promise<{
    success: boolean;
    items?: PayoutItem[];
    total?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/payouts', { params: options });
      const data = asObject(response.data, 'adminPayout.getPayoutQueue');
      return {
        success: true,
        items: asArray(data.items || [], 'adminPayout.getPayoutQueue.items', (item, path) => {
          const payout = asObject(item, path);
          return {
            id: asString(payout.id, `${path}.id`),
            sellerId: asString(payout.sellerId, `${path}.sellerId`),
            sellerName: asString(payout.sellerName, `${path}.sellerName`),
            amount: asNumber(payout.amount, `${path}.amount`),
            status: asString(payout.status, `${path}.status`) as PayoutItem['status'],
            cycle: asOptionalString(payout.cycle, `${path}.cycle`),
            createdAt: asOptionalString(payout.createdAt, `${path}.createdAt`),
          };
        }),
        total: asOptionalNumber(data.total, 'adminPayout.getPayoutQueue.total'),
      };
    } catch (error) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to load payout queue'),
      };
    }
  }

  async markProcessing(
    payoutId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.api.post(`/admin/payouts/${payoutId}/processing`);
      const data = asObject(response.data, 'adminPayout.markProcessing');
      return { success: asBoolean(data.success, 'adminPayout.markProcessing.success') };
    } catch (error) {
      const parsed = parseSecurityActionError(error, 'Failed to mark payout processing');
      return {
        success: false,
        error: parsed.message,
      };
    }
  }

  async markPaid(
    payoutId: string,
    referenceId?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.api.post(`/admin/payouts/${payoutId}/paid`, {
        referenceId,
      });
      const data = asObject(response.data, 'adminPayout.markPaid');
      return { success: asBoolean(data.success, 'adminPayout.markPaid.success') };
    } catch (error) {
      const parsed = parseSecurityActionError(error, 'Failed to mark payout paid');
      return {
        success: false,
        error: parsed.message,
      };
    }
  }

  async holdPayout(
    payoutId: string,
    reason: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.api.post(`/admin/payouts/${payoutId}/hold`, {
        reason,
      });
      const data = asObject(response.data, 'adminPayout.holdPayout');
      return { success: asBoolean(data.success, 'adminPayout.holdPayout.success') };
    } catch (error) {
      const parsed = parseSecurityActionError(error, 'Failed to hold payout');
      return {
        success: false,
        error: parsed.message,
      };
    }
  }
}

export const adminPayoutService = new AdminPayoutService();
export default adminPayoutService;
