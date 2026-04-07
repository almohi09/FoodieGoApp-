import { Router } from "express";
import authRepository from "../../db/repositories/authRepository.js";
import sessionRepository from "../../db/repositories/sessionRepository.js";
import { createSession } from "../../lib/core.js";
import { sendApiError } from "../../lib/httpErrors.js";
import { validatePhoneInput, validateRefreshTokenInput, validateVerifyOtpInput } from "../../lib/validation.js";
import { requireAuth, requireRole, type AuthedRequest } from "../../middleware/auth.js";
import abuseGuard from "../../security/abuseGuard.js";
import otpProvider from "../../services/otpProvider.js";
import { db, util } from "../../store.js";
import { Address } from "../../types.js";

const router = Router();

router.post("/auth/send-otp", async (req, res) => {
  const parsed = validatePhoneInput(req.body);
  if (!parsed.ok) {
    return sendApiError(res, 400, "VALIDATION_ERROR", parsed.message, parsed.details);
  }
  const phone = parsed.data.phone;
  const appVerifierToken =
    typeof req.body?.appVerifierToken === "string" ? req.body.appVerifierToken.trim() : undefined;
  const gate = abuseGuard.checkOtpSend(phone);
  if (!gate.ok) {
    return sendApiError(res, 429, "RATE_LIMITED", "Too many OTP requests", { retryAfterSec: gate.retryAfterSec });
  }
  const issued = await otpProvider.send(phone, appVerifierToken);
  abuseGuard.noteOtpSend(phone);
  return res.json({ success: true, message: "OTP sent", provider: issued.provider });
});

router.post("/auth/resend-otp", async (req, res) => {
  const parsed = validatePhoneInput(req.body);
  if (!parsed.ok) {
    return sendApiError(res, 400, "VALIDATION_ERROR", parsed.message, parsed.details);
  }
  const phone = parsed.data.phone;
  const appVerifierToken =
    typeof req.body?.appVerifierToken === "string" ? req.body.appVerifierToken.trim() : undefined;
  const gate = abuseGuard.checkOtpSend(phone);
  if (!gate.ok) {
    return sendApiError(res, 429, "RATE_LIMITED", "Too many OTP resend requests", {
      retryAfterSec: gate.retryAfterSec,
    });
  }
  const issued = await otpProvider.send(phone, appVerifierToken);
  abuseGuard.noteOtpSend(phone);
  return res.json({ success: true, message: "OTP resent", provider: issued.provider });
});

router.post("/auth/check-phone", async (req, res) => {
  const phone = String(req.body?.phone || "").trim();
  if (authRepository.isEnabled()) {
    const pgUser = await authRepository.findUserByPhone(phone);
    if (pgUser) {
      return res.json({ registered: true, role: pgUser.role });
    }
  }
  const user = Array.from(db.users.values()).find((u) => u.phone === phone);
  if (user) {
    return res.json({ registered: true, role: user.role });
  }
  return res.json({ registered: false });
});

router.post("/auth/verify-otp", async (req, res) => {
  const parsed = validateVerifyOtpInput(req.body);
  if (!parsed.ok) {
    return sendApiError(res, 400, "VALIDATION_ERROR", parsed.message, parsed.details);
  }
  const { phone, otp } = parsed.data;
  const verifyGate = abuseGuard.checkOtpVerify(phone);
  if (!verifyGate.ok) {
    return sendApiError(res, 423, "ACCOUNT_LOCKED", "OTP verification temporarily locked", {
      retryAfterSec: verifyGate.retryAfterSec,
    });
  }

  const otpValid = await otpProvider.verify(phone, otp);
  if (!otpValid) {
    const lock = abuseGuard.noteOtpVerifyFailure(phone);
    if (lock.locked) {
      return sendApiError(res, 423, "ACCOUNT_LOCKED", "Too many OTP verification failures", {
        retryAfterSec: lock.retryAfterSec,
      });
    }
    return sendApiError(res, 400, "VALIDATION_ERROR", "Invalid OTP", { field: "otp" });
  }
  abuseGuard.noteOtpVerifySuccess(phone);

  if (authRepository.isEnabled()) {
    let pgUser = await authRepository.findUserByPhone(phone);
    if (!pgUser) {
      pgUser = await authRepository.createCustomer({ phone });
    }
    if (!pgUser) {
      return res.status(500).json({ success: false, message: "Unable to initialize user" });
    }
    const session = await createSession(pgUser.id, "customer", String(req.headers["x-device-id"] || ""));
    return res.json({
      success: true,
      token: session.token,
      refreshToken: session.refreshToken,
      user: {
        id: pgUser.id,
        phone: pgUser.phone,
        name: pgUser.name || undefined,
        email: pgUser.email || undefined,
        role: pgUser.role,
        status: pgUser.status,
        createdAt: pgUser.createdAt.toISOString(),
        orderCount: pgUser.orderCount,
        totalSpend: pgUser.totalSpend || undefined,
        addresses: pgUser.addresses.map((address) => ({
          id: address.id,
          label: address.label as any,
          address: address.address,
          landmark: address.landmark || undefined,
          lat: address.lat,
          lng: address.lng,
          isDefault: address.isDefault,
        })),
      },
    });
  }

  let user = Array.from(db.users.values()).find((u) => u.phone === phone);
  if (!user) {
    user = {
      id: util.id("user"),
      phone,
      role: "customer",
      status: "active",
      createdAt: util.nowIso(),
      orderCount: 0,
      addresses: [],
    };
    db.users.set(user.id, user);
  }
  const session = await createSession(user.id, user.role, String(req.headers["x-device-id"] || ""));
  return res.json({ success: true, token: session.token, refreshToken: session.refreshToken, user });
});

