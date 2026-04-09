export interface AppEnvConfig {
  apiBaseUrl: string;
  requestTimeoutMs: number;
  trackingSocketPath: string;
  apiVersion: string;
  environment: string;
  release: string;
  appVersion: string;
  enableInternalRolePortals: boolean;
}

const DEFAULT_API_BASE_URL = 'https://foodiegoapp-backend.onrender.com/api/v1';
const RESOLVED_API_BASE_URL =
  (typeof process !== 'undefined' ? process.env?.API_BASE_URL : undefined) ||
  DEFAULT_API_BASE_URL;

const parseBooleanEnv = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return fallback;
};

const RESOLVED_INTERNAL_ROLE_PORTALS = parseBooleanEnv(
  typeof process !== 'undefined'
    ? process.env?.ENABLE_INTERNAL_ROLE_PORTALS
    : undefined,
  false,
);

export const appEnv: AppEnvConfig = {
  apiBaseUrl: RESOLVED_API_BASE_URL,
  requestTimeoutMs: 30000,
  trackingSocketPath: '/orders',
  apiVersion: 'v1',
  environment: __DEV__ ? 'development' : 'production',
  release: __DEV__ ? 'local-dev' : 'prod-release',
  appVersion: '0.0.1',
  enableInternalRolePortals: RESOLVED_INTERNAL_ROLE_PORTALS,
};

export default appEnv;
