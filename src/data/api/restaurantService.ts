import { Restaurant, MenuItem, Location } from '../../domain/types';
import { createApiClient } from './httpClient';
import { getMenuByRestaurantId, mockRestaurants } from './mockData';
import {
  asArray,
  asBoolean,
  asErrorMessage,
  asNumber,
  asObject,
  asOptionalString,
  asString,
  asTypedObject,
} from './contracts';

interface GetRestaurantsParams {
  location?: Location;
  cuisine?: string;
  page?: number;
  limit?: number;
}

interface RestaurantSearchParams {
  query: string;
  cuisine?: string;
  latitude?: number;
  longitude?: number;
  page?: number;
  limit?: number;
}

class RestaurantService {
  private api = createApiClient();

  constructor() {
    // Shared client handles auth headers, token refresh, device binding.
  }

  async getRestaurants(params: GetRestaurantsParams = {}): Promise<{
    success: boolean;
    restaurants?: Restaurant[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/restaurants', {
        params: {
          lat: params.location?.lat,
          lng: params.location?.lng,
          cuisine: params.cuisine,
          page: params.page || 1,
          limit: params.limit || 20,
        },
      });
      const data = asObject(response.data, 'restaurants.getRestaurants');
      return {
        success: true,
        restaurants: asArray(
          data.restaurants || [],
          'restaurants.getRestaurants.restaurants',
          (item, path) => asTypedObject<Restaurant>(item, path),
        ),
      };
    } catch (error: any) {
      const fallback = mockRestaurants;
      return {
        success: true,
        restaurants: fallback,
        error: asErrorMessage(error, 'Failed to fetch restaurants'),
      };
    }
  }

  async getRestaurantById(restaurantId: string): Promise<{
    success: boolean;
    restaurant?: Restaurant;
    error?: string;
  }> {
    try {
      const response = await this.api.get(`/restaurants/${restaurantId}`);
      const data = asObject(response.data, 'restaurants.getRestaurantById');
      return {
        success: true,
        restaurant: asTypedObject<Restaurant>(
          data.restaurant,
          'restaurants.getRestaurantById.restaurant',
        ),
      };
    } catch (error: any) {
      const fallback = mockRestaurants.find(r => r.id === restaurantId);
      if (fallback) {
        return { success: true, restaurant: fallback };
      }
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to fetch restaurant'),
      };
    }
  }

  async getMenu(restaurantId: string): Promise<{
    success: boolean;
    menu?: MenuItem[];
    categories?: string[];
    error?: string;
  }> {
    try {
      const response = await this.api.get(`/restaurants/${restaurantId}/menu`);
      const data = asObject(response.data, 'restaurants.getMenu');
      return {
        success: true,
        menu: asArray(data.menu || [], 'restaurants.getMenu.menu', (item, path) =>
          asTypedObject<MenuItem>(item, path),
        ),
        categories: asArray(
          data.categories || [],
          'restaurants.getMenu.categories',
          (item, path) => asString(item, path),
        ),
      };
    } catch (error: any) {
      const fallbackMenu = getMenuByRestaurantId(restaurantId);
      if (fallbackMenu.length > 0) {
        return {
          success: true,
          menu: fallbackMenu,
          categories: [...new Set(fallbackMenu.map(item => item.category))],
        };
      }
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to fetch menu'),
      };
    }
  }

  async searchRestaurants(params: RestaurantSearchParams): Promise<{
    success: boolean;
    restaurants?: Restaurant[];
    total?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.get('/restaurants/search', {
        params: {
          q: params.query,
          cuisine: params.cuisine,
          lat: params.latitude,
          lng: params.longitude,
          page: params.page || 1,
          limit: params.limit || 20,
        },
      });
      const data = asObject(response.data, 'restaurants.searchRestaurants');
      return {
        success: true,
        restaurants: asArray(
          data.restaurants || [],
          'restaurants.searchRestaurants.restaurants',
          (item, path) => asTypedObject<Restaurant>(item, path),
        ),
        total: asNumber(data.total, 'restaurants.searchRestaurants.total'),
      };
    } catch (error: any) {
      const filtered = mockRestaurants.filter(restaurant => {
        const normalizedQuery = params.query.trim().toLowerCase();
        const matchesQuery =
          !normalizedQuery ||
          restaurant.name.toLowerCase().includes(normalizedQuery) ||
          restaurant.cuisines.some(cuisine =>
            cuisine.toLowerCase().includes(normalizedQuery),
          );
        const matchesCuisine =
          !params.cuisine ||
          restaurant.cuisines.some(
            cuisine => cuisine.toLowerCase() === params.cuisine?.toLowerCase(),
          );
        return matchesQuery && matchesCuisine;
      });
      return {
        success: true,
        restaurants: filtered,
        total: filtered.length,
        error: asErrorMessage(error, 'Search failed'),
      };
    }
  }

  async getNearbyRestaurants(
    latitude: number,
    longitude: number,
    radiusKm: number = 5,
  ): Promise<{
    success: boolean;
    restaurants?: Restaurant[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/restaurants/nearby', {
        params: { lat: latitude, lng: longitude, radius: radiusKm },
      });
      const data = asObject(response.data, 'restaurants.getNearbyRestaurants');
      return {
        success: true,
        restaurants: asArray(
          data.restaurants || [],
          'restaurants.getNearbyRestaurants.restaurants',
          (item, path) => asTypedObject<Restaurant>(item, path),
        ),
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to fetch nearby restaurants'),
      };
    }
  }

  async getCuisines(): Promise<{
    success: boolean;
    cuisines?: string[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/cuisines');
      const data = asObject(response.data, 'restaurants.getCuisines');
      return {
        success: true,
        cuisines: asArray(data.cuisines || [], 'restaurants.getCuisines.cuisines', (
          item,
          path,
        ) => asString(item, path)),
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to fetch cuisines'),
      };
    }
  }

  async getFeaturedRestaurants(): Promise<{
    success: boolean;
    restaurants?: Restaurant[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/restaurants/featured');
      const data = asObject(response.data, 'restaurants.getFeaturedRestaurants');
      return {
        success: true,
        restaurants: asArray(
          data.restaurants || [],
          'restaurants.getFeaturedRestaurants.restaurants',
          (item, path) => asTypedObject<Restaurant>(item, path),
        ),
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to fetch featured restaurants'),
      };
    }
  }

  async checkRestaurantStatus(
    restaurantId: string,
  ): Promise<{ isOpen: boolean; nextOpensAt?: string }> {
    try {
      const response = await this.api.get(
        `/restaurants/${restaurantId}/status`,
      );
      const data = asObject(response.data, 'restaurants.checkRestaurantStatus');
      return {
        isOpen: asBoolean(data.isOpen, 'restaurants.checkRestaurantStatus.isOpen'),
        nextOpensAt: asOptionalString(
          data.nextOpensAt,
          'restaurants.checkRestaurantStatus.nextOpensAt',
        ),
      };
    } catch {
      return { isOpen: false };
    }
  }
}

export const restaurantService = new RestaurantService();
export default restaurantService;
