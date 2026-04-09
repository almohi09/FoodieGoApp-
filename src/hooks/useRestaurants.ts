import { useCallback, useEffect, useMemo, useState } from 'react';
import supabase from '../config/supabase';

export type RestaurantSortOption =
  | 'relevance'
  | 'rating'
  | 'delivery_time'
  | 'cost_low_to_high'
  | 'cost_high_to_low';

export interface RestaurantFilters {
  category?: string;
  pureVeg?: boolean;
  rating4Plus?: boolean;
  under150Delivery?: boolean;
  fastDelivery?: boolean;
  sortBy?: RestaurantSortOption;
}

export interface RestaurantItem {
  id: string;
  name: string;
  description: string | null;
  cuisineType: string;
  rating: number;
  deliveryTimeMin: number;
  minOrderAmount: number;
  deliveryFee: number;
  imageUrl: string;
  isOpen: boolean;
  lat: number;
  lng: number;
  hasOffer: boolean;
  isPureVeg: boolean;
  areaName: string;
}

interface RestaurantRow {
  id: string;
  name: string;
  description: string | null;
  cuisine_type: string;
  rating: number | null;
  delivery_time_min: number;
  min_order_amount: number;
  delivery_fee: number;
  image_url: string | null;
  is_open: boolean;
  lat: number;
  lng: number;
}

const getPicsumFallback = (seed: string) =>
  `https://picsum.photos/seed/${seed}/800/500`;

const mapRestaurant = (row: RestaurantRow): RestaurantItem => {
  const areaName = `Lat ${row.lat.toFixed(3)}, Lng ${row.lng.toFixed(3)}`;
  const lowered = `${row.name} ${row.description || ''}`.toLowerCase();

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    cuisineType: row.cuisine_type,
    rating: Number(row.rating || 0),
    deliveryTimeMin: row.delivery_time_min,
    minOrderAmount: Number(row.min_order_amount),
    deliveryFee: Number(row.delivery_fee),
    imageUrl: row.image_url || getPicsumFallback(`restaurant-${row.id}`),
    isOpen: row.is_open,
    lat: row.lat,
    lng: row.lng,
    hasOffer: lowered.includes('offer') || lowered.includes('off'),
    isPureVeg:
      row.cuisine_type.toLowerCase().includes('veg') ||
      row.name.toLowerCase().includes('veg'),
    areaName,
  };
};

const applyFilters = (
  restaurants: RestaurantItem[],
  filters: RestaurantFilters,
): RestaurantItem[] => {
  let next = [...restaurants];

  if (filters.category && filters.category !== 'All') {
    const normalized = filters.category.toLowerCase();
    next = next.filter(
      item =>
        item.cuisineType.toLowerCase().includes(normalized) ||
        item.name.toLowerCase().includes(normalized),
    );
  }

  if (filters.pureVeg) {
    next = next.filter(item => item.isPureVeg);
  }
  if (filters.rating4Plus) {
    next = next.filter(item => item.rating >= 4);
  }
  if (filters.under150Delivery) {
    next = next.filter(item => item.deliveryFee <= 150);
  }
  if (filters.fastDelivery) {
    next = next.filter(item => item.deliveryTimeMin <= 30);
  }

  switch (filters.sortBy) {
    case 'rating':
      next.sort((a, b) => b.rating - a.rating);
      break;
    case 'delivery_time':
      next.sort((a, b) => a.deliveryTimeMin - b.deliveryTimeMin);
      break;
    case 'cost_low_to_high':
      next.sort((a, b) => a.minOrderAmount - b.minOrderAmount);
      break;
    case 'cost_high_to_low':
      next.sort((a, b) => b.minOrderAmount - a.minOrderAmount);
      break;
    default:
      break;
  }

  return next;
};

export const useRestaurants = (filters: RestaurantFilters = {}) => {
  const [restaurants, setRestaurants] = useState<RestaurantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('restaurants')
      .select(
        'id,name,description,cuisine_type,rating,delivery_time_min,min_order_amount,delivery_fee,image_url,is_open,lat,lng',
      )
      .eq('is_open', true);

    if (fetchError) {
      setError(fetchError.message || 'Failed to fetch restaurants');
      setRestaurants([]);
      setLoading(false);
      return;
    }

    const mapped = (data as RestaurantRow[]).map(mapRestaurant);
    setRestaurants(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchRestaurants();
  }, [fetchRestaurants]);

  const filteredRestaurants = useMemo(
    () => applyFilters(restaurants, filters),
    [restaurants, filters],
  );

  return {
    restaurants: filteredRestaurants,
    loading,
    error,
    refetch: fetchRestaurants,
  };
};

export default useRestaurants;
