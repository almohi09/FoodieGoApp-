import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Restaurant } from '../../domain/types';
import appEnv from '../../config/env';

const API_BASE_URL = appEnv.apiBaseUrl;

export type FilterType =
  | 'cuisine'
  | 'rating'
  | 'delivery_time'
  | 'price_range'
  | 'veg_only'
  | 'offers'
  | 'fast_delivery'
  | 'distance';

export interface FilterOption {
  id: string;
  label: string;
  type: FilterType;
  count?: number;
}

export interface FilterSelection {
  cuisines: string[];
  minRating: number | null;
  maxDeliveryTime: number | null;
  priceRange: { min: number; max: number } | null;
  vegOnly: boolean;
  hasOffers: boolean;
  fastDelivery: boolean;
  sortBy: SortOption;
}

export type SortOption =
  | 'relevance'
  | 'rating'
  | 'delivery_time'
  | 'price_low'
  | 'price_high'
  | 'distance';

export interface FilteredResults {
  restaurants: Restaurant[];
  total: number;
  appliedFilters: string[];
}

class FilterService {
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

  async getFilterOptions(): Promise<{
    success: boolean;
    options?: {
      cuisines: FilterOption[];
      ratings: FilterOption[];
      deliveryTimes: FilterOption[];
      priceRanges: FilterOption[];
    };
    error?: string;
  }> {
    try {
      const response = await this.api.get('/search/filters');
      return { success: true, options: response.data };
    } catch (error: any) {
      return {
        success: false,
        error:
          error.response?.data?.message || 'Failed to fetch filter options',
      };
    }
  }

  async applyFilters(
    filters: FilterSelection,
    query: string = '',
  ): Promise<{
    success: boolean;
    results?: FilteredResults;
    error?: string;
  }> {
    try {
      const response = await this.api.post('/search/filters', {
        filters,
        query,
      });
      return { success: true, results: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Filter application failed',
      };
    }
  }

  getDefaultFilters(): FilterSelection {
    return {
      cuisines: [],
      minRating: null,
      maxDeliveryTime: null,
      priceRange: null,
      vegOnly: false,
      hasOffers: false,
      fastDelivery: false,
      sortBy: 'relevance',
    };
  }

  applyLocalFilters(
    restaurants: Restaurant[],
    filters: FilterSelection,
  ): Restaurant[] {
    let filtered = [...restaurants];

    if (filters.cuisines.length > 0) {
      filtered = filtered.filter(r =>
        r.cuisines.some(c => filters.cuisines.includes(c)),
      );
    }

    if (filters.minRating !== null) {
      filtered = filtered.filter(r => r.rating >= filters.minRating!);
    }

    if (filters.maxDeliveryTime !== null) {
      filtered = filtered.filter(r => {
        const mins = parseInt(r.deliveryTime.split('-')[0], 10);
        return mins <= filters.maxDeliveryTime!;
      });
    }

    if (filters.priceRange !== null) {
      filtered = filtered.filter(
        r =>
          r.minimumOrder !== undefined &&
          r.minimumOrder >= filters.priceRange!.min &&
          r.minimumOrder <= filters.priceRange!.max,
      );
    }

    if (filters.vegOnly) {
      filtered = filtered.filter(r =>
        r.cuisines.some(
          c =>
            c.toLowerCase().includes('veg') ||
            c.toLowerCase().includes('salad'),
        ),
      );
    }

    if (filters.hasOffers) {
      filtered = filtered.filter(r => r.isFlashDeal);
    }

    if (filters.fastDelivery) {
      filtered = filtered.filter(r => {
        const mins = parseInt(r.deliveryTime.split('-')[0], 10);
        return mins <= 30;
      });
    }

    filtered = this.sortRestaurants(filtered, filters.sortBy);

    return filtered;
  }

  sortRestaurants(restaurants: Restaurant[], sortBy: SortOption): Restaurant[] {
    const sorted = [...restaurants];

    switch (sortBy) {
      case 'rating':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case 'delivery_time':
        sorted.sort((a, b) => {
          const aMins = parseInt(a.deliveryTime.split('-')[0], 10);
          const bMins = parseInt(b.deliveryTime.split('-')[0], 10);
          return aMins - bMins;
        });
        break;
      case 'price_low':
        sorted.sort((a, b) => (a.minimumOrder || 0) - (b.minimumOrder || 0));
        break;
      case 'price_high':
        sorted.sort((a, b) => (b.minimumOrder || 0) - (a.minimumOrder || 0));
        break;
      case 'distance':
        sorted.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        break;
      case 'relevance':
      default:
        break;
    }

    return sorted;
  }

  getActiveFilterCount(filters: FilterSelection): number {
    let count = 0;
    if (filters.cuisines.length > 0) count++;
    if (filters.minRating !== null) count++;
    if (filters.maxDeliveryTime !== null) count++;
    if (filters.priceRange !== null) count++;
    if (filters.vegOnly) count++;
    if (filters.hasOffers) count++;
    if (filters.fastDelivery) count++;
    if (filters.sortBy !== 'relevance') count++;
    return count;
  }

  getFilterSummary(filters: FilterSelection): string[] {
    const summary: string[] = [];

    if (filters.cuisines.length > 0) {
      summary.push(
        `${filters.cuisines.length} cuisine${filters.cuisines.length > 1 ? 's' : ''}`,
      );
    }
    if (filters.minRating !== null) {
      summary.push(`${filters.minRating}+ rating`);
    }
    if (filters.maxDeliveryTime !== null) {
      summary.push(`≤ ${filters.maxDeliveryTime} min`);
    }
    if (filters.priceRange !== null) {
      summary.push(`₹${filters.priceRange.min}-${filters.priceRange.max}`);
    }
    if (filters.vegOnly) summary.push('Veg only');
    if (filters.hasOffers) summary.push('Offers');
    if (filters.fastDelivery) summary.push('Fast delivery');

    return summary;
  }

  getPopularCuisines(): string[] {
    return [
      'Pizza',
      'Biryani',
      'Burger',
      'Chinese',
      'South Indian',
      'Desserts',
      'Pasta',
      'Street Food',
      'North Indian',
      'Sushi',
    ];
  }

  getDeliveryTimeOptions(): { label: string; value: number }[] {
    return [
      { label: 'Under 20 min', value: 20 },
      { label: 'Under 30 min', value: 30 },
      { label: 'Under 45 min', value: 45 },
      { label: 'Under 60 min', value: 60 },
    ];
  }

  getRatingOptions(): { label: string; value: number }[] {
    return [
      { label: '4.5+', value: 4.5 },
      { label: '4.0+', value: 4.0 },
      { label: '3.5+', value: 3.5 },
      { label: '3.0+', value: 3.0 },
    ];
  }

  getPriceRangeOptions(): {
    label: string;
    value: { min: number; max: number };
  }[] {
    return [
      { label: 'Under ₹100', value: { min: 0, max: 100 } },
      { label: '₹100 - ₹300', value: { min: 100, max: 300 } },
      { label: '₹300 - ₹500', value: { min: 300, max: 500 } },
      { label: 'Above ₹500', value: { min: 500, max: 9999 } },
    ];
  }
}

export const filterService = new FilterService();
export default filterService;

