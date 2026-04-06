# Backend Docs Maintenance Cadence

Date: April 7, 2026

## Purpose

Ensure backend documentation is updated as implementation progresses, not batched later.

## Mandatory Update Rule

For every backend implementation change set, update docs in the same session before marking work complete.

Required minimum updates:
1. `backend/docs/07_BACKEND_NEXT_IMPLEMENTATIONS_TRACKER.md` (status/progress).
2. One operational doc affected by the change (runbook/checklist/hardening doc).
3. Evidence path references if new artifacts/scripts were added.

## Update Cadence

1. During active implementation:
   - update tracker status to `[in-progress]` at start.
2. After validation commands pass:
   - append completed sub-items and evidence file paths.
3. At end of day:
   - sync `backend/docs/03_BACKEND_READINESS_STATUS_YYYY-MM-DD.md` snapshot if readiness scope changed.

## Quality Bar For Doc Updates

1. Use concrete commands and artifact paths (no vague statements).
2. Include date in each new doc snapshot.
3. Keep status labels (`[next]`, `[in-progress]`, `[done]`) consistent.

## Quick Doc Checklist (Pre-merge)

1. Tracker updated.
2. Runbook/checklist updated.
3. Script command documented in `backend/README.md` if operator-facing.
4. New artifact directory/path documented.
