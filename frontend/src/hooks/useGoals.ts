"use client";

import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { goalsApi } from "@/lib/api/endpoints";
import {
  usdtContract,
  predictionPoolContract,
  resolutionModuleContract,
} from "@/lib/web3/contracts";
import { toUSDT } from "@/lib/web3/usdt";
import { useContract } from "./useContract";
import { useUSDTAllowance } from "./useUSDT";

/**
 * Two-step goal creation hook: on-chain `createGoal()` to mint the
 * goal id, then `goalsApi.confirm()` to associate the chain id with
 * the backend record.
 *
 * The split prevents orphan backend records when the wallet popup
 * is dismissed mid-flow — `confirmGoal` should only be called after
 * the user signs and the tx hash is in hand.
 *
 * `isLoading` is `true` while either step is in flight.
 */
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

/**
 * Multi-step stake hook covering the approve-then-stake dance.
 *
 * Flow:
 *   1. `stake(goalId, side, amount)` reads current allowance.
 *   2. If `allowance < amount`, fires `approve(PredictionPool, amount)`
 *      and sets `step = "approving"`. Caller waits for `isApproveSuccess`,
 *      then calls `continueStake(...)` to finish.
 *   3. If allowance is already sufficient, fires `stake(...)` directly
 *      and sets `step = "staking"`.
 *
 * The split avoids batching both txs into one wallet popup — wallet UX
 * is one prompt per tx. Each step exposes its own loading / success /
 * error / txHash field so the UI can render distinct progress copy.
 *
 * Day-3 lesson: skipping the approve step entirely (assuming a previous
 * call had set allowance) silently reverts every stake. Always check
 * the allowance first.
 */
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
          address: usdtContract.address,
          abi: usdtContract.abi,
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

/**
 * Hook for the permissionless `lockGoal(goalId)` write.
 *
 * Any wallet can call this once the deadline has passed — no role gate.
 * Transitions the goal `Open → Locked` and opens the resolver vote
 * window. Reverts `DeadlineNotReached` if called early, or
 * `WrongStatus` if the goal is already past `Open`.
 *
 * Used by the "advance lifecycle" CTA on stale goals so users can
 * unblock resolution without waiting for the creator.
 */
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

/**
 * Hook for claiming a winning payout from a resolved goal.
 *
 * Reverts `NotResolved` if the goal is still pre-`PaidOut` and
 * `NothingToClaim` if the caller was on the losing side or already
 * claimed. The UI should only surface the claim CTA when
 * `getGoal().status === PaidOut` AND `getStakeOf(user, winningSide) > 0`.
 *
 * Payout = winnerStake + winnerStake * losersPool / winnersPool
 * (post-fee). See `circlo-sdk/src/claims.ts` for the explicit formula.
 */
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

/**
 * Hook for submitting a resolver vote on a locked goal.
 *
 * Caller must be on `goal.resolverList` (set at `createGoal` time).
 * Reverts `NotResolver` for non-resolvers, `AlreadyVoted` for a
 * second vote from the same wallet, and `VoteWindowExpired` if the
 * vote window has closed.
 *
 * Once quorum is reached, the contract auto-finalizes via the
 * `setWinner` callback into PredictionPool — no separate `finalize`
 * call needed for the common path. Tied votes transition to
 * `Disputed` and stakers call `refund` instead of `claim`.
 */
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
