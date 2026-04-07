# Backend Next Implementations Tracker

Date: April 7, 2026

Purpose: keep a persistent, ordered backend implementation queue so execution does not lose track between sessions.

Status legend:
- `[in-progress]` actively being implemented now.
- `[next]` highest-priority upcoming item.
- `[planned]` approved and sequenced, not started yet.
- `[done]` implemented and verified.

## Queue (Priority Order)

1. `[done]` Release-gate determinism and env isolation
   - Decoupled integration tests from local `backend/.env` external endpoints.
   - Added explicit test env bootstrap in integration/perf scripts to avoid external dependency drift.
   - Verified local strict release gate pass:
     - `npm run release:gate:strict`
   - Remaining env hygiene follow-up (duplicate local `.env` key cleanup) moved to next priority item.

2. `[done]` Env hygiene cleanup and deployment contract lock
   - Remove duplicate keys from local env examples/runtime templates.
   - Pin single-source env contract for local/staging/prod.
   - Added `npm run env:lint` duplicate-key gate for `.env` and `.env.example`.

3. `[in-progress]` Render + Supabase + Firebase OTP production cutover
   - Validate Render staging deploy with Supabase Postgres connectivity.
   - Complete Supabase Storage bucket policy and staging signed-upload validation evidence.
   - Complete Firebase OTP hardening and failure-mode tests in staging.
   - Signed-upload backend hardening pass completed:
     - role-based folder access checks
     - max upload-size guard
     - env-configurable folder/mime constraints
   - Canonical 100% remaining-task checklist published:
     - `backend/docs/14_BACKEND_100_PERCENT_EXECUTION_CHECKLIST.md`

4. `[done]` Session persistence + refresh token rotation/revocation
   - Add Prisma `UserSession` model.
   - Add DB-backed session repository.
   - Use DB session validation in `requireAuth` for Postgres mode.
   - Rotate refresh tokens server-side and revoke old sessions.
   - Verify flow: verify-otp -> me -> refresh-token -> old refresh token invalid.

5. `[done]` Idempotency key infrastructure for mutating endpoints
   - Add persistent idempotency key table.
   - Enforce on `checkout/place-order`, payment initiate, refund create.
   - Return cached response on retries.

6. `[done]` Request/response validation and error contracts
   - Add `zod` schemas for auth/orders/payments critical paths.
   - Standardize error response format and codes.

7. `[done]` Payment webhook ingest and verification baseline
   - Add signed webhook endpoint and signature verification stub.
   - Persist webhook events and replay-safe processing guard.

8. `[done]` Seller/Admin persistence migration (core operational routes)
   - Move critical seller/admin actions from in-memory to Postgres-backed repositories.

9. `[done]` Backend integration test baseline
   - Auth session lifecycle tests.
   - Orders + payments idempotency tests.

10. `[done]` Dispatch/payout/audit persistence migration
   - Replace in-memory dispatch board and actions with Postgres-backed models/repositories.
   - Replace in-memory payout queue/actions with persisted flows.
   - Move audit-log write/read to immutable persisted storage.

11. `[done]` Observability + operational safety baseline
   - Structured logging sink + request correlation policy.
   - Lightweight metrics endpoint for operational visibility.

12. `[done]` Release hardening gates
   - Expand integration suite for seller/admin + webhook replay. (done)
   - Add security checks and performance baseline gate. (done)

13. `[done]` CI/CD hardening and deployment evidence
   - Wire release gates into CI workflow.
   - Add rollback evidence and deployment runbook references.

14. `[done]` Production deployment manifests and environment hardening
   - Add Dockerfile + docker-compose for backend runtime parity.
   - Add staging/prod env contract (`required env keys`, fail-fast validation).
   - Add deployment verification script (health/metrics/auth/order smoke post-deploy).

15. `[done]` Resilience and async worker foundation
   - Add queue worker baseline for webhook reconciliation and retry-safe processing.
   - Add dead-letter strategy and replay tooling for operational recovery.

16. `[done]` Monitoring sink and alerting integration
   - Export metrics/logs to real sink and define alert thresholds.
   - Add incident runbook links for alert classes.

17. `[done]` Incident drill + backup/restore evidence
   - Execute one simulated alert incident drill with timestamps and mitigation log.
   - Add backup/restore validation checklist and evidence capture template.

18. `[done]` Post-baseline enterprise hardening pack
   - Real OTP provider integration and abuse controls.
   - External observability platform integration (managed traces + retention).
   - IaC/orchestration rollout and staged rollback drill.

