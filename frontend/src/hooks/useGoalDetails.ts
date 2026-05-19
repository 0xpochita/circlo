"use client";

import {
  createCircloClient,
  type GoalMetadata,
  parseGoalMetadata,
} from "circlo-sdk";
import { GoalStatus, Side, UNRESOLVED_SIDE } from "circlo-types";
import { useEffect, useMemo, useState } from "react";
import { usePublicClient } from "wagmi";

/**
 * The on-chain goal tuple, normalized into a struct + parsed metadata.
 * The contract returns 9 fields in a fixed-order tuple; we name them
 * here so consumers don't have to remember indices.
 */
export type GoalDetails = {
  circleId: bigint;
  creator: `0x${string}`;
  outcomeType: number;
  status: GoalStatus;
  deadline: bigint;
  minStake: bigint;
  totalPool: bigint;
  /** `UNRESOLVED_SIDE` (255) while the goal is open or unresolved. */
  winningSide: number;
  /** Raw metadataURI string from the contract. */
  metadataURI: string;
  /** Decoded metadata JSON, or null if it didn't parse. */
  metadata: GoalMetadata | null;
  /** Convenience flags derived from the fields above. */
  isResolved: boolean;
  isExpired: boolean;
};

/**
 * Read a goal's full state straight from PredictionPool. Re-runs when
 * `goalId` changes. Returns `null` while loading or when goalId is unset.
 *
 * Pair with `useResolverTally` for the vote-side; this hook covers the
 * money-side state.
 */
export function useGoalDetails(goalId: bigint | undefined) {
  const publicClient = usePublicClient();
  const [data, setData] = useState<GoalDetails | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const circlo = useMemo(
    () => createCircloClient({ publicClient }),
    [publicClient],
  );

  useEffect(() => {
    if (!publicClient || goalId === undefined) {
      setData(null);
      return;
    }
    let cancelled = false;
    setError(null);

    circlo
      .getGoal(goalId)
      .then((tuple) => {
        if (cancelled) return;
        const [
          circleId,
          creator,
          outcomeType,
          status,
          deadline,
          minStake,
          totalPool,
          winningSide,
          metadataURI,
        ] = tuple as unknown as readonly [
          bigint,
          `0x${string}`,
          number,
          number,
          bigint,
          bigint,
          bigint,
          number,
          string,
        ];

        const sNum = Number(status);
        const winSide = Number(winningSide);
        setData({
          circleId,
          creator,
          outcomeType: Number(outcomeType),
          status: sNum as GoalStatus,
          deadline,
          minStake,
          totalPool,
          winningSide: winSide,
          metadataURI,
          metadata: parseGoalMetadata(metadataURI),
          isResolved:
            sNum === GoalStatus.Resolved || sNum === GoalStatus.PaidOut,
          isExpired: deadline < BigInt(Math.floor(Date.now() / 1000)),
        });
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      });

    return () => {
      cancelled = true;
    };
  }, [publicClient, circlo, goalId]);

  return {
    data,
    error,
    isLoading: data === null && error === null && goalId !== undefined,
    /** Re-export the sentinel so consumers don't need a second import. */
    UNRESOLVED_SIDE,
    Side,
  };
}
