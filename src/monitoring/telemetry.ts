import { analyticsService, EventName } from '../data/api/analyticsService';
import { captureError } from './errorCenter';
import { createTraceId, getObservabilityContext } from './observabilityContext';

export const trackEvent = async (
  name: EventName,
  properties?: Record<string, unknown>,
) => {
  try {
    await analyticsService.track(name, {
      ...properties,
      _meta: {
        ...getObservabilityContext(),
        traceId: createTraceId('evt'),
      },
    });
  } catch (error) {
    captureError(error, 'analytics-track');
  }
};

export default trackEvent;
