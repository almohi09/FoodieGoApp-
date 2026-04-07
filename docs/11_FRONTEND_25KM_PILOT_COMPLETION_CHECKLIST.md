# Frontend 25 KM Pilot Completion Checklist

Date: April 7, 2026

Purpose: Define what remains on the mobile frontend to be considered "frontend-complete" for a small controlled launch area (~25 km).

Status note (April 7, 2026 end-of-day):
- This checklist is historical baseline planning and is now superseded by:
  - `docs/06_FRONTEND_IMPLEMENTATION_STATUS.md` (current implementation status)
  - `docs/08_FEATURE_VERIFICATION_GUIDE.md` (latest verification results)
- Latest gate reruns in this workspace passed for lint, unit tests, smoke e2e, and backend release gate.

---

## A) Auth and Session UX

| Item                                               | Status  | Notes                                           |
| -------------------------------------------------- | ------- | ----------------------------------------------- |
| OTP resend timer + cooldown countdown UI           | ✅ DONE | In `OTPVerifyScreen.tsx`                        |
| Clear lockout/risk-block messaging on auth screens | ✅ DONE | `securityGuard.ts` wired, UI shows messages     |
| Session-expired/re-auth flow from any deep screen  | ✅ DONE | `httpClient.ts` 401 interceptor triggers logout |
| Role-aware entry polish for customer/seller/admin  | ✅ DONE | Separate login screens wired                    |

---

## B) Address and 25 KM Serviceability UX

| Item                                                     | Status     | Notes                                              |
| -------------------------------------------------------- | ---------- | -------------------------------------------------- |
| Address add/edit/select with landmark and delivery notes | ✅ DONE    | Address CRUD via `authService.ts`                  |
| Serviceability check UI for 25 km boundary               | ⚠️ PARTIAL | Basic address entry exists, 25km check placeholder |
| Explicit "out of service area" state with user guidance  | ⚠️ PARTIAL | Fallback states exist, UI not polished             |
| Delivery fee/ETA refresh on address change               | ✅ DONE    | `checkoutService.ts` has delivery info endpoint    |

---

## C) Checkout and Payment UX Hardening

| Item                                                                        | Status     | Notes                                                |
| --------------------------------------------------------------------------- | ---------- | ---------------------------------------------------- |
| Final bill clarity (subtotal, tax, platform, packaging, delivery, discount) | ⚠️ PARTIAL | Quote endpoint returns all fields, UI needs polish   |
| Strong failure recovery UX (payment failed/pending/uncertain)               | ✅ DONE    | `paymentReconciliationService.ts` handles pending    |
| App reopen recovery to active checkout/order state                          | ❌ TODO    | Not implemented yet                                  |
| Support/help escalation entry from checkout failures                        | ❌ TODO    | `supportService.ts` exists but not wired to checkout |

---

## D) Tracking and Delivery Experience

| Item                                                             | Status  | Notes                                                |
| ---------------------------------------------------------------- | ------- | ---------------------------------------------------- |
| Real map integration in tracking                                 | ❌ TODO | Placeholder block exists, map SDK not wired          |
| Rider contact actions wired (call/chat hooks)                    | ❌ TODO | Not implemented                                      |
| Delivery proof visibility on customer side (OTP/photo/signature) | ❌ TODO | Not implemented                                      |
| Graceful offline/reconnect states and stale-data indicators      | ❌ TODO | `trackingService.ts` has reconnect logic, UI missing |

---

## E) Seller App UX Completion

| Item                                                            | Status     | Notes                                                  |
| --------------------------------------------------------------- | ---------- | ------------------------------------------------------ |
| Full menu CRUD screens (create/edit/delete, categories, images) | ⚠️ PARTIAL | `sellerMenuService.ts` wired, CRUD screens not created |
| Store hours editor and temporary pause reasons                  | ⚠️ PARTIAL | `sellerRestaurantService.ts` has open/close only       |
| Detailed order view with prep SLA indicators                    | ❌ TODO    | Basic order list wired, detail view incomplete         |
| Seller payout history and status screens                        | ⚠️ PARTIAL | `sellerEarningsService.ts` wired, UI incomplete        |

---

## F) Admin/Ops UX Completion

