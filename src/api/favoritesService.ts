import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Restaurant } from '../types';
import appEnv from '../config/env';

const API_BASE_URL = appEnv.apiBaseUrl;
const FAVORITES_STORAGE_KEY = '@favorites_cache';

export interface FavoriteRestaurant extends Restaurant {
  favoritedAt: string;
}

class FavoritesService {
  private api: AxiosInstance;
  private token: string | null = null;
  private localCache: Set<string> = new Set();

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

  async initialize(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.localCache = new Set(parsed);
      }
    } catch {}
  }

  async getFavorites(): Promise<{
    success: boolean;
    favorites?: FavoriteRestaurant[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/favorites');
      const favorites = response.data.favorites || [];
      await this.syncLocalCache(favorites.map((f: FavoriteRestaurant) => f.id));
      return { success: true, favorites };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch favorites',
      };
    }
  }

  async addFavorite(restaurantId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post('/favorites', { restaurantId });
      this.localCache.add(restaurantId);
      await this.saveLocalCache();
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to add favorite',
      };
    }
  }

  async removeFavorite(restaurantId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.delete(`/favorites/${restaurantId}`);
      this.localCache.delete(restaurantId);
      await this.saveLocalCache();
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to remove favorite',
      };
    }
  }

  async toggleFavorite(restaurantId: string): Promise<{
    success: boolean;
    isFavorite: boolean;
    error?: string;
  }> {
    const isFavorite = this.isFavorite(restaurantId);
    if (isFavorite) {
      const result = await this.removeFavorite(restaurantId);
      return { ...result, isFavorite: false };
    } else {
      const result = await this.addFavorite(restaurantId);
      return { ...result, isFavorite: true };
    }
  }

  isFavorite(restaurantId: string): boolean {
    return this.localCache.has(restaurantId);
  }

  getLocalFavorites(): string[] {
    return Array.from(this.localCache);
  }

  private async syncLocalCache(ids: string[]): Promise<void> {
    this.localCache = new Set(ids);
    await this.saveLocalCache();
  }

  private async saveLocalCache(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(Array.from(this.localCache)),
      );
    } catch {}
  }

  async reorderFromPastOrder(orderId: string): Promise<{
    success: boolean;
    items?: {
      restaurantId: string;
      restaurantName: string;
      items: {
        menuItemId: string;
        name: string;
        quantity: number;
        price: number;
      }[];
    };
    error?: string;
  }> {
    try {
      const response = await this.api.post(`/orders/${orderId}/reorder`);
      return { success: true, items: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to reorder',
      };
    }
  }

  async getReorderSuggestions(): Promise<{
    success: boolean;
    suggestions?: {
      orderId: string;
      restaurantName: string;
      items: { name: string; count: number }[];
      lastOrdered: string;
    }[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/orders/reorder-suggestions');
      return { success: true, suggestions: response.data.suggestions };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get suggestions',
      };
    }
  }
}

export const favoritesService = new FavoritesService();
export default favoritesService;