router.post("/auth/register", async (req, res) => {
  const role = String(req.body?.role || "customer");
  if (role === "seller") {
    const seller = {
      id: util.id("seller"),
      phone: String(req.body?.phone || ""),
      name: String(req.body?.name || "Seller"),
      email: String(req.body?.email || ""),
      businessName: String(req.body?.businessName || "New Seller"),
      businessType: "restaurant" as const,
      status: "pending" as const,
      totalOrders: 0,
      totalRevenue: 0,
      createdAt: util.nowIso(),
      restaurantId: "restaurant_1",
      documents: [],
    };
    db.sellers.set(seller.id, seller);
    const session = await createSession(seller.id, "seller", String(req.headers["x-device-id"] || ""));
    return res.json({ success: true, token: session.token, refreshToken: session.refreshToken, seller });
  }
  const user = {
    id: util.id("user"),
    phone: String(req.body?.phone || ""),
    name: String(req.body?.name || ""),
    email: String(req.body?.email || ""),
    role: "customer" as const,
    status: "active" as const,
    createdAt: util.nowIso(),
    orderCount: 0,
    totalSpend: 0,
    addresses: [] as Address[],
  };
  db.users.set(user.id, user);
  const session = await createSession(user.id, "customer", String(req.headers["x-device-id"] || ""));
  return res.json({ success: true, token: session.token, refreshToken: session.refreshToken, user });
});

router.post("/auth/login", async (req, res) => {
  const role = String(req.body?.role || "");
  if (role === "seller") {
    const email = String(req.body?.email || "");
    const seller = Array.from(db.sellers.values()).find((s) => s.email === email) || Array.from(db.sellers.values())[0];
    if (!seller) {
      return res.status(401).json({ success: false, message: "Invalid seller credentials" });
    }
    const session = await createSession(seller.id, "seller", String(req.headers["x-device-id"] || ""));
    return res.json({ success: true, token: session.token, refreshToken: session.refreshToken, seller });
  }
  if (role === "admin") {
    const email = String(req.body?.email || "");
    const admin = Array.from(db.admins.values()).find((a) => a.email === email) || Array.from(db.admins.values())[0];
    if (!admin) {
      return res.status(401).json({ success: false, message: "Invalid admin credentials" });
    }
    const session = await createSession(admin.id, "admin", String(req.headers["x-device-id"] || ""));
    return res.json({ success: true, token: session.token, refreshToken: session.refreshToken, admin });
  }
  const phone = String(req.body?.phone || "");
  const user = Array.from(db.users.values()).find((u) => u.phone === phone) || Array.from(db.users.values())[0];
  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid customer credentials" });
  }
  const session = await createSession(user.id, "customer", String(req.headers["x-device-id"] || ""));
  return res.json({ success: true, token: session.token, refreshToken: session.refreshToken, user });
});

router.post("/auth/refresh-token", async (req, res) => {
  const parsed = validateRefreshTokenInput(req.body);
  if (!parsed.ok) {
    return sendApiError(res, 400, "VALIDATION_ERROR", parsed.message, parsed.details);
  }
  const { refreshToken } = parsed.data;

  if (sessionRepository.isEnabled()) {
    const next = await sessionRepository.rotateByRefreshToken(refreshToken);
    if (next) {
      return res.json({ token: next.token, refreshToken: next.refreshToken });
    }
  }

  const existing = db.sessionsByRefreshToken.get(refreshToken);
  if (!existing) {
    return sendApiError(res, 401, "UNAUTHORIZED", "Invalid refresh token");
  }
  const next = await createSession(existing.userId, existing.role, existing.deviceId);
  db.sessions.delete(existing.token);
  db.sessionsByRefreshToken.delete(existing.refreshToken);
  return res.json({ token: next.token, refreshToken: next.refreshToken });
});

