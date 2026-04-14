"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { HiChevronRight } from "react-icons/hi2";
import { EmojiAvatar } from "@/components/shared/EmojiAvatar";
import { goalsApi } from "@/lib/api/endpoints";
import type { GoalResponse } from "@/lib/api/endpoints";
import { toAvatar, formatTimeLeft } from "@/lib/utils";

export default function ActivePredictionCard() {
  const [goal, setGoal] = useState<GoalResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    goalsApi
      .feed()
      .then((res) => {
        setGoal(res.items.length > 0 ? res.items[0] : null);
      })
      .catch(() => {
        setGoal(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="px-4 py-2">
        <div className="animate-pulse rounded-2xl bg-white p-4 flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-gray-100 shrink-0" />
          <div className="flex-1">
            <div className="h-4 w-48 rounded-lg bg-gray-100 mb-2" />
            <div className="h-3 w-32 rounded-lg bg-gray-100" />
          </div>
          <div className="h-5 w-5 rounded bg-gray-100 shrink-0" />
        </div>
      </div>
    );
  }

  if (!goal) return null;

  return (
    <div className="px-4 py-2">
      <Link
        href={`/prediction-detail?id=${goal.id}`}
        className="flex items-center justify-between rounded-2xl bg-white p-4 cursor-pointer transition-all duration-200 active:scale-[0.97]"
      >
        <div className="flex items-center gap-3">
          <EmojiAvatar avatar={toAvatar(goal.avatarEmoji, goal.avatarColor)} size={44} />
          <div>
            <p className="text-base font-semibold text-main-text">{goal.title}</p>
            <p className="text-sm text-muted">Ends in {formatTimeLeft(goal.deadline)}</p>
          </div>
        </div>
        <HiChevronRight className="w-5 h-5 text-muted shrink-0" />
      </Link>
    </div>
  );
}
