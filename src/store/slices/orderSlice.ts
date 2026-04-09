import { Order } from '../../types';

export interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  error: string | null;
}

export const initialOrderState: OrderState = {
  orders: [],
  currentOrder: null,
  isLoading: false,
  error: null,
};

type OrderActionMap = {
  setOrders: Order[];
  addOrder: Order;
  updateOrder: Order;
  setCurrentOrder: Order | null;
  updateOrderStatus: { orderId: string; status: Order['status'] };
  setLoading: boolean;
  setError: string | null;
  clearError: undefined;
};

type ActionName = keyof OrderActionMap;
export type OrderAction = {
  [K in ActionName]: OrderActionMap[K] extends undefined
    ? { type: `orders/${K}` }
    : { type: `orders/${K}`; payload: OrderActionMap[K] };
}[ActionName];

const createAction = <K extends ActionName>(type: K) => {
  return (payload?: OrderActionMap[K]) =>
    payload === undefined
      ? ({ type: `orders/${type}` } as OrderAction)
      : ({ type: `orders/${type}`, payload } as OrderAction);
};

export const setOrders = createAction('setOrders');
export const addOrder = createAction('addOrder');
export const updateOrder = createAction('updateOrder');
export const setCurrentOrder = createAction('setCurrentOrder');
export const updateOrderStatus = createAction('updateOrderStatus');
export const setLoading = createAction('setLoading');
export const setError = createAction('setError');
export const clearError = createAction('clearError');

export const reduceOrderState = (
  state: OrderState,
  action: OrderAction | { type: string; payload?: unknown },
): OrderState => {
  switch (action.type) {
    case 'orders/setOrders':
      return {
        ...state,
        orders: (action as Extract<OrderAction, { type: 'orders/setOrders' }>).payload,
      };
    case 'orders/addOrder': {
      const order = (action as Extract<OrderAction, { type: 'orders/addOrder' }>).payload;
      return {
        ...state,
        orders: [order, ...state.orders],
        currentOrder: order,
      };
    }
    case 'orders/updateOrder': {
      const payload = (action as Extract<OrderAction, { type: 'orders/updateOrder' }>).payload;
      return {
        ...state,
        orders: state.orders.map(order => (order.id === payload.id ? payload : order)),
        currentOrder:
          state.currentOrder?.id === payload.id ? payload : state.currentOrder,
      };
    }
    case 'orders/setCurrentOrder':
      return {
        ...state,
        currentOrder: (action as Extract<OrderAction, { type: 'orders/setCurrentOrder' }>).payload,
      };
    case 'orders/updateOrderStatus': {
      const payload =
        (action as Extract<OrderAction, { type: 'orders/updateOrderStatus' }>).payload;
      return {
        ...state,
        orders: state.orders.map(order =>
          order.id === payload.orderId
            ? { ...order, status: payload.status }
            : order,
        ),
        currentOrder:
          state.currentOrder?.id === payload.orderId
            ? { ...state.currentOrder, status: payload.status }
            : state.currentOrder,
      };
    }
    case 'orders/setLoading':
      return {
        ...state,
        isLoading: (action as Extract<OrderAction, { type: 'orders/setLoading' }>).payload,
      };
    case 'orders/setError':
      return {
        ...state,
        error: (action as Extract<OrderAction, { type: 'orders/setError' }>).payload,
        isLoading: false,
      };
    case 'orders/clearError':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

