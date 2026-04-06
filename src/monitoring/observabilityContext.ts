export type BuildType = 'debug' | 'release';

export interface ObservabilityContext {
  environment: string;
  release: string;
  appVersion: string;
  buildType: BuildType;
}

let currentContext: ObservabilityContext = {
  environment: 'dev',
  release: 'local',
  appVersion: '0.0.1',
  buildType: __DEV__ ? 'debug' : 'release',
};

export const setObservabilityContext = (
  context: Partial<ObservabilityContext>,
): void => {
  currentContext = {
    ...currentContext,
    ...context,
  };
};

export const getObservabilityContext = (): ObservabilityContext =>
  currentContext;

export const createTraceId = (prefix = 'fg'): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
