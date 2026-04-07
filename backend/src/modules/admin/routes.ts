import { Router } from 'express';
import adminRepository from '../../db/repositories/adminRepository.js';
import asyncJobRepository from '../../db/repositories/asyncJobRepository.js';
import { sendApiError } from '../../lib/httpErrors.js';
import {
  requireAuth,
  requireRole,
  type AuthedRequest,
} from '../../middleware/auth.js';
import { getMonitoringSnapshot } from '../../monitoring/observability.js';
import { db, util } from '../../store.js';

const router = Router();

router.get(
  '/admin/dashboard/stats',
  requireAuth,
  requireRole(['admin']),
  async (_req, res) => {
    if (adminRepository.isEnabled()) {
      const stats = await adminRepository.getDashboardStats();
      if (stats) {
        return res.json(stats);
      }
    }
    const totalOrders = db.orders.size;
    const totalRevenue = Array.from(db.orders.values())
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + o.finalAmount, 0);
    res.json({
      totalOrders,
      activeOrders: Array.from(db.orders.values()).filter(
        o => !['delivered', 'cancelled', 'refunded'].includes(o.status),
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
  },
);

router.get(
  '/admin/alerts',
  requireAuth,
  requireRole(['admin']),
  (_req, res) => {
    res.json({ alerts: db.alerts });
  },
);

router.get(
  '/admin/reports',
  requireAuth,
  requireRole(['admin']),
  (_req, res) => {
    res.json({ items: db.reports, total: db.reports.length });
  },
);

router.get(
  '/admin/users',
  requireAuth,
  requireRole(['admin']),
  async (_req, res) => {
    if (adminRepository.isEnabled()) {
      const users = await adminRepository.getUsers();
      if (users) {
        return res.json({ users, total: users.length });
      }
    }
    res.json({ users: Array.from(db.users.values()), total: db.users.size });
  },
);

router.post(
  '/admin/users/:userId/suspend',
  requireAuth,
  requireRole(['admin']),
  async (req, res) => {
    if (adminRepository.isEnabled()) {
      const updated = await adminRepository.setUserStatus(
        req.params.userId,
        'suspended',
      );
      if (!updated) {
        return sendApiError(res, 404, 'NOT_FOUND', 'User not found');
      }
      return res.json({ success: true });
    }
    const user = db.users.get(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.status = 'suspended';
    db.users.set(user.id, user);
    return res.json({ success: true });
  },
);

router.post(
  '/admin/users/:userId/reactivate',
  requireAuth,
  requireRole(['admin']),
  async (req, res) => {
    if (adminRepository.isEnabled()) {
      const updated = await adminRepository.setUserStatus(
        req.params.userId,
        'active',
      );
      if (!updated) {
        return sendApiError(res, 404, 'NOT_FOUND', 'User not found');
      }
      return res.json({ success: true });
    }
    const user = db.users.get(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.status = 'active';
    db.users.set(user.id, user);
    return res.json({ success: true });
  },
);

router.get(
  '/admin/sellers',
  requireAuth,
  requireRole(['admin']),
  async (_req, res) => {
    if (adminRepository.isEnabled()) {
      const sellers = await adminRepository.getSellers();
      if (sellers) {
        return res.json({ sellers, total: sellers.length });
      }
    }
    const sellers = Array.from(db.sellers.values());
    res.json({ sellers, total: sellers.length });
  },
);

router.post(
  '/admin/sellers/:sellerId/suspend',
  requireAuth,
  requireRole(['admin']),
  async (req, res) => {
    if (adminRepository.isEnabled()) {
      const updated = await adminRepository.setSellerStatus(
        req.params.sellerId,
        'suspended',
      );
      if (!updated) {
        return sendApiError(res, 404, 'NOT_FOUND', 'Seller not found');
      }
      return res.json({ success: true });
    }
    const seller = db.sellers.get(req.params.sellerId);
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }
    seller.status = 'suspended';
    db.sellers.set(seller.id, seller);
    return res.json({ success: true });
  },
);

router.post(
  '/admin/sellers/:sellerId/reactivate',
  requireAuth,
  requireRole(['admin']),
  async (req, res) => {
    if (adminRepository.isEnabled()) {
      const updated = await adminRepository.setSellerStatus(
        req.params.sellerId,
        'approved',
      );
      if (!updated) {
        return sendApiError(res, 404, 'NOT_FOUND', 'Seller not found');
      }
      return res.json({ success: true });
    }
    const seller = db.sellers.get(req.params.sellerId);
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }
    seller.status = 'approved';
    db.sellers.set(seller.id, seller);
    return res.json({ success: true });
  },
);

router.get(
  '/admin/payouts/summary',
  requireAuth,
  requireRole(['admin']),
  async (_req, res) => {
    if (adminRepository.isEnabled()) {
      const summary = await adminRepository.getPayoutSummary();
      if (summary) {
        return res.json(summary);
      }
    }
    const payouts = Array.from(db.payouts.values());
    const pending = payouts.filter(p => p.status === 'pending');
    const processing = payouts.filter(p => p.status === 'processing');
    res.json({
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, p) => sum + p.amount, 0),
      processingCount: processing.length,
      processingAmount: processing.reduce((sum, p) => sum + p.amount, 0),
      paidToday: payouts
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0),
    });
  },
);

