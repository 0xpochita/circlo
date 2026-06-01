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
 *
 * The contract requires `deadline > block.timestamp + 1 hour` — pad your
 * deadline with at least a 5-minute buffer above 1h to survive normal
 * block-timestamp drift between submission and inclusion.
 *
 * Defaults `outcomeType` to `Binary` (Yes/No) and `resolvers` to `[]`
 * (which makes the contract fall back to its default resolver policy).
 *
 * @throws `Error` if the walletClient has no account configured.
 * @throws `EventNotFoundError` if tx confirms without GoalCreated event.
 * @throws viem `ContractFunctionExecutionError` for on-chain reverts
 *   (`DeadlineTooSoon`, `NotCircleMember`, `NoResolvers`, etc).
 *
 * @example
 * ```ts
 * import { createGoal } from "circlo-sdk";
 * const now = Math.floor(Date.now() / 1000);
 * const { goalId } = await createGoal(wallet, {
 *   circleId: 1n,
 *   question: "Will I hit 10k steps today?",
 *   deadline: BigInt(now + 86400 + 300), // 24h + 5min buffer
 *   minStake: parseUnits("0.10", 6),
 * });
 * ```
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
 * Lock a goal after its deadline. Permissionless — anyone holding a
 * tiny bit of CELO for gas can poke the goal forward, so a stuck
 * resolver does not block the lifecycle.
 *
 * Transitions the goal from `Open` to `Locked` (or `Resolving` if the
 * contract auto-starts the vote). After lock:
 *
 * - `stake` reverts `GoalLocked` (no new positions)
 * - resolvers can call `submitVote` on the ResolutionModule
 *
 * Reverts `DeadlineNotReached` if `block.timestamp < goal.deadline`,
 * or `WrongStatus` if the goal is already past `Open`.
 *
 * @throws viem `ContractFunctionExecutionError` on revert.
 *
 * @example
 * ```ts
 * await lockGoal(wallet, goalId);
 * // resolvers can now call submitVote
 * ```
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
 * Read a single goal's on-chain tuple.
 *
 * Returned field order matches the `IPredictionPool.Goal` struct:
 * `[circleId, creator, outcomeType, status, deadline, minStake,
 *  totalPool, winningSide, metadataURI]`.
 *
 * Reverts `GoalNotFound` if `goalId` was never created. Use
 * `getGoalNextId` to enumerate the valid range without probing.
 *
 * `winningSide` is `UNRESOLVED` (255) until the goal reaches
 * `PaidOut`; treat it as nullable in your UI until then.
 *
 * @param client viem PublicClient pointed at the right chain.
 * @param goalId The goal's onchain id.
 * @returns Raw struct tuple — wrap with your own typed accessor.
 *
 * @example
 * ```ts
 * const g = await getGoal(client, 123n);
 * const [circleId, , outcomeType, status, deadline] = g;
 * ```
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
 *
 * Equals `(total goals ever created) + 1`. Indexers use this to bound
 * a fresh backfill range — sweep `[0n, nextGoalId)` for `Goal` reads
 * + `GoalCreated` event matchups without scanning blocks-by-block.
 *
 * Goal ids are stable and never recycled across upgrades.
 *
 * @param client viem PublicClient pointed at the right chain.
 * @returns The next-to-be-assigned goalId (also = total ever + 1).
 *
 * @example
 * ```ts
 * const next = await getGoalNextId(client);
 * for (let id = 0n; id < next; id++) {
 *   const g = await getGoal(client, id);
 * }
 * ```
 */
export async function getGoalNextId(client: PublicClient): Promise<bigint> {
  return client.readContract({
    address: CIRCLO_CONTRACTS.PredictionPool,
    abi: PREDICTION_POOL_ABI,
    functionName: "nextGoalId",
  });
}
