"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { HiOutlineLockClosed } from "react-icons/hi2";
import { toast } from "sonner";
import { usePublicClient, useWriteContract } from "wagmi";
import { predictionPoolContract } from "@/lib/web3/contracts";
import { NETWORK } from "@/lib/web3/network";

type LockMarketButtonProps = {
  goalChainId?: string;
  status?: string;
  deadline?: string;
  onLocked?: () => void;
};

export default function LockMarketButton({
  goalChainId,
  deadline,
  onLocked,
}: LockMarketButtonProps) {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [isLocking, setIsLocking] = useState(false);
  const [scStatus, setScStatus] = useState<number | null>(null);

  useEffect(() => {
    if (!goalChainId || !publicClient) return;
    let cancelled = false;
    publicClient
      .readContract({
        address: predictionPoolContract.address,
        abi: predictionPoolContract.abi,
        functionName: "goals",
        args: [BigInt(goalChainId)],
      })
      .then((result) => {
        if (cancelled) return;
        const tuple = result as readonly unknown[];
        setScStatus(Number(tuple[3]));
      })
      .catch(() => {
        if (!cancelled) setScStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [goalChainId, publicClient]);

  const isOpenOnChain = scStatus === 0;
  const deadlinePassed = deadline
    ? new Date(deadline).getTime() < Date.now()
    : false;

  if (!isOpenOnChain || !deadlinePassed || !goalChainId) {
    return null;
  }

  async function handleLock() {
    if (!goalChainId) return;
    setIsLocking(true);
    try {
      const hash = await writeContractAsync({
        address: predictionPoolContract.address,
        abi: predictionPoolContract.abi,
        functionName: "lockGoal",
        args: [BigInt(goalChainId)],
        chainId: NETWORK.id,
        type: "legacy",
      });

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") {
          toast.error("Failed to lock market");
          return;
        }
      }

      setScStatus(1);
      toast.success("Market locked!");
      onLocked?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("User rejected") || msg.includes("denied")) {
        toast("Transaction cancelled");
      } else {
        toast.error("Failed to lock market");
      }
    } finally {
      setIsLocking(false);
    }
  }

  return (
    <div className="px-4 py-2">
      <div className="rounded-2xl bg-white p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50">
            <HiOutlineLockClosed className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-main-text">
              Deadline passed
            </p>
            <p className="text-xs text-muted mt-0.5">
              Anyone can now lock this market to start resolution voting.
            </p>
          </div>
        </div>
        <motion.button
          type="button"
          onClick={handleLock}
          disabled={isLocking}
          whileTap={isLocking ? {} : { scale: 0.97 }}
          className="w-full rounded-full bg-gray-900 py-3 text-sm font-semibold text-white cursor-pointer transition-all duration-200 disabled:bg-gray-200 disabled:text-muted disabled:cursor-not-allowed"
        >
          {isLocking ? "Locking..." : "Lock Market"}
        </motion.button>
      </div>
    </div>
  );
}
