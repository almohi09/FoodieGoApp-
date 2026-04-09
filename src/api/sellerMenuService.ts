import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MenuItem } from '../types';
import { parseSecurityActionError } from './securityGuard';
import appEnv from '../config/env';

const API_BASE_URL = appEnv.apiBaseUrl;

export interface CreateMenuItemData {
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  isVeg: boolean;
  isCustomizable: boolean;
  customizations?: MenuItem['customizations'];
  isAvailable?: boolean;
  popular?: boolean;
}

export interface UpdateMenuItemData extends Partial<CreateMenuItemData> {
  isAvailable?: boolean;
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  itemCount: number;
}

class SellerMenuService {
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

  async getMenu(restaurantId: string): Promise<{
    success: boolean;
    items?: MenuItem[];
    categories?: Category[];
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/seller/restaurants/${restaurantId}/menu`,
      );
      return {
        success: true,
        items: response.data.items,
        categories: response.data.categories,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch menu',
      };
    }
  }

  async createMenuItem(
    restaurantId: string,
    data: CreateMenuItemData,
  ): Promise<{
    success: boolean;
    item?: MenuItem;
    error?: string;
  }> {
    try {
      const response = await this.api.post(
        `/seller/restaurants/${restaurantId}/menu`,
        data,
      );
      return { success: true, item: response.data.item };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create item',
      };
    }
  }

  async updateMenuItem(
    restaurantId: string,
    itemId: string,
    data: UpdateMenuItemData,
  ): Promise<{
    success: boolean;
    item?: MenuItem;
    error?: string;
  }> {
    try {
      const response = await this.api.put(
        `/seller/restaurants/${restaurantId}/menu/${itemId}`,
        data,
      );
      return { success: true, item: response.data.item };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update item',
      };
    }
  }

  async deleteMenuItem(
    restaurantId: string,
    itemId: string,
  ): Promise<{
    success: boolean;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      await this.api.delete(
        `/seller/restaurants/${restaurantId}/menu/${itemId}`,
      );
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete item',
      };
    }
  }

  async toggleItemAvailability(
    restaurantId: string,
    itemId: string,
    isAvailable: boolean,
  ): Promise<{
    success: boolean;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      await this.api.patch(
        `/seller/restaurants/${restaurantId}/menu/${itemId}/availability`,
        { isAvailable },
      );
      return { success: true };
    } catch (error: any) {
      const parsed = parseSecurityActionError(
        error,
        'Failed to update availability',
      );
      return {
        success: false,
        error: parsed.message,
        errorCode: parsed.errorCode,
        retryAfterSec: parsed.retryAfterSec,
      };
    }
  }

  async bulkUpdateAvailability(
    restaurantId: string,
    updates: { itemId: string; isAvailable: boolean }[],
  ): Promise<{
    success: boolean;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      await this.api.patch(
        `/seller/restaurants/${restaurantId}/menu/bulk-availability`,
        {
          updates,
        },
      );
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Bulk update failed',
      };
    }
  }

  async createCategory(
    restaurantId: string,
    name: string,
  ): Promise<{
    success: boolean;
    category?: Category;
    error?: string;
  }> {
    try {
      const response = await this.api.post(
        `/seller/restaurants/${restaurantId}/categories`,
        { name },
      );
      return { success: true, category: response.data.category };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create category',
      };
    }
  }

  async updateCategory(
    restaurantId: string,
    categoryId: string,
    data: Partial<Category>,
  ): Promise<{
    success: boolean;
    category?: Category;
    error?: string;
  }> {
    try {
      const response = await this.api.put(
        `/seller/restaurants/${restaurantId}/categories/${categoryId}`,
        data,
      );
      return { success: true, category: response.data.category };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update category',
      };
    }
  }

  async deleteCategory(
    restaurantId: string,
    categoryId: string,
  ): Promise<{
    success: boolean;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      await this.api.delete(
        `/seller/restaurants/${restaurantId}/categories/${categoryId}`,
      );
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete category',
      };
    }
  }

  async reorderCategories(
    restaurantId: string,
    categoryIds: string[],
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.put(
        `/seller/restaurants/${restaurantId}/categories/reorder`,
        { categoryIds },
      );
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to reorder categories',
      };
    }
  }

  async getLowStockItems(restaurantId: string): Promise<{
    success: boolean;
    items?: MenuItem[];
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/seller/restaurants/${restaurantId}/low-stock`,
      );
      return { success: true, items: response.data.items };
    } catch (error: any) {
      return {
        success: false,
        error:
          error.response?.data?.message || 'Failed to fetch low stock items',
      };
    }
  }

  async updateItemStock(
    restaurantId: string,
    itemId: string,
    quantity: number,
  ): Promise<{
    success: boolean;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      await this.api.patch(
        `/seller/restaurants/${restaurantId}/menu/${itemId}/stock`,
        { quantity },
      );
      return { success: true };
    } catch (error: any) {
      const parsed = parseSecurityActionError(error, 'Failed to update stock');
      return {
        success: false,
        error: parsed.message,
        errorCode: parsed.errorCode,
        retryAfterSec: parsed.retryAfterSec,
      };
    }
  }
}

export const sellerMenuService = new SellerMenuService();
export default sellerMenuService;


