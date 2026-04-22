import "dotenv/config";
import { buildServer } from "./api/server.js";
import { config } from "./config.js";
import { prisma } from "./lib/prisma.js";
import { redis } from "./lib/redis.js";
import { startWorkers, scheduleCronJobs } from "./jobs/index.js";
import { startIndexer } from "./indexer/index.js";

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
