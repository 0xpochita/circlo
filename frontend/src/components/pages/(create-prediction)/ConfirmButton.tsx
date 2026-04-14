"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract } from "wagmi";
import { toast } from "sonner";
import { useCreateGoalStore } from "@/stores/createGoalStore";
import { predictionPoolContract } from "@/lib/web3/contracts";
import { toUSDT } from "@/lib/web3/usdt";
import { goalsApi } from "@/lib/api/endpoints";

export default function ConfirmButton() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const store = useCreateGoalStore();
  const { writeContractAsync } = useWriteContract();
  const [isCreating, setIsCreating] = useState(false);
  const [statusText, setStatusText] = useState("Confirm Prediction");

  async function handleConfirm() {
    if (!isConnected) {
      toast("Connect your wallet first");
      return;
    }

    if (!store.title.trim()) {
      toast("Please enter a goal title");
      return;
    }

    if (!store.circleId) {
      toast("Please select a circle");
      return;
    }

    setIsCreating(true);

    try {
      setStatusText("Sending transaction...");

      const deadlineTimestamp = BigInt(
        Math.floor(Date.now() / 1000) + store.durationHours * 3600
      );
      const minStake = store.stakeAmount
        ? toUSDT(parseFloat(store.stakeAmount))
        : toUSDT(0.1);

      const metadataURI = JSON.stringify({
        title: store.title,
        description: store.description,
        avatar: `${store.avatar.emoji}|${store.avatar.color}`,
      });

      const txHash = await writeContractAsync({
        address: predictionPoolContract.address,
        abi: predictionPoolContract.abi,
        functionName: "createGoal",
        args: [
          BigInt(store.circleId),
          store.outcomeType,
          deadlineTimestamp,
          minStake,
          store.resolvers as `0x${string}`[],
          metadataURI,
        ],
      });

      setStatusText("Confirming on-chain...");
      toast("Transaction sent!");

      try {
        await goalsApi.create({
          circleId: store.circleId,
          title: store.title,
          description: store.description,
          avatarEmoji: store.avatar.emoji,
          avatarColor: store.avatar.color,
          outcomeType: String(store.outcomeType || "binary"),
          deadline: new Date(Number(deadlineTimestamp) * 1000).toISOString(),
          minStake: store.stakeAmount || "0.10",
          resolverIds: store.resolvers.length > 0 ? store.resolvers : undefined,
        });
      } catch {}

      store.reset();
      toast.success("Goal created!");
      router.push("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("User rejected") || message.includes("denied")) {
        toast("Transaction cancelled");
      } else if (message.includes("chain") || message.includes("Chain")) {
        toast("Please switch to Celo Sepolia network");
      } else {
        toast.error(message.length > 120 ? "Failed to create goal. Please try again." : message);
      }
    } finally {
      setIsCreating(false);
      setStatusText("Confirm Prediction");
    }
  }

  return (
    <div className="px-4 pb-10 pt-4 mt-auto">
      <motion.button
        type="button"
        onClick={handleConfirm}
        disabled={isCreating}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        whileTap={isCreating ? {} : { scale: 0.97 }}
        className="w-full rounded-full bg-brand py-4 text-base font-semibold text-white cursor-pointer disabled:bg-gray-200 disabled:text-muted disabled:cursor-not-allowed"
      >
        {isCreating ? statusText : "Confirm Prediction"}
      </motion.button>
    </div>
  );
}
