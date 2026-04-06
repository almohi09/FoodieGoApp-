import { Router } from "express";
import adminRepository from "../../db/repositories/adminRepository.js";
import asyncJobRepository from "../../db/repositories/asyncJobRepository.js";
import { sendApiError } from "../../lib/httpErrors.js";
import { requireAuth, requireRole, type AuthedRequest } from "../../middleware/auth.js";
import { getMonitoringSnapshot } from "../../monitoring/observability.js";
import { db, util } from "../../store.js";

const router = Router();

router.get("/admin/dashboard/stats", requireAuth, requireRole(["admin"]), async (_req, res) => {
  if (adminRepository.isEnabled()) {
    const stats = await adminRepository.getDashboardStats();
    if (stats) {
      return res.json(stats);
    }
  }
  const totalOrders = db.orders.size;
  const totalRevenue = Array.from(db.orders.values())
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.finalAmount, 0);
  res.json({
    totalOrders,
    activeOrders: Array.from(db.orders.values()).filter(
      (o) => !["delivered", "cancelled", "refunded"].includes(o.status),
    ).length,
    totalRevenue,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    totalUsers: db.users.size,
    totalSellers: db.sellers.size,
    ordersToday: totalOrders,
    revenueToday: totalRevenue,
    newUsersToday: 0,
    newSellersToday: 0,
  });
});

router.get("/admin/alerts", requireAuth, requireRole(["admin"]), (_req, res) => {
  res.json({ alerts: db.alerts });
});

router.get("/admin/reports", requireAuth, requireRole(["admin"]), (_req, res) => {
  res.json({ items: db.reports, total: db.reports.length });
});

router.get("/admin/users", requireAuth, requireRole(["admin"]), async (_req, res) => {
  if (adminRepository.isEnabled()) {
    const users = await adminRepository.getUsers();
    if (users) {
      return res.json({ users, total: users.length });
    }
  }
  res.json({ users: Array.from(db.users.values()), total: db.users.size });
});

router.post("/admin/users/:userId/suspend", requireAuth, requireRole(["admin"]), async (req, res) => {
  if (adminRepository.isEnabled()) {
    const updated = await adminRepository.setUserStatus(req.params.userId, "suspended");
    if (!updated) {
      return sendApiError(res, 404, "NOT_FOUND", "User not found");
    }
    return res.json({ success: true });
  }
  const user = db.users.get(req.params.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  user.status = "suspended";
  db.users.set(user.id, user);
  return res.json({ success: true });
});

router.post("/admin/users/:userId/reactivate", requireAuth, requireRole(["admin"]), async (req, res) => {
  if (adminRepository.isEnabled()) {
    const updated = await adminRepository.setUserStatus(req.params.userId, "active");
    if (!updated) {
      return sendApiError(res, 404, "NOT_FOUND", "User not found");
    }
    return res.json({ success: true });
  }
  const user = db.users.get(req.params.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  user.status = "active";
  db.users.set(user.id, user);
  return res.json({ success: true });
});

router.get("/admin/sellers", requireAuth, requireRole(["admin"]), async (_req, res) => {
  if (adminRepository.isEnabled()) {
    const sellers = await adminRepository.getSellers();
    if (sellers) {
      return res.json({ sellers, total: sellers.length });
    }
  }
  const sellers = Array.from(db.sellers.values());
  res.json({ sellers, total: sellers.length });
});

router.post("/admin/sellers/:sellerId/suspend", requireAuth, requireRole(["admin"]), async (req, res) => {
  if (adminRepository.isEnabled()) {
    const updated = await adminRepository.setSellerStatus(req.params.sellerId, "suspended");
    if (!updated) {
      return sendApiError(res, 404, "NOT_FOUND", "Seller not found");
    }
    return res.json({ success: true });
  }
  const seller = db.sellers.get(req.params.sellerId);
  if (!seller) {
    return res.status(404).json({ message: "Seller not found" });
  }
  seller.status = "suspended";
  db.sellers.set(seller.id, seller);
  return res.json({ success: true });
});

router.post("/admin/sellers/:sellerId/reactivate", requireAuth, requireRole(["admin"]), async (req, res) => {
  if (adminRepository.isEnabled()) {
    const updated = await adminRepository.setSellerStatus(req.params.sellerId, "approved");
    if (!updated) {
      return sendApiError(res, 404, "NOT_FOUND", "Seller not found");
    }
    return res.json({ success: true });
  }
  const seller = db.sellers.get(req.params.sellerId);
  if (!seller) {
    return res.status(404).json({ message: "Seller not found" });
  }
  seller.status = "approved";
  db.sellers.set(seller.id, seller);
  return res.json({ success: true });
});

router.get("/admin/payouts/summary", requireAuth, requireRole(["admin"]), async (_req, res) => {
  if (adminRepository.isEnabled()) {
    const summary = await adminRepository.getPayoutSummary();
    if (summary) {
      return res.json(summary);
    }
  }
  const payouts = Array.from(db.payouts.values());
  const pending = payouts.filter((p) => p.status === "pending");
  const processing = payouts.filter((p) => p.status === "processing");
  res.json({
    pendingCount: pending.length,
    pendingAmount: pending.reduce((sum, p) => sum + p.amount, 0),
    processingCount: processing.length,
    processingAmount: processing.reduce((sum, p) => sum + p.amount, 0),
    paidToday: payouts.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0),
  });
});

router.get("/admin/payouts", requireAuth, requireRole(["admin"]), async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  if (adminRepository.isEnabled()) {
    const items = await adminRepository.getPayouts(status);
    if (items) {
      return res.json({ items, total: items.length });
    }
  }
  let items = Array.from(db.payouts.values());
  if (status) {
    items = items.filter((item) => item.status === status);
  }
  res.json({ items, total: items.length });
});

