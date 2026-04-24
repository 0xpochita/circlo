"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HiCheck, HiXMark } from "react-icons/hi2";
import { toast } from "sonner";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { EmojiAvatar, UsdtLabel } from "@/components/shared";
import { useMiniPay, useSheetOverflow } from "@/hooks";
import { circlesApi, goalsApi } from "@/lib/api/endpoints";
import {
  circleFactoryContract,
  predictionPoolContract,
} from "@/lib/web3/contracts";
import { NETWORK } from "@/lib/web3/network";
import { DEFAULT_MIN_STAKE, toUSDT } from "@/lib/web3/usdt";
import { useCreateGoalStore } from "@/stores/createGoalStore";

type StepStatus = "pending" | "active" | "done" | "error";
type Step = { label: string; status: StepStatus };

export default function ConfirmButton() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const store = useCreateGoalStore();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const isMiniPayBrowser = useMiniPay();
  const celoTxExtras = isMiniPayBrowser
    ? { feeCurrency: NETWORK.contracts.usdt }
    : {};
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);

  useSheetOverflow(sheetOpen);

  function getDeadlineDisplay(): string {
    if (store.customDeadline) {
      return new Date(store.customDeadline).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    const deadline = new Date(Date.now() + store.durationHours * 3600000);
    return deadline.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getOutcomeLabel(): string {
    if (store.outcomeType === 0) return "Yes / No";
    if (store.outcomeType === 1) return "Multiple Choice";
    return "Numeric Range";
  }

  async function handleOpenSheet() {
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

    if (!store.circleName && store.circleId) {
      try {
        const detail = await circlesApi.detail(store.circleId);
        store.setCircleName(detail.name || "Circle");
      } catch {}
    }

    setSteps([]);
    setSheetOpen(true);
  }

  function updateStep(index: number, s: StepStatus) {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, status: s } : step)),
    );
  }

  async function handleConfirm() {
    setIsCreating(true);

    const BUFFER_SECONDS = 300;

    const deadlineTimestamp = store.customDeadline
      ? BigInt(Math.floor(new Date(store.customDeadline).getTime() / 1000))
      : BigInt(
          Math.floor(Date.now() / 1000) +
            store.durationHours * 3600 +
            BUFFER_SECONDS,
        );
    const minStake = store.stakeAmount
      ? toUSDT(parseFloat(store.stakeAmount))
      : toUSDT(parseFloat(DEFAULT_MIN_STAKE));
    const metadataURI = JSON.stringify({
      title: store.title,
      description: store.description,
      avatar: `${store.avatar.emoji}|${store.avatar.color}`,
    });

    let onChainId = store.circleChainId;
    if (!onChainId) {
      try {
        const detail = await circlesApi.detail(store.circleId);
        onChainId = detail.chainId || "";
      } catch {}
    }

    if (!onChainId) {
      toast.error("Circle is not on-chain yet");
      setIsCreating(false);
      return;
    }
    if (!publicClient || !address) {
      toast.error("Connect your wallet first");
      setIsCreating(false);
      return;
    }

    const stepsToRun: Step[] = [
      { label: "Preparing resolvers", status: "pending" },
      { label: "Joining circle", status: "pending" },
      { label: "Sending transaction", status: "pending" },
      { label: "Confirming on-chain", status: "pending" },
      { label: "Saving goal", status: "pending" },
    ];
    setSteps(stepsToRun);

    let stepIdx = 0;

    try {
      updateStep(stepIdx, "active");
      let candidateAddresses: `0x${string}`[] = [];
      if (store.resolvers.length > 0) {
        try {
          const membersRes = await circlesApi.members(store.circleId);
          candidateAddresses = store.resolvers
            .map((rid) => {
              const m = membersRes.items?.find((item) => item.userId === rid);
              return m?.user?.walletAddress as `0x${string}` | undefined;
            })
            .filter(Boolean) as `0x${string}`[];
        } catch {}
      }

      const memberChecks = await Promise.all(
        candidateAddresses.map(async (addr) => {
          try {
            const ok = await publicClient.readContract({
              address: circleFactoryContract.address,
              abi: circleFactoryContract.abi,
              functionName: "isCircleMember",
              args: [BigInt(onChainId), addr],
            });
            return ok ? addr : null;
          } catch {
            return null;
          }
        }),
      );
      let resolverAddresses = memberChecks.filter(
        (a): a is `0x${string}` => a !== null,
      );

      if (resolverAddresses.length === 0) {
        resolverAddresses = [address as `0x${string}`];
      }
      updateStep(stepIdx, "done");
      stepIdx++;

      updateStep(stepIdx, "active");
      try {
        const isMember = await publicClient.readContract({
          address: circleFactoryContract.address,
          abi: circleFactoryContract.abi,
          functionName: "isCircleMember",
          args: [BigInt(onChainId), address],
        });

        if (!isMember) {
          const joinTx = await writeContractAsync({
            address: circleFactoryContract.address,
            abi: circleFactoryContract.abi,
            functionName: "joinCircle",
            args: [BigInt(onChainId)],
            ...celoTxExtras,
          } as Parameters<typeof writeContractAsync>[0]);
          await publicClient.waitForTransactionReceipt({ hash: joinTx });
        }
        updateStep(stepIdx, "done");
      } catch (err) {
        updateStep(stepIdx, "error");
        const message = err instanceof Error ? err.message : "";
        if (message.includes("User rejected") || message.includes("denied")) {
          toast("Transaction cancelled");
        } else {
          toast.error("Failed to join circle. Try again.");
        }
        setIsCreating(false);
        return;
      }
      stepIdx++;

      updateStep(stepIdx, "active");
      let txHash: `0x${string}`;
      let nextId = 0;
      try {
        try {
          const result = await publicClient.readContract({
            address: predictionPoolContract.address,
            abi: predictionPoolContract.abi,
            functionName: "nextGoalId",
          });
          nextId = Number(result);
        } catch {}

        txHash = await writeContractAsync({
          address: predictionPoolContract.address,
          abi: predictionPoolContract.abi,
          functionName: "createGoal",
          args: [
            BigInt(onChainId),
            store.outcomeType,
            deadlineTimestamp,
            minStake,
            resolverAddresses,
            metadataURI,
          ],
          ...celoTxExtras,
        } as Parameters<typeof writeContractAsync>[0]);
        updateStep(stepIdx, "done");
      } catch (err) {
        console.error("[createGoal] Transaction failed:", err);
        updateStep(stepIdx, "error");
        const message = err instanceof Error ? err.message : "";
        if (message.includes("User rejected") || message.includes("denied")) {
          toast("Transaction cancelled");
        } else {
          toast.error("Failed to send transaction");
        }
        setIsCreating(false);
        return;
      }
      stepIdx++;

      updateStep(stepIdx, "active");
      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
        });
        if (receipt.status !== "success") {
          updateStep(stepIdx, "error");
          toast.error("Transaction reverted on-chain");
          setIsCreating(false);
          return;
        }
        updateStep(stepIdx, "done");
      } catch {
        updateStep(stepIdx, "error");
        toast.error("Transaction may have failed");
        setIsCreating(false);
        return;
      }
      stepIdx++;

      updateStep(stepIdx, "active");
      let backendGoalId = "";
      try {
        const created = await goalsApi.create({
          circleId: store.circleId,
          title: store.title,
          description: store.description,
          avatarEmoji: store.avatar.emoji,
          avatarColor: store.avatar.color,
          outcomeType:
            store.outcomeType === 0
              ? "binary"
              : store.outcomeType === 1
                ? "multi"
                : "numeric",
          deadline: new Date(Number(deadlineTimestamp) * 1000).toISOString(),
          minStake: store.stakeAmount || DEFAULT_MIN_STAKE,
          resolverIds: store.resolvers,
        });
        const res = created as unknown as { id?: string };
        backendGoalId = res.id || "";
      } catch {}

      if (backendGoalId && nextId > 0) {
        try {
          await goalsApi.confirm(backendGoalId, nextId, txHash);
        } catch {}
      }
      updateStep(stepIdx, "done");

      const circleIdForRedirect = store.circleId;
      store.reset();
      toast.success("Goal created!");
      setTimeout(() => {
        setSheetOpen(false);
        router.push(`/circle-details?id=${circleIdForRedirect}`);
      }, 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("chain") || message.includes("Chain")) {
        toast("Please switch to Celo Sepolia network");
      } else {
        toast.error(message.length > 120 ? "Failed to create goal" : message);
      }
    } finally {
      setIsCreating(false);
    }
  }

  const summaryRows = [
    { label: "Circle", value: store.circleName || "—" },
    { label: "Outcome type", value: getOutcomeLabel() },
    { label: "Deadline", value: getDeadlineDisplay() },
    { label: "Minimum stake", value: `${store.stakeAmount || DEFAULT_MIN_STAKE} USDT` },
    {
      label: "Resolvers",
      value:
        store.resolverNames.length > 0
          ? store.resolverNames.join(", ")
          : `${store.resolvers.length} selected`,
    },
  ];

  return (
    <>
      <div className="px-4 pb-10 pt-4 mt-auto">
        <motion.button
          type="button"
          onClick={handleOpenSheet}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          whileTap={{ scale: 0.97 }}
          className="w-full rounded-full bg-gray-900 py-4 text-base font-semibold text-white cursor-pointer"
        >
          Confirm Prediction
        </motion.button>
      </div>

      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isCreating && setSheetOpen(false)}
              className="fixed inset-0 z-100 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{
                type: "spring" as const,
                stiffness: 300,
                damping: 32,
              }}
              className="fixed bottom-0 left-1/2 z-101 w-full max-w-md -translate-x-1/2 rounded-t-3xl bg-white"
              style={{ maxHeight: "90dvh" }}
            >
              <div className="flex items-start justify-between px-6 pt-6 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-main-text">
                    {steps.length > 0
                      ? "Creating Prediction"
                      : "Confirm Prediction"}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {steps.length > 0
                      ? "Confirm each step in your wallet"
                      : "Review your prediction details"}
                  </p>
                </div>
                {!isCreating && (
                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 cursor-pointer transition-all duration-200 active:scale-95"
                  >
                    <HiXMark className="w-5 h-5 text-main-text" />
                  </button>
                )}
              </div>

              <div className="overflow-y-auto px-6 pb-8">
                {steps.length > 0 ? (
                  <div className="flex flex-col gap-4 py-4">
                    {steps.map((step, i) => (
                      <motion.div
                        key={`step-${i}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className="flex items-center gap-3"
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                            step.status === "done"
                              ? "bg-emerald-500"
                              : step.status === "active"
                                ? "bg-gray-900"
                                : step.status === "error"
                                  ? "bg-red-400"
                                  : "bg-gray-100"
                          }`}
                        >
                          {step.status === "done" ? (
                            <HiCheck className="w-4 h-4 text-white" />
                          ) : step.status === "active" ? (
                            <div className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          ) : step.status === "error" ? (
                            <HiXMark className="w-4 h-4 text-white" />
                          ) : (
                            <div className="h-2 w-2 rounded-full bg-gray-300" />
                          )}
                        </div>
                        <p
                          className={`text-sm font-medium ${
                            step.status === "done"
                              ? "text-emerald-500"
                              : step.status === "active"
                                ? "text-main-text"
                                : step.status === "error"
                                  ? "text-red-400"
                                  : "text-muted"
                          }`}
                        >
                          {step.label}
                          {step.status === "active" && "..."}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-5">
                      <EmojiAvatar avatar={store.avatar} size={48} />
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-main-text truncate">
                          {store.title}
                        </p>
                        {store.description && (
                          <p className="text-xs text-muted truncate">
                            {store.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-4 mb-5">
                      <div className="divide-y divide-gray-100">
                        {summaryRows.map((row) => (
                          <div
                            key={row.label}
                            className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                          >
                            <p className="text-sm text-muted">{row.label}</p>
                            <p className="text-sm font-medium text-main-text text-right max-w-[60%] truncate">
                              {row.label === "Minimum stake" ? (
                                <span className="inline-flex items-center gap-1">
                                  {store.stakeAmount || DEFAULT_MIN_STAKE}{" "}
                                  <UsdtLabel size={12} />
                                </span>
                              ) : (
                                row.value
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <motion.button
                      type="button"
                      onClick={handleConfirm}
                      disabled={isCreating}
                      whileTap={isCreating ? {} : { scale: 0.97 }}
                      className="w-full rounded-full bg-gray-900 py-4 text-base font-semibold text-white cursor-pointer disabled:bg-gray-200 disabled:text-muted disabled:cursor-not-allowed"
                    >
                      Create Prediction
                    </motion.button>

                    <button
                      type="button"
                      onClick={() => setSheetOpen(false)}
                      className="w-full mt-3 text-sm font-medium text-muted cursor-pointer text-center"
                    >
                      Go back and edit
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
