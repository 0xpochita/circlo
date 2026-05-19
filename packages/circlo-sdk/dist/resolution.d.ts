import type { Hash, WalletClient, PublicClient } from "viem";
/**
 * Submit a vote on a locked goal. Caller must be a resolver on that goal,
 * as set by the `resolverList` argument at createGoal time.
 *
 * @param choice 0 = NO (Side.No), 1 = YES (Side.Yes).
 *
 * When the quorum threshold is reached, the contract auto-finalizes —
 * no separate `finalize` call is needed for the common case.
 */
export declare function submitVote(wallet: WalletClient, goalId: bigint, choice: 0 | 1): Promise<Hash>;
/**
 * Force-finalize a goal whose tally has reached quorum but the auto-
 * finalize path didn't trigger (e.g. partial vote with explicit close).
 * In normal flow, submitVote auto-finalizes when quorum is met, so this
 * is only needed for edge cases.
 */
export declare function finalize(wallet: WalletClient, goalId: bigint): Promise<Hash>;
/**
 * Read the current vote tally on a goal. Returns counts per choice
 * (index 0 = NO, index 1 = YES) and the total vote count.
 */
export declare function getTally(client: PublicClient, goalId: bigint): Promise<{
    counts: readonly bigint[];
    total: bigint;
}>;
//# sourceMappingURL=resolution.d.ts.map