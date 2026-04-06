# Next Steps to Reach Zomato/Swiggy-Grade Production

## Critical clarification (April 6, 2026)

- This repo now includes an in-repo backend at `backend/`.
- Backend services are partially implemented (Express modules + Prisma migration/seed foundation), but are still the primary blocker for true production readiness.
- Backend requirements are defined in `docs/10_BACKEND_BUILD_REQUIREMENTS.md` and detailed execution is tracked in `backend/docs/00_BACKEND_INDEX.md`.
- Frontend completion checklist for 25 km pilot is in `docs/11_FRONTEND_25KM_PILOT_COMPLETION_CHECKLIST.md`.

## Current verification snapshot

- Lint: pass (0 errors, warnings remain in `SearchScreen.tsx` naming style only).
- Tests: pass (`3/3` suites).

## Priority roadmap (execution order)

## 1) Build backend foundation (new top priority)

- Continue backend runtime architecture evolution (service/API layer, DB schema, env strategy).
- Implement auth role model and core identity APIs first.
- Add database migrations and deterministic seed scripts for customer/seller/admin/rider.
- Publish environment setup for local/staging/prod.

## 2) Lock backend contracts

- Publish OpenAPI spec for all critical endpoints:
  - auth, addresses, restaurant/menu, checkout quote/place-order, payments, orders, tracking.
- Add response/request runtime validation in app services.
- Add strict API versioning rules and deprecation policy.

## 3) Add end-to-end test gates

- Add Detox/Appium smoke suite for:
  - login -> browse -> cart -> checkout -> payment -> tracking -> order history.
- Add CI gate to block merge on failing E2E smoke.
- Add staging test data seed scripts for deterministic runs.

## 4) Complete payment production flow

- Integrate real payment gateway SDK/hosted checkout.
- Remove placeholder fallback assumptions from app payment flow.
- Make payment status source-of-truth webhook-driven on backend.
- Add retries + reconciliation for pending/timeout states.

## 5) Harden realtime delivery experience

- Add websocket reconnect/backoff policy.
- Add message deduplication and out-of-order event handling.
- Add offline queue + resume synchronization.
- Complete production push setup (FCM/APNS) with token lifecycle.

## 6) Complete seller/admin operation screens

- Seller:
  - menu CRUD, stock updates, open/close + hours editor, order action queue.
- Admin:
  - moderation queue actions, SLA breach drill-down, user/seller suspension workflows, payouts monitoring.
- Replace alert placeholders with dedicated screens and server mutations.

## 7) Production observability and SLOs

- Add Sentry/Crashlytics and release/source-map uploads.
- Add structured logs + trace IDs for request correlation.
- Define and monitor SLOs:
  - checkout success,
  - payment success,
  - order confirmation latency,
  - tracking freshness,
  - crash-free sessions.

## 8) Security/compliance and abuse controls

- Enforce refresh-token rotation and server revocation.
- Add login/OTP/coupon/payment rate limits.
- Add fraud/risk thresholds and automated block/review routing.
- Wire secrets management for CI/CD and build flavors.
- Run periodic security checks (dependency audit + mobile hardening checklist).

## 9) Growth engine completion

- Establish event taxonomy and funnel dashboards.
- Use A/B flags for checkout, ranking, and promo experiments.
- Improve recommendation ranking (context + recency + personalization feedback loop).
- Expand caching/offline behavior for degraded network reliability.

## Suggested immediate sprint plan (next 2 sprints)

- Sprint A:
  - backend repo setup + auth/user/address + seed scripts + OpenAPI bootstrap.
- Sprint B:
  - order/payment/tracking backend slice + app integration + E2E business flow.

## Immediate next implementation (current)

- Backend-first execution:
  - close backend no-compromise gaps before backend-dependent frontend work.
  - run backend release gates in this order: unit -> contract -> integration -> perf -> security.
  - finish remaining backend blockers (transactionality, secret manager, refund/dispatch integrity, production cutover evidence).
- Parallel frontend (safe to do now):
  - UX hardening and role/session flows from `docs/11_FRONTEND_25KM_PILOT_COMPLETION_CHECKLIST.md`.

## Pilot 100% launch plan

- Detailed pilot-launch readiness checklist and execution order:
  - `docs/09_PILOT_100_READINESS_PLAN.md`
