import type { Hash, WalletClient, Account, Chain } from "viem";
import { CIRCLO_CONTRACTS, PREDICTION_POOL_ABI } from "circlo-types";

/**
 * Trigger the permissionless `settlement()` heartbeat on
 * PredictionPool. Emits `Settlement(block.timestamp)` and returns
 * the tx hash.
 *
 * No access control, no state mutation, no value transfer — gas only.
 * Useful as an "I'm alive" beacon for off-chain indexers, dashboards,
 * or any consumer that watches the Settlement event for activity
 * signals without spending USDT.
 *
 * @throws `Error` if the walletClient has no account configured.
 * @throws viem `ContractFunctionExecutionError` if gas estimation or
 *   the tx itself reverts (would only happen on RPC issues — the
 *   function itself is unconditional).
 *
 * @example
 * ```ts
 * import { settlement } from "circlo-sdk";
 *
 * const hash = await settlement(wallet);
 * await publicClient.waitForTransactionReceipt({ hash });
 * ```
 */
export async function settlement(wallet: WalletClient): Promise<Hash> {
  if (!wallet.account) {
    throw new Error("settlement: walletClient must be configured with an account");
  }
  return wallet.writeContract({
    address: CIRCLO_CONTRACTS.PredictionPool,
    abi: PREDICTION_POOL_ABI,
    functionName: "settlement",
    args: [],
    account: wallet.account as Account,
    chain: wallet.chain as Chain,
  });
}
