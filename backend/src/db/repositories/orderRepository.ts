import { prisma, usePostgres } from "../prismaClient.js";

type CreateOrderItemInput = {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  customizations?: string;
};

type CreateOrderInput = {
  userId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  status: string;
  items: CreateOrderItemInput[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  foodieCoinsUsed: number;
  foodieCoinsEarned: number;
  finalAmount: number;
  deliveryAddress: Record<string, unknown>;
  paymentMethod: string;
  estimatedDelivery?: string;
  sellerId?: string;
};

const toOrderDto = (row: any) => ({
  id: row.id,
  restaurantId: row.restaurantId,
  restaurantName: row.restaurantName,
  restaurantImage: row.restaurantImage,
  status: row.status,
  items: (row.items || []).map((item: any) => ({
    id: item.id,
    menuItemId: item.menuItemId,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    customizations: item.customizations || undefined,
  })),
  subtotal: row.subtotal,
  deliveryFee: row.deliveryFee,
  discount: row.discount,
  foodieCoinsUsed: row.foodieCoinsUsed,
  foodieCoinsEarned: row.foodieCoinsEarned,
  finalAmount: row.finalAmount,
  deliveryAddress: row.deliveryAddress as any,
  paymentMethod: row.paymentMethod,
  createdAt: row.createdAt.toISOString(),
  estimatedDelivery: row.estimatedDelivery ? row.estimatedDelivery.toISOString() : undefined,
  deliveredAt: row.deliveredAt ? row.deliveredAt.toISOString() : undefined,
  userId: row.userId,
  sellerId: row.sellerId || undefined,
  acceptedAt: row.acceptedAt ? row.acceptedAt.toISOString() : undefined,
  startedPrepAt: row.startedPrepAt ? row.startedPrepAt.toISOString() : undefined,
  readyAt: row.readyAt ? row.readyAt.toISOString() : undefined,
});

const toTrackingDto = (row: any) => ({
  id: row.id,
  status: row.status,
  timestamp: row.timestamp.toISOString(),
  message: row.message,
  location: (row.location as any) || undefined,
});

export const orderRepository = {
  isEnabled(): boolean {
    return usePostgres;
  },

  async createOrder(data: CreateOrderInput) {
    if (!usePostgres) {
      return null;
    }
    const created = await prisma.order.create({
      data: {
        userId: data.userId,
        restaurantId: data.restaurantId,
        restaurantName: data.restaurantName,
        restaurantImage: data.restaurantImage,
        status: data.status,
        subtotal: data.subtotal,
        deliveryFee: data.deliveryFee,
        discount: data.discount,
        foodieCoinsUsed: data.foodieCoinsUsed,
        foodieCoinsEarned: data.foodieCoinsEarned,
        finalAmount: data.finalAmount,
        deliveryAddress: data.deliveryAddress as any,
        paymentMethod: data.paymentMethod,
        estimatedDelivery: data.estimatedDelivery ? new Date(data.estimatedDelivery) : undefined,
        sellerId: data.sellerId,
        items: {
          create: data.items.map((item) => ({
            menuItemId: item.menuItemId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            customizations: item.customizations,
          })),
        },
        trackingEvents: {
          create: {
            status: "pending",
            message: "Order placed",
          },
        },
      },
      include: {
        items: true,
      },
    });
    return toOrderDto(created);
  },

  async getOrderById(orderId: string) {
    if (!usePostgres) {
      return null;
    }
    const row = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    return row ? toOrderDto(row) : null;
  },

  async getOrdersByUser(userId: string, status?: string) {
    if (!usePostgres) {
      return null;
    }
    const rows = await prisma.order.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toOrderDto);
  },

  async getActiveOrdersByUser(userId: string) {
    if (!usePostgres) {
      return null;
    }
    const rows = await prisma.order.findMany({
      where: {
        userId,
        status: { notIn: ["delivered", "cancelled", "refunded"] },
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toOrderDto);
  },

  async cancelOrder(orderId: string) {
    if (!usePostgres) {
      return null;
    }
    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) {
      return null;
    }
    await prisma.trackingEvent.create({
      data: {
        orderId,
        status: "cancelled",
        message: "Order cancelled",
      },
    });
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: "cancelled" },
      include: { items: true },
    });
    return toOrderDto(updated);
  },

  async getTrackingEvents(orderId: string) {
    if (!usePostgres) {
      return null;
    }
    const rows = await prisma.trackingEvent.findMany({
      where: { orderId },
      orderBy: { timestamp: "asc" },
    });
    return rows.map(toTrackingDto);
  },
};

export default orderRepository;
