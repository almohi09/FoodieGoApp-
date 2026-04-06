import crypto from "node:crypto";
import sessionRepository from "../db/repositories/sessionRepository.js";
import { db, util } from "../store.js";
import { MenuItem, Session, UserRole } from "../types.js";

export const createSession = async (userId: string, role: UserRole, deviceId?: string): Promise<Session> => {
  if (sessionRepository.isEnabled() && role === "customer") {
    const persisted = await sessionRepository.createSession(userId, role, deviceId);
    if (persisted) {
      return persisted;
    }
  }

  const token = `atk_${crypto.randomUUID()}`;
  const refreshToken = `rtk_${crypto.randomUUID()}`;
  const session: Session = {
    token,
    refreshToken,
    userId,
    role,
    createdAt: util.nowIso(),
    deviceId,
  };
  db.sessions.set(token, session);
  db.sessionsByRefreshToken.set(refreshToken, session);
  return session;
};

export const getRestaurantMenuItem = (
  restaurantId: string,
  menuItemId: string,
): MenuItem | undefined =>
  (db.menuByRestaurant.get(restaurantId) || []).find((item) => item.id === menuItemId);
