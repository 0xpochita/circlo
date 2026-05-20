import type { Address, Hash, WalletClient, PublicClient, Account, Chain } from "viem";
import { publicActions } from "viem";
import {
  CIRCLO_CONTRACTS,
  PREDICTION_POOL_ABI,
  ERC20_MINIMAL_ABI,
  Side,
} from "circlo-types";

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
export async function stake(
  wallet: WalletClient,
  params: StakeParams,
  publicClientOverride?: PublicClient,
): Promise<StakeResult> {
  if (!wallet.account) {
    throw new Error("stake: walletClient must be configured with an account");
  }
  const account = wallet.account as Account;
  const reader = publicClientOverride ?? (wallet.extend(publicActions) as unknown as PublicClient);

  let approveHash: Hash | undefined;
  if (params.autoApprove !== false) {
    const allowance = await reader.readContract({
      address: CIRCLO_CONTRACTS.USDT,
      abi: ERC20_MINIMAL_ABI,
      functionName: "allowance",
      args: [account.address, CIRCLO_CONTRACTS.PredictionPool],
    });

    if (allowance < params.amount) {
      approveHash = await wallet.writeContract({
        address: CIRCLO_CONTRACTS.USDT,
        abi: ERC20_MINIMAL_ABI,
        functionName: "approve",
        args: [CIRCLO_CONTRACTS.PredictionPool, params.amount],
        account,
        chain: wallet.chain as Chain,
      });
      await reader.waitForTransactionReceipt({ hash: approveHash });
    }
  }

  const stakeHash = await wallet.writeContract({
    address: CIRCLO_CONTRACTS.PredictionPool,
    abi: PREDICTION_POOL_ABI,
    functionName: "stake",
    args: [params.goalId, params.side, params.amount],
    account,
    chain: wallet.chain as Chain,
  });
  await reader.waitForTransactionReceipt({ hash: stakeHash });

  return { stakeHash, approveHash };
}

/**
 * Read how much USDT a given user has staked on a given side of a
 * goal. Returns the amount in USDT base units (6-decimal, so
 * 1_500_000n = 1.5 USDT). Returns 0n if the user never staked on
 * that side.
 *
 * Useful for rendering "your position" UI and for figuring out which
 * side a user is eligible to claim from after a goal resolves on Celo.
 *
 * @example
 * ```ts
 * import { getStakeOf, Side } from "circlo-sdk";
 *
 * const myYesStake = await getStakeOf(client, 117n, "0xabc...", Side.Yes);
 * if (myYesStake > 0n) {
 *   // user staked on YES — eligible to claim if YES wins
 * }
 * ```
 */
export async function getStakeOf(
  client: PublicClient,
  goalId: bigint,
  user: Address,
  side: Side,
): Promise<bigint> {
  return client.readContract({
    address: CIRCLO_CONTRACTS.PredictionPool,
    abi: PREDICTION_POOL_ABI,
    functionName: "stakeOf",
    args: [goalId, user, side],
  });
}

/**
 * Read the total pool size on one side of a goal, in USDT base units
 * (6-decimal). Combined with the opposing side's pool, this is the
 * primitive for live odds and payout-projection math:
 *
 *     impliedProb(yes) = yesPool / (yesPool + noPool)
 *     payout(yesWin, myStake) = myStake + myStake * noPool / yesPool
 *
 * Both calls in parallel via `Promise.all` is the common pattern.
 */
export async function getPoolPerSide(
  client: PublicClient,
  goalId: bigint,
  side: Side,
): Promise<bigint> {
  return client.readContract({
    address: CIRCLO_CONTRACTS.PredictionPool,
    abi: PREDICTION_POOL_ABI,
    functionName: "poolPerSide",
    args: [goalId, side],
  });
}
