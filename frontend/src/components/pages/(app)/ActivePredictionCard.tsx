"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HiChevronRight } from "react-icons/hi2";
import { EmojiAvatar } from "@/components/shared";
import type { GoalResponse } from "@/lib/api/endpoints";
import { goalsApi } from "@/lib/api/endpoints";
import { formatTimeLeft, toAvatar } from "@/lib/utils";
import { useDataCache } from "@/stores/dataCache";

export default function ActivePredictionCard() {
  const cached = useDataCache((s) => s.feedGoal);
  const isStale = useDataCache((s) => s.isStale);
  const setFeedGoal = useDataCache((s) => s.setFeedGoal);
  const hasCached = cached !== null;
  const [goal, setGoal] = useState<GoalResponse | null>(cached);
  const [isLoading, setIsLoading] = useState(!hasCached);

  useEffect(() => {
    if (!isStale("feedGoal") && hasCached) {
      setGoal(cached);
      return;
    }

    goalsApi
      .feed()
      .then((res) => {
        const first = res.items.length > 0 ? res.items[0] : null;
        setGoal(first);
        setFeedGoal(first);
      })
      .catch(() => {
        if (!hasCached) setGoal(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return null;

  if (!goal) return null;

  return (
    <div className="px-4 py-2">
      <Link
        href={`/prediction-detail?id=${goal.id}`}
        className="flex items-center justify-between rounded-2xl bg-white p-4 cursor-pointer transition-all duration-200 active:scale-[0.97]"
      >
        <div className="flex items-center gap-3">
          <EmojiAvatar
            avatar={toAvatar(goal.avatarEmoji, goal.avatarColor)}
            size={44}
          />
          <div>
            <p className="text-base font-semibold text-main-text">
              {goal.title}
            </p>
            <p className="text-sm text-muted">
              Ends in {formatTimeLeft(goal.deadline)}
            </p>
          </div>
        </div>
        <HiChevronRight className="w-5 h-5 text-muted shrink-0" />
      </Link>
    </div>
  );
}