router.post("/admin/payouts/:payoutId/processing", requireAuth, requireRole(["admin"]), async (req, res) => {
  if (adminRepository.isEnabled()) {
    const updated = await adminRepository.setPayoutStatus(req.params.payoutId, "processing");
    if (!updated) {
      return sendApiError(res, 404, "NOT_FOUND", "Payout not found");
    }
    return res.json({ success: true });
  }
  const payout = db.payouts.get(req.params.payoutId);
  if (!payout) {
    return res.status(404).json({ success: false, message: "Payout not found" });
  }
  payout.status = "processing";
  db.payouts.set(payout.id, payout);
  res.json({ success: true });
});

router.post("/admin/payouts/:payoutId/paid", requireAuth, requireRole(["admin"]), async (req, res) => {
  if (adminRepository.isEnabled()) {
    const updated = await adminRepository.setPayoutStatus(req.params.payoutId, "paid");
    if (!updated) {
      return sendApiError(res, 404, "NOT_FOUND", "Payout not found");
    }
    return res.json({ success: true });
  }
  const payout = db.payouts.get(req.params.payoutId);
  if (!payout) {
    return res.status(404).json({ success: false, message: "Payout not found" });
  }
  payout.status = "paid";
  db.payouts.set(payout.id, payout);
  res.json({ success: true });
});

router.post("/admin/payouts/:payoutId/hold", requireAuth, requireRole(["admin"]), async (req, res) => {
  if (adminRepository.isEnabled()) {
    const updated = await adminRepository.setPayoutStatus(req.params.payoutId, "on_hold");
    if (!updated) {
      return sendApiError(res, 404, "NOT_FOUND", "Payout not found");
    }
    return res.json({ success: true });
  }
  const payout = db.payouts.get(req.params.payoutId);
  if (!payout) {
    return res.status(404).json({ success: false, message: "Payout not found" });
  }
  payout.status = "on_hold";
  db.payouts.set(payout.id, payout);
  res.json({ success: true });
});

router.post("/admin/audit-logs", requireAuth, requireRole(["admin", "seller"]), async (req: AuthedRequest, res) => {
  if (adminRepository.isEnabled()) {
    await adminRepository.createAuditLog({
      actorRole: req.body?.actorRole || (req.session?.role === "seller" ? "seller" : "admin"),
      actorId: req.body?.actorId,
      action: String(req.body?.action || "unknown"),
      targetType: String(req.body?.targetType || "unknown"),
      targetId: String(req.body?.targetId || "unknown"),
      outcome: req.body?.outcome === "failure" ? "failure" : "success",
      errorCode: req.body?.errorCode,
      details: req.body?.details,
    });
    return res.json({ success: true });
  }
  db.auditLogs.unshift({
    id: util.id("audit"),
    actorRole: req.body?.actorRole || (req.session?.role === "seller" ? "seller" : "admin"),
    actorId: req.body?.actorId,
    action: String(req.body?.action || "unknown"),
    targetType: String(req.body?.targetType || "unknown"),
    targetId: String(req.body?.targetId || "unknown"),
    outcome: req.body?.outcome === "failure" ? "failure" : "success",
    errorCode: req.body?.errorCode,
    details: req.body?.details,
    createdAt: util.nowIso(),
  });
  db.auditLogs = db.auditLogs.slice(0, 200);
  res.json({ success: true });
});

