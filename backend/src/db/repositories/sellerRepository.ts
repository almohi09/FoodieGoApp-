import { prisma, usePostgres } from "../prismaClient.js";

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

export const sellerRepository = {
  isEnabled(): boolean {
    return usePostgres;
  },

  async getRestaurant(restaurantId: string) {
    if (!usePostgres) {
      return null;
    }
    return prisma.restaurant.findUnique({ where: { id: restaurantId } });
  },

  async setRestaurantOperationalStatus(restaurantId: string, isOpen: boolean) {
    if (!usePostgres) {
      return null;
    }
    const existing = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!existing) {
      return null;
    }
    return prisma.restaurant.update({
      where: { id: restaurantId },
      data: { isOpen },
    });
  },

  async getRestaurantOrders(restaurantId: string) {
    if (!usePostgres) {
      return null;
    }
    const rows = await prisma.order.findMany({
      where: { restaurantId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toOrderDto);
  },

  async getPendingRestaurantOrders(restaurantId: string) {
    if (!usePostgres) {
      return null;
    }
    const rows = await prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: ["pending", "confirmed", "preparing"] },
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toOrderDto);
  },

  async updateOrderStatus(
    orderId: string,
    data: { status?: string; acceptedAt?: Date; startedPrepAt?: Date; readyAt?: Date },
  ): Promise<
    | null
    | { ok: true; order: any; trackingEventRecorded: boolean }
    | { ok: false; code: "NOT_FOUND" | "OUT_OF_ORDER" }
  > {
    if (!usePostgres) {
      return null;
    }
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!existing) {
      return { ok: false, code: "NOT_FOUND" };
    }

    const statusRank: Record<string, number> = {
      pending: 1,
      confirmed: 2,
      preparing: 3,
      ready_for_pickup: 4,
      out_for_delivery: 5,
      delivered: 6,
      cancelled: 99,
      refunded: 100,
    };

    const nextStatus = data.status || existing.status;
    const currentRank = statusRank[existing.status] || 0;
    const nextRank = statusRank[nextStatus] || 0;
    const allowsRegressionTarget = nextStatus === "cancelled" || nextStatus === "refunded";
    if (nextStatus !== existing.status && nextRank < currentRank && !allowsRegressionTarget) {
      return { ok: false, code: "OUT_OF_ORDER" };
    }

    const transitionMessageByStatus: Record<string, string> = {
      pending: "Order placed",
      confirmed: "Order accepted by restaurant",
      preparing: "Order is being prepared",
      ready_for_pickup: "Order is ready for pickup",
      out_for_delivery: "Order is out for delivery",
      delivered: "Order delivered",
      cancelled: "Order cancelled",
      refunded: "Order refunded",
    };

    const result = await prisma.$transaction(async (tx) => {
      const latestEvent = await tx.trackingEvent.findFirst({
        where: { orderId },
        orderBy: { timestamp: "desc" },
      });
      const shouldWriteTrackingEvent = !!data.status && latestEvent?.status !== nextStatus;

      const updated = await tx.order.update({
        where: { id: orderId },
        data,
        include: { items: true },
      });

      if (shouldWriteTrackingEvent) {
        await tx.trackingEvent.create({
          data: {
            orderId,
            status: nextStatus,
            message: transitionMessageByStatus[nextStatus] || `Order status updated to ${nextStatus}`,
          },
        });
      }
      return { order: updated, trackingEventRecorded: shouldWriteTrackingEvent };
    });

    return {
      ok: true,
      order: toOrderDto(result.order),
      trackingEventRecorded: result.trackingEventRecorded,
    };
  },

  async getRestaurantMenu(restaurantId: string) {
    if (!usePostgres) {
      return null;
    }
    return prisma.menuItem.findMany({
      where: { restaurantId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  },

  async setMenuAvailability(restaurantId: string, itemId: string, isAvailable: boolean) {
    if (!usePostgres) {
      return null;
    }
    const existing = await prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId },
    });
    if (!existing) {
      return null;
    }
    return prisma.menuItem.update({
      where: { id: itemId },
      data: { isAvailable },
    });
  },

  async setMenuStock(restaurantId: string, itemId: string, quantity: number) {
    if (!usePostgres) {
      return null;
    }
    const existing = await prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId },
    });
    if (!existing) {
      return null;
    }
    return prisma.menuItem.update({
      where: { id: itemId },
      data: {
        stock: quantity,
        isAvailable: quantity > 0,
      },
    });
  },
};

export default sellerRepository;
