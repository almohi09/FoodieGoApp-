# Free-Tier Infra Decision

Date: April 7, 2026

Policy for startup phase:

1. No paid service is required to start development and pilot validation.
2. First deployment path must stay within free tiers.
3. Paid upgrades are allowed only after traffic/scale justifies them.

Approved default stack:

1. Backend runtime: Render
2. Database: Supabase Postgres
3. Image storage: Supabase Storage
4. OTP/Auth provider: Firebase (through backend OTP HTTP adapter)

Free-start operating mode:

1. Local/dev and initial pilot can run with `OTP_PROVIDER=mock` (no SMS spend).
2. Firebase OTP integration remains the default upgrade path for real-device OTP later.

Implementation details and backend env contract:

1. `backend/docs/13_FREE_TIER_STACK_RENDER_SUPABASE_FIREBASE.md`
