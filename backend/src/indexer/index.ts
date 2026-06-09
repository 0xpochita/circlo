import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";
import { createIndexerClient } from "./client.js";
import {
  CIRCLE_FACTORY_ABI,
  handleCircleCreated,
  handleCircleJoined,
  handleCircleLeft,
} from "./handlers/circleFactory.js";
import {
  PREDICTION_POOL_ABI,
  handleGoalCreated,
  handleStaked,
  handleVoteSubmitted,
  handleGoalLocked,
  handleGoalResolved,
  handleGoalRefunded,
  handleClaimed,
} from "./handlers/predictionPool.js";

const CIRCLE_FACTORY = config.contractCircleFactory as `0x${string}`;
const PREDICTION_POOL = config.contractPredictionPool as `0x${string}`;
const RESOLUTION_MODULE = config.contractResolutionModule as `0x${string}`;

/**
 * Block range pulled in a single `getLogs` call during backfill.
 *
 * 1000 blocks (~16 min on Celo at 1s block time) is the sweet spot
 * for Forno — large enough to keep round-trips low, small enough to
 * stay under the public RPC's response size cap. Bumping this
 * higher trips occasional `query returned more than 10000 results`
 * errors during high-activity windows.
 */
const BATCH_SIZE = 1000n;

const RESOLUTION_MODULE_ABI = [
  {
    type: "event",
    name: "VoteSubmitted",
    inputs: [
      { name: "goalId", type: "uint256", indexed: true },
      { name: "resolver", type: "address", indexed: true },
      { name: "choice", type: "uint8", indexed: false },
    ],
  },
] as const;

/**
 * Read the highest block this contract's indexer has fully processed.
 *
 * Falls back to `config.indexerStartBlock` on first-ever run — the
 * deployment block of the contract. Setting `INDEXER_START_BLOCK`
 * higher than the actual deploy block fast-forwards past historical
 * events (useful for fresh local DBs that don't need backfill).
 */
async function getLastBlock(contract: string): Promise<bigint> {
  const state = await prisma.indexerState.findUnique({ where: { contract } });
  return state?.last_block ?? config.indexerStartBlock;
}

/**
 * Persist the indexer's cursor for a contract.
 *
 * Called after every successful batch. If the process crashes
 * between batches, the next boot resumes from the last persisted
 * cursor — at-least-once delivery for events. All handlers are
 * idempotent (chain_id uniqueness, upserts) so double-processing
 * the boundary batch on resume is safe.
 */
async function setLastBlock(contract: string, block: bigint): Promise<void> {
  await prisma.indexerState.upsert({
    where: { contract },
    create: { contract, last_block: block },
    update: { last_block: block },
  });
}

/**
 * Walk every CircleFactory event in `[fromBlock, toBlock]` and
 * dispatch to the matching handler.
 *
 * Per-batch persistence (`setLastBlock` after each chunk) means a
 * crash mid-backfill resumes from the last completed chunk, not
 * from scratch. Handler errors are logged but do NOT abort the
 * backfill — losing one event to a Prisma constraint shouldn't
 * stall the indexer for hours.
 */
async function backfillCircleFactory(client: any, fromBlock: bigint, toBlock: bigint): Promise<void> {
  let current = fromBlock;
  while (current <= toBlock) {
    const end = current + BATCH_SIZE - 1n < toBlock ? current + BATCH_SIZE - 1n : toBlock;
    console.log(`[CircleFactory Backfill] Fetching logs ${current}–${end}`);

    const logs: any[] = await client.getLogs({
      address: CIRCLE_FACTORY,
      events: CIRCLE_FACTORY_ABI,
      fromBlock: current,
      toBlock: end,
    });

    for (const log of logs) {
      try {
        if (log.eventName === "CircleCreated") {
          await handleCircleCreated(log.args as { id: bigint; owner: string; isPrivate: boolean; metadataURI: string });
        } else if (log.eventName === "CircleJoined") {
          await handleCircleJoined(log.args as { id: bigint; member: string });
        } else if (log.eventName === "CircleLeft") {
          await handleCircleLeft(log.args as { id: bigint; member: string });
        }
      } catch (err) {
        console.error("[CircleFactory Backfill] Handler error:", err);
      }
    }

    await setLastBlock(CIRCLE_FACTORY, end);
    current = end + 1n;
  }
}

async function backfillResolutionModule(client: any, fromBlock: bigint, toBlock: bigint): Promise<void> {
  let current = fromBlock;
  while (current <= toBlock) {
    const end = current + BATCH_SIZE - 1n < toBlock ? current + BATCH_SIZE - 1n : toBlock;
    console.log(`[ResolutionModule Backfill] Fetching logs ${current}–${end}`);

    const logs: any[] = await client.getLogs({
      address: RESOLUTION_MODULE,
      events: RESOLUTION_MODULE_ABI,
      fromBlock: current,
      toBlock: end,
    });

    for (const log of logs) {
      try {
        if (log.eventName === "VoteSubmitted") {
          await handleVoteSubmitted(log.args as { goalId: bigint; resolver: string; choice: number });
        }
      } catch (err) {
        console.error("[ResolutionModule Backfill] Handler error:", err);
      }
    }

    await setLastBlock(RESOLUTION_MODULE, end);
    current = end + 1n;
  }
}

