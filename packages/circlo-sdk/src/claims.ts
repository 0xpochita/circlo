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
 * @throws `Error` if the walletClient has no account configured.
 * @throws viem `ContractFunctionExecutionError` with one of:
 *   - `NotResolved` — goal still in Open / Locked / Resolving status
 *   - `NothingToClaim` — caller staked on the losing side, or already claimed
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
 * Refund a stake when a goal was cancelled or could not be resolved.
 * Returns the original stake to the caller (no payout).
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
