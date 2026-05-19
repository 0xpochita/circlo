"use client";

import {
  type CircleInfo,
  type CircleMetadata,
  createCircloClient,
  parseCircleMetadata,
} from "circlo-sdk";
import { useEffect, useMemo, useState } from "react";
import { usePublicClient } from "wagmi";

export type EnrichedCircleInfo = CircleInfo & {
  /** Decoded `metadataURI` JSON, or null if the payload didn't parse. */
  metadata: CircleMetadata | null;
};

/**
 * Read on-chain info for a single circle (owner, privacy, createdAt) plus
 * the decoded metadata in one go. Refetches when `circleId` changes.
 *
 * Returns `null` while loading or when the circleId is unset. Use this
 * for circle detail views that need the canonical onchain state rather
 * than the backend-indexed copy.
 */
export function useCircleInfo(circleId: bigint | undefined) {
  const publicClient = usePublicClient();
  const [data, setData] = useState<EnrichedCircleInfo | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const circlo = useMemo(
    () => createCircloClient({ publicClient }),
    [publicClient],
  );

  useEffect(() => {
    if (!publicClient || circleId === undefined) {
      setData(null);
      return;
    }
    let cancelled = false;
    setError(null);

    circlo
      .getCircleInfo(circleId)
      .then((info) => {
        if (cancelled) return;
        setData({
          ...info,
          metadata: parseCircleMetadata(info.metadataURI),
        });
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      });

    return () => {
      cancelled = true;
    };
  }, [publicClient, circlo, circleId]);

  return {
    data,
    error,
    isLoading: data === null && error === null && circleId !== undefined,
  };
}
