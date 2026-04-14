"use client";

import { useCallback, useState } from "react";
import { circlesApi } from "@/lib/api/endpoints";
import { circleFactoryContract } from "@/lib/web3/contracts";
import { useCircleStore } from "@/stores/circleStore";
import { useContract } from "./useContract";

export function useCreateCircle() {
  const { write, isLoading: isTxLoading, isSuccess, error, txHash } = useContract();
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
    [write]
  );

  const confirmCreation = useCallback(
    async (name: string, category: string, privacy: string, description?: string) => {
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
    []
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
    [write]
  );

  return { joinCircle, isLoading, isSuccess, error, txHash };
}

export function useFetchCircles() {
  const { setCircles, setLoading, setError } = useCircleStore();

  const fetchCircles = useCallback(
    async () => {
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
    },
    [setCircles, setLoading, setError]
  );

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
      setError(err instanceof Error ? err.message : "Failed to fetch circle details");
      return null;
    } finally {
      setLoading(false);
    }
  }, [circleId, setLoading, setError]);

  return { fetchDetails };
}
