import supabase from '../config/supabase';
import { CartItem } from '../store/cartStore';

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'picked_up'
  | 'delivered'
  | 'cancelled';

export interface OrderRecord {
  id: string;
  user_id: string;
  restaurant_id: string;
  address_id: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  created_at: string;
  updated_at: string;
}

interface CreateOrderInput {
  userId: string;
  restaurantId: string;
  addressId: string;
  paymentMethod: 'cod' | 'upi' | 'card' | 'netbanking';
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: CartItem[];
}

interface OrderListItem {
  id: string;
  user_id: string;
  restaurant_id: string;
  status: OrderStatus;
  total: number;
  payment_method?: string | null;
  payment_status?: string | null;
  created_at: string;
  restaurants?: {
    name: string;
    image_url: string | null;
  } | null;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name: string;
  price: number;
  quantity: number;
}

const normalizeError = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: string }).message;
    if (message) {
      return message;
    }
  }
  return fallback;
};

const isMissingRpcFunctionError = (errorMessage: string) => {
  const message = errorMessage.toLowerCase();
  return message.includes('create_order_with_items') && message.includes('does not exist');
};

const createOrderWithFallback = async (input: CreateOrderInput) => {
  const payload = {
    user_id: input.userId,
    restaurant_id: input.restaurantId,
    address_id: input.addressId,
    status: 'placed' as OrderStatus,
    subtotal: input.subtotal,
    delivery_fee: input.deliveryFee,
    total: input.total,
    payment_method: input.paymentMethod,
  };

  const { data: insertedOrder, error: orderError } = await supabase
    .from('orders')
    .insert(payload)
    .select('*')
    .single<OrderRecord>();

  if (orderError || !insertedOrder) {
    return {
      success: false,
      error: normalizeError(orderError, 'Failed to create order'),
    };
  }

  const itemRows = input.items.map(item => ({
    order_id: insertedOrder.id,
    menu_item_id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(itemRows);

  if (itemsError) {
    await supabase.from('orders').delete().eq('id', insertedOrder.id);
    return {
      success: false,
      error: normalizeError(itemsError, 'Failed to create order items'),
    };
  }

  return {
    success: true,
    order: insertedOrder,
  };
};

export const createOrder = async (input: CreateOrderInput) => {
  const itemsPayload = input.items.map(item => ({
    menu_item_id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));

  const { data, error } = await supabase
    .rpc('create_order_with_items', {
      p_user_id: input.userId,
      p_restaurant_id: input.restaurantId,
      p_address_id: input.addressId,
      p_payment_method: input.paymentMethod,
      p_subtotal: input.subtotal,
      p_delivery_fee: input.deliveryFee,
      p_total: input.total,
      p_items: itemsPayload,
    })
    .single<OrderRecord>();

  if (error || !data) {
    const message = normalizeError(error, 'Failed to create order');
    if (isMissingRpcFunctionError(message)) {
      return createOrderWithFallback(input);
    }

    return {
      success: false,
      error: message,
    };
  }

  return {
    success: true,
    order: data,
  };
};

export const listOrders = async (userId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id,user_id,restaurant_id,status,total,payment_method,payment_status,created_at,restaurants(name,image_url)',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<OrderListItem[]>();

  if (error) {
    return {
      success: false,
      error: normalizeError(error, 'Failed to load orders'),
      orders: [] as OrderListItem[],
    };
  }

  return {
    success: true,
    orders: data || ([] as OrderListItem[]),
  };
};

export const listOrderItems = async (orderIds: string[]) => {
  if (orderIds.length === 0) {
    return {
      success: true,
      items: [] as OrderItemRow[],
    };
  }

  const { data, error } = await supabase
    .from('order_items')
    .select('id,order_id,menu_item_id,name,price,quantity')
    .in('order_id', orderIds)
    .returns<OrderItemRow[]>();

  if (error) {
    return {
      success: false,
      error: normalizeError(error, 'Failed to load order items'),
      items: [] as OrderItemRow[],
    };
  }

  return {
    success: true,
    items: data || ([] as OrderItemRow[]),
  };
};

export default {
  createOrder,
  listOrders,
  listOrderItems,
};
