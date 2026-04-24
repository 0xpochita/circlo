"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { HiCheck, HiXMark } from "react-icons/hi2";
import { toast } from "sonner";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { UsdtLabel } from "@/components/shared";
import { useSheetOverflow } from "@/hooks";
import { circlesApi, goalsApi } from "@/lib/api/endpoints";
import { normalizeSide } from "@/lib/utils";
import { NETWORK } from "@/lib/web3/network";
import {
  circleFactoryContract,
  mockUSDTContract,
  predictionPoolContract,
  resolutionModuleContract,
} from "@/lib/web3/contracts";
import { DEFAULT_MIN_STAKE, fromUSDT, toUSDT } from "@/lib/web3/usdt";
import { useAuthStore } from "@/stores/authStore";

type ResolverInfo = {
  userId: string;
  vote: number | null;
  user: { id: string; walletAddress?: string; name: string | null };
};

type StakeButtonProps = {
  goalId?: string;
  goalChainId?: string;
  status?: string;
  winningSide?: string | null;
  deadline?: string;
  minStake?: string;
  resolvers?: ResolverInfo[];
  onStaked?: () => void;
};

type StepStatus = "pending" | "active" | "done" | "error";

type Step = {
  label: string;
  status: StepStatus;
};

export default function StakeButton({
  goalId,
  goalChainId,
  status,
  winningSide,
  deadline,
  minStake,
  resolvers,
  onStaked,
}: StakeButtonProps) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [resolveSheetOpen, setResolveSheetOpen] = useState(false);
  const [resolveChoice, setResolveChoice] = useState<number | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [amount, setAmount] = useState("");
  const [selectedSide, setSelectedSide] = useState<number | null>(null);
  const [isStaking, setIsStaking] = useState(false);
  const [myStake, setMyStake] = useState<{
    side: number;
    amount: string;
    claimedAmount: string | null;
  } | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [hasParticipants, setHasParticipants] = useState<boolean | null>(null);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => () => timeoutRefs.current.forEach(clearTimeout), []);

  const isOpen = !status || status === "open";
  const isResolved = status === "resolved" || status === "paidout";
  const canResolve = status === "locked" || status === "resolving";
  const isResolver =
    resolvers?.some(
      (r) =>
        r.user?.walletAddress?.toLowerCase() === address?.toLowerCase() ||
        r.userId === address,
    ) ?? false;
  const hasVoted =
    resolvers?.some(
      (r) =>
        (r.user?.walletAddress?.toLowerCase() === address?.toLowerCase() ||
          r.userId === address) &&
        r.vote !== null,
    ) ?? false;
  const deadlinePassed = deadline
    ? new Date(deadline).getTime() < Date.now()
    : false;
  const hasStaked = myStake !== null;

  const normalizedWinningSide = normalizeSide(winningSide);
  const isWinner =
    hasStaked &&
    normalizedWinningSide !== null &&
    normalizeSide(myStake.side) === normalizedWinningSide;
  const canClaim =
    isWinner && isResolved && !hasClaimed && !myStake.claimedAmount;

  useEffect(() => {
    if (!goalId || !isConnected || !address) return;

    let cancelled = false;

    goalsApi
      .myStake(goalId)
      .then((res) => {
        if (cancelled) return;
        if (res.staked && res.data) {
          setMyStake({
            side: res.data.side,
            amount: res.data.amount,
            claimedAmount: res.data.claimedAmount,
          });
          if (res.data.claimedAmount) setHasClaimed(true);
        }
      })
      .catch(() => {});

    if (goalChainId && publicClient) {
      const chainId = BigInt(goalChainId);
      Promise.all([
        publicClient.readContract({
          address: predictionPoolContract.address,
          abi: predictionPoolContract.abi,
          functionName: "stakeOf",
          args: [chainId, address, 0],
        }),
        publicClient.readContract({
          address: predictionPoolContract.address,
          abi: predictionPoolContract.abi,
          functionName: "stakeOf",
          args: [chainId, address, 1],
        }),
      ])
        .then(([yesStake, noStake]) => {
          if (cancelled) return;
          const yesAmount = fromUSDT(yesStake as bigint);
          const noAmount = fromUSDT(noStake as bigint);
          if (yesAmount > 0) {
            setMyStake(
              (prev) =>
                prev ?? {
                  side: 0,
                  amount: String(yesAmount),
                  claimedAmount: null,
                },
            );
          } else if (noAmount > 0) {
            setMyStake(
              (prev) =>
                prev ?? {
                  side: 1,
                  amount: String(noAmount),
                  claimedAmount: null,
                },
            );
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [goalId, goalChainId, isConnected, address, publicClient]);

  useEffect(() => {
    if (!goalChainId || !publicClient) return;
    let cancelled = false;
    const chainId = BigInt(goalChainId);

    Promise.all([
      publicClient.readContract({
        address: predictionPoolContract.address,
        abi: predictionPoolContract.abi,
        functionName: "poolPerSide",
        args: [chainId, 0],
      }),
      publicClient.readContract({
        address: predictionPoolContract.address,
        abi: predictionPoolContract.abi,
        functionName: "poolPerSide",
        args: [chainId, 1],
      }),
    ])
      .then(([yesPool, noPool]) => {
        if (cancelled) return;
        const total = (yesPool as bigint) + (noPool as bigint);
        setHasParticipants(total > BigInt(0));
      })
      .catch(() => {
        if (!cancelled) setHasParticipants(null);
      });

    return () => {
      cancelled = true;
    };
  }, [goalChainId, publicClient]);

  useSheetOverflow(sheetOpen);

  function handleOpen() {
    if (!isConnected || !isAuthenticated) {
      localStorage.setItem("circlo-redirect-after-login", window.location.href);
      router.push("/welcome");
      return;
    }
    if (!isOpen) {
      toast("Staking is closed for this goal");
      return;
    }
    setSteps([]);
    if (!amount && minStake && parseFloat(minStake) > 0) {
      setAmount(String(parseFloat(minStake)));
    }
    setSheetOpen(true);
  }

  function updateStep(index: number, s: StepStatus) {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, status: s } : step)),
    );
  }

  async function handleConfirmStake() {
    if (selectedSide === null) {
      toast("Pick Yes or No");
      return;
    }
    const parsed = parseFloat(amount);
    if (Number.isNaN(parsed) || parsed <= 0) {
      toast("Enter a valid amount");
      return;
    }
    const minStakeNum = parseFloat(minStake || "0");
    if (minStakeNum > 0 && parsed < minStakeNum) {
      toast.error(`Minimum stake is ${minStakeNum} USDT`);
      return;
    }

    let chainId = goalChainId;
    if (!chainId && goalId) {
      try {
        const detail = await goalsApi.detail(goalId);
        chainId = (detail as unknown as { chainId?: string }).chainId || "";
      } catch {}
    }

    const needsDeploy = !chainId && goalId;
    const stepsToRun: Step[] = [];

    if (needsDeploy) {
      stepsToRun.push({ label: "Deploy goal on-chain", status: "pending" });
    }
    stepsToRun.push({ label: "Join circle (if needed)", status: "pending" });
    stepsToRun.push({ label: "Approve USDT", status: "pending" });
    stepsToRun.push({ label: "Place stake", status: "pending" });

    setSteps(stepsToRun);
    setIsStaking(true);
    let stepIdx = 0;

    try {
      if (needsDeploy && goalId) {
        updateStep(stepIdx, "active");

        const goalDetail = await goalsApi.detail(goalId);
        const gd = goalDetail as unknown as {
          circleId: string;
          deadline: string;
          minStake: string;
          metadataUri?: string;
          title: string;
        };

        let circleChainId = "";
        try {
          const circle = await circlesApi.detail(gd.circleId);
          circleChainId = circle.chainId || "";
        } catch {}

        if (!circleChainId && publicClient) {
          const nextCircle = Number(
            await publicClient
              .readContract({
                address: circleFactoryContract.address,
                abi: circleFactoryContract.abi,
                functionName: "nextCircleId",
              })
              .catch(() => BigInt(0)),
          );

          if (nextCircle > 0) {
            let circleName = "Circle";
            let circlePrivacy = false;
            try {
              const cd = await circlesApi.detail(gd.circleId);
              circleName = cd.name || "Circle";
              circlePrivacy = cd.privacy === "private";
            } catch {}

            await writeContractAsync({
              address: circleFactoryContract.address,
              abi: circleFactoryContract.abi,
              functionName: "createCircle",
              args: [circlePrivacy, JSON.stringify({ name: circleName })],
            });
            circleChainId = String(nextCircle);
          }
        }

        if (!circleChainId) {
          updateStep(stepIdx, "error");
          toast.error("Could not deploy circle");
          setIsStaking(false);
          return;
        }

        const nextGoal = publicClient
          ? Number(
              await publicClient
                .readContract({
                  address: predictionPoolContract.address,
                  abi: predictionPoolContract.abi,
                  functionName: "nextGoalId",
                })
                .catch(() => BigInt(0)),
            )
          : 0;

        const deadline = BigInt(
          Math.floor(new Date(gd.deadline).getTime() / 1000),
        );
        const minStake = toUSDT(parseFloat(gd.minStake || DEFAULT_MIN_STAKE));
        const metadataURI =
          gd.metadataUri || JSON.stringify({ title: gd.title });

        const gTx = await writeContractAsync({
          address: predictionPoolContract.address,
          abi: predictionPoolContract.abi,
          functionName: "createGoal",
          args: [
            BigInt(circleChainId),
            0,
            deadline,
            minStake,
            [address as `0x${string}`],
            metadataURI,
          ],
        });

        if (publicClient)
          await publicClient.waitForTransactionReceipt({ hash: gTx });
        if (nextGoal > 0) {
          chainId = String(nextGoal);
          try {
            await goalsApi.confirm(goalId, nextGoal, gTx);
          } catch {}
        }

        updateStep(stepIdx, "done");
        stepIdx++;
      }

      if (!chainId || BigInt(chainId) <= BigInt(0)) {
        toast.error("Invalid goal ID");
        setIsStaking(false);
        return;
      }

      const goalOnChainId = BigInt(chainId);

      updateStep(stepIdx, "active");

      if (publicClient && address) {
        const goalData = (await publicClient.readContract({
          address: predictionPoolContract.address,
          abi: predictionPoolContract.abi,
          functionName: "goals",
          args: [goalOnChainId],
        })) as unknown[];
        const onChainCircleId = goalData[0] as bigint;

        const isMember = await publicClient.readContract({
          address: circleFactoryContract.address,
          abi: circleFactoryContract.abi,
          functionName: "isCircleMember",
          args: [onChainCircleId, address],
        });

        if (!isMember) {
          try {
            await publicClient.simulateContract({
              address: circleFactoryContract.address,
              abi: circleFactoryContract.abi,
              functionName: "joinCircle",
              args: [onChainCircleId],
              account: address,
            });
          } catch (simErr) {
            console.error("[Stake] joinCircle simulation failed:", simErr);
            throw simErr;
          }

          const joinTx = await writeContractAsync({
            address: circleFactoryContract.address,
            abi: circleFactoryContract.abi,
            functionName: "joinCircle",
            args: [onChainCircleId],
            chainId: NETWORK.id,
          });
          if (publicClient)
            await publicClient.waitForTransactionReceipt({ hash: joinTx });
        }
      }

      updateStep(stepIdx, "done");
      stepIdx++;

      updateStep(stepIdx, "active");

      const usdtAmount = toUSDT(parsed);
      const approveTx = await writeContractAsync({
        address: mockUSDTContract.address,
        abi: mockUSDTContract.abi,
        functionName: "approve",
        args: [predictionPoolContract.address, usdtAmount],
      });
      if (publicClient)
        await publicClient.waitForTransactionReceipt({ hash: approveTx });

      updateStep(stepIdx, "done");
      stepIdx++;

      updateStep(stepIdx, "active");

      const stakeTx = await writeContractAsync({
        address: predictionPoolContract.address,
        abi: predictionPoolContract.abi,
        functionName: "stake",
        args: [goalOnChainId, selectedSide, usdtAmount],
      });

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: stakeTx,
        });
        if (receipt.status === "reverted") {
          updateStep(stepIdx, "error");
          toast.error("Stake reverted on-chain");
          setIsStaking(false);
          return;
        }
      }

      updateStep(stepIdx, "done");

      setMyStake({
        side: selectedSide,
        amount: String(parsed),
        claimedAmount: null,
      });
      toast.success("Stake placed!");
      const t1 = setTimeout(() => {
        setSheetOpen(false);
        setAmount("");
        setSelectedSide(null);
        setSteps([]);
        if (onStaked) {
          const t2 = setTimeout(onStaked, 1000);
          timeoutRefs.current.push(t2);
        }
      }, 1500);
      timeoutRefs.current.push(t1);
    } catch (err) {
      console.error("[Stake] Transaction failed:", err);
      const errObj = err as {
        shortMessage?: string;
        message?: string;
        name?: string;
        code?: number | string;
        cause?: { shortMessage?: string; message?: string };
      };
      const shortMsg =
        errObj?.shortMessage ||
        errObj?.cause?.shortMessage ||
        errObj?.cause?.message ||
        errObj?.message ||
        "Unknown error";
      const message = shortMsg;

      if (
        message.includes("User rejected") ||
        message.includes("User denied") ||
        errObj?.name === "UserRejectedRequestError"
      ) {
        toast("Transaction cancelled");
      } else if (message.includes("CircleIsPrivate")) {
        toast.error("This is a private circle — you need an invite");
      } else if (
        message.includes("insufficient funds") ||
        message.includes("insufficient balance")
      ) {
        toast.error("Insufficient CELO for gas");
      } else if (message.includes("AlreadyMember")) {
        toast.error("Already a circle member — try again");
      } else if (
        message.includes("unknown RPC error") ||
        message.includes("Internal JSON-RPC")
      ) {
        toast.error("Wallet/RPC error — try disconnect + reconnect wallet");
      } else {
        toast.error(`Failed: ${message.slice(0, 120)}`);
      }
      setSteps((prev) =>
        prev.map((s) =>
          s.status === "active" ? { ...s, status: "error" } : s,
        ),
      );
    } finally {
      setIsStaking(false);
    }
  }

  async function handleResolve() {
    if (resolveChoice === null) {
      toast("Pick Yes or No");
      return;
    }
    if (!goalChainId) {
      toast.error("Goal not on-chain");
      return;
    }

    setIsResolving(true);
    try {
      const txHash = await writeContractAsync({
        address: resolutionModuleContract.address,
        abi: resolutionModuleContract.abi,
        functionName: "submitVote",
        args: [BigInt(goalChainId), resolveChoice],
      });
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
        });
        if (receipt.status === "reverted") {
          toast.error("Vote failed on-chain");
          setIsResolving(false);
          return;
        }
      }
      toast.success("Vote submitted!");
      setResolveSheetOpen(false);
      if (onStaked) {
        const t = setTimeout(onStaked, 1000);
        timeoutRefs.current.push(t);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("User rejected") || msg.includes("denied")) {
        toast("Transaction cancelled");
      } else {
        toast.error("Failed to submit vote");
      }
    } finally {
      setIsResolving(false);
    }
  }

  async function handleClaim() {
    if (!goalChainId) {
      toast.error("Goal not on-chain");
      return;
    }

    setIsClaiming(true);
    try {
      const txHash = await writeContractAsync({
        address: predictionPoolContract.address,
        abi: predictionPoolContract.abi,
        functionName: "claim",
        args: [BigInt(goalChainId)],
      });
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
        });
        if (receipt.status === "reverted") {
          toast.error("Claim failed on-chain");
          setIsClaiming(false);
          return;
        }
      }
      setHasClaimed(true);
      setMyStake((prev) =>
        prev ? { ...prev, claimedAmount: prev.amount } : prev,
      );
      toast.success("Reward claimed!");
      if (onStaked) {
        const t = setTimeout(onStaked, 1000);
        timeoutRefs.current.push(t);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("User rejected") || msg.includes("denied")) {
        toast("Transaction cancelled");
      } else {
        toast.error("Failed to claim reward");
      }
    } finally {
      setIsClaiming(false);
    }
  }

  function getTimeUntilDeadline(): string {
    if (!deadline) return "";
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return "";
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `${days}d ${hours}h`;
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  }

  function StepIndicator({ step }: { step: Step }) {
    return (
      <div className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
            step.status === "done"
              ? "bg-emerald-500"
              : step.status === "active"
                ? "bg-brand"
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
      </div>
    );
  }

  return (
    <>
      <div className="sticky bottom-0 left-0 right-0 bg-main-bg px-4 pb-8 pt-3 mt-auto flex flex-col gap-2">
        {hasStaked && (
          <div className="flex items-center justify-between rounded-full bg-white px-5 py-3">
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wide">
                Your stake
              </p>
              <p className="text-sm font-bold text-main-text inline-flex items-center gap-1">
                {myStake.amount} <UsdtLabel size={12} /> on{" "}
                {normalizeSide(myStake.side) === 0 ? "Yes" : "No"}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                hasClaimed || myStake.claimedAmount
                  ? "bg-emerald-50 text-emerald-500"
                  : isResolved && isWinner
                    ? "bg-amber-50 text-amber-500"
                    : isResolved && !isWinner
                      ? "bg-red-50 text-red-400"
                      : normalizeSide(myStake.side) === 0
                        ? "bg-emerald-50 text-emerald-500"
                        : "bg-red-50 text-red-400"
              }`}
            >
              {hasClaimed || myStake.claimedAmount
                ? "Claimed"
                : isResolved && isWinner
                  ? "Won"
                  : isResolved && !isWinner
                    ? "Lost"
                    : "Staked"}
            </span>
          </div>
        )}

        {canClaim && (
          <motion.button
            type="button"
            onClick={handleClaim}
            disabled={isClaiming}
            whileTap={isClaiming ? {} : { scale: 0.97 }}
            className="w-full rounded-full bg-emerald-500 py-4 text-base font-semibold text-white cursor-pointer disabled:bg-gray-200 disabled:text-muted disabled:cursor-not-allowed"
          >
            {isClaiming ? "Claiming..." : "Claim Reward"}
          </motion.button>
        )}

        {hasStaked && isResolved && !isWinner && (
          <div className="flex items-center justify-center rounded-full bg-gray-50 px-5 py-3">
            <p className="text-sm font-medium text-muted">
              Better luck next time
            </p>
          </div>
        )}

        {hasStaked && (hasClaimed || myStake.claimedAmount) && (
          <div className="flex items-center justify-center rounded-full bg-emerald-50 px-5 py-3">
            <p className="text-sm font-medium text-emerald-500">
              Reward collected
            </p>
          </div>
        )}

        {isResolver &&
          !hasVoted &&
          canResolve &&
          (deadlinePassed && hasParticipants === false ? (
            <div className="rounded-2xl bg-gray-50 ring-1 ring-gray-100 px-5 py-4 text-center">
              <p className="text-sm font-semibold text-main-text mb-1">
                Nothing to resolve
              </p>
              <p className="text-xs text-muted">
                No one staked on this market. There&apos;s no outcome to vote
                on.
              </p>
            </div>
          ) : (
            <motion.button
              type="button"
              onClick={() =>
                deadlinePassed
                  ? setResolveSheetOpen(true)
                  : toast(`Resolve opens in ${getTimeUntilDeadline()}`)
              }
              whileTap={deadlinePassed ? { scale: 0.97 } : {}}
              className={`w-full rounded-full py-4 text-base font-semibold cursor-pointer transition-all duration-200 ${
                deadlinePassed
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-muted"
              }`}
            >
              {deadlinePassed
                ? "Resolve Market"
                : `Resolve in ${getTimeUntilDeadline()}`}
            </motion.button>
          ))}

        {isResolver && hasVoted && (
          <div className="flex items-center justify-center rounded-full bg-gray-50 px-5 py-3">
            <p className="text-sm font-medium text-muted">You already voted</p>
          </div>
        )}

        {!hasStaked && isOpen && (
          <motion.button
            type="button"
            onClick={handleOpen}
            whileTap={{ scale: 0.97 }}
            className="w-full rounded-full bg-brand py-4 text-base font-semibold text-white cursor-pointer"
          >
            {!isConnected || !isAuthenticated
              ? "Connect to Stake"
              : "Place Stake"}
          </motion.button>
        )}

        {!hasStaked && !isOpen && !isResolver && (
          <div className="flex items-center justify-center rounded-full bg-gray-100 px-5 py-4">
            <p className="text-sm font-medium text-muted">Staking closed</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isStaking && setSheetOpen(false)}
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
                    {steps.length > 0 ? "Processing" : "Place your stake"}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {steps.length > 0
                      ? "Confirm each step in your wallet"
                      : "Pick a side and enter your amount"}
                  </p>
                </div>
                {!isStaking && (
                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 cursor-pointer transition-all duration-200 active:scale-[0.95]"
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
                      >
                        <StepIndicator step={step} />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-main-text mb-2">
                      Your prediction
                    </p>
                    <div className="flex gap-3 mb-5">
                      <button
                        type="button"
                        onClick={() => setSelectedSide(0)}
                        className={`flex-1 rounded-2xl py-4 text-base font-bold cursor-pointer transition-all duration-200 ${
                          selectedSide === 0
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-50 text-muted"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSide(1)}
                        className={`flex-1 rounded-2xl py-4 text-base font-bold cursor-pointer transition-all duration-200 ${
                          selectedSide === 1
                            ? "bg-red-400 text-white"
                            : "bg-gray-50 text-muted"
                        }`}
                      >
                        No
                      </button>
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-main-text">
                        Stake amount
                      </p>
                      {minStake && parseFloat(minStake) > 0 && (
                        <p className="text-xs text-muted inline-flex items-center gap-1">
                          Min: {parseFloat(minStake)} <UsdtLabel size={10} />
                        </p>
                      )}
                    </div>
                    <div
                      className={`rounded-2xl p-4 mb-3 transition-colors ${
                        amount &&
                        parseFloat(amount) > 0 &&
                        minStake &&
                        parseFloat(amount) < parseFloat(minStake)
                          ? "bg-red-50 ring-2 ring-red-200"
                          : "bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={amount}
                          placeholder={minStake || "0"}
                          onChange={(e) =>
                            setAmount(
                              e.target.value
                                .replace(/,/g, ".")
                                .replace(/[^0-9.]/g, ""),
                            )
                          }
                          className="flex-1 bg-transparent text-2xl font-bold text-main-text placeholder:text-muted outline-none"
                        />
                        <UsdtLabel
                          size={16}
                          className="text-sm font-semibold"
                        />
                      </div>
                    </div>

                    {amount &&
                      parseFloat(amount) > 0 &&
                      minStake &&
                      parseFloat(amount) < parseFloat(minStake) && (
                        <p className="text-xs text-red-400 mb-3">
                          Minimum stake is {parseFloat(minStake)} USDT
                        </p>
                      )}

                    <div className="flex gap-2 mb-6">
                      {["1", "5", "10", "50"].map((q) => {
                        const min = parseFloat(minStake || "0");
                        const disabled = min > 0 && parseFloat(q) < min;
                        return (
                          <button
                            type="button"
                            key={q}
                            disabled={disabled}
                            onClick={() => !disabled && setAmount(q)}
                            className={`flex-1 rounded-xl py-2 text-xs font-medium transition-all duration-200 active:scale-95 ${
                              disabled
                                ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                                : amount === q
                                  ? "bg-gray-900 text-white cursor-pointer"
                                  : "bg-gray-50 text-muted cursor-pointer"
                            }`}
                          >
                            {q}
                          </button>
                        );
                      })}
                    </div>

                    <motion.button
                      type="button"
                      onClick={handleConfirmStake}
                      disabled={
                        isStaking ||
                        !amount ||
                        parseFloat(amount) <= 0 ||
                        (!!minStake &&
                          parseFloat(amount) < parseFloat(minStake))
                      }
                      whileTap={isStaking ? {} : { scale: 0.97 }}
                      className="w-full rounded-full bg-gray-900 py-4 text-base font-semibold text-white cursor-pointer disabled:bg-gray-200 disabled:text-muted disabled:cursor-not-allowed"
                    >
                      Confirm Stake
                    </motion.button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {resolveSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isResolving && setResolveSheetOpen(false)}
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
              className="fixed bottom-0 left-1/2 z-101 w-full max-w-md -translate-x-1/2 rounded-t-3xl bg-white px-6 pt-6 pb-8"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-main-text">
                    Resolve Market
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    As a resolver, decide the outcome
                  </p>
                </div>
                {!isResolving && (
                  <button
                    type="button"
                    onClick={() => setResolveSheetOpen(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 cursor-pointer"
                  >
                    <HiXMark className="w-5 h-5 text-main-text" />
                  </button>
                )}
              </div>

              <p className="text-sm font-medium text-main-text mb-3">
                Was the goal achieved?
              </p>
              <div className="flex gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setResolveChoice(0)}
                  className={`flex-1 rounded-2xl py-4 text-base font-bold cursor-pointer transition-all duration-200 ${
                    resolveChoice === 0
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-50 text-muted"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setResolveChoice(1)}
                  className={`flex-1 rounded-2xl py-4 text-base font-bold cursor-pointer transition-all duration-200 ${
                    resolveChoice === 1
                      ? "bg-red-400 text-white"
                      : "bg-gray-50 text-muted"
                  }`}
                >
                  No
                </button>
              </div>

              <motion.button
                type="button"
                onClick={handleResolve}
                disabled={isResolving || resolveChoice === null}
                whileTap={isResolving ? {} : { scale: 0.97 }}
                className="w-full rounded-full bg-amber-500 py-4 text-base font-semibold text-white cursor-pointer disabled:bg-gray-200 disabled:text-muted disabled:cursor-not-allowed"
              >
                {isResolving ? "Submitting vote..." : "Submit Vote"}
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
