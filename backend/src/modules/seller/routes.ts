import { Router } from 'express';
import sellerRepository from '../../db/repositories/sellerRepository.js';
import { sendApiError } from '../../lib/httpErrors.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { db, util } from '../../store.js';

const router = Router();

router.get(
  '/seller/restaurants/:restaurantId/operational-status',
  requireAuth,
  requireRole(['seller', 'admin']),
  async (req, res) => {
    if (sellerRepository.isEnabled()) {
      const restaurant = await sellerRepository.getRestaurant(
        req.params.restaurantId,
      );
      if (!restaurant) {
        return sendApiError(res, 404, 'NOT_FOUND', 'Restaurant not found');
      }
      return res.json({ isOpen: restaurant.isOpen });
    }
    const restaurant = db.restaurants.get(req.params.restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    return res.json({ isOpen: restaurant.isOpen });
  },
);

router.patch(
  '/seller/restaurants/:restaurantId/operational-status',
  requireAuth,
  requireRole(['seller', 'admin']),
  async (req, res) => {
    if (sellerRepository.isEnabled()) {
      const updated = await sellerRepository.setRestaurantOperationalStatus(
        req.params.restaurantId,
        Boolean(req.body?.isOpen),
      );
      if (!updated) {
        return sendApiError(res, 404, 'NOT_FOUND', 'Restaurant not found');
      }
      return res.json({ isOpen: updated.isOpen, reason: req.body?.reason });
    }
    const restaurant = db.restaurants.get(req.params.restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    restaurant.isOpen = Boolean(req.body?.isOpen);
    db.restaurants.set(restaurant.id, restaurant);
    return res.json({ isOpen: restaurant.isOpen, reason: req.body?.reason });
  },
);

router.get(
  '/seller/restaurants/:restaurantId/orders/stats',
  requireAuth,
  requireRole(['seller', 'admin']),
  async (req, res) => {
    if (sellerRepository.isEnabled()) {
      const orders =
        (await sellerRepository.getRestaurantOrders(req.params.restaurantId)) ||
        [];
      const completedToday = orders.filter(
        o => o.status === 'delivered',
      ).length;
      const pendingOrders = orders.filter(o => o.status === 'pending').length;
      const inProgressOrders = orders.filter(o =>
        ['confirmed', 'preparing', 'out_for_delivery'].includes(o.status),
      ).length;
      const revenueToday = orders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + o.finalAmount, 0);
      return res.json({
        totalOrders: orders.length,
        pendingOrders,
        inProgressOrders,
        completedToday,
        cancelledToday: orders.filter(o => o.status === 'cancelled').length,
        averagePrepTime: 18,
        revenueToday,
        revenueWeek: revenueToday,
      });
    }
    const orders = Array.from(db.orders.values()).filter(
      o => o.restaurantId === req.params.restaurantId,
    );
    const completedToday = orders.filter(o => o.status === 'delivered').length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const inProgressOrders = orders.filter(o =>
      ['confirmed', 'preparing', 'out_for_delivery'].includes(o.status),
    ).length;
    const revenueToday = orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + o.finalAmount, 0);
    res.json({
      totalOrders: orders.length,
      pendingOrders,
      inProgressOrders,
      completedToday,
      cancelledToday: orders.filter(o => o.status === 'cancelled').length,
      averagePrepTime: 18,
      revenueToday,
      revenueWeek: revenueToday,
    });
  },
);

router.get(
  '/seller/restaurants/:restaurantId/orders/pending',
  requireAuth,
  requireRole(['seller', 'admin']),
  async (req, res) => {
    if (sellerRepository.isEnabled()) {
      const orders =
        (await sellerRepository.getPendingRestaurantOrders(
          req.params.restaurantId,
        )) || [];
      return res.json({ orders });
    }
    const orders = Array.from(db.orders.values()).filter(
      o =>
        o.restaurantId === req.params.restaurantId &&
        ['pending', 'confirmed', 'preparing'].includes(o.status),
    );
    res.json({ orders });
  },
);