router.get("/admin/audit-logs", requireAuth, requireRole(["admin", "seller"]), async (req, res) => {
  const limit = Number(req.query.limit || 20);
  if (adminRepository.isEnabled()) {
    const items = await adminRepository.getAuditLogs(limit);
    if (items) {
      return res.json({ items });
    }
  }
  res.json({ items: db.auditLogs.slice(0, limit) });
});

router.get("/admin/dispatch/board", requireAuth, requireRole(["admin"]), async (req, res) => {
  const limit = Number(req.query.limit || 8);
  if (adminRepository.isEnabled()) {
    const board = await adminRepository.getDispatchBoard(limit);
    if (board) {
      return res.json(board);
    }
  }
  res.json({ orders: db.dispatchOrders.slice(0, limit), riders: db.dispatchRiders });
});

router.post("/admin/dispatch/orders/:orderId/assign", requireAuth, requireRole(["admin"]), async (req, res) => {
  if (adminRepository.isEnabled()) {
    const riderId = String(req.body?.riderId || "");
    if (!riderId) {
      return sendApiError(res, 400, "VALIDATION_ERROR", "riderId is required", { field: "riderId" });
    }
    const result = await adminRepository.assignDispatchOrder(req.params.orderId, riderId);
    if (!result) {
      return sendApiError(res, 500, "INTERNAL_ERROR", "Dispatch assignment unavailable");
    }
    if (result.ok === false) {
      if (result.code === "ORDER_NOT_FOUND" || result.code === "RIDER_NOT_FOUND") {
        return sendApiError(res, 404, "NOT_FOUND", "Order or rider not found");
      }
      return sendApiError(res, 409, "CONFLICT", "Rider already assigned or unavailable", {
        code: result.code,
      });
    }
    return res.json({ order: result.order });
  }
  const riderId = String(req.body?.riderId || "");
  const rider = db.dispatchRiders.find((r) => r.id === riderId);
  const order = db.dispatchOrders.find((o) => o.id === req.params.orderId);
  if (!order || !rider) {
    return res.status(404).json({ message: "Order or rider not found" });
  }
  order.status = "assigned";
  order.riderId = rider.id;
  order.riderName = rider.name;
  order.updatedAt = util.nowIso();
  rider.isAvailable = false;
  res.json({ order });
});

router.post("/admin/dispatch/orders/:orderId/status", requireAuth, requireRole(["admin"]), async (req, res) => {
  if (adminRepository.isEnabled()) {
    const order = await adminRepository.updateDispatchOrderStatus(
      req.params.orderId,
      String(req.body?.status || ""),
      req.body?.proofOtp,
    );
    if (!order) {
      return sendApiError(res, 404, "NOT_FOUND", "Order not found");
    }
    return res.json({ order });
  }
  const order = db.dispatchOrders.find((o) => o.id === req.params.orderId);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  order.status = req.body?.status || order.status;
  order.proofOtp = req.body?.proofOtp || order.proofOtp;
  order.updatedAt = util.nowIso();
  if (order.status === "delivered" && order.riderId) {
    const rider = db.dispatchRiders.find((r) => r.id === order.riderId);
    if (rider) {
      rider.isAvailable = true;
    }
  }
  res.json({ order });
});

router.get("/admin/monitoring/alerts", requireAuth, requireRole(["admin"]), (_req, res) => {
  const monitoring = getMonitoringSnapshot();
  return res.json({
    alerts: monitoring.activeAlerts,
    rolling: monitoring.rolling,
    thresholds: monitoring.thresholds,
    sinkConfigured: monitoring.sinkConfigured,
  });
});

router.get("/admin/worker/dead-letters", requireAuth, requireRole(["admin"]), async (req, res) => {
  if (!asyncJobRepository.isEnabled()) {
    return sendApiError(res, 503, "CONFLICT", "Dead-letter operations require Postgres mode");
  }
  const limit = Number(req.query.limit || 20);
  const items = (await asyncJobRepository.listDeadLetters(limit)) || [];
  return res.json({ items, total: items.length });
});

router.post("/admin/worker/dead-letters/:deadLetterId/replay", requireAuth, requireRole(["admin"]), async (req, res) => {
  if (!asyncJobRepository.isEnabled()) {
    return sendApiError(res, 503, "CONFLICT", "Dead-letter operations require Postgres mode");
  }
  const replayed = await asyncJobRepository.replayDeadLetter(req.params.deadLetterId);
  if (!replayed) {
    return sendApiError(res, 404, "NOT_FOUND", "Dead letter job not found");
  }
  return res.json({ success: true, replayedJobId: replayed.id, type: replayed.type });
});

export default router;
