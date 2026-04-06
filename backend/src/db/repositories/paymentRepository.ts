import { prisma, usePostgres } from "../prismaClient.js";

type CreatePaymentInput = {
  orderId: string;
  method: "upi" | "card" | "wallet" | "cod";
  status: "pending" | "completed" | "failed" | "cancelled";
  transactionId?: string;
  source: "webhook" | "gateway" | "unknown";
  amount?: number;
  metadata?: Record<string, unknown>;
};

const toPaymentDto = (row: any) => ({
  id: row.id,
  orderId: row.orderId,
  method: row.method,
  status: row.status,
  transactionId: row.transactionId || undefined,
  source: row.source,
  amount: row.amount ?? undefined,
  metadata: row.metadata || undefined,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const toRefundDto = (row: any) => ({
  id: row.id,
  orderId: row.orderId,
  paymentId: row.paymentId || undefined,
  status: row.status,
  amount: row.amount ?? undefined,
  reason: row.reason || undefined,
  gatewayRefundId: row.gatewayRefundId || undefined,
  metadata: row.metadata || undefined,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const paymentRepository = {
  isEnabled(): boolean {
    return usePostgres;
  },

  async upsertPaymentByOrder(data: CreatePaymentInput) {
    if (!usePostgres) {
      return null;
    }
    const existing = await prisma.paymentTransaction.findFirst({
      where: { orderId: data.orderId },
      orderBy: { createdAt: "desc" },
    });
    if (!existing) {
      const created = await prisma.paymentTransaction.create({
        data: {
          orderId: data.orderId,
          method: data.method,
          status: data.status,
          transactionId: data.transactionId,
          source: data.source,
          amount: data.amount,
          metadata: data.metadata as any,
        },
      });
      return toPaymentDto(created);
    }
    const updated = await prisma.paymentTransaction.update({
      where: { id: existing.id },
      data: {
        method: data.method,
        status: data.status,
        transactionId: data.transactionId ?? existing.transactionId,
        source: data.source,
        amount: data.amount ?? existing.amount,
        metadata: (data.metadata as any) ?? existing.metadata,
      },
    });
    return toPaymentDto(updated);
  },

  async getPaymentByOrderId(orderId: string) {
    if (!usePostgres) {
      return null;
    }
    const row = await prisma.paymentTransaction.findFirst({
      where: { orderId },
      orderBy: { createdAt: "desc" },
    });
    return row ? toPaymentDto(row) : null;
  },

  async getPaymentByTransactionId(transactionId: string) {
    if (!usePostgres) {
      return null;
    }
    const row = await prisma.paymentTransaction.findUnique({
      where: { transactionId },
    });
    return row ? toPaymentDto(row) : null;
  },

  async updatePaymentStatusByTransactionId(
    transactionId: string,
    status: "pending" | "completed" | "failed" | "cancelled",
    source: "webhook" | "gateway" | "unknown",
  ) {
    if (!usePostgres) {
      return null;
    }
    const existing = await prisma.paymentTransaction.findUnique({
      where: { transactionId },
    });
    if (!existing) {
      return null;
    }
    const updated = await prisma.paymentTransaction.update({
      where: { id: existing.id },
      data: { status, source },
    });
    return toPaymentDto(updated);
  },

  async createRefund(orderId: string, paymentId?: string) {
    if (!usePostgres) {
      return null;
    }
    const created = await prisma.refund.create({
      data: {
        orderId,
        paymentId,
        status: "processing",
      },
    });
    return toRefundDto(created);
  },

  async getRefundById(refundId: string) {
    if (!usePostgres) {
      return null;
    }
    const row = await prisma.refund.findUnique({
      where: { id: refundId },
    });
    return row ? toRefundDto(row) : null;
  },

  async recordWebhookEvent(params: {
    paymentId: string;
    provider: string;
    eventType: string;
    signature?: string;
    payload: Record<string, unknown>;
    status?: string;
  }) {
    if (!usePostgres) {
      return null;
    }
    return prisma.paymentWebhookEvent.create({
      data: {
        paymentId: params.paymentId,
        provider: params.provider,
        eventType: params.eventType,
        signature: params.signature,
        payload: params.payload as any,
        status: params.status || "received",
      },
    });
  },

  async findWebhookReplay(paymentId: string, eventType: string, signature: string) {
    if (!usePostgres) {
      return null;
    }
    if (!signature) {
      return null;
    }
    return prisma.paymentWebhookEvent.findFirst({
      where: {
        paymentId,
        eventType,
        signature,
      },
      orderBy: { receivedAt: "desc" },
    });
  },

  async markWebhookEventProcessed(id: string, status = "processed") {
    if (!usePostgres) {
      return null;
    }
    return prisma.paymentWebhookEvent.update({
      where: { id },
      data: {
        status,
        processedAt: new Date(),
      },
    });
  },
};

export default paymentRepository;
