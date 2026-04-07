# Free-Tier Deployment Profile (Render + Supabase + Firebase)

Date: April 7, 2026

This profile is the default low-cost deployment target for FoodieGo.

## Zero-Cost Start Policy

1. Initial setup and pilot validation must not require paid plans.
2. Use free-tier plans on Render, Supabase, and Firebase.
3. Keep paid-only features out of phase-1 rollout.

## Target Stack

1. API + worker runtime: Render
2. Primary relational database: Supabase Postgres
3. Image storage: Supabase Storage (public bucket for catalog/menu assets)
4. OTP/Auth provider: Firebase (native provider mode in backend)

## Why This Profile

1. No infra ops overhead for MVP/pilot.
2. Keeps current backend architecture intact (`Node + Express + Prisma + Postgres`).
3. Minimizes app changes: frontend only needs `API_BASE_URL` switch to Render.
4. Supports image URLs at scale through CDN-backed object storage.

## Required Runtime Env (Backend)

Set these on Render service environment:

1. `USE_POSTGRES=true`
2. `DATABASE_URL=<supabase-postgres-connection-string>`
3. `IMAGE_STORAGE_PROVIDER=supabase`
4. `SUPABASE_URL=https://<project-ref>.supabase.co`
5. `SUPABASE_STORAGE_BUCKET=foodiego-public`
6. `SUPABASE_SERVICE_ROLE_KEY=<service-role-key>`
7. `SUPABASE_SIGNED_UPLOAD_TTL_SEC=300`
8. `SUPABASE_ALLOWED_UPLOAD_MIME_TYPES=image/jpeg,image/png,image/webp`
9. `SUPABASE_ALLOWED_UPLOAD_FOLDERS=general,menu,profile,support,kyc,moderation`
10. `SUPABASE_UPLOAD_MAX_BYTES=5242880`
11. `OTP_PROVIDER=firebase`
12. `FIREBASE_WEB_API_KEY=<firebase-web-api-key>`
13. `PAYMENT_WEBHOOK_SECRET=<secret>`

Production policy constraints still apply from `src/config/env.ts`:

1. `OTP_PROVIDER` must not be `mock`.
2. `OTP_BYPASS_CODE` must be empty.
3. Monitoring sink variables must be configured.

## Free-Start Profile (Development + Pilot)

Use this when you need zero-cost startup and no SMS billing:

1. `NODE_ENV=development`
2. `USE_POSTGRES=true`
3. `DATABASE_URL=<supabase-postgres-connection-string>`
4. `IMAGE_STORAGE_PROVIDER=supabase`
5. `SUPABASE_URL=https://<project-ref>.supabase.co`
6. `SUPABASE_STORAGE_BUCKET=foodiego-public`
7. `SUPABASE_SERVICE_ROLE_KEY=<service-role-key>`
8. `OTP_PROVIDER=mock`
9. `OTP_BYPASS_CODE=123456`

When moving to real OTP traffic, switch to:

1. `OTP_PROVIDER=firebase`
2. `FIREBASE_WEB_API_KEY=<firebase-web-api-key>`
3. Send `appVerifierToken` from client in `/auth/send-otp` and `/auth/resend-otp` payload.

## Image Format Convention

Catalog and menu image fields may be persisted in either format:

1. Full URL: `https://...` (returned unchanged)
2. Supabase URI: `supabase://<bucket>/<path>`
3. Bucket-relative path: `<folder>/<file>`

When `IMAGE_STORAGE_PROVIDER=supabase`, backend resolves (2) and (3) into public Supabase URLs before response.

## Current Implementation Status

Implemented in this phase:

1. Frontend service layer now reads shared `appEnv.apiBaseUrl` instead of hardcoded domain across API clients.
2. Backend env supports image storage provider config:
   - `IMAGE_STORAGE_PROVIDER`
   - `SUPABASE_URL`
   - `SUPABASE_STORAGE_BUCKET`
3. Backend catalog responses now normalize image fields via Supabase URL resolver.
4. Backend supports Firebase OTP send/verify flow (`OTP_PROVIDER=firebase`) with per-phone verification session tracking.
5. Backend supports signed upload URL generation for Supabase Storage:
   - `POST /api/v1/storage/signed-upload` (authenticated)
   - upload content-type allow-list validation
   - role-based folder restrictions + max-size guard

Deferred to next phase:

1. Firebase-native auth token verification flow (ID token or custom token exchange).
2. Bucket policies and path-level access model (`public/`, `seller/`, `private/`).
3. Staging evidence for signed-upload flow and failure-mode drills.