router.get(
  '/admin/payouts',
  requireAuth,
  requireRole(['admin']),
  async (req, res) => {
    const status =
      typeof req.query.status === 'string' ? req.query.status : undefined;
    if (adminRepository.isEnabled()) {
      const items = await adminRepository.getPayouts(status);
      if (items) {
        return res.json({ items, total: items.length });
      }
    }
    let items = Array.from(db.payouts.values());
    if (status) {
      items = items.filter(item => item.status === status);
    }
    res.json({ items, total: items.length });
  },
);

router.post(
  '/admin/payouts/:payoutId/processing',
  requireAuth,
  requireRole(['admin']),
  async (req, res) => {
    if (adminRepository.isEnabled()) {
      const updated = await adminRepository.setPayoutStatus(
        req.params.payoutId,
        'processing',
      );
      if (!updated) {
        return sendApiError(res, 404, 'NOT_FOUND', 'Payout not found');
      }
      return res.json({ success: true });
    }
    const payout = db.payouts.get(req.params.payoutId);
    if (!payout) {
      return res
        .status(404)
        .json({ success: false, message: 'Payout not found' });
    }
    payout.status = 'processing';
    db.payouts.set(payout.id, payout);
    res.json({ success: true });
  },
);

router.post(
  '/admin/payouts/:payoutId/paid',
  requireAuth,
  requireRole(['admin']),
  async (req, res) => {
    if (adminRepository.isEnabled()) {
      const updated = await adminRepository.setPayoutStatus(
        req.params.payoutId,
        'paid',
      );
      if (!updated) {
        return sendApiError(res, 404, 'NOT_FOUND', 'Payout not found');
      }
      return res.json({ success: true });
    }
    const payout = db.payouts.get(req.params.payoutId);
    if (!payout) {
      return res
        .status(404)
        .json({ success: false, message: 'Payout not found' });
    }
    payout.status = 'paid';
    db.payouts.set(payout.id, payout);
    res.json({ success: true });
  },
);

router.post(
  '/admin/payouts/:payoutId/hold',
  requireAuth,
  requireRole(['admin']),
  async (req, res) => {
    if (adminRepository.isEnabled()) {
      const updated = await adminRepository.setPayoutStatus(
        req.params.payoutId,
        'on_hold',
      );
      if (!updated) {
        return sendApiError(res, 404, 'NOT_FOUND', 'Payout not found');
      }
      return res.json({ success: true });
    }
    const payout = db.payouts.get(req.params.payoutId);
    if (!payout) {
      return res
        .status(404)
        .json({ success: false, message: 'Payout not found' });
    }
    payout.status = 'on_hold';
    db.payouts.set(payout.id, payout);
    res.json({ success: true });
  },
);

router.post(
  '/admin/audit-logs',
  requireAuth,
  requireRole(['admin', 'seller']),
  async (req: AuthedRequest, res) => {
    if (adminRepository.isEnabled()) {
      await adminRepository.createAuditLog({
        actorRole:
          req.body?.actorRole ||
          (req.session?.role === 'seller' ? 'seller' : 'admin'),
        actorId: req.body?.actorId,
        action: String(req.body?.action || 'unknown'),
        targetType: String(req.body?.targetType || 'unknown'),
        targetId: String(req.body?.targetId || 'unknown'),
        outcome: req.body?.outcome === 'failure' ? 'failure' : 'success',
        errorCode: req.body?.errorCode,
        details: req.body?.details,
      });
      return res.json({ success: true });
    }
    db.auditLogs.unshift({
      id: util.id('audit'),
      actorRole:
        req.body?.actorRole ||
        (req.session?.role === 'seller' ? 'seller' : 'admin'),
      actorId: req.body?.actorId,
      action: String(req.body?.action || 'unknown'),
      targetType: String(req.body?.targetType || 'unknown'),
      targetId: String(req.body?.targetId || 'unknown'),
      outcome: req.body?.outcome === 'failure' ? 'failure' : 'success',
      errorCode: req.body?.errorCode,
      details: req.body?.details,
      createdAt: util.nowIso(),
    });
    db.auditLogs = db.auditLogs.slice(0, 200);
    res.json({ success: true });
  },
);

