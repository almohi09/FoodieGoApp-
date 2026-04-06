import crypto from "node:crypto";
import { Router } from "express";
import idempotencyRepository from "../../db/repositories/idempotencyRepository.js";
import asyncJobRepository from "../../db/repositories/asyncJobRepository.js";
import orderRepository from "../../db/repositories/orderRepository.js";
import paymentRepository from "../../db/repositories/paymentRepository.js";
import env from "../../config/env.js";
import { sendApiError } from "../../lib/httpErrors.js";
import { validatePaymentInitiateInput } from "../../lib/validation.js";
import { requireAuth, requireRole, type AuthedRequest } from "../../middleware/auth.js";
import { db, util } from "../../store.js";
import { PAYMENT_WEBHOOK_RECONCILE_JOB } from "../../workers/paymentWebhookWorker.js";

const router = Router();

const getIdempotencyKey = (req: any) =>
  String(req.headers["idempotency-key"] || req.headers["x-idempotency-key"] || "").trim();

router.post("/payments/upi/initiate", requireAuth, (req: AuthedRequest, res) => {
  const parsed = validatePaymentInitiateInput(req.body);
  if (!parsed.ok) {
    return sendApiError(res, 400, "VALIDATION_ERROR", parsed.message, parsed.details);
  }
  const payload = parsed.data;

  if (paymentRepository.isEnabled()) {
    return (async () => {
      const idempotencyKey = getIdempotencyKey(req);
      if (idempotencyRepository.isEnabled()) {
        if (!idempotencyKey) {
          return sendApiError(res, 400, "VALIDATION_ERROR", "Missing Idempotency-Key header", {
            field: "Idempotency-Key",
          });
        }
        const cached = await idempotencyRepository.find(req.session!.userId, "payments_upi_initiate", idempotencyKey);
        if (cached) {
          return res.status(cached.statusCode).json(cached.response);
        }
      }
      const order = await orderRepository.getOrderById(payload.orderId);
      if (!order) {
        return sendApiError(res, 404, "NOT_FOUND", "Order not found");
      }
      const transactionId = `upi_${crypto.randomUUID().slice(0, 10)}`;
      await paymentRepository.upsertPaymentByOrder({
        orderId: payload.orderId,
        status: "pending",
        method: "upi",
        transactionId,
        source: "gateway",
        amount: Number(payload.amount || order.finalAmount || 0),
      });
      const response = {
        upiDeepLink: `upi://pay?pa=merchant@upi&am=${Number(payload.amount || order.finalAmount || 0)}&tn=${payload.orderId}`,
        transactionId,
      };
      if (idempotencyRepository.isEnabled()) {
        await idempotencyRepository.save(req.session!.userId, "payments_upi_initiate", idempotencyKey, response, 200);
      }
      return res.json(response);
    })();
  }

  const orderId = payload.orderId;
  const transactionId = `upi_${crypto.randomUUID().slice(0, 10)}`;
  db.paymentByOrderId.set(orderId, {
    orderId,
    status: "pending",
    method: "upi",
    transactionId,
    source: "gateway",
    lastUpdatedAt: util.nowIso(),
  });
  return res.json({
    upiDeepLink: `upi://pay?pa=merchant@upi&am=${Number(req.body?.amount || 0)}&tn=${orderId}`,
    transactionId,
  });
});

router.get("/payments/upi/verify/:transactionId", requireAuth, (req, res) => {
  if (paymentRepository.isEnabled()) {
    return (async () => {
      const payment = await paymentRepository.updatePaymentStatusByTransactionId(
        req.params.transactionId,
        "completed",
        "gateway",
      );
      if (!payment) {
        return res.status(404).json({ success: false, status: "failed", error: "Transaction not found" });
      }
      return res.json({
        success: true,
        status: "completed",
        transactionId: payment.transactionId,
        source: payment.source,
        lastUpdatedAt: payment.updatedAt,
        reconciliationRequired: false,
      });
    })();
  }

  const payment = Array.from(db.paymentByOrderId.values()).find((p) => p.transactionId === req.params.transactionId);
  if (!payment) {
    return res.status(404).json({ success: false, status: "failed", error: "Transaction not found" });
  }
  payment.status = "completed";
  payment.lastUpdatedAt = util.nowIso();
  db.paymentByOrderId.set(payment.orderId, payment);
  return res.json({
    success: true,
    status: "completed",
    transactionId: payment.transactionId,
    source: payment.source,
    lastUpdatedAt: payment.lastUpdatedAt,
    reconciliationRequired: false,
  });
});

