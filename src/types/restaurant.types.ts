export interface Restaurant {
  id: string;
  name: string;
  image_url?: string | null;
  cuisine_type?: string | null;
  rating?: number | null;
  delivery_fee?: number | null;
  is_open?: boolean;
  is_veg_only?: boolean;
  [key: string]: unknown;
}

export interface RestaurantFilter {
  cuisineType?: string;
  minRating?: number;
  maxDeliveryFee?: number;
  isVegOnly?: boolean;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order?: number;
  [key: string]: unknown;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id?: string;
  name: string;
  price: number;
  is_available?: boolean;
  is_veg?: boolean;
  [key: string]: unknown;
}

