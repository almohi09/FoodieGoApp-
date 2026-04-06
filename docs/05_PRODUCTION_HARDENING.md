# Production Hardening Checklist

## Security and Compliance

- Use short-lived access tokens and rotate via `/auth/refresh-token`.
- Bind session traffic to `X-Device-Id`.
- Never store card PAN/CVV on device; use hosted PCI-compliant payment pages.
- Send `Idempotency-Key` on order placement/payment/refund writes.
- Enforce server-side rate limits for OTP, coupon apply, payment verify, login.
- Add abuse controls (coupon velocity, account velocity, device/IP anomalies).

## Reliability

- Run inventory and restaurant open/close checks during checkout.
- Validate coupon eligibility server-side at quote and place-order stages.
- Retry payment verification and recover with order payment-status poll.
- Track orders with socket + polling fallback + push subscriptions.

## Quality Gates

- CI pipeline with lint + tests on every push/PR (`.github/workflows/ci.yml`).
- Add E2E tests for order funnel:
  - auth -> browse -> cart -> checkout -> pay -> track -> history.
- Add crash reporting sink (Sentry/Firebase Crashlytics) in addition to local error center.

## Growth and Analytics

- Track funnel events (`checkout_start`, `payment_success`, `order_placed`).
- Use experiment flags to roll out risky checks gradually.
- Cache restaurant/search payloads with TTL and stale fallback.
- Use recommendation endpoints for featured feeds.
