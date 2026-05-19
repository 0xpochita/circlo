import { publicActions } from "viem";
import { CIRCLO_CONTRACTS, PREDICTION_POOL_ABI, ERC20_MINIMAL_ABI, } from "circlo-types";
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
export async function stake(wallet, params, publicClientOverride) {
    if (!wallet.account) {
        throw new Error("stake: walletClient must be configured with an account");
    }
    const account = wallet.account;
    const reader = publicClientOverride ?? wallet.extend(publicActions);
    let approveHash;
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
                chain: wallet.chain,
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
        chain: wallet.chain,
    });
    await reader.waitForTransactionReceipt({ hash: stakeHash });
    return { stakeHash, approveHash };
}
/**
 * Read a user's stake on a given side of a goal.
 */
export async function getStakeOf(client, goalId, user, side) {
    return client.readContract({
        address: CIRCLO_CONTRACTS.PredictionPool,
        abi: PREDICTION_POOL_ABI,
        functionName: "stakeOf",
        args: [goalId, user, side],
    });
}
/**
 * Read the total pool on a given side of a goal.
 */
export async function getPoolPerSide(client, goalId, side) {
    return client.readContract({
        address: CIRCLO_CONTRACTS.PredictionPool,
        abi: PREDICTION_POOL_ABI,
        functionName: "poolPerSide",
        args: [goalId, side],
    });
}
//# sourceMappingURL=stakes.js.map