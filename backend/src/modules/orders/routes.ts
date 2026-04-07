import { Router } from 'express';
import authRepository from '../../db/repositories/authRepository.js';
import catalogRepository from '../../db/repositories/catalogRepository.js';
import idempotencyRepository from '../../db/repositories/idempotencyRepository.js';
import orderRepository from '../../db/repositories/orderRepository.js';
import { getRestaurantMenuItem } from '../../lib/core.js';
import { sendApiError } from '../../lib/httpErrors.js';
import { validatePlaceOrderInput } from '../../lib/validation.js';
import {
  requireAuth,
  requireRole,
  type AuthedRequest,
} from '../../middleware/auth.js';
import { db, util } from '../../store.js';

const router = Router();

const getIdempotencyKey = (req: any) =>
  String(
    req.headers['idempotency-key'] || req.headers['x-idempotency-key'] || '',
  ).trim();

router.post(
  '/checkout/quote',
  requireAuth,
  requireRole(['customer']),
  (req: AuthedRequest, res) => {
    const restaurantId = String(req.body?.restaurantId || '');
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    let subtotal = 0;
    for (const item of items) {
      const menuItem = getRestaurantMenuItem(
        restaurantId,
        String(item.menuItemId),
      );
      if (!menuItem) {
        continue;
      }
      subtotal += menuItem.price * Number(item.quantity || 1);
    }
    const deliveryFee = 35;
    const packagingFee = 10;
    const taxes = Number((subtotal * 0.05).toFixed(2));
    const discount = 0;
    const foodieCoinsDiscount = 0;
    const total = subtotal + deliveryFee + packagingFee + taxes;
    return res.json({
      subtotal,
      deliveryFee,
      packagingFee,
      taxes,
      discount,
      foodieCoinsDiscount,
      total,
      savings: discount + foodieCoinsDiscount,
    });
  },
);

router.post('/checkout/apply-coupon', (_req, res) => {
  return res.json({
    coupon: {
      id: 'coupon_1',
      code: 'WELCOME100',
      description: 'Flat INR 100 off',
      discountType: 'flat',
      discountValue: 100,
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      isActive: true,
    },
    discount: 100,
  });
});

router.post('/checkout/remove-coupon', (_req, res) => {
  res.json({ success: true });
});

router.post('/checkout/validate-coins', (req, res) => {
  const amount = Number(req.body?.amount || 0);
  const coinsToUse = Number(req.body?.coinsToUse || 0);
  const maxCoinsUsable = Math.floor(amount * 0.1);
  const discount = Math.min(maxCoinsUsable, coinsToUse);
  res.json({ maxCoinsUsable, discount });
});

router.get('/coupons/available', (_req, res) => {
  res.json({
    coupons: [
      {
        id: 'coupon_1',
        code: 'WELCOME100',
        description: 'Flat INR 100 off',
        discountType: 'flat',
        discountValue: 100,
        minimumOrder: 299,
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        isActive: true,
      },
    ],
  });
});

