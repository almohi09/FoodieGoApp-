# Backend Deployment Runbook And Evidence

Date: April 6, 2026

## Purpose

This document captures:
1. pre-deployment release gate commands,
2. rollback procedure,
3. latest execution evidence for backend production-readiness control.

## Release Gate Commands (Mandatory)

From `backend/`:

1. `npm run prisma:migrate:deploy`
2. `npm run db:seed` (for non-production and staging deterministic test data only)
3. `npm run release:gate`
4. `npm run release:gate:strict`

Gate definitions:
- `release:gate` = build + unit tests + contract tests + integration tests + perf smoke.
- `release:gate:strict` = release gate + dependency security audit.

## CI Integration

Workflow:
- `.github/workflows/ci.yml`

Backend CI gate job:
- `backend-release-gate`
  - starts PostgreSQL service container.
  - applies Prisma migrations (`prisma:migrate:deploy`).
  - seeds baseline data (`db:seed`).
  - runs strict gate (`release:gate:strict`).
  - runs production policy preflight (`cutover:check`) with CI-safe production env contract.

E2E dependency:
- `e2e-smoke` waits for:
  - `test-and-lint`
  - `backend-release-gate`

## Rollback Procedure

If deployment introduces functional regression:

1. Stop new rollout traffic.
2. Revert application deploy to last known-good artifact/image tag.
3. If schema rollback is required:
   - apply explicit rollback migration script prepared during migration review.
   - never use destructive ad-hoc DB reset in production.
4. Run post-rollback validation:
   - `/api/v1/health`
   - `/api/v1/metrics`
   - `auth verify + me`
   - `place-order + payment status`
5. Confirm incident timeline, root-cause owner, and corrective action entry in incident notes.

## Staging Kubernetes Staged Rollout/Rollback Drill

Run from `backend/` with staging kube context selected:

1. `npm run k8s:rollout:drill`
2. Optional envs:
   - `K8S_CONTEXT` (explicit kube context, recommended for CI/operator safety)
   - `K8S_NAMESPACE` (default `foodiego`)
   - `K8S_DEPLOYMENT` (default `foodiego-backend`)
   - `K8S_MANIFEST_PATH` (default `infra/k8s`)
   - `K8S_ROLLOUT_TIMEOUT` (default `180s`)
   - `K8S_HEALTHCHECK_URL` (recommended staging health endpoint)
   - `K8S_EVIDENCE_DRY_RUN=true` (for local command validation without cluster apply)
3. Drill writes signed artifact:
   - `backend/artifacts/drills/k8s-rollout-drill-*.json`

## Latest Evidence Snapshot (April 6, 2026)

1. Build gate:
   - `npm run build` -> pass.
2. Integration gate:
   - `npm run test:unit` -> pass (`7/7`).
   - `npm run test:contract` -> pass (`3/3`).
   - `npm run test:integration` -> pass (`6/6`).
3. Performance smoke gate:
   - `npm run perf:smoke` -> pass
   - requests: `120`
   - p95: `252ms` (latest strict gate execution)
   - errorRate: `0`
4. Security gate:
   - `npm run security:check` -> pass
   - audit result: `0 vulnerabilities` (high+ threshold).
5. Operational observability:
   - `X-Request-Id` propagation verified.
   - `/api/v1/metrics` endpoint verified.
6. Deployment verification script:
   - `npm run deploy:verify` -> pass
   - validated chain:
     - `GET /health`
     - `GET /metrics`
     - `POST /auth/send-otp`
     - `POST /auth/verify-otp`
     - `GET /auth/me`
     - `POST /addresses`
     - `POST /checkout/place-order`
7. Async worker operational verification:
   - `npm run worker:once` -> pass (`claimed/completed/retried/deadLetters` summary emitted).
   - Queue-backed webhook reconciliation verification:
     - webhook response includes `queued=true` and `jobId`.
     - payment status before worker run: `pending`.
     - payment status after worker run: `completed`.
8. Monitoring sink and alert verification:
   - `npm run monitoring:smoke` -> pass.
   - monitoring endpoint verification:
     - `GET /api/v1/monitoring` returns active alerts snapshot.
   - sink verification:
     - sink received request events and alert event payload.
   - alert verification:
     - `high_p95_latency` alert detected under smoke thresholds.
9. Incident drill and backup/restore evidence:
   - `npm run incident:drill` -> pass
   - incident timeline artifact:
     - `backend/artifacts/drills/incident-drill-2026-04-06T17-50-08-552Z.json`
   - `npm run backup:restore:drill` -> pass
   - backup/restore artifact:
     - `backend/artifacts/backups/backup-restore-drill-2026-04-06T17-49-05.589Z.json`
10. Enterprise hardening verification:
   - `npm run rollback:drill` -> pass
   - rollback drill artifact:
     - `backend/artifacts/drills/rollback-drill-2026-04-06T17-58-21.228Z.json`
   - OTP abuse control validation:
     - configured send cap test: third send -> `429`.
     - configured verify lock test: repeated invalid verify -> `423`.
11. Kubernetes staged rollout/rollback drill automation:
   - `K8S_EVIDENCE_DRY_RUN=true npm run k8s:rollout:drill` -> pass
   - drill artifact:
     - `backend/artifacts/drills/k8s-rollout-drill-2026-04-06T18-37-47.242Z.json`
12. Kubernetes non-dry local-cluster rollout/rollback drill:
   - context: `kind-foodiego-staging`
   - manifest path: `infra/k8s-local`
   - command:
     - `K8S_CONTEXT=kind-foodiego-staging K8S_MANIFEST_PATH=infra/k8s-local npm run k8s:rollout:drill`
   - result: `pass=true`
   - drill artifact:
     - `backend/artifacts/drills/k8s-rollout-drill-2026-04-06T19-26-38.032Z.json`
13. Cutover evidence summary pack:
   - `CUTOVER_TARGET=local npm run cutover:evidence:pack` -> pass
   - artifact:
     - `backend/artifacts/cutover/packs/cutover-evidence-pack-2026-04-06T19-32-48.405Z.json`
   - `CUTOVER_TARGET=staging npm run cutover:evidence:pack` -> expected fail until staging drill evidence exists
   - latest staging-target artifact:
     - `backend/artifacts/cutover/packs/cutover-evidence-pack-2026-04-06T19-32-58.796Z.json`
