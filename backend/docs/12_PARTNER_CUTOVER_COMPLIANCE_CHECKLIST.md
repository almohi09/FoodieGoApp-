# Partner Cutover Compliance Checklist

Date: April 7, 2026

Status legend:
- `[x]` complete
- `[ ]` pending

## OTP Provider Cutover

- [ ] `OTP_PROVIDER=http` in production runtime config.
- [ ] `OTP_PROVIDER_HTTP_URL` points to approved provider endpoint.
- [ ] `OTP_PROVIDER_HTTP_TOKEN` sourced from secret manager.
- [ ] `OTP_BYPASS_CODE` unset in production.
- [ ] Provider callback/signature verification contract reviewed and signed by security.
- [ ] Provider rate limits and abuse policy approved by compliance.

## Managed Observability Cutover

- [ ] `MONITORING_SINK_URL` points to managed vendor ingest endpoint.
- [ ] `MONITORING_SINK_AUTH_TOKEN` loaded from secret manager.
- [ ] `MONITORING_EMIT_REQUEST_EVENTS=true` in production.
- [ ] PII scrubbing policy validated for exported event payloads.
- [ ] Retention and access-control policy reviewed by platform/security.

## Kubernetes Staging Rollout/Rollback Evidence

- [x] Local non-dry rehearsal completed on kind context:
  - `backend/artifacts/drills/k8s-rollout-drill-2026-04-06T19-26-38.032Z.json`
- [ ] Staging deployment via `kubectl apply -k backend/infra/k8s` completed.
- [ ] `npm run k8s:rollout:drill` executed against staging cluster.
- [ ] Signed drill artifact stored:
  - `backend/artifacts/drills/k8s-rollout-drill-*.json`
- [ ] Rollback completed and post-rollback health validated.
- [ ] Drill evidence checksum archived in release notes/change ticket.

## Release Sign-Off

- [ ] Cutover evidence pack generated:
  - `backend/artifacts/cutover/packs/cutover-evidence-pack-*.json`
- [ ] Engineering lead sign-off.
- [ ] Security sign-off.
- [ ] Compliance sign-off.
- [ ] On-call readiness confirmed (runbooks and escalation path).
