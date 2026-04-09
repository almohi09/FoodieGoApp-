import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Restaurant } from '../types';
import { mockRestaurants, mockMenuItems } from './mockData';
import appEnv from '../config/env';

const API_BASE_URL = appEnv.apiBaseUrl;
const ALLOW_MOCK_FALLBACK = __DEV__;

export interface SearchResult {
  restaurants: Restaurant[];
  suggestions: string[];
  trending: string[];
  total: number;
}

export interface TrendingQuery {
  query: string;
  count: number;
}

class EnhancedSearchService {
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

  async search(
    query: string,
    options: {
      latitude?: number;
      longitude?: number;
      cuisine?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ success: boolean; result?: SearchResult; error?: string }> {
    try {
      const response = await this.api.get('/search', {
        params: {
          q: query,
          lat: options.latitude,
          lng: options.longitude,
          cuisine: options.cuisine,
          page: options.page || 1,
          limit: options.limit || 20,
        },
      });
      return { success: true, result: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Search failed',
      };
    }
  }

  async getSuggestions(query: string): Promise<{
    success: boolean;
    suggestions?: string[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/search/suggestions', {
        params: { q: query },
      });
      return { success: true, suggestions: response.data.suggestions };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get suggestions',
      };
    }
  }

  async getTrending(): Promise<{
    success: boolean;
    trending?: TrendingQuery[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/search/trending');
      return { success: true, trending: response.data.trending };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get trending',
      };
    }
  }

  async getRecentSearches(): Promise<string[]> {
    try {
      const saved = await AsyncStorage.getItem('search_recent');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  async saveRecentSearch(query: string): Promise<void> {
    try {
      const recent = await this.getRecentSearches();
      const updated = [
        query,
        ...recent.filter(q => q.toLowerCase() !== query.toLowerCase()),
      ].slice(0, 10);
      await AsyncStorage.setItem('search_recent', JSON.stringify(updated));
    } catch {}
  }

  async clearRecentSearches(): Promise<void> {
    try {
      await AsyncStorage.removeItem('search_recent');
    } catch {}
  }

  calculateLevenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  isSimilarEnough(query: string, target: string, threshold = 2): boolean {
    const q = query.toLowerCase();
    const t = target.toLowerCase();

    if (t.includes(q)) return true;
    if (q.includes(t)) return true;

    const distance = this.calculateLevenshteinDistance(q, t);
    const maxLength = Math.max(q.length, t.length);
    const similarity = 1 - distance / maxLength;

    return similarity > 0.6 || distance <= threshold;
  }

  localSearch(
    query: string,
    restaurants: Restaurant[] = ALLOW_MOCK_FALLBACK ? mockRestaurants : [],
  ): Restaurant[] {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return restaurants;
    }

    const results = restaurants
      .map(restaurant => {
        let score = 0;
        const menuItems = ALLOW_MOCK_FALLBACK
          ? mockMenuItems[restaurant.id] || []
          : [];

        if (restaurant.name.toLowerCase().includes(normalizedQuery)) {
          score += 100;
          if (restaurant.name.toLowerCase().startsWith(normalizedQuery)) {
            score += 50;
          }
        }

        if (
          restaurant.cuisines.some(c =>
            c.toLowerCase().includes(normalizedQuery),
          )
        ) {
          score += 60;
        }

        const matchingItems = menuItems.filter(
          item =>
            item.name.toLowerCase().includes(normalizedQuery) ||
            item.category.toLowerCase().includes(normalizedQuery),
        );
        score += matchingItems.length * 20;

        const typoMatches = menuItems.filter(item => {
          const words = normalizedQuery.split(' ');
          return words.some(
            word =>
              !item.name.toLowerCase().includes(word) &&
              this.isSimilarEnough(word, item.name.toLowerCase()),
          );
        });
        score += typoMatches.length * 10;

        return { restaurant, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(r => r.restaurant);

    return results;
  }

  localSearchSuggestions(query: string, cuisines: string[] = []): string[] {
    const normalizedQuery = query.toLowerCase();
    if (!normalizedQuery) return [];

    const suggestions: string[] = [];

    cuisines.forEach(cuisine => {
      if (cuisine.toLowerCase().includes(normalizedQuery)) {
        suggestions.push(cuisine);
      }
    });

    const commonItems = [
      'biryani',
      'pizza',
      'burger',
      'pasta',
      'noodles',
      'dosa',
      'idli',
      'thali',
      'biryani',
      'tandoori',
      'curry',
      'rice',
      'rolls',
      'momos',
      'chinese',
      'italian',
      'south indian',
      'north indian',
    ];

    commonItems.forEach(item => {
      if (
        item.includes(normalizedQuery) &&
        !suggestions.some(s => s.toLowerCase() === item)
      ) {
        suggestions.push(item);
      }
    });

    return suggestions.slice(0, 5);
  }
}

export const enhancedSearchService = new EnhancedSearchService();
export default enhancedSearchService;



