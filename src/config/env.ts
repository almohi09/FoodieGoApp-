export interface AppEnvConfig {
  apiBaseUrl: string;
  requestTimeoutMs: number;
  trackingSocketPath: string;
  apiVersion: string;
  environment: string;
  release: string;
  appVersion: string;
}

const DEFAULT_API_BASE_URL = 'https://api.foodiego.in/api/v1';

export const appEnv: AppEnvConfig = {
  apiBaseUrl: DEFAULT_API_BASE_URL,
  requestTimeoutMs: 30000,
  trackingSocketPath: '/orders',
  apiVersion: 'v1',
  environment: __DEV__ ? 'development' : 'production',
  release: __DEV__ ? 'local-dev' : 'prod-release',
  appVersion: '0.0.1',
};

export default appEnv;
