import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AddressInfo } from "node:net";

const nowIso = () => new Date().toISOString();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type TimelineEvent = {
  at: string;
  step: string;
  details?: Record<string, unknown>;
};

const run = async () => {
  process.env.MONITORING_EMIT_REQUEST_EVENTS = "true";
  process.env.ALERT_MIN_REQUESTS = "3";
  process.env.ALERT_WINDOW_MS = "300";
  process.env.ALERT_P95_MS_THRESHOLD = "0";
  process.env.ALERT_ERROR_RATE_THRESHOLD = "1";

  const timeline: TimelineEvent[] = [];
  const push = (step: string, details?: Record<string, unknown>) => timeline.push({ at: nowIso(), step, details });

  const { default: app } = await import("../src/app.js");
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`;

  try {
    push("drill_started", { baseUrl });

    const healthBefore = await fetch(`${baseUrl}/health`);
    push("baseline_health_check", { status: healthBefore.status });

    for (let i = 0; i < 5; i += 1) {
      await fetch(`${baseUrl}/health`);
    }
    push("synthetic_traffic_generated", { requests: 5 });

    const monitorDuring = await fetch(`${baseUrl}/monitoring`);
    const monitorDuringJson = (await monitorDuring.json()) as any;
    const activeDuring = (monitorDuringJson?.monitoring?.activeAlerts || []).map((a: any) => a.key);
    push("alert_detection", { activeAlerts: activeDuring });

    // Simulated mitigation action: traffic shaping + observe post-mitigation recovery window.
    push("mitigation_started", { action: "traffic_shaping_simulated" });
    await sleep(1400);
    await fetch(`${baseUrl}/health`);
    const monitorAfter = await fetch(`${baseUrl}/monitoring`);
    const monitorAfterJson = (await monitorAfter.json()) as any;
    const activeAfter = (monitorAfterJson?.monitoring?.activeAlerts || []).map((a: any) => a.key);
    push("mitigation_validation", { activeAlerts: activeAfter });

    const healthAfter = await fetch(`${baseUrl}/health`);
    push("post_mitigation_health_check", { status: healthAfter.status });

    const incidentPath = join(process.cwd(), "artifacts", "drills");
    await mkdir(incidentPath, { recursive: true });
    const outFile = join(
      incidentPath,
      `incident-drill-${new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-")}.json`,
    );
    const payload = {
      pass:
        healthBefore.status === 200 &&
        healthAfter.status === 200 &&
        activeDuring.includes("high_p95_latency") &&
        !activeAfter.includes("high_p95_latency"),
      windowMs: Number(process.env.ALERT_WINDOW_MS),
      thresholds: {
        alertMinRequests: Number(process.env.ALERT_MIN_REQUESTS),
        alertP95MsThreshold: Number(process.env.ALERT_P95_MS_THRESHOLD),
      },
      timeline,
      summary: {
        alertRaised: activeDuring.includes("high_p95_latency"),
        alertResolved: !activeAfter.includes("high_p95_latency"),
      },
    };
    await writeFile(outFile, JSON.stringify(payload, null, 2), "utf8");
    console.log(JSON.stringify({ ...payload.summary, pass: payload.pass, evidenceFile: outFile }, null, 2));
  } finally {
    server.close();
  }
};

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ pass: false, error: message }, null, 2));
  process.exit(1);
});
