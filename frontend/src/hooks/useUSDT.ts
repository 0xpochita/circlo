"use client";

import type { Address } from "viem";
import { useReadContract } from "wagmi";
import { mockUSDTContract, predictionPoolContract } from "@/lib/web3/contracts";
import { fromUSDT } from "@/lib/web3/usdt";
import { useContract } from "./useContract";

/**
 * Read a user's USDT balance, polling via wagmi's `useReadContract`.
 *
 * Returns both the raw `bigint` (`balance`, 6-decimal base units) and
 * a JS-number `formatted` value via `fromUSDT` for direct display.
 * Pass `undefined` to disable the query — useful when the wallet
 * isn't connected yet.
 *
 * The `refetch` callback is useful after a confirmed stake / faucet
 * tx to refresh the displayed balance without waiting for the next
 * background poll.
 *
 * @example
 * ```tsx
 * const { formatted, refetch } = useUSDTBalance(address);
 * return <span>{formatted.toFixed(2)} USDT</span>;
 * ```
 */
export function useUSDTBalance(address: Address | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    ...mockUSDTContract,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return {
    balance: data as bigint | undefined,
    formatted: data ? fromUSDT(data as bigint) : 0,
    isLoading,
    refetch,
  };
}

/**
 * Read the USDT allowance `owner` has granted `spender` (typically
 * PredictionPool).
 *
 * Used by stake flows to decide whether to short-circuit the
 * `approve` step. Returns `undefined` while loading or if either
 * address is absent. Pair with `useApproveUSDT` to top up when the
 * allowance falls below the desired stake amount.
 *
 * @example
 * ```tsx
 * const { allowance, refetch } = useUSDTAllowance(user, pool);
 * if ((allowance ?? 0n) < stakeAmount) await approve(stakeAmount * 10n);
 * ```
 */
export function useUSDTAllowance(
  owner: Address | undefined,
  spender: Address | undefined,
) {
  const { data, isLoading, refetch } = useReadContract({
    ...mockUSDTContract,
    functionName: "allowance",
    args: owner && spender ? [owner, spender] : undefined,
    query: { enabled: !!owner && !!spender },
  });

  return {
    allowance: data as bigint | undefined,
    isLoading,
    refetch,
  };
}

export function useApproveUSDT() {
  const { write, isLoading, isSuccess, error, txHash, reset } = useContract();

  function approve(amount: bigint) {
    write({
      address: mockUSDTContract.address,
      abi: mockUSDTContract.abi,
      functionName: "approve",
      args: [predictionPoolContract.address, amount],
    });
  }

  return { approve, isLoading, isSuccess, error, txHash, reset };
}

export function useFaucet() {
  const { write, isLoading, isSuccess, error, txHash, reset } = useContract();

  function faucet() {
    write({
      address: mockUSDTContract.address,
      abi: mockUSDTContract.abi,
      functionName: "faucet",
      args: [],
    });
  }

  return { faucet, isLoading, isSuccess, error, txHash, reset };
}
