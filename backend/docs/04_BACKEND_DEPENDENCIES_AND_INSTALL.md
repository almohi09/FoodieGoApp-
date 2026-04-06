# Backend Dependencies, Versions, and Manual Install Steps

Date: April 6, 2026

## Runtime Requirements

1. Node.js `22.11.0` or newer (recommended: latest Node 22 LTS).
2. npm `10.x` or newer.

## Current Backend Package Versions

From `backend/package.json`:

- `express`: `^4.21.2`
- `cors`: `^2.8.5`
- `morgan`: `^1.10.0`
- `dotenv`: `^16.5.0`
- `@prisma/client`: `^6.6.0`
- `typescript`: `^5.8.3`
- `tsx`: `^4.20.0`
- `prisma`: `^6.6.0`
- `@types/node`: `^22.15.3`
- `@types/express`: `^4.17.21`
- `@types/cors`: `^2.8.17`
- `@types/morgan`: `^1.9.9`

## Manual Install Steps (Do These Exactly)

1. `cd backend`
2. `npm install`
3. Create env file:
   - Copy `backend/.env.example` -> `backend/.env`
4. Start in dev mode:
   - `npm run dev`
5. Build check:
   - `npm run build`
6. Production start (after build):
   - `npm run start`
7. Generate Prisma client:
   - `npm run prisma:generate`
8. Create/update local schema:
   - `npm run prisma:migrate:dev`
9. Seed baseline data:
   - `npm run db:seed`

## Next Mandatory Installations for Production Phase

These are not optional if target is Zomato/Swiggy-grade:

1. Data + ORM:
   - `postgresql` server (manual infra install) - still required
2. Validation + security:
   - `zod` (request/response schema validation)
   - `helmet` (security headers)
   - `express-rate-limit` (edge throttling baseline)
3. Auth + crypto:
   - `jsonwebtoken`
   - `argon2` (password/secret hashing where needed)
4. Cache + queue:
   - `redis` server
   - `ioredis`
   - `bullmq` (or equivalent queue system)
5. Observability:
   - `pino` (structured logging)
   - `@opentelemetry/*` packages
6. Testing:
   - `vitest` or `jest` (backend test framework)
   - `supertest` (API integration tests)

## Compatibility Policy

1. Keep Node major pinned to LTS (`22.x`) for both local and CI.
2. Lock backend dependency versions via `package-lock.json`.
3. Upgrade dependencies only through controlled monthly patch windows with regression tests.
