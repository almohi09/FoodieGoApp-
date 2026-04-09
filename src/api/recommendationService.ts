import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Restaurant, MenuItem } from '../types';
import appEnv from '../config/env';

const API_BASE_URL = appEnv.apiBaseUrl;

export interface Recommendation {
  id: string;
  type: RecommendationType;
  restaurant?: Restaurant;
  menuItem?: MenuItem;
  score: number;
  reason: string;
}

export type RecommendationType =
  | 'popular'
  | 'similar'
  | 'frequently_ordered'
  | 'trending'
  | 'personalized'
  | 'nearby'
  | 'offer';

export interface UserPreferences {
  favoriteCuisines: string[];
  avgOrderValue: number;
  orderFrequency: 'daily' | 'weekly' | 'monthly' | 'occasional';
  dietaryPreferences: string[];
  spiceLevel: 'mild' | 'medium' | 'hot';
}

class RecommendationService {
  private api: AxiosInstance;
  private token: string | null = null;
  private cachedRecommendations: Map<string, Recommendation[]> = new Map();
  private userPreferences: UserPreferences | null = null;

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

  async getRecommendations(
    options: {
      type?: RecommendationType[];
      limit?: number;
      excludeIds?: string[];
    } = {},
  ): Promise<{
    success: boolean;
    recommendations?: Recommendation[];
    error?: string;
  }> {
    const cacheKey = JSON.stringify(options);

    if (this.cachedRecommendations.has(cacheKey)) {
      return {
        success: true,
        recommendations: this.cachedRecommendations.get(cacheKey),
      };
    }

    try {
      const response = await this.api.get('/recommendations', {
        params: {
          types: options.type?.join(','),
          limit: options.limit || 20,
          exclude: options.excludeIds?.join(','),
        },
      });

      const recommendations = response.data.recommendations as Recommendation[];
      this.cachedRecommendations.set(cacheKey, recommendations);

      return { success: true, recommendations };
    } catch (error: any) {
      return {
        success: false,
        error:
          error.response?.data?.message || 'Failed to fetch recommendations',
      };
    }
  }

  async getSimilarRestaurants(
    restaurantId: string,
    limit: number = 5,
  ): Promise<{
    success: boolean;
    restaurants?: Restaurant[];
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/recommendations/similar/${restaurantId}`,
        {
          params: { limit },
        },
      );
      return { success: true, restaurants: response.data.restaurants };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch similar',
      };
    }
  }

  async getTrendingRestaurants(limit: number = 10): Promise<{
    success: boolean;
    restaurants?: Restaurant[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/recommendations/trending', {
        params: { limit },
      });
      return { success: true, restaurants: response.data.restaurants };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch trending',
      };
    }
  }

  async getFrequentlyOrdered(
    restaurantId: string,
    limit: number = 5,
  ): Promise<{
    success: boolean;
    items?: MenuItem[];
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        '/recommendations/frequently-ordered',
        {
          params: { restaurantId, limit },
        },
      );
      return { success: true, items: response.data.items };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch items',
      };
    }
  }

  async getNearbyRestaurants(
    lat: number,
    lng: number,
    limit: number = 10,
  ): Promise<{
    success: boolean;
    restaurants?: Restaurant[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/recommendations/nearby', {
        params: { lat, lng, limit },
      });
      return { success: true, restaurants: response.data.restaurants };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch nearby',
      };
    }
  }

  async getOfferRestaurants(limit: number = 10): Promise<{
    success: boolean;
    restaurants?: Restaurant[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/recommendations/offers', {
        params: { limit },
      });
      return { success: true, restaurants: response.data.restaurants };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch offers',
      };
    }
  }

  async getPersonalizedRecommendations(limit: number = 20): Promise<{
    success: boolean;
    recommendations?: Recommendation[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/recommendations/personalized', {
        params: { limit },
      });
      return { success: true, recommendations: response.data.recommendations };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch personalized',
      };
    }
  }

  async getUserPreferences(): Promise<{
    success: boolean;
    preferences?: UserPreferences;
    error?: string;
  }> {
    try {
      const response = await this.api.get('/recommendations/preferences');
      this.userPreferences = response.data.preferences;
      return { success: true, preferences: response.data.preferences };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch preferences',
      };
    }
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.put('/recommendations/preferences', preferences);
      if (this.userPreferences) {
        this.userPreferences = { ...this.userPreferences, ...preferences };
      }
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update preferences',
      };
    }
  }

  async recordInteraction(
    type: 'view' | 'order' | 'cart_add' | 'search',
    itemId: string,
    itemType: 'restaurant' | 'menu_item',
  ): Promise<void> {
    try {
      await this.api.post('/recommendations/interactions', {
        type,
        itemId,
        itemType,
        timestamp: new Date().toISOString(),
      });
    } catch {}
  }

  clearCache(): void {
    this.cachedRecommendations.clear();
  }

  getLocalRecommendations(
    restaurants: Restaurant[],
    userPreferences?: UserPreferences,
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    const sorted = [...restaurants].sort((a, b) => b.rating - a.rating);

    sorted.slice(0, 5).forEach((r, index) => {
      recommendations.push({
        id: `top_rated_${r.id}`,
        type: 'popular',
        restaurant: r,
        score: 1 - index * 0.15,
        reason: `Top rated with ${r.rating} stars`,
      });
    });

    restaurants
      .filter(r => r.isFlashDeal)
      .slice(0, 3)
      .forEach(r => {
        recommendations.push({
          id: `offer_${r.id}`,
          type: 'offer',
          restaurant: r,
          score: 0.9,
          reason: `${r.flashDealDiscount}% off available`,
        });
      });

    if (userPreferences?.favoriteCuisines?.length) {
      restaurants.forEach(r => {
        const matchingCuisine = r.cuisines.find(c =>
          userPreferences.favoriteCuisines.includes(c),
        );
        if (matchingCuisine) {
          recommendations.push({
            id: `personalized_${r.id}`,
            type: 'personalized',
            restaurant: r,
            score: 0.85,
            reason: `Matches your love for ${matchingCuisine}`,
          });
        }
      });
    }

    return recommendations.sort((a, b) => b.score - a.score).slice(0, 20);
  }
}

export const recommendationService = new RecommendationService();
export default recommendationService;



