import crypto from "node:crypto";
import {
  Admin,
  AuditLogItem,
  DispatchOrder,
  DispatchRider,
  MenuItem,
  Order,
  PaymentRecord,
  PayoutItem,
  Restaurant,
  Seller,
  Session,
  TrackingEvent,
  User,
} from "./types.js";

const nowIso = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

const restaurant1: Restaurant = {
  id: "restaurant_1",
  name: "Pizza Palace",
  image: "https://images.example.com/pizza-palace.jpg",
  rating: 4.4,
  reviewCount: 520,
  deliveryTime: "25-35 mins",
  deliveryFee: 35,
  cuisines: ["Italian", "Fast Food"],
  isOpen: true,
  sellerId: "seller_1",
  fees: {
    packaging: 12,
    delivery: 35,
  },
};

const restaurant2: Restaurant = {
  id: "restaurant_2",
  name: "Biryani House",
  image: "https://images.example.com/biryani-house.jpg",
  rating: 4.6,
  reviewCount: 410,
  deliveryTime: "30-40 mins",
  deliveryFee: 40,
  cuisines: ["Indian", "Biryani"],
  isOpen: true,
  sellerId: "seller_2",
  fees: {
    packaging: 10,
    delivery: 40,
  },
};

const menuByRestaurant: Record<string, MenuItem[]> = {
  [restaurant1.id]: [
    {
      id: "m_pz_margherita",
      name: "Margherita Pizza",
      description: "Classic mozzarella and tomato",
      price: 249,
      image: "https://images.example.com/margherita.jpg",
      category: "Pizza",
      isVeg: true,
      isCustomizable: true,
      isAvailable: true,
      popular: true,
      stock: 20,
    },
    {
      id: "m_pz_farmhouse",
      name: "Farmhouse Pizza",
      description: "Loaded with veggies and cheese",
      price: 329,
      image: "https://images.example.com/farmhouse.jpg",
      category: "Pizza",
      isVeg: true,
      isCustomizable: true,
      isAvailable: true,
      stock: 14,
    },
  ],
  [restaurant2.id]: [
    {
      id: "m_br_chicken",
      name: "Chicken Dum Biryani",
      description: "Hyderabadi style slow-cooked biryani",
      price: 279,
      image: "https://images.example.com/chicken-biryani.jpg",
      category: "Biryani",
      isVeg: false,
      isCustomizable: false,
      isAvailable: true,
      popular: true,
      stock: 11,
    },
    {
      id: "m_br_veg",
      name: "Veg Dum Biryani",
      description: "Aromatic basmati and vegetables",
      price: 229,
      image: "https://images.example.com/veg-biryani.jpg",
      category: "Biryani",
      isVeg: true,
      isCustomizable: false,
      isAvailable: true,
      stock: 5,
    },
  ],
};

const customer: User = {
  id: "user_1",
  phone: "+919000000001",
  name: "Aarav",
  email: "aarav@example.com",
  role: "customer",
  status: "active",
  createdAt: nowIso(),
  orderCount: 0,
  totalSpend: 0,
  addresses: [
    {
      id: "addr_1",
      label: "home",
      address: "123 MG Road, Bengaluru",
      lat: 12.9716,
      lng: 77.5946,
      isDefault: true,
    },
  ],
};

const seller1: Seller = {
  id: "seller_1",
  phone: "+919000000010",
  name: "Karan",
  email: "seller@foodiego.in",
  businessName: "Pizza Palace LLP",
  businessType: "restaurant",
  status: "approved",
  rating: 4.4,
  totalOrders: 1200,
  totalRevenue: 340000,
  createdAt: nowIso(),
  restaurantId: "restaurant_1",
  documents: [{ type: "fssai", verified: true }],
};

const seller2: Seller = {
  id: "seller_2",
  phone: "+919000000011",
  name: "Sana",
  email: "seller2@foodiego.in",
  businessName: "Biryani House",
  businessType: "restaurant",
  status: "approved",
  rating: 4.6,
  totalOrders: 980,
  totalRevenue: 300000,
  createdAt: nowIso(),
  restaurantId: "restaurant_2",
  documents: [{ type: "fssai", verified: true }],
};

const admin: Admin = {
  id: "admin_1",
  email: "admin@foodiego.in",
  name: "Operations Admin",
  role: "operations",
  permissions: ["users:manage", "sellers:manage", "payouts:manage", "dispatch:manage"],
};

const payouts: PayoutItem[] = [
  {
    id: "payout_1",
    sellerId: "seller_1",
    sellerName: seller1.businessName,
    amount: 12500,
    status: "pending",
    cycle: "weekly",
    createdAt: nowIso(),
  },
];

const dispatchRiders: DispatchRider[] = [
  { id: "rider_1", name: "Amit Rider", phone: "+919000000021", isAvailable: true },
  { id: "rider_2", name: "Riya Rider", phone: "+919000000022", isAvailable: true },
];

const dispatchOrders: DispatchOrder[] = [
  {
    id: "pilot_o_1001",
    restaurantName: "Pizza Palace",
    amount: 420,
    status: "ready_for_pickup",
    updatedAt: nowIso(),
  },
];

export const db = {
  users: new Map<string, User>([[customer.id, customer]]),
  sellers: new Map<string, Seller>([
    [seller1.id, seller1],
    [seller2.id, seller2],
  ]),
  admins: new Map<string, Admin>([[admin.id, admin]]),
  restaurants: new Map<string, Restaurant>([
    [restaurant1.id, restaurant1],
    [restaurant2.id, restaurant2],
  ]),
  menuByRestaurant: new Map<string, MenuItem[]>(
    Object.entries(menuByRestaurant).map(([restaurantId, items]) => [restaurantId, items]),
  ),
  sessions: new Map<string, Session>(),
  sessionsByRefreshToken: new Map<string, Session>(),
  otpByPhone: new Map<string, string>(),
  orders: new Map<string, Order>(),
  trackingByOrderId: new Map<string, TrackingEvent[]>(),
  paymentByOrderId: new Map<string, PaymentRecord>(),
  paymentMethodByUserId: new Map<string, Array<Record<string, unknown>>>(),
  refundById: new Map<string, { id: string; orderId: string; status: string }>(),
  payouts: new Map<string, PayoutItem>(payouts.map((p) => [p.id, p])),
  auditLogs: [] as AuditLogItem[],
  reports: [
    {
      id: "report_1",
      type: "review",
      itemId: "review_1",
      itemName: "Suspicious Review",
      reporterId: "user_1",
      reporterName: "Aarav",
      reason: "Spam",
      status: "pending",
      createdAt: nowIso(),
    },
  ],
  alerts: [
    {
      id: "alert_1",
      type: "warning",
      category: "orders",
      title: "Prep SLA drift",
      message: "2 restaurants crossed prep SLA in last 30m",
      actionRequired: true,
      createdAt: nowIso(),
    },
  ],
  dispatchRiders,
  dispatchOrders,
};

export const util = {
  nowIso,
  id,
};
