import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { celoClient } from "../../lib/viem.js";
import { config } from "../../config.js";

/**
 * Public system routes: liveness probe + frontend boot config.
 *
 * Mounted without an auth gate — both endpoints are deliberately
 * unauthenticated so deployment health checkers and the frontend's
 * pre-login bundle can read them.
 */
export default async function systemRoutes(app: FastifyInstance) {
  /**
   * `GET /health` — composite health check.
   *
   * Returns 200 when DB + Redis are reachable, 503 otherwise. Chain
   * connectivity and indexer lag are reported but do NOT downgrade
   * the status — a transient RPC blip shouldn't take the API down
   * with it.
   */
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

  /**
   * `GET /api/v1/config` — frontend boot config.
   *
   * Returns the contract addresses + chain ids the SPA needs before
   * the user is authenticated, plus the canonical category list
   * shown in the create-circle form. `minStake` is the dollar-formatted
   * USDT minimum used as a placeholder in the create-goal UI.
   *
   * Adding a field here means coordinating with the frontend's
   * `useBootConfig` hook — the response shape is part of the
   * unwritten API contract.
   */
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
