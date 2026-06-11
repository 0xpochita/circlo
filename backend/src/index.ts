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
  process.stdout.write(`[Server] starting Circlo backend (${config.nodeEnv})\n`);

  await prisma.$connect();
  process.stdout.write("[Server] PostgreSQL connected\n");

  await redis.ping();
  process.stdout.write("[Server] Redis connected\n");

  startWorkers();
  await scheduleCronJobs();
  process.stdout.write("[Server] background workers started\n");

  startIndexer().catch((err) => process.stderr.write(`[Indexer] fatal: ${err}\n`));

  const app = await buildServer();

  await app.listen({ port: config.port, host: "0.0.0.0" });
  process.stdout.write(`[Server] listening on http://0.0.0.0:${config.port}\n`);

  const shutdown = async (signal: string) => {
    process.stdout.write(`[Server] ${signal} received — shutting down\n`);
    await app.close();
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  process.stderr.write(`[Server] fatal: ${err}\n`);
  process.exit(1);
});