router.get("/auth/me", requireAuth, async (req: AuthedRequest, res) => {
  if (req.session?.role === "customer") {
    if (authRepository.isEnabled()) {
      const pgUser = await authRepository.getUserById(req.session.userId);
      if (pgUser) {
        return res.json({
          user: {
            id: pgUser.id,
            phone: pgUser.phone,
            name: pgUser.name || undefined,
            email: pgUser.email || undefined,
            role: pgUser.role,
            status: pgUser.status,
            createdAt: pgUser.createdAt.toISOString(),
            orderCount: pgUser.orderCount,
            totalSpend: pgUser.totalSpend || undefined,
            addresses: pgUser.addresses.map((address) => ({
              id: address.id,
              label: address.label as any,
              address: address.address,
              landmark: address.landmark || undefined,
              lat: address.lat,
              lng: address.lng,
              isDefault: address.isDefault,
            })),
          },
        });
      }
    }
    return res.json({ user: db.users.get(req.session.userId) });
  }
  if (req.session?.role === "seller") {
    return res.json({ seller: db.sellers.get(req.session.userId) });
  }
  if (req.session?.role === "admin") {
    return res.json({ admin: db.admins.get(req.session.userId) });
  }
  return res.json({ user: null });
});

router.put("/auth/profile", requireAuth, requireRole(["customer"]), async (req: AuthedRequest, res) => {
  if (authRepository.isEnabled()) {
    const updated = await authRepository.updateUserProfile(req.session!.userId, {
      name: req.body?.name,
      email: req.body?.email,
    });
    if (!updated) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.json({
      success: true,
      user: {
        id: updated.id,
        phone: updated.phone,
        name: updated.name || undefined,
        email: updated.email || undefined,
        role: updated.role,
        status: updated.status,
        createdAt: updated.createdAt.toISOString(),
        orderCount: updated.orderCount,
        totalSpend: updated.totalSpend || undefined,
        addresses: updated.addresses.map((address) => ({
          id: address.id,
          label: address.label as any,
          address: address.address,
          landmark: address.landmark || undefined,
          lat: address.lat,
          lng: address.lng,
          isDefault: address.isDefault,
        })),
      },
    });
  }

  const user = db.users.get(req.session!.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  user.name = req.body?.name ?? user.name;
  user.email = req.body?.email ?? user.email;
  db.users.set(user.id, user);
  return res.json({ success: true, user });
});

router.get("/addresses", requireAuth, requireRole(["customer"]), async (req: AuthedRequest, res) => {
  if (authRepository.isEnabled()) {
    const addresses = await authRepository.getAddresses(req.session!.userId);
    if (addresses !== null) {
      return res.json({
        addresses: addresses.map((address) => ({
          id: address.id,
          label: address.label,
          address: address.address,
          landmark: address.landmark || undefined,
          lat: address.lat,
          lng: address.lng,
          isDefault: address.isDefault,
        })),
      });
    }
  }
  const user = db.users.get(req.session!.userId);
  return res.json({ addresses: user?.addresses || [] });
});

router.post("/addresses", requireAuth, requireRole(["customer"]), async (req: AuthedRequest, res) => {
  if (authRepository.isEnabled()) {
    const existing = await authRepository.getAddresses(req.session!.userId);
    if (existing === null) {
      return res.status(500).json({ success: false, message: "Database error" });
    }
    const created = await authRepository.createAddress(req.session!.userId, {
      label: String(req.body?.label || "other"),
      address: String(req.body?.address || ""),
      landmark: req.body?.landmark,
      lat: Number(req.body?.lat || 0),
      lng: Number(req.body?.lng || 0),
      isDefault: existing.length === 0,
    });
    if (!created) {
      return res.status(500).json({ success: false, message: "Unable to create address" });
    }
    return res.json({
      success: true,
      address: {
        id: created.id,
        label: created.label,
        address: created.address,
        landmark: created.landmark || undefined,
        lat: created.lat,
        lng: created.lng,
        isDefault: created.isDefault,
      },
    });
  }

  const user = db.users.get(req.session!.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  const next: Address = {
    id: util.id("addr"),
    label: req.body?.label || "other",
    address: String(req.body?.address || ""),
    landmark: req.body?.landmark,
    lat: Number(req.body?.lat || 0),
    lng: Number(req.body?.lng || 0),
    isDefault: user.addresses.length === 0,
  };
  user.addresses.push(next);
  db.users.set(user.id, user);
  return res.json({ success: true, address: next });
});

router.delete("/addresses/:addressId", requireAuth, requireRole(["customer"]), (req: AuthedRequest, res) => {
  const user = db.users.get(req.session!.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  user.addresses = user.addresses.filter((a) => a.id !== req.params.addressId);
  if (!user.addresses.some((a) => a.isDefault) && user.addresses[0]) {
    user.addresses[0].isDefault = true;
  }
  db.users.set(user.id, user);
  return res.json({ success: true });
});

router.put("/addresses/:addressId/default", requireAuth, requireRole(["customer"]), (req: AuthedRequest, res) => {
  const user = db.users.get(req.session!.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  user.addresses.forEach((a) => {
    a.isDefault = a.id === req.params.addressId;
  });
  db.users.set(user.id, user);
  return res.json({ success: true });
});

export default router;
