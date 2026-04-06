import crypto from "node:crypto";
import { prisma, usePostgres } from "../prismaClient.js";
import type { Session, UserRole } from "../../types.js";

const ACCESS_TTL_MS = 24 * 60 * 60 * 1000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const toSessionDto = (row: any): Session => ({
  token: row.accessToken,
  refreshToken: row.refreshToken,
  userId: row.userId,
  role: row.role,
  createdAt: row.createdAt.toISOString(),
  deviceId: row.deviceId || undefined,
  accessExpiresAt: row.accessExpiresAt.toISOString(),
  refreshExpiresAt: row.refreshExpiresAt.toISOString(),
  revokedAt: row.revokedAt ? row.revokedAt.toISOString() : undefined,
});

export const sessionRepository = {
  isEnabled(): boolean {
    return usePostgres;
  },

  async createSession(userId: string, role: UserRole, deviceId?: string): Promise<Session | null> {
    if (!usePostgres) {
      return null;
    }
    const now = Date.now();
    const accessToken = `atk_${crypto.randomUUID()}`;
    const refreshToken = `rtk_${crypto.randomUUID()}`;
    const created = await prisma.userSession.create({
      data: {
        userId,
        role: role as any,
        accessToken,
        refreshToken,
        deviceId,
        accessExpiresAt: new Date(now + ACCESS_TTL_MS),
        refreshExpiresAt: new Date(now + REFRESH_TTL_MS),
      },
    });
    return toSessionDto(created);
  },

  async findByAccessToken(token: string): Promise<Session | null> {
    if (!usePostgres) {
      return null;
    }
    const row = await prisma.userSession.findUnique({
      where: { accessToken: token },
    });
    if (!row || row.revokedAt || row.accessExpiresAt.getTime() <= Date.now()) {
      return null;
    }
    return toSessionDto(row);
  },

  async rotateByRefreshToken(refreshToken: string): Promise<Session | null> {
    if (!usePostgres) {
      return null;
    }
    const existing = await prisma.userSession.findUnique({
      where: { refreshToken },
    });
    if (!existing) {
      return null;
    }
    const now = Date.now();
    if (existing.revokedAt || existing.refreshExpiresAt.getTime() <= now) {
      return null;
    }
    const accessToken = `atk_${crypto.randomUUID()}`;
    const nextRefreshToken = `rtk_${crypto.randomUUID()}`;
    const next = await prisma.$transaction(async (tx) => {
      const created = await tx.userSession.create({
        data: {
          userId: existing.userId,
          role: existing.role,
          accessToken,
          refreshToken: nextRefreshToken,
          deviceId: existing.deviceId,
          accessExpiresAt: new Date(now + ACCESS_TTL_MS),
          refreshExpiresAt: new Date(now + REFRESH_TTL_MS),
        },
      });
      await tx.userSession.update({
        where: { id: existing.id },
        data: {
          revokedAt: new Date(now),
          replacedBySessionId: created.id,
        },
      });
      return created;
    });
    return toSessionDto(next);
  },
};

export default sessionRepository;
