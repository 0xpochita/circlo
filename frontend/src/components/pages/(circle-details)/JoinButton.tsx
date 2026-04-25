"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HiCheck } from "react-icons/hi2";
import { toast } from "sonner";
import { useAccount, useWriteContract } from "wagmi";
import { circlesApi } from "@/lib/api/endpoints";
import { circleFactoryContract } from "@/lib/web3/contracts";
import { NETWORK } from "@/lib/web3/network";
import { useAuthStore } from "@/stores/authStore";

type JoinButtonProps = {
  circleId?: number;
  circleBackendId?: string;
};

export default function JoinButton({
  circleId = 1,
  circleBackendId,
}: JoinButtonProps) {
  const router = useRouter();
  const [joined, setJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { isConnected } = useAccount();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { writeContractAsync } = useWriteContract();

  async function handleJoin() {
    if (!isConnected || !isAuthenticated) {
      localStorage.setItem("circlo-redirect-after-login", window.location.href);
      router.push("/welcome");
      return;
    }
    if (joined) return;

    setIsLoading(true);
    try {
      await writeContractAsync({
        address: circleFactoryContract.address,
        abi: circleFactoryContract.abi,
        functionName: "joinCircle",
        args: [BigInt(circleId)],
        chainId: NETWORK.id,
        type: "legacy",
      });

      if (circleBackendId) {
        try {
          await circlesApi.join(circleBackendId);
        } catch {}
      }

      setJoined(true);
      toast.success("Joined circle!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("User rejected") || message.includes("denied")) {
        toast("Transaction cancelled");
      } else if (message.includes("already a member")) {
        setJoined(true);
        toast("You're already a member");
      } else {
        toast.error("Failed to join. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  function getButtonText() {
    if (joined) return "Joined";
    if (isLoading) return "Joining...";
    if (!isConnected || !isAuthenticated) return "Connect to Join";
    return "Join Circle";
  }

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-main-bg px-4 pb-8 pt-4 mt-auto">
      <motion.button
        type="button"
        onClick={handleJoin}
        disabled={isLoading || joined}
        whileTap={isLoading || joined ? {} : { scale: 0.97 }}
        className={`flex w-full items-center justify-center gap-2 rounded-full py-4 text-base font-semibold cursor-pointer transition-all duration-200 disabled:cursor-not-allowed ${
          joined
            ? "bg-gray-100 text-muted"
            : isLoading
              ? "bg-gray-200 text-muted"
              : "bg-gray-900 text-white"
        }`}
      >
        {joined && <HiCheck className="w-5 h-5" />}
        {getButtonText()}
      </motion.button>
    </div>
  );
}
