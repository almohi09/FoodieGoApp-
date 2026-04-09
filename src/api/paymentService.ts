import { PaymentMethod } from '../types';
import { createApiClient, newIdempotencyKey } from './httpClient';
import {
  asArray,
  asBoolean,
  asEnum,
  asErrorMessage,
  asObject,
  asOptionalBoolean,
  asOptionalNumber,
  asOptionalString,
  asTypedObject,
} from './contracts';
import { parseSecurityActionError } from './securityGuard';

export interface PaymentDetails {
  orderId: string;
  amount: number;
  method: PaymentMethod;
}

export interface UPIPaymentRequest {
  orderId: string;
  amount: number;
  upiId?: string;
}

export interface CardPaymentRequest {
  orderId: string;
  amount: number;
  cardLast4: string;
  cardType: 'visa' | 'mastercard' | 'rupay' | 'other';
}

export interface PaymentStatus {
  success: boolean;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transactionId?: string;
  error?: string;
  errorCode?: string;
  retryAfterSec?: number;
  source?: 'webhook' | 'gateway' | 'unknown';
  lastUpdatedAt?: string;
  reconciliationRequired?: boolean;
  retryAfterMs?: number;
}

export interface SavedPaymentMethod {
  id: string;
  type: 'upi' | 'card';
  isDefault: boolean;
  last4?: string;
  cardType?: string;
  upiId?: string;
  nickname?: string;
}

const PAYMENT_STATUSES = [
  'pending',
  'completed',
  'failed',
  'cancelled',
] as const;
const PAYMENT_STATUS_SOURCES = ['webhook', 'gateway', 'unknown'] as const;

const REFUND_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
] as const;

const parsePaymentStatus = (value: unknown, path: string): PaymentStatus => {
  const data = asObject(value, path);
  return {
    success: asBoolean(data.success, `${path}.success`),
    status: asEnum(data.status, `${path}.status`, PAYMENT_STATUSES),
    transactionId: asOptionalString(
      data.transactionId,
      `${path}.transactionId`,
    ),
    error: asOptionalString(data.error, `${path}.error`),
    errorCode: asOptionalString(data.errorCode, `${path}.errorCode`),
    retryAfterSec: asOptionalNumber(
      data.retryAfterSec,
      `${path}.retryAfterSec`,
    ),
    source:
      data.source === undefined
        ? undefined
        : asEnum(data.source, `${path}.source`, PAYMENT_STATUS_SOURCES),
    lastUpdatedAt: asOptionalString(
      data.lastUpdatedAt,
      `${path}.lastUpdatedAt`,
    ),
    reconciliationRequired: asOptionalBoolean(
      data.reconciliationRequired,
      `${path}.reconciliationRequired`,
    ),
    retryAfterMs: asOptionalNumber(data.retryAfterMs, `${path}.retryAfterMs`),
  };
};

class PaymentService {
  private api = createApiClient();

  constructor() {
    // Shared client handles auth headers, token refresh and device binding.
  }

