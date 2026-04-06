# Frontend Completion Checklist (25 KM Pilot)

Date: April 6, 2026

Purpose: define what remains on the mobile frontend to be considered "frontend-complete" for a small controlled launch area (~25 km).

## Scope Assumption

- This checklist is frontend-only.
- Backend implementation is a separate blocker and is documented in `docs/10_BACKEND_BUILD_REQUIREMENTS.md`.

## A) Auth and Session UX

1. OTP resend timer + cooldown countdown UI.
2. Clear lockout/risk-block messaging on auth screens.
3. Session-expired/re-auth flow from any deep screen.
4. Role-aware entry polish for customer/seller/admin.

## B) Address and 25 KM Serviceability UX

1. Address add/edit/select with landmark and delivery notes.
2. Serviceability check UI for 25 km boundary.
3. Explicit "out of service area" state with user guidance.
4. Delivery fee/ETA refresh on address change.

## C) Checkout and Payment UX Hardening

1. Final bill clarity (subtotal, tax, platform, packaging, delivery, discount).
2. Strong failure recovery UX:
   - payment failed
   - payment pending
   - order placement uncertain states.
3. App reopen recovery to active checkout/order state.
4. Support/help escalation entry from checkout failures.

## D) Tracking and Delivery Experience

1. Real map integration in tracking (replace placeholder block).
2. Rider contact actions wired (call/chat hooks).
3. Delivery proof visibility on customer side (OTP/photo/signature).
4. Graceful offline/reconnect states and stale-data indicators.

## E) Seller App UX Completion

1. Full menu CRUD screens (create/edit/delete, categories, images).
2. Store hours editor and temporary pause reasons.
3. Detailed order view with prep SLA indicators.
4. Seller payout history and status screens.

## F) Admin/Ops UX Completion

1. Dispatch board filters/search/sort and detail drill-down.
2. Moderation action screens (not alert-only interactions).
3. SLA breach investigation screens.
4. Audit-log search/filter/export UI.

## G) Rider Frontend (Critical Missing Surface)

1. Rider login and profile basics.
2. Assigned jobs list and task detail.
3. Status actions:
   - pickup confirmed
   - out for delivery
   - delivered.
4. Proof-capture flow and rider earnings summary.

## H) Reliability and Offline UX

1. Global network banner and retry patterns.
2. Action retry UI for all critical flows.
3. Local queue indicators for delayed actions.
4. Safe resume after app kill/restart.

## I) Observability in App

1. Sentry/Crashlytics SDK transport wired.
2. Release/build/environment metadata attached.
3. Trace/session context surfaced in error events.
4. Minimal diagnostics view for support operations.

## J) Frontend QA Exit Gates

1. Detox core journey:
   - customer order flow end-to-end.
2. Seller operational flow test coverage.
3. Admin operational flow test coverage.
4. Rider core flow test coverage.
5. Manual run on low/mid/high Android devices.

## Current Estimated Frontend Completion

- Frontend is approximately `70-80%` toward pilot-grade completeness.
- Biggest missing frontend blocks: rider app surface, real map/proof UX, and deeper seller/admin operational screens.

## Sequencing Recommendation

Do not finish frontend to 100% in isolation before backend exists.

Recommended sequence:
1. Build backend core first (auth, roles, orders, payments, dispatch).
2. In parallel, complete only frontend work that is backend-independent (UX polish, navigation/state resilience, test IDs, reusable components).
3. Finish backend-dependent frontend features after contracts are live in staging.

Rationale: most remaining high-value frontend work depends on real backend behavior (payments, dispatch, proofs, audits, SLA operations). Building those screens first causes rework.
