import { CIRCLO_CONTRACTS, CIRCLE_FACTORY_ABI, PREDICTION_POOL_ABI, } from "circlo-types";
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
export function watchCircleCreated(client, onEvent) {
    const event = CIRCLE_FACTORY_ABI.find((x) => x.type === "event" && x.name === "CircleCreated");
    if (!event) {
        throw new Error("watchCircleCreated: CircleCreated event missing from ABI");
    }
    return client.watchEvent({
        address: CIRCLO_CONTRACTS.CircleFactory,
        event: event,
        onLogs: (logs) => {
            for (const log of logs) {
                const args = log.args;
                onEvent(args);
            }
        },
    });
}
/**
 * Watch GoalCreated events on the PredictionPool. Optionally filter by
 * circleId so you only get goals from one circle.
 */
export function watchGoalCreated(client, onEvent, filter) {
    const event = PREDICTION_POOL_ABI.find((x) => x.type === "event" && x.name === "GoalCreated");
    if (!event) {
        throw new Error("watchGoalCreated: GoalCreated event missing from ABI");
    }
    return client.watchEvent({
        address: CIRCLO_CONTRACTS.PredictionPool,
        event: event,
        args: filter?.circleId !== undefined ? { circleId: filter.circleId } : undefined,
        onLogs: (logs) => {
            for (const log of logs) {
                const args = log.args;
                onEvent(args);
            }
        },
    });
}
/**
 * Watch Staked events. Optionally filter by goalId to only get stakes
 * on a specific goal.
 */
export function watchStaked(client, onEvent, filter) {
    const event = PREDICTION_POOL_ABI.find((x) => x.type === "event" && x.name === "Staked");
    if (!event) {
        throw new Error("watchStaked: Staked event missing from ABI");
    }
    return client.watchEvent({
        address: CIRCLO_CONTRACTS.PredictionPool,
        event: event,
        args: filter?.goalId !== undefined ? { goalId: filter.goalId } : undefined,
        onLogs: (logs) => {
            for (const log of logs) {
                const args = log.args;
                onEvent(args);
            }
        },
    });
}
//# sourceMappingURL=events.js.map