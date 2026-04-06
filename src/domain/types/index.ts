export type UserRole = 'customer' | 'seller' | 'admin';

export interface User {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  avatar?: string;
  role: UserRole;
  addresses: Address[];
  foodieCoins: number;
  isFoodiePass: boolean;
  foodiePassExpiry?: string;
  streak: number;
  lastOrderDate?: string;
  createdAt: string;
  isActive: boolean;
}

export interface Seller {
  id: string;
  phone: string;
  name: string;
  email: string;
  businessName: string;
  businessType: 'restaurant' | 'grocery' | 'pharmacy' | 'other';
  logo?: string;
  coverImage?: string;
  address: string;
  lat: number;
  lng: number;
  cuisines?: string[];
  gstin?: string;
  pan?: string;
  bankAccount?: BankAccount;
  documents: Document[];
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rating?: number;
  totalOrders: number;
  createdAt: string;
  isVerified: boolean;
}

export interface BankAccount {
  accountNumber: string;
  ifsc: string;
  accountHolder: string;
}

export interface Document {
  type: 'aadhar' | 'pan' | 'gst' | 'fssai' | 'other';
  number: string;
  imageUrl: string;
  verified: boolean;
}

export interface Admin {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'support' | 'operations';
  permissions: string[];
}

export interface Address {
  id: string;
  label: 'home' | 'work' | 'other';
  address: string;
  landmark?: string;
  lat: number;
  lng: number;
  isDefault: boolean;
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
  isFlashDeal?: boolean;
  flashDealDiscount?: number;
  distance?: number;
  minimumOrder?: number;
  fees?: {
    packaging?: number;
    delivery?: number;
  };
  sellerId?: string;
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
  customizations?: Customization[];
}

export interface Customization {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  minSelect?: number;
  maxSelect?: number;
  options: CustomizationOption[];
}

export interface CustomizationOption {
  id: string;
  name: string;
  price: number;
}

export interface SelectedCustomization {
  customizationId: string;
  optionIds: string[];
}

export interface CartItem {
  id: string;
  item: MenuItem;
  restaurantId: string;
  restaurantName: string;
  quantity: number;
  customizations: SelectedCustomization[];
  totalPrice: number;
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
  rider?: Rider;
  userId: string;
  sellerId?: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  customizations?: string;
}

export interface Rider {
  id: string;
  name: string;
  phone: string;
  image?: string;
  lat?: number;
  lng?: number;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minimumOrder?: number;
  maximumDiscount?: number;
  expiresAt: string;
  isActive: boolean;
}

export interface FlashDeal {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  discount: number;
  itemNames: string[];
  expiresAt: string;
  isAvailable: boolean;
}

export interface SpendDashboard {
  monthlySpend: number;
  totalOrders: number;
  topCuisines: { name: string; count: number }[];
  totalSavings: number;
  caloriesApprox: number;
}

export type PaymentMethod = 'upi' | 'card' | 'wallet' | 'cod';

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface NavigationParams {
  AuthStack: undefined;
  MainTabs: undefined;
  Splash: undefined;
  Onboarding: undefined;
  PhoneEntry: undefined;
  OTPVerify: { phone: string; role?: UserRole };
  Home: undefined;
  Orders: undefined;
  Rewards: undefined;
  Profile: undefined;
  RestaurantDetail: { restaurantId: string };
  ItemCustomize: { item: MenuItem; restaurantId: string };
  Cart: undefined;
  Checkout: undefined;
  OrderTracking: { orderId: string };
  OrderConfirmed: { orderId: string };
  SpendDashboard: undefined;
  AddressManage: undefined;
  FoodiePass: undefined;
  Settings: undefined;
  Help: undefined;
  LoginOptions: undefined;
  UserLogin: undefined;
  UserRegister: { phone: string };
  SellerLogin: undefined;
  SellerRegister: { phone: string };
  AdminLogin: undefined;
  SellerDashboard: undefined;
  AdminDashboard: undefined;
  AddRestaurant: undefined;
  EditRestaurant: { restaurantId: string };
  ManageOrders: undefined;
  Earnings: undefined;
  AddMenuItem: { restaurantId: string };
  EditMenuItem: { itemId: string };
  AllUsers: undefined;
  AllSellers: undefined;
  AllOrders: undefined;
  ReportedItems: undefined;
  SettingsPage: undefined;
}
