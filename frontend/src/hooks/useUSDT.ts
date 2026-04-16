"use client";

import type { Address } from "viem";
import { useReadContract } from "wagmi";
import { mockUSDTContract, predictionPoolContract } from "@/lib/web3/contracts";
import { fromUSDT } from "@/lib/web3/usdt";
import { useContract } from "./useContract";

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