router.post(
  '/seller/restaurants/:restaurantId/orders/:orderId/accept',
  requireAuth,
  requireRole(['seller', 'admin']),
  async (req, res) => {
    if (sellerRepository.isEnabled()) {
      const result = await sellerRepository.updateOrderStatus(
        req.params.orderId,
        {
          status: 'confirmed',
          acceptedAt: new Date(),
        },
      );
      if (!result) {
        return sendApiError(res, 404, 'NOT_FOUND', 'Order not found');
      }
      if (result.ok !== true) {
        if (result.code === 'NOT_FOUND') {
          return sendApiError(res, 404, 'NOT_FOUND', 'Order not found');
        }
        return sendApiError(
          res,
          409,
          'CONFLICT',
          'Out-of-order order status transition',
        );
      }
      return res.json({ order: result.order });
    }
    const order = db.orders.get(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    order.status = 'confirmed';
    order.acceptedAt = util.nowIso();
    db.orders.set(order.id, order);
    res.json({ order });
  },
);

router.post(
  '/seller/restaurants/:restaurantId/orders/:orderId/reject',
  requireAuth,
  requireRole(['seller', 'admin']),
  async (req, res) => {
    if (sellerRepository.isEnabled()) {
      const result = await sellerRepository.updateOrderStatus(
        req.params.orderId,
        { status: 'cancelled' },
      );
      if (!result) {
        return sendApiError(res, 404, 'NOT_FOUND', 'Order not found');
      }
      if (result.ok !== true) {
        if (result.code === 'NOT_FOUND') {
          return sendApiError(res, 404, 'NOT_FOUND', 'Order not found');
        }
        return sendApiError(
          res,
          409,
          'CONFLICT',
          'Out-of-order order status transition',
        );
      }
      return res.json({ success: true });
    }
    const order = db.orders.get(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    order.status = 'cancelled';
    db.orders.set(order.id, order);
    res.json({ success: true });
  },
);

router.post(
  '/seller/restaurants/:restaurantId/orders/:orderId/start-prep',
  requireAuth,
  requireRole(['seller', 'admin']),
  async (req, res) => {
    if (sellerRepository.isEnabled()) {
      const result = await sellerRepository.updateOrderStatus(
        req.params.orderId,
        {
          status: 'preparing',
          startedPrepAt: new Date(),
        },
      );
      if (!result) {
        return sendApiError(res, 404, 'NOT_FOUND', 'Order not found');
      }
      if (result.ok !== true) {
        if (result.code === 'NOT_FOUND') {
          return sendApiError(res, 404, 'NOT_FOUND', 'Order not found');
        }
        return sendApiError(
          res,
          409,
          'CONFLICT',
          'Out-of-order order status transition',
        );
      }
      return res.json({ order: result.order });
    }
    const order = db.orders.get(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    order.status = 'preparing';
    order.startedPrepAt = util.nowIso();
    db.orders.set(order.id, order);
    res.json({ order });
  },
);

router.post(
  '/seller/restaurants/:restaurantId/orders/:orderId/ready',
  requireAuth,
  requireRole(['seller', 'admin']),
  async (req, res) => {
    if (sellerRepository.isEnabled()) {
      const result = await sellerRepository.updateOrderStatus(
        req.params.orderId,
        {
          status: 'ready_for_pickup',
          readyAt: new Date(),
        },
      );
      if (!result) {
        return sendApiError(res, 404, 'NOT_FOUND', 'Order not found');
      }
      if (result.ok !== true) {
        if (result.code === 'NOT_FOUND') {
          return sendApiError(res, 404, 'NOT_FOUND', 'Order not found');
        }
        return sendApiError(
          res,
          409,
          'CONFLICT',
          'Out-of-order order status transition',
        );
      }
      return res.json({ order: result.order });
    }
    const order = db.orders.get(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    order.readyAt = util.nowIso();
    db.orders.set(order.id, order);
    res.json({ order });
  },
);

router.get(
  '/seller/restaurants/:restaurantId/low-stock',
  requireAuth,
  requireRole(['seller', 'admin']),
  async (req, res) => {
    if (sellerRepository.isEnabled()) {
      const items = (
        (await sellerRepository.getRestaurantMenu(req.params.restaurantId)) ||
        []
      ).filter(item => (item.stock ?? 0) <= 10);
      return res.json({ items });
    }
    const items = (
      db.menuByRestaurant.get(req.params.restaurantId) || []
    ).filter(item => (item.stock ?? 0) <= 10);
    res.json({ items });
  },
);

router.patch(
  '/seller/restaurants/:restaurantId/menu/:itemId/availability',
  requireAuth,
  requireRole(['seller', 'admin']),
  async (req, res) => {
    if (sellerRepository.isEnabled()) {
      const item = await sellerRepository.setMenuAvailability(
        req.params.restaurantId,
        req.params.itemId,
        Boolean(req.body?.isAvailable),
      );
      if (!item) {
        return sendApiError(res, 404, 'NOT_FOUND', 'Menu item not found');
      }
      return res.json({ success: true });
    }
    const items = db.menuByRestaurant.get(req.params.restaurantId) || [];
    const item = items.find(i => i.id === req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    item.isAvailable = Boolean(req.body?.isAvailable);
    db.menuByRestaurant.set(req.params.restaurantId, items);
    return res.json({ success: true });
  },
);

router.patch(
  '/seller/restaurants/:restaurantId/menu/:itemId/stock',
  requireAuth,
  requireRole(['seller', 'admin']),
  async (req, res) => {
    if (sellerRepository.isEnabled()) {
      const quantity = Number(req.body?.quantity || 0);
      const item = await sellerRepository.setMenuStock(
        req.params.restaurantId,
        req.params.itemId,
        quantity,
      );
      if (!item) {
        return sendApiError(res, 404, 'NOT_FOUND', 'Menu item not found');
      }
      return res.json({ success: true });
    }
    const items = db.menuByRestaurant.get(req.params.restaurantId) || [];
    const item = items.find(i => i.id === req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    item.stock = Number(req.body?.quantity || item.stock || 0);
    item.isAvailable = item.stock > 0;
    db.menuByRestaurant.set(req.params.restaurantId, items);
    return res.json({ success: true });
  },
);

router.get(
  '/seller/restaurants/:restaurantId/menu',
  requireAuth,
  requireRole(['seller', 'admin']),
  async (req, res) => {
    const restaurantId = req.params.restaurantId;
    const items = sellerRepository.isEnabled()
      ? (await sellerRepository.getRestaurantMenu(restaurantId)) || []
      : db.menuByRestaurant.get(restaurantId) || [];

    const seededCategories = [...(db.menuCategories.get(restaurantId) || [])];
    const categoriesByName = new Map<string, { id: string; name: string; sortOrder: number }>();

    seededCategories.forEach((category, index) => {
      categoriesByName.set(category.name, {
        id: category.id,
        name: category.name,
        sortOrder: Number.isFinite(category.sortOrder) ? category.sortOrder : index + 1,
      });
    });

    let nextSortOrder = seededCategories.length + 1;
    for (const name of new Set(items.map(item => item.category))) {
      if (!categoriesByName.has(name)) {
        categoriesByName.set(name, {
          id: `cat_${nextSortOrder}`,
          name,
          sortOrder: nextSortOrder,
        });
        nextSortOrder += 1;
      }
    }

    const categories = Array.from(categoriesByName.values())
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(category => ({
        ...category,
        itemCount: items.filter(item => item.category === category.name).length,
      }));

    res.json({ items, categories });
  },
);

router.get(
  '/seller/restaurants/:restaurantId/earnings/summary',
  requireAuth,
  requireRole(['seller', 'admin']),
  async (req, res) => {
    if (sellerRepository.isEnabled()) {
      const orders =
        (await sellerRepository.getRestaurantOrders(req.params.restaurantId)) ||
        [];
      const delivered = orders.filter(o => o.status === 'delivered');
      const totalEarnings = delivered.reduce(
        (sum, o) => sum + o.finalAmount,
        0,
      );
      const averageOrderValue = delivered.length
        ? totalEarnings / delivered.length
        : 0;
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
    const orders = Array.from(db.orders.values()).filter(
      o => o.restaurantId === req.params.restaurantId,
    );
    const delivered = orders.filter(o => o.status === 'delivered');
    const totalEarnings = delivered.reduce((sum, o) => sum + o.finalAmount, 0);
    const averageOrderValue = delivered.length
      ? totalEarnings / delivered.length
      : 0;
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

router.get(
  '/seller/restaurants/:restaurantId/earnings/chart',
  requireAuth,
  requireRole(['seller', 'admin']),
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
          earnings: Math.random() * 50000 + 10000,
          orders: Math.floor(Math.random() * 200 + 50),
        });
      }
    } else {
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        chart.push({
          date: date.toISOString().slice(0, 10),
          earnings: Math.random() * 10000 + 2000,
          orders: Math.floor(Math.random() * 50 + 10),
        });
      }
    }
    res.json({ chart });
  },
);

router.get(
  '/seller/restaurants/:restaurantId/earnings/transactions',
  requireAuth,
  requireRole(['seller', 'admin']),
  (req, res) => {
    const transactions = [
      {
        id: 'txn_1',
        orderId: 'ord_1',
        type: 'order',
        amount: 350,
        status: 'completed',
        description: 'Order #1001 - Pizza Palace',
        createdAt: util.nowIso(),
      },
      {
        id: 'txn_2',
        orderId: 'ord_2',
        type: 'order',
        amount: 280,
        status: 'completed',
        description: 'Order #1002 - Burger Barn',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'txn_3',
        orderId: undefined,
        type: 'payout',
        amount: -5000,
        status: 'completed',
        description: 'Weekly payout - HDFC ****4521',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
      },
      {
        id: 'txn_4',
        orderId: 'ord_3',
        type: 'order',
        amount: 420,
        status: 'completed',
        description: 'Order #1003 - Biryani House',
        createdAt: new Date(Date.now() - 259200000).toISOString(),
      },
      {
        id: 'txn_5',
        orderId: undefined,
        type: 'adjustment',
        amount: -50,
        status: 'completed',
        description: 'Refund adjustment - Order #99',
        createdAt: new Date(Date.now() - 345600000).toISOString(),
      },
    ];
    res.json({ transactions, total: transactions.length });
  },
);

router.get(
  '/seller/restaurants/:restaurantId/payouts',
  requireAuth,
  requireRole(['seller', 'admin']),
  (req, res) => {
    const status =
      typeof req.query.status === 'string' ? req.query.status : undefined;
    const payouts = Array.from(db.payouts.values()).filter(
      p => p.sellerId === req.params.restaurantId,
    );
    const filtered = status
      ? payouts.filter(p => p.status === status)
      : payouts;
    res.json({ payouts: filtered, total: filtered.length });
  },
);

router.post(
  '/seller/restaurants/:restaurantId/payouts',
  requireAuth,
  requireRole(['seller', 'admin']),
  (req, res) => {
    const amount = Number(req.body?.amount || 0);
    const payout = {
      id: util.id('payout'),
      sellerId: req.params.restaurantId,
      sellerName: 'Restaurant',
      amount,
      status: 'pending' as const,
      createdAt: util.nowIso(),
    };
    db.payouts.set(payout.id, payout);
    res.json({ payout });
  },
);

router.get(
  '/seller/restaurants/:restaurantId/bank-details',
  requireAuth,
  requireRole(['seller', 'admin']),
  (req, res) => {
    const details = db.sellerBankDetails.get(req.params.restaurantId);
    if (!details) {
      return res.json({ bankAccount: null });
    }
    res.json({ bankAccount: details });
  },
);

router.put(
  '/seller/restaurants/:restaurantId/bank-details',
  requireAuth,
  requireRole(['seller', 'admin']),
  (req, res) => {
    const bankAccount = {
      accountNumber: String(req.body?.accountNumber || ''),
      ifsc: String(req.body?.ifsc || ''),
      accountHolder: String(req.body?.accountHolder || ''),
      verified: false,
    };
    db.sellerBankDetails.set(req.params.restaurantId, bankAccount);
    res.json({ bankAccount });
  },
);

router.post(
  '/seller/restaurants/:restaurantId/bank-details/verify',
  requireAuth,
  requireRole(['seller', 'admin']),
  (req, res) => {
    const accountNumber = String(req.body?.accountNumber || '');
    const ifsc = String(req.body?.ifsc || '');
    const verified = accountNumber.length >= 8 && ifsc.length >= 6;
    const details = db.sellerBankDetails.get(req.params.restaurantId);
    if (details) {
      details.verified = verified;
      db.sellerBankDetails.set(req.params.restaurantId, details);
    }
    res.json({ verified });
  },
);

router.get(
  '/seller/restaurants/:restaurantId/commission',
  requireAuth,
  requireRole(['seller', 'admin']),
  (req, res) => {
    const grossSales = 150000;
    const platformCommission = grossSales * 0.18;
    const tax = platformCommission * 0.18;
    const adjustments = 500;
    res.json({
      grossSales,
      platformCommission,
      tax,
      adjustments,
      netEarnings: grossSales - platformCommission - tax + adjustments,
      orderCount: 450,
    });
  },
);

router.get(
  '/seller/restaurants/:restaurantId/invoice',
  requireAuth,
  requireRole(['seller', 'admin']),
  (req, res) => {
    res.json({
      invoiceUrl: `https://invoices.foodiego.local/restaurant_${req.params.restaurantId}_${req.query.startDate}_${req.query.endDate}.pdf`,
    });
  },
);

router.post(
  '/seller/restaurants/:restaurantId/menu',
  requireAuth,
  requireRole(['seller', 'admin']),
  (req, res) => {
    const menuItem = {
      id: util.id('menu'),
      restaurantId: req.params.restaurantId,
      name: String(req.body?.name || 'New Item'),
      description: String(req.body?.description || ''),
      price: Number(req.body?.price || 0),
      category: String(req.body?.category || 'Main Course'),
      image: req.body?.image || null,
      isVeg: Boolean(req.body?.isVeg ?? true),
      isCustomizable: Boolean(req.body?.isCustomizable ?? false),
      isAvailable: Boolean(req.body?.isAvailable ?? true),
      stock: Number(req.body?.stock ?? 100),
      popular: Boolean(req.body?.popular ?? false),
      createdAt: util.nowIso(),
    };
    const items = db.menuByRestaurant.get(req.params.restaurantId) || [];
    items.push(menuItem);
    db.menuByRestaurant.set(req.params.restaurantId, items);
    res.json({ item: menuItem });
  },
);

router.put(
  '/seller/restaurants/:restaurantId/menu/:itemId',
  requireAuth,
  requireRole(['seller', 'admin']),
  (req, res) => {
    const items = db.menuByRestaurant.get(req.params.restaurantId) || [];
    const index = items.findIndex(i => i.id === req.params.itemId);
    if (index < 0) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Menu item not found');
    }
    const updated = {
      ...items[index],
      name: req.body?.name ?? items[index].name,
      description: req.body?.description ?? items[index].description,
      price: req.body?.price ?? items[index].price,
      category: req.body?.category ?? items[index].category,
      image: req.body?.image ?? items[index].image,
      isVeg: req.body?.isVeg ?? items[index].isVeg,
      isCustomizable: req.body?.isCustomizable ?? items[index].isCustomizable,
      isAvailable: req.body?.isAvailable ?? items[index].isAvailable,
      stock: req.body?.stock ?? items[index].stock,
      popular: req.body?.popular ?? items[index].popular,
    };
    items[index] = updated;
    db.menuByRestaurant.set(req.params.restaurantId, items);
    res.json({ item: updated });
  },
);

router.delete(
  '/seller/restaurants/:restaurantId/menu/:itemId',
  requireAuth,
  requireRole(['seller', 'admin']),
  (req, res) => {
    const items = db.menuByRestaurant.get(req.params.restaurantId) || [];
    const index = items.findIndex(i => i.id === req.params.itemId);
    if (index < 0) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Menu item not found');
    }
    items.splice(index, 1);
    db.menuByRestaurant.set(req.params.restaurantId, items);
    res.json({ success: true });
  },
);

router.post(
  '/seller/restaurants/:restaurantId/categories',
  requireAuth,
  requireRole(['seller', 'admin']),
  (req, res) => {
    const category = {
      id: util.id('cat'),
      name: String(req.body?.name || 'New Category'),
      sortOrder: 99,
    };
    const categories = db.menuCategories.get(req.params.restaurantId) || [];
    categories.push(category);
    db.menuCategories.set(req.params.restaurantId, categories);
    res.json({ category });
  },
);

router.put(
  '/seller/restaurants/:restaurantId/categories/:categoryId',
  requireAuth,
  requireRole(['seller', 'admin']),
  (req, res) => {
    const categories = db.menuCategories.get(req.params.restaurantId) || [];
    const index = categories.findIndex(c => c.id === req.params.categoryId);
    if (index < 0) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Category not found');
    }
    categories[index] = {
      ...categories[index],
      name: req.body?.name ?? categories[index].name,
      sortOrder: req.body?.sortOrder ?? categories[index].sortOrder,
    };
    db.menuCategories.set(req.params.restaurantId, categories);
    res.json({ category: categories[index] });
  },
);

