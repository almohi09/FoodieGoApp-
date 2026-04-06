import crypto from "node:crypto";
import { execFile as execFileCb } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCb);

type StepResult = {
  step: string;
  command: string[];
  ok: boolean;
  startedAt: string;
  endedAt: string;
  stdout?: string;
  stderr?: string;
  error?: string;
};

const nowIso = () => new Date().toISOString();

const redact = (value: string): string =>
  value.replaceAll(/(token|password|secret)=([^\s]+)/gi, "$1=***");

const parseBool = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return value.trim().toLowerCase() === "true";
};

const runCommand = async (
  step: string,
  command: string[],
  opts: { dryRun: boolean; allowFailure?: boolean } = { dryRun: false },
): Promise<StepResult> => {
  const startedAt = nowIso();
  if (opts.dryRun) {
    const endedAt = nowIso();
    return {
      step,
      command,
      ok: true,
      startedAt,
      endedAt,
      stdout: "[dry-run] command not executed",
    };
  }

  try {
    const { stdout, stderr } = await execFile(command[0], command.slice(1), {
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    return {
      step,
      command,
      ok: true,
      startedAt,
      endedAt: nowIso(),
      stdout: redact(stdout || ""),
      stderr: redact(stderr || ""),
    };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    const result: StepResult = {
      step,
      command,
      ok: false,
      startedAt,
      endedAt: nowIso(),
      stdout: redact(err.stdout || ""),
      stderr: redact(err.stderr || ""),
      error: err.message || "unknown command error",
    };
    if (opts.allowFailure) {
      return result;
    }
    throw result;
  }
};

const checkHttp = async (url: string, label: string): Promise<StepResult> => {
  const startedAt = nowIso();
  try {
    const response = await fetch(url);
    return {
      step: label,
      command: ["HTTP", "GET", url],
      ok: response.ok,
      startedAt,
      endedAt: nowIso(),
      stdout: JSON.stringify({ status: response.status }),
    };
  } catch (error) {
    return {
      step: label,
      command: ["HTTP", "GET", url],
      ok: false,
      startedAt,
      endedAt: nowIso(),
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const run = async () => {
  const namespace = process.env.K8S_NAMESPACE || "foodiego";
  const deployment = process.env.K8S_DEPLOYMENT || "foodiego-backend";
  const manifestPath = process.env.K8S_MANIFEST_PATH || "infra/k8s";
  const timeout = process.env.K8S_ROLLOUT_TIMEOUT || "180s";
  const k8sContext = (process.env.K8S_CONTEXT || "").trim();
  const dryRun = parseBool(process.env.K8S_EVIDENCE_DRY_RUN, false);
  const healthUrl = (process.env.K8S_HEALTHCHECK_URL || "").trim();
  const contextArgs = k8sContext ? ["--context", k8sContext] : [];

  const steps: StepResult[] = [];
  const startedAt = nowIso();

  steps.push(
    await runCommand("kubectl_client_version", ["kubectl", ...contextArgs, "version", "--client", "-o", "json"], {
      dryRun,
    }),
  );
  const contextStep = await runCommand(
    "kubectl_current_context",
    ["kubectl", ...contextArgs, "config", "current-context"],
    { dryRun, allowFailure: true },
  );
  steps.push(contextStep);
  if (!contextStep.ok) {
    throw new Error(
      "Kubernetes context is not configured. Set kubeconfig/current-context or provide K8S_CONTEXT and rerun.",
    );
  }
  steps.push(await runCommand("kustomize_apply", ["kubectl", ...contextArgs, "apply", "-k", manifestPath], { dryRun }));
  steps.push(
    await runCommand(
      "rollout_status_after_apply",
      [
        "kubectl",
        ...contextArgs,
        "rollout",
        "status",
        `deployment/${deployment}`,
        "-n",
        namespace,
        `--timeout=${timeout}`,
      ],
      { dryRun },
    ),
  );
  steps.push(
    await runCommand(
      "deployment_snapshot_after_apply",
      ["kubectl", ...contextArgs, "get", "deployment", deployment, "-n", namespace, "-o", "json"],
      { dryRun },
    ),
  );

  if (healthUrl) {
    if (dryRun) {
      steps.push({
        step: "healthcheck_after_apply",
        command: ["HTTP", "GET", healthUrl],
        ok: true,
        startedAt: nowIso(),
        endedAt: nowIso(),
        stdout: "[dry-run] health check skipped",
      });
    } else {
      steps.push(await checkHttp(healthUrl, "healthcheck_after_apply"));
    }
  }

  steps.push(
    await runCommand(
      "rollout_undo",
      ["kubectl", ...contextArgs, "rollout", "undo", `deployment/${deployment}`, "-n", namespace],
      { dryRun },
    ),
  );
  steps.push(
    await runCommand(
      "rollout_status_after_undo",
      [
        "kubectl",
        ...contextArgs,
        "rollout",
        "status",
        `deployment/${deployment}`,
        "-n",
        namespace,
        `--timeout=${timeout}`,
      ],
      { dryRun },
    ),
  );
  steps.push(
    await runCommand(
      "deployment_snapshot_after_undo",
      ["kubectl", ...contextArgs, "get", "deployment", deployment, "-n", namespace, "-o", "json"],
      { dryRun },
    ),
  );

  if (healthUrl) {
    if (dryRun) {
      steps.push({
        step: "healthcheck_after_undo",
        command: ["HTTP", "GET", healthUrl],
        ok: true,
        startedAt: nowIso(),
        endedAt: nowIso(),
        stdout: "[dry-run] health check skipped",
      });
    } else {
      steps.push(await checkHttp(healthUrl, "healthcheck_after_undo"));
    }
  }

  const pass = steps.every((s) => s.ok);
  const completedAt = nowIso();

  const artifact = {
    type: "k8s_rollout_drill",
    startedAt,
    completedAt,
    pass,
    params: {
      namespace,
      deployment,
      manifestPath,
      timeout,
      k8sContext: k8sContext || null,
      dryRun,
      healthUrl: healthUrl || null,
    },
    steps,
  };

  const payload = JSON.stringify(artifact, null, 2);
  const sha256 = crypto.createHash("sha256").update(payload).digest("hex");
  const signed = {
    ...artifact,
    checksum: { algorithm: "sha256", value: sha256 },
  };

  const outDir = join(process.cwd(), "artifacts", "drills");
  await mkdir(outDir, { recursive: true });
  const file = join(outDir, `k8s-rollout-drill-${new Date().toISOString().replaceAll(":", "-")}.json`);
  await writeFile(file, JSON.stringify(signed, null, 2), "utf8");

  console.log(JSON.stringify({ pass, file, checksum: signed.checksum, dryRun }, null, 2));
  if (!pass) {
    process.exit(1);
  }
};

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : JSON.stringify(error);
  console.error(JSON.stringify({ pass: false, error: message }));
  process.exit(1);
});
