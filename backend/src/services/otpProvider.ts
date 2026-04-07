import env from "../config/env.js";
import { db } from "../store.js";

type OtpEntry = {
  code: string;
  expiresAt: number;
};

const otpState = new Map<string, OtpEntry>();
const firebaseSessionByPhone = new Map<string, { sessionInfo: string; expiresAt: number }>();

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

const upsertFirebaseSession = (phone: string, sessionInfo: string) => {
  firebaseSessionByPhone.set(phone, {
    sessionInfo,
    expiresAt: Date.now() + env.otpTtlSec * 1000,
  });
};

const getFirebaseSession = (phone: string): string | undefined => {
  const existing = firebaseSessionByPhone.get(phone);
  if (!existing) {
    return undefined;
  }
  if (existing.expiresAt < Date.now()) {
    firebaseSessionByPhone.delete(phone);
    return undefined;
  }
  return existing.sessionInfo;
};

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

const callFirebase = async (method: "send" | "verify", body: Record<string, unknown>) => {
  if (!env.firebaseWebApiKey) {
    throw new Error("FIREBASE_WEB_API_KEY is required for OTP_PROVIDER=firebase");
  }
  const endpoint =
    method === "send"
      ? "accounts:sendVerificationCode"
      : "accounts:signInWithPhoneNumber";
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${encodeURIComponent(env.firebaseWebApiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`Firebase OTP request failed (${response.status})`);
  }
  return parsed;
};

const callTwilio = async (
  path: string,
  params: Record<string, string>,
) => {
  if (!env.twilioAccountSid) {
    throw new Error('TWILIO_ACCOUNT_SID is required for OTP_PROVIDER=twilio');
  }
  if (!env.twilioAuthToken) {
    throw new Error('TWILIO_AUTH_TOKEN is required for OTP_PROVIDER=twilio');
  }
  if (!env.twilioVerifyServiceSid) {
    throw new Error(
      'TWILIO_VERIFY_SERVICE_SID is required for OTP_PROVIDER=twilio',
    );
  }

  const auth = Buffer.from(
    `${env.twilioAccountSid}:${env.twilioAuthToken}`,
  ).toString('base64');
  const body = new URLSearchParams(params).toString();

  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${encodeURIComponent(env.twilioVerifyServiceSid)}${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    },
  );
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`Twilio Verify request failed (${response.status})`);
  }
  return parsed;
};

export const otpProvider = {
  async send(phone: string, appVerifierToken?: string) {
    const code = env.otpBypassCode || generateOtpCode();
    if (env.otpProvider === "firebase") {
      try {
        const token = appVerifierToken || env.firebaseOtpRecaptchaBypassToken;
        if (!token) {
          throw new Error("Firebase recaptcha/app-verifier token is required");
        }
        const response = await callFirebase("send", {
          phoneNumber: phone,
          recaptchaToken: token,
        });
        const sessionInfo = String(response?.sessionInfo || "");
        if (!sessionInfo) {
          throw new Error("Firebase OTP send did not return sessionInfo");
        }
        upsertFirebaseSession(phone, sessionInfo);
        if (env.otpBypassCode) {
          upsertOtp(phone, code);
        }
        return {
          provider: "firebase",
          messageId: String(response?.sessionInfo || ""),
        };
      } catch {
        if (env.nodeEnv === "production") {
          throw new Error("Firebase OTP send failed");
        }
        upsertOtp(phone, code);
        return {
          provider: "mock",
          messageId: `mock_${Date.now()}`,
        };
      }
    }

    if (env.otpProvider === "http") {
      const response = await callProvider("/send", env.otpBypassCode ? { phone, code } : { phone });
      upsertOtp(phone, code);
      return {
        provider: "http",
        messageId: String(response?.messageId || response?.id || ""),
      };
    }

    if (env.otpProvider === 'twilio') {
      if (env.otpBypassCode) {
        upsertOtp(phone, code);
        return {
          provider: 'twilio',
          messageId: `bypass_${Date.now()}`,
        };
      }
      const response = await callTwilio('/Verifications', {
        To: phone,
        Channel: 'sms',
      });
      return {
        provider: 'twilio',
        messageId: String(response?.sid || ''),
      };
    }

    upsertOtp(phone, code);
    return {
      provider: "mock",
      messageId: `mock_${Date.now()}`,
    };
  },

  async verify(phone: string, otp: string) {
    if (env.otpProvider === "firebase") {
      try {
        const sessionInfo = getFirebaseSession(phone);
        if (!sessionInfo) {
          return false;
        }
        const response = await callFirebase("verify", {
          sessionInfo,
          code: otp,
        });
        if (response?.idToken) {
          firebaseSessionByPhone.delete(phone);
          otpState.delete(phone);
          db.otpByPhone.delete(phone);
          return true;
        }
      } catch {
        if (env.nodeEnv === "production") {
          return false;
        }
      }
    }

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

    if (env.otpProvider === 'twilio') {
      if (env.otpBypassCode) {
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
      }
      try {
        const response = await callTwilio('/VerificationCheck', {
          To: phone,
          Code: otp,
        });
        const approved = String(response?.status || '').toLowerCase() === 'approved';
        return approved;
      } catch {
        return false;
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