router.delete(
  '/seller/restaurants/:restaurantId/categories/:categoryId',
  requireAuth,
  requireRole(['seller', 'admin']),
  (req, res) => {
    const categories = db.menuCategories.get(req.params.restaurantId) || [];
    const filtered = categories.filter(c => c.id !== req.params.categoryId);
    db.menuCategories.set(req.params.restaurantId, filtered);
    res.json({ success: true });
  },
);

router.put(
  '/seller/restaurants/:restaurantId/categories/reorder',
  requireAuth,
  requireRole(['seller', 'admin']),
  (req, res) => {
    const categoryIds = Array.isArray(req.body?.categoryIds)
      ? req.body.categoryIds
      : [];
    const categories = db.menuCategories.get(req.params.restaurantId) || [];
    const reordered = categoryIds
      .map((id: string, index: number) => {
        const cat = categories.find(c => c.id === id);
        return cat ? { ...cat, sortOrder: index } : null;
      })
      .filter(Boolean);
    db.menuCategories.set(req.params.restaurantId, reordered);
    res.json({ success: true, categories: reordered });
  },
);

router.get(
  '/seller/restaurants/:restaurantId/earnings/summary',
  requireAuth,
  requireRole(['seller']),
  (req, res) => {
    const summary = {
      totalEarnings: 45600,
      pendingPayout: 12500,
      completedPayouts: 33100,
      thisMonth: 15200,
      lastMonth: 14200,
      orderCount: 312,
      averageOrderValue: 146,
    };
    res.json(summary);
  },
);

