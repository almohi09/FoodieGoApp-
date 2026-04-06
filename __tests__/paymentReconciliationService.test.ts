import {
  paymentReconciliationService,
} from '../src/data/api/paymentReconciliationService';
import { paymentService } from '../src/data/api/paymentService';

jest.mock('../src/data/api/paymentService', () => ({
  paymentService: {
    getPaymentStatus: jest.fn(),
  },
}));

describe('paymentReconciliationService', () => {
  test('returns success immediately for terminal completed status', async () => {
    const result = await paymentReconciliationService.reconcileOrderPayment(
      'order-1',
      {
        success: true,
        status: 'completed',
      },
    );

    expect(result.success).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.attempts).toBe(1);
    expect(result.finalStatus.status).toBe('completed');
  });

  test('times out with pending status when no terminal state arrives', async () => {
    const mocked = paymentService.getPaymentStatus as jest.Mock;
    mocked.mockResolvedValue({
      success: true,
      status: 'pending',
    });

    const result = await paymentReconciliationService.reconcileOrderPayment(
      'order-2',
      {
        success: true,
        status: 'pending',
      },
      {
        maxAttempts: 2,
        initialDelayMs: 1,
        maxDelayMs: 2,
      },
    );

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.finalStatus.status).toBe('pending');
    expect(mocked).toHaveBeenCalledTimes(1);
  });
});
