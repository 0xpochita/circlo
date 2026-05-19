import type { Address, Hash, WalletClient, PublicClient } from "viem";
import { OutcomeType } from "circlo-types";
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
export declare function createGoal(wallet: WalletClient, params: CreateGoalParams, publicClientOverride?: PublicClient): Promise<CreateGoalResult>;
/**
 * Lock a goal after its deadline. Anyone can call this — it transitions
 * the goal to the resolution phase so resolvers can vote.
 */
export declare function lockGoal(wallet: WalletClient, goalId: bigint): Promise<Hash>;
/**
 * Read a single goal tuple. Field order matches the contract:
 * [circleId, creator, outcomeType, status, deadline, minStake, totalPool, winningSide, metadataURI]
 */
export declare function getGoal(client: PublicClient, goalId: bigint): Promise<readonly [bigint, creator: `0x${string}`, number, status: number, deadline: bigint, bigint, bigint, number, metadataURI: string]>;
/**
 * Read the id that will be assigned to the next goal created.
 * Equals `(total goals ever created) + 1` — useful for indexers
 * and dashboards that want to know how many goals exist.
 */
export declare function getGoalNextId(client: PublicClient): Promise<bigint>;
//# sourceMappingURL=goals.d.ts.map