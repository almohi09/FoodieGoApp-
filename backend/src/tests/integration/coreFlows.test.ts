import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import type { AddressInfo } from "node:net";
import test from "node:test";
import app from "../../app.js";
import { prisma } from "../../db/prismaClient.js";

const startServer = async () => {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
  return { server, baseUrl };
};

const requestJson = async (params: {
  baseUrl: string;
  method: string;
  path: string;
  token?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}) => {
  const res = await fetch(`${params.baseUrl}${params.path}`, {
    method: params.method,
    headers: {
      "Content-Type": "application/json",
      ...(params.token ? { Authorization: `Bearer ${params.token}` } : {}),
      ...(params.headers || {}),
    },
    body: params.body ? JSON.stringify(params.body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  return { status: res.status, data };
};

const signWebhookPayload = (payload: Record<string, unknown>) => {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET || "dev_webhook_secret";
  const raw = JSON.stringify(payload);
  return crypto.createHmac("sha256", secret).update(raw).digest("hex");
};

test("auth refresh rotation invalidates old refresh token", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const phone = `+91999${Date.now().toString().slice(-7)}`;
    await requestJson({ baseUrl, method: "POST", path: "/auth/send-otp", body: { phone } });
    const verify = await requestJson({
      baseUrl,
      method: "POST",
      path: "/auth/verify-otp",
      body: { phone, otp: "123456" },
    });
    assert.equal(verify.status, 200);
    const refreshToken = verify.data.refreshToken as string;
    assert.ok(refreshToken?.startsWith("rtk_"));

    const rotate = await requestJson({
      baseUrl,
      method: "POST",
      path: "/auth/refresh-token",
      body: { refreshToken },
    });
    assert.equal(rotate.status, 200);
    assert.notEqual(rotate.data.refreshToken, refreshToken);

    const reuse = await requestJson({
      baseUrl,
      method: "POST",
      path: "/auth/refresh-token",
      body: { refreshToken },
    });
    assert.equal(reuse.status, 401);
  } finally {
    server.close();
  }
});

test("idempotency returns same order and payment transaction on retries", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const phone = `+91888${Date.now().toString().slice(-7)}`;
    await requestJson({ baseUrl, method: "POST", path: "/auth/send-otp", body: { phone } });
    const verify = await requestJson({
      baseUrl,
      method: "POST",
      path: "/auth/verify-otp",
      body: { phone, otp: "123456" },
    });
    const token = verify.data.token as string;
    assert.ok(token?.startsWith("atk_"));

    const address = await requestJson({
      baseUrl,
      method: "POST",
      path: "/addresses",
      token,
      body: {
        label: "home",
        address: "Integration Test Street",
        lat: 12.97,
        lng: 77.59,
      },
    });
    assert.equal(address.status, 200);
    const addressId = address.data.address.id as string;

    const restaurants = await requestJson({ baseUrl, method: "GET", path: "/restaurants" });
    const restaurantId = restaurants.data.restaurants[0].id as string;
    const menu = await requestJson({
      baseUrl,
      method: "GET",
      path: `/restaurants/${restaurantId}/menu`,
    });
    const menuItemId = menu.data.menu[0].id as string;

    const orderBody = {
      restaurantId,
      deliveryAddressId: addressId,
      paymentMethod: "upi",
      items: [{ menuItemId, quantity: 1 }],
    };

    const idemOrderHeaders = { "Idempotency-Key": "itest-order-1" };
    const o1 = await requestJson({
      baseUrl,
      method: "POST",
      path: "/checkout/place-order",
      token,
      body: orderBody,
      headers: idemOrderHeaders,
    });
    const o2 = await requestJson({
      baseUrl,
      method: "POST",
      path: "/checkout/place-order",
      token,
      body: orderBody,
      headers: idemOrderHeaders,
    });
    assert.equal(o1.status, 200);
    assert.equal(o2.status, 200);
    assert.equal(o1.data.orderId, o2.data.orderId);

    const idemPayHeaders = { "Idempotency-Key": "itest-upi-1" };
    const p1 = await requestJson({
      baseUrl,
      method: "POST",
      path: "/payments/upi/initiate",
      token,
      headers: idemPayHeaders,
      body: { orderId: o1.data.orderId, amount: o1.data.paymentDetails.amount },
    });
    const p2 = await requestJson({
      baseUrl,
      method: "POST",
      path: "/payments/upi/initiate",
      token,
      headers: idemPayHeaders,
      body: { orderId: o1.data.orderId, amount: o1.data.paymentDetails.amount },
    });
    assert.equal(p1.status, 200);
    assert.equal(p2.status, 200);
    assert.equal(p1.data.transactionId, p2.data.transactionId);
  } finally {
    server.close();
  }
});

