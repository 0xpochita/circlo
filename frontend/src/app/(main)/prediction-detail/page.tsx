"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { DetailHeader, DetailHero, OddsCard, InfoSection, ParticipantList, StakeButton } from "@/components/pages/(prediction-detail)";
import { PageTransition } from "@/components/pages/(app)";
import { goalsApi, circlesApi } from "@/lib/api/endpoints";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { decodeEventLog } from "viem";
import { toast } from "sonner";
import { predictionPoolContract, circleFactoryContract } from "@/lib/web3/contracts";
import { toUSDT } from "@/lib/web3/usdt";
import type { GoalResponse } from "@/lib/api/endpoints";

type GoalDetail = GoalResponse & {
  metadataUri?: string;
  participationSummary?: { side: string; totalStaked: string; count: number }[];
  resolvers?: { userId: string; vote: number | null; votedAt: string | null; user: { id: string; walletAddress?: string; name: string | null; username: string | null; avatarEmoji: string | null; avatarColor: string | null } }[];
};

function PredictionDetailContent() {
  const searchParams = useSearchParams();
  const goalId = searchParams.get("id") ?? "";
  const [goal, setGoal] = useState<GoalDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const needsConfirm = goal && !goal.chainId && isConnected;

  async function handleConfirmOnChain() {
    if (!goal || !goalId) return;
    setIsConfirming(true);
    try {
      let circleChainId = "";
      try {
        const circle = await circlesApi.detail(goal.circleId);
        circleChainId = circle.chainId || "";
      } catch {}

      if (!circleChainId) {
        toast("Creating circle on-chain first...");
        try {
          let circleName = "Circle";
          let circlePrivacy = false;
          try {
            const circleDetail = await circlesApi.detail(goal.circleId);
            circleName = circleDetail.name || "Circle";
            circlePrivacy = circleDetail.privacy === "private";
          } catch {}

          const circleTxHash = await writeContractAsync({
            address: circleFactoryContract.address,
            abi: circleFactoryContract.abi,
            functionName: "createCircle",
            args: [circlePrivacy, JSON.stringify({ name: circleName })],
          });

          if (publicClient) {
            try {
              const receipt = await publicClient.waitForTransactionReceipt({ hash: circleTxHash });
              for (const log of receipt.logs) {
                try {
                  const decoded = decodeEventLog({ abi: circleFactoryContract.abi, data: log.data, topics: log.topics });
                  if (decoded.eventName === "CircleCreated") {
                    const args = decoded.args as unknown as Record<string, unknown>;
                    circleChainId = String(args.id ?? args.circleId ?? "");
                    break;
                  }
                } catch {}
              }
            } catch {}
          }

          if (circleChainId) {
            try {
              await circlesApi.create({
                chainId: Number(circleChainId),
                name: circleName,
                category: "general",
                privacy: circlePrivacy ? "private" : "public",
              });
            } catch {}
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          if (msg.includes("User rejected") || msg.includes("denied")) {
            toast("Transaction cancelled");
          } else {
            toast.error("Failed to create circle on-chain");
          }
          setIsConfirming(false);
          return;
        }

        if (!circleChainId) {
          toast.error("Could not create circle on-chain");
          setIsConfirming(false);
          return;
        }

        toast("Circle created on-chain! Now creating goal...");
      }

      const deadline = BigInt(Math.floor(new Date(goal.deadline).getTime() / 1000));
      const minStake = toUSDT(parseFloat(goal.minStake || "0.1"));
      const resolverAddresses = (goal.resolvers || []).map((r) => r.user?.walletAddress).filter(Boolean) as `0x${string}`[];
      const metadataURI = goal.metadataUri || JSON.stringify({ title: goal.title });

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
        args: [BigInt(circleChainId), 0, deadline, minStake, resolverAddresses.length > 0 ? resolverAddresses : ["0x0000000000000000000000000000000000000000" as `0x${string}`], metadataURI],
      });

      const onChainGoalId = nextId > 0 ? nextId : 0;

      if (publicClient) {
        try {
          await publicClient.waitForTransactionReceipt({ hash: txHash });
        } catch {}
      }

      try {
        await goalsApi.confirm(goalId, onChainGoalId, txHash);
      } catch {}

      setGoal((prev) => prev ? { ...prev, chainId: String(onChainGoalId || "1") } : prev);
      toast.success("Goal confirmed on-chain!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("User rejected") || message.includes("denied")) {
        toast("Transaction cancelled");
      } else {
        toast.error("Failed to confirm. Try again.");
      }
    } finally {
      setIsConfirming(false);
    }
  }

  function refreshGoal() {
    if (!goalId) return;
    goalsApi
      .detail(goalId)
      .then((res) => setGoal(res as unknown as GoalDetail))
      .catch(() => {});
  }

  useEffect(() => {
    if (!goalId) {
      setIsLoading(false);
      return;
    }
    goalsApi
      .detail(goalId)
      .then((res) => setGoal(res as unknown as GoalDetail))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [goalId]);

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg">
        <div className="flex items-center justify-between px-4 pt-14 pb-2">
          <div className="h-9 w-9 rounded-full bg-gray-100 animate-pulse" />
          <div className="h-4 w-32 rounded-lg bg-gray-100 animate-pulse" />
          <div className="h-9 w-9 rounded-full bg-gray-100 animate-pulse" />
        </div>
        <div className="px-4 py-2 animate-pulse">
          <div className="rounded-2xl bg-white p-2">
            <div className="rounded-2xl bg-gray-50 p-6 flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-gray-100 mb-4" />
              <div className="h-4 w-16 rounded-lg bg-gray-100 mb-2" />
              <div className="h-6 w-48 rounded-lg bg-gray-100 mb-2" />
              <div className="h-4 w-56 rounded-lg bg-gray-100" />
            </div>
          </div>
        </div>
        <div className="px-4 py-2 animate-pulse">
          <div className="rounded-2xl bg-white p-4 h-40" />
        </div>
        <div className="px-4 py-2 animate-pulse">
          <div className="h-5 w-16 rounded-lg bg-gray-100 mb-3" />
          <div className="rounded-2xl bg-white h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg">
      <DetailHeader goalId={goalId} title={goal?.title} />
      <PageTransition>
        <DetailHero
          title={goal?.title}
          description={goal?.description}
          avatarEmoji={goal?.avatarEmoji}
          avatarColor={goal?.avatarColor}
          deadline={goal?.deadline}
          participantCount={goal?.participantCount}
          status={goal?.status}
        />
        <OddsCard goalChainId={goal?.chainId || undefined} />
        <InfoSection goal={goal} />
        <ParticipantList goalId={goalId || undefined} goalChainId={goal?.chainId || undefined} />
      </PageTransition>
      <StakeButton
        goalId={goalId || undefined}
        goalChainId={goal?.chainId || undefined}
        status={goal?.status}
        deadline={goal?.deadline}
        resolvers={goal?.resolvers}
        onStaked={refreshGoal}
      />
    </div>
  );
}

export default function PredictionDetailPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    }>
      <PredictionDetailContent />
    </Suspense>
  );
}
