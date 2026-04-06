import { useEffect, useState } from 'react';
import { Restaurant } from '../../domain/types';
import { SearchQuickFilterId } from '../../data/api/searchService';
import { restaurantService } from '../../data/api/restaurantService';

interface UseHomeSearchParams {
  query: string;
  cuisine: string | null;
  activeQuickFilters: SearchQuickFilterId[];
  debounceMs?: number;
}

export const useHomeSearch = ({
  query,
  cuisine,
  activeQuickFilters,
  debounceMs = 250,
}: UseHomeSearchParams) => {
  const [results, setResults] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const timeout = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await restaurantService.searchRestaurants({
          query,
          cuisine: cuisine || undefined,
        });

        if (isActive && result.success) {
          let next = result.restaurants || [];

          if (activeQuickFilters.includes('fast')) {
            next = next.filter(restaurant => {
              const mins = parseInt(restaurant.deliveryTime.split('-')[0], 10);
              return !Number.isNaN(mins) && mins <= 30;
            });
          }

          if (activeQuickFilters.includes('rating4')) {
            next = next.filter(restaurant => restaurant.rating >= 4);
          }

          if (activeQuickFilters.includes('offers')) {
            next = next.filter(restaurant => Boolean(restaurant.isFlashDeal));
          }

          if (activeQuickFilters.includes('budget')) {
            next = next.filter(restaurant => (restaurant.minimumOrder || 0) <= 200);
          }

          if (activeQuickFilters.includes('sort_rating')) {
            next = [...next].sort((a, b) => b.rating - a.rating);
          }

          setResults(next);
        } else if (isActive) {
          setResults([]);
          setError(result.error || 'Unable to fetch search results.');
        }
      } catch (searchError) {
        if (isActive) {
          setError('Unable to fetch search results.');
          // Keep the previously loaded results if request fails.
          console.warn('Home search request failed', searchError);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, [query, cuisine, activeQuickFilters, debounceMs]);

  return {
    results,
    isLoading,
    error,
  };
};