test("payment webhook replay is safely ignored after first processing", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const phone = `+91777${Date.now().toString().slice(-7)}`;
    await requestJson({ baseUrl, method: "POST", path: "/auth/send-otp", body: { phone } });
    const verify = await requestJson({
      baseUrl,
      method: "POST",
      path: "/auth/verify-otp",
      body: { phone, otp: "123456" },
    });
    const token = verify.data.token as string;

    const address = await requestJson({
      baseUrl,
      method: "POST",
      path: "/addresses",
      token,
      body: { label: "home", address: "Replay Test Road", lat: 12.97, lng: 77.59 },
    });
    const addressId = address.data.address.id as string;

    const restaurants = await requestJson({ baseUrl, method: "GET", path: "/restaurants" });
    const restaurantId = restaurants.data.restaurants[0].id as string;
    const menu = await requestJson({ baseUrl, method: "GET", path: `/restaurants/${restaurantId}/menu` });
    const menuItemId = menu.data.menu[0].id as string;

    const order = await requestJson({
      baseUrl,
      method: "POST",
      path: "/checkout/place-order",
      token,
      headers: { "Idempotency-Key": "itest-webhook-order-1" },
      body: {
        restaurantId,
        deliveryAddressId: addressId,
        paymentMethod: "upi",
        items: [{ menuItemId, quantity: 1 }],
      },
    });
    assert.equal(order.status, 200);

    const upi = await requestJson({
      baseUrl,
      method: "POST",
      path: "/payments/upi/initiate",
      token,
      headers: { "Idempotency-Key": "itest-webhook-upi-1" },
      body: { orderId: order.data.orderId, amount: order.data.paymentDetails.amount },
    });
    assert.equal(upi.status, 200);

    const payload = {
      eventType: "payment.succeeded",
      transactionId: upi.data.transactionId,
      amount: order.data.paymentDetails.amount,
    };
    const signature = signWebhookPayload(payload);
    const w1 = await requestJson({
      baseUrl,
      method: "POST",
      path: "/payments/webhooks/gateway",
      headers: { "x-webhook-signature": signature },
      body: payload,
    });
    const w2 = await requestJson({
      baseUrl,
      method: "POST",
      path: "/payments/webhooks/gateway",
      headers: { "x-webhook-signature": signature },
      body: payload,
    });
    assert.equal(w1.status, 200);
    assert.equal(w2.status, 200);
    assert.equal(w1.data.replay, undefined);
    assert.equal(w2.data.replay, true);
  } finally {
    server.close();
  }
});