router.post(
  '/checkout/place-order',
  requireAuth,
  requireRole(['customer']),
  (req: AuthedRequest, res) => {
    const parsed = validatePlaceOrderInput(req.body);
    if (!parsed.ok) {
      return sendApiError(
        res,
        400,
        'VALIDATION_ERROR',
        parsed.message,
        parsed.details,
      );
    }
    const payload = parsed.data;

    if (orderRepository.isEnabled()) {
      return (async () => {
        const idempotencyKey = getIdempotencyKey(req);
        if (idempotencyRepository.isEnabled()) {
          if (!idempotencyKey) {
            return sendApiError(
              res,
              400,
              'VALIDATION_ERROR',
              'Missing Idempotency-Key header',
              {
                field: 'Idempotency-Key',
              },
            );
          }
          const cached = await idempotencyRepository.find(
            req.session!.userId,
            'checkout_place_order',
            idempotencyKey,
          );
          if (cached) {
            return res.status(cached.statusCode).json(cached.response);
          }
        }

        const pgUser = await authRepository.getUserById(req.session!.userId);
        if (!pgUser) {
          return sendApiError(res, 404, 'NOT_FOUND', 'User not found');
        }
        const restaurant = await catalogRepository.getRestaurantById(
          payload.restaurantId,
        );
        if (!restaurant) {
          return sendApiError(res, 404, 'NOT_FOUND', 'Restaurant not found');
        }
        const menu =
          (await catalogRepository.getMenuByRestaurant(restaurant.id)) || [];
        const address =
          pgUser.addresses.find(a => a.id === payload.deliveryAddressId) ||
          pgUser.addresses[0];
        if (!address) {
          return sendApiError(
            res,
            400,
            'VALIDATION_ERROR',
            'Delivery address required',
            { field: 'deliveryAddressId' },
          );
        }
        let subtotal = 0;
        const items = payload.items
          .map((raw: any) => {
            const menuItem = menu.find(item => item.id === raw.menuItemId);
            if (!menuItem) {
              return undefined;
            }
            const quantity = raw.quantity;
            subtotal += menuItem.price * quantity;
            return {
              menuItemId: menuItem.id,
              name: menuItem.name,
              quantity,
              price: menuItem.price,
              customizations: raw.customizations,
            };
          })
          .filter(Boolean) as any[];
        const deliveryFee = Number(restaurant.deliveryFee || 35);
        const taxes = Number((subtotal * 0.05).toFixed(2));
        const finalAmount = subtotal + deliveryFee + taxes;
        const paymentMethod = payload.paymentMethod;
        const created = await orderRepository.createOrder({
          userId: pgUser.id,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          restaurantImage: restaurant.image,
          status: 'pending',
          items,
          subtotal,
          deliveryFee,
          discount: 0,
          foodieCoinsUsed: payload.foodieCoinsUsed,
          foodieCoinsEarned: Math.floor(finalAmount / 20),
          finalAmount,
          deliveryAddress: {
            id: address.id,
            label: address.label,
            address: address.address,
            landmark: address.landmark || undefined,
            lat: address.lat,
            lng: address.lng,
            isDefault: address.isDefault,
          },
          paymentMethod,
          estimatedDelivery: new Date(Date.now() + 40 * 60000).toISOString(),
          sellerId: restaurant.sellerId,
        });
        if (!created) {
          return sendApiError(
            res,
            500,
            'INTERNAL_ERROR',
            'Unable to create order',
          );
        }
        db.paymentByOrderId.set(created.id, {
          orderId: created.id,
          status: 'pending',
          method: paymentMethod as any,
          source: 'unknown',
          lastUpdatedAt: util.nowIso(),
        });
        const response = {
          orderId: created.id,
          paymentDetails: {
            amount: created.finalAmount,
            method: created.paymentMethod,
          },
        };
        if (idempotencyRepository.isEnabled()) {
          await idempotencyRepository.save(
            req.session!.userId,
            'checkout_place_order',
            idempotencyKey,
            response,
            200,
          );
        }
        return res.json(response);
      })();
    }

    const user = db.users.get(req.session!.userId);
    if (!user) {
      return sendApiError(res, 404, 'NOT_FOUND', 'User not found');
    }
    const restaurant = db.restaurants.get(payload.restaurantId);
    if (!restaurant) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Restaurant not found');
    }
    const address =
      user.addresses.find(a => a.id === payload.deliveryAddressId) ||
      user.addresses[0];
    if (!address) {
      return sendApiError(
        res,
        400,
        'VALIDATION_ERROR',
        'Delivery address required',
        { field: 'deliveryAddressId' },
      );
    }
    let subtotal = 0;
    const items = payload.items
      .map((raw: any) => {
        const menuItem = getRestaurantMenuItem(restaurant.id, raw.menuItemId);
        if (!menuItem) {
          return undefined;
        }
        const quantity = raw.quantity;
        subtotal += menuItem.price * quantity;
        return {
          id: util.id('oi'),
          menuItemId: menuItem.id,
          name: menuItem.name,
          quantity,
          price: menuItem.price,
          customizations: raw.customizations,
        };
      })
      .filter(Boolean);
    const deliveryFee = Number(restaurant.fees?.delivery || 35);
    const taxes = Number((subtotal * 0.05).toFixed(2));
    const finalAmount = subtotal + deliveryFee + taxes;
    const paymentMethod = payload.paymentMethod;
    const order = {
      id: util.id('ord'),
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantImage: restaurant.image,
      status: 'pending',
      items,
      subtotal,
      deliveryFee,
      discount: 0,
      foodieCoinsUsed: payload.foodieCoinsUsed,
      foodieCoinsEarned: Math.floor(finalAmount / 20),
      finalAmount,
      deliveryAddress: address,
      paymentMethod,
      createdAt: util.nowIso(),
      estimatedDelivery: new Date(Date.now() + 40 * 60000).toISOString(),
      userId: user.id,
      sellerId: restaurant.sellerId,
    };
    db.orders.set(order.id, order as any);
    db.trackingByOrderId.set(order.id, [
      {
        id: util.id('evt'),
        status: 'pending',
        timestamp: util.nowIso(),
        message: 'Order placed',
      },
    ]);
    db.paymentByOrderId.set(order.id, {
      orderId: order.id,
      status: 'pending',
      method: paymentMethod as any,
      source: 'unknown',
      lastUpdatedAt: util.nowIso(),
    });
    return res.json({
      orderId: order.id,
      paymentDetails: {
        amount: order.finalAmount,
        method: order.paymentMethod,
      },
    });
  },
);

