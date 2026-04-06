# Where To Write Code (Developer Rules)

## If You Are Building UI
- New screen UI: `src/presentation/screens/<section>/<Feature>Screen.tsx`
- Reusable widget: `src/presentation/components/common/`
- Theme-based color/spacing usage: `src/theme/index.ts` + `useTheme()` from `src/context/ThemeContext.tsx`

## If You Are Adding Business Logic
- Global app state logic: Redux slice in `src/store/slices/`
- App-level persisted flags: `src/data/storage/appStore.ts`
- Side-effect/API integration: `src/data/api/`

## If You Are Adding Routes
- Add route type + screen registration in `src/presentation/navigation/AppNavigator.tsx`

## If You Are Adding Types/Constants
- Types/interfaces: `src/domain/types/index.ts`
- Shared constants: `src/domain/constants/index.ts`

## If You Are Handling Errors
- Capture errors from services/screens with `captureError()` in `src/monitoring/errorCenter.ts`
- Never scatter custom error arrays in random files; use Error Center as the single collector.

## If You Are Implementing Features
- Put feature UI in a dedicated screen file.
- Keep API calls in `src/data/api`.
- Keep state transitions in relevant Redux slice.
- Keep route wiring in `AppNavigator`.
- Keep feature-level docs update in `docs/02_FEATURE_FILE_MAP.md`.

## Mandatory Update Checklist (Before PR)
- Update feature map: `docs/02_FEATURE_FILE_MAP.md`
- Update architecture if folders changed: `docs/01_PROJECT_ARCHITECTURE.md`
- Update error map if capture/storage changed: `docs/03_ERRORS_AND_LOGGING.md`