test("admin persisted payout audit and dispatch flows are operational", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const admin = await requestJson({
      baseUrl,
      method: "POST",
      path: "/auth/login",
      body: { role: "admin", email: "admin@foodiego.in" },
    });
    assert.equal(admin.status, 200);
    const token = admin.data.token as string;

    const payouts = await requestJson({
      baseUrl,
      method: "GET",
      path: "/admin/payouts",
      token,
    });
    assert.equal(payouts.status, 200);
    assert.ok((payouts.data.items || []).length >= 1);
    const payoutId = payouts.data.items[0].id as string;

    const monitoringAlerts = await requestJson({
      baseUrl,
      method: "GET",
      path: "/admin/monitoring/alerts",
      token,
    });
    assert.equal(monitoringAlerts.status, 200);
    assert.ok(Array.isArray(monitoringAlerts.data.alerts));

    const processing = await requestJson({
      baseUrl,
      method: "POST",
      path: `/admin/payouts/${payoutId}/processing`,
      token,
    });
    assert.equal(processing.status, 200);

    const paid = await requestJson({
      baseUrl,
      method: "POST",
      path: `/admin/payouts/${payoutId}/paid`,
      token,
    });
    assert.equal(paid.status, 200);

    const audit = await requestJson({
      baseUrl,
      method: "POST",
      path: "/admin/audit-logs",
      token,
      body: {
        action: "itest_admin_action",
        targetType: "payout",
        targetId: payoutId,
        outcome: "success",
      },
    });
    assert.equal(audit.status, 200);

    await prisma.dispatchRider.updateMany({
      data: { isAvailable: true },
    });

    const board = await requestJson({
      baseUrl,
      method: "GET",
      path: "/admin/dispatch/board?limit=5",
      token,
    });
    assert.equal(board.status, 200);
    assert.ok((board.data.riders || []).length >= 1);
    const riderId = board.data.riders.find((r: any) => r.isAvailable)?.id || (board.data.riders[0].id as string);
    const orderId = `itest_admin_dispatch_${Date.now()}`;
    await prisma.dispatchOrder.upsert({
      where: { id: orderId },
      update: {
        status: "ready_for_pickup",
        riderId: null,
        riderName: null,
        proofOtp: null,
        updatedAt: new Date(),
      },
      create: {
        id: orderId,
        restaurantName: "Admin Dispatch Flow",
        amount: 350,
        status: "ready_for_pickup",
      },
    });

    const assign = await requestJson({
      baseUrl,
      method: "POST",
      path: `/admin/dispatch/orders/${orderId}/assign`,
      token,
      body: { riderId },
    });
    assert.equal(assign.status, 200);

    const delivered = await requestJson({
      baseUrl,
      method: "POST",
      path: `/admin/dispatch/orders/${orderId}/status`,
      token,
      body: { status: "delivered", proofOtp: "987654" },
    });
    assert.equal(delivered.status, 200);
    assert.equal(delivered.data.order.status, "delivered");
  } finally {
    server.close();
  }
});

test("dispatch assignment is conflict-safe for rider availability", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const admin = await requestJson({
      baseUrl,
      method: "POST",
      path: "/auth/login",
      body: { role: "admin", email: "admin@foodiego.in" },
    });
    assert.equal(admin.status, 200);
    const token = admin.data.token as string;

    await prisma.dispatchRider.updateMany({
      data: { isAvailable: true },
    });

    const board = await requestJson({
      baseUrl,
      method: "GET",
      path: "/admin/dispatch/board?limit=5",
      token,
    });
    assert.equal(board.status, 200);
    assert.ok((board.data.riders || []).length >= 1);

    const riderId = board.data.riders.find((r: any) => r.isAvailable)?.id || (board.data.riders[0].id as string);
    const existingOrderId = `itest_dispatch_primary_${Date.now()}`;
    await prisma.dispatchOrder.upsert({
      where: { id: existingOrderId },
      update: {
        status: "ready_for_pickup",
        riderId: null,
        riderName: null,
        proofOtp: null,
        updatedAt: new Date(),
      },
      create: {
        id: existingOrderId,
        restaurantName: "Dispatch Primary",
        amount: 420,
        status: "ready_for_pickup",
      },
    });

    const extraOrderId = `itest_dispatch_secondary_${Date.now()}`;
    await prisma.dispatchOrder.upsert({
      where: { id: extraOrderId },
      update: {
        status: "ready_for_pickup",
        riderId: null,
        riderName: null,
        proofOtp: null,
        updatedAt: new Date(),
      },
      create: {
        id: extraOrderId,
        restaurantName: "Conflict Check Kitchen",
        amount: 299,
        status: "ready_for_pickup",
      },
    });

    const firstAssign = await requestJson({
      baseUrl,
      method: "POST",
      path: `/admin/dispatch/orders/${existingOrderId}/assign`,
      token,
      body: { riderId },
    });
    assert.equal(firstAssign.status, 200);

    const secondAssign = await requestJson({
      baseUrl,
      method: "POST",
      path: `/admin/dispatch/orders/${extraOrderId}/assign`,
      token,
      body: { riderId },
    });
    assert.equal(secondAssign.status, 409);
    assert.equal(secondAssign.data?.error?.code, "CONFLICT");
  } finally {
    server.close();
  }
});