router.get(
  '/admin/audit-logs',
  requireAuth,
  requireRole(['admin', 'seller']),
  async (req, res) => {
    const limit = Number(req.query.limit || 20);
    if (adminRepository.isEnabled()) {
      const items = await adminRepository.getAuditLogs(limit);
      if (items) {
        return res.json({ items });
      }
    }
    res.json({ items: db.auditLogs.slice(0, limit) });
  },
);

router.get(
  '/admin/dispatch/board',
  requireAuth,
  requireRole(['admin']),
  async (req, res) => {
    const limit = Number(req.query.limit || 8);
    if (adminRepository.isEnabled()) {
      const board = await adminRepository.getDispatchBoard(limit);
      if (board) {
        return res.json(board);
      }
    }
    res.json({
      orders: db.dispatchOrders.slice(0, limit),
      riders: db.dispatchRiders,
    });
  },
);

router.post(
  '/admin/dispatch/orders/:orderId/assign',
  requireAuth,
  requireRole(['admin']),
  async (req, res) => {
    if (adminRepository.isEnabled()) {
      const riderId = String(req.body?.riderId || '');
      if (!riderId) {
        return sendApiError(
          res,
          400,
          'VALIDATION_ERROR',
          'riderId is required',
          { field: 'riderId' },
        );
      }
      const result = await adminRepository.assignDispatchOrder(
        req.params.orderId,
        riderId,
      );
      if (!result) {
        return sendApiError(
          res,
          500,
          'INTERNAL_ERROR',
          'Dispatch assignment unavailable',
        );
      }
      if (result.ok === false) {
        if (
          result.code === 'ORDER_NOT_FOUND' ||
          result.code === 'RIDER_NOT_FOUND'
        ) {
          return sendApiError(
            res,
            404,
            'NOT_FOUND',
            'Order or rider not found',
          );
        }
        return sendApiError(
          res,
          409,
          'CONFLICT',
          'Rider already assigned or unavailable',
          {
            code: result.code,
          },
        );
      }
      return res.json({ order: result.order });
    }
    const riderId = String(req.body?.riderId || '');
    const rider = db.dispatchRiders.find(r => r.id === riderId);
    const order = db.dispatchOrders.find(o => o.id === req.params.orderId);
    if (!order || !rider) {
      return res.status(404).json({ message: 'Order or rider not found' });
    }
    order.status = 'assigned';
    order.riderId = rider.id;
    order.riderName = rider.name;
    order.updatedAt = util.nowIso();
    rider.isAvailable = false;
    res.json({ order });
  },
);

router.post(
  '/admin/dispatch/orders/:orderId/status',
  requireAuth,
  requireRole(['admin']),
  async (req, res) => {
    if (adminRepository.isEnabled()) {
      const order = await adminRepository.updateDispatchOrderStatus(
        req.params.orderId,
        String(req.body?.status || ''),
        req.body?.proofOtp,
      );
      if (!order) {
        return sendApiError(res, 404, 'NOT_FOUND', 'Order not found');
      }
      return res.json({ order });
    }
    const order = db.dispatchOrders.find(o => o.id === req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    order.status = req.body?.status || order.status;
    order.proofOtp = req.body?.proofOtp || order.proofOtp;
    order.updatedAt = util.nowIso();
    if (order.status === 'delivered' && order.riderId) {
      const rider = db.dispatchRiders.find(r => r.id === order.riderId);
      if (rider) {
        rider.isAvailable = true;
      }
    }
    res.json({ order });
  },
);

router.get(
  '/admin/monitoring/alerts',
  requireAuth,
  requireRole(['admin']),
  (_req, res) => {
    const monitoring = getMonitoringSnapshot();
    return res.json({
      alerts: monitoring.activeAlerts,
      rolling: monitoring.rolling,
      thresholds: monitoring.thresholds,
      sinkConfigured: monitoring.sinkConfigured,
    });
  },
);

router.get(
  '/admin/worker/dead-letters',
  requireAuth,
  requireRole(['admin']),
  async (req, res) => {
    if (!asyncJobRepository.isEnabled()) {
      return sendApiError(
        res,
        503,
        'CONFLICT',
        'Dead-letter operations require Postgres mode',
      );
    }
    const limit = Number(req.query.limit || 20);
    const items = (await asyncJobRepository.listDeadLetters(limit)) || [];
    return res.json({ items, total: items.length });
  },
);

router.post(
  '/admin/worker/dead-letters/:deadLetterId/replay',
  requireAuth,
  requireRole(['admin']),
  async (req, res) => {
    if (!asyncJobRepository.isEnabled()) {
      return sendApiError(
        res,
        503,
        'CONFLICT',
        'Dead-letter operations require Postgres mode',
      );
    }
    const replayed = await asyncJobRepository.replayDeadLetter(
      req.params.deadLetterId,
    );
    if (!replayed) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Dead letter job not found');
    }
    return res.json({
      success: true,
      replayedJobId: replayed.id,
      type: replayed.type,
    });
  },
);

