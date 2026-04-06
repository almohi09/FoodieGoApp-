import { prisma, usePostgres } from "../prismaClient.js";

export const adminRepository = {
  isEnabled(): boolean {
    return usePostgres;
  },

  async getDashboardStats() {
    if (!usePostgres) {
      return null;
    }
    const [totalOrders, activeOrders, deliveredOrders, users, sellers, revenueAgg] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({
        where: {
          status: { notIn: ["delivered", "cancelled", "refunded"] },
        },
      }),
      prisma.order.count({ where: { status: "delivered" } }),
      prisma.user.count(),
      prisma.seller.count(),
      prisma.order.aggregate({
        where: { status: "delivered" },
        _sum: { finalAmount: true },
      }),
    ]);
    const totalRevenue = Number(revenueAgg._sum.finalAmount || 0);
    return {
      totalOrders,
      activeOrders,
      totalRevenue,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      totalUsers: users,
      totalSellers: sellers,
      ordersToday: totalOrders,
      revenueToday: totalRevenue,
      newUsersToday: 0,
      newSellersToday: 0,
      deliveredOrders,
    };
  },

  async getUsers() {
    if (!usePostgres) {
      return null;
    }
    return prisma.user.findMany({
      include: { addresses: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async setUserStatus(userId: string, status: "active" | "suspended") {
    if (!usePostgres) {
      return null;
    }
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return null;
    }
    return prisma.user.update({
      where: { id: userId },
      data: { status },
      include: { addresses: true },
    });
  },

  async getSellers() {
    if (!usePostgres) {
      return null;
    }
    return prisma.seller.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  async setSellerStatus(sellerId: string, status: string) {
    if (!usePostgres) {
      return null;
    }
    const existing = await prisma.seller.findUnique({ where: { id: sellerId } });
    if (!existing) {
      return null;
    }
    return prisma.seller.update({
      where: { id: sellerId },
      data: { status },
    });
  },

  async getPayoutSummary() {
    if (!usePostgres) {
      return null;
    }
    const [pending, processing, paid] = await Promise.all([
      prisma.payout.findMany({ where: { status: "pending" } }),
      prisma.payout.findMany({ where: { status: "processing" } }),
      prisma.payout.findMany({ where: { status: "paid" } }),
    ]);
    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, p) => sum + p.amount, 0),
      processingCount: processing.length,
      processingAmount: processing.reduce((sum, p) => sum + p.amount, 0),
      paidToday: paid.reduce((sum, p) => sum + p.amount, 0),
    };
  },

  async getPayouts(status?: string) {
    if (!usePostgres) {
      return null;
    }
    return prisma.payout.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
    });
  },

  async setPayoutStatus(payoutId: string, status: string) {
    if (!usePostgres) {
      return null;
    }
    const existing = await prisma.payout.findUnique({ where: { id: payoutId } });
    if (!existing) {
      return null;
    }
    return prisma.payout.update({
      where: { id: payoutId },
      data: { status },
    });
  },

  async createAuditLog(data: {
    actorRole: string;
    actorId?: string;
    action: string;
    targetType: string;
    targetId: string;
    outcome: string;
    errorCode?: string;
    details?: string;
  }) {
    if (!usePostgres) {
      return null;
    }
    return prisma.auditLog.create({ data });
  },

  async getAuditLogs(limit = 20) {
    if (!usePostgres) {
      return null;
    }
    return prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  async getDispatchBoard(limit = 8) {
    if (!usePostgres) {
      return null;
    }
    const [orders, riders] = await Promise.all([
      prisma.dispatchOrder.findMany({
        orderBy: { updatedAt: "desc" },
        take: limit,
      }),
      prisma.dispatchRider.findMany({
        orderBy: { createdAt: "asc" },
      }),
    ]);
    return { orders, riders };
  },

  async assignDispatchOrder(orderId: string, riderId: string): Promise<
    | null
    | { ok: true; order: any }
    | {
        ok: false;
        code:
          | "ORDER_NOT_FOUND"
          | "RIDER_NOT_FOUND"
          | "RIDER_UNAVAILABLE"
          | "ORDER_ALREADY_ASSIGNED";
      }
  > {
    if (!usePostgres) {
      return null;
    }
    const [rider, order] = await Promise.all([
      prisma.dispatchRider.findUnique({ where: { id: riderId } }),
      prisma.dispatchOrder.findUnique({ where: { id: orderId } }),
    ]);
    if (!order) {
      return { ok: false, code: "ORDER_NOT_FOUND" };
    }
    if (!rider) {
      return { ok: false, code: "RIDER_NOT_FOUND" };
    }

    if (order.riderId && order.riderId !== riderId && order.status !== "delivered") {
      return { ok: false, code: "ORDER_ALREADY_ASSIGNED" };
    }

    const result = await prisma.$transaction(async (tx) => {
      const riderClaim = await tx.dispatchRider.updateMany({
        where: { id: rider.id, isAvailable: true },
        data: { isAvailable: false, updatedAt: new Date() },
      });
      if (riderClaim.count === 0) {
        return { ok: false as const, code: "RIDER_UNAVAILABLE" as const };
      }

      const orderUpdate = await tx.dispatchOrder.updateMany({
        where: {
          id: orderId,
          OR: [{ riderId: null }, { riderId }],
        },
        data: {
          status: "assigned",
          riderId: rider.id,
          riderName: rider.name,
          updatedAt: new Date(),
        },
      });
      if (orderUpdate.count === 0) {
        return { ok: false as const, code: "ORDER_ALREADY_ASSIGNED" as const };
      }

      const updatedOrder = await tx.dispatchOrder.findUnique({ where: { id: orderId } });
      if (!updatedOrder) {
        return { ok: false as const, code: "ORDER_NOT_FOUND" as const };
      }

      return { ok: true as const, order: updatedOrder };
    });
    return result;
  },

  async updateDispatchOrderStatus(orderId: string, status: string, proofOtp?: string) {
    if (!usePostgres) {
      return null;
    }
    const order = await prisma.dispatchOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      return null;
    }
    const updated = await prisma.dispatchOrder.update({
      where: { id: orderId },
      data: {
        status,
        proofOtp: proofOtp ?? order.proofOtp,
        updatedAt: new Date(),
      },
    });
    if (updated.status === "delivered" && updated.riderId) {
      await prisma.dispatchRider.update({
        where: { id: updated.riderId },
        data: { isAvailable: true },
      });
    }
    return updated;
  },
};

export default adminRepository;
