# Backend Readiness Status (April 7, 2026)

## Snapshot

- Backend implementation completeness: `~96%`
- Deployment readiness (free-tier target: Render + Supabase + Firebase OTP): `~82%`
- Release-gate status from this workspace on April 7, 2026: `passing`
- Production launch decision: `not ready yet` (staging validation still required)

## What Was Verified Today

Commands run on April 7, 2026:

1. `npm run build` -> pass
2. `npm run test:unit` -> pass (`19/19`)
3. `npm run test:contract` -> pass (`3/3`)
4. `npm run test:integration` -> pass (`5 pass`, `1 skipped` Postgres-only conflict test)
5. `npm run perf:smoke` -> pass (`p95=35ms`, `errorRate=0`)
6. `npm run security:check` -> pass (`0 vulnerabilities`)
7. `npm run release:gate:strict` -> pass
8. `npm run env:lint` -> pass (no duplicate keys in `.env` / `.env.example`)

## Implemented and Working

1. Backend runtime and module boundaries are in place (`auth/catalog/orders/payments/seller/admin`).
2. Prisma + Postgres persistence exists across major domains.
3. Session model supports refresh rotation and revocation.
4. Idempotency baseline exists for core mutating routes.
5. Webhook signature verification and reconciliation worker baseline exists.
6. Admin/seller operational flows are implemented.
7. Monitoring/alerts and operational drill scripts exist.
8. Free-tier stack profile docs are added:
   - `backend/docs/13_FREE_TIER_STACK_RENDER_SUPABASE_FIREBASE.md`
9. Supabase image URL resolution baseline is implemented for catalog responses.
10. Firebase OTP provider mode is implemented in backend (`OTP_PROVIDER=firebase`) with send/verify flow integration.
11. Supabase Storage signed upload endpoint is implemented:
    - `POST /api/v1/storage/signed-upload` (auth required)
    - content-type and path validation
    - role-based base-folder restrictions
    - max upload-size guard (`SUPABASE_UPLOAD_MAX_BYTES`)
    - scoped object path generation (`<role>/<userId>/<folder>/...`)
    - signed upload URL generation via Supabase service role key
12. Seller Menu CRUD endpoints implemented (April 7, 2026):
    - `POST /api/v1/seller/restaurants/:restaurantId/menu` - Create menu item
    - `PUT /api/v1/seller/restaurants/:restaurantId/menu/:itemId` - Update menu item
    - `DELETE /api/v1/seller/restaurants/:restaurantId/menu/:itemId` - Delete menu item
    - `POST /api/v1/seller/restaurants/:restaurantId/categories` - Create category
    - `PUT /api/v1/seller/restaurants/:restaurantId/categories/:categoryId` - Update category
    - `DELETE /api/v1/seller/restaurants/:restaurantId/categories/:categoryId` - Delete category
    - `PUT /api/v1/seller/restaurants/:restaurantId/categories/reorder` - Reorder categories
13. Seller Earnings endpoints implemented (April 7, 2026):
    - `GET /api/v1/seller/restaurants/:restaurantId/earnings/summary` - Earnings summary
    - `GET /api/v1/seller/restaurants/:restaurantId/earnings/chart` - Earnings chart
    - `GET /api/v1/seller/restaurants/:restaurantId/earnings/transactions` - Transaction history
    - `GET /api/v1/seller/restaurants/:restaurantId/payouts` - Payouts list
    - `POST /api/v1/seller/restaurants/:restaurantId/payouts` - Create payout request
    - `GET /api/v1/seller/restaurants/:restaurantId/bank-details` - Get bank details
    - `PUT /api/v1/seller/restaurants/:restaurantId/bank-details` - Update bank details
    - `POST /api/v1/seller/restaurants/:restaurantId/bank-details/verify` - Verify bank details
    - `GET /api/v1/seller/restaurants/:restaurantId/commission` - Commission breakdown
    - `GET /api/v1/seller/restaurants/:restaurantId/invoice` - Download invoice
14. Admin Dashboard Metrics endpoints implemented (April 7, 2026):
    - `GET /api/v1/admin/dashboard/order-metrics` - Order status breakdown
    - `GET /api/v1/admin/dashboard/sla-metrics` - SLA performance metrics
    - `GET /api/v1/admin/dashboard/revenue-chart` - Revenue over time
    - `GET /api/v1/admin/dashboard/orders-chart` - Orders over time
    - `GET /api/v1/admin/dashboard/user-growth` - User acquisition metrics
    - `GET /api/v1/admin/dashboard/retention` - Retention/churn metrics
    - `GET /api/v1/admin/dashboard/top-sellers` - Top performing sellers
    - `GET /api/v1/admin/dashboard/top-restaurants` - Top performing restaurants
15. Admin Reports endpoints implemented (April 7, 2026):
    - `GET /api/v1/admin/reports/delivery-delays` - Delivery delay report
    - `GET /api/v1/admin/reports/prep-time-breaches` - Prep time breach report
16. Admin Approvals endpoints implemented (April 7, 2026):
    - `GET /api/v1/admin/approvals` - List all pending approvals
    - `POST /api/v1/admin/approvals/:approvalId/approve` - Approve item
    - `POST /api/v1/admin/approvals/:approvalId/reject` - Reject approval
    - `POST /api/v1/admin/approvals/:approvalId/request-info` - Request more info
    - `GET /api/v1/admin/approvals/pending-sellers` - Pending seller registrations
    - `GET /api/v1/admin/approvals/pending-documents` - Pending document verifications

## Current Blockers (Must Fix Before Calling It Deploy-Ready)

1. Checklist gaps remain open (see `backend/docs/05_BACKEND_NO_COMPROMISE_CHECKLIST.md`), including:
   - full transactional coverage for critical writes,
   - rollback validation for migrations in staging,
   - production-grade secret-manager-only posture,
   - immutable delivery proof audit linkage completion,
   - full backend+app e2e gate pass.
2. Firebase OTP integration is implemented, but still not end-to-end validated in staging cutover:
   - provider mode exists in backend (`OTP_PROVIDER=firebase`),
   - production credentials + live failure-mode drill evidence are still pending.
3. Supabase Storage rollout is still partially incomplete:
   - URL resolution and signed upload flow are done,
   - bucket policy enforcement and staging validation evidence are pending.

Canonical 100% task list:

- `backend/docs/14_BACKEND_100_PERCENT_EXECUTION_CHECKLIST.md`

## Immediate Next Actions to Reach Deploy-Ready

1. Add and validate staging evidence for:
   - migration rollback,
   - release gate pass (`build + unit + contract + integration + perf + security`),
   - Render deploy verify with Supabase DB.
2. Complete storage/auth production wiring:
   - Supabase bucket/path policy enforcement + staging evidence for signed uploads,
   - Firebase OTP production credentials and failure-mode tests.

## Decision

As of April 7, 2026, backend is **not 100% deployment-ready**.  
It has strong implementation coverage, but release reproducibility and production cutover hardening are still incomplete.
