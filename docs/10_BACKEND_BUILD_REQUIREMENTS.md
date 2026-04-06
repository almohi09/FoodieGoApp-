# Backend Build Requirements (Blocking for Production)

Date: April 6, 2026

This repository (`FoodieGoApp`) includes:
- React Native frontend application.
- In-repo backend implementation under `backend/` (Express + TypeScript + Prisma foundation).

Current backend state is transitional:
- API modules exist for auth/catalog/orders/payments/seller/admin.
- Prisma schema, migration, and seed scripts are implemented.
- Postgres-backed repositories are active for selected domains (auth/catalog).
- Several flows still use in-memory fallback and are not production-safe yet.

## Current Truth

1. Frontend app is implemented with strong pilot foundations (customer flow, seller/admin dashboards, tracking resilience, reconciliation logic, audit/dispatch UI flows).
2. App service layer expects backend APIs under `/auth`, `/orders`, `/payments`, `/tracking`, `/seller/*`, `/admin/*`.
3. Backend service is now present and runnable in this repo, but real production launch is blocked until backend is fully hardened and all critical data flows are persistence-first.

## What Is Already Implemented (Frontend)

1. Auth screens and role entry flows (customer/seller/admin).
2. Customer browse -> cart -> checkout -> tracking UI flow.
3. Seller operations dashboard actions (store status, queue actions, stock actions).
4. Admin operations dashboard actions (user/seller controls, payouts, dispatch queue, audit view).
5. Reliability foundation: shared HTTP client, API validation, rate-limit parsing, telemetry context, CI gates, smoke E2E.

## Mandatory Backend to Build Next

1. Identity and Access
   - OTP send/verify with provider integration.
   - Role-aware auth (`customer`, `seller`, `admin`, `rider`).
   - Token issuance, rotation, revocation, device/session management.
2. Data Model and Domain Services
   - Users, addresses, sellers, restaurants, menus, inventory, orders, riders, payouts.
   - Order state machine with strict transition rules and idempotency.
3. Payments
   - Real gateway integration.
   - Webhook verification + idempotent state updates.
   - Reconciliation workers and refunds.
4. Dispatch and Delivery
   - Rider onboarding and assignment.
   - Rider status transitions and GPS events.
   - Delivery proof capture (OTP/photo/signature).
5. Admin/Seller Operations APIs
   - Moderation, suspension/reactivation, payout actions, audit logs.
   - Seller menu/stock/hours/order actions.
6. Observability and Security
   - Crash/log/trace pipelines.
   - Abuse controls (server-side rate limits and risk rules).
   - Secrets management, RBAC, audit trails, compliance retention.

## Production Readiness Gap

Approximate readiness snapshot:
- Frontend product readiness: `70-80%` for pilot UX.
- End-to-end production readiness (including backend): `25-35%`.
- Until backend is built and validated, deployment to real users is not production-safe.

## Definition of 100% Production-Ready (Deployable)

All must be true:
1. Backend APIs implemented and contract-matched for all critical flows.
2. Staging and production environments operational with monitoring and alerts.
3. Payment and dispatch flows proven on live-like traffic.
4. Security controls validated (auth hardening, rate limits, audit logs, incident response).
5. Release gates passing: lint + unit + E2E + device matrix + rollback drill.

## Execution Plan (After Backend Repo Is Created)

1. Continue backend architecture baseline already started in `backend/`.
2. Implement auth + user/address + seller onboarding domain.
3. Implement restaurant/menu/inventory + order lifecycle.
4. Implement payment gateway + webhooks + reconciliation.
5. Implement dispatch/rider service + proof of delivery.
6. Implement admin/seller operations + immutable audit logs.
7. Integrate observability/security + load tests + go-live checklist.
