import env from "../config/env.js";
import { db } from "../store.js";

type OtpEntry = {
  code: string;
  expiresAt: number;
};

const otpState = new Map<string, OtpEntry>();

const upsertOtp = (phone: string, code: string) => {
  const expiresAt = Date.now() + env.otpTtlSec * 1000;
  otpState.set(phone, { code, expiresAt });
  db.otpByPhone.set(phone, code);
};

const getOtp = (phone: string): OtpEntry | undefined => {
  const entry = otpState.get(phone);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    otpState.delete(phone);
    db.otpByPhone.delete(phone);
    return undefined;
  }
  return entry;
};

const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

const callProvider = async (path: string, body: Record<string, unknown>) => {
  if (!env.otpProviderHttpUrl) {
    throw new Error("OTP_PROVIDER_HTTP_URL is required for OTP_PROVIDER=http");
  }
  const response = await fetch(`${env.otpProviderHttpUrl.replace(/\/+$/, "")}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(env.otpProviderHttpToken ? { Authorization: `Bearer ${env.otpProviderHttpToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`OTP provider request failed (${response.status})`);
  }
  return parsed;
};

export const otpProvider = {
  async send(phone: string) {
    const code = env.otpBypassCode || generateOtpCode();
    if (env.otpProvider === "http") {
      const response = await callProvider("/send", env.otpBypassCode ? { phone, code } : { phone });
      upsertOtp(phone, code);
      return {
        provider: "http",
        messageId: String(response?.messageId || response?.id || ""),
      };
    }
    upsertOtp(phone, code);
    return {
      provider: "mock",
      messageId: `mock_${Date.now()}`,
    };
  },

  async verify(phone: string, otp: string) {
    if (env.otpProvider === "http") {
      try {
        const response = await callProvider("/verify", { phone, otp });
        if (response?.valid === true) {
          otpState.delete(phone);
          db.otpByPhone.delete(phone);
          return true;
        }
      } catch {
        // In production, fail closed when the provider is unavailable.
        if (env.nodeEnv === "production") {
          return false;
        }
        // Fall through to local fallback to keep non-production environments stable.
      }
    }

    const entry = getOtp(phone);
    if (!entry) {
      return false;
    }
    const valid = entry.code === otp;
    if (valid) {
      otpState.delete(phone);
      db.otpByPhone.delete(phone);
    }
    return valid;
  },
};

export default otpProvider;
