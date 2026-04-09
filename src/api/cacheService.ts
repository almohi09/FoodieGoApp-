import AsyncStorage from '@react-native-async-storage/async-storage';
import { Restaurant, MenuItem } from '../types';

const CACHE_PREFIX = '@cache_';
const DEFAULT_TTL = 5 * 60 * 1000;

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheConfig {
  ttl?: number;
  staleWhileRevalidate?: boolean;
}

class CacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const fullKey = CACHE_PREFIX + key;

    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
      return memoryEntry.data as T;
    }

    try {
      const saved = await AsyncStorage.getItem(fullKey);
      if (!saved) return null;

      const entry: CacheEntry<T> = JSON.parse(saved);

      if (entry.expiresAt < Date.now()) {
        await this.remove(key);
        return null;
      }

      this.memoryCache.set(key, entry);
      return entry.data;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, data: T, config: CacheConfig = {}): Promise<void> {
    const fullKey = CACHE_PREFIX + key;
    const ttl = config.ttl ?? DEFAULT_TTL;
    const now = Date.now();

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    };

    this.memoryCache.set(key, entry);

    try {
      await AsyncStorage.setItem(fullKey, JSON.stringify(entry));
    } catch {}
  }

  async remove(key: string): Promise<void> {
    const fullKey = CACHE_PREFIX + key;
    this.memoryCache.delete(key);

    try {
      await AsyncStorage.removeItem(fullKey);
    } catch {}
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();

    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch {}
  }

  async getStale<T>(key: string): Promise<T | null> {
    const fullKey = CACHE_PREFIX + key;

    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      return memoryEntry.data as T;
    }

    try {
      const saved = await AsyncStorage.getItem(fullKey);
      if (!saved) return null;

      const entry: CacheEntry<T> = JSON.parse(saved);
      this.memoryCache.set(key, entry);
      return entry.data;
    } catch {
      return null;
    }
  }

  async setMultiple<T extends Record<string, any>>(
    entries: { key: string; data: T[keyof T] }[],
    config: CacheConfig = {},
  ): Promise<void> {
    for (const { key, data } of entries) {
      await this.set(key, data, config);
    }
  }

  subscribe(key: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  notify(key: string, data: any): void {
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      keyListeners.forEach(callback => callback(data));
    }
  }

  async cacheRestaurants(restaurants: Restaurant[]): Promise<void> {
    await this.set('restaurants', restaurants, { ttl: 10 * 60 * 1000 });
    this.notify('restaurants', restaurants);
  }

  async getCachedRestaurants(): Promise<Restaurant[] | null> {
    return this.get<Restaurant[]>('restaurants');
  }

  async getStaleRestaurants(): Promise<Restaurant[] | null> {
    return this.getStale<Restaurant[]>('restaurants');
  }

  async cacheMenu(restaurantId: string, menu: MenuItem[]): Promise<void> {
    await this.set(`menu_${restaurantId}`, menu, { ttl: 5 * 60 * 1000 });
    this.notify(`menu_${restaurantId}`, menu);
  }

  async getCachedMenu(restaurantId: string): Promise<MenuItem[] | null> {
    return this.get<MenuItem[]>(`menu_${restaurantId}`);
  }

  async getStaleMenu(restaurantId: string): Promise<MenuItem[] | null> {
    return this.getStale<MenuItem[]>(`menu_${restaurantId}`);
  }

  async cacheSearchResults(
    query: string,
    results: Restaurant[],
  ): Promise<void> {
    const normalizedQuery = query.toLowerCase().trim();
    await this.set(`search_${normalizedQuery}`, results, {
      ttl: 2 * 60 * 1000,
    });
  }

  async getCachedSearchResults(query: string): Promise<Restaurant[] | null> {
    const normalizedQuery = query.toLowerCase().trim();
    return this.get<Restaurant[]>(`search_${normalizedQuery}`);
  }

  async preloadData(): Promise<void> {
    try {
      const cached = await this.getCachedRestaurants();
      if (cached) {
        this.notify('preload_complete', cached);
      }
    } catch {}
  }

  getCacheSize(): number {
    return this.memoryCache.size;
  }

  getCacheAge(key: string): number | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    return Date.now() - entry.timestamp;
  }

  isExpired(key: string): boolean {
    const entry = this.memoryCache.get(key);
    if (!entry) return true;
    return entry.expiresAt < Date.now();
  }

  getRemainingTTL(key: string): number {
    const entry = this.memoryCache.get(key);
    if (!entry) return 0;
    return Math.max(0, entry.expiresAt - Date.now());
  }
}

export const cacheService = new CacheService();
export default cacheService;


