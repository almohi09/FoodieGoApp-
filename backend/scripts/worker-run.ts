import "dotenv/config";
import processPendingAsyncJobs from "../src/workers/paymentWebhookWorker.js";

const intervalMs = Number(process.env.WORKER_POLL_MS || 2000);
const batchSize = Number(process.env.WORKER_BATCH_SIZE || 25);
const once = process.env.WORKER_ONCE === "true";
const workerId = process.env.WORKER_ID || `worker_${process.pid}`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const run = async () => {
  if (once) {
    const summary = await processPendingAsyncJobs({ limit: batchSize, workerId });
    console.log(JSON.stringify({ mode: "once", workerId, ...summary }, null, 2));
    return;
  }

  // Long-running poller for queue processing.
  while (true) {
    const summary = await processPendingAsyncJobs({ limit: batchSize, workerId });
    if (summary.claimed > 0) {
      console.log(JSON.stringify({ mode: "loop", workerId, ...summary }, null, 2));
    }
    await sleep(intervalMs);
  }
};

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ pass: false, workerId, error: message }, null, 2));
  process.exit(1);
});
