import type { Address, Hash, WalletClient, PublicClient, Account, Chain } from "viem";
import { decodeEventLog, publicActions } from "viem";
import {
  CIRCLO_CONTRACTS,
  PREDICTION_POOL_ABI,
  OutcomeType,
} from "circlo-types";
import { buildGoalMetadata } from "./metadata.js";
import { EventNotFoundError } from "./errors.js";

export type CreateGoalParams = {
  /** Circle this goal lives in. Caller must be a member. */
  circleId: bigint;
  /** Question text shown on the goal card ("Will it rain today?"). */
  question: string;
  /** Optional longer description. */
  description?: string;
  /** Optional category tag ("crypto", "weather", "fitness", etc). */
  category?: string;
  /** Optional emoji shown alongside the goal. */
  emoji?: string;
  /**
   * Outcome model. `Binary` = yes/no with single winner; other values
   * are reserved for future use (multi-option, scalar, etc).
   */
  outcomeType?: OutcomeType;
  /** Unix timestamp (seconds) after which staking closes. */
  deadline: bigint;
  /** Minimum stake amount in USDT base units (6 decimals). */
  minStake: bigint;
  /**
   * Addresses allowed to vote on resolution. If empty, the circle's
   * default resolver list applies (contract decides).
   */
  resolvers?: Address[];
  /** Free-form extra metadata merged into the metadataURI JSON. */
  extra?: Record<string, unknown>;
};

export type CreateGoalResult = {
  hash: Hash;
  goalId: bigint;
  metadataURI: string;
};

/**
 * Creates a goal on the PredictionPool contract. Waits for confirmation
 * and parses the GoalCreated event to return the new goalId.
 */
export async function createGoal(
  wallet: WalletClient,
  params: CreateGoalParams,
  publicClientOverride?: PublicClient,
): Promise<CreateGoalResult> {
  if (!wallet.account) {
    throw new Error("createGoal: walletClient must be configured with an account");
  }

  const metadataURI = buildGoalMetadata(params);

  const hash = await wallet.writeContract({
    address: CIRCLO_CONTRACTS.PredictionPool,
    abi: PREDICTION_POOL_ABI,
    functionName: "createGoal",
    args: [
      params.circleId,
      params.outcomeType ?? OutcomeType.Binary,
      params.deadline,
      params.minStake,
      params.resolvers ?? [],
      metadataURI,
    ],
    account: wallet.account as Account,
    chain: wallet.chain as Chain,
  });

  const reader = publicClientOverride ?? (wallet.extend(publicActions) as unknown as PublicClient);
  const receipt = await reader.waitForTransactionReceipt({ hash });

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== CIRCLO_CONTRACTS.PredictionPool.toLowerCase()) {
      continue;
    }
    try {
      const decoded = decodeEventLog({
        abi: PREDICTION_POOL_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "GoalCreated") {
        return {
          hash,
          goalId: decoded.args.id,
          metadataURI,
        };
      }
    } catch {
      // Not a PredictionPool event — skip.
    }
  }

  throw new EventNotFoundError("GoalCreated", hash);
}

/**
 * Lock a goal after its deadline. Anyone can call this — it transitions
 * the goal to the resolution phase so resolvers can vote.
 */
export async function lockGoal(
  wallet: WalletClient,
  goalId: bigint,
): Promise<Hash> {
  if (!wallet.account) {
    throw new Error("lockGoal: walletClient must be configured with an account");
  }
  return wallet.writeContract({
    address: CIRCLO_CONTRACTS.PredictionPool,
    abi: PREDICTION_POOL_ABI,
    functionName: "lockGoal",
    args: [goalId],
    account: wallet.account as Account,
    chain: wallet.chain as Chain,
  });
}

/**
 * Read a single goal tuple. Field order matches the contract:
 * [circleId, creator, outcomeType, status, deadline, minStake, totalPool, winningSide, metadataURI]
 */
export async function getGoal(
  client: PublicClient,
  goalId: bigint,
) {
  return client.readContract({
    address: CIRCLO_CONTRACTS.PredictionPool,
    abi: PREDICTION_POOL_ABI,
    functionName: "goals",
    args: [goalId],
  });
}

/**
 * Read the id that will be assigned to the next goal created.
 * Equals `(total goals ever created) + 1` — useful for indexers
 * and dashboards that want to know how many goals exist.
 */
export async function getGoalNextId(client: PublicClient): Promise<bigint> {
  return client.readContract({
    address: CIRCLO_CONTRACTS.PredictionPool,
    abi: PREDICTION_POOL_ABI,
    functionName: "nextGoalId",
  });
}
