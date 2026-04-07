import { createApiClient } from './httpClient';
import { asBoolean, asObject, asOptionalString } from './contracts';
import { parseSecurityActionError } from './securityGuard';

export interface SellerRestaurantOperationalStatus {
  isOpen: boolean;
  reason?: string;
  nextOpensAt?: string;
}

export interface StoreHours {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

class SellerRestaurantService {
  private api = createApiClient();

  async getOperationalStatus(restaurantId: string): Promise<{
    success: boolean;
    status?: SellerRestaurantOperationalStatus;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      const response = await this.api.get(
        `/seller/restaurants/${restaurantId}/operational-status`,
      );
      const data = asObject(
        response.data,
        'sellerRestaurant.getOperationalStatus',
      );
      return {
        success: true,
        status: {
          isOpen: asBoolean(
            data.isOpen,
            'sellerRestaurant.getOperationalStatus.isOpen',
          ),
          reason: asOptionalString(
            data.reason,
            'sellerRestaurant.getOperationalStatus.reason',
          ),
          nextOpensAt: asOptionalString(
            data.nextOpensAt,
            'sellerRestaurant.getOperationalStatus.nextOpensAt',
          ),
        },
      };
    } catch (error) {
      const parsed = parseSecurityActionError(
        error,
        'Failed to fetch operational status',
      );
      return {
        success: false,
        error: parsed.message,
        errorCode: parsed.errorCode,
        retryAfterSec: parsed.retryAfterSec,
      };
    }
  }

  async setOperationalStatus(
    restaurantId: string,
    isOpen: boolean,
    reason?: string,
  ): Promise<{
    success: boolean;
    status?: SellerRestaurantOperationalStatus;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      const response = await this.api.patch(
        `/seller/restaurants/${restaurantId}/operational-status`,
        { isOpen, reason },
      );
      const data = asObject(
        response.data,
        'sellerRestaurant.setOperationalStatus',
      );
      return {
        success: true,
        status: {
          isOpen: asBoolean(
            data.isOpen,
            'sellerRestaurant.setOperationalStatus.isOpen',
          ),
          reason: asOptionalString(
            data.reason,
            'sellerRestaurant.setOperationalStatus.reason',
          ),
          nextOpensAt: asOptionalString(
            data.nextOpensAt,
            'sellerRestaurant.setOperationalStatus.nextOpensAt',
          ),
        },
      };
    } catch (error) {
      const parsed = parseSecurityActionError(
        error,
        'Failed to update operational status',
      );
      return {
        success: false,
        error: parsed.message,
        errorCode: parsed.errorCode,
        retryAfterSec: parsed.retryAfterSec,
      };
    }
  }

  async getStoreHours(restaurantId: string): Promise<{
    success: boolean;
    hours?: StoreHours[];
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/seller/restaurants/${restaurantId}/hours`,
      );
      return {
        success: true,
        hours: response.data.hours || response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch store hours',
      };
    }
  }

  async updateStoreHours(
    restaurantId: string,
    hours: StoreHours[],
  ): Promise<{
    success: boolean;
    hours?: StoreHours[];
    error?: string;
  }> {
    try {
      const response = await this.api.put(
        `/seller/restaurants/${restaurantId}/hours`,
        { hours },
      );
      return {
        success: true,
        hours: response.data.hours || hours,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update store hours',
      };
    }
  }
}

export const sellerRestaurantService = new SellerRestaurantService();
export default sellerRestaurantService;
