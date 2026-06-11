"use client";

import { createCircloClient } from "circlo-sdk";
import { useEffect, useMemo, useState } from "react";
import { usePublicClient } from "wagmi";

const BIGINT_ZERO = BigInt(0);
const BIGINT_ONE = BigInt(1);

/**
 * Reads the total count of circles + goals straight from the on-chain
 * `nextCircleId` / `nextGoalId` counters. Useful for landing-page
 * "total circles ever / total goals ever" stats — no indexer round-trip
 * needed.
 *
 * Returns `{ circles: bigint - 1, goals: bigint - 1 }` because the
 * nextId is one past the last assigned id; the visible total is one less.
 */
export function useChainStats() {
  const publicClient = usePublicClient();
  const [data, setData] = useState<{ circles: bigint; goals: bigint } | null>(
    null,
  );
  const [error, setError] = useState<Error | null>(null);

  const circlo = useMemo(
    () => createCircloClient({ publicClient }),
    [publicClient],
  );

  useEffect(() => {
    if (!publicClient) return;
    let cancelled = false;

    Promise.all([circlo.getCircleNextId(), circlo.getGoalNextId()])
      .then(([nextCircle, nextGoal]) => {
        if (cancelled) return;
        const circles = nextCircle > BIGINT_ZERO ? nextCircle - BIGINT_ONE : BIGINT_ZERO;
        const goals = nextGoal > BIGINT_ZERO ? nextGoal - BIGINT_ONE : BIGINT_ZERO;
        setData({ circles, goals });
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      });

    return () => {
      cancelled = true;
    };
  }, [publicClient, circlo]);

  return { data, error, isLoading: data === null && error === null };
}
