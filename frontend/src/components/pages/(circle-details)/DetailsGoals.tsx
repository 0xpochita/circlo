"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HiOutlineArrowRight, HiOutlineClock } from "react-icons/hi2";
import { TbTargetArrow } from "react-icons/tb";
import { toast } from "sonner";
import { EmojiAvatar, UsdtLabel } from "@/components/shared";
import type { GoalResponse } from "@/lib/api/endpoints";
import { circlesApi } from "@/lib/api/endpoints";
import { formatTimeLeft, toAvatar } from "@/lib/utils";

type DetailsGoalsProps = {
  circleId?: string;
};

export default function DetailsGoals({ circleId }: DetailsGoalsProps) {
  const [goals, setGoals] = useState<GoalResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!circleId) {
      setLoading(false);
      return;
    }

    circlesApi
      .goals(circleId)
      .then((res) => setGoals(res.items))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [circleId]);

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-main-text">Active Goals</p>
        <button
          type="button"
          className="flex items-center gap-1 text-xs font-medium text-muted cursor-pointer"
        >
          View all
          <HiOutlineArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl bg-white py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-brand" />
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-10 px-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 mb-3">
            <TbTargetArrow className="w-6 h-6 text-muted" />
          </div>
          <p className="text-sm font-semibold text-main-text mb-1">
            No goals yet
          </p>
          <p className="text-xs text-muted text-center">
            Create the first goal for this circle
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {goals.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 * i }}
            >
              <Link
                href={`/prediction-detail?id=${g.id}`}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 cursor-pointer transition-all duration-200 active:scale-[0.98]"
              >
                <EmojiAvatar
                  avatar={toAvatar(g.avatarEmoji, g.avatarColor)}
                  size={48}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-main-text truncate">
                    {g.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted inline-flex items-center gap-1">
                      {g.minStake} <UsdtLabel size={12} />
                    </span>
                    <span className="text-xs text-muted">·</span>
                    <span className="text-xs text-muted">
                      {g.participantCount} joined
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <HiOutlineClock className="w-3.5 h-3.5 text-muted" />
                  <span className="text-xs font-medium text-main-text">
                    {formatTimeLeft(g.deadline)}
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
