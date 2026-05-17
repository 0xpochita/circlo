"use client";

import { createCircloClient } from "circlo-sdk";
import { useEffect, useMemo, useState } from "react";
import { usePublicClient } from "wagmi";

export type ResolverTally = {
  /** Vote count per side. `counts[0]` = NO, `counts[1]` = YES. */
  counts: readonly bigint[];
  /** Total votes submitted so far. */
  total: bigint;
  /** Convenience: votes on the NO side (alias of counts[0]). */
  noVotes: bigint;
  /** Convenience: votes on the YES side (alias of counts[1]). */
  yesVotes: bigint;
};

/**
 * Read the current resolver vote tally for a goal + optionally poll for
 * updates. Pass `pollIntervalMs` to keep the tally fresh — useful for a
 * live vote-progress widget. Default is one-shot read (no poll).
 *
 * For event-driven updates instead of polling, subscribe to the SDK's
 * `watchStaked` / a future `watchVoteSubmitted` and trigger a refetch
 * — this hook intentionally stays small.
 */
export function useResolverTally(
  goalId: bigint | undefined,
  options: { pollIntervalMs?: number } = {},
) {
  const publicClient = usePublicClient();
  const [data, setData] = useState<ResolverTally | null>(null);
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

    async function fetchTally() {
      try {
        if (goalId === undefined) return;
        const { counts, total } = await circlo.getTally(goalId);
        if (cancelled) return;
        setData({
          counts,
          total,
          noVotes: counts[0] ?? BigInt(0),
          yesVotes: counts[1] ?? BigInt(0),
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      }
    }

    fetchTally();

    if (options.pollIntervalMs && options.pollIntervalMs >= 1000) {
      const id = setInterval(fetchTally, options.pollIntervalMs);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [publicClient, circlo, goalId, options.pollIntervalMs]);

  return {
    data,
    error,
    isLoading: data === null && error === null && goalId !== undefined,
  };
}
