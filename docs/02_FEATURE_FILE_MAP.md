# Feature to File Map

## Authentication

- Splash/init flow: `src/presentation/screens/auth/SplashScreen.tsx`
- Onboarding: `src/presentation/screens/auth/OnboardingScreen.tsx`
- Login hub (user/seller/admin entry): `src/presentation/screens/auth/LoginOptionsScreen.tsx`
- User phone entry: `src/presentation/screens/auth/PhoneEntryScreen.tsx`
- OTP verify: `src/presentation/screens/auth/OTPVerifyScreen.tsx`
- User register: `src/presentation/screens/auth/UserRegisterScreen.tsx`
- Seller login/register:  
  `src/presentation/screens/auth/SellerLoginScreen.tsx`  
  `src/presentation/screens/auth/SellerRegisterScreen.tsx`
- Admin login: `src/presentation/screens/auth/AdminLoginScreen.tsx`

## User App (Main Tabs)

- Home: `src/presentation/screens/main/HomeScreen.tsx`
- Search: `src/presentation/screens/main/SearchScreen.tsx`
- Orders: `src/presentation/screens/main/OrdersScreen.tsx`
- Rewards: `src/presentation/screens/main/RewardsScreen.tsx`
- Profile: `src/presentation/screens/main/ProfileScreen.tsx`
- Location entry: `src/presentation/screens/main/LocationEntryScreen.tsx`

## API Services

- Shared HTTP client + token/idempotency logic: `src/data/api/httpClient.ts`
- Runtime API contract validators: `src/data/api/contracts.ts`
- Security/rate-limit local guard utility: `src/data/api/securityGuard.ts`
- Runtime API environment config: `src/config/env.ts`
- Restaurant API: `src/data/api/restaurantService.ts`
- Order API: `src/data/api/orderService.ts`
- Checkout API: `src/data/api/checkoutService.ts`
- Payment API: `src/data/api/paymentService.ts`
- Payment reconciliation API: `src/data/api/paymentReconciliationService.ts`
- Tracking API: `src/data/api/trackingService.ts`
- Search API: `src/data/api/searchService.ts`
- Enhanced Search API: `src/data/api/enhancedSearchService.ts`
- Auth API: `src/data/api/authService.ts`
- Location API: `src/data/api/locationService.ts`
- Inventory API: `src/data/api/inventoryService.ts`
- Delivery API: `src/data/api/deliveryService.ts`
- Coupon API: `src/data/api/couponService.ts`
- Push Notification API: `src/data/api/pushNotificationService.ts`
- Review/Ratings API: `src/data/api/reviewService.ts`
- Favorites API: `src/data/api/favoritesService.ts`
- Support/Help API: `src/data/api/supportService.ts`
- Filter API: `src/data/api/filterService.ts`
- Repeat Checkout API: `src/data/api/repeatCheckoutService.ts`

## Seller APIs

- Seller Menu API: `src/data/api/sellerMenuService.ts`
- Seller Orders API: `src/data/api/sellerOrderService.ts`
- Seller Earnings API: `src/data/api/sellerEarningsService.ts`
- Seller Restaurant Ops API: `src/data/api/sellerRestaurantService.ts`

## Admin APIs

- Admin Users API: `src/data/api/adminUserService.ts`
- Admin Moderation API: `src/data/api/adminModerationService.ts`
- Admin Dashboard API: `src/data/api/adminDashboardService.ts`
- Admin Payout API: `src/data/api/adminPayoutService.ts`

## Scale & Growth APIs

- Analytics API: `src/data/api/analyticsService.ts`
- A/B Experiments API: `src/data/api/experimentService.ts`
- Recommendations API: `src/data/api/recommendationService.ts`
- Fraud Detection API: `src/data/api/fraudDetectionService.ts`
- Cache API: `src/data/api/cacheService.ts`

## Restaurant and Cart Flow

- Restaurant detail/menu: `src/presentation/screens/restaurant/RestaurantDetailScreen.tsx`
- Cart: `src/presentation/screens/cart/CartScreen.tsx`
- Checkout: `src/presentation/screens/cart/CheckoutScreen.tsx`
- Order tracking: `src/presentation/screens/cart/OrderTrackingScreen.tsx`
- Order confirmed: `src/presentation/screens/cart/OrderConfirmedScreen.tsx`

## Partner and Admin

- Seller dashboard: `src/presentation/screens/seller/SellerDashboardScreen.tsx`
- Admin dashboard: `src/presentation/screens/admin/AdminDashboardScreen.tsx`
- Error center UI (admin-facing diagnostics): `src/presentation/screens/debug/ErrorCenterScreen.tsx`

## Monitoring and Analytics

- Telemetry wrapper: `src/monitoring/telemetry.ts`
- Error registry/handlers: `src/monitoring/errorCenter.ts`
- Observability context + trace-id helper: `src/monitoring/observabilityContext.ts`

## Shared UI Components

- `src/presentation/components/common/Button.tsx`
- `src/presentation/components/common/Input.tsx`
- `src/presentation/components/common/Loading.tsx`
- `src/presentation/components/common/EmptyState.tsx`
- `src/presentation/components/common/MenuItemCard.tsx`
- `src/presentation/components/common/RestaurantCard.tsx`
- `src/presentation/components/common/AppErrorBoundary.tsx`

## Data and Domain

- Mock data: `src/data/api/mockData.ts`
- Auth API service: `src/data/api/authService.ts`
- Location API service: `src/data/api/locationService.ts`
- Domain types: `src/domain/types/index.ts`
- Domain constants: `src/domain/constants/index.ts`

## Backend Service (New)

- Backend entry: `backend/src/server.ts`
- Backend data store seeds (in-memory): `backend/src/store.ts`
- Backend domain types: `backend/src/types.ts`
- Backend runtime setup:
  - `backend/package.json`
  - `backend/tsconfig.json`
  - `backend/.env.example`
  - `backend/README.md`
