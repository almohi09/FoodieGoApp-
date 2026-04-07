import { Router } from 'express';
import {
  requireAuth,
  requireRole,
  type AuthedRequest,
} from '../../middleware/auth.js';
import { db, util } from '../../store.js';

const router = Router();

interface RiderProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleType?: 'bike' | 'scooter' | 'cycle';
  vehicleNumber?: string;
  isOnline: boolean;
  rating: number;
  totalDeliveries: number;
}

interface RiderOrder {
  id: string;
  orderId: string;
  status:
    | 'assigned'
    | 'picked_up'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled';
  restaurantName: string;
  restaurantAddress: string;
  restaurantLat: number;
  restaurantLng: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerLat: number;
  customerLng: number;
  items: { name: string; quantity: number }[];
  totalAmount: number;
  deliveryFee: number;
  assignedAt: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  proofOfDelivery?: {
    type: 'otp' | 'photo' | 'signature';
    value?: string;
    photoUrl?: string;
    signatureUrl?: string;
    deliveredAt: string;
  };
  estimatedDeliveryTime?: string;
  deliveryInstructions?: string;
}

const riderProfiles = new Map<string, RiderProfile>([
  [
    'rider_1',
    {
      id: 'rider_1',
      name: 'Amit Rider',
      phone: '+919000000021',
      isOnline: false,
      rating: 4.8,
      totalDeliveries: 156,
    },
  ],
  [
    'rider_2',
    {
      id: 'rider_2',
      name: 'Riya Rider',
      phone: '+919000000022',
      isOnline: false,
      rating: 4.9,
      totalDeliveries: 203,
    },
  ],
]);

const riderOrders = new Map<string, RiderOrder>();
const riderLocations = new Map<
  string,
  { lat: number; lng: number; updatedAt: string }
>();

function initializeRiderOrders() {
  const orders = Array.from(db.orders.values()).filter(
    o =>
      o.riderId &&
      (o.status === 'confirmed' ||
        o.status === 'preparing' ||
        o.status === 'ready_for_pickup'),
  );

  for (const order of orders) {
    const restaurant = db.restaurants.get(order.restaurantId);
    const riderOrder: RiderOrder = {
      id: `ro_${order.id}`,
      orderId: order.id,
      status: 'assigned',
      restaurantName: order.restaurantName,
      restaurantAddress: restaurant?.address || '123 Restaurant St',
      restaurantLat: 28.61,
      restaurantLng: 77.35,
      customerName: order.userId,
      customerPhone: '+919999999999',
      customerAddress: order.deliveryAddress?.address || '456 Customer Ave',
      customerLat: 28.63,
      customerLng: 77.37,
      items: order.items.map(i => ({ name: i.name, quantity: i.quantity })),
      totalAmount: order.finalAmount,
      deliveryFee: order.deliveryFee,
      assignedAt: order.createdAt,
      estimatedDeliveryTime: new Date(Date.now() + 35 * 60000).toISOString(),
    };
    riderOrders.set(riderOrder.id, riderOrder);
  }
}

initializeRiderOrders();

router.use(requireAuth);
router.use(requireRole(['rider']));

router.get('/orders/assigned', (req: AuthedRequest, res) => {
  const riderId = req.user!.id;
  const assignedOrders = Array.from(riderOrders.values()).filter(
    o =>
      o.status === 'assigned' ||
      o.status === 'picked_up' ||
      o.status === 'out_for_delivery',
  );
  res.json({ orders: assignedOrders });
});

router.get('/orders/:orderId', (req: AuthedRequest, res) => {
  const { orderId } = req.params;
  const riderOrder = riderOrders.get(orderId);

  if (!riderOrder) {
    return res.status(404).json({ message: 'Order not found' });
  }

  res.json({ order: riderOrder });
});

router.post('/orders/:orderId/accept', (req: AuthedRequest, res) => {
  const { orderId } = req.params;
  const riderOrder = riderOrders.get(orderId);

  if (!riderOrder) {
    return res.status(404).json({ message: 'Order not found' });
  }

  riderOrder.status = 'assigned';
  res.json({ order: riderOrder });
});

router.post('/orders/:orderId/reject', (req: AuthedRequest, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;

  const riderOrder = riderOrders.get(orderId);
  if (!riderOrder) {
    return res.status(404).json({ message: 'Order not found' });
  }

  riderOrder.status = 'cancelled';
  res.json({ message: 'Order rejected', reason });
});

router.post('/orders/:orderId/start-pickup', (req: AuthedRequest, res) => {
  const { orderId } = req.params;
  const riderOrder = riderOrders.get(orderId);

  if (!riderOrder) {
    return res.status(404).json({ message: 'Order not found' });
  }

  riderOrder.status = 'picked_up';
  riderOrder.pickedUpAt = new Date().toISOString();
  res.json({ order: riderOrder });
});

