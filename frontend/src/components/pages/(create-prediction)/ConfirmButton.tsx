"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { toast } from "sonner";
import { useCreateGoalStore } from "@/stores/createGoalStore";
import { predictionPoolContract } from "@/lib/web3/contracts";
import { toUSDT } from "@/lib/web3/usdt";
import { goalsApi, circlesApi } from "@/lib/api/endpoints";

export default function ConfirmButton() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const store = useCreateGoalStore();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
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

    if (store.resolvers.length === 0) {
      toast("Please select at least one resolver");
      return;
    }

    setIsCreating(true);

    try {
      setStatusText("Creating goal...");

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

      let backendGoalId = "";
      let backendMetadataUri = metadataURI;

      try {
        const created = await goalsApi.create({
          circleId: store.circleId,
          title: store.title,
          description: store.description,
          avatarEmoji: store.avatar.emoji,
          avatarColor: store.avatar.color,
          outcomeType: store.outcomeType === 0 ? "binary" : store.outcomeType === 1 ? "multi" : "numeric",
          deadline: new Date(Number(deadlineTimestamp) * 1000).toISOString(),
          minStake: store.stakeAmount || "0.10",
          resolverIds: store.resolvers,
        });
        const res = created as unknown as { id?: string; metadataUri?: string };
        backendGoalId = res.id || "";
        backendMetadataUri = res.metadataUri || metadataURI;
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        toast.error(message.length > 100 ? "Failed to create goal" : message);
        setIsCreating(false);
        setStatusText("Confirm Prediction");
        return;
      }

      let onChainId = store.circleChainId;
      if (!onChainId) {
        try {
          const detail = await circlesApi.detail(store.circleId);
          onChainId = detail.chainId || "";
        } catch {}
      }

      if (onChainId) {
        setStatusText("Preparing resolvers...");

        let resolverAddresses: `0x${string}`[] = [];
        if (store.circleId && store.resolvers.length > 0) {
          try {
            const membersRes = await circlesApi.members(store.circleId);
            resolverAddresses = store.resolvers
              .map((rid) => {
                const m = membersRes.items?.find((item) => item.userId === rid);
                return m?.user?.walletAddress as `0x${string}` | undefined;
              })
              .filter(Boolean) as `0x${string}`[];
          } catch {}
        }

        if (resolverAddresses.length === 0 && address) {
          resolverAddresses = [address as `0x${string}`];
        }

        setStatusText("Sending transaction...");

        try {
          let nextId = 0;
          if (publicClient) {
            try {
              const result = await publicClient.readContract({
                address: predictionPoolContract.address,
                abi: predictionPoolContract.abi,
                functionName: "nextGoalId",
              });
              nextId = Number(result);
            } catch {}
          }

          const txHash = await writeContractAsync({
            address: predictionPoolContract.address,
            abi: predictionPoolContract.abi,
            functionName: "createGoal",
            args: [
              BigInt(onChainId),
              store.outcomeType,
              deadlineTimestamp,
              minStake,
              resolverAddresses,
              backendMetadataUri,
            ],
          });

          setStatusText("Confirming on-chain...");

          const onChainGoalId = nextId > 0 ? nextId : 0;

          if (publicClient) {
            try {
              await publicClient.waitForTransactionReceipt({ hash: txHash });
            } catch {}
          }

          if (backendGoalId && onChainGoalId > 0) {
            try {
              await goalsApi.confirm(backendGoalId, onChainGoalId, txHash);
            } catch {}
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "";
          if (message.includes("User rejected") || message.includes("denied")) {
            toast("Transaction cancelled. Goal saved as draft.");
          }
        }
      }

      const circleIdForRedirect = store.circleId;
      store.reset();
      toast.success("Goal created!");
      router.push(`/circle-details?id=${circleIdForRedirect}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("chain") || message.includes("Chain")) {
        toast("Please switch to Celo Sepolia network");
      } else {
        toast.error(message.length > 120 ? "Failed to create goal" : message);
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