router.post("/payments/card/initiate", requireAuth, (req: AuthedRequest, res) => {
  const parsed = validatePaymentInitiateInput(req.body);
  if (!parsed.ok) {
    return sendApiError(res, 400, "VALIDATION_ERROR", parsed.message, parsed.details);
  }
  const payload = parsed.data;

  if (paymentRepository.isEnabled()) {
    return (async () => {
      const idempotencyKey = getIdempotencyKey(req);
      if (idempotencyRepository.isEnabled()) {
        if (!idempotencyKey) {
          return sendApiError(res, 400, "VALIDATION_ERROR", "Missing Idempotency-Key header", {
            field: "Idempotency-Key",
          });
        }
        const cached = await idempotencyRepository.find(req.session!.userId, "payments_card_initiate", idempotencyKey);
        if (cached) {
          return res.status(cached.statusCode).json(cached.response);
        }
      }
      const order = await orderRepository.getOrderById(payload.orderId);
      if (!order) {
        return sendApiError(res, 404, "NOT_FOUND", "Order not found");
      }
      const transactionId = `card_${crypto.randomUUID().slice(0, 10)}`;
      await paymentRepository.upsertPaymentByOrder({
        orderId: payload.orderId,
        status: "pending",
        method: "card",
        transactionId,
        source: "gateway",
        amount: Number(payload.amount || order.finalAmount || 0),
      });
      const response = {
        paymentUrl: `https://payments.foodiego.local/checkout/${transactionId}`,
        transactionId,
      };
      if (idempotencyRepository.isEnabled()) {
        await idempotencyRepository.save(req.session!.userId, "payments_card_initiate", idempotencyKey, response, 200);
      }
      return res.json(response);
    })();
  }

  const orderId = payload.orderId;
  const transactionId = `card_${crypto.randomUUID().slice(0, 10)}`;
  db.paymentByOrderId.set(orderId, {
    orderId,
    status: "pending",
    method: "card",
    transactionId,
    source: "gateway",
    lastUpdatedAt: util.nowIso(),
  });
  return res.json({
    paymentUrl: `https://payments.foodiego.local/checkout/${transactionId}`,
    transactionId,
  });
});

router.get("/payments/card/verify/:transactionId", requireAuth, (req, res) => {
  if (paymentRepository.isEnabled()) {
    return (async () => {
      const payment = await paymentRepository.updatePaymentStatusByTransactionId(
        req.params.transactionId,
        "completed",
        "gateway",
      );
      if (!payment) {
        return res.status(404).json({ success: false, status: "failed", error: "Transaction not found" });
      }
      return res.json({
        success: true,
        status: "completed",
        transactionId: payment.transactionId,
        source: payment.source,
        lastUpdatedAt: payment.updatedAt,
        reconciliationRequired: false,
      });
    })();
  }

  const payment = Array.from(db.paymentByOrderId.values()).find((p) => p.transactionId === req.params.transactionId);
  if (!payment) {
    return res.status(404).json({ success: false, status: "failed", error: "Transaction not found" });
  }
  payment.status = "completed";
  payment.lastUpdatedAt = util.nowIso();
  db.paymentByOrderId.set(payment.orderId, payment);
  return res.json({
    success: true,
    status: "completed",
    transactionId: payment.transactionId,
    source: payment.source,
    lastUpdatedAt: payment.lastUpdatedAt,
    reconciliationRequired: false,
  });
});

