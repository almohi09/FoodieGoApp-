export interface Order {
  id: string;
  user_id?: string;
  restaurant_id?: string;
  address_id?: string;
  status?: string;
  subtotal?: number;
  delivery_fee?: number;
  total?: number;
  payment_method?: string;
  created_at?: string;
  updated_at?: string;
  order_items?: unknown[];
  restaurants?: unknown;
  riders?: unknown;
  [key: string]: unknown;
}

export interface CreateOrderPayload {
  user_id: string;
  restaurant_id: string;
  address_id: string;
  payment_method: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
  }>;
  [key: string]: unknown;
}

