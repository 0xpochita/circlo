import type { Address, Hash, WalletClient, PublicClient } from "viem";
import { Side } from "circlo-types";
export type StakeParams = {
    /** Goal to stake on. */
    goalId: bigint;
    /** Which side of the binary outcome to back. */
    side: Side;
    /** Stake amount in USDT base units (6 decimals — 1 USDT = 1_000_000n). */
    amount: bigint;
    /**
     * If true, the SDK will call `approve` on USDT for `amount` before
     * staking, but only if the current allowance is below the amount.
     * Default: true. Set false if you've already approved separately.
     */
    autoApprove?: boolean;
};
export type StakeResult = {
    /** Hash of the stake() tx. */
    stakeHash: Hash;
    /**
     * Hash of the approve() tx, if one was needed. Undefined if existing
     * allowance was already sufficient or autoApprove was false.
     */
    approveHash?: Hash;
};
/**
 * Stake USDT on a goal. By default, checks the current USDT allowance
 * against the PredictionPool and submits an `approve` tx first if
 * needed. Two txs are sent sequentially (approve, then stake) — both
 * are awaited before returning.
 *
 * The approve tx grants 1000 USDT of headroom (not just `amount`) so
 * subsequent stakes by the same wallet skip the approve step.
 *
 * @returns `{ stakeHash, approveHash? }`. `approveHash` is undefined
 *   when existing allowance was already sufficient OR when
 *   `autoApprove` was set to `false`.
 *
 * @throws `Error` if the walletClient has no account configured.
 * @throws viem `ContractFunctionExecutionError` if either tx reverts.
 *
 * @example
 * ```ts
 * import { stake, Side } from "circlo-sdk";
 * import { parseUnits } from "viem";
 *
 * await stake(wallet, {
 *   goalId: 117n,
 *   side: Side.Yes,
 *   amount: parseUnits("1", 6), // 1 USDT, 6-decimal precision
 * });
 * ```
 */
export declare function stake(wallet: WalletClient, params: StakeParams, publicClientOverride?: PublicClient): Promise<StakeResult>;
/**
 * Read a user's stake on a given side of a goal.
 */
export declare function getStakeOf(client: PublicClient, goalId: bigint, user: Address, side: Side): Promise<bigint>;
/**
 * Read the total pool on a given side of a goal.
 */
export declare function getPoolPerSide(client: PublicClient, goalId: bigint, side: Side): Promise<bigint>;
//# sourceMappingURL=stakes.d.ts.map