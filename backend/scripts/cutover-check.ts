import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import env from "../src/config/env.js";

const run = async () => {
  if (env.nodeEnv !== "production") {
    throw new Error("cutover:check requires NODE_ENV=production.");
  }

  const startedAt = new Date().toISOString();
  const checks = {
    postgresEnabled: env.usePostgres === true,
    otpProviderHttp: env.otpProvider === "http",
    otpBypassDisabled: env.otpBypassCode.length === 0,
    monitoringSinkConfigured: Boolean(env.monitoringSinkUrl),
    monitoringSinkTokenConfigured: Boolean(env.monitoringSinkAuthToken),
    monitoringRequestEventsEnabled: env.monitoringEmitRequestEvents === true,
  };

  const failures = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failures.length > 0) {
    throw new Error(`Production cutover checks failed: ${failures.join(", ")}`);
  }

  const artifact = {
    startedAt,
    completedAt: new Date().toISOString(),
    environment: env.nodeEnv,
    checks,
  };

  const payload = JSON.stringify(artifact, null, 2);
  const sha256 = crypto.createHash("sha256").update(payload).digest("hex");
  const signedArtifact = {
    ...artifact,
    checksum: {
      algorithm: "sha256",
      value: sha256,
    },
  };

  const outDir = path.resolve(process.cwd(), "artifacts", "cutover");
  await mkdir(outDir, { recursive: true });
  const safeTs = new Date().toISOString().replaceAll(":", "-");
  const outFile = path.join(outDir, `cutover-check-${safeTs}.json`);
  await writeFile(outFile, JSON.stringify(signedArtifact, null, 2), "utf8");
  console.log(
    JSON.stringify({
      status: "ok",
      artifact: outFile,
      checksum: signedArtifact.checksum,
      checks,
    }),
  );
};

void run();
