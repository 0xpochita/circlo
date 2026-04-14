"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { UsdtLabel } from "@/components/shared";
import { useStake } from "@/hooks/useGoals";

type StakeButtonProps = {
  goalId?: bigint;
  side?: number;
};

export default function StakeButton({ goalId = BigInt(0), side = 0 }: StakeButtonProps) {
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState("0.50");
  const {
    stake,
    continueStake,
    step,
    isLoading,
    isApproveSuccess,
    isStakeSuccess,
    error,
  } = useStake();

  useEffect(() => {
    if (isApproveSuccess && step === "approving") {
      continueStake(goalId, side, parseFloat(amount));
    }
  }, [isApproveSuccess, step, goalId, side, amount, continueStake]);

  useEffect(() => {
    if (isStakeSuccess) {
      toast.success("Stake placed successfully");
    }
  }, [isStakeSuccess]);

  useEffect(() => {
    if (error) {
      toast.error("Something went wrong. Please try again.");
    }
  }, [error]);

  function handleStake() {
    if (!isConnected) {
      toast.error("Connect wallet first");
      return;
    }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    stake(goalId, side, parsed);
  }

  function getButtonText() {
    if (!isConnected) return "Connect to Stake";
    if (isLoading && step === "approving") return "Approving...";
    if (isLoading && step === "staking") return "Staking...";
    if (isLoading) return "Processing...";
    return "Place Stake";
  }

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-main-bg px-4 pb-8 pt-4 mt-auto">
      <div className="flex items-center gap-3">
        <div className="flex-1 rounded-full bg-white px-4 py-3">
          <p className="text-[10px] text-muted uppercase tracking-wide">Your stake</p>
          <div className="flex items-center gap-1">
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="w-full bg-transparent text-sm font-bold text-main-text outline-none"
            />
            <UsdtLabel size={12} />
          </div>
        </div>
        <motion.button
          type="button"
          onClick={handleStake}
          disabled={isLoading}
          whileTap={isLoading ? {} : { scale: 0.97 }}
          className="flex-1 rounded-full bg-brand py-4 text-base font-semibold text-white cursor-pointer disabled:opacity-60"
        >
          {getButtonText()}
        </motion.button>
      </div>
    </div>
  );
}
