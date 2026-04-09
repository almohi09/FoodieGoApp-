import { supabase } from '@/config/supabase';
import type { MenuCategory, MenuItem } from '@/types/restaurant.types';

type UpsertMenuItemPayload = Partial<MenuItem> & { restaurant_id: string };

export const menuApi = {
  getCategoriesWithItems: async (restaurantId: string) => {
    const { data, error } = await supabase
      .from('menu_categories')
      .select('*, menu_items(*)')
      .eq('restaurant_id', restaurantId)
      .order('sort_order', { ascending: true });
    if (error) {
      throw error;
    }
    return (data ?? []) as Array<MenuCategory & { menu_items: MenuItem[] }>;
  },

  searchMenuItems: async (restaurantId: string, query: string) => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*, menu_categories(name)')
      .eq('restaurant_id', restaurantId)
      .ilike('name', `%${query}%`)
      .eq('is_available', true);
    if (error) {
      throw error;
    }
    return (data ?? []) as MenuItem[];
  },

  toggleItemAvailability: async (itemId: string, isAvailable: boolean) => {
    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: isAvailable })
      .eq('id', itemId);
    if (error) {
      throw error;
    }
  },

  upsertItem: async (item: UpsertMenuItemPayload) => {
    const { data, error } = await supabase.from('menu_items').upsert(item).select().single();
    if (error) {
      throw error;
    }
    return data as MenuItem;
  },

  deleteItem: async (itemId: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
    if (error) {
      throw error;
    }
  },
};

export default menuApi;