router.post("/payments/cod/confirm/:orderId", requireAuth, (req, res) => {
  if (paymentRepository.isEnabled()) {
    return (async () => {
      const order = await orderRepository.getOrderById(req.params.orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }
      await paymentRepository.upsertPaymentByOrder({
        orderId: req.params.orderId,
        status: "completed",
        method: "cod",
        source: "unknown",
        amount: Number(order.finalAmount || 0),
      });
      return res.json({ success: true });
    })();
  }

  const orderId = req.params.orderId;
  const payment = db.paymentByOrderId.get(orderId) || {
    orderId,
    status: "pending",
    method: "cod",
    source: "unknown",
    lastUpdatedAt: util.nowIso(),
  };
  payment.status = "completed";
  payment.method = "cod";
  payment.lastUpdatedAt = util.nowIso();
  db.paymentByOrderId.set(orderId, payment as any);
  res.json({ success: true });
});

router.get("/payments/status/:orderId", requireAuth, (req, res) => {
  if (paymentRepository.isEnabled()) {
    return (async () => {
      const payment = await paymentRepository.getPaymentByOrderId(req.params.orderId);
      if (!payment) {
        return res.json({ success: true, status: "pending", source: "unknown", lastUpdatedAt: util.nowIso() });
      }
      return res.json({
        success: payment.status === "completed",
        status: payment.status,
        transactionId: payment.transactionId,
        source: payment.source,
        lastUpdatedAt: payment.updatedAt,
        reconciliationRequired: payment.status === "pending",
      });
    })();
  }

  const payment = db.paymentByOrderId.get(req.params.orderId);
  if (!payment) {
    return res.json({ success: true, status: "pending", source: "unknown", lastUpdatedAt: util.nowIso() });
  }
  return res.json({
    success: payment.status === "completed",
    status: payment.status,
    transactionId: payment.transactionId,
    source: payment.source,
    lastUpdatedAt: payment.lastUpdatedAt,
    reconciliationRequired: payment.status === "pending",
  });
});

router.get("/payments/methods", requireAuth, requireRole(["customer"]), (req: AuthedRequest, res) => {
  const methods = db.paymentMethodByUserId.get(req.session!.userId) || [];
  res.json({ methods });
});

router.post("/payments/methods/upi", requireAuth, requireRole(["customer"]), (req: AuthedRequest, res) => {
  const userId = req.session!.userId;
  const methods = db.paymentMethodByUserId.get(userId) || [];
  const method = { id: util.id("pm"), type: "upi", isDefault: methods.length === 0, upiId: String(req.body?.upiId || "") };
  methods.push(method);
  db.paymentMethodByUserId.set(userId, methods);
  res.json({ method });
});

router.post("/payments/methods/card", requireAuth, requireRole(["customer"]), (req: AuthedRequest, res) => {
  const userId = req.session!.userId;
  const methods = db.paymentMethodByUserId.get(userId) || [];
  const cardNumber = String(req.body?.cardNumber || "");
  const method = {
    id: util.id("pm"),
    type: "card",
    isDefault: methods.length === 0,
    last4: cardNumber.slice(-4),
    cardType: String(req.body?.cardType || "other"),
    nickname: req.body?.nickname,
  };
  methods.push(method);
  db.paymentMethodByUserId.set(userId, methods);
  res.json({ method });
});

router.delete("/payments/methods/:methodId", requireAuth, requireRole(["customer"]), (req: AuthedRequest, res) => {
  const userId = req.session!.userId;
  const next = (db.paymentMethodByUserId.get(userId) || []).filter((m) => String(m.id) !== req.params.methodId);
  db.paymentMethodByUserId.set(userId, next);
  res.json({ success: true });
});

router.put("/payments/methods/:methodId/default", requireAuth, requireRole(["customer"]), (req: AuthedRequest, res) => {
  const userId = req.session!.userId;
  const methods = db.paymentMethodByUserId.get(userId) || [];
  for (const method of methods) {
    method.isDefault = String(method.id) === req.params.methodId;
  }
  db.paymentMethodByUserId.set(userId, methods);
  res.json({ success: true });
});

