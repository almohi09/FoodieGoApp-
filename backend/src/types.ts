export type UserRole = "customer" | "seller" | "admin" | "rider";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refunded";
export type PaymentMethod = "upi" | "card" | "wallet" | "cod";
export type PaymentStatusState = "pending" | "completed" | "failed" | "cancelled";

export interface Address {
  id: string;
  label: "home" | "work" | "other";
  address: string;
  landmark?: string;
  lat: number;
  lng: number;
  isDefault: boolean;
}

export interface User {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  role: UserRole;
  status: "active" | "suspended" | "deleted";
  createdAt: string;
  lastLoginAt?: string;
  orderCount: number;
  totalSpend?: number;
  addresses: Address[];
}

export interface Seller {
  id: string;
  phone: string;
  name: string;
  email: string;
  businessName: string;
  businessType: "restaurant" | "grocery" | "pharmacy" | "other";
  status: "pending" | "approved" | "rejected" | "suspended";
  rating?: number;
  totalOrders: number;
  totalRevenue: number;
  createdAt: string;
  restaurantId: string;
  documents: Array<{ type: string; verified: boolean }>;
}

export interface Admin {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "support" | "operations";
  permissions: string[];
}

export interface Restaurant {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  deliveryFee: number;
  cuisines: string[];
  isOpen: boolean;
  sellerId?: string;
  fees?: {
    packaging?: number;
    delivery?: number;
  };
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isVeg: boolean;
  isCustomizable: boolean;
  isAvailable: boolean;
  popular?: boolean;
  stock?: number;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  customizations?: string;
}

export interface Order {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  foodieCoinsUsed: number;
  foodieCoinsEarned: number;
  finalAmount: number;
  deliveryAddress: Address;
  paymentMethod: PaymentMethod;
  createdAt: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  userId: string;
  sellerId?: string;
  acceptedAt?: string;
  startedPrepAt?: string;
  readyAt?: string;
}

export interface TrackingEvent {
  id: string;
  status: OrderStatus;
  timestamp: string;
  message: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface PaymentRecord {
  orderId: string;
  status: PaymentStatusState;
  method: PaymentMethod;
  transactionId?: string;
  source: "webhook" | "gateway" | "unknown";
  lastUpdatedAt: string;
}

export interface PayoutItem {
  id: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  status: "pending" | "processing" | "paid" | "on_hold" | "failed";
  cycle?: string;
  createdAt?: string;
}

export interface DispatchRider {
  id: string;
  name: string;
  phone: string;
  isAvailable: boolean;
}

export interface DispatchOrder {
  id: string;
  restaurantName: string;
  amount: number;
  status:
    | "ready_for_pickup"
    | "assigned"
    | "picked_up"
    | "out_for_delivery"
    | "delivered";
  riderId?: string;
  riderName?: string;
  proofOtp?: string;
  updatedAt: string;
}

export interface AuditLogItem {
  id: string;
  actorRole: "admin" | "seller" | "system";
  actorId?: string;
  action: string;
  targetType: string;
  targetId: string;
  outcome: "success" | "failure";
  errorCode?: string;
  details?: string;
  createdAt: string;
}

export interface Session {
  token: string;
  refreshToken: string;
  userId: string;
  role: UserRole;
  createdAt: string;
  deviceId?: string;
  accessExpiresAt?: string;
  refreshExpiresAt?: string;
  revokedAt?: string;
}
