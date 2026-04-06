# Backend Monitoring Alert Runbook

Date: April 6, 2026

## Purpose

Operational playbook for current backend alert classes emitted by monitoring baseline.

## Current Alert Classes

1. `high_error_rate` (critical)
   - Condition: rolling 5xx error rate breaches configured threshold.
   - Inputs:
     - `ALERT_WINDOW_MS`
     - `ALERT_MIN_REQUESTS`
     - `ALERT_ERROR_RATE_THRESHOLD`

2. `high_p95_latency` (warning)
   - Condition: rolling p95 request latency breaches configured threshold.
   - Inputs:
     - `ALERT_WINDOW_MS`
     - `ALERT_MIN_REQUESTS`
     - `ALERT_P95_MS_THRESHOLD`

## Triage Steps

1. Confirm signal
   - `GET /api/v1/monitoring`
   - `GET /api/v1/metrics`
   - `GET /api/v1/admin/monitoring/alerts` (admin auth)

2. Scope blast radius
   - Inspect `byRoute` and `byStatus` metrics.
   - Compare to recent deploy timeline.
   - Check if failures are concentrated by endpoint or global.

3. Mitigate
   - If `high_error_rate` critical:
     - rollback to previous stable artifact if error surge maps to latest release.
     - disable risky feature flags if available.
   - If `high_p95_latency` warning:
     - reduce load intensity (rate shaping) and inspect slow routes.
     - scale workers for async backlog if webhook/job processing lagging.

4. Validate recovery
   - Ensure alert state resolves in monitoring snapshot.
   - Verify customer critical path:
     - auth verify/me
     - order placement
     - payment status

## Escalation

1. Critical (`high_error_rate`) unresolved after 15 minutes:
   - incident owner: backend on-call.
   - escalate to platform owner if infrastructure saturation suspected.

2. Warning (`high_p95_latency`) unresolved after 30 minutes:
   - open performance incident ticket with route-level evidence and p95 trend.

## Evidence Capture Checklist

1. alert payload samples from sink.
2. monitoring snapshot before/after mitigation.
3. route/status metrics screenshot or JSON dump.
4. rollback or mitigation action timestamp.
