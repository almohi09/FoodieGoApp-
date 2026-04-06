import { prisma, usePostgres } from "../prismaClient.js";

export const idempotencyRepository = {
  isEnabled(): boolean {
    return usePostgres;
  },

  async find(userId: string, route: string, key: string) {
    if (!usePostgres) {
      return null;
    }
    const row = await prisma.idempotencyKey.findUnique({
      where: {
        userId_route_key: {
          userId,
          route,
          key,
        },
      },
    });
    if (!row) {
      return null;
    }
    if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
      return null;
    }
    return {
      statusCode: row.statusCode,
      response: row.response as any,
    };
  },

  async save(userId: string, route: string, key: string, response: unknown, statusCode = 200, ttlHours = 24) {
    if (!usePostgres) {
      return null;
    }
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    return prisma.idempotencyKey.upsert({
      where: {
        userId_route_key: {
          userId,
          route,
          key,
        },
      },
      update: {
        response: response as any,
        statusCode,
        expiresAt,
      },
      create: {
        userId,
        route,
        key,
        response: response as any,
        statusCode,
        expiresAt,
      },
    });
  },
};

export default idempotencyRepository;
