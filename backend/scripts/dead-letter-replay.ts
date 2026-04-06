import "dotenv/config";
import asyncJobRepository from "../src/db/repositories/asyncJobRepository.js";

const targetId = process.env.DEAD_LETTER_ID || "";

const run = async () => {
  if (!asyncJobRepository.isEnabled()) {
    throw new Error("Dead-letter replay requires USE_POSTGRES=true");
  }

  if (targetId) {
    const replayed = await asyncJobRepository.replayDeadLetter(targetId);
    if (!replayed) {
      throw new Error(`Dead letter not found: ${targetId}`);
    }
    console.log(JSON.stringify({ replayed: 1, jobId: replayed.id, type: replayed.type }, null, 2));
    return;
  }

  const items = (await asyncJobRepository.listDeadLetters(50)) || [];
  const openItems = items.filter((item) => item.status === "open");
  let replayedCount = 0;
  for (const item of openItems) {
    const replayed = await asyncJobRepository.replayDeadLetter(item.id);
    if (replayed) {
      replayedCount += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        scanned: items.length,
        open: openItems.length,
        replayed: replayedCount,
      },
      null,
      2,
    ),
  );
};

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ pass: false, error: message }, null, 2));
  process.exit(1);
});
