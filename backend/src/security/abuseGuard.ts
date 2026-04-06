import env from "../config/env.js";

type WindowCounter = { count: number; windowStart: number };

const sendCounters = new Map<string, WindowCounter>();
const verifyFailCounters = new Map<string, WindowCounter>();
const verifyLockUntil = new Map<string, number>();

const now = () => Date.now();

const checkAndBumpCounter = (map: Map<string, WindowCounter>, key: string, windowMs: number): WindowCounter => {
  const current = map.get(key);
  const ts = now();
  if (!current || ts - current.windowStart > windowMs) {
    const fresh = { count: 1, windowStart: ts };
    map.set(key, fresh);
    return fresh;
  }
  current.count += 1;
  map.set(key, current);
  return current;
};

export const abuseGuard = {
  checkOtpSend(phone: string) {
    const key = phone.trim();
    const windowMs = env.otpSendWindowSec * 1000;
    const current = sendCounters.get(key);
    if (!current) {
      return { ok: true as const };
    }
    if (now() - current.windowStart > windowMs) {
      return { ok: true as const };
    }
    if (current.count >= env.otpSendMaxPerWindow) {
      const retryAfterSec = Math.ceil((windowMs - (now() - current.windowStart)) / 1000);
      return { ok: false as const, retryAfterSec: Math.max(1, retryAfterSec) };
    }
    return { ok: true as const };
  },

  noteOtpSend(phone: string) {
    checkAndBumpCounter(sendCounters, phone.trim(), env.otpSendWindowSec * 1000);
  },

  checkOtpVerify(phone: string) {
    const lockUntil = verifyLockUntil.get(phone.trim()) || 0;
    if (lockUntil > now()) {
      const retryAfterSec = Math.ceil((lockUntil - now()) / 1000);
      return { ok: false as const, retryAfterSec: Math.max(1, retryAfterSec), locked: true as const };
    }
    return { ok: true as const, locked: false as const };
  },

  noteOtpVerifyFailure(phone: string) {
    const key = phone.trim();
    const current = checkAndBumpCounter(verifyFailCounters, key, env.otpVerifyFailWindowSec * 1000);
    if (current.count >= env.otpVerifyFailMax) {
      verifyLockUntil.set(key, now() + env.otpVerifyLockSec * 1000);
      verifyFailCounters.delete(key);
      return { locked: true as const, retryAfterSec: env.otpVerifyLockSec };
    }
    return { locked: false as const };
  },

  noteOtpVerifySuccess(phone: string) {
    const key = phone.trim();
    verifyFailCounters.delete(key);
    verifyLockUntil.delete(key);
  },
};

export default abuseGuard;