async function backfillPredictionPool(client: any, fromBlock: bigint, toBlock: bigint): Promise<void> {
  let current = fromBlock;
  while (current <= toBlock) {
    const end = current + BATCH_SIZE - 1n < toBlock ? current + BATCH_SIZE - 1n : toBlock;
    console.log(`[PredictionPool Backfill] Fetching logs ${current}–${end}`);

    const logs: any[] = await client.getLogs({
      address: PREDICTION_POOL,
      events: PREDICTION_POOL_ABI,
      fromBlock: current,
      toBlock: end,
    });

    for (const log of logs) {
      const txHash = (log.transactionHash ?? "") as string;
      try {
        if (log.eventName === "GoalCreated") {
          await handleGoalCreated(log.args as { id: bigint; circleId: bigint; creator: string; outcomeType: number; deadline: bigint; minStake: bigint; resolvers: readonly string[]; metadataURI: string }, txHash);
        } else if (log.eventName === "Staked") {
          await handleStaked(log.args as { goalId: bigint; user: string; side: number; amount: bigint }, txHash);
        } else if (log.eventName === "GoalLocked") {
          await handleGoalLocked(log.args as { goalId: bigint }, txHash);
        } else if (log.eventName === "GoalResolved") {
          await handleGoalResolved(log.args as { goalId: bigint; winningSide: number }, txHash);
        } else if (log.eventName === "GoalRefunded") {
          await handleGoalRefunded(log.args as { goalId: bigint }, txHash);
        } else if (log.eventName === "Claimed") {
          await handleClaimed(log.args as { goalId: bigint; user: string; amount: bigint });
        }
      } catch (err) {
        console.error("[PredictionPool Backfill] Handler error:", err);
      }
    }

    await setLastBlock(PREDICTION_POOL, end);
    current = end + 1n;
  }
}

const REALTIME_POLL_MS = 6_000;

async function pollOnce(client: any): Promise<void> {
  let latest: bigint;
  try {
    latest = await client.getBlockNumber();
  } catch (err) {
    console.error("[Indexer] getBlockNumber error:", (err as Error).message);
    return;
  }

  const [cf, pp, rm] = await Promise.all([
    getLastBlock(CIRCLE_FACTORY),
    getLastBlock(PREDICTION_POOL),
    getLastBlock(RESOLUTION_MODULE),
  ]);

  await Promise.all([
    cf < latest
      ? backfillCircleFactory(client, cf + 1n, latest).catch((err) =>
          console.error("[CircleFactory] poll error:", (err as Error).message),
        )
      : Promise.resolve(),
    pp < latest
      ? backfillPredictionPool(client, pp + 1n, latest).catch((err) =>
          console.error("[PredictionPool] poll error:", (err as Error).message),
        )
      : Promise.resolve(),
    rm < latest
      ? backfillResolutionModule(client, rm + 1n, latest).catch((err) =>
          console.error("[ResolutionModule] poll error:", (err as Error).message),
        )
      : Promise.resolve(),
  ]);
}

function startRealtimePolling(client: any): void {
  console.log(`[Indexer] Realtime polling every ${REALTIME_POLL_MS}ms`);
  let running = false;
  setInterval(async () => {
    if (running) return; // skip overlap
    running = true;
    try {
      await pollOnce(client);
    } finally {
      running = false;
    }
  }, REALTIME_POLL_MS);
}

export async function startIndexer() {
  console.log("[Indexer] Starting...");

  const indexerClient = createIndexerClient(false);
  const httpClient = indexerClient.getClient();

  const currentBlock: bigint = await httpClient.getBlockNumber();
  console.log(`[Indexer] Current block: ${currentBlock}`);

  const [cfLastBlock, ppLastBlock, rmLastBlock] = await Promise.all([
    getLastBlock(CIRCLE_FACTORY),
    getLastBlock(PREDICTION_POOL),
    getLastBlock(RESOLUTION_MODULE),
  ]);

  // Backfill in parallel, then start realtime polling once each backfill finishes.
  // Handlers are idempotent so overlap is safe.
  const backfills: Promise<void>[] = [];
  if (cfLastBlock < currentBlock) {
    console.log(`[Indexer] Backfilling CircleFactory from ${cfLastBlock} to ${currentBlock}`);
    backfills.push(backfillCircleFactory(httpClient, cfLastBlock, currentBlock));
  }
  if (ppLastBlock < currentBlock) {
    console.log(`[Indexer] Backfilling PredictionPool from ${ppLastBlock} to ${currentBlock}`);
    backfills.push(backfillPredictionPool(httpClient, ppLastBlock, currentBlock));
  }
  if (rmLastBlock < currentBlock) {
    console.log(`[Indexer] Backfilling ResolutionModule from ${rmLastBlock} to ${currentBlock}`);
    backfills.push(backfillResolutionModule(httpClient, rmLastBlock, currentBlock));
  }

  // Wait for backfills, then start realtime polling. Backfill+realtime overlap
  // would duplicate work since both call getLogs over the same range.
  Promise.all(backfills)
    .then(() => {
      console.log("[Indexer] All backfills completed");
      startRealtimePolling(httpClient);
    })
    .catch((err) => {
      console.error("[Indexer] Backfill error:", err);
      // Still start realtime polling so we don't get stuck on backfill failure.
      startRealtimePolling(httpClient);
    });

  console.log("[Indexer] Running. Press Ctrl+C to stop.");

  process.on("SIGINT", () => {
    console.log("[Indexer] Shutting down...");
    indexerClient.destroy();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    indexerClient.destroy();
    process.exit(0);
  });
}

const argv1 = (process.argv[1] ?? "").replace(/\\/g, "/");
if (argv1.includes("/indexer/index")) {
  startIndexer().catch((err) => {
    console.error("[Indexer] Fatal error:", err);
    process.exit(1);
  });
}
