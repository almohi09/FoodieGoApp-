# Backend Architecture

Date: April 6, 2026

## Runtime

- Language: TypeScript (Node.js 22 LTS target).
- Server: Express.
- Module format: ESM (`NodeNext`).
- API base prefix: `/api/v1`.

## File Ownership (No Mixed Concerns)

- Server bootstrap:
  - `backend/src/server.ts`
- HTTP app setup:
  - `backend/src/app.ts`
- Environment config:
  - `backend/src/config/env.ts`
- Shared middleware:
  - `backend/src/middleware/auth.ts`
- Shared backend helpers:
  - `backend/src/lib/core.ts`
- Database integration layer:
  - `backend/src/db/prismaClient.ts`
  - `backend/src/db/repositories/*`
- Domain store (temporary, in-memory):
  - `backend/src/store.ts`
- Route modules:
  - Auth + addresses: `backend/src/modules/auth/routes.ts`
  - Catalog/restaurants: `backend/src/modules/catalog/routes.ts`
  - Checkout + orders: `backend/src/modules/orders/routes.ts`
  - Payments: `backend/src/modules/payments/routes.ts`
  - Seller operations: `backend/src/modules/seller/routes.ts`
  - Admin operations: `backend/src/modules/admin/routes.ts`

## Current Data Layer

- In-memory state only.
- Seeded entities for customer, sellers, admin, restaurants, menu, payouts, dispatch.
- This is acceptable only for contract integration and local testing.

## Transitional DB Layer (Started)

- Prisma schema added: `backend/prisma/schema.prisma`
- Seed script added: `backend/prisma/seed.ts`
- Postgres-enabled repositories are wired for:
  - auth user/address
  - catalog restaurants/menu
- Runtime switch:
  - `USE_POSTGRES=true` enables repository path.
  - fallback remains in-memory for endpoints not yet migrated.

## Target Production Architecture (Zomato/Swiggy Grade)

- API gateway + auth service + order service + payment service + dispatch service + admin service.
- PostgreSQL (primary transactional DB) + Redis (cache, session, queue buffering).
- Event streaming for order/payment/dispatch lifecycle.
- Worker tier for reconciliation, payouts, notifications, fraud checks.
- Multi-environment deployment with blue/green or canary rollout.
