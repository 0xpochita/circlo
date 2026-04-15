"use client";

import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { goalsApi } from "@/lib/api/endpoints";
import {
  mockUSDTContract,
  predictionPoolContract,
  resolutionModuleContract,
} from "@/lib/web3/contracts";
import { toUSDT } from "@/lib/web3/usdt";
import { useContract } from "./useContract";
import { useUSDTAllowance } from "./useUSDT";

export function useCreateGoal() {
  const {
    write,
    isLoading: isTxLoading,
    isSuccess,
    error,
    txHash,
  } = useContract();
  const [isApiLoading, setIsApiLoading] = useState(false);

  const createGoal = useCallback(
    (params: {
      circleAddress: string;
      title: string;
      deadline: bigint;
      stakeAmount: bigint;
    }) => {
      write({
        address: predictionPoolContract.address,
        abi: predictionPoolContract.abi,
        functionName: "createGoal",
        args: [
          params.circleAddress,
          params.title,
          params.deadline,
          params.stakeAmount,
        ],
      });
    },
    [write],
  );

  const confirmGoal = useCallback(
    async (goalId: string, chainId: number, hash: string) => {
      setIsApiLoading(true);
      try {
        return await goalsApi.confirm(goalId, chainId, hash);
      } finally {
        setIsApiLoading(false);
      }
    },
    [],
  );

  return {
    createGoal,
    confirmGoal,
    isLoading: isTxLoading || isApiLoading,
    isSuccess,
    error,
    txHash,
  };
}

export function useStake() {
  const { address } = useAccount();
  const {
    write: writeStake,
    isLoading: isStakeLoading,
    isSuccess: isStakeSuccess,
    error: stakeError,
    txHash: stakeTxHash,
  } = useContract();
  const {
    write: writeApprove,
    isLoading: isApproveLoading,
    isSuccess: isApproveSuccess,
    error: approveError,
    txHash: approveTxHash,
  } = useContract();
  const { allowance, refetch: refetchAllowance } = useUSDTAllowance(
    address,
    predictionPoolContract.address,
  );
  const [step, setStep] = useState<"idle" | "approving" | "staking">("idle");

  const stake = useCallback(
    async (goalId: bigint, side: number, amount: number) => {
      const amountBigInt = toUSDT(amount);

      await refetchAllowance();
      const currentAllowance = allowance ?? BigInt(0);

      if (currentAllowance < amountBigInt) {
        setStep("approving");
        writeApprove({
          address: mockUSDTContract.address,
          abi: mockUSDTContract.abi,
          functionName: "approve",
          args: [predictionPoolContract.address, amountBigInt],
        });
        return;
      }

      setStep("staking");
      writeStake({
        address: predictionPoolContract.address,
        abi: predictionPoolContract.abi,
        functionName: "stake",
        args: [goalId, side, amountBigInt],
      });
    },
    [allowance, refetchAllowance, writeApprove, writeStake],
  );

  const continueStake = useCallback(
    (goalId: bigint, side: number, amount: number) => {
      setStep("staking");
      writeStake({
        address: predictionPoolContract.address,
        abi: predictionPoolContract.abi,
        functionName: "stake",
        args: [goalId, side, toUSDT(amount)],
      });
    },
    [writeStake],
  );

  return {
    stake,
    continueStake,
    step,
    isLoading: isApproveLoading || isStakeLoading,
    isApproveSuccess,
    isStakeSuccess,
    error: approveError || stakeError,
    approveTxHash,
    stakeTxHash,
  };
}

export function useLockGoal() {
  const { write, isLoading, isSuccess, error, txHash } = useContract();

  const lockGoal = useCallback(
    (goalId: bigint) => {
      write({
        address: predictionPoolContract.address,
        abi: predictionPoolContract.abi,
        functionName: "lockGoal",
        args: [goalId],
      });
    },
    [write],
  );

  return { lockGoal, isLoading, isSuccess, error, txHash };
}

export function useClaim() {
  const { write, isLoading, isSuccess, error, txHash } = useContract();

  const claim = useCallback(
    (goalId: bigint) => {
      write({
        address: predictionPoolContract.address,
        abi: predictionPoolContract.abi,
        functionName: "claim",
        args: [goalId],
      });
    },
    [write],
  );

  return { claim, isLoading, isSuccess, error, txHash };
}

export function useSubmitVote() {
  const { write, isLoading, isSuccess, error, txHash } = useContract();

  const submitVote = useCallback(
    (goalId: bigint, outcome: number) => {
      write({
        address: resolutionModuleContract.address,
        abi: resolutionModuleContract.abi,
        functionName: "submitVote",
        args: [goalId, outcome],
      });
    },
    [write],
  );

  return { submitVote, isLoading, isSuccess, error, txHash };
}
