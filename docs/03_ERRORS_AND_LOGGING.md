# Errors and Logging Map

## Where Errors Are Captured
- Central capture module: `src/monitoring/errorCenter.ts`
  - `captureError(error, source, fatal?)`
  - `installGlobalErrorHandlers()`
  - `getErrorRecords()`
  - `clearErrorRecords()`
  - `subscribeToErrors(listener)`
- API contract validation capture:
  - Source pattern: `contract:<path>`
  - Validator module: `src/data/api/contracts.ts`
  - Triggered when backend response/request payload shape is invalid.
- Observability context tags added to error records:
  - `traceId`, `environment`, `release`, `appVersion`, `buildType`
  - Optional `tags` for HTTP status/url/method correlation.

## Global Hooks
- Installed at app startup in `App.tsx` via `installGlobalErrorHandlers()`.
- Captures:
  - `console.error` calls.
  - Global JS fatal/non-fatal errors through `ErrorUtils` handler.

## React Render Crashes
- Boundary: `src/presentation/components/common/AppErrorBoundary.tsx`
- Any uncaught UI tree crash is captured through `captureError(..., 'react-boundary', true)`.

## Where Errors Are Visible
- Screen: `src/presentation/screens/debug/ErrorCenterScreen.tsx`
- Navigation route: `ErrorCenter` in `src/presentation/navigation/AppNavigator.tsx`
- Access entry point: Admin Dashboard settings item.

## Storage Behavior
- Current behavior: in-memory ring buffer (`MAX_RECORDS = 200`) in `errorCenter.ts`.
- Current behavior: not persisted to disk / server.
- If app restarts, in-memory logs reset.

## What To Extend for Production
- Persist logs locally (AsyncStorage/SQLite) before upload.
- Add remote transport (Sentry/Crashlytics/custom API).
- Add tags: userId, device model, route name, seller/admin context.
- Add filtering by severity/source in Error Center UI.
