# Backend Enterprise Hardening Pack

Date: April 6, 2026

## Scope Implemented

1. OTP provider abstraction and abuse controls
   - provider modes:
     - `OTP_PROVIDER=mock`
     - `OTP_PROVIDER=http`
     - `OTP_PROVIDER=firebase`
   - OTP controls:
     - send rate window + cap
     - verify failure window + lockout
   - files:
     - `src/services/otpProvider.ts`
     - `src/security/abuseGuard.ts`
     - `src/modules/auth/routes.ts`

2. External observability integration baseline
   - request log export to external sink.
   - request trace context propagation using `traceparent`.
   - monitoring/alert snapshots exposed to admin.
   - files:
     - `src/monitoring/observability.ts`
     - `src/app.ts`
     - `src/modules/admin/routes.ts`

3. IaC/orchestration rollout baseline
   - Kubernetes manifests:
     - namespace/config/deployment/service/hpa/pdb/kustomization
   - files:
     - `infra/k8s/*.yaml`
     - `infra/k8s/README.md`

4. Staged rollback drill automation
   - script:
     - `npm run rollback:drill`
   - evidence:
     - `backend/artifacts/drills/rollback-drill-*.json`

## Env Variables Added

1. OTP provider:
   - `OTP_PROVIDER`
   - `OTP_PROVIDER_HTTP_URL`
   - `OTP_PROVIDER_HTTP_TOKEN`
   - `FIREBASE_WEB_API_KEY`
   - `FIREBASE_OTP_RECAPTCHA_BYPASS_TOKEN`
   - `OTP_BYPASS_CODE`
   - `OTP_TTL_SEC`
   - `OTP_SEND_WINDOW_SEC`
   - `OTP_SEND_MAX_PER_WINDOW`
   - `OTP_VERIFY_FAIL_WINDOW_SEC`
   - `OTP_VERIFY_FAIL_MAX`
   - `OTP_VERIFY_LOCK_SEC`

2. Rollback drill:
   - `ROLLBACK_DRILL_BASE_URL`

## Validation Commands

1. `npm run build`
2. `npm run test:integration`
3. `npm run rollback:drill`
4. `NODE_ENV=production npm run cutover:check`
5. `CUTOVER_TARGET=local npm run cutover:evidence:pack`

## Evidence Snapshot (April 6, 2026)

1. rollback drill evidence:
   - `backend/artifacts/drills/rollback-drill-2026-04-06T17-58-21.228Z.json`
2. incident drill evidence:
   - `backend/artifacts/drills/incident-drill-2026-04-06T17-50-08-552Z.json`
3. backup/restore evidence:
   - `backend/artifacts/backups/backup-restore-drill-2026-04-06T17-49-05.589Z.json`
4. OTP abuse-control verification:
   - third send in constrained window returned `429`.
   - repeated invalid verify returned `423` lock status.
