"use client";

import { useCallback, useEffect, useState } from "react";
import { circlesApi } from "@/lib/api/endpoints";
import { toAvatar } from "@/lib/utils";
import { circleFactoryContract } from "@/lib/web3/contracts";
import { useCircleStore } from "@/stores/circleStore";
import { useDataCache } from "@/stores/dataCache";
import type { UserAvatar } from "@/types";
import { useContract } from "./useContract";

export type CircleWithCount = {
  id: string;
  chainId: string;
  name: string;
  description: string;
  category: string;
  privacy: string;
  memberCount: number;
  avatar: UserAvatar;
  avatarEmoji: string | null;
  avatarColor: string | null;
};

async function fetchCirclesData(): Promise<CircleWithCount[]> {
  const res = await circlesApi.list();
  const items = res.items || [];
  return Promise.all(
    items.map(async (c) => {
      let count = c.memberCount ?? 0;
      if (!count) {
        try {
          const m = await circlesApi.members(c.id);
          count = m.items?.length ?? 1;
        } catch {
          count = 1;
        }
      }
      return {
        id: c.id,
        chainId: c.chainId || "",
        name: c.name || "Circle",
        description: c.description || "",
        category: c.category || "general",
        privacy: c.privacy || "public",
        memberCount: count,
        avatar: toAvatar(c.avatarEmoji, c.avatarColor),
        avatarEmoji: c.avatarEmoji,
        avatarColor: c.avatarColor,
      };
    }),
  );
}

/**
 * Read the list of circles the authenticated user belongs to.
 *
 * Backed by the dataCache store — re-mounts during in-app navigation
 * return cached data immediately while a stale check decides whether
 * to refetch in the background. `isLoading` is `true` only on the
 * cold-start render (no cached data yet), so consumers can show a
 * skeleton without blocking the cached items from rendering.
 *
 * @returns `{ circles, isLoading }` — `circles` is the cached list
 *   plus enriched display fields (`memberCount`, `avatar`).
 */
export function useMyCircles() {
  const cached = useDataCache((s) => s.myCircles);
  const isStale = useDataCache((s) => s.isStale);
  const setMyCircles = useDataCache((s) => s.setMyCircles);
  const hasCached = cached.length > 0;
  const [isLoading, setIsLoading] = useState(!hasCached);

  useEffect(() => {
    if (!isStale("myCircles") && hasCached) return;

    fetchCirclesData()
      .then((data) => {
        setMyCircles(data);
      })
      .catch(() => {
        if (!hasCached) setMyCircles([]);
      })
      .finally(() => setIsLoading(false));
  }, [hasCached, isStale, setMyCircles]);

  return { circles: cached, isLoading };
}

/**
 * Two-step circle creation hook: on-chain `createCircle()` then
 * backend `circlesApi.create()` to record the human-readable name,
 * category, and avatar.
 *
 * The split is intentional — chain tx is broadcast first via `write`,
 * and the backend record is created via `confirmCreation` only after
 * the user has signed (and ideally confirmed). This keeps the backend
 * from holding orphan records when the wallet popup is dismissed.
 *
 * `isLoading` is `true` while either step is in flight.
 */
export function useCreateCircle() {
  const {
    write,
    isLoading: isTxLoading,
    isSuccess,
    error,
    txHash,
  } = useContract();
  const [isApiLoading, setIsApiLoading] = useState(false);

  const createCircle = useCallback(
    async (params: {
      name: string;
      description: string;
      category: string;
      privacy: string;
    }) => {
      write({
        address: circleFactoryContract.address,
        abi: circleFactoryContract.abi,
        functionName: "createCircle",
        args: [params.name],
      });
    },
    [write],
  );

  const confirmCreation = useCallback(
    async (
      name: string,
      category: string,
      privacy: string,
      description?: string,
    ) => {
      setIsApiLoading(true);
      try {
        return await circlesApi.create({
          name,
          category,
          privacy,
          description,
        });
      } finally {
        setIsApiLoading(false);
      }
    },
    [],
  );

  return {
    createCircle,
    confirmCreation,
    isLoading: isTxLoading || isApiLoading,
    isSuccess,
    error,
    txHash,
  };
}

/**
 * Fire a `joinCircle(circleId)` write to the CircleFactory.
 *
 * Reverts on-chain with `CircleIsPrivate` if the circle is invite-only
 * (use the EIP-712 inviteProof flow for those — see
 * `lib/web3/inviteProof.ts`). Reverts `AlreadyMember` if the caller
 * already joined; the UI should hide the join button in that case via
 * `useCircleInfo` + an `isCircleMember` probe.
 *
 * Returns the standard write hook tuple.
 */
export function useJoinCircle() {
  const { write, isLoading, isSuccess, error, txHash } = useContract();

  const joinCircle = useCallback(
    (circleAddress: string) => {
      write({
        address: circleFactoryContract.address,
        abi: circleFactoryContract.abi,
        functionName: "joinCircle",
        args: [circleAddress],
      });
    },
    [write],
  );

  return { joinCircle, isLoading, isSuccess, error, txHash };
}

export function useFetchCircles() {
  const { setCircles, setLoading, setError } = useCircleStore();

  const fetchCircles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await circlesApi.list();
      setCircles(res.items as unknown as Parameters<typeof setCircles>[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch circles");
    } finally {
      setLoading(false);
    }
  }, [setCircles, setLoading, setError]);

  return { fetchCircles };
}

export function useFetchCircleDetails(circleId: string) {
  const { setLoading, setError } = useCircleStore();

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [membersRes, goalsRes] = await Promise.all([
        circlesApi.members(circleId),
        circlesApi.goals(circleId),
      ]);
      return { members: membersRes.items, goals: goalsRes.items };
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch circle details",
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [circleId, setLoading, setError]);

  return { fetchDetails };
}
