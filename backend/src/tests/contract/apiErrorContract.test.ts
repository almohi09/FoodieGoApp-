import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import app from "../../app.js";

const startServer = async () => {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const address = server.address() as AddressInfo;
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}/api/v1`,
  };
};

const postJson = async (baseUrl: string, path: string, body: Record<string, unknown>) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  return { status: res.status, data };
};

const assertApiErrorShape = (
  payload: any,
  code: string,
  message: string,
  detailsField?: string,
) => {
  assert.equal(payload.success, false);
  assert.equal(typeof payload.error, "object");
  assert.equal(payload.error.code, code);
  assert.equal(payload.error.message, message);
  if (detailsField) {
    assert.equal(payload.error.details?.field, detailsField);
  }
};

test("contract: auth/send-otp validation error follows api error schema", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const result = await postJson(baseUrl, "/auth/send-otp", {});
    assert.equal(result.status, 400);
    assertApiErrorShape(result.data, "VALIDATION_ERROR", "Phone is required", "phone");
  } finally {
    server.close();
  }
});

test("contract: auth/refresh-token invalid format follows api error schema", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const result = await postJson(baseUrl, "/auth/refresh-token", { refreshToken: "bad_token" });
    assert.equal(result.status, 400);
    assertApiErrorShape(
      result.data,
      "VALIDATION_ERROR",
      "Invalid refresh token format",
      "refreshToken",
    );
  } finally {
    server.close();
  }
});

test("contract: payments/webhooks/gateway returns structured conflict when postgres mode is disabled", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const result = await postJson(baseUrl, "/payments/webhooks/gateway", {
      eventType: "payment.succeeded",
      transactionId: "txn_1",
    });

    // This contract is for non-postgres test mode where the endpoint is intentionally unavailable.
    assert.equal(result.status, 503);
    assertApiErrorShape(
      result.data,
      "CONFLICT",
      "Webhook endpoint requires Postgres mode",
    );
  } finally {
    server.close();
  }
});

