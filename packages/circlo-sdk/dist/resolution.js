import { CIRCLO_CONTRACTS, RESOLUTION_MODULE_ABI } from "circlo-types";
/**
 * Submit a vote on a locked goal. Caller must be a resolver on that goal,
 * as set by the `resolverList` argument at createGoal time.
 *
 * @param choice 0 = NO (Side.No), 1 = YES (Side.Yes).
 *
 * When the quorum threshold is reached, the contract auto-finalizes —
 * no separate `finalize` call is needed for the common case.
 */
export async function submitVote(wallet, goalId, choice) {
    if (!wallet.account) {
        throw new Error("submitVote: walletClient must be configured with an account");
    }
    return wallet.writeContract({
        address: CIRCLO_CONTRACTS.ResolutionModule,
        abi: RESOLUTION_MODULE_ABI,
        functionName: "submitVote",
        args: [goalId, choice],
        account: wallet.account,
        chain: wallet.chain,
    });
}
/**
 * Force-finalize a goal whose tally has reached quorum but the auto-
 * finalize path didn't trigger (e.g. partial vote with explicit close).
 * In normal flow, submitVote auto-finalizes when quorum is met, so this
 * is only needed for edge cases.
 */
export async function finalize(wallet, goalId) {
    if (!wallet.account) {
        throw new Error("finalize: walletClient must be configured with an account");
    }
    return wallet.writeContract({
        address: CIRCLO_CONTRACTS.ResolutionModule,
        abi: RESOLUTION_MODULE_ABI,
        functionName: "finalize",
        args: [goalId],
        account: wallet.account,
        chain: wallet.chain,
    });
}
/**
 * Read the current vote tally on a goal. Returns counts per choice
 * (index 0 = NO, index 1 = YES) and the total vote count.
 */
export async function getTally(client, goalId) {
    const result = await client.readContract({
        address: CIRCLO_CONTRACTS.ResolutionModule,
        abi: RESOLUTION_MODULE_ABI,
        functionName: "getTally",
        args: [goalId],
    });
    return { counts: result[0], total: result[1] };
}
//# sourceMappingURL=resolution.js.map