"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import type { Abi, Address } from "viem";

export function useContract() {
  const {
    writeContract,
    data: txHash,
    isPending,
    isSuccess: isWriteSuccess,
    error: writeError,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  function write({
    address,
    abi,
    functionName,
    args,
    value,
  }: {
    address: Address;
    abi: Abi;
    functionName: string;
    args?: unknown[];
    value?: bigint;
  }) {
    writeContract({
      address,
      abi,
      functionName,
      args,
      value,
      type: "legacy",
    } as Parameters<typeof writeContract>[0]);
  }

  return {
    write,
    isLoading: isPending || isConfirming,
    isSuccess: isConfirmed,
    isWriteSuccess,
    error: writeError,
    txHash,
    reset,
  };
}
