import "dotenv/config";
import { Queue, Worker } from "bullmq";
import { config } from "../config.js";
import { parseRedisUrl } from "../lib/redis.js";
import type { ProcessReferralJobData } from "../types/index.js";

const connection = parseRedisUrl(config.redisUrl);

/**
 * BullMQ queue for one-shot, event-driven jobs (referral verification,
 * etc). Jobs in this queue are fired by API handlers when something
 * domain-relevant happens — they're not on a cron schedule.
 *
 * Retention: keep the last 100 completed and 500 failed for
 * post-mortem visibility in the BullMQ dashboard. Failed jobs retry
 * 3× with exponential backoff (2s → 4s → 8s) to ride out transient
 * Postgres / Redis hiccups.
 */
export const goalJobQueue = new Queue("goal-jobs", {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  },
});

/**
 * BullMQ queue for scheduled, repeating jobs (lock expired goals,
 * detect disputes).
 *
 * Single-attempt by design: a cron tick that fails doesn't get
 * retried — the next tick fires soon enough that catching up is
 * cheaper than retrying. Lower retention than the goal queue since
 * crons are idempotent and a missed completion log doesn't matter.
 */
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

/**
 * Spin up both BullMQ workers (goal-jobs + cron-jobs) and wire
 * `completed` / `failed` log handlers. Returns the worker pair so
 * callers can listen for graceful-shutdown signals.
 *
 * `goalWorker` concurrency = 5: most goal-jobs do a Prisma round
 * trip + a Redis publish, so we can saturate a small pool without
 * tipping the database over. `cronWorker` concurrency = 1: cron
 * jobs are larger sweeps (e.g. lock-expired) and serializing them
 * prevents two ticks racing on the same goal.
 */
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
    process.stdout.write(`[Jobs] done ${job.name} #${job.id}\n`);
  });

  goalWorker.on("failed", (job, err) => {
    process.stderr.write(`[Jobs] fail ${job?.name} #${job?.id}: ${err.message}\n`);
  });

  cronWorker.on("completed", (job) => {
    process.stdout.write(`[Cron] done ${job.name}\n`);
  });

  cronWorker.on("failed", (job, err) => {
    process.stderr.write(`[Cron] fail ${job?.name}: ${err.message}\n`);
  });

  return { goalWorker, cronWorker };
}

/**
 * Idempotently register the cron schedulers in the BullMQ instance.
 *
 * `upsertJobScheduler` is safe to call on every boot — duplicate
 * registrations no-op, so backend instances spinning up after a
 * deploy don't fight over scheduler state.
 *
 * Cadences:
 *   - `lockExpiredGoals` every minute: catches deadline crossings
 *     within ~60s for responsive UI updates.
 *   - `detectDisputes` every 5 minutes: dispute detection only
 *     becomes relevant 72h+1h after lock, so a tighter cadence
 *     wastes work.
 */
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

  process.stdout.write("[Jobs] cron schedulers upserted: lockExpiredGoals (1m), detectDisputes (5m)\n");
}

const argv1 = (process.argv[1] ?? "").replace(/\\/g, "/");
if (argv1.includes("/jobs/index")) {
  process.stdout.write("[Jobs] starting workers\n");

  startWorkers();
  scheduleCronJobs()
    .then(() => process.stdout.write("[Jobs] workers running\n"))
    .catch((err) => {
      process.stderr.write(`[Jobs] fatal: ${err}\n`);
      process.exit(1);
    });
}
