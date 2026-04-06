import { Router } from "express";
import sellerRepository from "../../db/repositories/sellerRepository.js";
import { sendApiError } from "../../lib/httpErrors.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { db, util } from "../../store.js";

const router = Router();

router.get(
  "/seller/restaurants/:restaurantId/operational-status",
  requireAuth,
  requireRole(["seller", "admin"]),
  async (req, res) => {
    if (sellerRepository.isEnabled()) {
      const restaurant = await sellerRepository.getRestaurant(req.params.restaurantId);
      if (!restaurant) {
        return sendApiError(res, 404, "NOT_FOUND", "Restaurant not found");
      }
      return res.json({ isOpen: restaurant.isOpen });
    }
    const restaurant = db.restaurants.get(req.params.restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    return res.json({ isOpen: restaurant.isOpen });
  },
);

router.patch(
  "/seller/restaurants/:restaurantId/operational-status",
  requireAuth,
  requireRole(["seller", "admin"]),
  async (req, res) => {
    if (sellerRepository.isEnabled()) {
      const updated = await sellerRepository.setRestaurantOperationalStatus(req.params.restaurantId, Boolean(req.body?.isOpen));
      if (!updated) {
        return sendApiError(res, 404, "NOT_FOUND", "Restaurant not found");
      }
      return res.json({ isOpen: updated.isOpen, reason: req.body?.reason });
    }
    const restaurant = db.restaurants.get(req.params.restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    restaurant.isOpen = Boolean(req.body?.isOpen);
    db.restaurants.set(restaurant.id, restaurant);
    return res.json({ isOpen: restaurant.isOpen, reason: req.body?.reason });
  },
);

router.get(
  "/seller/restaurants/:restaurantId/orders/stats",
  requireAuth,
  requireRole(["seller", "admin"]),
  async (req, res) => {
    if (sellerRepository.isEnabled()) {
      const orders = (await sellerRepository.getRestaurantOrders(req.params.restaurantId)) || [];
      const completedToday = orders.filter((o) => o.status === "delivered").length;
      const pendingOrders = orders.filter((o) => o.status === "pending").length;
      const inProgressOrders = orders.filter((o) => ["confirmed", "preparing", "out_for_delivery"].includes(o.status)).length;
      const revenueToday = orders.filter((o) => o.status === "delivered").reduce((sum, o) => sum + o.finalAmount, 0);
      return res.json({
        totalOrders: orders.length,
        pendingOrders,
        inProgressOrders,
        completedToday,
        cancelledToday: orders.filter((o) => o.status === "cancelled").length,
        averagePrepTime: 18,
        revenueToday,
        revenueWeek: revenueToday,
      });
    }
    const orders = Array.from(db.orders.values()).filter((o) => o.restaurantId === req.params.restaurantId);
    const completedToday = orders.filter((o) => o.status === "delivered").length;
    const pendingOrders = orders.filter((o) => o.status === "pending").length;
    const inProgressOrders = orders.filter((o) =>
      ["confirmed", "preparing", "out_for_delivery"].includes(o.status),
    ).length;
    const revenueToday = orders
      .filter((o) => o.status === "delivered")
      .reduce((sum, o) => sum + o.finalAmount, 0);
    res.json({
      totalOrders: orders.length,
      pendingOrders,
      inProgressOrders,
      completedToday,
      cancelledToday: orders.filter((o) => o.status === "cancelled").length,
      averagePrepTime: 18,
      revenueToday,
      revenueWeek: revenueToday,
    });
  },
);

router.get(
  "/seller/restaurants/:restaurantId/orders/pending",
  requireAuth,
  requireRole(["seller", "admin"]),
  async (req, res) => {
    if (sellerRepository.isEnabled()) {
      const orders = (await sellerRepository.getPendingRestaurantOrders(req.params.restaurantId)) || [];
      return res.json({ orders });
    }
    const orders = Array.from(db.orders.values()).filter(
      (o) => o.restaurantId === req.params.restaurantId && ["pending", "confirmed", "preparing"].includes(o.status),
    );
    res.json({ orders });
  },
);

router.post(
  "/seller/restaurants/:restaurantId/orders/:orderId/accept",
  requireAuth,
  requireRole(["seller", "admin"]),
  async (req, res) => {
    if (sellerRepository.isEnabled()) {
      const result = await sellerRepository.updateOrderStatus(req.params.orderId, {
        status: "confirmed",
        acceptedAt: new Date(),
      });
      if (!result) {
        return sendApiError(res, 404, "NOT_FOUND", "Order not found");
      }
      if (result.ok !== true) {
        if (result.code === "NOT_FOUND") {
          return sendApiError(res, 404, "NOT_FOUND", "Order not found");
        }
        return sendApiError(res, 409, "CONFLICT", "Out-of-order order status transition");
      }
      return res.json({ order: result.order });
    }
    const order = db.orders.get(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    order.status = "confirmed";
    order.acceptedAt = util.nowIso();
    db.orders.set(order.id, order);
    res.json({ order });
  },
);

router.post(
  "/seller/restaurants/:restaurantId/orders/:orderId/reject",
  requireAuth,
  requireRole(["seller", "admin"]),
  async (req, res) => {
    if (sellerRepository.isEnabled()) {
      const result = await sellerRepository.updateOrderStatus(req.params.orderId, { status: "cancelled" });
      if (!result) {
        return sendApiError(res, 404, "NOT_FOUND", "Order not found");
      }
      if (result.ok !== true) {
        if (result.code === "NOT_FOUND") {
          return sendApiError(res, 404, "NOT_FOUND", "Order not found");
        }
        return sendApiError(res, 409, "CONFLICT", "Out-of-order order status transition");
      }
      return res.json({ success: true });
    }
    const order = db.orders.get(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    order.status = "cancelled";
    db.orders.set(order.id, order);
    res.json({ success: true });
  },
);

router.post(
  "/seller/restaurants/:restaurantId/orders/:orderId/start-prep",
  requireAuth,
  requireRole(["seller", "admin"]),
  async (req, res) => {
    if (sellerRepository.isEnabled()) {
      const result = await sellerRepository.updateOrderStatus(req.params.orderId, {
        status: "preparing",
        startedPrepAt: new Date(),
      });
      if (!result) {
        return sendApiError(res, 404, "NOT_FOUND", "Order not found");
      }
      if (result.ok !== true) {
        if (result.code === "NOT_FOUND") {
          return sendApiError(res, 404, "NOT_FOUND", "Order not found");
        }
        return sendApiError(res, 409, "CONFLICT", "Out-of-order order status transition");
      }
      return res.json({ order: result.order });
    }
    const order = db.orders.get(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    order.status = "preparing";
    order.startedPrepAt = util.nowIso();
    db.orders.set(order.id, order);
    res.json({ order });
  },
);

router.post(
  "/seller/restaurants/:restaurantId/orders/:orderId/ready",
  requireAuth,
  requireRole(["seller", "admin"]),
  async (req, res) => {
    if (sellerRepository.isEnabled()) {
      const result = await sellerRepository.updateOrderStatus(req.params.orderId, {
        status: "ready_for_pickup",
        readyAt: new Date(),
      });
      if (!result) {
        return sendApiError(res, 404, "NOT_FOUND", "Order not found");
      }
      if (result.ok !== true) {
        if (result.code === "NOT_FOUND") {
          return sendApiError(res, 404, "NOT_FOUND", "Order not found");
        }
        return sendApiError(res, 409, "CONFLICT", "Out-of-order order status transition");
      }
      return res.json({ order: result.order });
    }
    const order = db.orders.get(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    order.readyAt = util.nowIso();
    db.orders.set(order.id, order);
    res.json({ order });
  },
);

router.get("/seller/restaurants/:restaurantId/low-stock", requireAuth, requireRole(["seller", "admin"]), async (req, res) => {
  if (sellerRepository.isEnabled()) {
    const items = ((await sellerRepository.getRestaurantMenu(req.params.restaurantId)) || []).filter((item) => (item.stock ?? 0) <= 10);
    return res.json({ items });
  }
  const items = (db.menuByRestaurant.get(req.params.restaurantId) || []).filter((item) => (item.stock ?? 0) <= 10);
  res.json({ items });
});

router.patch(
  "/seller/restaurants/:restaurantId/menu/:itemId/availability",
  requireAuth,
  requireRole(["seller", "admin"]),
  async (req, res) => {
    if (sellerRepository.isEnabled()) {
      const item = await sellerRepository.setMenuAvailability(
        req.params.restaurantId,
        req.params.itemId,
        Boolean(req.body?.isAvailable),
      );
      if (!item) {
        return sendApiError(res, 404, "NOT_FOUND", "Menu item not found");
      }
      return res.json({ success: true });
    }
    const items = db.menuByRestaurant.get(req.params.restaurantId) || [];
    const item = items.find((i) => i.id === req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: "Menu item not found" });
    }
    item.isAvailable = Boolean(req.body?.isAvailable);
    db.menuByRestaurant.set(req.params.restaurantId, items);
    return res.json({ success: true });
  },
);

router.patch(
  "/seller/restaurants/:restaurantId/menu/:itemId/stock",
  requireAuth,
  requireRole(["seller", "admin"]),
  async (req, res) => {
    if (sellerRepository.isEnabled()) {
      const quantity = Number(req.body?.quantity || 0);
      const item = await sellerRepository.setMenuStock(req.params.restaurantId, req.params.itemId, quantity);
      if (!item) {
        return sendApiError(res, 404, "NOT_FOUND", "Menu item not found");
      }
      return res.json({ success: true });
    }
    const items = db.menuByRestaurant.get(req.params.restaurantId) || [];
    const item = items.find((i) => i.id === req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: "Menu item not found" });
    }
    item.stock = Number(req.body?.quantity || item.stock || 0);
    item.isAvailable = item.stock > 0;
    db.menuByRestaurant.set(req.params.restaurantId, items);
    return res.json({ success: true });
  },
);

router.get("/seller/restaurants/:restaurantId/menu", requireAuth, requireRole(["seller", "admin"]), async (req, res) => {
  if (sellerRepository.isEnabled()) {
    const items = (await sellerRepository.getRestaurantMenu(req.params.restaurantId)) || [];
    const categories = Array.from(new Set(items.map((item) => item.category))).map((name, index) => ({
      id: `cat_${index + 1}`,
      name,
      sortOrder: index + 1,
      itemCount: items.filter((item) => item.category === name).length,
    }));
    return res.json({ items, categories });
  }
  const items = db.menuByRestaurant.get(req.params.restaurantId) || [];
  const categories = Array.from(new Set(items.map((item) => item.category))).map((name, index) => ({
    id: `cat_${index + 1}`,
    name,
    sortOrder: index + 1,
    itemCount: items.filter((item) => item.category === name).length,
  }));
  res.json({ items, categories });
});

router.get(
  "/seller/restaurants/:restaurantId/earnings/summary",
  requireAuth,
  requireRole(["seller", "admin"]),
  async (req, res) => {
    if (sellerRepository.isEnabled()) {
      const orders = (await sellerRepository.getRestaurantOrders(req.params.restaurantId)) || [];
      const delivered = orders.filter((o) => o.status === "delivered");
      const totalEarnings = delivered.reduce((sum, o) => sum + o.finalAmount, 0);
      const averageOrderValue = delivered.length ? totalEarnings / delivered.length : 0;
      return res.json({
        totalEarnings,
        pendingPayout: totalEarnings * 0.2,
        availableBalance: totalEarnings * 0.8,
        thisWeek: totalEarnings,
        thisMonth: totalEarnings,
        lastMonth: totalEarnings * 0.7,
        averageOrderValue,
      });
    }
    const orders = Array.from(db.orders.values()).filter((o) => o.restaurantId === req.params.restaurantId);
    const delivered = orders.filter((o) => o.status === "delivered");
    const totalEarnings = delivered.reduce((sum, o) => sum + o.finalAmount, 0);
    const averageOrderValue = delivered.length ? totalEarnings / delivered.length : 0;
    res.json({
      totalEarnings,
      pendingPayout: totalEarnings * 0.2,
      availableBalance: totalEarnings * 0.8,
      thisWeek: totalEarnings,
      thisMonth: totalEarnings,
      lastMonth: totalEarnings * 0.7,
      averageOrderValue,
    });
  },
);

export default router;
