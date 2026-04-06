import { Coupon, PaymentMethod } from '../../domain/types';
import { createApiClient, newIdempotencyKey } from './httpClient';
import {
  asArray,
  asBoolean,
  asEnum,
  asErrorMessage,
  asNumber,
  asObject,
  asOptionalString,
  asString,
  asTypedObject,
} from './contracts';

interface CartItemInput {
  menuItemId: string;
  quantity: number;
  customizations?: string;
}

interface CheckoutPriceQuote {
  subtotal: number;
  deliveryFee: number;
  packagingFee: number;
  taxes: number;
  discount: number;
  foodieCoinsDiscount: number;
  total: number;
  savings: number;
}

interface ApplyCouponResult {
  success: boolean;
  coupon?: Coupon;
  discount?: number;
  message?: string;
}

interface DeliveryInfo {
  estimatedMinutes: number;
  deliveryFee: number;
  packagingFee: number;
  canDeliver: boolean;
  reason?: string;
}

const PAYMENT_METHODS: readonly PaymentMethod[] = [
  'upi',
  'card',
  'wallet',
  'cod',
] as const;

class CheckoutService {
  private api = createApiClient();

  constructor() {
    // Shared client handles auth headers and token refresh.
  }

  async getDeliveryInfo(
    restaurantId: string,
    addressId: string,
  ): Promise<{
    success: boolean;
    delivery?: DeliveryInfo;
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/restaurants/${restaurantId}/delivery-info`,
        {
          params: { addressId },
        },
      );
      const data = asObject(response.data, 'checkout.getDeliveryInfo');
      return {
        success: true,
        delivery: {
          estimatedMinutes: asNumber(
            data.estimatedMinutes,
            'checkout.getDeliveryInfo.estimatedMinutes',
          ),
          deliveryFee: asNumber(data.deliveryFee, 'checkout.getDeliveryInfo.deliveryFee'),
          packagingFee: asNumber(
            data.packagingFee,
            'checkout.getDeliveryInfo.packagingFee',
          ),
          canDeliver: asBoolean(data.canDeliver, 'checkout.getDeliveryInfo.canDeliver'),
          reason: asOptionalString(data.reason, 'checkout.getDeliveryInfo.reason'),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to get delivery info'),
      };
    }
  }

  async getPriceQuote(
    restaurantId: string,
    items: CartItemInput[],
    addressId: string,
  ): Promise<{
    success: boolean;
    quote?: CheckoutPriceQuote;
    error?: string;
  }> {
    try {
      const response = await this.api.post('/checkout/quote', {
        restaurantId,
        items,
        addressId,
      });
      const data = asObject(response.data, 'checkout.getPriceQuote');
      return {
        success: true,
        quote: {
          subtotal: asNumber(data.subtotal, 'checkout.getPriceQuote.subtotal'),
          deliveryFee: asNumber(
            data.deliveryFee,
            'checkout.getPriceQuote.deliveryFee',
          ),
          packagingFee: asNumber(
            data.packagingFee,
            'checkout.getPriceQuote.packagingFee',
          ),
          taxes: asNumber(data.taxes, 'checkout.getPriceQuote.taxes'),
          discount: asNumber(data.discount, 'checkout.getPriceQuote.discount'),
          foodieCoinsDiscount: asNumber(
            data.foodieCoinsDiscount,
            'checkout.getPriceQuote.foodieCoinsDiscount',
          ),
          total: asNumber(data.total, 'checkout.getPriceQuote.total'),
          savings: asNumber(data.savings, 'checkout.getPriceQuote.savings'),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to get price quote'),
      };
    }
  }

  async applyCoupon(
    restaurantId: string,
    couponCode: string,
    subtotal: number,
  ): Promise<ApplyCouponResult> {
    try {
      const response = await this.api.post('/checkout/apply-coupon', {
        restaurantId,
        code: couponCode,
        subtotal,
      });
      const data = asObject(response.data, 'checkout.applyCoupon');
      return {
        success: true,
        coupon: asTypedObject<Coupon>(data.coupon, 'checkout.applyCoupon.coupon'),
        discount: asNumber(data.discount, 'checkout.applyCoupon.discount'),
      };
    } catch (error: any) {
      const message = asErrorMessage(error, 'Failed to apply coupon');
      return { success: false, message };
    }
  }

  async removeCoupon(restaurantId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post('/checkout/remove-coupon', { restaurantId });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to remove coupon'),
      };
    }
  }

  async validateFoodieCoins(
    amount: number,
    coinsToUse: number,
  ): Promise<{
    success: boolean;
    maxCoinsUsable?: number;
    discount?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.post('/checkout/validate-coins', {
        amount,
        coinsToUse,
      });
      const data = asObject(response.data, 'checkout.validateFoodieCoins');
      return {
        success: true,
        maxCoinsUsable: asNumber(
          data.maxCoinsUsable,
          'checkout.validateFoodieCoins.maxCoinsUsable',
        ),
        discount: asNumber(data.discount, 'checkout.validateFoodieCoins.discount'),
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to validate coins'),
      };
    }
  }

  async getAvailableCoupons(): Promise<{
    success: boolean;
    coupons?: Coupon[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/coupons/available');
      const data = asObject(response.data, 'checkout.getAvailableCoupons');
      return {
        success: true,
        coupons: asArray(
          data.coupons || [],
          'checkout.getAvailableCoupons.coupons',
          (item, path) => asTypedObject<Coupon>(item, path),
        ),
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to fetch coupons'),
      };
    }
  }

  async placeOrder(data: {
    restaurantId: string;
    items: CartItemInput[];
    deliveryAddressId: string;
    paymentMethod: PaymentMethod;
    couponCode?: string;
    foodieCoinsUsed?: number;
    specialInstructions?: string;
  }): Promise<{
    success: boolean;
    orderId?: string;
    paymentDetails?: {
      amount: number;
      method: PaymentMethod;
      upiId?: string;
      cardLast4?: string;
    };
    error?: string;
  }> {
    try {
      asEnum(data.paymentMethod, 'checkout.placeOrder.paymentMethod', PAYMENT_METHODS);
      const response = await this.api.post('/checkout/place-order', data, {
        headers: {
          'Idempotency-Key': newIdempotencyKey('place-order'),
        },
      });
      const payload = asObject(response.data, 'checkout.placeOrder');
      const paymentDetailsRaw = payload.paymentDetails
        ? asObject(payload.paymentDetails, 'checkout.placeOrder.paymentDetails')
        : undefined;
      return {
        success: true,
        orderId: asString(payload.orderId, 'checkout.placeOrder.orderId'),
        paymentDetails: paymentDetailsRaw
          ? {
              amount: asNumber(
                paymentDetailsRaw.amount,
                'checkout.placeOrder.paymentDetails.amount',
              ),
              method: asEnum(
                paymentDetailsRaw.method,
                'checkout.placeOrder.paymentDetails.method',
                PAYMENT_METHODS,
              ),
              upiId: asOptionalString(
                paymentDetailsRaw.upiId,
                'checkout.placeOrder.paymentDetails.upiId',
              ),
              cardLast4: asOptionalString(
                paymentDetailsRaw.cardLast4,
                'checkout.placeOrder.paymentDetails.cardLast4',
              ),
            }
          : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to place order'),
      };
    }
  }

  async checkItemAvailability(
    restaurantId: string,
    items: CartItemInput[],
  ): Promise<{
    success: boolean;
    available: boolean;
    unavailableItems?: string[];
    error?: string;
  }> {
    try {
      const response = await this.api.post(
        `/restaurants/${restaurantId}/check-availability`,
        { items },
      );
      const data = asObject(response.data, 'checkout.checkItemAvailability');
      return {
        success: true,
        available: asBoolean(
          data.available,
          'checkout.checkItemAvailability.available',
        ),
        unavailableItems: asArray(
          data.unavailableItems || [],
          'checkout.checkItemAvailability.unavailableItems',
          (item, path) => asString(item, path),
        ),
      };
    } catch (error: any) {
      return {
        success: false,
        available: false,
        error: asErrorMessage(error, 'Failed to check availability'),
      };
    }
  }

  async checkRestaurantHours(restaurantId: string): Promise<{
    isOpen: boolean;
    nextOpensAt?: string;
    nextClosesAt?: string;
  }> {
    try {
      const response = await this.api.get(`/restaurants/${restaurantId}/hours`);
      const data = asObject(response.data, 'checkout.checkRestaurantHours');
      return {
        isOpen: asBoolean(data.isOpen, 'checkout.checkRestaurantHours.isOpen'),
        nextOpensAt: asOptionalString(
          data.nextOpensAt,
          'checkout.checkRestaurantHours.nextOpensAt',
        ),
        nextClosesAt: asOptionalString(
          data.nextClosesAt,
          'checkout.checkRestaurantHours.nextClosesAt',
        ),
      };
    } catch {
      return { isOpen: false };
    }
  }
}

export const checkoutService = new CheckoutService();
export default checkoutService;