| Item                                                     | Status     | Notes                                                   |
| -------------------------------------------------------- | ---------- | ------------------------------------------------------- |
| Dispatch board filters/search/sort and detail drill-down | ❌ TODO    | Basic board wired, filters not implemented              |
| Moderation action screens (not alert-only interactions)  | ⚠️ PARTIAL | `adminModerationService.ts` wired, action UI incomplete |
| SLA breach investigation screens                         | ❌ TODO    | Not implemented                                         |
| Audit-log search/filter/export UI                        | ❌ TODO    | Basic audit log section exists, search/filter missing   |

---

## G) Rider Frontend (Critical Missing Surface)

| Item                                                          | Status  | Notes       |
| ------------------------------------------------------------- | ------- | ----------- |
| Rider login and profile basics                                | ❌ TODO | Not started |
| Assigned jobs list and task detail                            | ❌ TODO | Not started |
| Status actions: pickup confirmed, out for delivery, delivered | ❌ TODO | Not started |
| Proof-capture flow and rider earnings summary                 | ❌ TODO | Not started |

---

## H) Reliability and Offline UX

| Item                                       | Status  | Notes           |
| ------------------------------------------ | ------- | --------------- |
| Global network banner and retry patterns   | ❌ TODO | Not implemented |
| Action retry UI for all critical flows     | ❌ TODO | Not implemented |
| Local queue indicators for delayed actions | ❌ TODO | Not implemented |
| Safe resume after app kill/restart         | ❌ TODO | Not implemented |

---

## I) Observability in App

| Item                                            | Status     | Notes                                           |
| ----------------------------------------------- | ---------- | ----------------------------------------------- |
| Sentry/Crashlytics SDK transport wired          | ❌ TODO    | Not implemented                                 |
| Release/build/environment metadata attached     | ⚠️ PARTIAL | Basic setup in `App.tsx`                        |
| Trace/session context surfaced in error events  | ✅ DONE    | `observabilityContext.ts` + `X-Trace-Id` header |
| Minimal diagnostics view for support operations | ❌ TODO    | Not implemented                                 |

---

## J) Frontend QA Exit Gates

| Item                                               | Status     | Notes                                            |
| -------------------------------------------------- | ---------- | ------------------------------------------------ |
| Detox core journey: customer order flow end-to-end | ⚠️ PARTIAL | Basic smoke test wired, full journey not covered |
| Seller operational flow test coverage              | ❌ TODO    | Not implemented                                  |
| Admin operational flow test coverage               | ❌ TODO    | Not implemented                                  |
| Rider core flow test coverage                      | ❌ TODO    | Not implemented                                  |
| Manual run on low/mid/high Android devices         | ❌ TODO    | Not done                                         |

---

## Pilot Readiness Summary

### ✅ COMPLETED (Pilot Ready)

- Core customer auth with OTP and rate-limit guards
- Restaurant browsing and menu viewing
- Cart and checkout flow with payment methods
- Order placement and tracking (placeholder map)
- Seller dashboard with order queue and actions
- Admin dashboard with user/seller/payout controls
- Payment reconciliation with retry logic
- Real-time tracking with WebSocket + polling fallback
- Audit logging for sensitive actions
- Dispatch board (admin-manual pilot mode)
- Network resilience with mock data fallbacks
- CI smoke test gate

### ❌ NOT READY (Pilot Blocker)

- **Rider app** - Critical missing surface
- **Real-time map integration** - Customer tracking UX incomplete
- **Offline queue + resume** - App kill recovery not implemented
- **Sentry/Crashlytics transport** - Crash reporting not wired

### ⚠️ PARTIAL (Acceptable for Pilot with Known Gaps)

- 25 km serviceability checks (basic address entry exists)
- Seller menu CRUD screens (basic actions wired)
- Admin moderation screens (actions wired, UI incomplete)
- Delivery proof visibility (admin dispatch works, customer view missing)
- Audit log search/filter (basic list exists)

---

## Current Estimated Frontend Completion

- **Overall: ~85-90% toward pilot-grade completeness**
- **Customer app: ~90%**
- **Seller app: ~80%**
- **Admin app: ~85%**
- **Rider app: ~0%**
- **Offline/Reliability: ~30%**
- **Observability: ~75%**

---

## Sequencing Recommendation

**Do not finish frontend to 100% in isolation before backend exists.**

Recommended sequence:

1. **Now**: Rider app core flow (pilot blocker)
2. **Now**: Real-time map integration (pilot UX requirement)
3. **Next**: Offline queue + Sentry transport (reliability baseline)
4. **Later**: Seller/Admin UI polish screens
5. **Later**: Full E2E test coverage

Rationale: Rider app and map integration are critical for the pilot experience. Everything else can be iterated post-launch.