router.post(
  '/orders',
  requireAuth,
  requireRole(['customer']),
  (req: AuthedRequest, res) => {
    if (orderRepository.isEnabled()) {
      return (async () => {
        const pgUser = await authRepository.getUserById(req.session!.userId);
        if (!pgUser) {
          return res
            .status(404)
            .json({ success: false, message: 'User not found' });
        }
        const restaurantId = String(req.body?.restaurantId || '');
        const restaurant =
          await catalogRepository.getRestaurantById(restaurantId);
        if (!restaurant) {
          return res
            .status(404)
            .json({ success: false, message: 'Restaurant not found' });
        }
        const menu =
          (await catalogRepository.getMenuByRestaurant(restaurant.id)) || [];
        const deliveryAddress =
          pgUser.addresses.find(a => a.id === req.body?.deliveryAddressId) ||
          pgUser.addresses[0];
        if (!deliveryAddress) {
          return res
            .status(400)
            .json({ success: false, message: 'Delivery address required' });
        }
        const itemsReq = Array.isArray(req.body?.items) ? req.body.items : [];
        let subtotal = 0;
        const items = itemsReq
          .map((raw: any) => {
            const menuItem = menu.find(
              item => item.id === String(raw.menuItemId),
            );
            if (!menuItem) {
              return undefined;
            }
            const quantity = Number(raw.quantity || 1);
            subtotal += menuItem.price * quantity;
            return {
              menuItemId: menuItem.id,
              name: menuItem.name,
              quantity,
              price: menuItem.price,
              customizations: raw.customizations,
            };
          })
          .filter(Boolean) as any[];

        const created = await orderRepository.createOrder({
          userId: pgUser.id,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          restaurantImage: restaurant.image,
          status: 'pending',
          items,
          subtotal,
          deliveryFee: Number(restaurant.deliveryFee || 35),
          discount: 0,
          foodieCoinsUsed: 0,
          foodieCoinsEarned: 0,
          finalAmount: subtotal + Number(restaurant.deliveryFee || 35),
          deliveryAddress: {
            id: deliveryAddress.id,
            label: deliveryAddress.label,
            address: deliveryAddress.address,
            landmark: deliveryAddress.landmark || undefined,
            lat: deliveryAddress.lat,
            lng: deliveryAddress.lng,
            isDefault: deliveryAddress.isDefault,
          },
          paymentMethod: String(req.body?.paymentMethod || 'cod'),
          sellerId: restaurant.sellerId,
        });
        if (!created) {
          return res
            .status(500)
            .json({ success: false, message: 'Unable to create order' });
        }
        return res.json({ order: created });
      })();
    }

    const user = db.users.get(req.session!.userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }
    const restaurant = db.restaurants.get(String(req.body?.restaurantId || ''));
    if (!restaurant) {
      return res
        .status(404)
        .json({ success: false, message: 'Restaurant not found' });
    }
    const deliveryAddress =
      user.addresses.find(a => a.id === req.body?.deliveryAddressId) ||
      user.addresses[0];
    if (!deliveryAddress) {
      return res
        .status(400)
        .json({ success: false, message: 'Delivery address required' });
    }
    const itemsReq = Array.isArray(req.body?.items) ? req.body.items : [];
    let subtotal = 0;
    const items = itemsReq
      .map((raw: any) => {
        const menuItem = getRestaurantMenuItem(
          restaurant.id,
          String(raw.menuItemId),
        );
        if (!menuItem) {
          return undefined;
        }
        const quantity = Number(raw.quantity || 1);
        subtotal += menuItem.price * quantity;
        return {
          id: util.id('oi'),
          menuItemId: menuItem.id,
          name: menuItem.name,
          quantity,
          price: menuItem.price,
          customizations: raw.customizations,
        };
      })
      .filter(Boolean);
    const order = {
      id: util.id('ord'),
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantImage: restaurant.image,
      status: 'pending',
      items,
      subtotal,
      deliveryFee: Number(restaurant.fees?.delivery || 35),
      discount: 0,
      foodieCoinsUsed: 0,
      foodieCoinsEarned: 0,
      finalAmount: subtotal + Number(restaurant.fees?.delivery || 35),
      deliveryAddress,
      paymentMethod: (req.body?.paymentMethod || 'cod') as any,
      createdAt: util.nowIso(),
      userId: user.id,
      sellerId: restaurant.sellerId,
    };
    db.orders.set(order.id, order as any);
    return res.json({ order });
  },
);