router.get(
  '/admin/dashboard/order-metrics',
  requireAuth,
  requireRole(['admin']),
  (_req, res) => {
    res.json({
      total: 1250,
      pending: 45,
      confirmed: 120,
      preparing: 85,
      outForDelivery: 65,
      delivered: 920,
      cancelled: 12,
      refunded: 3,
    });
  },
);

router.get(
  '/admin/dashboard/sla-metrics',
  requireAuth,
  requireRole(['admin']),
  (_req, res) => {
    res.json({
      avgPrepTime: 18,
      avgDeliveryTime: 32,
      onTimeDeliveryRate: 94.5,
      avgFirstResponseTime: 2.5,
      avgResolutionTime: 45,
      slaBreaches: {
        prepTimeBreaches: 12,
        deliveryTimeBreaches: 8,
        responseTimeBreaches: 5,
      },
    });
  },
);

router.get(
  '/admin/dashboard/revenue-chart',
  requireAuth,
  requireRole(['admin']),
  (req, res) => {
    const period = String(req.query.period || 'week');
    const now = new Date();
    const chart = [];

    if (period === 'year') {
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        chart.push({
          date: date.toISOString().slice(0, 7),
          value: Math.random() * 500000 + 100000,
        });
      }
    } else {
      const days = period === 'month' ? 30 : 7;
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        chart.push({
          date: date.toISOString().slice(0, 10),
          value: Math.random() * 80000 + 20000,
        });
      }
    }
    res.json({ data: chart });
  },
);

router.get(
  '/admin/dashboard/orders-chart',
  requireAuth,
  requireRole(['admin']),
  (req, res) => {
    const period = String(req.query.period || 'week');
    const now = new Date();
    const chart = [];

    if (period === 'year') {
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        chart.push({
          date: date.toISOString().slice(0, 7),
          value: Math.floor(Math.random() * 5000 + 1000),
        });
      }
    } else {
      const days = period === 'month' ? 30 : 7;
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        chart.push({
          date: date.toISOString().slice(0, 10),
          value: Math.floor(Math.random() * 500 + 100),
        });
      }
    }
    res.json({ data: chart });
  },
);

router.get(
  '/admin/dashboard/user-growth',
  requireAuth,
  requireRole(['admin']),
  (req, res) => {
    const period = String(req.query.period || 'week');
    const now = new Date();
    const chart = [];
    const days = period === 'month' ? 30 : period === 'year' ? 12 : 7;

    if (period === 'year') {
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        chart.push({
          date: date.toISOString().slice(0, 7),
          value: Math.floor(Math.random() * 500 + 100),
        });
      }
    } else {
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        chart.push({
          date: date.toISOString().slice(0, 10),
          value: Math.floor(Math.random() * 50 + 10),
        });
      }
    }
    res.json({ data: chart });
  },
);

router.get(
  '/admin/dashboard/retention',
  requireAuth,
  requireRole(['admin']),
  (_req, res) => {
    res.json({
      dailyActiveUsers: 1250,
      weeklyActiveUsers: 4500,
      monthlyActiveUsers: 12000,
      retentionRate: 68.5,
      churnRate: 8.2,
    });
  },
);

router.get(
  '/admin/dashboard/top-sellers',
  requireAuth,
  requireRole(['admin']),
  (req, res) => {
    const limit = Number(req.query.limit || 10);
    res.json({
      sellers: [
        {
          id: 'seller_1',
          businessName: 'Pizza Palace',
          totalOrders: 1200,
          totalRevenue: 340000,
          avgRating: 4.4,
          trend: 'up',
        },
        {
          id: 'seller_2',
          businessName: 'Biryani House',
          totalOrders: 980,
          totalRevenue: 300000,
          avgRating: 4.6,
          trend: 'up',
        },
        {
          id: 'seller_3',
          businessName: 'Burger Barn',
          totalOrders: 750,
          totalRevenue: 220000,
          avgRating: 4.2,
          trend: 'stable',
        },
      ].slice(0, limit),
    });
  },
);