19. `[done]` Backend unit + contract release-gate baseline
   - Added `npm run test:unit` and `npm run test:contract` suites.
   - Wired both suites into `release:gate` before integration/perf checks.
   - Added baseline coverage for validation, abuse-control lock/rate-limit logic, and API error contract shape.

20. `[done]` Dispatch assignment conflict-safety
   - Enforced assignment conflict checks on rider availability and active assignment ownership.
   - Added explicit `409 CONFLICT` API contract for assignment collision paths.
   - Added integration test coverage for same-rider multi-order conflict attempt.

21. `[done]` Tracking event dedupe and out-of-order protection
   - Enforced monotonic seller-side order status progression in backend.
   - Added `409 CONFLICT` on out-of-order regression attempts.
   - Suppressed duplicate tracking-event writes when latest event already has same status.
   - Added integration test coverage for regression rejection and monotonic tracking timeline.

22. `[in-progress]` Production partner cutover hardening
   - Replace mock OTP with live provider credentials and compliance checklist.
   - Wire managed observability vendor ingestion endpoint in production.
   - Execute Kubernetes staged rollout/rollback in staging cluster with signed evidence.
   - Implemented fail-fast production cutover env policy:
     - disallow `OTP_PROVIDER=mock` in production.
     - disallow `OTP_BYPASS_CODE` in production.
     - require provider-specific OTP credentials in production (`http` URL/token or Firebase API key).
     - require monitoring sink URL/token and request event export in production.
   - Added `npm run cutover:check` to emit signed cutover policy evidence artifact.
   - Added `npm run k8s:rollout:drill` for staged rollout/rollback drill with signed artifact output:
     - `backend/artifacts/drills/k8s-rollout-drill-*.json`
     - local dry-run validation artifact:
       - `backend/artifacts/drills/k8s-rollout-drill-2026-04-06T18-37-47.242Z.json`
     - enhanced with explicit `K8S_CONTEXT` support and preflight context validation.
     - local non-dry rehearsal artifact:
       - `backend/artifacts/drills/k8s-rollout-drill-2026-04-06T19-26-38.032Z.json`
   - Added explicit backend docs maintenance cadence:
     - `backend/docs/11_BACKEND_DOCS_MAINTENANCE.md`
   - Added partner cutover compliance checklist:
     - `backend/docs/12_PARTNER_CUTOVER_COMPLIANCE_CHECKLIST.md`
   - Added CI production-policy preflight gate:
     - `.github/workflows/ci.yml` now runs `npm run cutover:check` under production contract variables.
   - Added cutover evidence summary pack generator:
     - `npm run cutover:evidence:pack`
     - signed summary artifact path:
       - `backend/artifacts/cutover/packs/cutover-evidence-pack-*.json`
     - latest local target pass artifact:
       - `backend/artifacts/cutover/packs/cutover-evidence-pack-2026-04-06T19-32-48.405Z.json`
     - staging target currently expected to fail until real staging context drill is recorded.

## Recently Completed

0. `[done]` Firebase OTP provider mode in backend.
   - Added `OTP_PROVIDER=firebase` support.
   - Added Firebase env contract keys and production env-policy validation.
   - Added optional `appVerifierToken` payload wiring on `/auth/send-otp` and `/auth/resend-otp`.

1. `[done]` Supabase Storage signed upload API baseline.
   - Added `POST /storage/signed-upload` for authenticated users (`customer`/`seller`/`admin`).
   - Added secure upload input validation (`fileName`, `folder`, `contentType` allow-list).
   - Added scoped object-path generation and signed URL creation through Supabase Storage REST signing.
   - Added production env-policy enforcement for Supabase storage mode:
     - require `SUPABASE_URL`, `SUPABASE_STORAGE_BUCKET`, `SUPABASE_SERVICE_ROLE_KEY`.

2. `[done]` Supabase signed-upload policy hardening (backend-side).
   - Added role-based folder restrictions (`customer`/`seller`/`admin`) on upload request validation.
   - Added max-size guard (`SUPABASE_UPLOAD_MAX_BYTES`) and folder allow-list env contract.
   - Added unit coverage for forbidden folders and oversize uploads.

