import RazorpayCheckout from 'react-native-razorpay';
import { RAZORPAY_KEY_ID } from '@env';
import supabase from '../config/supabase';

export type CheckoutPaymentMethod = 'cod' | 'upi' | 'card' | 'netbanking';

export interface InitiatePaymentInput {
  orderId: string;
  amountInRupees: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentMethod: Exclude<CheckoutPaymentMethod, 'cod'>;
}

export interface PaymentResult {
  success: boolean;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  error?: string;
  dismissed?: boolean;
}

const normalizeError = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: string }).message;
    if (message) {
      return message;
    }
  }

  return fallback;
};

class PaymentService {
  async initiatePayment(input: InitiatePaymentInput): Promise<PaymentResult> {
    if (!RAZORPAY_KEY_ID) {
      return {
        success: false,
        error: 'RAZORPAY_KEY_ID missing in app env',
      };
    }

    const amountInPaise = Math.round(input.amountInRupees * 100);

    const { data, error: fnError } = await supabase.functions.invoke('create-razorpay-order', {
      body: {
        amount: amountInPaise,
        currency: 'INR',
        receipt: input.orderId,
      },
    });

    if (fnError || !data?.razorpay_order_id) {
      return {
        success: false,
        error: normalizeError(fnError || data, 'Unable to create payment order'),
      };
    }

    const razorpayOrderId = String(data.razorpay_order_id);

    const { error: pendingError } = await supabase
      .from('orders')
      .update({
        razorpay_order_id: razorpayOrderId,
        payment_status: 'pending',
        payment_method: input.paymentMethod,
      })
      .eq('id', input.orderId);

    if (pendingError) {
      return {
        success: false,
        error: normalizeError(pendingError, 'Failed to mark order payment as pending'),
      };
    }

    try {
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: amountInPaise,
        currency: 'INR',
        order_id: razorpayOrderId,
        name: 'FoodieGoApp',
        description: 'Food delivery order',
        prefill: {
          name: input.customerName || 'FoodieGo User',
          email: input.customerEmail || '',
          contact: input.customerPhone || '',
        },
        theme: {
          color: '#E23744',
        },
        method: {
          upi: input.paymentMethod === 'upi',
          card: input.paymentMethod === 'card',
          netbanking: input.paymentMethod === 'netbanking',
          wallet: false,
          emi: false,
          paylater: false,
        },
      };

      const paymentData = (await RazorpayCheckout.open(options)) as {
        razorpay_payment_id?: string;
      };

      const paymentId = paymentData?.razorpay_payment_id || '';

      const { error: paidError } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          razorpay_payment_id: paymentId,
          payment_method: input.paymentMethod,
        })
        .eq('id', input.orderId);

      if (paidError) {
        return {
          success: false,
          error: normalizeError(paidError, 'Payment succeeded but order update failed'),
        };
      }

      return {
        success: true,
        razorpayOrderId,
        razorpayPaymentId: paymentId,
      };
    } catch (gatewayError) {
      await supabase
        .from('orders')
        .update({ payment_status: 'failed', payment_method: input.paymentMethod })
        .eq('id', input.orderId);

      const message = normalizeError(gatewayError, 'Payment failed');
      const lowered = message.toLowerCase();

      return {
        success: false,
        error: message,
        dismissed:
          lowered.includes('cancel') ||
          lowered.includes('dismiss') ||
          lowered.includes('closed'),
      };
    }
  }
}

export const paymentService = new PaymentService();
export default paymentService;
