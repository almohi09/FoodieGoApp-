import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import env from "../config/env.js";

type ReqWithContext = Request & { requestId?: string };
type ReqWithTrace = ReqWithContext & { traceId?: string; spanId?: string };
type RequestSample = { timestamp: number; statusCode: number; durationMs: number };
type AlertState = {
  key: string;
  severity: "warning" | "critical";
  title: string;
  message: string;
  isFiring: boolean;
  triggeredAt?: string;
  resolvedAt?: string;
};

const metrics = {
  totalRequests: 0,
  inFlightRequests: 0,
  byMethod: new Map<string, number>(),
  byStatus: new Map<string, number>(),
  byRoute: new Map<string, number>(),
  lastUpdatedAt: new Date().toISOString(),
};
const recentSamples: RequestSample[] = [];
const activeAlerts = new Map<string, AlertState>();
const MAX_SAMPLES = 2000;

const postToSink = async (event: Record<string, unknown>) => {
  if (!env.monitoringSinkUrl) {
    return;
  }
  try {
    await fetch(env.monitoringSinkUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.monitoringSinkAuthToken ? { Authorization: `Bearer ${env.monitoringSinkAuthToken}` } : {}),
      },
      body: JSON.stringify(event),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ level: "error", event: "monitoring_sink_error", message }));
  }
};

const inc = (map: Map<string, number>, key: string) => {
  map.set(key, (map.get(key) || 0) + 1);
};

const toObject = (map: Map<string, number>) => Object.fromEntries(map.entries());

const percentile = (values: number[], p: number): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
};

const evaluateAlerts = () => {
  const now = Date.now();
  const cutoff = now - env.alertWindowMs;
  while (recentSamples.length && recentSamples[0].timestamp < cutoff) {
    recentSamples.shift();
  }

  const total = recentSamples.length;
  const serverErrors = recentSamples.filter((s) => s.statusCode >= 500).length;
  const errorRate = total > 0 ? serverErrors / total : 0;
  const p95Ms = percentile(
    recentSamples.map((s) => s.durationMs),
    95,
  );

  const evaluations = [
    {
      key: "high_error_rate",
      isFiring: total >= env.alertMinRequests && errorRate >= env.alertErrorRateThreshold,
      severity: "critical" as const,
      title: "High 5xx error rate",
      message: `5xx error rate ${Number((errorRate * 100).toFixed(2))}% over last ${total} requests`,
    },
    {
      key: "high_p95_latency",
      isFiring: total >= env.alertMinRequests && p95Ms >= env.alertP95MsThreshold,
      severity: "warning" as const,
      title: "High p95 latency",
      message: `p95 latency ${p95Ms}ms over last ${total} requests`,
    },
  ];

  for (const next of evaluations) {
    const prev = activeAlerts.get(next.key);
    if (!prev && next.isFiring) {
      const alert: AlertState = {
        ...next,
        triggeredAt: new Date().toISOString(),
      };
      activeAlerts.set(next.key, alert);
      void postToSink({ level: "alert", state: "firing", ...alert });
      continue;
    }
    if (prev && !next.isFiring) {
      const resolved: AlertState = {
        ...prev,
        isFiring: false,
        resolvedAt: new Date().toISOString(),
      };
      activeAlerts.delete(next.key);
      void postToSink({ level: "alert", state: "resolved", ...resolved });
    }
  }
};

export const observabilityMiddleware = (req: ReqWithContext, res: Response, next: NextFunction) => {
  const tracedReq = req as ReqWithTrace;
  const requestId = String(req.headers["x-request-id"] || `req_${crypto.randomUUID().slice(0, 10)}`);
  const incomingTraceParent = String(req.headers["traceparent"] || "");
  const incomingTraceMatch = incomingTraceParent.match(/^00-([a-f0-9]{32})-([a-f0-9]{16})-[a-f0-9]{2}$/i);
  const traceId = incomingTraceMatch?.[1]?.toLowerCase() || crypto.randomUUID().replaceAll("-", "");
  const spanId = crypto.randomUUID().replaceAll("-", "").slice(0, 16);
  const traceparent = `00-${traceId}-${spanId}-01`;

  req.requestId = requestId;
  tracedReq.traceId = traceId;
  tracedReq.spanId = spanId;
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("traceparent", traceparent);

  metrics.totalRequests += 1;
  metrics.inFlightRequests += 1;
  metrics.lastUpdatedAt = new Date().toISOString();
  inc(metrics.byMethod, req.method);

  const startedAt = Date.now();
  res.on("finish", () => {
    metrics.inFlightRequests = Math.max(0, metrics.inFlightRequests - 1);
    metrics.lastUpdatedAt = new Date().toISOString();
    inc(metrics.byStatus, String(res.statusCode));
    inc(metrics.byRoute, req.route?.path ? String(req.route.path) : req.path);

    const durationMs = Date.now() - startedAt;
    const payload = {
      level: "info",
      event: "http_request",
      service: "foodiego-backend",
      environment: env.nodeEnv,
      requestId,
      traceId,
      spanId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(payload));
    if (env.monitoringEmitRequestEvents) {
      void postToSink(payload);
    }

    recentSamples.push({ timestamp: Date.now(), statusCode: res.statusCode, durationMs });
    if (recentSamples.length > MAX_SAMPLES) {
      recentSamples.shift();
    }
    evaluateAlerts();
  });

  return next();
};

export const getMetricsSnapshot = () => ({
  totalRequests: metrics.totalRequests,
  inFlightRequests: metrics.inFlightRequests,
  byMethod: toObject(metrics.byMethod),
  byStatus: toObject(metrics.byStatus),
  byRoute: toObject(metrics.byRoute),
  lastUpdatedAt: metrics.lastUpdatedAt,
});

export const getMonitoringSnapshot = () => {
  const total = recentSamples.length;
  const serverErrors = recentSamples.filter((s) => s.statusCode >= 500).length;
  const errorRate = total > 0 ? serverErrors / total : 0;
  const p95Ms = percentile(
    recentSamples.map((s) => s.durationMs),
    95,
  );
  return {
    sinkConfigured: Boolean(env.monitoringSinkUrl),
    thresholds: {
      alertWindowMs: env.alertWindowMs,
      alertMinRequests: env.alertMinRequests,
      alertErrorRateThreshold: env.alertErrorRateThreshold,
      alertP95MsThreshold: env.alertP95MsThreshold,
    },
    rolling: {
      sampleCount: total,
      serverErrors,
      errorRate,
      p95Ms,
    },
    activeAlerts: Array.from(activeAlerts.values()),
  };
};