router.post("/payments/refund/:orderId", requireAuth, (req: AuthedRequest, res) => {
  if (paymentRepository.isEnabled()) {
    return (async () => {
      const idempotencyKey = getIdempotencyKey(req);
      if (idempotencyRepository.isEnabled()) {
        if (!idempotencyKey) {
          return sendApiError(res, 400, "VALIDATION_ERROR", "Missing Idempotency-Key header", {
            field: "Idempotency-Key",
          });
        }
        const cached = await idempotencyRepository.find(req.session!.userId, "payments_refund_create", idempotencyKey);
        if (cached) {
          return res.status(cached.statusCode).json(cached.response);
        }
      }
      const payment = await paymentRepository.getPaymentByOrderId(req.params.orderId);
      const refund = await paymentRepository.createRefund(req.params.orderId, payment?.id);
      if (!refund) {
        return sendApiError(res, 500, "INTERNAL_ERROR", "Unable to create refund");
      }
      const response = { success: true, refundId: refund.id };
      if (idempotencyRepository.isEnabled()) {
        await idempotencyRepository.save(req.session!.userId, "payments_refund_create", idempotencyKey, response, 200);
      }
      return res.json(response);
    })();
  }

  const refundId = util.id("refund");
  db.refundById.set(refundId, { id: refundId, orderId: req.params.orderId, status: "processing" });
  res.json({ success: true, refundId });
});

router.get("/payments/refund/:refundId/status", requireAuth, (req, res) => {
  if (paymentRepository.isEnabled()) {
    return (async () => {
      const refund = await paymentRepository.getRefundById(req.params.refundId);
      if (!refund) {
        return res.status(404).json({ success: false, message: "Refund not found" });
      }
      return res.json({ success: true, status: refund.status });
    })();
  }

  const refund = db.refundById.get(req.params.refundId);
  if (!refund) {
    return res.status(404).json({ success: false, message: "Refund not found" });
  }
  res.json({ success: true, status: refund.status });
});

router.post("/payments/webhooks/gateway", async (req, res) => {
  if (!paymentRepository.isEnabled()) {
    return sendApiError(res, 503, "CONFLICT", "Webhook endpoint requires Postgres mode");
  }

  const signature = String(req.headers["x-webhook-signature"] || "");
  if (!signature) {
    return sendApiError(res, 401, "UNAUTHORIZED", "Missing webhook signature");
  }

  const secret = env.paymentWebhookSecret;
  const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(req.body || {})).digest("hex");
  if (signature !== expected) {
    return sendApiError(res, 401, "UNAUTHORIZED", "Invalid webhook signature");
  }

  const transactionId = String(req.body?.transactionId || "").trim();
  const eventType = String(req.body?.eventType || "").trim();
  if (!transactionId || !eventType) {
    return sendApiError(res, 400, "VALIDATION_ERROR", "transactionId and eventType are required");
  }

  const payment = await paymentRepository.getPaymentByTransactionId(transactionId);
  if (!payment) {
    return sendApiError(res, 404, "NOT_FOUND", "Payment not found for transaction");
  }

  const replay = await paymentRepository.findWebhookReplay(payment.id, eventType, signature);
  if (replay) {
    return res.json({
      success: true,
      processed: true,
      replay: true,
      transactionId,
      status: payment.status,
    });
  }

  const recorded = await paymentRepository.recordWebhookEvent({
    paymentId: payment.id,
    provider: "gateway",
    eventType,
    signature,
    payload: req.body || {},
    status: "received",
  });

  const queued = await asyncJobRepository.enqueue({
    type: PAYMENT_WEBHOOK_RECONCILE_JOB,
    payload: {
      transactionId,
      eventType,
      webhookEventId: recorded?.id,
    },
    dedupeKey: recorded?.id ? `payment_webhook_event:${recorded.id}` : undefined,
    maxAttempts: 5,
  });

  if (!queued) {
    return sendApiError(res, 500, "INTERNAL_ERROR", "Unable to enqueue webhook reconcile job");
  }

  return res.json({
    success: true,
    processed: false,
    queued: true,
    transactionId,
    jobId: queued.id,
  });
});

export default router;
