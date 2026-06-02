import type { PublicClient, AbiEvent } from "viem";
import {
  CIRCLO_CONTRACTS,
  CIRCLE_FACTORY_ABI,
  PREDICTION_POOL_ABI,
} from "circlo-types";

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
export function watchCircleCreated(
  client: PublicClient,
  onEvent: (args: {
    id: bigint;
    owner: `0x${string}`;
    isPrivate: boolean;
    metadataURI: string;
  }) => void,
): () => void {
  const event = CIRCLE_FACTORY_ABI.find(
    (x): x is Extract<typeof x, { type: "event"; name: "CircleCreated" }> =>
      x.type === "event" && x.name === "CircleCreated",
  );
  if (!event) {
    throw new Error("watchCircleCreated: CircleCreated event missing from ABI");
  }

  return client.watchEvent({
    address: CIRCLO_CONTRACTS.CircleFactory,
    event: event as AbiEvent,
    onLogs: (logs) => {
      for (const log of logs) {
        const args = (log as { args: unknown }).args as {
          id: bigint;
          owner: `0x${string}`;
          isPrivate: boolean;
          metadataURI: string;
        };
        onEvent(args);
      }
    },
  });
}

/**
 * Watch `GoalCreated` events on the PredictionPool. Returns the
 * unsubscribe function from viem's `watchContractEvent` — call it
 * to stop the underlying poll loop.
 *
 * The `filter.circleId` option uses the contract's indexed-topic
 * filter so the RPC only ships matching logs back — much cheaper
 * than client-side filtering when watching a high-activity chain.
 *
 * @param filter Optional indexed-topic filter (currently `circleId`).
 *
 * @example
 * ```ts
 * // listen for goals on circle #42 only
 * const unsub = watchGoalCreated(client, ({ id, deadline }) => {
 *   console.log(`goal #${id} live until ${deadline}`);
 * }, { circleId: 42n });
 * // ...
 * unsub();
 * ```
 */
export function watchGoalCreated(
  client: PublicClient,
  onEvent: (args: {
    id: bigint;
    circleId: bigint;
    creator: `0x${string}`;
    outcomeType: number;
    deadline: bigint;
    minStake: bigint;
    resolverList: readonly `0x${string}`[];
    metadataURI: string;
  }) => void,
  filter?: { circleId?: bigint },
): () => void {
  const event = PREDICTION_POOL_ABI.find(
    (x): x is Extract<typeof x, { type: "event"; name: "GoalCreated" }> =>
      x.type === "event" && x.name === "GoalCreated",
  );
  if (!event) {
    throw new Error("watchGoalCreated: GoalCreated event missing from ABI");
  }

  return client.watchEvent({
    address: CIRCLO_CONTRACTS.PredictionPool,
    event: event as AbiEvent,
    args: filter?.circleId !== undefined ? { circleId: filter.circleId } : undefined,
    onLogs: (logs) => {
      for (const log of logs) {
        const args = (log as { args: unknown }).args as {
          id: bigint;
          circleId: bigint;
          creator: `0x${string}`;
          outcomeType: number;
          deadline: bigint;
          minStake: bigint;
          resolverList: readonly `0x${string}`[];
          metadataURI: string;
        };
        onEvent(args);
      }
    },
  });
}

/**
 * Watch Settlement heartbeat events. Fires once per `settlement()`
 * call with the on-chain `block.timestamp`. Useful for liveness
 * dashboards and "last activity" indicators.
 *
 * @example
 * ```ts
 * const unsub = watchSettlement(client, ({ timestamp }) => {
 *   console.log(`heartbeat at ${new Date(Number(timestamp) * 1000)}`);
 * });
 * ```
 */
export function watchSettlement(
  client: PublicClient,
  onEvent: (args: { timestamp: bigint }) => void,
): () => void {
  const event = PREDICTION_POOL_ABI.find(
    (x): x is Extract<typeof x, { type: "event"; name: "Settlement" }> =>
      x.type === "event" && x.name === "Settlement",
  );
  if (!event) {
    throw new Error("watchSettlement: Settlement event missing from ABI");
  }

  return client.watchEvent({
    address: CIRCLO_CONTRACTS.PredictionPool,
    event: event as AbiEvent,
    onLogs: (logs) => {
      for (const log of logs) {
        const args = (log as { args: unknown }).args as { timestamp: bigint };
        onEvent(args);
      }
    },
  });
}

/**
 * Watch `Staked` events on the PredictionPool. Fires once per stake
 * call — staking multiple times on the same goal/side yields
 * multiple events (the contract emits per-call, not per-position).
 *
 * The `filter.goalId` option pushes the filter down to the RPC via
 * the indexed topic, so high-traffic chains don't send irrelevant
 * logs to the client.
 *
 * @param filter Optional indexed-topic filter (currently `goalId`).
 *
 * @example
 * ```ts
 * // tail every stake on goal #117 for a live leaderboard
 * const unsub = watchStaked(client, ({ user, side, amount }) => {
 *   leaderboard.add(user, side, amount);
 * }, { goalId: 117n });
 * ```
 */
export function watchStaked(
  client: PublicClient,
  onEvent: (args: {
    goalId: bigint;
    user: `0x${string}`;
    side: number;
    amount: bigint;
  }) => void,
  filter?: { goalId?: bigint },
): () => void {
  const event = PREDICTION_POOL_ABI.find(
    (x): x is Extract<typeof x, { type: "event"; name: "Staked" }> =>
      x.type === "event" && x.name === "Staked",
  );
  if (!event) {
    throw new Error("watchStaked: Staked event missing from ABI");
  }

  return client.watchEvent({
    address: CIRCLO_CONTRACTS.PredictionPool,
    event: event as AbiEvent,
    args: filter?.goalId !== undefined ? { goalId: filter.goalId } : undefined,
    onLogs: (logs) => {
      for (const log of logs) {
        const args = (log as { args: unknown }).args as {
          goalId: bigint;
          user: `0x${string}`;
          side: number;
          amount: bigint;
        };
        onEvent(args);
      }
    },
  });
}
