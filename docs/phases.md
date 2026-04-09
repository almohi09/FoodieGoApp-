You are a senior React Native engineer working on FoodieGoApp — a food delivery app targeting production quality like Zomato.

Phase 1 audit is complete. Before writing any feature code, fix all the blockers found in the audit. Do every fix below in order. After each fix, confirm it is done before moving to the next.

CONFIRMED FACTS FROM AUDIT:
- React Native: 0.84.1
- Node currently installed: v24.14.0 (TOO HIGH — must be 20 LTS)
- engines field in package.json forces ">= 22.11.0" — WRONG, change to ">=18.0.0"
- Both Redux Toolkit AND Zustand installed — CONFLICT, remove Redux
- Both @react-navigation/stack AND @react-navigation/native-stack — CONFLICT, remove /stack
- Committed build artifacts in git (android/build, .gradle, metro-debug.log, index.android.bundle)
- Mixed folder architecture: src/presentation/*, src/data/*, src/domain/* needs to become flat
- Mock data file at src/data/api/mockData.ts — gate behind DEV flag, do not delete
- Demo OTP hints in OTPVerifyScreen and RiderOTPVerifyScreen — gate behind DEV flag
- Missing Ionicons typings causing TypeScript compile errors
- Geolocation typing issues in locationService.ts

FIX 1 — package.json cleanup:
- Change engines to: "node": ">=18.0.0"
- Remove @reduxjs/toolkit and react-redux from dependencies
- Remove @react-navigation/stack from dependencies
- Keep: zustand, @react-navigation/native-stack, @react-navigation/bottom-tabs

FIX 2 — install missing types:
npm install --save-dev @types/react-native-vector-icons

FIX 3 — fix geolocation types in src/data/api/locationService.ts:
Replace all Geolocation callback typing issues with proper GeolocationResponse types from @react-native-community/geolocation or use the built-in RN Geolocation types correctly.

FIX 4 — gate all mock/demo code:
Wrap mockData usage and OTP hints with:
if (__DEV__) { ... }

FIX 5 — add to .gitignore if not already present:
android/build
android/.gradle
android/.cxx
android/app/src/main/assets/index.android.bundle
metro-debug.log
android/build_log.txt
android/build-debug.log
backend/node_modules
node_modules
.env

FIX 6 — clean install:
Delete node_modules and package-lock.json
Run: npm install
Run: cd android && ./gradlew clean && cd ..
Run: npx tsc --noEmit
Show me ALL TypeScript errors from tsc output before proceeding.

After all 6 fixes are done and tsc shows zero errors, stop and wait for me to say "proceed to Phase 2".


Phase 2: Restructure to production folder architecture.

Do NOT rewrite any screen logic yet. Only move files and fix imports. Move one folder at a time. After moving each folder, run: npx tsc --noEmit and fix any broken imports before moving the next folder.

TARGET STRUCTURE:
FoodieGoApp/
├── src/
│   ├── api/              (all Supabase/axios calls)
│   ├── assets/           (images, fonts, icons)
│   ├── components/       (reusable UI — Button, Card, Input, etc.)
│   ├── config/           (supabase.ts, constants.ts, theme.ts)
│   ├── hooks/            (useAuth, useCart, useLocation, useOrders)
│   ├── navigation/       (AppNavigator, AuthNavigator, TabNavigator)
│   ├── screens/
│   │   ├── auth/         (LoginScreen, SignupScreen, OTPScreen)
│   │   ├── home/         (HomeScreen)
│   │   ├── restaurant/   (RestaurantListScreen, RestaurantDetailScreen)
│   │   ├── cart/         (CartScreen)
│   │   ├── checkout/     (CheckoutScreen)
│   │   ├── orders/       (OrdersScreen, OrderTrackingScreen)
│   │   ├── profile/      (ProfileScreen, AddressScreen)
│   │   └── admin/        (AdminScreen — keep existing)
│   ├── services/         (authService, locationService, notificationService)
│   ├── store/            (zustand stores — authStore, cartStore, orderStore)
│   ├── theme/            (colors.ts, spacing.ts, typography.ts)
│   └── types/            (all TypeScript interfaces and types)

RULES:
- Every screen folder must have: index.tsx + styles.ts
- Every component must have TypeScript props interface — no `any`
- No inline styles on screens — all styles go in styles.ts using StyleSheet.create()
- Import alias: set up @/ to point to src/ in tsconfig and babel.config.js
- After full migration run npx tsc --noEmit — must show ZERO errors before Phase 3

Show me each folder as you move it. Confirm imports work after each one.


Phase 3: Set up Supabase as the entire backend. Zero cost, free tier only.

STEP 1 — Install Supabase client:
npm install @supabase/supabase-js
npm install react-native-url-polyfill

STEP 2 — Create src/config/supabase.ts:
- Import createClient from @supabase/supabase-js
- Read SUPABASE_URL and SUPABASE_ANON_KEY from .env using react-native-dotenv
- Export a single supabase client instance
- Add AsyncStorage as the auth storage adapter for persistent sessions

STEP 3 — Create .env.example with these keys:
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key

STEP 4 — Create all database migration SQL files in /supabase/migrations/:

File: 001_create_users.sql
- profiles table: id (uuid, FK to auth.users), name, phone, avatar_url, created_at
- RLS: users can only read/update their own profile

File: 002_create_restaurants.sql
- restaurants: id, name, description, cuisine_type, rating, delivery_time_min, min_order_amount, delivery_fee, image_url, is_open, lat, lng, created_at
- RLS: public read, only admin can write

File: 003_create_menu.sql
- menu_categories: id, restaurant_id, name, sort_order
- menu_items: id, category_id, restaurant_id, name, description, price, image_url, is_available, is_veg
- RLS: public read

File: 004_create_orders.sql
- addresses: id, user_id, label, street, city, state, pincode, lat, lng, is_default
- orders: id, user_id, restaurant_id, address_id, status (enum: placed|confirmed|preparing|picked_up|delivered|cancelled), subtotal, delivery_fee, total, payment_method, created_at, updated_at
- order_items: id, order_id, menu_item_id, name, price, quantity
- RLS: users can only see their own orders; restaurant owners see orders for their restaurant

File: 005_create_reviews.sql
- reviews: id, user_id, restaurant_id, order_id, rating (1-5), comment, created_at
- RLS: users can create one review per order; public read

STEP 5 — Seed data file: /supabase/seed.sql
Insert 5 sample restaurants with full menus (Indian, Chinese, Pizza, Biryani, Fast Food) with realistic Prayagraj-area names and locations.

After creating all files, show me the complete SQL for review before I run it in Supabase dashboard.


Phase 4: Build complete authentication flow using Supabase Auth. Real working auth — no mock, no demo OTP hints.

SCREENS TO BUILD:
1. PhoneEntryScreen — enter Indian phone number (+91), validate format, call Supabase OTP
2. OTPVerifyScreen — 6-digit OTP input, auto-focus next field, resend timer 30s, verify with Supabase
3. ProfileSetupScreen — shown only on first login, collect name and profile photo
4. LoginScreen — email + password option as alternative to phone OTP
5. SignupScreen — name, email, password, confirm password

AUTH STORE (src/store/authStore.ts using Zustand):
interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  signInWithPhone: (phone: string) => Promise
  verifyOTP: (phone: string, token: string) => Promise
  signInWithEmail: (email: string, password: string) => Promise
  signUp: (email: string, password: string, name: string) => Promise
  signOut: () => Promise
  updateProfile: (data: Partial) => Promise
}

AUTH SERVICE (src/services/authService.ts):
- All Supabase auth calls go here — screens only call store actions
- On successful auth: fetch or create profile row in profiles table
- Persist session using AsyncStorage via Supabase client config

NAVIGATION LOGIC (src/navigation/AppNavigator.tsx):
- If no session → show AuthNavigator (phone/email login stack)
- If session but no profile name → show ProfileSetupScreen
- If session and profile complete → show MainTabNavigator
- Listen to supabase.auth.onAuthStateChange() for real-time session updates

UI REQUIREMENTS:
- Phone input: country code picker showing +91 by default, Indian flag
- OTP boxes: 6 separate TextInput boxes, auto-advance on digit entry, backspace goes to previous
- All inputs: show validation errors inline below the field in red
- Loading states: show ActivityIndicator inside buttons, disable button while loading
- Error handling: show Snackbar/Toast for auth errors (wrong OTP, network error, etc.)

Remove ALL demo/hardcoded OTP hints completely now. Real Supabase OTP only.

After building, test the full flow: phone entry → OTP → profile setup → home screen. Confirm it works end to end before Phase 5.


Phase 5: Build the Home screen and Restaurant listing — the core discovery experience like Zomato.

HOME SCREEN (src/screens/home/index.tsx):

Top section:
- Location bar: show current area name (from device GPS via locationService), tappable to change address
- Search bar: navigates to SearchScreen on tap (do not implement search inline)
- User greeting: "Good morning, [name]" based on time of day

Content (FlatList with ListHeaderComponent for performance):
- Banner carousel: horizontal ScrollView with 3 promotional banners (use local placeholder images)
- Category chips: horizontal ScrollView — All, Biryani, Pizza, Chinese, Burger, Desserts, South Indian
- "What's on your mind?" section: 2-row grid of food category images
- "Restaurants near you" section header with filter icon
- Restaurant cards (vertical list)

RESTAURANT CARD COMPONENT (src/components/RestaurantCard/index.tsx):
- Restaurant image (full width, 160px height, border radius 12)
- Veg/Non-veg badge (green dot or red dot)
- Name (16px bold), cuisine type + location (13px gray)
- Rating badge (green background, star icon, rating number)
- Delivery time + minimum order
- "Offers" badge if restaurant has active offers
- Tappable — navigates to RestaurantDetailScreen with restaurant id

RESTAURANT DETAIL SCREEN (src/screens/restaurant/RestaurantDetailScreen/index.tsx):
- Collapsible header with restaurant image and info
- Sticky menu category tabs (horizontal scroll)
- Menu items grouped by category
- Each menu item: name, description (2 lines max), price, veg/non-veg dot, ADD button
- ADD button: shows quantity selector (+/-) inline after first tap
- Search bar inside screen to filter menu items

RESTAURANT LIST SCREEN (src/screens/restaurant/RestaurantListScreen/index.tsx):
- Filter chips: Pure Veg, Rating 4.0+, Under ₹150 delivery, Fast delivery
- Sort: Relevance, Rating, Delivery time, Cost (low to high / high to low)
- FlatList of RestaurantCards
- Pull to refresh

DATA HOOKS:
- src/hooks/useRestaurants.ts — fetch restaurants from Supabase with filters
- src/hooks/useMenu.ts — fetch menu categories and items for a restaurant
- Both hooks: loading state, error state, refetch function

ALL DATA FROM SUPABASE — no mock data on these screens.
Show each screen as you build it. Use placeholder images from https://picsum.photos for now.


Phase 6: Build Cart, Checkout, and Order placement — the transaction core of the app.

CART STORE (src/store/cartStore.ts using Zustand, persisted to AsyncStorage):
interface CartState {
  items: CartItem[]
  restaurantId: string | null
  restaurantName: string
  addItem: (item: MenuItem, restaurantId: string, restaurantName: string) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  subtotal: number        (computed)
  deliveryFee: number     (computed from restaurant)
  total: number           (computed)
  itemCount: number       (computed)
}

IMPORTANT RULE: If user adds item from a DIFFERENT restaurant than what's in cart, show a dialog:
"Your cart has items from [RestaurantName]. Do you want to clear it and start fresh?" — Yes/No

CART SCREEN (src/screens/cart/index.tsx):
- Restaurant name header
- List of cart items: image, name, quantity stepper, price per item, line total
- Empty cart state: illustration + "Your cart is empty" + "Browse Restaurants" button
- Price breakdown: Subtotal, Delivery fee, Taxes (5%), Grand Total
- "Proceed to Checkout" button at bottom (sticky)
- Swipe to delete item

CHECKOUT SCREEN (src/screens/checkout/index.tsx):
- Delivery address section: show default address, "Change" link opens AddressScreen
- Order summary: collapsed list of items with total
- Payment method selection:
  - Cash on Delivery (always available)
  - (Placeholder cards for UPI and Card — show "Coming soon" badge)
- Apply coupon code input field (UI only for now, no backend logic)
- Price summary (same breakdown as cart)
- "Place Order" button

ORDER PLACEMENT (src/api/ordersApi.ts):
- createOrder(orderData) — inserts into orders table + order_items table in single Supabase transaction
- On success: clear cart, navigate to OrderTrackingScreen with new order id
- On failure: show error toast, keep cart intact

ORDERS SCREEN (src/screens/orders/index.tsx):
- Tab bar: Active Orders | Past Orders
- Active orders: show live status with colored badge
- Past orders: show date, restaurant, total, items count, "Reorder" button
- Each order tappable → OrderTrackingScreen

ORDER STATUS COLORS:
- placed → gray
- confirmed → blue  
- preparing → amber/orange
- picked_up → purple
- delivered → green
- cancelled → red


Phase 7: Build real-time order tracking and maps. This is what makes the app feel real.

ORDER TRACKING SCREEN (src/screens/orders/OrderTrackingScreen/index.tsx):

Top section — Map:
- Use react-native-maps with default provider (OpenStreetMap tiles via UrlTile — FREE, no API key)
- Show 3 markers: customer address, restaurant location, rider current position
- Draw a polyline between restaurant → rider → customer
- Map auto-fits to show all 3 markers

Middle section — Status timeline:
- 5 steps: Order Placed → Confirmed → Preparing → Out for Delivery → Delivered
- Completed steps: filled circle + colored line
- Current step: pulsing animated circle
- Each step shows timestamp when it was reached

Bottom section — Info card:
- Order ID, items summary, total
- Estimated delivery time countdown
- Rider name and phone number (tap to call)
- Cancel order button (only visible when status is "placed" or "confirmed")

REAL-TIME UPDATES (src/hooks/useOrderTracking.ts):
- Subscribe to Supabase Realtime on orders table filtered by order id
- On status change: update UI timeline immediately without refresh
- On rider_location change: animate map marker to new position smoothly
- Unsubscribe on screen unmount

SUPABASE REALTIME SETUP:
Add rider_location column to orders table: lat (float), lng (float), rider_name (text), rider_phone (text)
Create a Supabase Realtime publication for the orders table.

LOCATION SERVICE (src/services/locationService.ts) — fix existing file:
- requestLocationPermission() — handles Android permission request properly
- getCurrentLocation() — returns Promise<{lat, lng, address}>
- getAddressFromCoords(lat, lng) — reverse geocode using OpenStreetMap Nominatim API (FREE):
  fetch('https://nominatim.openstreetmap.org/reverse?lat=X&lon=Y&format=json')
- watchLocation(callback) — for rider location updates

SIMULATE RIDER (DEV only, gated with __DEV__):
- Add a "Simulate Delivery" button visible only in __DEV__ mode
- Button cycles order through all statuses with 3 second intervals
- Updates rider lat/lng to slowly move toward customer address on map

MAPS CONFIG:
- No Google Maps API key required for basic maps
- Add INTERNET permission to AndroidManifest.xml if not present
- Add ACCESS_FINE_LOCATION and ACCESS_COARSE_LOCATION permissions


Phase 9E: Extend Supabase database to support restaurant owners and riders. Run this BEFORE Phase 9A and 9B.

ADD TO SUPABASE — new migration file: 006_add_roles_and_riders.sql

--- 1. Add role to profiles table ---
ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'
  CHECK (role IN ('customer', 'restaurant_owner', 'rider', 'admin'));

--- 2. Restaurant owners table ---
CREATE TABLE restaurant_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, restaurant_id)
);

--- 3. Riders table ---
CREATE TABLE riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_type TEXT CHECK (vehicle_type IN ('bike', 'bicycle', 'scooter')),
  vehicle_number TEXT,
  is_online BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  current_lat FLOAT,
  current_lng FLOAT,
  last_location_update TIMESTAMPTZ,
  rating FLOAT DEFAULT 5.0,
  total_deliveries INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

--- 4. Add rider assignment to orders ---
ALTER TABLE orders ADD COLUMN rider_id UUID REFERENCES riders(id);
ALTER TABLE orders ADD COLUMN rider_assigned_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN picked_up_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN delivered_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN rejection_reason TEXT;
ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending'
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
ALTER TABLE orders ADD COLUMN razorpay_order_id TEXT;
ALTER TABLE orders ADD COLUMN razorpay_payment_id TEXT;

--- 5. Notifications table ---
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT CHECK (type IN ('order_update', 'promo', 'system')),
  is_read BOOLEAN DEFAULT false,
  order_id UUID REFERENCES orders(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

--- 6. FCM tokens table ---
CREATE TABLE fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('android', 'ios')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);

--- 7. Earnings table for riders ---
CREATE TABLE rider_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id),
  amount FLOAT NOT NULL,
  paid_at TIMESTAMPTZ DEFAULT now()
);

--- 8. RLS Policies ---

-- Riders: can update own location and status
CREATE POLICY "riders_update_own" ON riders
  FOR UPDATE USING (auth.uid() = user_id);

-- Restaurant owners: can update their restaurant's orders
CREATE POLICY "owners_update_orders" ON orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM restaurant_owners ro
      WHERE ro.restaurant_id = orders.restaurant_id
      AND ro.user_id = auth.uid()
    )
  );

-- Riders: can update orders assigned to them
CREATE POLICY "riders_update_assigned_orders" ON orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM riders r
      WHERE r.id = orders.rider_id
      AND r.user_id = auth.uid()
    )
  );

-- Notifications: users see only their own
CREATE POLICY "own_notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

--- 9. Enable Realtime on new tables ---
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE riders;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

After running this SQL in Supabase dashboard, confirm all tables created successfully then proceed to Phase 9A.


Phase 9A: Build the complete Restaurant Owner Panel. This is a separate navigation stack inside the same app, shown when the logged-in user has role = 'restaurant_owner'.

NAVIGATION LOGIC UPDATE (src/navigation/AppNavigator.tsx):
- If user.role === 'restaurant_owner' → show RestaurantOwnerNavigator
- If user.role === 'rider' → show RiderNavigator (Phase 9B)
- If user.role === 'customer' → show MainTabNavigator (existing)
- If user.role === 'admin' → show AdminNavigator (existing)

RESTAURANT OWNER NAVIGATOR (src/navigation/RestaurantOwnerNavigator.tsx):
Bottom tabs:
- Dashboard (chart icon)
- Orders (bell icon with badge for new orders)
- Menu (list icon)
- Profile (person icon)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCREEN 1: Owner Dashboard (src/screens/owner/DashboardScreen/index.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Header:
- Restaurant name + open/closed toggle switch
- When toggled closed: show confirmation dialog "Close restaurant? Customers won't be able to order."
- Update restaurants.is_open in Supabase on toggle

Stats cards row (today's data):
- Total orders today
- Revenue today (₹)
- Avg order value (₹)
- Cancelled orders

Recent orders list (last 5):
- Customer name, items count, total, time, status badge
- Tap to open order detail

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCREEN 2: Owner Orders Screen (src/screens/owner/OwnerOrdersScreen/index.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tabs: New | Active | Completed | Cancelled

NEW ORDERS tab:
- Real-time via Supabase Realtime — new order appears instantly without refresh
- Play a sound alert when new order arrives (use react-native-sound or Vibration API)
- Each order card shows:
  - Order ID, customer name, items list, total, time placed
  - Two buttons: ACCEPT (green) and REJECT (red)
  - Auto-reject timer: if no action in 5 minutes, show warning at 1 min remaining
- On ACCEPT: update order status to 'confirmed'
- On REJECT: show bottom sheet with rejection reasons:
  "Item unavailable" / "Restaurant busy" / "Closing soon" / "Other (type reason)"
  Update order status to 'cancelled' + save rejection_reason

ACTIVE ORDERS tab:
- Confirmed orders waiting to be prepared
- Each order: show items, customer address, total
- "Mark as Ready" button → updates status to 'preparing'
- "Assign Rider" button → opens bottom sheet listing available online riders
  (fetch from riders table where is_online = true)
- After rider assigned: status updates to 'picked_up' when rider confirms pickup

COMPLETED tab: past delivered orders, filterable by date
CANCELLED tab: cancelled orders with reasons

ORDER DETAIL SCREEN (src/screens/owner/OwnerOrderDetailScreen/index.tsx):
- Full order breakdown: each item + quantity + price
- Customer details: name, phone (tap to call), delivery address on mini map
- Order timeline
- Print bill button (generates simple text receipt, share via Android share sheet)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCREEN 3: Menu Management (src/screens/owner/MenuScreen/index.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Category list with expand/collapse:
- Each category: name, item count, edit/delete category buttons
- Drag to reorder categories (update sort_order)
- "Add Category" button at bottom

Each menu item row:
- Image thumbnail, name, price, veg/non-veg badge
- Available toggle switch (updates is_available instantly)
- Edit and delete icon buttons

ADD/EDIT ITEM BOTTOM SHEET:
- Image picker (upload to Supabase Storage, get public URL)
- Item name input
- Description textarea
- Price input (numeric keyboard)
- Category selector (dropdown)
- Veg/Non-veg toggle
- Available toggle
- Save button → upsert to menu_items table

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCREEN 4: Owner Profile (src/screens/owner/OwnerProfileScreen/index.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Restaurant details edit:
- Name, description, cuisine type, delivery fee, min order amount
- Opening hours (per day of week, from/to time pickers)
- Restaurant images (upload up to 5, stored in Supabase Storage)
- Restaurant location (map with draggable pin)
- Save changes button

OWNER STORE (src/store/ownerStore.ts using Zustand):
- currentRestaurant: Restaurant
- pendingOrdersCount: number
- fetchPendingOrders() 
- acceptOrder(orderId)
- rejectOrder(orderId, reason)
- updateOrderStatus(orderId, status)
- updateMenuItem(item)
- deleteMenuItem(itemId)
- toggleRestaurantOpen(isOpen)

After Phase 9A: test full flow — customer places order → owner receives notification → owner accepts → status updates on customer's tracking screen.


Phase 9B: Build the complete Rider (Delivery Partner) experience. Same app, different navigation stack for role = 'rider'.

RIDER NAVIGATOR (src/navigation/RiderNavigator.tsx):
Bottom tabs:
- Home/Deliveries (motorcycle icon)
- Earnings (wallet icon)
- History (clock icon)
- Profile (person icon)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCREEN 1: Rider Home (src/screens/rider/RiderHomeScreen/index.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Top section:
- Big toggle: ONLINE (green) / OFFLINE (gray)
- When ONLINE: start background location tracking every 10 seconds
  Update riders.current_lat, riders.current_lng, riders.last_location_update in Supabase
- When OFFLINE: stop location tracking

Stats row (today):
- Deliveries completed
- Amount earned (₹)
- Online hours

Active delivery card (shown when rider has an assigned order):
- Order details: restaurant name, customer name, items count, total distance
- TWO-STEP MAP VIEW:
  Step 1 "Go to Restaurant": map showing route from rider → restaurant
  Step 2 "Go to Customer": map showing route from restaurant → customer address
- Current step highlighted with progress indicator
- Action button:
  When at step 1: "I've Picked Up the Order" → updates order status to 'picked_up'
  When at step 2: "Order Delivered" → updates order status to 'delivered'
                   → show rating prompt for customer
                   → add earnings entry to rider_earnings table
                   → increment riders.total_deliveries

No active delivery — show:
- "You're online. Waiting for orders..." with animated pulse
- Map showing rider's current location

INCOMING DELIVERY REQUEST (modal overlay when new order assigned):
- Shows for 30 seconds with countdown timer
- Restaurant name + address
- Customer area name + distance
- Estimated earnings for this delivery (₹)
- ACCEPT button (green, large) and DECLINE button (smaller)
- If no response in 30s: auto-decline, order goes back to available pool
- On accept: update orders.rider_id, show active delivery card

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCREEN 2: Rider Earnings (src/screens/rider/RiderEarningsScreen/index.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Period selector tabs: Today | This Week | This Month

Summary cards:
- Total earned (₹)
- Deliveries completed
- Average per delivery (₹)
- Online hours

Earnings breakdown list:
- Each delivery: time, restaurant → customer area, amount earned
- Tap for full delivery detail

Weekly bar chart (simple, built with react-native-svg bars — no library needed):
- Last 7 days earnings per day

Payout info section (static UI for now):
- "Earnings paid every Monday" info card
- Bank account details (view only for now)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCREEN 3: Delivery History (src/screens/rider/RiderHistoryScreen/index.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- FlatList of completed deliveries (newest first)
- Each item: date/time, restaurant → customer area, amount earned, rating received
- Pull to refresh
- Filter by date range (date picker bottom sheet)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCREEN 4: Rider Profile (src/screens/rider/RiderProfileScreen/index.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Profile photo + name + phone
- Rider rating (stars display)
- Total deliveries badge
- Vehicle details: type + number (editable)
- Documents section (static UI): Aadhar, Driving License, RC — "Verified" badge
- Bank account details (for payouts — store encrypted, display masked)
- Logout button

RIDER STORE (src/store/riderStore.ts using Zustand):
- isOnline: boolean
- currentDelivery: Order | null
- todayEarnings: number
- todayDeliveries: number
- setOnlineStatus(isOnline): updates Supabase + starts/stops location tracking
- updateLocation(lat, lng): updates riders table
- acceptDelivery(orderId): assigns rider to order
- declineDelivery(orderId): removes assignment
- confirmPickup(orderId): updates status to picked_up
- confirmDelivery(orderId): updates status to delivered + adds earnings

BACKGROUND LOCATION (src/services/locationService.ts additions):
- Use @react-native-community/geolocation with watchPosition
- When rider is online: push location update to Supabase every 10 seconds
- Add to AndroidManifest.xml:
  ACCESS_BACKGROUND_LOCATION permission
  FOREGROUND_SERVICE permission
- Show persistent notification: "FoodieGo — You are online" when location tracking active

RIDER REGISTRATION FLOW:
If user tries to login as rider but no rider record exists:
- Show RiderOnboardingScreen with steps:
  1. Basic info (already from auth)
  2. Vehicle type selection (bike/bicycle/scooter)
  3. Vehicle number input
  4. "Application submitted" screen — pending admin verification

After Phase 9B: test full 3-way flow:
Customer orders → Owner accepts → Owner assigns rider → Rider accepts → 
Rider picks up → Customer sees rider moving on map → Rider delivers → 
Order marked complete for all 3 parties.


Phase 9C: Integrate Razorpay payment gateway. Free to integrate — only charges 2% per successful transaction. No monthly fees.

SETUP:
1. Create free Razorpay account at razorpay.com
2. Get Test Key ID and Test Key Secret from dashboard
3. Add to .env:
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_secret (NEVER expose this in app — backend use only)

IMPORTANT ARCHITECTURE NOTE:
Razorpay order creation MUST happen server-side to protect your Key Secret.
Use Supabase Edge Functions (free) as your backend — no separate server needed.

STEP 1 — Create Supabase Edge Function: /supabase/functions/create-razorpay-order/index.ts

This function:
- Receives: amount (in paise), currency, receipt (our order id)
- Creates Razorpay order via Razorpay API using Key Secret
- Returns: razorpay_order_id, amount, currency
- Deploy with: supabase functions deploy create-razorpay-order

STEP 2 — Install Razorpay React Native SDK:
npm install react-native-razorpay
cd android && ./gradlew clean && cd ..

STEP 3 — Update Checkout Screen payment section:

PAYMENT METHOD SELECTION (replace placeholder):
- Cash on Delivery — always available, no extra step
- UPI — opens Razorpay UPI flow
- Credit/Debit Card — opens Razorpay card flow
- Net Banking — opens Razorpay net banking

PAYMENT FLOW (src/services/paymentService.ts):

async function initiatePayment(orderData):
  1. Call Supabase Edge Function to create Razorpay order → get razorpay_order_id
  2. Update our orders table: set razorpay_order_id, payment_status = 'pending'
  3. Open Razorpay checkout with:
     - key: RAZORPAY_KEY_ID
     - amount: total in paise (multiply ₹ by 100)
     - currency: 'INR'
     - order_id: razorpay_order_id
     - name: 'FoodieGoApp'
     - description: 'Food delivery order'
     - prefill: customer name, email, phone
     - theme.color: '#E23744'
  4. On success callback: receive razorpay_payment_id
     - Update orders: payment_status = 'paid', razorpay_payment_id = payment_id
     - Trigger order placement flow (same as COD)
  5. On failure/dismiss: 
     - Update orders: payment_status = 'failed'
     - Show error toast with retry option
     - Do NOT place order

STEP 4 — Update Order model and UI:

In OrderTrackingScreen: show payment method + status badge
In OwnerOrdersScreen: show "PAID" or "COD" badge on each order
In OrderHistoryScreen: show payment method

STEP 5 — Refund flow (UI only for MVP, manual processing):
In admin panel: show "Initiate Refund" button for cancelled paid orders
Actual refund via Razorpay dashboard for now

TEST CARDS (use these in test mode):
- Success: 4111 1111 1111 1111, any future expiry, any CVV
- Failure: 4000 0000 0000 0002

STEP 6 — Switch to live mode before launch:
- Complete Razorpay KYC (free, takes 1-2 days)
- Replace rzp_test_ key with rzp_live_ key in production .env
- Test one real ₹1 transaction before going live


Phase 9D: Add push notifications using Firebase Cloud Messaging (FCM). Completely free — no limits on notifications.

SETUP:
1. Go to console.firebase.google.com → create project "FoodieGoApp"
2. Add Android app → download google-services.json → place in android/app/
3. Add to android/build.gradle:
   classpath 'com.google.gms:google-services:4.4.0'
4. Add to android/app/build.gradle bottom:
   apply plugin: 'com.google.gms.google-services'

INSTALL:
npm install @react-native-firebase/app @react-native-firebase/messaging
cd android && ./gradlew clean && cd ..

STEP 1 — FCM Token management (src/services/notificationService.ts):

async function initNotifications():
  1. Request notification permission (Android 13+)
  2. Get FCM token: messaging().getToken()
  3. Save token to fcm_tokens table in Supabase with user_id + platform
  4. Listen for token refresh: messaging().onTokenRefresh → update Supabase
  5. Set up foreground message handler: messaging().onMessage()
     → show in-app notification banner (custom component, not system notification)
  6. Set up background/quit handler: messaging().setBackgroundMessageHandler()
     → handled automatically by FCM, shows system notification

STEP 2 — Send notifications via Supabase Edge Function:
Create /supabase/functions/send-notification/index.ts

This function receives:
- user_id (to look up their FCM token from fcm_tokens table)
- title, body, type, order_id

It:
1. Fetches FCM token(s) for user_id from Supabase
2. Sends FCM notification via Firebase Admin SDK
3. Saves notification record to notifications table

Deploy: supabase functions deploy send-notification

STEP 3 — Trigger notifications at these events:

ORDER PLACED → notify restaurant owner:
  Title: "New Order! 🛵"
  Body: "Order #[id] — ₹[total] from [customer name]"
  Call send-notification for restaurant owner's user_id

ORDER CONFIRMED by restaurant → notify customer:
  Title: "Order Confirmed!"
  Body: "[Restaurant name] has accepted your order"

RIDER ASSIGNED → notify customer:
  Title: "Rider on the way!"  
  Body: "[Rider name] is heading to pick up your order"

ORDER PICKED UP → notify customer:
  Title: "Your food is on the way!"
  Body: "Estimated delivery in [X] minutes"

ORDER DELIVERED → notify customer:
  Title: "Order Delivered!"
  Body: "Enjoy your meal! Rate your experience."

ORDER CANCELLED → notify customer:
  Title: "Order Cancelled"
  Body: "Your order was cancelled. [reason if available]. Refund initiated if paid."

NEW DELIVERY REQUEST → notify rider:
  Title: "New Delivery Request"
  Body: "[Restaurant] → [Customer area] — ₹[earnings]"

STEP 4 — In-app notification center:

Add bell icon to customer HomeScreen header with unread count badge.

Notifications Screen (src/screens/notifications/index.tsx):
- FlatList of notifications from notifications table
- Unread: slightly highlighted background
- Tap notification → navigate to relevant order
- "Mark all as read" button
- Real-time new notifications via Supabase Realtime subscription on notifications table

STEP 5 — Notification permissions UX:
Do NOT ask for permission on app launch.
Ask after user places FIRST order successfully:
"Get notified when your order is confirmed and on the way?"
[Allow] [Maybe later]

If user taps "Maybe later" — ask again after their second order.


Phase 8: UI Polish — apply production-quality visual design across ALL screens for all 3 user types (customer, restaurant owner, rider). This phase runs AFTER all features are complete and working. Do NOT change any business logic — only improve visual quality, consistency, animations, and empty/loading/error states.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESIGN SYSTEM — enforce on every single screen
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

File: src/theme/colors.ts
export const Colors = {
  PRIMARY: '#E23744',
  PRIMARY_LIGHT: '#FFEAEC',
  PRIMARY_DARK: '#B02030',
  SUCCESS: '#1BA672',
  SUCCESS_LIGHT: '#E8F8F2',
  WARNING: '#FF8C00',
  WARNING_LIGHT: '#FFF4E5',
  ERROR: '#E23744',
  ERROR_LIGHT: '#FFEAEC',
  INFO: '#2D6BE4',
  INFO_LIGHT: '#EBF1FD',
  TEXT_PRIMARY: '#1C1C1C',
  TEXT_SECONDARY: '#696969',
  TEXT_TERTIARY: '#9E9E9E',
  TEXT_INVERSE: '#FFFFFF',
  BG_PRIMARY: '#FFFFFF',
  BG_SECONDARY: '#F5F5F5',
  BG_TERTIARY: '#EDEDED',
  BORDER: '#E8E8E8',
  BORDER_DARK: '#D0D0D0',
  STAR: '#F5A623',
  VEG: '#1BA672',
  NON_VEG: '#E23744',
  OVERLAY: 'rgba(0,0,0,0.5)',
  SHADOW: 'rgba(0,0,0,0.08)',
}

File: src/theme/typography.ts
export const Typography = {
  h1: { fontSize: 24, fontWeight: '700', color: Colors.TEXT_PRIMARY },
  h2: { fontSize: 20, fontWeight: '600', color: Colors.TEXT_PRIMARY },
  h3: { fontSize: 18, fontWeight: '600', color: Colors.TEXT_PRIMARY },
  h4: { fontSize: 16, fontWeight: '600', color: Colors.TEXT_PRIMARY },
  body1: { fontSize: 15, fontWeight: '400', color: Colors.TEXT_PRIMARY },
  body2: { fontSize: 14, fontWeight: '400', color: Colors.TEXT_SECONDARY },
  caption: { fontSize: 12, fontWeight: '400', color: Colors.TEXT_TERTIARY },
  label: { fontSize: 13, fontWeight: '500', color: Colors.TEXT_PRIMARY },
  price: { fontSize: 15, fontWeight: '700', color: Colors.TEXT_PRIMARY },
}

File: src/theme/spacing.ts
export const Spacing = { xs:4, sm:8, md:16, lg:24, xl:32, xxl:48 }
export const Radius = { sm:6, md:10, lg:14, xl:20, full:999 }
export const Shadow = {
  sm: { shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:4, elevation:2 },
  md: { shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.08, shadowRadius:8, elevation:4 },
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GLOBAL COMPONENTS — build or upgrade these first
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. src/components/Toast/index.tsx
   - Slides in from bottom, 3 variants: success (green), error (red), info (blue)
   - Auto-dismiss after 3 seconds
   - Icon on left (checkmark/x/info), message text, optional action button
   - Used everywhere — replace ALL Alert.alert() calls for non-critical messages

2. src/components/SkeletonLoader/index.tsx
   - Animated shimmer using Animated.loop (opacity 0.3 → 0.8, 800ms loop)
   - Variants: SkeletonBox (any size), SkeletonText (full-width line), SkeletonCircle
   - Used to build screen-specific skeletons below

3. src/components/EmptyState/index.tsx
   Props: illustration (one of: 'empty-cart'|'no-orders'|'no-restaurants'|'no-results'|'no-notifications'), title, subtitle, buttonText?, onButtonPress?
   - Simple SVG illustration (build 5 minimal illustrations using react-native-svg)
   - Title 18px/600, subtitle 14px gray, button in PRIMARY_RED

4. src/components/Badge/index.tsx
   Props: label, variant ('success'|'warning'|'error'|'info'|'gray')
   - Pill shape, 11px font, colored background from theme
   - Used for order status, veg/non-veg, payment status everywhere

5. src/components/BottomSheet/index.tsx
   - Animated slide up from bottom using Animated.spring
   - Backdrop overlay that dismisses on tap
   - Handle bar at top
   - Used for: filters, sort options, rejection reasons, payment methods

6. src/components/AppHeader/index.tsx
   Props: title, showBack?, rightComponent?, onBack?
   - Consistent header across all 3 user types
   - Back arrow uses react-navigation goBack()
   - Title centered, 17px/600

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SKELETON SCREENS — replace every spinner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Build skeleton versions for these screens:
- HomeScreenSkeleton: banner rect + 4 category circles + 3 restaurant card rects
- RestaurantDetailSkeleton: header image rect + 3 category tabs + 4 menu item rows
- OrdersScreenSkeleton: 3 order card rects with varying widths
- OwnerDashboardSkeleton: 4 stat card rects + 3 order row rects
- RiderHomeSkeleton: toggle area + 3 stat cards + map placeholder rect

Rule: show skeleton for MINIMUM 500ms even if data loads faster (prevents flash)
Use: const [minDelayDone, setMinDelayDone] = useState(false)
     useEffect(() => { setTimeout(() => setMinDelayDone(true), 500) }, [])
     Show skeleton if: isLoading || !minDelayDone

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANIMATIONS — add these micro-interactions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Add to Cart button:
   - First tap: scale 0.92 → 1.0 with spring, button morphs from "ADD" to "- 1 +"
   - Quantity change: number animates with slide up/down

2. Online/Offline toggle (rider):
   - Color transitions smoothly green ↔ gray over 300ms
   - Ripple effect on press

3. Order status timeline:
   - When status changes: new step animates in with fade + slide from left
   - Active step pulses with opacity 0.6 → 1.0 loop

4. Tab bar:
   - Active tab icon scales 1.0 → 1.15 with spring on selection
   - Badge count animates in with scale bounce

5. Pull to refresh:
   - Default RN RefreshControl with PRIMARY_RED tintColor

6. Screen transitions:
   - All stack navigators: animation: 'slide_from_right'
   - Modal screens (cart, checkout): animation: 'slide_from_bottom'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ERROR STATES — handle every failure gracefully
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every screen that fetches data must handle:
1. Loading → show skeleton
2. Error → show inline error card with "Try again" button (NOT a full-screen error)
   Style: light red background, error icon, short message, retry button
3. Empty → show EmptyState component
4. No internet → show persistent banner at top: "No internet connection"
   Use @react-native-community/netinfo to detect connectivity
   Banner slides down when offline, slides up when back online

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AFTER all screens are polished:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do a full visual walkthrough of every screen in this order:
CUSTOMER: Splash → Login → Home → Restaurant Detail → Cart → Checkout → Order Tracking → Orders → Profile → Search → Notifications
OWNER: Dashboard → Orders (new/active/completed) → Order Detail → Menu Management → Profile
RIDER: Home (offline) → Home (online) → Incoming request → Active delivery → Earnings → History → Profile

For each screen report:
[ ] Spacing consistent (no elements touching screen edges without 16px padding)
[ ] Typography matches theme file (no hardcoded font sizes)
[ ] All colors from theme file (no hardcoded hex values inline)
[ ] Loading state handled with skeleton
[ ] Empty state handled with EmptyState component
[ ] Error state handled with retry option
[ ] No raw Alert.alert() for non-critical messages (use Toast)
[ ] All touchable elements have activeOpacity={0.7} or pressable feedback
[ ] Images have loading placeholder and error fallback

Fix every issue found before marking Phase 8 complete.
Then proceed to Phase 9 (final deploy).


CUSTOMER SCREENS POLISH:

HOME SCREEN:
- Banner carousel: add pagination dots below, auto-scroll every 4 seconds
- Category chips: active chip fills PRIMARY_RED with white text, inactive is gray border
- Restaurant cards: add subtle shadow (Shadow.sm), image has 12px top radius only
- "Veg only" filter toggle in header — green when active

RESTAURANT DETAIL SCREEN:
- Collapsible header: restaurant image shrinks as user scrolls, info fades in
- Sticky category tab bar: highlight active category tab with bottom border in PRIMARY_RED
- Menu item ADD button: outlined red button → fills red after tap showing "- 1 +"
- Veg/non-veg indicator: small square (not circle) filled green or red — Zomato style
- Item image: right-aligned 80x80 with 8px radius, show placeholder if no image
- "Customize" label below item name if item has variants (future feature hook)

CART SCREEN:
- Swipe-to-delete: red background revealed with trash icon on swipe left
- Item count badge on cart tab icon updates in real time as items added
- Price breakdown section: thin divider lines between each row
- "Proceed" button: fixed at bottom with white gradient fade above it

CHECKOUT SCREEN:
- Address card: map thumbnail on right showing pin on address location (80x80)
- Payment method: each option in its own card with radio button on right
- Selected payment card: PRIMARY_RED border, light red background
- COD badge: "Pay on delivery" in gray pill
- Place Order button: full width, PRIMARY_RED, 52px height, 14px radius

ORDER TRACKING SCREEN:
- Map: 55% of screen height
- Status timeline: left-side vertical line connecting all steps
  Completed steps: filled red circle + red line
  Current step: animated pulsing red circle
  Upcoming steps: empty gray circle + gray line
- Rider card at bottom: avatar circle with initials, name, star rating, phone call icon

PROFILE SCREEN:
- Avatar: 80px circle with PRIMARY_RED border, edit icon overlay at bottom right
- Menu items: each in a row with right arrow icon, grouped into sections with gray headers
- Section headers: 12px uppercase gray text, 8px top padding — Zomato style

SEARCH SCREEN:
- Search bar: auto-focused, shows cursor immediately on screen mount
- Recent searches: each with clock icon on left, X button on right to remove
- Results: show restaurant image thumbnail (40x40 circle) on left of each result row


RESTAURANT OWNER SCREENS POLISH:

DASHBOARD SCREEN:
- Header: restaurant name in bold, open/closed toggle on right
  Toggle ON: green pill "OPEN", Toggle OFF: gray pill "CLOSED"
  Toggle transition: smooth color animation 300ms
- Stat cards: 2x2 grid, each card with colored icon on top left
  Orders: blue icon, Revenue: green icon, Avg value: amber icon, Cancelled: red icon
- New order alert banner: slides down from top when new order arrives
  Red background, white text "New order received!", tap to go to Orders tab

OWNER ORDERS SCREEN:
- Tab bar: show count badge on "New" tab — red filled circle with white number
- New order card:
  Top border: 3px solid PRIMARY_RED (urgent visual indicator)
  Timer countdown: shows "Auto-cancels in 4:23" in red when under 5 min
  Accept button: full green, Reject button: outlined red
  Item list: compact — "2x Paneer Butter Masala, 1x Naan" style
- Active order card: amber left border (3px)
- Completed order card: green left border (3px), muted colors

ORDER DETAIL SCREEN (owner view):
- Items table: item name left, qty center, price right — clean table layout
- Customer address: tap opens Google Maps with customer location
- Total breakdown: same style as customer checkout screen for consistency
- Action button changes based on current status:
  confirmed → "Mark as Preparing" (amber)
  preparing → "Assign Rider" (blue) + "Ready for Pickup" (green)

MENU MANAGEMENT SCREEN:
- Categories: accordion style — tap category header to expand/collapse items
- Category header: bold name, item count badge, drag handle icon on right
- Item row: 
  Left: 60x60 image with 8px radius (gray placeholder if no image)
  Middle: name (bold), price (red), veg/non-veg dot
  Right: availability toggle switch (green when available)
- Add item FAB: floating red button (+) fixed at bottom right corner
- Edit item bottom sheet: slide up with all fields, image preview at top

OWNER PROFILE SCREEN:
- Restaurant images: horizontal scroll of uploaded photos, each 120x90 with delete X
- "Add Photo" card: dashed border, camera icon, same size as photos
- Opening hours: each day on its own row with toggle + time range
  Closed days: grayed out row, toggle off
- Save button: sticky at bottom, only enabled when changes are made


RIDER SCREENS POLISH:

RIDER HOME SCREEN (offline state):
- Big centered toggle: 80x80 circle button
  OFFLINE: dark gray with power icon
  ONLINE: PRIMARY_RED with pulse animation ring around it
- Status text below toggle: "You are offline" / "You are online — waiting for orders"
- Stats row: 3 cards — Deliveries, Earned ₹, Hours online
- Background map (greyed out when offline, full color when online)

RIDER HOME SCREEN (online — waiting):
- Map fills top 50% showing rider's current location with motorcycle marker
- Marker: custom red circle with motorcycle icon
- Location updates smoothly (interpolated animation between GPS points)
- "Waiting for orders" card at bottom with subtle loading shimmer

INCOMING DELIVERY REQUEST (modal):
- Slides up from bottom covering 70% of screen
- Backdrop: semi-transparent dark overlay
- TOP SECTION (red background):
  Large ₹ earnings amount (28px bold white)
  "Estimated earnings" label below
- MIDDLE SECTION (white):
  Restaurant → Customer route shown as:
  [Restaurant icon] ——2.3km—— [Customer icon]
  Restaurant name and area
  Customer area name
  Estimated time
- BOTTOM SECTION:
  Countdown timer bar: red progress bar depleting from full → empty in 30s
  "00:24 seconds to respond" below bar
  ACCEPT button (full width, green, 52px)
  DECLINE text button (small, gray, below accept)

ACTIVE DELIVERY SCREEN:
- Map: 60% of screen, shows route with dashed polyline
- Current step card (bottom 40%):
  Step indicator: "Step 1 of 2" with dot indicators
  Step 1: Red header "Go to Restaurant", restaurant name + address below
  Step 2: Green header "Deliver to Customer", customer name + address below
  Distance remaining: "1.2 km away"
  Primary action button: full width, changes per step

RIDER EARNINGS SCREEN:
- Period tabs: Today / This Week / This Month
- Hero number: large centered earnings amount (32px bold)
- Bar chart (last 7 days):
  Bars: PRIMARY_RED filled, rounded top corners
  Today's bar: slightly darker shade
  Y-axis: ₹ amounts, X-axis: day names (Mon, Tue...)
  Built with react-native-svg — no library needed
- Delivery list rows: clean with subtle dividers, amount in green on right

RIDER PROFILE SCREEN:
- Status banner at top:
  Verified: green banner "Verified Rider"
  Pending: amber banner "Verification pending — 1-2 days"
- Rating display: large stars row (5 stars) with number and "based on X deliveries"
- Vehicle card: styled differently from other list rows — card with border
  Shows vehicle type icon + number plate style display for vehicle number


DESIGN SYSTEM RULES — non-negotiable, apply to every screen:

SPACING RULE:
- Screen edge padding: ALWAYS 16px horizontal (never less)
- Between sections: 24px vertical gap
- Between cards: 12px gap
- Inside cards: 16px padding
- Between icon and text: 8px
- Never use margin/padding values not in Spacing constant

TYPOGRAPHY RULE:
- Never hardcode fontSize anywhere — always use Typography constant
- Never use fontWeight as a number (use '400', '600', '700' as strings)
- Line height: set explicitly — body text 1.5x font size, headings 1.3x

COLOR RULE:
- Zero hardcoded hex values anywhere in styles
- Every color must come from Colors constant
- Dark overlay: always Colors.OVERLAY
- Disabled state: always Colors.TEXT_TERTIARY for text, Colors.BG_TERTIARY for bg

TOUCHABLE RULE:
- Every pressable element uses TouchableOpacity with activeOpacity={0.7}
- Minimum touch target size: 44x44px (even if visual is smaller — add padding)
- Buttons: never disable without showing WHY (gray + tooltip or inline message)

IMAGE RULE:
- Every Image component must have:
  defaultSource={require('../assets/images/placeholder.png')}
  onError to show placeholder on broken URL
  explicit width and height (never rely on intrinsic size)
  resizeMode='cover' for restaurant/food images

LIST PERFORMANCE RULE:
- Every FlatList must have:
  keyExtractor={(item) => item.id}
  removeClippedSubviews={true}
  windowSize={5}
  initialNumToRender={8}
  maxToRenderPerBatch={10}
- Never use ScrollView for lists longer than 10 items — always FlatList

BOTTOM TAB BAR:
- All 3 user types get consistent tab bar style:
  Active: icon + label both in PRIMARY_RED
  Inactive: icon + label both in TEXT_TERTIARY
  Tab bar background: white with top border 0.5px BORDER color
  Height: 60px
  Icon size: 22px

SPLASH SCREEN:
Polish the existing splash screen:
- FoodieGo logo centered (use text logo if no image asset)
- PRIMARY_RED background
- White logo/text
- Smooth fade transition to first screen after 1.5s
- Check auth state during splash — navigate to correct screen silently

APP ICON:
Create a simple app icon if not exists:
- 1024x1024 canvas
- PRIMARY_RED background
- White fork+spoon icon or letter "F" in clean bold font
- Use Android Studio Image Asset tool to generate all required sizes


PHASE 8 COMPLETION CHECKLIST

Run through every item. Fix anything that fails. Only proceed to Phase 9 when ALL boxes are checked.

━━ DESIGN SYSTEM ━━
[ ] src/theme/colors.ts exists, zero hardcoded hex values in any styles file
[ ] src/theme/typography.ts exists, zero hardcoded fontSizes anywhere
[ ] src/theme/spacing.ts exists, consistent spacing throughout
[ ] All shadows use Shadow.sm or Shadow.md constants

━━ GLOBAL COMPONENTS ━━
[ ] Toast component works — success, error, info variants all tested
[ ] SkeletonLoader shimmer animation smooth on a real device
[ ] EmptyState component used on: cart, orders, search, notifications
[ ] BottomSheet slides up and dismisses cleanly
[ ] AppHeader consistent on all screens
[ ] No internet banner appears/disappears correctly when wifi toggled

━━ CUSTOMER APP ━━
[ ] Splash screen → correct first screen (auth or home) with no flash
[ ] Home screen loads with skeleton then real data
[ ] Restaurant cards have shadow, correct spacing, veg/non-veg badges
[ ] Restaurant detail sticky category tabs work while scrolling
[ ] ADD button animates to quantity stepper correctly
[ ] Cart badge on tab bar updates in real time
[ ] Checkout payment method selection highlights correctly
[ ] Order tracking timeline animates when status changes
[ ] Pull to refresh works on: home, orders, restaurant list
[ ] Search results appear with debounce, no lag

━━ OWNER APP ━━
[ ] Dashboard stats load with skeleton
[ ] New order card has red top border and countdown timer
[ ] Accept/Reject buttons work and update order status in real time
[ ] Menu item availability toggle responds instantly
[ ] Add item bottom sheet opens, image picker works, saves to Supabase
[ ] Open/Closed toggle updates restaurant status immediately

━━ RIDER APP ━━
[ ] Online/Offline toggle has pulse animation when online
[ ] Map shows rider location updating smoothly
[ ] Incoming request modal slides up with countdown bar
[ ] Active delivery step transitions from restaurant to customer cleanly
[ ] Earnings bar chart renders correctly for all 7 days
[ ] Deliver confirmation updates order for customer in real time

━━ PERFORMANCE ━━
[ ] No FlatList uses ScrollView underneath
[ ] All images have placeholder and error fallback
[ ] App does not crash when internet is turned off and back on
[ ] No visible lag when switching between bottom tabs
[ ] tsc --noEmit shows zero TypeScript errors

━━ FINAL VISUAL CHECK ━━
[ ] Open app on a physical Android device (not emulator)
[ ] Walk through complete customer flow end to end — take screenshots of each screen
[ ] Walk through complete owner flow end to end
[ ] Walk through complete rider flow end to end
[ ] All 3 flows look polished enough to show to a real user

When ALL boxes above are checked → proceed to Phase 9 (deploy).


Phase 9: Final testing, build configuration, and free deployment. Make this app launchable.

STEP 1 — Fix all remaining TypeScript errors:
Run: npx tsc --noEmit
Fix every single error. Zero tolerance. Do not skip with @ts-ignore.

STEP 2 — Android release build configuration:
- Generate a release keystore if not exists:
  keytool -genkey -v -keystore android/app/foodiegos.keystore -alias foodiego -keyalg RSA -keysize 2048 -validity 10000
- Add keystore config to android/app/build.gradle signingConfigs
- Add to .env: KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD
- Add these .env keys to .gitignore
- Set versionCode and versionName in android/app/build.gradle
- Enable ProGuard (minifyEnabled true for release)
- Enable Hermes engine (already default in RN 0.84)

STEP 3 — Performance audit and fixes:
- Every FlatList must have: keyExtractor, getItemLayout if fixed height, windowSize={5}, removeClippedSubviews={true}
- Every image must have: explicit width+height, resizeMode, defaultSource for loading state
- No anonymous arrow functions as FlatList renderItem — extract to named component
- Wrap all expensive computations in useMemo
- Wrap all callbacks passed as props in useCallback

STEP 4 — Error boundaries:
Create src/components/ErrorBoundary/index.tsx:
- Class component wrapping entire app
- Shows friendly "Something went wrong" screen with retry button
- Logs error to console in DEV, would send to crash reporting in prod

STEP 5 — Environment configuration:
Create three .env files:
.env.development — DEV Supabase project URL + anon key
.env.staging — staging Supabase project  
.env.production — production Supabase project

STEP 6 — Build release APK:
cd android && ./gradlew assembleRelease
APK location: android/app/build/outputs/apk/release/app-release.apk

STEP 7 — Free deployment options:

Option A — Direct APK (fastest, free forever):
Share app-release.apk directly. Users install via "Install from unknown sources".
Good for: beta testing, friends and family

Option B — Google Play (recommended, one-time $25):
- Create Google Play Console account ($25 one-time)
- Upload AAB: ./gradlew bundleRelease
- Fill store listing: description, screenshots (take from running app), icon (1024x1024)
- Set up internal testing track first → then production

Option C — Expo EAS (free tier available):
Only viable if you migrate to Expo managed workflow (not recommended at this stage)

STEP 8 — README.md (create in project root):
# FoodieGoApp
## Prerequisites: Node 20 LTS, Java 17, Android Studio
## Setup: clone → npm install → add .env → npx react-native run-android
## Architecture: React Native 0.84 + Supabase + Zustand + React Navigation
## Folder structure: (list it)
## Available scripts: (list all from package.json)
## Environment variables: (list all from .env.example)

FINAL CHECKLIST before declaring done:
[ ] tsc --noEmit shows zero errors
[ ] App runs on physical Android device via USB
[ ] Auth flow works end to end (phone OTP login)
[ ] Can browse restaurants and view menu
[ ] Can add to cart from 2 different restaurants (conflict dialog shows)
[ ] Can place a COD order
[ ] Order appears in Orders tab
[ ] Real-time status update works via Supabase Realtime
[ ] Map shows on OrderTrackingScreen
[ ] Profile edit works
[ ] Release APK builds without errors
[ ] No console.log statements in production code
[ ] .env is in .gitignore and NOT committed

When all checkboxes pass, the app is production-ready.
