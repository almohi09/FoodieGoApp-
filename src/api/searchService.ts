import { Restaurant } from '../types';
import { mockMenuItems, mockRestaurants } from './mockData';

export type SearchQuickFilterId =
  | 'sort_rating'
  | 'fast'
  | 'rating4'
  | 'offers'
  | 'budget';

export interface RestaurantSearchParams {
  query: string;
  cuisine: string | null;
  activeQuickFilters: SearchQuickFilterId[];
}

const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

const getDeliveryMinutes = (deliveryTime: string): number => {
  const firstPart = deliveryTime.split('-')[0]?.trim() || '';
  const mins = parseInt(firstPart, 10);
  return Number.isNaN(mins) ? Number.MAX_SAFE_INTEGER : mins;
};

export const searchRestaurants = async ({
  query,
  cuisine,
  activeQuickFilters,
}: RestaurantSearchParams): Promise<Restaurant[]> => {
  if (!__DEV__) {
    return [];
  }

  // Simulate network latency; replace with API call when backend endpoint is ready.
  await sleep(180);

  const cuisineFiltered = cuisine
    ? mockRestaurants.filter(restaurant =>
        restaurant.cuisines.includes(cuisine),
      )
    : mockRestaurants;

  const normalizedQuery = query.trim().toLowerCase();
  const searchedResults = !normalizedQuery
    ? cuisineFiltered
    : cuisineFiltered.filter(restaurant => {
        const menuItems = mockMenuItems[restaurant.id] || [];
        const restaurantMatch = restaurant.name
          .toLowerCase()
          .includes(normalizedQuery);
        const cuisineMatch = restaurant.cuisines.some(item =>
          item.toLowerCase().includes(normalizedQuery),
        );
        const menuItemMatch = menuItems.some(
          item =>
            item.name.toLowerCase().includes(normalizedQuery) ||
            item.category.toLowerCase().includes(normalizedQuery) ||
            item.description.toLowerCase().includes(normalizedQuery),
        );

        return restaurantMatch || cuisineMatch || menuItemMatch;
      });

  let results = [...searchedResults];

  if (activeQuickFilters.includes('fast')) {
    results = results.filter(
      restaurant => getDeliveryMinutes(restaurant.deliveryTime) <= 30,
    );
  }

  if (activeQuickFilters.includes('rating4')) {
    results = results.filter(restaurant => restaurant.rating >= 4.0);
  }

  if (activeQuickFilters.includes('offers')) {
    results = results.filter(restaurant => Boolean(restaurant.isFlashDeal));
  }

  if (activeQuickFilters.includes('budget')) {
    results = results.filter(
      restaurant => (restaurant.minimumOrder || 0) <= 200,
    );
  }

  if (activeQuickFilters.includes('sort_rating')) {
    results.sort((a, b) => b.rating - a.rating);
  }

  return results;
};


