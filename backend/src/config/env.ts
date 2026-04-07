type NodeEnv = 'development' | 'test' | 'production';
type OtpProvider = 'mock' | 'http' | 'firebase' | 'twilio';
type ImageStorageProvider = 'inline' | 'supabase';

const parseNodeEnv = (value: string | undefined): NodeEnv => {
  const resolved = (value || 'development').toLowerCase();
  if (
    resolved === 'development' ||
    resolved === 'test' ||
    resolved === 'production'
  ) {
    return resolved;
  }
  throw new Error(
    `Invalid NODE_ENV "${value}". Allowed: development | test | production.`,
  );
};

const parsePort = (value: string | undefined): number => {
  const parsed = Number(value || 4000);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(
      `Invalid PORT "${value}". Expected integer in range 1-65535.`,
    );
  }
  return parsed;
};

const parseBoolean = (
  value: string | undefined,
  defaultValue: boolean,
): boolean => {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  throw new Error(`Invalid boolean value "${value}". Expected true or false.`);
};

const parseNumber = (
  value: string | undefined,
  defaultValue: number,
  name: string,
): number => {
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${name} "${value}". Expected numeric value.`);
  }
  return parsed;
};

const parseCsvList = (
  value: string | undefined,
  defaults: string[],
): string[] => {
  if (!value || value.trim().length === 0) {
    return defaults;
  }
  return value
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0);
};

const parseOtpProvider = (value: string | undefined): OtpProvider => {
  const resolved = (value || 'mock').toLowerCase();
  if (
    resolved === 'mock' ||
    resolved === 'http' ||
    resolved === 'firebase' ||
    resolved === 'twilio'
  ) {
    return resolved;
  }
  throw new Error(
    `Invalid OTP_PROVIDER "${value}". Allowed: mock | http | firebase | twilio.`,
  );
};

const parseImageStorageProvider = (
  value: string | undefined,
): ImageStorageProvider => {
  const resolved = (value || 'inline').toLowerCase();
  if (resolved === 'inline' || resolved === 'supabase') {
    return resolved;
  }
  throw new Error(
    `Invalid IMAGE_STORAGE_PROVIDER "${value}". Allowed: inline | supabase.`,
  );
};

const getRequired = (name: string): string => {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const nodeEnv = parseNodeEnv(process.env.NODE_ENV);
const usePostgres = parseBoolean(process.env.USE_POSTGRES, false);
const otpProvider = parseOtpProvider(process.env.OTP_PROVIDER);
const imageStorageProvider = parseImageStorageProvider(
  process.env.IMAGE_STORAGE_PROVIDER,
);
const monitoringEmitRequestEvents = parseBoolean(
  process.env.MONITORING_EMIT_REQUEST_EVENTS,
  false,
);
const otpBypassCode = (
  process.env.OTP_BYPASS_CODE !== undefined
    ? process.env.OTP_BYPASS_CODE
    : nodeEnv === 'production'
      ? ''
      : '123456'
).trim();
const paymentWebhookSecret =
  process.env.PAYMENT_WEBHOOK_SECRET &&
  process.env.PAYMENT_WEBHOOK_SECRET.trim().length > 0
    ? process.env.PAYMENT_WEBHOOK_SECRET.trim()
    : 'dev_webhook_secret';

if (nodeEnv === 'production') {
  if (!usePostgres) {
    throw new Error('USE_POSTGRES must be true in production.');
  }
  getRequired('DATABASE_URL');
  getRequired('PAYMENT_WEBHOOK_SECRET');
  if (otpProvider === 'mock') {
    throw new Error(
      'OTP_PROVIDER must be set to "http", "firebase", or "twilio" in production.',
    );
  }
  if (otpProvider === 'http') {
    getRequired('OTP_PROVIDER_HTTP_URL');
    getRequired('OTP_PROVIDER_HTTP_TOKEN');
  }
  if (otpProvider === 'firebase') {
    getRequired('FIREBASE_WEB_API_KEY');
  }
  if (otpProvider === 'twilio') {
    getRequired('TWILIO_ACCOUNT_SID');
    getRequired('TWILIO_AUTH_TOKEN');
    getRequired('TWILIO_VERIFY_SERVICE_SID');
  }
  if (otpBypassCode.length > 0) {
    throw new Error('OTP_BYPASS_CODE must not be configured in production.');
  }
  // Monitoring is optional for MVP - can be configured later
  // getRequired("MONITORING_SINK_URL");
  // getRequired("MONITORING_SINK_AUTH_TOKEN");
  // if (!monitoringEmitRequestEvents) {
  //   throw new Error("MONITORING_EMIT_REQUEST_EVENTS must be true in production.");
  // }
  if (imageStorageProvider === 'supabase') {
    getRequired('SUPABASE_URL');
    getRequired('SUPABASE_STORAGE_BUCKET');
    getRequired('SUPABASE_SERVICE_ROLE_KEY');
  }
}

export const env = {
  port: parsePort(process.env.PORT),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  nodeEnv,
  usePostgres,
  databaseUrl: process.env.DATABASE_URL || '',
  paymentWebhookSecret,
  monitoringSinkUrl: (process.env.MONITORING_SINK_URL || '').trim(),
  monitoringSinkAuthToken: (
    process.env.MONITORING_SINK_AUTH_TOKEN || ''
  ).trim(),
  monitoringEmitRequestEvents,
  alertWindowMs: parseNumber(
    process.env.ALERT_WINDOW_MS,
    5 * 60 * 1000,
    'ALERT_WINDOW_MS',
  ),
  alertMinRequests: parseNumber(
    process.env.ALERT_MIN_REQUESTS,
    20,
    'ALERT_MIN_REQUESTS',
  ),
  alertErrorRateThreshold: parseNumber(
    process.env.ALERT_ERROR_RATE_THRESHOLD,
    0.15,
    'ALERT_ERROR_RATE_THRESHOLD',
  ),
  alertP95MsThreshold: parseNumber(
    process.env.ALERT_P95_MS_THRESHOLD,
    1200,
    'ALERT_P95_MS_THRESHOLD',
  ),
  otpProvider,
  otpProviderHttpUrl: (process.env.OTP_PROVIDER_HTTP_URL || '').trim(),
  otpProviderHttpToken: (process.env.OTP_PROVIDER_HTTP_TOKEN || '').trim(),
  firebaseWebApiKey: (process.env.FIREBASE_WEB_API_KEY || '').trim(),
  firebaseOtpRecaptchaBypassToken: (
    process.env.FIREBASE_OTP_RECAPTCHA_BYPASS_TOKEN || ''
  ).trim(),
  twilioAccountSid: (process.env.TWILIO_ACCOUNT_SID || '').trim(),
  twilioAuthToken: (process.env.TWILIO_AUTH_TOKEN || '').trim(),
  twilioVerifyServiceSid: (process.env.TWILIO_VERIFY_SERVICE_SID || '').trim(),
  otpBypassCode,
  otpTtlSec: parseNumber(process.env.OTP_TTL_SEC, 300, 'OTP_TTL_SEC'),
  otpSendWindowSec: parseNumber(
    process.env.OTP_SEND_WINDOW_SEC,
    600,
    'OTP_SEND_WINDOW_SEC',
  ),
  otpSendMaxPerWindow: parseNumber(
    process.env.OTP_SEND_MAX_PER_WINDOW,
    5,
    'OTP_SEND_MAX_PER_WINDOW',
  ),
  otpVerifyFailWindowSec: parseNumber(
    process.env.OTP_VERIFY_FAIL_WINDOW_SEC,
    600,
    'OTP_VERIFY_FAIL_WINDOW_SEC',
  ),
  otpVerifyFailMax: parseNumber(
    process.env.OTP_VERIFY_FAIL_MAX,
    5,
    'OTP_VERIFY_FAIL_MAX',
  ),
  otpVerifyLockSec: parseNumber(
    process.env.OTP_VERIFY_LOCK_SEC,
    900,
    'OTP_VERIFY_LOCK_SEC',
  ),
  imageStorageProvider,
  supabaseUrl: (process.env.SUPABASE_URL || '').trim(),
  supabaseStorageBucket: (process.env.SUPABASE_STORAGE_BUCKET || '').trim(),
  supabaseServiceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  supabaseSignedUploadTtlSec: parseNumber(
    process.env.SUPABASE_SIGNED_UPLOAD_TTL_SEC,
    300,
    'SUPABASE_SIGNED_UPLOAD_TTL_SEC',
  ),
  supabaseAllowedUploadMimeTypes: parseCsvList(
    process.env.SUPABASE_ALLOWED_UPLOAD_MIME_TYPES,
    ['image/jpeg', 'image/png', 'image/webp'],
  ),
  supabaseAllowedUploadFolders: parseCsvList(
    process.env.SUPABASE_ALLOWED_UPLOAD_FOLDERS,
    ['general', 'menu', 'profile', 'support', 'kyc', 'moderation'],
  ),
  supabaseUploadMaxBytes: parseNumber(
    process.env.SUPABASE_UPLOAD_MAX_BYTES,
    5 * 1024 * 1024,
    'SUPABASE_UPLOAD_MAX_BYTES',
  ),
};

export default env;
