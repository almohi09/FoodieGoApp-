# Feature Access and Verification Guide

## 1) Start the app

```bash
npm install
npm run start:wifi
npm run android
```

If using USB debugging instead of WiFi:

```bash
npm run start
npm run android
```

## 2) Customer flow verification

1. Open app -> Splash -> Onboarding -> Login options.
2. Use customer phone flow:
   - `PhoneEntry` -> `OTPVerify` -> `UserRegister` (if new user).
3. Land on `MainTabs` and verify:
   - Home restaurant listing loads.
   - Restaurant detail loads menu.
   - Add item to cart and open checkout.
4. In checkout verify:
   - Delivery info fetch.
   - Quote generation.
   - Coupon apply/remove.
   - Place order returns `orderId`.
5. Verify order tracking:
   - Open tracking screen from order confirm.
   - Status updates appear (websocket/polling fallback).
6. Verify order history:
   - Orders tab shows active/history entries.

## 3) Seller flow verification

1. Login options -> Seller login/register.
2. Verify `SellerDashboard` loads:
   - Order stats
   - Pending queue
   - Low stock
   - Earnings cards

## 4) Admin flow verification

1. Login options -> Admin login.
2. Verify `AdminDashboard` loads:
   - Platform stats
   - Moderation queue snapshot
   - Alerts and user-control actions

## 5) Error and contract validation verification

1. Navigate to `ErrorCenter` (admin diagnostics screen).
2. Trigger a known malformed API payload in staging/mock backend.
3. Confirm an error record appears with source prefix:
   - `contract:<path>`

## 6) Minimum CI verification before merge

```bash
npm run lint
npm test -- --runInBand --watchAll=false --forceExit
npm run test:e2e:smoke
```

## 7) Device-level Detox verification (Android)

```bash
npm run build:e2e:detox:android
npm run test:e2e:detox
```

Expected smoke result:
- Onboarding screen opens
- Skip onboarding works
- Continue as guest works
- Home screen becomes visible
- Featured restaurant opens
- Menu item can be added to cart
- Checkout opens from cart
- Simulated order success reaches confirmation
- Tracking screen opens

## 8) Realtime resilience verification (manual on device)

1. Place an order and open tracking.
2. Toggle internet OFF for 20-30 seconds.
3. Turn internet ON again and keep tracking screen open.
4. Verify:
  - Tracking resumes without app restart.
  - Status does not jump backward.
  - ETA/location does not flicker with duplicate repeats.
  - If websocket fails, polling still updates status.

## 9) Payment reconciliation verification (manual on staging)

1. Place an order with UPI/Card in a staging account.
2. Force or simulate delayed gateway callback (pending state first, success later).
3. Verify checkout waits for reconciliation result before final success.
4. Verify:
   - `payment_success` event contains reconciliation attempts/source metadata.
   - Pending/timeout states show failure message instead of false success.
   - Successful late webhook update eventually confirms order flow.

## 10) Rate-limit and lockout UX verification (manual on staging)

1. Trigger OTP send and resend repeatedly until backend/local rate limits apply.
2. Trigger OTP verify with repeated invalid codes to activate cooldown.
3. Trigger repeated coupon apply attempts with invalid/abusive patterns.
4. Trigger repeated order placement attempts quickly.
5. Verify all flows show:
   - consistent lockout message format
   - retry-after/cooldown seconds
   - no generic/ambiguous error text for 429 or risk-block events
6. Verify seller/admin action lockout behavior:
   - rapid suspend/reactivate clicks
   - rapid payout action clicks (processing/paid/hold)
   - rapid seller order action clicks (accept/reject/ready)
7. Confirm action APIs return readable lockout text (with retry seconds when present).

## 11) Sensitive action audit-log verification (manual on device/staging)

1. Login as admin and perform:
   - suspend and reactivate at least one user
   - suspend and reactivate at least one seller
   - payout actions (`Proc`, `Paid`, `Hold`) on one payout
2. Open `AdminDashboard` and verify `Security Audit Logs` section:
   - new rows appear for each action
   - each row has action, target type/id and outcome (`SUCCESS`/`FAILURE`)
   - source label shows `remote` when backend audit endpoint is active, else `local`
3. Login as seller and perform:
   - store close/open toggle
   - one pending-order action (accept/reject/start prep/ready)
   - one stock quick action
4. Return to admin dashboard and verify seller events are visible in recent audit logs.

## 12) Dispatch queue and delivery-proof verification (manual on device/staging)

1. Login as admin and open `AdminDashboard`.
2. In `Dispatch Queue`:
   - choose an order in `ready_for_pickup` and tap `Assign`
   - verify rider name appears on the order row
3. Tap status progression actions in order:
   - `Mark Picked`
   - `Start Delivery`
   - `Mark Delivered`
4. On `Mark Delivered`, verify OTP proof popup appears and OTP is shown in the row.
5. Open `Security Audit Logs` and confirm dispatch actions are logged:
   - `dispatch_assign_rider`
   - `dispatch_picked_up`
   - `dispatch_out_for_delivery`
   - `dispatch_delivered`

Current known status:
- Lint: passes with warnings only (`SearchScreen.tsx` no-shadow warnings).
- Unit tests: passing.
- Jest smoke E2E: implemented and passing.
- Detox Android emulator smoke: implemented (onboarding->guest->home->restaurant->cart->checkout->confirm->tracking).
