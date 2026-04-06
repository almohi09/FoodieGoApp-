# FoodieGo - Specification Document

## 1. Project Overview

**Project Name:** FoodieGo  
**Type:** Food Delivery Mobile Application (Android-first, React Native)  
**Core Functionality:** A comprehensive food delivery platform connecting customers with restaurants, featuring real-time tracking, AI-powered recommendations, loyalty rewards, and seamless checkout experience.

---

## 2. Technology Stack & Choices

### Framework & Language
- **Framework:** React Native 0.73+
- **Language:** TypeScript (strict mode)
- **Minimum Android SDK:** 24 (Android 7.0)
- **Target SDK:** 34 (Android 14)

### Key Libraries/Dependencies
| Category | Library | Version |
|----------|---------|---------|
| Navigation | @react-navigation/native | ^6.x |
| Navigation Stack | @react-navigation/stack | ^6.x |
| Bottom Tabs | @react-navigation/bottom-tabs | ^6.x |
| State Management | @reduxjs/toolkit | ^2.x |
| HTTP Client | axios | ^1.6 |
| Maps | react-native-maps | ^1.10 |
| Animations | react-native-reanimated | ^3.x |
| Gestures | react-native-gesture-handler | ^2.x |
| Safe Area | react-native-safe-area-context | ^4.x |
| Screens | react-native-screens | ^3.x |
| Vector Icons | react-native-vector-icons | ^10.x |
| Async Storage | @react-native-async-storage/async-storage | ^1.x |
| SVG Support | react-native-svg | ^15.x |

### State Management Approach
- **Redux Toolkit** for global state (cart, user, orders)
- **React Context** for theme/local UI state
- **RTK Query** pattern for API data caching

### Architecture Pattern
- **Clean Architecture** with separation of concerns:
  - `src/presentation/` - Screens, Components, Navigation
  - `src/domain/` - Business logic, Types, Interfaces
  - `src/data/` - API services, Repositories, Local storage
  - `src/utils/` - Helpers, Constants, Theme

---

## 3. Feature List

### Phase 1 - Foundation
- [ ] Splash Screen with animated logo
- [ ] Onboarding carousel (3 slides)
- [ ] Phone/OTP authentication flow
- [ ] Google Sign-In integration
- [ ] Address management (home, work, other)
- [ ] Home screen with hero banners
- [ ] Cuisine category pills (horizontal scroll)
- [ ] "For You" personalized restaurant section
- [ ] Restaurant list with filters (rating, delivery time, cuisine)
- [ ] Restaurant detail with full menu
- [ ] Menu with collapsible categories
- [ ] Item customization modal (size, toppings, spice)
- [ ] Persistent cart functionality
- [ ] Cart with item quantity management
- [ ] Checkout flow (address, payment method)
- [ ] Order placement with confirmation

### Phase 2 - Core Experience
- [ ] Real-time order tracking with map
- [ ] Rider location updates (simulated)
- [ ] Order status progress bar
- [ ] Order history screen
- [ ] Push notification readiness
- [ ] Payment integration structure (Razorpay-ready)

### Phase 3 - Differentiators
- [ ] FoodieCoins loyalty system
- [ ] FoodiePass subscription screen
- [ ] Spend Dashboard with analytics
- [ ] Flash deals with countdown
- [ ] Smart Combo suggestions UI
- [ ] Green Delivery mode toggle
- [ ] Group order invite flow

### Phase 4 - Polish
- [ ] Dark mode support
- [ ] Skeleton loaders
- [ ] Empty states with illustrations
- [ ] Error handling & retry UI
- [ ] Haptic feedback on actions

---

## 4. UI/UX Design Direction

### Overall Visual Style
- **Modern Food-Tech Aesthetic** - Clean, vibrant, appetizing
- Card-based layouts with subtle shadows
- Generous whitespace for readability
- Food-first imagery with rounded corners

### Color Scheme
| Role | Color | Hex |
|------|-------|-----|
| Primary | Warm Orange | #FF6B2C |
| Primary Dark | Deep Orange | #E55A1B |
| Success | Fresh Green | #2DBD7E |
| Info | Ocean Blue | #2C8EFF |
| Loyalty/Coin | Gold | #FFB800 |
| Error | Coral Red | #FF4757 |
| Background | Off-White | #F8F9FA |
| Surface | Pure White | #FFFFFF |
| Text Primary | Charcoal | #1A1A2E |
| Text Secondary | Gray | #6B7280 |
| Border | Light Gray | #E5E7EB |