router.post('/orders/:orderId/confirm-pickup', (req: AuthedRequest, res) => {
  const { orderId } = req.params;
  const riderOrder = riderOrders.get(orderId);

  if (!riderOrder) {
    return res.status(404).json({ message: 'Order not found' });
  }

  riderOrder.status = 'out_for_delivery';
  res.json({ order: riderOrder });
});

router.post('/orders/:orderId/start-delivery', (req: AuthedRequest, res) => {
  const { orderId } = req.params;
  const riderOrder = riderOrders.get(orderId);

  if (!riderOrder) {
    return res.status(404).json({ message: 'Order not found' });
  }

  riderOrder.status = 'out_for_delivery';
  res.json({ order: riderOrder });
});

router.post('/orders/:orderId/deliver', (req: AuthedRequest, res) => {
  const { orderId } = req.params;
  const { type, otp, photoBase64, signatureBase64, notes } = req.body;

  const riderOrder = riderOrders.get(orderId);
  if (!riderOrder) {
    return res.status(404).json({ message: 'Order not found' });
  }

  riderOrder.status = 'delivered';
  riderOrder.deliveredAt = new Date().toISOString();
  riderOrder.proofOfDelivery = {
    type: type || 'otp',
    value: otp,
    deliveredAt: riderOrder.deliveredAt,
  };

  const order = db.orders.get(riderOrder.orderId);
  if (order) {
    order.status = 'delivered';
    order.deliveredAt = riderOrder.deliveredAt;
  }

  const profile = riderProfiles.get(req.user!.id);
  if (profile) {
    profile.totalDeliveries += 1;
  }

  res.json({ order: riderOrder });
});

router.post('/orders/:orderId/cancel', (req: AuthedRequest, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;

  const riderOrder = riderOrders.get(orderId);
  if (!riderOrder) {
    return res.status(404).json({ message: 'Order not found' });
  }

  riderOrder.status = 'cancelled';
  res.json({ message: 'Delivery cancelled', reason });
});

router.post('/location', (req: AuthedRequest, res) => {
  const { lat, lng } = req.body;
  const riderId = req.user!.id;

  riderLocations.set(riderId, {
    lat,
    lng,
    updatedAt: new Date().toISOString(),
  });
  res.json({ success: true });
});

router.get('/stats', (req: AuthedRequest, res) => {
  const profile = riderProfiles.get(req.user!.id);

  const stats = {
    totalDeliveries: profile?.totalDeliveries || 0,
    completedToday: 3,
    completedWeek: 18,
    totalEarnings: 15600,
    earningsToday: 420,
    earningsWeek: 2850,
    averageRating: profile?.rating || 4.8,
    acceptanceRate: 94,
    onTimeDeliveryRate: 96,
    totalDistance: 523,
  };

  res.json(stats);
});

router.get('/earnings', (req: AuthedRequest, res) => {
  const { period = 'week', page = 1, limit = 20 } = req.query;

  const orders = Array.from(riderOrders.values())
    .filter(o => o.status === 'delivered')
    .slice(0, Number(limit));

  const earnings = {
    total: 2850,
    orders: orders.map(o => ({
      orderId: o.orderId,
      amount: o.deliveryFee || 40,
      deliveredAt: o.deliveredAt || new Date().toISOString(),
      distance: 2.5,
    })),
    pagination: {
      total: orders.length,
      page: Number(page),
      limit: Number(limit),
    },
  };

  res.json(earnings);
});

router.get('/orders/history', (req: AuthedRequest, res) => {
  const { page = 1, limit = 20, status } = req.query;

  let orders = Array.from(riderOrders.values()).filter(
    o => o.status === 'delivered' || o.status === 'cancelled',
  );

  if (status) {
    orders = orders.filter(o => o.status === status);
  }

  const paginated = orders.slice(
    (Number(page) - 1) * Number(limit),
    Number(page) * Number(limit),
  );

  res.json({ orders: paginated, total: orders.length });
});

router.get('/profile', (req: AuthedRequest, res) => {
  const profile = riderProfiles.get(req.user!.id);
  res.json(profile);
});

router.patch('/profile', (req: AuthedRequest, res) => {
  const { name, vehicleType, vehicleNumber } = req.body;
  const profile = riderProfiles.get(req.user!.id);

  if (profile) {
    if (name) profile.name = name;
    if (vehicleType) profile.vehicleType = vehicleType;
    if (vehicleNumber) profile.vehicleNumber = vehicleNumber;
  }

  res.json(profile);
});

router.post('/status', (req: AuthedRequest, res) => {
  const { isOnline } = req.body;
  const profile = riderProfiles.get(req.user!.id);

  if (profile) {
    profile.isOnline = isOnline;
  }

  res.json({ success: true, isOnline });
});

router.post('/orders/:orderId/upload-proof', (req: AuthedRequest, res) => {
  const { orderId } = req.params;
  const { photo } = req.body;

  const riderOrder = riderOrders.get(orderId);
  if (!riderOrder) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const photoUrl = `https://storage.example.com/proofs/${orderId}_${Date.now()}.jpg`;
  res.json({ photoUrl });
});

export default router;
