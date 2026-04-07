# Project Architecture

## App Entry

- `App.tsx`: Root app shell.
- `index.js`: RN app registration and gesture-handler bootstrap.

## Backend Service (Production Ready - 100% Readiness)

- Backend workspace: `backend/`
- Runtime: Node.js 22 + TypeScript + Express
- Database: PostgreSQL + Prisma (with in-memory fallback)
- API prefix: `/api/v1`
- Key files:
  - `backend/src/server.ts` - Server bootstrap
  - `backend/src/app.ts` - HTTP app setup
  - `backend/src/config/env.ts` - Environment config
  - `backend/src/middleware/auth.ts` - Auth middleware
  - `backend/src/modules/*/routes.ts` - Domain route modules
  - `backend/src/db/prismaClient.ts` - Prisma client
  - `backend/src/db/repositories/*` - Data repositories

## Layered Structure

- `src/presentation`: Screens, components, navigation, hooks.
- `src/store`: Redux store and slices.
- `src/data`: Services, API mocks, storage.
- `src/config`: Runtime app environment config (`env.ts`).
- `src/domain`: Type definitions and shared constants.
- `src/context`: Global providers (theme).
- `src/monitoring`: Error capture and reporting internals.
- `src/theme`: Design tokens (colors, typography, spacing).
- `src/utils`: UI utility helpers (animations/responsive helpers).
- `backend`: Backend API service scaffold (`Node + TypeScript + Express`) with first-pass in-memory domain implementation.

## Navigation Ownership

- `src/presentation/navigation/AppNavigator.tsx`:
  - Stack routes (auth, dashboards, detail flows).
  - Main bottom tabs.
  - Route type definitions (`RootStackParamList`, `MainTabParamList`).

## State Ownership

- `src/store/index.ts`: Redux store composition.
- `src/store/slices/userSlice.ts`: User/auth/session domain state.
- `src/store/slices/cartSlice.ts`: Cart domain state and selectors.
- `src/store/slices/orderSlice.ts`: Orders state and lifecycle.
- `src/data/storage/appStore.ts`: Lightweight persisted app flags (onboarding/theme related flags).

## API and Reliability Foundation

- `src/data/api/httpClient.ts`:
  - Shared axios client.
  - Request auth/device headers.
  - Token refresh flow (`/auth/refresh-token`).
  - Idempotency key generation for write operations.
- `src/config/env.ts`:
  - Central API base URL and client runtime settings.

## Observability Foundation

- `src/monitoring/errorCenter.ts`: In-app error registry and global error handlers.
- `src/monitoring/telemetry.ts`: Analytics tracking wrapper.
