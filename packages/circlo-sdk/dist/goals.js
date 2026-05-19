import { decodeEventLog, publicActions } from "viem";
import { CIRCLO_CONTRACTS, PREDICTION_POOL_ABI, OutcomeType, } from "circlo-types";
import { buildGoalMetadata } from "./metadata.js";
import { EventNotFoundError } from "./errors.js";
/**
 * Creates a goal on the PredictionPool contract. Waits for confirmation
 * and parses the GoalCreated event to return the new goalId.
 *
 * The contract requires `deadline > block.timestamp + 1 hour` — pad your
 * deadline with at least a 5-minute buffer above 1h to survive normal
 * block-timestamp drift between submission and inclusion.
 *
 * Defaults `outcomeType` to `Binary` (Yes/No) and `resolvers` to `[]`
 * (which makes the contract fall back to its default resolver policy).
 *
 * @throws `Error` if the walletClient has no account configured.
 * @throws `EventNotFoundError` if tx confirms without GoalCreated event.
 * @throws viem `ContractFunctionExecutionError` for on-chain reverts
 *   (`DeadlineTooSoon`, `NotCircleMember`, `NoResolvers`, etc).
 *
 * @example
 * ```ts
 * import { createGoal } from "circlo-sdk";
 * const now = Math.floor(Date.now() / 1000);
 * const { goalId } = await createGoal(wallet, {
 *   circleId: 1n,
 *   question: "Will I hit 10k steps today?",
 *   deadline: BigInt(now + 86400 + 300), // 24h + 5min buffer
 *   minStake: parseUnits("0.10", 6),
 * });
 * ```
 */
export async function createGoal(wallet, params, publicClientOverride) {
    if (!wallet.account) {
        throw new Error("createGoal: walletClient must be configured with an account");
    }
    const metadataURI = buildGoalMetadata(params);
    const hash = await wallet.writeContract({
        address: CIRCLO_CONTRACTS.PredictionPool,
        abi: PREDICTION_POOL_ABI,
        functionName: "createGoal",
        args: [
            params.circleId,
            params.outcomeType ?? OutcomeType.Binary,
            params.deadline,
            params.minStake,
            params.resolvers ?? [],
            metadataURI,
        ],
        account: wallet.account,
        chain: wallet.chain,
    });
    const reader = publicClientOverride ?? wallet.extend(publicActions);
    const receipt = await reader.waitForTransactionReceipt({ hash });
    for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== CIRCLO_CONTRACTS.PredictionPool.toLowerCase()) {
            continue;
        }
        try {
            const decoded = decodeEventLog({
                abi: PREDICTION_POOL_ABI,
                data: log.data,
                topics: log.topics,
            });
            if (decoded.eventName === "GoalCreated") {
                return {
                    hash,
                    goalId: decoded.args.id,
                    metadataURI,
                };
            }
        }
        catch {
            // Not a PredictionPool event — skip.
        }
    }
    throw new EventNotFoundError("GoalCreated", hash);
}
/**
 * Lock a goal after its deadline. Anyone can call this — it transitions
 * the goal to the resolution phase so resolvers can vote.
 */
export async function lockGoal(wallet, goalId) {
    if (!wallet.account) {
        throw new Error("lockGoal: walletClient must be configured with an account");
    }
    return wallet.writeContract({
        address: CIRCLO_CONTRACTS.PredictionPool,
        abi: PREDICTION_POOL_ABI,
        functionName: "lockGoal",
        args: [goalId],
        account: wallet.account,
        chain: wallet.chain,
    });
}
/**
 * Read a single goal tuple. Field order matches the contract:
 * [circleId, creator, outcomeType, status, deadline, minStake, totalPool, winningSide, metadataURI]
 */
export async function getGoal(client, goalId) {
    return client.readContract({
        address: CIRCLO_CONTRACTS.PredictionPool,
        abi: PREDICTION_POOL_ABI,
        functionName: "goals",
        args: [goalId],
    });
}
/**
 * Read the id that will be assigned to the next goal created.
 * Equals `(total goals ever created) + 1` — useful for indexers
 * and dashboards that want to know how many goals exist.
 */
export async function getGoalNextId(client) {
    return client.readContract({
        address: CIRCLO_CONTRACTS.PredictionPool,
        abi: PREDICTION_POOL_ABI,
        functionName: "nextGoalId",
    });
}
//# sourceMappingURL=goals.js.map