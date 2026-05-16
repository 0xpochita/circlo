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
 * Watch GoalCreated events on the PredictionPool. Optionally filter by
 * circleId so you only get goals from one circle.
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
 * Watch Staked events. Optionally filter by goalId to only get stakes
 * on a specific goal.
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
