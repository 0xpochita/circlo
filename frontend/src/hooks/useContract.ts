"use client";

import type { Abi, Address } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

/**
 * Compose wagmi's `useWriteContract` + `useWaitForTransactionReceipt`
 * into one consumer-facing hook with a flat surface.
 *
 * Why a wrapper:
 *   - Pins `type: "legacy"` on every write — required by MiniPay,
 *     which ignores EIP-1559 fields. Forgetting this once was the
 *     source of every "wallet shows a pending tx then times out"
 *     report we got in the early MiniPay rollout.
 *   - Returns a single `isLoading` that covers both phases (signature
 *     pending + tx confirming) so call sites don't need to branch.
 *   - Returns both `isSuccess` (confirmed on-chain) and
 *     `isWriteSuccess` (signature received) for flows that need the
 *     pre-confirm UI feedback.
 */
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