1. `[done]` Postgres-backed auth profile consistency (`/auth/me`).
2. `[done]` Orders persistence foundation (`Order`, `OrderItem`, `TrackingEvent`).
3. `[done]` Payments persistence foundation (`PaymentTransaction`, `Refund`, `PaymentWebhookEvent`).
4. `[done]` Session lifecycle foundation (`UserSession`, DB auth session lookup, refresh rotation/revocation).
5. `[done]` Idempotency foundation for critical writes (order placement, payment initiation, refund creation).
6. `[done]` Validation/error-contract baseline on critical auth/order/payment endpoints.
7. `[done]` Payment webhook signature verification + event persistence baseline.
8. `[done]` Seller/Admin core persistence migration (operational status, order queue, menu stock/availability, admin user/seller controls).
9. `[done]` Backend integration test baseline created.
   - Current follow-up task: deterministic local+CI pass under isolated test env is tracked as item #1.
10. `[done]` Dispatch/payout/audit persistence migration (admin operational flows persisted).
11. `[done]` Observability baseline (`X-Request-Id`, structured request logs, `/metrics` endpoint).
12. `[done]` Release hardening gates (`4/4` integration tests + perf smoke + security check).
13. `[done]` CI/CD hardening and deployment evidence (strict backend release gate wired in CI + rollback runbook/evidence).
14. `[done]` Deployment manifests and env hardening baseline (Dockerfile + docker-compose + fail-fast env validation + deploy verification script).
15. `[done]` Async worker and dead-letter baseline (queue-backed payment webhook reconciliation + replay tooling + admin dead-letter visibility).
16. `[done]` Monitoring sink + alerting integration (monitoring sink hooks, rolling alert thresholds, admin alert API, runbook).
17. `[done]` Incident drill + backup/restore evidence (automated incident drill artifact + backup/restore validation artifact).
18. `[done]` Enterprise hardening pack (OTP provider abstraction + abuse controls, trace-context observability export, Kubernetes baseline + rollback drill evidence).
19. `[done]` Backend unit + contract release-gate baseline (`npm run test:unit`, `npm run test:contract`).
20. `[done]` Dispatch assignment conflict-safety (`409` conflict enforcement + integration test).
21. `[done]` Tracking event dedupe and out-of-order protection (`409` regression guard + duplicate event suppression).

22. [done] Seller Menu CRUD endpoints
    - POST /seller/restaurants/:restaurantId/menu - Create menu item
    - PUT /seller/restaurants/:restaurantId/menu/:itemId - Update menu item
    - DELETE /seller/restaurants/:restaurantId/menu/:itemId - Delete menu item
    - POST /seller/restaurants/:restaurantId/categories - Create category
    - PUT /seller/restaurants/:restaurantId/categories/:categoryId - Update category
    - DELETE /seller/restaurants/:restaurantId/categories/:categoryId - Delete category
    - PUT /seller/restaurants/:restaurantId/categories/reorder - Reorder categories

23. [done] Seller Earnings endpoints
    - GET /seller/restaurants/:restaurantId/earnings/summary - Earnings summary
    - GET /seller/restaurants/:restaurantId/earnings/chart - Earnings chart
    - GET /seller/restaurants/:restaurantId/earnings/transactions - Transaction history
    - GET /seller/restaurants/:restaurantId/payouts - Payouts list
    - POST /seller/restaurants/:restaurantId/payouts - Create payout request
    - GET /seller/restaurants/:restaurantId/bank-details - Get bank details
    - PUT /seller/restaurants/:restaurantId/bank-details - Update bank details
    - POST /seller/restaurants/:restaurantId/bank-details/verify - Verify bank details
    - GET /seller/restaurants/:restaurantId/commission - Commission breakdown
    - GET /seller/restaurants/:restaurantId/invoice - Download invoice

24. [done] Admin Dashboard Metrics endpoints
    - GET /admin/dashboard/order-metrics - Order status breakdown
    - GET /admin/dashboard/sla-metrics - SLA performance metrics
    - GET /admin/dashboard/revenue-chart - Revenue over time
    - GET /admin/dashboard/orders-chart - Orders over time
    - GET /admin/dashboard/user-growth - User acquisition metrics
    - GET /admin/dashboard/retention - Retention/churn metrics
    - GET /admin/dashboard/top-sellers - Top performing sellers
    - GET /admin/dashboard/top-restaurants - Top performing restaurants

25. [done] Admin Reports endpoints
    - GET /admin/reports/delivery-delays - Delivery delay report
    - GET /admin/reports/prep-time-breaches - Prep time breach report

26. [done] Admin Approvals endpoints
    - GET /admin/approvals - List all pending approvals
    - POST /admin/approvals/:approvalId/approve - Approve item
    - POST /admin/approvals/:approvalId/reject - Reject approval
    - POST /admin/approvals/:approvalId/request-info - Request more info
    - GET /admin/approvals/pending-sellers - Pending seller registrations
    - GET /admin/approvals/pending-documents - Pending document verifications
