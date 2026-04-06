import "dotenv/config";
import processPendingAsyncJobs from "../src/workers/paymentWebhookWorker.js";

const batchSize = Number(process.env.WORKER_BATCH_SIZE || 25);
const workerId = process.env.WORKER_ID || `worker_${process.pid}`;

const run = async () => {
  const summary = await processPendingAsyncJobs({ limit: batchSize, workerId });
  console.log(JSON.stringify({ mode: "once", workerId, ...summary }, null, 2));
};

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ pass: false, workerId, error: message }, null, 2));
  process.exit(1);
});
