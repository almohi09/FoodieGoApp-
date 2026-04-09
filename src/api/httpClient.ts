import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import appEnv from '../config/env';
import { captureError } from '../monitoring/errorCenter';
import { createTraceId } from '../monitoring/observabilityContext';

const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const DEVICE_ID_KEY = 'device_id';

let inMemoryAccessToken: string | null = null;
let inMemoryRefreshToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

const buildDeviceId = () =>
  `fg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const getDeviceId = async () => {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const created = buildDeviceId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  return created;
};

const getAccessToken = async () => {
  if (inMemoryAccessToken) {
    return inMemoryAccessToken;
  }
  inMemoryAccessToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  return inMemoryAccessToken;
};

const getRefreshToken = async () => {
  if (inMemoryRefreshToken) {
    return inMemoryRefreshToken;
  }
  inMemoryRefreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  return inMemoryRefreshToken;
};

export const persistSessionTokens = async (
  accessToken?: string,
  refreshToken?: string,
) => {
  if (accessToken) {
    inMemoryAccessToken = accessToken;
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  }
  if (refreshToken) {
    inMemoryRefreshToken = refreshToken;
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
};

export const clearSessionTokens = async () => {
  inMemoryAccessToken = null;
  inMemoryRefreshToken = null;
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY]);
};

export const newIdempotencyKey = (scope: string) =>
  `${scope}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

const isIdempotentEligible = (method?: string) => {
  if (!method) {
    return false;
  }
  return ['post', 'put', 'patch', 'delete'].includes(method.toLowerCase());
};

type RetryableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const getTraceIdFromHeaders = (headers: unknown): string | undefined => {
  if (!headers || typeof headers !== 'object') {
    return undefined;
  }
  const map = headers as Record<string, unknown>;
  const candidates = ['X-Trace-Id', 'x-trace-id'];
  for (const key of candidates) {
    const value = map[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return undefined;
};

export const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: appEnv.apiBaseUrl,
    timeout: appEnv.requestTimeoutMs,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const token = await getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const deviceId = await getDeviceId();
      config.headers['X-Device-Id'] = deviceId;
      config.headers['X-Api-Version'] = appEnv.apiVersion;
      if (!config.headers['X-Trace-Id']) {
        config.headers['X-Trace-Id'] = createTraceId('req');
      }

      if (
        isIdempotentEligible(config.method) &&
        !config.headers['Idempotency-Key']
      ) {
        config.headers['Idempotency-Key'] = newIdempotencyKey(
          String(config.url || 'request'),
        );
      }

      return config;
    },
  );

  client.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as RetryableConfig | undefined;
      if (!originalRequest) {
        captureError(error, 'api-response-no-config', {
          tags: {
            status: error.response?.status || 'unknown',
          },
        });
        return Promise.reject(error);
      }

      const traceId = getTraceIdFromHeaders(originalRequest.headers);
      const status = error.response?.status;
      if (status !== 401 || originalRequest._retry) {
        captureError(error, 'api-response', {
          traceId,
          tags: {
            status: status || 'unknown',
            url: originalRequest.url || 'unknown',
            method: originalRequest.method || 'unknown',
          },
        });
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      const nextToken = await refreshAccessToken(client);
      if (!nextToken) {
        await clearSessionTokens();
        return Promise.reject(error);
      }

      originalRequest.headers.set('Authorization', `Bearer ${nextToken}`);
      return client(originalRequest as AxiosRequestConfig);
    },
  );

  return client;
};

const refreshAccessToken = async (
  client: AxiosInstance,
): Promise<string | null> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await client.post(
        '/auth/refresh-token',
        { refreshToken },
        {
          headers: {
            Authorization: '',
            'Idempotency-Key': newIdempotencyKey('auth-refresh'),
          },
        },
      );

      const nextAccessToken = response.data?.token as string | undefined;
      const nextRefreshToken = response.data?.refreshToken as
        | string
        | undefined;

      if (!nextAccessToken) {
        return null;
      }

      await persistSessionTokens(nextAccessToken, nextRefreshToken);
      return nextAccessToken;
    } catch (refreshError) {
      captureError(refreshError, 'auth-refresh');
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

