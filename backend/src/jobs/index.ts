import "dotenv/config";
import { Queue, Worker } from "bullmq";
import { config } from "../config.js";
import { parseRedisUrl } from "../lib/redis.js";
import type { ProcessReferralJobData } from "../types/index.js";

const connection = parseRedisUrl(config.redisUrl);

export const goalJobQueue = new Queue("goal-jobs", {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  },
});

export const cronJobQueue = new Queue("cron-jobs", {
  connection,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
    attempts: 1,
  },
});

import { processReferrals } from "./processReferrals.js";
import { lockExpiredGoals } from "./lockExpiredGoals.js";
import { detectDisputes } from "./detectDisputes.js";

export function startWorkers() {
  const goalWorker = new Worker<ProcessReferralJobData>(
    "goal-jobs",
    async (job) => {
      if (job.name === "processReferrals") {
        await processReferrals(job.data);
      }
    },
    { connection, concurrency: 5 }
  );

  const cronWorker = new Worker(
    "cron-jobs",
    async (job) => {
      if (job.name === "lockExpiredGoals") {
        await lockExpiredGoals();
      } else if (job.name === "detectDisputes") {
        await detectDisputes();
      }
    },
    { connection, concurrency: 1 }
  );

  goalWorker.on("completed", (job) => {
    console.log(`[Jobs] ✓ ${job.name} #${job.id}`);
  });

  goalWorker.on("failed", (job, err) => {
    console.error(`[Jobs] ✗ ${job?.name} #${job?.id}:`, err.message);
  });

  cronWorker.on("completed", (job) => {
    console.log(`[Cron] ✓ ${job.name}`);
  });

  cronWorker.on("failed", (job, err) => {
    console.error(`[Cron] ✗ ${job?.name}:`, err.message);
  });

  return { goalWorker, cronWorker };
}

export async function scheduleCronJobs() {
  await cronJobQueue.upsertJobScheduler(
    "cron:lockExpiredGoals",
    { pattern: "* * * * *" },
    { name: "lockExpiredGoals", data: {} }
  );

  await cronJobQueue.upsertJobScheduler(
    "cron:detectDisputes",
    { pattern: "*/5 * * * *" },
    { name: "detectDisputes", data: {} }
  );

  console.log("[Jobs] Cron schedulers upserted: lockExpiredGoals (1m), detectDisputes (5m)");
}

const argv1 = (process.argv[1] ?? "").replace(/\\/g, "/");
if (argv1.includes("/jobs/index")) {
  console.log("[Jobs] Starting workers...");

  startWorkers();
  scheduleCronJobs()
    .then(() => console.log("[Jobs] Workers running"))
    .catch((err) => {
      console.error("[Jobs] Fatal:", err);
      process.exit(1);
    });
}
