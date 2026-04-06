import { prisma, usePostgres } from "../prismaClient.js";

export type AsyncJobPayload = Record<string, unknown>;

export type AsyncJobRow = {
  id: string;
  type: string;
  status: string;
  payload: AsyncJobPayload;
  dedupeKey?: string;
  attempts: number;
  maxAttempts: number;
  availableAt: string;
  lockedAt?: string;
  lockedBy?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

const toJobDto = (row: any): AsyncJobRow => ({
  id: row.id,
  type: row.type,
  status: row.status,
  payload: row.payload || {},
  dedupeKey: row.dedupeKey || undefined,
  attempts: row.attempts,
  maxAttempts: row.maxAttempts,
  availableAt: row.availableAt.toISOString(),
  lockedAt: row.lockedAt ? row.lockedAt.toISOString() : undefined,
  lockedBy: row.lockedBy || undefined,
  lastError: row.lastError || undefined,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const toDeadLetterDto = (row: any) => ({
  id: row.id,
  asyncJobId: row.asyncJobId,
  type: row.type,
  payload: row.payload || {},
  attempts: row.attempts,
  reason: row.reason,
  status: row.status,
  replayedAt: row.replayedAt ? row.replayedAt.toISOString() : undefined,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const asyncJobRepository = {
  isEnabled() {
    return usePostgres;
  },

  async enqueue(params: { type: string; payload: AsyncJobPayload; dedupeKey?: string; maxAttempts?: number }) {
    if (!usePostgres) {
      return null;
    }
    const data = {
      type: params.type,
      payload: params.payload as any,
      dedupeKey: params.dedupeKey,
      maxAttempts: params.maxAttempts || 5,
      status: "pending",
    };
    if (params.dedupeKey) {
      const row = await prisma.asyncJob.upsert({
        where: { dedupeKey: params.dedupeKey },
        create: data,
        update: {},
      });
      return toJobDto(row);
    }
    const row = await prisma.asyncJob.create({ data });
    return toJobDto(row);
  },

  async claimNext(workerId: string) {
    if (!usePostgres) {
      return null;
    }
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      UPDATE "AsyncJob"
      SET "status" = 'processing',
          "lockedAt" = NOW(),
          "lockedBy" = $1,
          "updatedAt" = NOW()
      WHERE "id" = (
        SELECT "id"
        FROM "AsyncJob"
        WHERE "status" IN ('pending', 'retrying')
          AND "availableAt" <= NOW()
        ORDER BY "availableAt" ASC, "createdAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    `, workerId);
    if (!rows.length) {
      return null;
    }
    return toJobDto(rows[0]);
  },

  async markCompleted(jobId: string, result?: AsyncJobPayload) {
    if (!usePostgres) {
      return null;
    }
    const row = await prisma.asyncJob.update({
      where: { id: jobId },
      data: {
        status: "completed",
        lockedAt: null,
        lockedBy: null,
        result: (result || {}) as any,
      },
    });
    return toJobDto(row);
  },

  async markRetry(jobId: string, errorMessage: string, nextAvailableAt: Date) {
    if (!usePostgres) {
      return null;
    }
    const row = await prisma.asyncJob.update({
      where: { id: jobId },
      data: {
        status: "retrying",
        attempts: { increment: 1 },
        lastError: errorMessage.slice(0, 1000),
        availableAt: nextAvailableAt,
        lockedAt: null,
        lockedBy: null,
      },
    });
    return toJobDto(row);
  },

  async moveToDeadLetter(jobId: string, reason: string) {
    if (!usePostgres) {
      return null;
    }
    return prisma.$transaction(async (tx) => {
      const job = await tx.asyncJob.update({
        where: { id: jobId },
        data: {
          status: "dead_letter",
          attempts: { increment: 1 },
          lastError: reason.slice(0, 1000),
          lockedAt: null,
          lockedBy: null,
        },
      });
      const dead = await tx.deadLetterJob.create({
        data: {
          asyncJobId: job.id,
          type: job.type,
          payload: job.payload as any,
          attempts: job.attempts,
          reason: reason.slice(0, 2000),
          status: "open",
        },
      });
      return toDeadLetterDto(dead);
    });
  },

  async listDeadLetters(limit = 25) {
    if (!usePostgres) {
      return null;
    }
    const rows = await prisma.deadLetterJob.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.max(1, Math.min(100, limit)),
    });
    return rows.map(toDeadLetterDto);
  },

  async replayDeadLetter(deadLetterId: string) {
    if (!usePostgres) {
      return null;
    }
    return prisma.$transaction(async (tx) => {
      const dead = await tx.deadLetterJob.findUnique({ where: { id: deadLetterId } });
      if (!dead) {
        return null;
      }
      const replayed = await tx.asyncJob.create({
        data: {
          type: dead.type,
          payload: dead.payload as any,
          status: "pending",
          maxAttempts: 5,
        },
      });
      await tx.deadLetterJob.update({
        where: { id: deadLetterId },
        data: { status: "replayed", replayedAt: new Date() },
      });
      return toJobDto(replayed);
    });
  },
};

export default asyncJobRepository;
