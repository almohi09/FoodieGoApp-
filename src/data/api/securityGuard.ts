import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureError } from '../../monitoring/errorCenter';

const PREFIX = 'security_guard';

interface AttemptWindow {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil?: number;
}

export interface LocalGuardResult {
  allowed: boolean;
  retryAfterSec?: number;
  message?: string;
}

const nowMs = () => Date.now();

const storageKey = (action: string) => `${PREFIX}:${action}`;

const loadWindow = async (action: string): Promise<AttemptWindow> => {
  const raw = await AsyncStorage.getItem(storageKey(action));
  if (!raw) {
    return { attempts: 0, firstAttemptAt: nowMs() };
  }
  try {
    const parsed = JSON.parse(raw) as AttemptWindow;
    return {
      attempts: parsed.attempts || 0,
      firstAttemptAt: parsed.firstAttemptAt || nowMs(),
      blockedUntil: parsed.blockedUntil,
    };
  } catch (error) {
    captureError(error, 'security-guard-load');
    return { attempts: 0, firstAttemptAt: nowMs() };
  }
};

const saveWindow = async (action: string, value: AttemptWindow) => {
  await AsyncStorage.setItem(storageKey(action), JSON.stringify(value));
};

export const enforceLocalVelocityGuard = async (
  action: string,
  options: {
    maxAttempts: number;
    windowSec: number;
    cooldownSec: number;
    blockedMessage: string;
  },
): Promise<LocalGuardResult> => {
  const state = await loadWindow(action);
  const now = nowMs();

  if (state.blockedUntil && now < state.blockedUntil) {
    const retryAfterSec = Math.ceil((state.blockedUntil - now) / 1000);
    return {
      allowed: false,
      retryAfterSec,
      message: `${options.blockedMessage}. Try again in ${retryAfterSec}s.`,
    };
  }

  if (now - state.firstAttemptAt > options.windowSec * 1000) {
    await saveWindow(action, { attempts: 0, firstAttemptAt: now });
    return { allowed: true };
  }

  if (state.attempts >= options.maxAttempts) {
    const blockedUntil = now + options.cooldownSec * 1000;
    await saveWindow(action, {
      attempts: state.attempts,
      firstAttemptAt: state.firstAttemptAt,
      blockedUntil,
    });
    return {
      allowed: false,
      retryAfterSec: options.cooldownSec,
      message: `${options.blockedMessage}. Try again in ${options.cooldownSec}s.`,
    };
  }

  return { allowed: true };
};

export const recordGuardedFailure = async (action: string): Promise<void> => {
  const state = await loadWindow(action);
  await saveWindow(action, {
    attempts: state.attempts + 1,
    firstAttemptAt: state.firstAttemptAt || nowMs(),
    blockedUntil: state.blockedUntil,
  });
};

export const clearGuardState = async (action: string): Promise<void> => {
  await AsyncStorage.removeItem(storageKey(action));
};

export const parseRateLimitMessage = (
  error: unknown,
  fallback: string,
): { message: string; retryAfterSec?: number; isRateLimited: boolean } => {
  const parsed = parseSecurityActionError(error, fallback);
  return {
    message: parsed.message,
    retryAfterSec: parsed.retryAfterSec,
    isRateLimited: parsed.isRateLimited,
  };
};

export interface ParsedSecurityActionError {
  message: string;
  errorCode?: string;
  retryAfterSec?: number;
  isRateLimited: boolean;
  isRiskBlocked: boolean;
}

export const parseSecurityActionError = (
  error: unknown,
  fallback: string,
): ParsedSecurityActionError => {
  const e = error as {
    response?: {
      status?: number;
      headers?: Record<string, string | number>;
      data?: { message?: string; errorCode?: string };
    };
  };
  const status = e.response?.status;
  const errorCode = e.response?.data?.errorCode?.toUpperCase();

  const retryRaw =
    e.response?.headers?.['retry-after'] || e.response?.headers?.['Retry-After'];
  const retryAfterSec =
    typeof retryRaw === 'number'
      ? retryRaw
      : typeof retryRaw === 'string'
        ? parseInt(retryRaw, 10)
        : undefined;
  const isRateLimited = status === 429;
  const isRiskBlocked = Boolean(
    errorCode &&
      (errorCode.includes('RISK') ||
        errorCode.includes('FRAUD') ||
        errorCode.includes('BLOCK')),
  );
  const baseMessage = e.response?.data?.message || fallback;

  if (isRateLimited && retryAfterSec && Number.isFinite(retryAfterSec)) {
    return {
      message: `${baseMessage}. Retry in ${retryAfterSec}s.`,
      errorCode: errorCode || 'RATE_LIMITED',
      retryAfterSec,
      isRateLimited: true,
      isRiskBlocked,
    };
  }

  if (isRateLimited) {
    return {
      message: `${baseMessage}. Please retry shortly.`,
      errorCode: errorCode || 'RATE_LIMITED',
      isRateLimited: true,
      isRiskBlocked,
    };
  }

  if (isRiskBlocked) {
    return {
      message: baseMessage,
      errorCode,
      isRateLimited: false,
      isRiskBlocked: true,
    };
  }

  return {
    message: baseMessage,
    errorCode,
    isRateLimited: false,
    isRiskBlocked: false,
  };
};
