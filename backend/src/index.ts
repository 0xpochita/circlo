import "dotenv/config";
import { buildServer } from "./api/server.js";
import { config } from "./config.js";
import { prisma } from "./lib/prisma.js";
import { redis } from "./lib/redis.js";
import { startWorkers, scheduleCronJobs } from "./jobs/index.js";
import { startIndexer } from "./indexer/index.js";

/**
 * Backend process bootstrap.
 *
 * Boot sequence is intentionally serial — each step depends on the
 * previous one being healthy:
 *   1. Prisma connect (DB schema available)
 *   2. Redis ping (cache / pubsub available)
 *   3. BullMQ workers + cron schedules (job queue alive)
 *   4. Indexer (catches up on missed events, then streams)
 *   5. Fastify HTTP server (accepts API traffic)
 *
 * The indexer is fire-and-forget via `.catch(...)` — if it crashes,
 * the API stays up and the orchestrator restarts the whole process.
 * This favors API availability over event freshness during outages.
 *
 * `SIGINT` / `SIGTERM` trigger graceful shutdown: stop accepting
 * connections → drain pending → close DB + Redis. Forced-kill
 * (SIGKILL) skips this and risks half-applied batches; the indexer
 * cursor's at-least-once delivery covers that.
 */
async function main() {
  console.log(`[Server] Starting Circlo backend (${config.nodeEnv})...`);

  await prisma.$connect();
  console.log("[Server] PostgreSQL connected");

  await redis.ping();
  console.log("[Server] Redis connected");

  startWorkers();
  await scheduleCronJobs();
  console.log("[Server] Background workers started");

  startIndexer().catch((err) => console.error("[Indexer] Fatal:", err));

  const app = await buildServer();

  await app.listen({ port: config.port, host: "0.0.0.0" });
  console.log(`[Server] Listening on http://0.0.0.0:${config.port}`);

  const shutdown = async (signal: string) => {
    console.log(`[Server] ${signal} received — shutting down...`);
    await app.close();
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[Server] Fatal error:", err);
  process.exit(1);
});
