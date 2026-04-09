import { captureError } from '../monitoring/errorCenter';

type UnknownRecord = Record<string, unknown>;

export class ContractValidationError extends Error {
  constructor(
    public readonly contractPath: string,
    message: string,
  ) {
    super(`[${contractPath}] ${message}`);
    this.name = 'ContractValidationError';
  }
}

const buildError = (path: string, message: string) => {
  const error = new ContractValidationError(path, message);
  captureError(error, `contract:${path}`);
  return error;
};

export const asObject = (value: unknown, path: string): UnknownRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw buildError(path, 'Expected object');
  }
  return value as UnknownRecord;
};

export const asTypedObject = <T>(value: unknown, path: string): T =>
  asObject(value, path) as unknown as T;

export const asString = (value: unknown, path: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw buildError(path, 'Expected non-empty string');
  }
  return value;
};

export const asNumber = (value: unknown, path: string): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw buildError(path, 'Expected number');
  }
  return value;
};

export const asBoolean = (value: unknown, path: string): boolean => {
  if (typeof value !== 'boolean') {
    throw buildError(path, 'Expected boolean');
  }
  return value;
};

export const asArray = <T>(
  value: unknown,
  path: string,
  mapItem: (item: unknown, itemPath: string) => T,
): T[] => {
  if (!Array.isArray(value)) {
    throw buildError(path, 'Expected array');
  }
  return value.map((item, index) => mapItem(item, `${path}[${index}]`));
};

export const asOptionalString = (
  value: unknown,
  path: string,
): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  return asString(value, path);
};

export const asOptionalNumber = (
  value: unknown,
  path: string,
): number | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  return asNumber(value, path);
};

export const asOptionalBoolean = (
  value: unknown,
  path: string,
): boolean | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  return asBoolean(value, path);
};

export const asEnum = <T extends string>(
  value: unknown,
  path: string,
  allowed: readonly T[],
): T => {
  const candidate = asString(value, path) as T;
  if (!allowed.includes(candidate)) {
    throw buildError(path, `Expected one of: ${allowed.join(', ')}`);
  }
  return candidate;
};

export const asErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (error instanceof ContractValidationError) {
    return `Invalid server response: ${error.message}`;
  }

  const axiosLike = error as { response?: { data?: { message?: string } } };
  return axiosLike.response?.data?.message || fallback;
};