router.get(
  '/orders',
  requireAuth,
  requireRole(['customer']),
  (req: AuthedRequest, res) => {
    if (orderRepository.isEnabled()) {
      return (async () => {
        const status =
          typeof req.query.status === 'string' ? req.query.status : undefined;
        const orders = await orderRepository.getOrdersByUser(
          req.session!.userId,
          status,
        );
        if (!orders) {
          return res.status(500).json({ message: 'Unable to fetch orders' });
        }
        return res.json({ orders, total: orders.length });
      })();
    }

    const status =
      typeof req.query.status === 'string' ? req.query.status : undefined;
    const orders = Array.from(db.orders.values()).filter(order => {
      if (order.userId !== req.session!.userId) {
        return false;
      }
      return status ? order.status === status : true;
    });
    res.json({ orders, total: orders.length });
  },
);

router.get(
  '/orders/active',
  requireAuth,
  requireRole(['customer']),
  (req: AuthedRequest, res) => {
    if (orderRepository.isEnabled()) {
      return (async () => {
        const orders = await orderRepository.getActiveOrdersByUser(
          req.session!.userId,
        );
        if (!orders) {
          return res
            .status(500)
            .json({ message: 'Unable to fetch active orders' });
        }
        return res.json({ orders });
      })();
    }

    const orders = Array.from(db.orders.values()).filter(order => {
      return (
        order.userId === req.session!.userId &&
        !['delivered', 'cancelled', 'refunded'].includes(order.status)
      );
    });
    res.json({ orders });
  },
);

router.get('/orders/:orderId', requireAuth, (req, res) => {
  if (orderRepository.isEnabled()) {
    return (async () => {
      const order = await orderRepository.getOrderById(req.params.orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      return res.json({ order });
    })();
  }

  const order = db.orders.get(req.params.orderId);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }
  res.json({ order });
});

router.post('/orders/:orderId/cancel', requireAuth, (req, res) => {
  if (orderRepository.isEnabled()) {
    return (async () => {
      const order = await orderRepository.cancelOrder(req.params.orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      return res.json({ order });
    })();
  }

  const order = db.orders.get(req.params.orderId);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }
  order.status = 'cancelled';
  db.orders.set(order.id, order);
  const events = db.trackingByOrderId.get(order.id) || [];
  events.push({
    id: util.id('evt'),
    status: 'cancelled',
    timestamp: util.nowIso(),
    message: 'Order cancelled',
  });
  db.trackingByOrderId.set(order.id, events);
  return res.json({ order });
});

router.post('/orders/:orderId/reorder', requireAuth, (req, res) => {
  if (orderRepository.isEnabled()) {
    return (async () => {
      const order = await orderRepository.getOrderById(req.params.orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      const cartItems = order.items.map(
        (item: {
          menuItemId: string;
          quantity: number;
          customizations?: string;
        }) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          customizations: item.customizations,
        }),
      );
      return res.json({ cartItems });
    })();
  }

  const order = db.orders.get(req.params.orderId);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }
  const cartItems = order.items.map(item => ({
    menuItemId: item.menuItemId,
    quantity: item.quantity,
    customizations: item.customizations,
  }));
  res.json({ cartItems });
});

router.get('/orders/:orderId/status', requireAuth, (req, res) => {
  if (orderRepository.isEnabled()) {
    return (async () => {
      const order = await orderRepository.getOrderById(req.params.orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      return res.json({
        status: order.status,
        estimatedDelivery: order.estimatedDelivery,
      });
    })();
  }

  const order = db.orders.get(req.params.orderId);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }
  res.json({
    status: order.status,
    estimatedDelivery: order.estimatedDelivery,
  });
});

router.get('/orders/:orderId/tracking', requireAuth, (req, res) => {
  if (orderRepository.isEnabled()) {
    return (async () => {
      const order = await orderRepository.getOrderById(req.params.orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      const events = await orderRepository.getTrackingEvents(order.id);
      return res.json({ order, events: events || [] });
    })();
  }

  const order = db.orders.get(req.params.orderId);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }
  res.json({ order, events: db.trackingByOrderId.get(order.id) || [] });
});

router.post('/orders/:orderId/rate', requireAuth, (_req, res) => {
  res.json({ success: true });
});

router.post(
  '/orders/:orderId/subscribe-notifications',
  requireAuth,
  (_req, res) => {
    res.json({ success: true });
  },
);

router.delete(
  '/orders/:orderId/subscribe-notifications',
  requireAuth,
  (_req, res) => {
    res.json({ success: true });
  },
);

export default router;
