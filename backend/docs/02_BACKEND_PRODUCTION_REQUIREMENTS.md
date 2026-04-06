# Backend Production Requirements (100% Ready Definition)

Date: April 6, 2026

## 1) Identity and Access

- OTP provider integration (real SMS provider, signed callbacks).
- JWT access token + rotating refresh token model.
- Session store with revocation and per-device management.
- RBAC and ABAC enforcement for `customer`, `seller`, `admin`, `rider`.
- Account lockouts, risk scoring, and fraud challenge flow.

## 2) Data and Domain Integrity

- PostgreSQL schema with migrations.
- Strict foreign keys + unique constraints + soft-delete policy.
- Full order state machine with server-side guardrails:
  - `pending -> confirmed -> preparing -> out_for_delivery -> delivered`
  - cancellation/refund transitions as controlled exceptions only.
- Idempotency key store for all mutating endpoints.

## 3) Payments and Reconciliation

- Real payment gateway integration (UPI/card/wallet).
- Webhook signature verification and replay protection.
- Reconciliation workers:
  - pending -> final settlement confirmation.
  - daily mismatch detection and alerting.
- Refund lifecycle with auditable status transitions.

## 4) Dispatch and Delivery

- Rider identity + onboarding + KYC state.
- Rider assignment and workload balancing.
- Live location ingest pipeline with ordering, dedupe, and throttling.
- Delivery proof capture (OTP/photo/signature) with tamper-proof audit.

## 5) Seller and Admin Operations

- Seller menu/inventory/hours/order actions with strong authorization.
- Admin moderation, suspension/reactivation, payouts, incident tools.
- Immutable audit logs with export and retention policy.

## 6) Reliability and Observability

- Structured logs, trace IDs, metrics, distributed tracing.
- SLOs + SLIs + alerting policy:
  - order placement success,
  - payment success,
  - tracking freshness,
  - API latency p95/p99,
  - error budget consumption.
- Crash + incident management runbooks.

## 7) Security and Compliance

- Secrets manager integration.
- TLS everywhere, secure headers, request validation.
- WAF/rate limits, anti-bot and abuse controls.
- Data retention and PII minimization policy.
- Dependency and container image vulnerability scanning.

## 8) Release and Deployment Readiness

- CI/CD with mandatory gates (lint, unit, integration, contract, e2e, load).
- Staging parity with production topology.
- Rollback strategy and rollback drills.
- Backup and restore drills with RPO/RTO targets.
