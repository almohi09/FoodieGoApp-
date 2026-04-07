import type { AddressInfo } from "node:net";

type Sample = {
  status: number;
  durationMs: number;
};

const REQUESTS = Number(process.env.PERF_REQUESTS || 120);
const CONCURRENCY = Number(process.env.PERF_CONCURRENCY || 8);
const MAX_P95_MS = Number(process.env.PERF_MAX_P95_MS || 450);
const MAX_ERROR_RATE = Number(process.env.PERF_MAX_ERROR_RATE || 0.02);

const ensurePerfEnv = () => {
  process.env.NODE_ENV = process.env.NODE_ENV || "test";
  process.env.PORT = process.env.PORT || "4000";
  process.env.API_PREFIX = process.env.API_PREFIX || "/api/v1";
  process.env.PAYMENT_WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || "dev_webhook_secret";
  process.env.OTP_PROVIDER = process.env.OTP_PROVIDER || "mock";
  process.env.OTP_BYPASS_CODE = process.env.OTP_BYPASS_CODE || "123456";
  process.env.MONITORING_SINK_URL = "";
  process.env.MONITORING_SINK_AUTH_TOKEN = "";
  process.env.MONITORING_EMIT_REQUEST_EVENTS = "false";
  process.env.USE_POSTGRES = process.env.USE_POSTGRES || "false";
};

const percentile = (values: number[], p: number) => {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
};

const runBatch = async (baseUrl: string, count: number): Promise<Sample[]> => {
  const samples: Sample[] = [];
  for (let i = 0; i < count; i += 1) {
    const started = Date.now();
    try {
      const res = await fetch(`${baseUrl}/restaurants`);
      samples.push({ status: res.status, durationMs: Date.now() - started });
      await res.arrayBuffer();
    } catch {
      samples.push({ status: 0, durationMs: Date.now() - started });
    }
  }
  return samples;
};

const main = async () => {
  ensurePerfEnv();
  const { default: app } = await import("../src/app.js");
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`;

  try {
    await fetch(`${baseUrl}/health`);

    const perWorker = Math.ceil(REQUESTS / CONCURRENCY);
    const workers = Array.from({ length: CONCURRENCY }).map(() => runBatch(baseUrl, perWorker));
    const settled = await Promise.all(workers);
    const samples = settled.flat().slice(0, REQUESTS);

    const durations = samples.map((s) => s.durationMs);
    const errors = samples.filter((s) => s.status < 200 || s.status >= 400).length;
    const errorRate = samples.length ? errors / samples.length : 1;
    const p95 = percentile(durations, 95);
    const avg = durations.reduce((a, b) => a + b, 0) / Math.max(durations.length, 1);

    const report = {
      requests: samples.length,
      concurrency: CONCURRENCY,
      avgMs: Number(avg.toFixed(2)),
      p95Ms: p95,
      errorRate: Number(errorRate.toFixed(4)),
      thresholds: {
        maxP95Ms: MAX_P95_MS,
        maxErrorRate: MAX_ERROR_RATE,
      },
      pass: p95 <= MAX_P95_MS && errorRate <= MAX_ERROR_RATE,
    };

    console.log(JSON.stringify(report, null, 2));

    if (!report.pass) {
      process.exitCode = 1;
    }
  } finally {
    server.close();
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
