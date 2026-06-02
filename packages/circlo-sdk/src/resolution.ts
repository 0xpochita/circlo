import type { Hash, WalletClient, PublicClient, Account, Chain } from "viem";
import { CIRCLO_CONTRACTS, RESOLUTION_MODULE_ABI } from "circlo-types";

/**
 * Submit a vote on a locked goal. Caller must be a resolver on that
 * goal, as set by the `resolverList` argument at `createGoal` time.
 *
 * @param choice 0 = NO (Side.No), 1 = YES (Side.Yes).
 *
 * When the quorum threshold is reached, the contract auto-finalizes —
 * no separate `finalize` call is needed for the common case. A tied
 * tally transitions the goal to `Disputed` instead of `PaidOut`;
 * stakers then call `refund` to reclaim principal.
 *
 * @throws viem `ContractFunctionExecutionError` with one of:
 *   - `NotResolver` — caller is not on `goal.resolverList`
 *   - `WrongStatus` — goal is not in `Locked` / `Resolving`
 *   - `AlreadyVoted` — caller already submitted a vote
 *   - `VoteWindowExpired` — vote window past (Disputed if no quorum)
 *
 * @example
 * ```ts
 * import { submitVote, Side } from "circlo-sdk";
 *
 * await submitVote(resolverWallet, 117n, Side.Yes);
 * // quorum auto-finalizes the goal to PaidOut(YES)
 * ```
 */
export async function submitVote(
  wallet: WalletClient,
  goalId: bigint,
  choice: 0 | 1,
): Promise<Hash> {
  if (!wallet.account) {
    throw new Error("submitVote: walletClient must be configured with an account");
  }
  return wallet.writeContract({
    address: CIRCLO_CONTRACTS.ResolutionModule,
    abi: RESOLUTION_MODULE_ABI,
    functionName: "submitVote",
    args: [goalId, choice],
    account: wallet.account as Account,
    chain: wallet.chain as Chain,
  });
}

/**
 * Force-finalize a goal whose tally has reached quorum but the
 * auto-finalize path didn't trigger.
 *
 * In normal flow, the final `submitVote` that crosses the quorum
 * threshold auto-finalizes the goal via the `setWinner` callback
 * into `PredictionPool`. This helper exists for two edge cases:
 *
 * - **Partial vote with explicit close** — quorum met but the
 *   resolver chose not to fire the auto-finalize on their tx.
 * - **Vote window expired with majority** — vote window past
 *   deadline but a clear majority exists.
 *
 * Permissionless: anyone with gas can call this once the tally
 * supports a decision. Reverts `NotFinalizable` if the tally is
 * tied or no quorum was reached.
 *
 * @throws viem `ContractFunctionExecutionError` on revert.
 *
 * @example
 * ```ts
 * await finalize(wallet, 117n);
 * // goal now PaidOut, stakers can claim
 * ```
 */
export async function finalize(
  wallet: WalletClient,
  goalId: bigint,
): Promise<Hash> {
  if (!wallet.account) {
    throw new Error("finalize: walletClient must be configured with an account");
  }
  return wallet.writeContract({
    address: CIRCLO_CONTRACTS.ResolutionModule,
    abi: RESOLUTION_MODULE_ABI,
    functionName: "finalize",
    args: [goalId],
    account: wallet.account as Account,
    chain: wallet.chain as Chain,
  });
}

/**
 * Read the current vote tally on a goal. Returns counts per choice
 * (index 0 = NO, index 1 = YES) and the total vote count.
 */
export async function getTally(
  client: PublicClient,
  goalId: bigint,
): Promise<{ counts: readonly bigint[]; total: bigint }> {
  const result = await client.readContract({
    address: CIRCLO_CONTRACTS.ResolutionModule,
    abi: RESOLUTION_MODULE_ABI,
    functionName: "getTally",
    args: [goalId],
  });
  return { counts: result[0], total: result[1] };
}
