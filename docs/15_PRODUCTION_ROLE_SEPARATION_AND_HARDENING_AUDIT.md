# Production Role Separation and Hardening Audit

Date: April 8, 2026

## Goal

Move the app from mixed-role demo behavior to production-safe behavior where customer users do not see internal admin/seller/rider surfaces.

## Implemented in this pass

1. Customer-facing role separation in UI
- `LoginOptionsScreen` no longer exposes seller/admin/rider portals by default.
- Internal role portals are now controlled by `ENABLE_INTERNAL_ROLE_PORTALS` (default `false`).

2. Customer profile cleanup
- Removed default customer exposure to seller/rider/admin navigation.
- Removed hardcoded profile fallback values for phone and stats.
- Customer stats now derive from user state (`foodieCoins`, `streak`, `isFoodiePass`).

3. OTP backend stability hardening
- OTP send/resend failures no longer crash backend process.
- Backend now returns structured API error on provider failure.

4. Production OTP provider extension
- Added `OTP_PROVIDER=twilio` support in backend env and provider service.

## Current production behavior targets

1. Customer app mode (default)
- Visible: customer auth, restaurant browsing, cart, checkout, orders, profile.
- Hidden: seller/admin/rider login cards and dashboard entry points.

2. Internal mode (explicit only)
- Enabled only when `ENABLE_INTERNAL_ROLE_PORTALS=true`.
- Used for internal QA/operator builds.

## Remaining gaps to close

1. Role surface isolation (architecture)
- Keep customer app as primary mobile app.
- Move seller and rider to separate app targets (or separate builds).
- Move admin to web panel instead of mobile customer app.

2. Hardcoded/demo data hotspots still present
- Frontend mock data fallback:
  - `src/data/api/mockData.ts`
  - `src/data/api/restaurantService.ts`
  - `src/data/api/searchService.ts`
  - `src/data/api/enhancedSearchService.ts`
  - `src/presentation/screens/main/RewardsScreen.tsx`
- Demo OTP hints:
  - `src/presentation/screens/auth/OTPVerifyScreen.tsx`
  - `src/presentation/screens/rider/RiderOTPVerifyScreen.tsx`
- Seed/fallback identities:
  - `backend/src/store.ts`
  - `backend/prisma/seed.ts`
- Seller fallback restaurant ids:
  - `src/presentation/screens/seller/SellerDashboardScreen.tsx`
  - `src/presentation/screens/seller/SellerMenuScreen.tsx`
  - `src/presentation/screens/seller/SellerStoreHoursScreen.tsx`

3. Backend auth realism gap
- In in-memory fallback mode, seller/admin login currently accepts email with weak credential semantics.
- For production, enforce real password hash checks and role-scoped auth policies in all paths.

## Required removals for production release

1. Remove/disable guest mode for release builds if business policy requires login-first funnel.
2. Remove all demo OTP copy and bypass behaviors from non-dev environments.
3. Disable frontend mock fallbacks in production builds.
4. Remove seeded operational identities from production runtime paths.

## Recommended role-separated product structure (Zomato/Swiggy style)

1. Customer App (mobile)
- Auth: customer only.
- Features: discovery, cart, checkout, tracking, profile.
- No admin/seller/rider routes in bundle.

2. Seller App (mobile/web)
- Auth: seller only.
- Features: menu, inventory, orders, store status, payouts.

3. Rider App (mobile)
- Auth: rider only.
- Features: task queue, pickup/delivery actions, earnings, live location.

4. Admin Panel (web)
- Auth: admin only.
- Features: moderation, dispatch board, payouts, audit logs, SLA monitoring.

## Next implementation steps (priority)

1. Build-time role gating
- Introduce app flavors/targets: `customer`, `seller`, `rider`.
- Exclude unrelated routes/screens from each flavor.

2. Remove production mock fallbacks
- Add strict env flag `ALLOW_MOCK_FALLBACKS=false` in production.
- Enforce remote-only APIs in release builds.

3. Harden backend auth
- Ensure seller/admin credential verification is strict in all repository modes.
- Add integration tests for forbidden cross-role login paths.

4. UX quality pass
- Replace placeholder profile/support screens with real backend-backed data.
- Standardize loading/error/empty states.
- Improve typography, spacing, and action hierarchy across all primary customer flows.
