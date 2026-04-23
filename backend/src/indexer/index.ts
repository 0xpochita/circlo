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

const BATCH_SIZE = 1000n;

async function getLastBlock(contract: string): Promise<bigint> {
  const state = await prisma.indexerState.findUnique({ where: { contract } });
  return state?.last_block ?? config.indexerStartBlock;
}

async function setLastBlock(contract: string, block: bigint): Promise<void> {
  await prisma.indexerState.upsert({
    where: { contract },
    create: { contract, last_block: block },
    update: { last_block: block },
  });
}

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
      try {
        if (log.eventName === "GoalCreated") {
          await handleGoalCreated(log.args as { id: bigint; circleId: bigint; creator: string; deadline: bigint; minStake: bigint });
        } else if (log.eventName === "Staked") {
          await handleStaked(log.args as { goalId: bigint; user: string; side: number; amount: bigint });
        } else if (log.eventName === "VoteSubmitted") {
          await handleVoteSubmitted(log.args as { goalId: bigint; resolver: string; choice: number });
        } else if (log.eventName === "GoalLocked") {
          await handleGoalLocked(log.args as { goalId: bigint });
        } else if (log.eventName === "GoalResolved") {
          await handleGoalResolved(log.args as { goalId: bigint; winningSide: number });
        } else if (log.eventName === "GoalRefunded") {
          await handleGoalRefunded(log.args as { goalId: bigint });
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

function isSocketError(err: Error): boolean {
  const name = err.name ?? "";
  const msg = (err.message ?? "").toLowerCase();
  return (
    name === "SocketClosedError" ||
    msg.includes("socket has been closed") ||
    msg.includes("socket") ||
    msg.includes("websocket")
  );
}

function onWatcherError(
  label: string,
  indexerClient: ReturnType<typeof createIndexerClient>
) {
  return (err: Error) => {
    console.error(`[${label}] Watcher error:`, err.message);
    if (isSocketError(err)) {
      indexerClient.triggerReconnect(5000);
    }
  };
}

async function registerWatchers(
  indexerClient: ReturnType<typeof createIndexerClient>
): Promise<void> {
  const client = indexerClient.getClient();

  client.watchContractEvent({
    address: CIRCLE_FACTORY,
    abi: CIRCLE_FACTORY_ABI,
    eventName: "CircleCreated",
    onLogs: async (logs: any[]) => {
      for (const log of logs) {
        try {
          await handleCircleCreated(log.args as { id: bigint; owner: string; isPrivate: boolean; metadataURI: string });
          if (log.blockNumber) await setLastBlock(CIRCLE_FACTORY, log.blockNumber);
        } catch (err) { console.error("[CircleFactory] CircleCreated error:", err); }
      }
    },
    onError: onWatcherError("CircleFactory", indexerClient),
  });

  client.watchContractEvent({
    address: CIRCLE_FACTORY,
    abi: CIRCLE_FACTORY_ABI,
    eventName: "CircleJoined",
    onLogs: async (logs: any[]) => {
      for (const log of logs) {
        try {
          await handleCircleJoined(log.args as { id: bigint; member: string });
          if (log.blockNumber) await setLastBlock(CIRCLE_FACTORY, log.blockNumber);
        } catch (err) { console.error("[CircleFactory] CircleJoined error:", err); }
      }
    },
    onError: onWatcherError("CircleFactory", indexerClient),
  });

  client.watchContractEvent({
    address: CIRCLE_FACTORY,
    abi: CIRCLE_FACTORY_ABI,
    eventName: "CircleLeft",
    onLogs: async (logs: any[]) => {
      for (const log of logs) {
        try {
          await handleCircleLeft(log.args as { id: bigint; member: string });
          if (log.blockNumber) await setLastBlock(CIRCLE_FACTORY, log.blockNumber);
        } catch (err) { console.error("[CircleFactory] CircleLeft error:", err); }
      }
    },
    onError: onWatcherError("CircleFactory", indexerClient),
  });

  client.watchContractEvent({
    address: PREDICTION_POOL,
    abi: PREDICTION_POOL_ABI,
    eventName: "GoalCreated",
    onLogs: async (logs: any[]) => {
      for (const log of logs) {
        try {
          await handleGoalCreated(log.args as { id: bigint; circleId: bigint; creator: string; deadline: bigint; minStake: bigint });
          if (log.blockNumber) await setLastBlock(PREDICTION_POOL, log.blockNumber);
        } catch (err) { console.error("[PredictionPool] GoalCreated error:", err); }
      }
    },
    onError: onWatcherError("PredictionPool", indexerClient),
  });

  client.watchContractEvent({
    address: PREDICTION_POOL,
    abi: PREDICTION_POOL_ABI,
    eventName: "Staked",
    onLogs: async (logs: any[]) => {
      for (const log of logs) {
        try {
          await handleStaked(log.args as { goalId: bigint; user: string; side: number; amount: bigint });
          if (log.blockNumber) await setLastBlock(PREDICTION_POOL, log.blockNumber);
        } catch (err) { console.error("[PredictionPool] Staked error:", err); }
      }
    },
    onError: onWatcherError("PredictionPool", indexerClient),
  });

  client.watchContractEvent({
    address: PREDICTION_POOL,
    abi: PREDICTION_POOL_ABI,
    eventName: "VoteSubmitted",
    onLogs: async (logs: any[]) => {
      for (const log of logs) {
        try {
          await handleVoteSubmitted(log.args as { goalId: bigint; resolver: string; choice: number });
          if (log.blockNumber) await setLastBlock(PREDICTION_POOL, log.blockNumber);
        } catch (err) { console.error("[PredictionPool] VoteSubmitted error:", err); }
      }
    },
    onError: onWatcherError("PredictionPool", indexerClient),
  });

  client.watchContractEvent({
    address: PREDICTION_POOL,
    abi: PREDICTION_POOL_ABI,
    eventName: "GoalLocked",
    onLogs: async (logs: any[]) => {
      for (const log of logs) {
        try {
          await handleGoalLocked(log.args as { goalId: bigint });
          if (log.blockNumber) await setLastBlock(PREDICTION_POOL, log.blockNumber);
        } catch (err) { console.error("[PredictionPool] GoalLocked error:", err); }
      }
    },
    onError: onWatcherError("PredictionPool", indexerClient),
  });

  client.watchContractEvent({
    address: PREDICTION_POOL,
    abi: PREDICTION_POOL_ABI,
    eventName: "GoalResolved",
    onLogs: async (logs: any[]) => {
      for (const log of logs) {
        try {
          await handleGoalResolved(log.args as { goalId: bigint; winningSide: number });
          if (log.blockNumber) await setLastBlock(PREDICTION_POOL, log.blockNumber);
        } catch (err) { console.error("[PredictionPool] GoalResolved error:", err); }
      }
    },
    onError: onWatcherError("PredictionPool", indexerClient),
  });

  client.watchContractEvent({
    address: PREDICTION_POOL,
    abi: PREDICTION_POOL_ABI,
    eventName: "GoalRefunded",
    onLogs: async (logs: any[]) => {
      for (const log of logs) {
        try {
          await handleGoalRefunded(log.args as { goalId: bigint });
          if (log.blockNumber) await setLastBlock(PREDICTION_POOL, log.blockNumber);
        } catch (err) { console.error("[PredictionPool] GoalRefunded error:", err); }
      }
    },
    onError: onWatcherError("PredictionPool", indexerClient),
  });

  client.watchContractEvent({
    address: PREDICTION_POOL,
    abi: PREDICTION_POOL_ABI,
    eventName: "Claimed",
    onLogs: async (logs: any[]) => {
      for (const log of logs) {
        try {
          await handleClaimed(log.args as { goalId: bigint; user: string; amount: bigint });
          if (log.blockNumber) await setLastBlock(PREDICTION_POOL, log.blockNumber);
        } catch (err) { console.error("[PredictionPool] Claimed error:", err); }
      }
    },
    onError: onWatcherError("PredictionPool", indexerClient),
  });

  console.log("[Indexer] All watchers registered");
}

export async function startIndexer() {
  console.log("[Indexer] Starting...");

  const indexerClient = createIndexerClient(false);

  indexerClient.onReconnect(async () => {
    await registerWatchers(indexerClient);
  });

  const httpClient = indexerClient.getClient();

  const currentBlock: bigint = await httpClient.getBlockNumber();
  console.log(`[Indexer] Current block: ${currentBlock}`);

  const [cfLastBlock, ppLastBlock] = await Promise.all([
    getLastBlock(CIRCLE_FACTORY),
    getLastBlock(PREDICTION_POOL),
  ]);

  if (cfLastBlock < currentBlock) {
    console.log(`[Indexer] Backfilling CircleFactory from ${cfLastBlock} to ${currentBlock}`);
    await backfillCircleFactory(httpClient, cfLastBlock, currentBlock);
  }

  if (ppLastBlock < currentBlock) {
    console.log(`[Indexer] Backfilling PredictionPool from ${ppLastBlock} to ${currentBlock}`);
    await backfillPredictionPool(httpClient, ppLastBlock, currentBlock);
  }

  await registerWatchers(indexerClient);

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