router.get(
  '/seller/restaurants/:restaurantId/earnings/chart',
  requireAuth,
  requireRole(['seller']),
  (req, res) => {
    const { period = 'week' } = req.query;
    const chart = generateEarningsChart(period as string);
    res.json({ chart });
  },
);

router.get(
  '/seller/restaurants/:restaurantId/earnings/transactions',
  requireAuth,
  requireRole(['seller']),
  (req, res) => {
    const { page = 1, limit = 20, type, startDate, endDate } = req.query;
    const transactions = [
      {
        id: 'txn_1',
        type: 'order',
        amount: 420,
        status: 'completed',
        createdAt: new Date().toISOString(),
        orderId: 'order_1',
      },
      {
        id: 'txn_2',
        type: 'payout',
        amount: -5000,
        status: 'completed',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'txn_3',
        type: 'order',
        amount: 380,
        status: 'completed',
        createdAt: new Date().toISOString(),
        orderId: 'order_2',
      },
      {
        id: 'txn_4',
        type: 'adjustment',
        amount: -50,
        status: 'completed',
        createdAt: new Date().toISOString(),
      },
    ];
    res.json({
      transactions,
      total: transactions.length,
      page: Number(page),
      limit: Number(limit),
    });
  },
);

router.get(
  '/seller/restaurants/:restaurantId/payouts',
  requireAuth,
  requireRole(['seller']),
  (req, res) => {
    const { page = 1, limit = 20, status } = req.query;
    const payouts = [
      {
        id: 'payout_1',
        amount: 5000,
        status: 'completed',
        createdAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
      },
      {
        id: 'payout_2',
        amount: 7500,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'payout_3',
        amount: 3000,
        status: 'completed',
        createdAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
      },
    ];
    res.json({
      payouts,
      total: payouts.length,
      page: Number(page),
      limit: Number(limit),
    });
  },
);