test("seller status updates reject out-of-order transitions and keep tracking monotonic", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const phone = `+91666${Date.now().toString().slice(-7)}`;
    await requestJson({ baseUrl, method: "POST", path: "/auth/send-otp", body: { phone } });
    const verify = await requestJson({
      baseUrl,
      method: "POST",
      path: "/auth/verify-otp",
      body: { phone, otp: "123456" },
    });
    assert.equal(verify.status, 200);
    const customerToken = verify.data.token as string;

    const address = await requestJson({
      baseUrl,
      method: "POST",
      path: "/addresses",
      token: customerToken,
      body: { label: "home", address: "Seller Flow Street", lat: 12.97, lng: 77.59 },
    });
    assert.equal(address.status, 200);
    const deliveryAddressId = address.data.address.id as string;

    const restaurants = await requestJson({ baseUrl, method: "GET", path: "/restaurants" });
    const restaurantId = restaurants.data.restaurants[0].id as string;
    const menu = await requestJson({ baseUrl, method: "GET", path: `/restaurants/${restaurantId}/menu` });
    const menuItemId = menu.data.menu[0].id as string;

    const orderResp = await requestJson({
      baseUrl,
      method: "POST",
      path: "/checkout/place-order",
      token: customerToken,
      headers: { "Idempotency-Key": `itest-seller-order-${Date.now()}` },
      body: {
        restaurantId,
        deliveryAddressId,
        paymentMethod: "cod",
        items: [{ menuItemId, quantity: 1 }],
      },
    });
    assert.equal(orderResp.status, 200);
    const orderId = orderResp.data.orderId as string;

    const sellerLogin = await requestJson({
      baseUrl,
      method: "POST",
      path: "/auth/login",
      body: { role: "seller", email: "seller@foodiego.in" },
    });
    assert.equal(sellerLogin.status, 200);
    const sellerToken = sellerLogin.data.token as string;

    const accept = await requestJson({
      baseUrl,
      method: "POST",
      path: `/seller/restaurants/${restaurantId}/orders/${orderId}/accept`,
      token: sellerToken,
      body: {},
    });
    assert.equal(accept.status, 200);

    const startPrep = await requestJson({
      baseUrl,
      method: "POST",
      path: `/seller/restaurants/${restaurantId}/orders/${orderId}/start-prep`,
      token: sellerToken,
      body: {},
    });
    assert.equal(startPrep.status, 200);

    const outOfOrderAccept = await requestJson({
      baseUrl,
      method: "POST",
      path: `/seller/restaurants/${restaurantId}/orders/${orderId}/accept`,
      token: sellerToken,
      body: {},
    });
    assert.equal(outOfOrderAccept.status, 409);
    assert.equal(outOfOrderAccept.data?.error?.code, "CONFLICT");

    const tracking = await requestJson({
      baseUrl,
      method: "GET",
      path: `/orders/${orderId}/tracking`,
      token: customerToken,
    });
    assert.equal(tracking.status, 200);
    const statuses = (tracking.data.events || []).map((event: any) => event.status);
    assert.ok(statuses.includes("pending"));
    assert.ok(statuses.includes("confirmed"));
    assert.ok(statuses.includes("preparing"));
    assert.equal(statuses.filter((status: string) => status === "confirmed").length, 1);
  } finally {
    server.close();
  }
});
