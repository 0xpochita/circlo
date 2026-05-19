import type { Hash, WalletClient } from "viem";
/**
 * Claim a winning payout from a resolved goal. The caller must have
 * staked on the winning side. Reverts if the goal is not yet resolved
 * or if the caller has nothing to claim.
 *
 * Returns the raw tx hash — callers can wait on the receipt themselves
 * if they need to confirm the USDT transfer landed.
 *
 * @throws `Error` if the walletClient has no account configured.
 * @throws viem `ContractFunctionExecutionError` with one of:
 *   - `NotResolved` — goal still in Open / Locked / Resolving status
 *   - `NothingToClaim` — caller staked on the losing side, or already claimed
 */
export declare function claim(wallet: WalletClient, goalId: bigint): Promise<Hash>;
/**
 * Refund a stake when a goal was cancelled or could not be resolved.
 * Returns the original stake to the caller (no payout).
 */
export declare function refund(wallet: WalletClient, goalId: bigint): Promise<Hash>;
//# sourceMappingURL=claims.d.ts.map