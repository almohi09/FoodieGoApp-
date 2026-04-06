import { createTraceId, getObservabilityContext } from './observabilityContext';

export interface AppErrorRecord {
  id: string;
  message: string;
  stack?: string;
  source: string;
  timestamp: string;
  fatal?: boolean;
  traceId: string;
  tags?: Record<string, string | number | boolean>;
  context: {
    environment: string;
    release: string;
    appVersion: string;
    buildType: string;
  };
}

export interface CaptureErrorOptions {
  fatal?: boolean;
  traceId?: string;
  tags?: Record<string, string | number | boolean>;
}

type Listener = () => void;

const listeners = new Set<Listener>();
const records: AppErrorRecord[] = [];
const MAX_RECORDS = 200;
let installed = false;

const notify = () => {
  listeners.forEach(listener => listener());
};

const normalizeError = (error: unknown): { message: string; stack?: string } => {
  if (error instanceof Error) {
    return {
      message: error.message || 'Unknown error',
      stack: error.stack,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: 'Unknown non-serializable error' };
  }
};

export const captureError = (
  error: unknown,
  source: string,
  fatalOrOptions?: boolean | CaptureErrorOptions,
) => {
  const options: CaptureErrorOptions =
    typeof fatalOrOptions === 'boolean'
      ? { fatal: fatalOrOptions }
      : fatalOrOptions || {};
  const { message, stack } = normalizeError(error);
  const context = getObservabilityContext();
  const record: AppErrorRecord = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    message,
    stack,
    source,
    timestamp: new Date().toISOString(),
    fatal: options.fatal,
    traceId: options.traceId || createTraceId('err'),
    tags: options.tags,
    context,
  };

  records.unshift(record);
  if (records.length > MAX_RECORDS) {
    records.length = MAX_RECORDS;
  }
  notify();
};

export const getErrorRecords = (): AppErrorRecord[] => records;

export const clearErrorRecords = () => {
  records.length = 0;
  notify();
};

export const subscribeToErrors = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const installGlobalErrorHandlers = () => {
  if (installed) {
    return;
  }

  installed = true;

  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    captureError(args[0] ?? 'console.error called', 'console.error');
    originalConsoleError(...args);
  };

  const globalObj = global as typeof global & {
    ErrorUtils?: {
      getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void;
      setGlobalHandler?: (
        handler: (error: unknown, isFatal?: boolean) => void,
      ) => void;
    };
  };

  const errorUtils = globalObj.ErrorUtils;
  if (errorUtils?.setGlobalHandler) {
    const originalHandler = errorUtils.getGlobalHandler?.();
    errorUtils.setGlobalHandler((error, isFatal) => {
      captureError(error, 'global-js', isFatal);
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
  }
};
