import asyncJobRepository from "../db/repositories/asyncJobRepository.js";
import paymentRepository from "../db/repositories/paymentRepository.js";

export const PAYMENT_WEBHOOK_RECONCILE_JOB = "payment_webhook_reconcile_v1";

type PaymentWebhookPayload = {
  transactionId: string;
  eventType: string;
  webhookEventId?: string;
};

const getNextStatus = (eventType: string): "pending" | "completed" | "failed" | "cancelled" => {
  if (["payment.captured", "payment.succeeded", "payment.completed"].includes(eventType)) {
    return "completed";
  }
  if (["payment.failed"].includes(eventType)) {
    return "failed";
  }
  if (["payment.cancelled", "payment.canceled"].includes(eventType)) {
    return "cancelled";
  }
  return "pending";
};

const getRetryDelayMs = (attempts: number): number => {
  const seconds = Math.min(300, Math.max(5, 2 ** Math.max(0, attempts) * 5));
  return seconds * 1000;
};

export const processPendingAsyncJobs = async (opts?: { limit?: number; workerId?: string }) => {
  if (!asyncJobRepository.isEnabled()) {
    return { claimed: 0, completed: 0, retried: 0, deadLetters: 0 };
  }

  const limit = Math.max(1, Math.min(100, opts?.limit || 20));
  const workerId = opts?.workerId || `worker_${process.pid}`;
  const summary = { claimed: 0, completed: 0, retried: 0, deadLetters: 0 };

  for (let i = 0; i < limit; i += 1) {
    const job = await asyncJobRepository.claimNext(workerId);
    if (!job) {
      break;
    }
    summary.claimed += 1;

    try {
      if (job.type !== PAYMENT_WEBHOOK_RECONCILE_JOB) {
        throw new Error(`Unsupported async job type: ${job.type}`);
      }
      const payload = (job.payload || {}) as PaymentWebhookPayload;
      if (!payload.transactionId || !payload.eventType) {
        throw new Error("Invalid payment webhook payload");
      }

      const status = getNextStatus(payload.eventType);
      const payment = await paymentRepository.updatePaymentStatusByTransactionId(payload.transactionId, status, "webhook");
      if (!payment) {
        throw new Error(`Payment not found for transactionId=${payload.transactionId}`);
      }

      if (payload.webhookEventId) {
        await paymentRepository.markWebhookEventProcessed(payload.webhookEventId, "processed");
      }

      await asyncJobRepository.markCompleted(job.id, {
        transactionId: payload.transactionId,
        eventType: payload.eventType,
        status,
      });
      summary.completed += 1;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const shouldDeadLetter = job.attempts + 1 >= job.maxAttempts;
      if (shouldDeadLetter) {
        await asyncJobRepository.moveToDeadLetter(job.id, message);
        summary.deadLetters += 1;
      } else {
        const nextAt = new Date(Date.now() + getRetryDelayMs(job.attempts));
        await asyncJobRepository.markRetry(job.id, message, nextAt);
        summary.retried += 1;
      }
    }
  }

  return summary;
};

export default processPendingAsyncJobs;
