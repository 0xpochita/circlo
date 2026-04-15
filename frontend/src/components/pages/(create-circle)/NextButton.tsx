"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { decodeEventLog } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { circlesApi } from "@/lib/api/endpoints";
import { circleFactoryContract } from "@/lib/web3/contracts";
import { useCreateCircleStore } from "@/stores/createCircleStore";

export default function NextButton() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const store = useCreateCircleStore();
  const [isCreating, setIsCreating] = useState(false);
  const [statusText, setStatusText] = useState("Create Circle");

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  async function handleCreate() {
    if (!isConnected) {
      toast("Connect your wallet first");
      return;
    }

    if (!store.name.trim()) {
      toast("Circle name is required");
      return;
    }

    const circleName = store.name;
    const circleDescription = store.description;
    const circleCategory = store.category;
    const circlePrivacy = store.privacy;
    const circleEmoji = store.avatar.emoji;
    const circleColor = store.avatar.color;

    setIsCreating(true);

    try {
      setStatusText("Sending transaction...");

      const metadataURI = JSON.stringify({
        name: circleName,
        description: circleDescription,
        category: circleCategory,
        avatar: `${circleEmoji}|${circleColor}`,
      });

      const txHash = await writeContractAsync({
        address: circleFactoryContract.address,
        abi: circleFactoryContract.abi,
        functionName: "createCircle",
        args: [circlePrivacy === "private", metadataURI],
      });

      setStatusText("Waiting for confirmation...");

      let onChainCircleId: string | undefined;

      if (publicClient) {
        try {
          const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash,
          });
          for (const log of receipt.logs) {
            try {
              const decoded = decodeEventLog({
                abi: circleFactoryContract.abi,
                data: log.data,
                topics: log.topics,
              });
              if (decoded.eventName === "CircleCreated") {
                const args = decoded.args as unknown as Record<string, unknown>;
                onChainCircleId = String(args.id ?? args.circleId ?? "");
                break;
              }
            } catch {}
          }
        } catch {}
      }

      setStatusText("Saving to backend...");

      let circleId = "";
      try {
        const created = await circlesApi.create({
          ...(onChainCircleId ? { chainId: Number(onChainCircleId) } : {}),
          name: circleName,
          description: circleDescription,
          category: circleCategory,
          privacy: circlePrivacy,
          avatarEmoji: circleEmoji,
          avatarColor: circleColor,
        });
        circleId = created.id;
      } catch {}

      const params = new URLSearchParams();
      if (circleId) params.set("id", circleId);
      params.set("name", circleName);
      params.set("emoji", circleEmoji);
      params.set("color", circleColor);
      if (circleDescription) params.set("desc", circleDescription);

      store.reset();
      toast.success("Circle created successfully!");
      router.push(`/circle-success?${params.toString()}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      if (message.includes("User rejected") || message.includes("denied")) {
        toast("Transaction cancelled");
      } else if (message.includes("chain") || message.includes("Chain")) {
        toast("Please switch to Celo Sepolia network");
      } else {
        toast.error(
          message.length > 120
            ? "Failed to create circle. Please try again."
            : message,
        );
      }
    } finally {
      setIsCreating(false);
      setStatusText("Create Circle");
    }
  }

  return (
    <div className="px-4 pb-10 pt-4 mt-auto">
      <motion.button
        type="button"
        onClick={handleCreate}
        disabled={isCreating}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.7 }}
        whileTap={isCreating ? {} : { scale: 0.97 }}
        className="w-full rounded-full bg-brand py-4 text-base font-semibold text-white cursor-pointer disabled:bg-gray-200 disabled:text-muted disabled:cursor-not-allowed"
      >
        {isCreating ? statusText : "Create Circle"}
      </motion.button>
    </div>
  );
}
