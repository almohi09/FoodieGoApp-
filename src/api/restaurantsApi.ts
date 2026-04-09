import { supabase } from '@/config/supabase';
import type { Restaurant, RestaurantFilter } from '@/types/restaurant.types';

export const restaurantsApi = {
  getAll: async (filters?: RestaurantFilter) => {
    let query = supabase.from('restaurants').select('*').eq('is_open', true);

    if (filters?.cuisineType) {
      query = query.eq('cuisine_type', filters.cuisineType);
    }
    if (filters?.minRating !== undefined) {
      query = query.gte('rating', filters.minRating);
    }
    if (filters?.maxDeliveryFee !== undefined) {
      query = query.lte('delivery_fee', filters.maxDeliveryFee);
    }
    if (filters?.isVegOnly) {
      query = query.eq('is_veg_only', true);
    }

    const { data, error } = await query.order('rating', { ascending: false });
    if (error) {
      throw error;
    }
    return (data ?? []) as Restaurant[];
  },

  getById: async (id: string) => {
    const { data, error } = await supabase.from('restaurants').select('*').eq('id', id).single();
    if (error) {
      throw error;
    }
    return data as Restaurant;
  },

  search: async (query: string) => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .or(`name.ilike.%${query}%,cuisine_type.ilike.%${query}%`)
      .eq('is_open', true)
      .limit(20);
    if (error) {
      throw error;
    }
    return (data ?? []) as Restaurant[];
  },

  getNearby: async (lat: number, lng: number, radiusKm = 10) => {
    const { data, error } = await supabase.rpc('get_nearby_restaurants', {
      lat,
      lng,
      radius_km: radiusKm,
    });
    if (error) {
      throw error;
    }
    return (data ?? []) as Restaurant[];
  },
};

export default restaurantsApi;