### Typography
- **Headings:** Sora (Google Font) - Bold, 600-700 weight
- **Body:** DM Sans - Regular 400, Medium 500
- **Sizes:** H1: 28px, H2: 24px, H3: 20px, Body: 16px, Caption: 14px

### Layout Approach
- **Bottom Tab Navigation** (5 tabs: Home, Search, Orders, Rewards, Profile)
- **Stack Navigation** for detail screens
- **Modal/Bottom Sheet** for item customization
- **Pull-to-refresh** on list screens
- **Safe area handling** for notches

### Spacing & Sizing
- Base unit: 4px
- Card border radius: 16px
- Button border radius: 12px
- Input border radius: 8px
- Icon sizes: 24px (nav), 20px (inline)
- Touch targets: minimum 44px

### Interaction Design
- Haptic feedback on cart add/remove
- Pull-to-refresh gestures
- Swipe-to-dismiss for notifications
- Bottom sheet modals for actions
- Thumb-zone safe CTAs (bottom 30% of screen)
- Skeleton loaders instead of spinners

---

## 5. Screen Map

### Auth Stack
1. SplashScreen
2. OnboardingScreen (3 slides)
3. PhoneEntryScreen
4. OTPVerifyScreen

### Main Bottom Tabs
1. HomeScreen (default)
2. SearchScreen
3. OrdersScreen
4. RewardsScreen
5. ProfileScreen

### Push/Modal Screens
- RestaurantDetailScreen
- ItemCustomizeModal
- CartScreen
- CheckoutScreen
- OrderTrackingScreen
- OrderConfirmedScreen
- SpendDashboardScreen
- AddressManageScreen
- FoodiePassScreen
- SettingsScreen
- HelpScreen

---

## 6. Data Models (Core)

```typescript
User {
  id: string
  phone: string
  name?: string
  email?: string
  avatar?: string
  addresses: Address[]
  foodieCoins: number
  isFoodiePass: boolean
  foodiePassExpiry?: Date
}

Address {
  id: string
  label: 'home' | 'work' | 'other'
  address: string
  landmark?: string
  lat: number
  lng: number
  isDefault: boolean
}

Restaurant {
  id: string
  name: string
  image: string
  rating: number
  deliveryTime: string
  cuisines: string[]
  isOpen: boolean
  isFlashDeal?: boolean
  distance?: number
}

MenuItem {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: string
  isVeg: boolean
  isCustomizable: boolean
  customizations?: Customization[]
}

CartItem {
  item: MenuItem
  quantity: number
  customizations: SelectedCustomization[]
  totalPrice: number
}

Order {
  id: string
  restaurantId: string
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'
  items: OrderItem[]
  totalAmount: number
  deliveryFee: number
  discount: number
  finalAmount: number
  deliveryAddress: Address
  createdAt: Date
  estimatedDelivery?: Date
}
```

---

## 7. API Endpoints Structure

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/otp/send | Send OTP to phone |
| POST | /auth/otp/verify | Verify OTP |
| POST | /auth/google | Google auth |
| GET | /restaurants | List restaurants (with filters) |
| GET | /restaurants/:id | Restaurant detail |
| GET | /restaurants/:id/menu | Restaurant menu |
| GET | /user/profile | Get user profile |
| PUT | /user/addresses | Update addresses |
| GET | /cart | Get cart |
| POST | /cart/items | Add item to cart |
| PUT | /cart/items/:id | Update cart item |
| DELETE | /cart/items/:id | Remove from cart |
| POST | /orders | Place order |
| GET | /orders | Order history |
| GET | /orders/:id | Order detail |
| GET | /orders/:id/track | Live tracking |
| GET | /loyalty/coins | Get FoodieCoins balance |
| POST | /loyalty/redeem | Redeem coins |
| GET | /deals/flash | Get flash deals |

---

## 8. Non-Functional Requirements

- App bundle size: < 50MB
- Cold start: < 3 seconds
- Screen transitions: 60fps animations
- Offline cart persistence
- Secure token storage
- Analytics event tracking ready
