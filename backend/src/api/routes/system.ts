import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { celoClient } from "../../lib/viem.js";
import { config } from "../../config.js";

export default async function systemRoutes(app: FastifyInstance) {
  app.get("/health", async (_req, reply) => {
    const checks = {
      db: false,
      redis: false,
      chain: false,
    };

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.db = true;
    } catch {}

    try {
      const pong = await redis.ping();
      checks.redis = pong === "PONG";
    } catch {}

    try {
      const blockNumber = await celoClient.getBlockNumber();
      checks.chain = blockNumber > 0n;
    } catch {}

    let indexerLastBlock: string | null = null;
    try {
      const state = await prisma.indexerState.findFirst({
        orderBy: { updated_at: "desc" },
      });
      indexerLastBlock = state?.last_block?.toString() ?? null;
    } catch {}

    const healthy = checks.db && checks.redis;
    const status = healthy ? "ok" : "degraded";

    return reply.status(healthy ? 200 : 503).send({
      status,
      checks,
      indexer: { lastBlock: indexerLastBlock },
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/v1/config", async (_req, reply) => {
    return reply.send({
      minStake: "1.000000",
      categories: ["general", "crypto", "fitness", "gaming", "music", "other"],
      contractAddresses: {
        circleFactory: config.contractCircleFactory,
        predictionPool: config.contractPredictionPool,
        resolutionModule: config.contractResolutionModule,
        usdt: config.contractUsdt,
      },
      celoChainId: config.celoChainId,
      celoChainIdTestnet: config.celoChainIdTestnet,
    });
  });
}