router.get(
  '/admin/dashboard/top-restaurants',
  requireAuth,
  requireRole(['admin']),
  (req, res) => {
    const limit = Number(req.query.limit || 10);
    res.json({
      restaurants: [
        {
          id: 'restaurant_1',
          name: 'Pizza Palace',
          sellerName: 'Karan',
          totalOrders: 1200,
          totalRevenue: 340000,
          avgPrepTime: 16,
        },
        {
          id: 'restaurant_2',
          name: 'Biryani House',
          sellerName: 'Sana',
          totalOrders: 980,
          totalRevenue: 300000,
          avgPrepTime: 18,
        },
      ].slice(0, limit),
    });
  },
);

router.get(
  '/admin/reports/delivery-delays',
  requireAuth,
  requireRole(['admin']),
  (req, res) => {
    const threshold = Number(req.query.threshold || 10);
    const delays = [
      {
        orderId: 'ord_101',
        restaurantName: 'Pizza Palace',
        expectedTime: '2026-04-07T14:30:00Z',
        actualTime: '2026-04-07T15:15:00Z',
        delayMinutes: 45,
        riderId: 'rider_1',
      },
      {
        orderId: 'ord_102',
        restaurantName: 'Biryani House',
        expectedTime: '2026-04-07T15:00:00Z',
        actualTime: '2026-04-07T15:50:00Z',
        delayMinutes: 50,
        riderId: 'rider_2',
      },
    ].filter(d => d.delayMinutes >= threshold);
    res.json({ delays, total: delays.length });
  },
);

router.get(
  '/admin/reports/prep-time-breaches',
  requireAuth,
  requireRole(['admin']),
  (req, res) => {
    const threshold = Number(req.query.threshold || 15);
    const breaches = [
      {
        orderId: 'ord_201',
        restaurantName: 'Pizza Palace',
        expectedPrepTime: 15,
        actualPrepTime: 22,
        delayMinutes: 7,
      },
      {
        orderId: 'ord_202',
        restaurantName: 'Biryani House',
        expectedPrepTime: 20,
        actualPrepTime: 28,
        delayMinutes: 8,
      },
    ].filter(b => b.delayMinutes >= threshold);
    res.json({ breaches, total: breaches.length });
  },
);

router.get(
  '/admin/approvals',
  requireAuth,
  requireRole(['admin']),
  (_req, res) => {
    res.json({
      items: [
        {
          id: 'approval_1',
          type: 'seller_registration',
          sellerId: 'seller_3',
          sellerName: 'New Restaurant',
          businessName: 'New Restaurant LLC',
          data: {},
          submittedAt: util.nowIso(),
          priority: 'high',
        },
        {
          id: 'approval_2',
          type: 'document_verification',
          sellerId: 'seller_4',
          sellerName: 'Taco Town',
          data: {},
          submittedAt: util.nowIso(),
          priority: 'medium',
        },
      ],
      total: 2,
    });
  },
);

router.post(
  '/admin/approvals/:approvalId/approve',
  requireAuth,
  requireRole(['admin']),
  (req, res) => {
    res.json({ success: true });
  },
);

router.post(
  '/admin/approvals/:approvalId/reject',
  requireAuth,
  requireRole(['admin']),
  (req, res) => {
    res.json({ success: true });
  },
);

router.post(
  '/admin/approvals/:approvalId/request-info',
  requireAuth,
  requireRole(['admin']),
  (req, res) => {
    res.json({ success: true });
  },
);

router.get(
  '/admin/approvals/pending-sellers',
  requireAuth,
  requireRole(['admin']),
  (_req, res) => {
    res.json({
      sellers: [
        {
          id: 'seller_3',
          businessName: 'New Restaurant',
          ownerName: 'Ravi Kumar',
          submittedAt: util.nowIso(),
        },
      ],
    });
  },
);

router.get(
  '/admin/approvals/pending-documents',
  requireAuth,
  requireRole(['admin']),
  (_req, res) => {
    res.json({
      documents: [
        {
          id: 'doc_1',
          sellerId: 'seller_3',
          sellerName: 'New Restaurant',
          documentType: 'fssai_license',
          submittedAt: util.nowIso(),
        },
      ],
    });
  },
);

export default router;
