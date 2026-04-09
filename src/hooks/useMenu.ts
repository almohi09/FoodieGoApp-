import { useCallback, useEffect, useMemo, useState } from 'react';
import supabase from '../config/supabase';

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  restaurantId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string;
  isAvailable: boolean;
  isVeg: boolean;
}

interface MenuCategoryRow {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
}

interface MenuItemRow {
  id: string;
  category_id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_veg: boolean;
}

export interface GroupedMenu {
  category: MenuCategory;
  items: MenuItem[];
}

const getMenuImage = (seed: string) => `https://picsum.photos/seed/${seed}/400/300`;

export const useMenu = (restaurantId: string) => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenu = useCallback(async () => {
    if (!restaurantId) {
      setCategories([]);
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [categoriesResult, itemsResult] = await Promise.all([
      supabase
        .from('menu_categories')
        .select('id,restaurant_id,name,sort_order')
        .eq('restaurant_id', restaurantId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('menu_items')
        .select(
          'id,category_id,restaurant_id,name,description,price,image_url,is_available,is_veg',
        )
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true),
    ]);

    if (categoriesResult.error) {
      setError(categoriesResult.error.message || 'Failed to load menu categories');
      setCategories([]);
      setItems([]);
      setLoading(false);
      return;
    }

    if (itemsResult.error) {
      setError(itemsResult.error.message || 'Failed to load menu items');
      setCategories([]);
      setItems([]);
      setLoading(false);
      return;
    }

    const mappedCategories: MenuCategory[] = (categoriesResult.data as MenuCategoryRow[]).map(
      row => ({
        id: row.id,
        restaurantId: row.restaurant_id,
        name: row.name,
        sortOrder: row.sort_order,
      }),
    );

    const mappedItems: MenuItem[] = (itemsResult.data as MenuItemRow[]).map(row => ({
      id: row.id,
      categoryId: row.category_id,
      restaurantId: row.restaurant_id,
      name: row.name,
      description: row.description,
      price: Number(row.price),
      imageUrl: row.image_url || getMenuImage(`menu-${row.id}`),
      isAvailable: row.is_available,
      isVeg: row.is_veg,
    }));

    setCategories(mappedCategories);
    setItems(mappedItems);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    void fetchMenu();
  }, [fetchMenu]);

  const groupedMenu: GroupedMenu[] = useMemo(
    () =>
      categories.map(category => ({
        category,
        items: items.filter(item => item.categoryId === category.id),
      })),
    [categories, items],
  );

  return {
    categories,
    items,
    groupedMenu,
    loading,
    error,
    refetch: fetchMenu,
  };
};

export default useMenu;
