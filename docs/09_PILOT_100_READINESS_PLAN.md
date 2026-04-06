# Pilot 100% Readiness Plan (Small Controlled Launch)

Goal: move from current pilot readiness to fully operable pilot launch for customers, sellers, and delivery in one city/zone with manual support backup.

## Exit Criteria (Pilot = 100%)

1. Customer core journey stable in production:
   - login/register -> browse -> cart -> checkout -> payment -> tracking -> history
2. Seller can run daily operations:
   - menu updates, stock updates, open/close, accept/reject orders
3. Delivery operations functional:
   - rider assignment, status progression, tracking, proof-of-delivery
4. Payment lifecycle complete:
   - success/fail/retry/refund/reconciliation
5. Ops visibility + incident response live:
   - error/crash alerting, release diagnostics, runbooks, escalation contacts
6. Security + abuse controls active:
   - rate limits, fraud thresholds, key/secret handling

## Workstreams and Mandatory Deliverables

## A) Payments Go-Live
- Real gateway integration (no placeholder flows).
- Backend webhook signature verification and idempotent processing.
- Reconciliation job for pending/timeout transactions.
- Refund and cancellation settlement workflow.
- Daily payment vs orders mismatch dashboard/report.

## B) Delivery + Rider Operations
- Rider assignment flow (manual dispatch acceptable for pilot).
- Rider app/panel for pickup -> enroute -> delivered transitions.
- Delivery completion proof (OTP/photo/signature at least one).
- Live tracking reliability with reconnect/dedup/out-of-order handling.
- Rider payout export/report.

## C) Seller Operations
- Menu CRUD with image, pricing, availability toggle.
- Live stock control and item-level availability.
- Store open/close and working-hours management.
- Order queue actions: accept/reject/ready handoff.
- Seller earnings and payout visibility.

## D) Observability and Incident Baseline
- Crash/error sink integration (Sentry/Crashlytics).
- Release metadata on every error/event:
  - app version, build type, environment, device id, trace id.
- Alert rules for checkout/payment/tracking failures.
- Pilot on-call runbook:
  - triage, rollback, communication, postmortem template.

## E) Security and Abuse Controls
- OTP/login/coupon/payment rate limits enforced server-side.
- Suspicious activity signals (device velocity, coupon abuse, payment anomalies).
- Secret manager for CI/CD and environment keys.
- Admin audit logs for sensitive actions (suspension/refund/manual override).

## F) QA and Release Gates
- CI blocking gates:
  - lint, unit tests, smoke e2e, detox journey.
- Staging parity with production integrations.
- Device matrix sanity pass (at least low/mid/high Android).
- Rollback plan validated at least once before pilot launch.

## Suggested Execution Order (High ROI)
1. Observability baseline + release diagnostics.
2. Payment go-live and reconciliation.
3. Seller order action queue + inventory/open-close.
4. Delivery dispatch + rider status flow.
5. Security/abuse controls and runbooks.

## Immediate Next Step (Before Further Feature Work)
- Start backend implementation (blocking dependency):
  - create backend repository and environment setup.
  - implement auth + role model + seed accounts (customer/seller/admin/rider).
  - expose stable contract endpoints required by current app service layer.
- Verification scope:
  - app can successfully login for all roles against local/staging backend.

## Current Status vs Pilot 100
- Strong frontend app foundation exists (auth/cart/checkout/tracking/admin/seller base).
- Backend platform is not implemented in this repository and is the main blocker to pilot 100%.
- Still pending: backend auth, order/payment/dispatch services, production incident/security controls, and full infra readiness.
- Frontend remaining gap details are tracked in `docs/11_FRONTEND_25KM_PILOT_COMPLETION_CHECKLIST.md`.
