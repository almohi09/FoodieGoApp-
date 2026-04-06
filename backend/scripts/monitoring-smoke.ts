import http from "node:http";

const run = async () => {
  const sinkEvents: Array<Record<string, unknown>> = [];
  const sinkServer = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        sinkEvents.push(parsed);
      } catch {
        sinkEvents.push({ invalid: true });
      }
      res.statusCode = 200;
      res.end("ok");
    });
  });
  await new Promise<void>((resolve) => sinkServer.listen(0, () => resolve()));
  const sinkPort = (sinkServer.address() as any).port as number;

  process.env.MONITORING_SINK_URL = `http://127.0.0.1:${sinkPort}/sink`;
  process.env.MONITORING_EMIT_REQUEST_EVENTS = "true";
  process.env.ALERT_MIN_REQUESTS = "3";
  process.env.ALERT_P95_MS_THRESHOLD = "0";
  process.env.ALERT_ERROR_RATE_THRESHOLD = "1";

  const { default: app } = await import("../src/app.js");
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const port = (server.address() as any).port as number;
  const base = `http://127.0.0.1:${port}/api/v1`;

  try {
    for (let i = 0; i < 5; i += 1) {
      await fetch(`${base}/health`);
    }
    const monitoringRes = await fetch(`${base}/monitoring`);
    const monitoringJson = (await monitoringRes.json()) as any;
    const activeAlerts = monitoringJson?.monitoring?.activeAlerts || [];
    const hasLatencyAlert = activeAlerts.some((a: any) => a?.key === "high_p95_latency");
    const sinkAlertEvents = sinkEvents.filter((e) => e.level === "alert");
    const sinkRequestEvents = sinkEvents.filter((e) => e.event === "http_request");

    console.log(
      JSON.stringify(
        {
          pass: monitoringRes.status === 200 && hasLatencyAlert && sinkAlertEvents.length > 0,
          monitoringStatus: monitoringRes.status,
          hasLatencyAlert,
          sinkAlertEvents: sinkAlertEvents.length,
          sinkRequestEvents: sinkRequestEvents.length,
          activeAlertKeys: activeAlerts.map((a: any) => a?.key),
        },
        null,
        2,
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 150));
  } finally {
    server.close();
    sinkServer.close();
  }
};

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ pass: false, error: message }, null, 2));
  process.exit(1);
});
