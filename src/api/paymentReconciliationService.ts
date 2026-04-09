import { PaymentStatus, paymentService } from './paymentService';

export interface PaymentReconciliationResult {
  success: boolean;
  finalStatus: PaymentStatus;
  attempts: number;
  timedOut: boolean;
}

interface ReconciliationOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
}

const TERMINAL_STATUSES: Array<PaymentStatus['status']> = [
  'completed',
  'failed',
  'cancelled',
];

const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

class PaymentReconciliationService {
  async reconcileOrderPayment(
    orderId: string,
    initialStatus?: PaymentStatus,
    options: ReconciliationOptions = {},
  ): Promise<PaymentReconciliationResult> {
    const maxAttempts = options.maxAttempts ?? 6;
    const initialDelayMs = options.initialDelayMs ?? 1500;
    const maxDelayMs = options.maxDelayMs ?? 10000;

    const initial = initialStatus || (await paymentService.getPaymentStatus(orderId));
    if (TERMINAL_STATUSES.includes(initial.status)) {
      return {
        success: initial.status === 'completed' && initial.success,
        finalStatus: initial,
        attempts: 1,
        timedOut: false,
      };
    }

    let attempts = 1;
    let lastStatus = initial;
    let delayMs = initial.retryAfterMs || initialDelayMs;

    while (attempts < maxAttempts) {
      await sleep(Math.min(delayMs, maxDelayMs));
      attempts += 1;

      const status = await paymentService.getPaymentStatus(orderId);
      lastStatus = status;

      if (TERMINAL_STATUSES.includes(status.status)) {
        return {
          success: status.status === 'completed' && status.success,
          finalStatus: status,
          attempts,
          timedOut: false,
        };
      }

      const serverHint = status.retryAfterMs || 0;
      const backoffNext = Math.min(maxDelayMs, Math.floor(delayMs * 1.8));
      delayMs = Math.max(serverHint, backoffNext);
    }

    return {
      success: false,
      finalStatus: {
        ...lastStatus,
        success: false,
        status: 'pending',
        error:
          lastStatus.error ||
          'Payment confirmation is pending. Please retry reconciliation.',
      },
      attempts,
      timedOut: true,
    };
  }
}

export const paymentReconciliationService = new PaymentReconciliationService();
export default paymentReconciliationService;
