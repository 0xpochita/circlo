"use client";

import { createCircloClient } from "circlo-sdk";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { HiOutlineLockClosed } from "react-icons/hi2";
import { toast } from "sonner";
import { usePublicClient, useWalletClient } from "wagmi";

const GOAL_STATUS_OPEN = 0;

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
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [isLocking, setIsLocking] = useState(false);
  const [scStatus, setScStatus] = useState<number | null>(null);

  // One SDK client per render; both read + write methods get the same wiring.
  const circlo = useMemo(
    () =>
      createCircloClient({
        walletClient: walletClient ?? undefined,
        publicClient,
      }),
    [walletClient, publicClient],
  );

  useEffect(() => {
    if (!goalChainId || !publicClient) return;
    let cancelled = false;
    circlo
      .getGoal(BigInt(goalChainId))
      .then((tuple) => {
        if (cancelled) return;
        setScStatus(Number(tuple[3]));
      })
      .catch(() => {
        if (!cancelled) setScStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [goalChainId, publicClient, circlo]);

  const isOpenOnChain = scStatus === GOAL_STATUS_OPEN;
  const deadlinePassed = deadline
    ? new Date(deadline).getTime() < Date.now()
    : false;

  if (!isOpenOnChain || !deadlinePassed || !goalChainId) {
    return null;
  }

  async function handleLock() {
    if (!goalChainId) return;
    if (!walletClient) {
      toast.error("Wallet not ready — please reconnect");
      return;
    }
    setIsLocking(true);
    try {
      const hash = await circlo.lockGoal(BigInt(goalChainId));

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