  async initiateUPIPayment(request: UPIPaymentRequest): Promise<{
    success: boolean;
    upiDeepLink?: string;
    transactionId?: string;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      const response = await this.api.post('/payments/upi/initiate', request);
      const data = asObject(response.data, 'payments.initiateUPIPayment');
      return {
        success: true,
        upiDeepLink: asOptionalString(
          data.upiDeepLink,
          'payments.initiateUPIPayment.upiDeepLink',
        ),
        transactionId: asOptionalString(
          data.transactionId,
          'payments.initiateUPIPayment.transactionId',
        ),
      };
    } catch (error: any) {
      const parsed = parseSecurityActionError(
        error,
        'Failed to initiate UPI payment',
      );
      return {
        success: false,
        error: parsed.message,
        errorCode: parsed.errorCode,
        retryAfterSec: parsed.retryAfterSec,
      };
    }
  }

  async verifyUPIPayment(transactionId: string): Promise<PaymentStatus> {
    try {
      const response = await this.api.get(
        `/payments/upi/verify/${transactionId}`,
      );
      return parsePaymentStatus(response.data, 'payments.verifyUPIPayment');
    } catch (error: any) {
      const parsed = parseSecurityActionError(
        error,
        'Payment verification failed',
      );
      return {
        success: false,
        status: 'failed',
        error: parsed.message,
        errorCode: parsed.errorCode,
        retryAfterSec: parsed.retryAfterSec,
      };
    }
  }

  async initiateCardPayment(request: CardPaymentRequest): Promise<{
    success: boolean;
    paymentUrl?: string;
    transactionId?: string;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      const response = await this.api.post('/payments/card/initiate', request);
      const data = asObject(response.data, 'payments.initiateCardPayment');
      return {
        success: true,
        paymentUrl: asOptionalString(
          data.paymentUrl,
          'payments.initiateCardPayment.paymentUrl',
        ),
        transactionId: asOptionalString(
          data.transactionId,
          'payments.initiateCardPayment.transactionId',
        ),
      };
    } catch (error: any) {
      const parsed = parseSecurityActionError(
        error,
        'Failed to initiate card payment',
      );
      return {
        success: false,
        error: parsed.message,
        errorCode: parsed.errorCode,
        retryAfterSec: parsed.retryAfterSec,
      };
    }
  }

  async verifyCardPayment(transactionId: string): Promise<PaymentStatus> {
    try {
      const response = await this.api.get(
        `/payments/card/verify/${transactionId}`,
      );
      return parsePaymentStatus(response.data, 'payments.verifyCardPayment');
    } catch (error: any) {
      const parsed = parseSecurityActionError(
        error,
        'Payment verification failed',
      );
      return {
        success: false,
        status: 'failed',
        error: parsed.message,
        errorCode: parsed.errorCode,
        retryAfterSec: parsed.retryAfterSec,
      };
    }
  }

  async confirmCODOrder(orderId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post(`/payments/cod/confirm/${orderId}`, null, {
        headers: {
          'Idempotency-Key': newIdempotencyKey(`cod-${orderId}`),
        },
      });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to confirm COD order'),
      };
    }
  }

  async getPaymentStatus(orderId: string): Promise<PaymentStatus> {
    try {
      const response = await this.api.get(`/payments/status/${orderId}`);
      return parsePaymentStatus(response.data, 'payments.getPaymentStatus');
    } catch (error: any) {
      const parsed = parseSecurityActionError(
        error,
        'Failed to get payment status',
      );
      return {
        success: false,
        status: 'failed',
        error: parsed.message,
        errorCode: parsed.errorCode,
        retryAfterSec: parsed.retryAfterSec,
      };
    }
  }

  async getSavedPaymentMethods(): Promise<{
    success: boolean;
    methods?: SavedPaymentMethod[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/payments/methods');
      const data = asObject(response.data, 'payments.getSavedPaymentMethods');
      return {
        success: true,
        methods: asArray(
          data.methods || [],
          'payments.getSavedPaymentMethods.methods',
          (item, path) => asTypedObject<SavedPaymentMethod>(item, path),
        ),
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to fetch payment methods'),
      };
    }
  }

  async addSavedUPIMethod(upiId: string): Promise<{
    success: boolean;
    method?: SavedPaymentMethod;
    error?: string;
  }> {
    try {
      const response = await this.api.post('/payments/methods/upi', { upiId });
      const data = asObject(response.data, 'payments.addSavedUPIMethod');
      return {
        success: true,
        method: asTypedObject<SavedPaymentMethod>(
          data.method,
          'payments.addSavedUPIMethod.method',
        ),
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to save UPI ID'),
      };
    }
  }

  async addSavedCardMethod(
    cardNumber: string,
    cardType: 'visa' | 'mastercard' | 'rupay' | 'other',
    nickname?: string,
  ): Promise<{
    success: boolean;
    method?: SavedPaymentMethod;
    error?: string;
  }> {
    try {
      const response = await this.api.post('/payments/methods/card', {
        cardNumber,
        cardType,
        nickname,
      });
      const data = asObject(response.data, 'payments.addSavedCardMethod');
      return {
        success: true,
        method: asTypedObject<SavedPaymentMethod>(
          data.method,
          'payments.addSavedCardMethod.method',
        ),
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to save card'),
      };
    }
  }

  async removePaymentMethod(methodId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.delete(`/payments/methods/${methodId}`);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to remove payment method'),
      };
    }
  }

  async setDefaultPaymentMethod(methodId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.put(`/payments/methods/${methodId}/default`);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to set default'),
      };
    }
  }

  async refundPayment(
    orderId: string,
    amount?: number,
    reason?: string,
  ): Promise<{
    success: boolean;
    refundId?: string;
    error?: string;
  }> {
    try {
      const response = await this.api.post(
        `/payments/refund/${orderId}`,
        {
          amount,
          reason,
        },
        {
          headers: {
            'Idempotency-Key': newIdempotencyKey(`refund-${orderId}`),
          },
        },
      );
      const data = asObject(response.data, 'payments.refundPayment');
      return {
        success: true,
        refundId: asOptionalString(
          data.refundId,
          'payments.refundPayment.refundId',
        ),
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Refund failed'),
      };
    }
  }

  async getRefundStatus(refundId: string): Promise<{
    success: boolean;
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/payments/refund/${refundId}/status`,
      );
      const data = asObject(response.data, 'payments.getRefundStatus');
      return {
        success: true,
        status: asEnum(
          data.status,
          'payments.getRefundStatus.status',
          REFUND_STATUSES,
        ),
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to get refund status'),
      };
    }
  }

  async processPaymentWithRetry(
    details: PaymentDetails,
    retries: number = 2,
  ): Promise<PaymentStatus> {
    let attempt = 0;
    let lastError: PaymentStatus = {
      success: false,
      status: 'failed',
      error: 'Payment failed',
    };

    while (attempt <= retries) {
      try {
        if (details.method === 'cod') {
          const codResult = await this.confirmCODOrder(details.orderId);
          return codResult.success
            ? { success: true, status: 'completed' }
            : { success: false, status: 'failed', error: codResult.error };
        }

        if (details.method === 'upi') {
          const init = await this.initiateUPIPayment({
            orderId: details.orderId,
            amount: details.amount,
          });
          if (!init.success || !init.transactionId) {
            throw new Error(init.error || 'UPI initiation failed');
          }
          return this.verifyUPIPayment(init.transactionId);
        }

        if (details.method === 'card') {
          const init = await this.initiateCardPayment({
            orderId: details.orderId,
            amount: details.amount,
            cardLast4: '0000',
            cardType: 'other',
          });
          if (!init.success || !init.transactionId) {
            throw new Error(init.error || 'Card initiation failed');
          }
          return this.verifyCardPayment(init.transactionId);
        }

        const status = await this.getPaymentStatus(details.orderId);
        if (status.success) {
          return status;
        }
        throw new Error(status.error || 'Wallet payment failed');
      } catch (error: any) {
        lastError = {
          success: false,
          status: 'failed',
          error: error?.message || 'Payment attempt failed',
        };
      }

      attempt += 1;
    }

    return lastError;
  }
}

export const paymentService = new PaymentService();
export default paymentService;


