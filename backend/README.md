# FoodieGo Backend

Backend API service for FoodieGo mobile app integration.

## Current State

- Runtime: `Node + TypeScript + Express`
- API prefix: `/api/v1`
- Codebase split by concern:
  - `src/modules/auth`
  - `src/modules/catalog`
  - `src/modules/orders`
  - `src/modules/payments`
  - `src/modules/seller`
  - `src/modules/admin`

## Important Note

- Persistence is currently in-memory (`src/store.ts`) for contract integration.
- Not production-safe yet; see backend docs for full gap analysis and 100% readiness criteria.

## Local Run

1. `cd backend`
2. `npm install`
3. copy `.env.example` to `.env`
4. set `USE_POSTGRES=true` in `.env` (for DB-backed paths)
5. `npm run prisma:generate`
6. `npm run prisma:migrate:dev`
7. `npm run db:seed`
8. `npm run dev`
9. API base URL: `http://localhost:4000/api/v1`

## Deployment Baseline

1. Build container stack: `docker compose -f backend/docker-compose.yml up --build`
2. Run deploy verification: `cd backend && npm run deploy:verify`
3. Stop stack: `docker compose -f backend/docker-compose.yml down`

## Worker Operations

1. Process queued jobs continuously: `npm run worker:run`
2. Process one batch immediately: `npm run worker:once`
3. Replay dead letters: `npm run dead-letter:replay`

## Monitoring Operations

1. Monitoring snapshot endpoint: `GET /api/v1/monitoring`
2. Admin alerts endpoint: `GET /api/v1/admin/monitoring/alerts`
3. Monitoring smoke verification: `npm run monitoring:smoke`

## Reliability Drills

1. Incident drill (alert raise/resolve evidence): `npm run incident:drill`
2. Backup + restore validation drill: `npm run backup:restore:drill`
3. Staged rollback drill evidence: `npm run rollback:drill`
4. Production cutover policy evidence (requires `NODE_ENV=production`): `npm run cutover:check`
5. Kubernetes staged rollout/rollback drill evidence: `npm run k8s:rollout:drill`
6. Cutover evidence summary pack:
   - local rehearsal: `CUTOVER_TARGET=local npm run cutover:evidence:pack`
   - staging proof required: `CUTOVER_TARGET=staging npm run cutover:evidence:pack`

## Enterprise Hardening Assets

1. OTP provider abstraction + abuse controls (`OTP_PROVIDER`, send/verify lockout windows).
2. External monitoring sink + trace context (`traceparent` propagation).
3. Kubernetes baseline manifests in `backend/infra/k8s/`.

## Backend Docs

1. `backend/docs/00_BACKEND_INDEX.md`
2. `backend/docs/01_BACKEND_ARCHITECTURE.md`
3. `backend/docs/02_BACKEND_PRODUCTION_REQUIREMENTS.md`
4. `backend/docs/03_BACKEND_READINESS_STATUS_2026-04-06.md`
5. `backend/docs/04_BACKEND_DEPENDENCIES_AND_INSTALL.md`
6. `backend/docs/05_BACKEND_NO_COMPROMISE_CHECKLIST.md`
7. `backend/docs/06_BACKEND_90_DAY_EXECUTION_PLAN.md`
8. `backend/docs/07_BACKEND_NEXT_IMPLEMENTATIONS_TRACKER.md`
9. `backend/docs/08_BACKEND_DEPLOYMENT_RUNBOOK_AND_EVIDENCE.md`
10. `backend/docs/09_BACKEND_MONITORING_ALERT_RUNBOOK.md`
