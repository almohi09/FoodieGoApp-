import crypto from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

type JsonValue = Record<string, unknown>;

const nowIso = () => new Date().toISOString();

const getLatestJsonFile = async (dir: string, prefix: string): Promise<string | null> => {
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return null;
  }
  const matches = files.filter((f) => f.startsWith(prefix) && f.endsWith(".json"));
  if (!matches.length) return null;

  const withTimes = await Promise.all(
    matches.map(async (file) => {
      const full = path.join(dir, file);
      const s = await stat(full);
      return { full, mtimeMs: s.mtimeMs };
    }),
  );
  withTimes.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return withTimes[0].full;
};

const readJson = async (file: string | null): Promise<JsonValue | null> => {
  if (!file) return null;
  try {
    return JSON.parse(await readFile(file, "utf8")) as JsonValue;
  } catch {
    return null;
  }
};

const run = async () => {
  const root = process.cwd();
  const cutoverDir = path.join(root, "artifacts", "cutover");
  const drillDir = path.join(root, "artifacts", "drills");
  const target = (process.env.CUTOVER_TARGET || "local").trim().toLowerCase(); // local | staging

  const latestCutoverFile = await getLatestJsonFile(cutoverDir, "cutover-check-");
  const latestK8sDrillFile = await getLatestJsonFile(drillDir, "k8s-rollout-drill-");

  const latestCutover = await readJson(latestCutoverFile);
  const latestK8sDrill = await readJson(latestK8sDrillFile);

  const drillParams = (latestK8sDrill?.params as JsonValue | undefined) || {};
  const k8sContext = String(drillParams.k8sContext || "");
  const isKindDrill = k8sContext.startsWith("kind-");

  const checks = {
    cutoverPolicyEvidencePresent: Boolean(latestCutoverFile && latestCutover?.checksum),
    k8sRolloutEvidencePresent: Boolean(latestK8sDrillFile && latestK8sDrill?.checksum),
    k8sRolloutPass: latestK8sDrill?.pass === true,
    stagingContextEvidence:
      target === "staging"
        ? Boolean(latestK8sDrillFile && latestK8sDrill?.pass === true && k8sContext.length > 0 && !isKindDrill)
        : true,
  };

  const missing = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);

  const summary = {
    generatedAt: nowIso(),
    target,
    pass: missing.length === 0,
    checks,
    missing,
    artifacts: {
      latestCutoverFile,
      latestK8sDrillFile,
    },
    context: {
      k8sContext: k8sContext || null,
      localRehearsal: isKindDrill,
    },
  };

  const payload = JSON.stringify(summary, null, 2);
  const checksum = crypto.createHash("sha256").update(payload).digest("hex");
  const signed = {
    ...summary,
    checksum: { algorithm: "sha256", value: checksum },
  };

  const outDir = path.join(cutoverDir, "packs");
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, `cutover-evidence-pack-${new Date().toISOString().replaceAll(":", "-")}.json`);
  await writeFile(outFile, JSON.stringify(signed, null, 2), "utf8");

  console.log(JSON.stringify({ pass: signed.pass, target, outFile, checksum: signed.checksum, missing }, null, 2));
  if (!signed.pass) {
    process.exit(1);
  }
};

void run();
