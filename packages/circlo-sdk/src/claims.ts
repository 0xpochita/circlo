import type { Hash, WalletClient, Account, Chain } from "viem";
import { CIRCLO_CONTRACTS, PREDICTION_POOL_ABI } from "circlo-types";

/**
 * Claim a winning payout from a resolved goal. The caller must have
 * staked on the winning side. Reverts if the goal is not yet resolved
 * or if the caller has nothing to claim.
 *
 * Returns the raw tx hash — callers can wait on the receipt themselves
 * if they need to confirm the USDT transfer landed.
 *
 * Payout formula (pre-fee):
 *
 *     payout = winnerStake + winnerStake * losersPool / winnersPool
 *
 * The protocol fee (default 0–10%) is deducted before transfer. Pair
 * with `getPoolPerSide` to project a payout before claiming.
 *
 * @throws `Error` if the walletClient has no account configured.
 * @throws viem `ContractFunctionExecutionError` with one of:
 *   - `NotResolved` — goal still in Open / Locked / Resolving status
 *   - `NothingToClaim` — caller staked on the losing side, or already claimed
 *
 * @example
 * ```ts
 * import { claim } from "circlo-sdk";
 *
 * const hash = await claim(wallet, 117n);
 * await publicClient.waitForTransactionReceipt({ hash });
 * // USDT now in wallet.account.address
 * ```
 */
export async function claim(
  wallet: WalletClient,
  goalId: bigint,
): Promise<Hash> {
  if (!wallet.account) {
    throw new Error("claim: walletClient must be configured with an account");
  }
  return wallet.writeContract({
    address: CIRCLO_CONTRACTS.PredictionPool,
    abi: PREDICTION_POOL_ABI,
    functionName: "claim",
    args: [goalId],
    account: wallet.account as Account,
    chain: wallet.chain as Chain,
  });
}

/**
 * Refund the caller's original stake when a goal entered the
 * Disputed status (resolver vote tied) or was otherwise marked
 * non-resolvable on Celo. Anyone who staked can call this — payout
 * is exactly the principal, no share of the opposing pool.
 *
 * Returns the raw tx hash — callers can wait on the receipt
 * themselves if they need to confirm the USDT transfer landed.
 *
 * @throws `Error` if the walletClient has no account configured.
 * @throws viem `ContractFunctionExecutionError` with one of:
 *   - `NotRefundable` — goal is not in a refundable state
 *     (still Open / Locked / Resolving / PaidOut)
 *   - `NothingToRefund` — caller never staked, or already refunded
 *
 * @example
 * ```ts
 * import { refund } from "circlo-sdk";
 *
 * const hash = await refund(wallet, 117n);
 * await publicClient.waitForTransactionReceipt({ hash });
 * ```
 */
export async function refund(
  wallet: WalletClient,
  goalId: bigint,
): Promise<Hash> {
  if (!wallet.account) {
    throw new Error("refund: walletClient must be configured with an account");
  }
  return wallet.writeContract({
    address: CIRCLO_CONTRACTS.PredictionPool,
    abi: PREDICTION_POOL_ABI,
    functionName: "refund",
    args: [goalId],
    account: wallet.account as Account,
    chain: wallet.chain as Chain,
  });
}
