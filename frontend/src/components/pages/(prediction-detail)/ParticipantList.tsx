"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { HiOutlineUserGroup } from "react-icons/hi2";
import { useAccount, useReadContract } from "wagmi";
import { EmojiAvatar, UsdtLabel } from "@/components/shared";
import { goalsApi } from "@/lib/api/endpoints";
import { predictionPoolContract } from "@/lib/web3/contracts";
import { fromUSDT } from "@/lib/web3/usdt";
import type { ParticipantResponse } from "@/lib/api/endpoints";
import { toAvatar } from "@/lib/utils";
import { useUserStore } from "@/stores/userStore";

type ParticipantListProps = {
  goalId?: string;
  goalChainId?: string;
};

export default function ParticipantList({ goalId, goalChainId }: ParticipantListProps) {
  const [participants, setParticipants] = useState<ParticipantResponse[]>([]);
  const [isLoading, setIsLoading] = useState(!!goalId);
  const { address } = useAccount();
  const userName = useUserStore((s) => s.name);
  const userAvatar = useUserStore((s) => s.avatar);

  const enabled = !!goalChainId && !!address;
  const chainGoalId = goalChainId ? BigInt(goalChainId) : BigInt(0);

  const { data: myYesStake } = useReadContract({
    ...predictionPoolContract,
    functionName: "stakeOf",
    args: [chainGoalId, address as `0x${string}`, 0],
    query: { enabled },
  });

  const { data: myNoStake } = useReadContract({
    ...predictionPoolContract,
    functionName: "stakeOf",
    args: [chainGoalId, address as `0x${string}`, 1],
    query: { enabled },
  });

  useEffect(() => {
    if (!goalId) return;
    goalsApi
      .participants(goalId)
      .then((res) => setParticipants(res.items || []))
      .catch(() => setParticipants([]))
      .finally(() => setIsLoading(false));
  }, [goalId]);

  const myYesAmount = myYesStake ? fromUSDT(myYesStake as bigint) : 0;
  const myNoAmount = myNoStake ? fromUSDT(myNoStake as bigint) : 0;
  const myTotalStake = myYesAmount + myNoAmount;
  const mySide = myYesAmount > 0 ? 0 : myNoAmount > 0 ? 1 : -1;
  const myAmount = mySide === 0 ? myYesAmount : myNoAmount;

  const alreadyInList = participants.some(
    (p) => p.user.walletAddress?.toLowerCase() === address?.toLowerCase()
  );

  const showMyOnChain = myTotalStake > 0 && !alreadyInList && address;

  const totalCount = participants.length + (showMyOnChain ? 1 : 0);

  if (isLoading) {
    return (
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-main-text">Participants</p>
        </div>
        <div className="animate-pulse rounded-2xl bg-white p-4 h-20" />
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-main-text">Participants</p>
          <span className="text-xs text-muted">0 joined</span>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-10 px-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 mb-3">
            <HiOutlineUserGroup className="w-6 h-6 text-muted" />
          </div>
          <p className="text-sm font-semibold text-main-text mb-1">No participants yet</p>
          <p className="text-xs text-muted text-center">Be the first to stake on this goal</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-main-text">Participants</p>
        <span className="text-xs text-muted">{totalCount} joined</span>
      </div>
      <div className="rounded-2xl bg-white divide-y divide-gray-50">
        {showMyOnChain && (
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <EmojiAvatar avatar={userAvatar} size={40} />
              <div>
                <p className="text-sm font-semibold text-main-text">{userName || "You"}</p>
                <p className="text-xs text-muted inline-flex items-center gap-1">
                  Staked {Math.round(myAmount)} <UsdtLabel size={11} />
                </p>
              </div>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${
              mySide === 0 ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-400"
            }`}>
              {mySide === 0 ? "Yes" : "No"}
            </span>
          </motion.div>
        )}

        {participants.map((p, i) => (
          <motion.div
            key={p.userId}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.05 * i }}
            className="flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <EmojiAvatar avatar={toAvatar(p.user.avatarEmoji, p.user.avatarColor)} size={40} />
              <div>
                <p className="text-sm font-semibold text-main-text">{p.user.name || "Member"}</p>
                <p className="text-xs text-muted">
                  {p.user.username ? `@${p.user.username}` : p.user.walletAddress?.slice(0, 10)}
                </p>
                <p className="text-xs text-muted inline-flex items-center gap-1">
                  Staked {Math.round(parseFloat(p.staked))} <UsdtLabel size={11} />
                </p>
              </div>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${
              p.side === 0 ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-400"
            }`}>
              {p.side === 0 ? "Yes" : "No"}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
