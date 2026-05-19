import type { PublicClient } from "viem";
/**
 * Watch CircleCreated events. Returns the unsubscribe function from
 * viem's `watchContractEvent` — call it to stop polling.
 *
 * @example
 * ```ts
 * const unsub = watchCircleCreated(client, ({ id, owner }) => {
 *   console.log(`new circle #${id} by ${owner}`);
 * });
 * ```
 */
export declare function watchCircleCreated(client: PublicClient, onEvent: (args: {
    id: bigint;
    owner: `0x${string}`;
    isPrivate: boolean;
    metadataURI: string;
}) => void): () => void;
/**
 * Watch GoalCreated events on the PredictionPool. Optionally filter by
 * circleId so you only get goals from one circle.
 */
export declare function watchGoalCreated(client: PublicClient, onEvent: (args: {
    id: bigint;
    circleId: bigint;
    creator: `0x${string}`;
    outcomeType: number;
    deadline: bigint;
    minStake: bigint;
    resolverList: readonly `0x${string}`[];
    metadataURI: string;
}) => void, filter?: {
    circleId?: bigint;
}): () => void;
/**
 * Watch Staked events. Optionally filter by goalId to only get stakes
 * on a specific goal.
 */
export declare function watchStaked(client: PublicClient, onEvent: (args: {
    goalId: bigint;
    user: `0x${string}`;
    side: number;
    amount: bigint;
}) => void, filter?: {
    goalId?: bigint;
}): () => void;
//# sourceMappingURL=events.d.ts.map