router.post(
  '/seller/restaurants/:restaurantId/payouts',
  requireAuth,
  requireRole(['seller']),
  (req, res) => {
    const { amount } = req.body;
    const payout = {
      id: `payout_${Date.now()}`,
      amount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    res.json({ success: true, payout });
  },
);

router.get(
  '/seller/restaurants/:restaurantId/payouts/:payoutId',
  requireAuth,
  requireRole(['seller']),
  (req, res) => {
    const payout = {
      id: req.params.payoutId,
      amount: 5000,
      status: 'completed',
      createdAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
    };
    res.json(payout);
  },
);

router.get(
  '/seller/restaurants/:restaurantId/bank-details',
  requireAuth,
  requireRole(['seller']),
  (req, res) => {
    const details = {
      accountNumber: '****4567',
      ifsc: 'SBIN0001234',
      accountHolder: 'Restaurant Name',
      verified: true,
    };
    res.json(details);
  },
);

router.put(
  '/seller/restaurants/:restaurantId/bank-details',
  requireAuth,
  requireRole(['seller']),
  (req, res) => {
    const { accountNumber, ifsc, accountHolder } = req.body;
    const details = { accountNumber, ifsc, accountHolder, verified: false };
    res.json(details);
  },
);

router.post(
  '/seller/restaurants/:restaurantId/bank-details/verify',
  requireAuth,
  requireRole(['seller']),
  (req, res) => {
    res.json({ success: true, verified: true });
  },
);

router.get(
  '/seller/restaurants/:restaurantId/commission',
  requireAuth,
  requireRole(['seller']),
  (req, res) => {
    const commission = {
      rate: 18,
      totalOrders: 312,
      grossSales: 45600,
      commissionAmount: 8208,
      platformFee: 1200,
      netPayable: 34392,
      breakdown: [
        {
          period: 'Apr 1-7',
          orders: 52,
          sales: 7600,
          commission: 1368,
          platformFee: 200,
        },
        {
          period: 'Mar 25-31',
          orders: 48,
          sales: 7100,
          commission: 1278,
          platformFee: 180,
        },
      ],
    };
    res.json(commission);
  },
);

router.get(
  '/seller/restaurants/:restaurantId/invoice',
  requireAuth,
  requireRole(['seller']),
  (req, res) => {
    res.json({
      invoiceUrl: 'https://storage.example.com/invoices/invoice_2026_04.pdf',
    });
  },
);

function generateEarningsChart(period: string) {
  const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
  const chart = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    chart.push({
      date: date.toISOString().split('T')[0],
      orders: Math.floor(Math.random() * 20) + 5,
      earnings: Math.floor(Math.random() * 2000) + 500,
    });
  }
  return chart;
}

export default router;
