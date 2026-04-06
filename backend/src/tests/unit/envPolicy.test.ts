import assert from "node:assert/strict";
import test from "node:test";

const originalEnv = { ...process.env };

const resetEnv = () => {
  process.env = { ...originalEnv };
};

const loadEnvModule = async () =>
  import(`../../config/env.js?case=${Date.now()}_${Math.random().toString(16).slice(2)}`);

const withProdBaseEnv = () => {
  resetEnv();
  process.env.NODE_ENV = "production";
  process.env.PORT = "4000";
  process.env.API_PREFIX = "/api/v1";
  process.env.USE_POSTGRES = "true";
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/foodiego_test?schema=public";
  process.env.PAYMENT_WEBHOOK_SECRET = "test_webhook_secret";
  process.env.OTP_PROVIDER = "http";
  process.env.OTP_PROVIDER_HTTP_URL = "https://otp.example.com";
  process.env.OTP_PROVIDER_HTTP_TOKEN = "otp_token";
  process.env.MONITORING_SINK_URL = "https://monitoring.example.com/ingest";
  process.env.MONITORING_SINK_AUTH_TOKEN = "monitoring_token";
  process.env.MONITORING_EMIT_REQUEST_EVENTS = "true";
  delete process.env.OTP_BYPASS_CODE;
};

test("production env rejects mock OTP provider", async () => {
  withProdBaseEnv();
  process.env.OTP_PROVIDER = "mock";
  await assert.rejects(loadEnvModule, /OTP_PROVIDER must be set to "http" in production\./);
});

test("production env rejects configured OTP bypass code", async () => {
  withProdBaseEnv();
  process.env.OTP_BYPASS_CODE = "123456";
  await assert.rejects(loadEnvModule, /OTP_BYPASS_CODE must not be configured in production\./);
});

test("production env loads when cutover requirements are satisfied", async () => {
  withProdBaseEnv();
  const loaded = await loadEnvModule();
  assert.equal(loaded.default.nodeEnv, "production");
  assert.equal(loaded.default.otpProvider, "http");
  assert.equal(loaded.default.otpBypassCode, "");
  assert.equal(loaded.default.monitoringEmitRequestEvents, true);
});

test.after(() => {
  resetEnv();
});
