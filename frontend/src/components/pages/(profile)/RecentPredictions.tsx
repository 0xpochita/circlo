"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HiOutlineChartBar, HiXMark } from "react-icons/hi2";
import { EmojiAvatar, UsdtLabel } from "@/components/shared";
import { useSheetOverflow } from "@/hooks";
import type { GoalResponse } from "@/lib/api/endpoints";
import { goalsApi } from "@/lib/api/endpoints";
import { toAvatar } from "@/lib/utils";

function getResultLabel(goal: GoalResponse): {
  label: string;
  positive: boolean;
} {
  if (goal.status === "resolved" || goal.status === "claimed") {
    if (goal.winningSide === "yes") return { label: "Won", positive: true };
    return { label: "Lost", positive: false };
  }
  return { label: "Active", positive: true };
}

export default function RecentPredictions() {
  const [goals, setGoals] = useState<GoalResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  useSheetOverflow(sheetOpen);

  useEffect(() => {
    goalsApi
      .mine()
      .then((res) => setGoals(res.items))
      .catch(() => setGoals([]))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-main-text">
            Recent predictions
          </p>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`skel-${i}`}
              className="animate-pulse min-w-[160px] rounded-2xl bg-white p-1"
            >
              <div className="aspect-square rounded-2xl bg-gray-50 p-3 flex flex-col justify-between">
                <div className="h-10 w-10 rounded-full bg-gray-100" />
                <div className="h-3 w-20 rounded-lg bg-gray-100" />
              </div>
              <div className="px-2 py-2 flex items-center gap-1.5">
                <div className="h-4 w-16 rounded-lg bg-gray-100" />
                <div className="h-3 w-10 rounded-lg bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-main-text">
            Recent predictions
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-8 px-4">
          <p className="text-sm text-muted">No predictions yet</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-main-text">Recent predictions</p>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="text-sm font-medium text-muted cursor-pointer"
          >
            See all
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
          {goals.slice(0, 5).map((g) => {
            const result = getResultLabel(g);
            return (
              <Link
                key={g.id}
                href={`/prediction-detail?id=${g.id}`}
                className="flex min-w-[160px] flex-col rounded-2xl bg-white p-1 cursor-pointer transition-all duration-200 active:scale-[0.97]"
              >
                <div className="flex aspect-square flex-col justify-between rounded-2xl bg-gray-50 p-3">
                  <div>
                    <EmojiAvatar
                      avatar={toAvatar(g.avatarEmoji, g.avatarColor)}
                      size={40}
                      shape="square"
                    />
                  </div>
                  <p className="text-sm text-muted">{g.title}</p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-2">
                  <p className="text-base font-bold text-main-text inline-flex items-center gap-1">
                    {g.minStake} <UsdtLabel size={12} />
                  </p>
                  <p
                    className={`text-xs font-medium ${result.positive ? "text-emerald-500" : "text-red-400"}`}
                  >
                    {result.label}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
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
              className="fixed bottom-0 left-1/2 z-101 w-full max-w-md -translate-x-1/2 flex flex-col rounded-t-3xl bg-white"
              style={{ maxHeight: "85dvh" }}
            >
              <div className="flex items-start justify-between px-6 pt-6 pb-4 shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-main-text">
                    All Predictions
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {goals.length} prediction{goals.length !== 1 ? "s" : ""} total
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 cursor-pointer transition-all duration-200 active:scale-95"
                >
                  <HiXMark className="w-5 h-5 text-main-text" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-8">
                {goals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 mb-4">
                      <HiOutlineChartBar className="w-7 h-7 text-muted" />
                    </div>
                    <p className="text-base font-semibold text-main-text mb-1">
                      No predictions yet
                    </p>
                    <p className="text-sm text-muted">
                      Create or join a prediction to get started
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {goals.map((g, i) => {
                      const result = getResultLabel(g);
                      return (
                        <motion.div
                          key={g.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.05 * i }}
                        >
                          <Link
                            href={`/prediction-detail?id=${g.id}`}
                            onClick={() => setSheetOpen(false)}
                            className="flex items-center gap-3 rounded-2xl p-3 bg-gray-50 cursor-pointer transition-all duration-200 active:scale-[0.98]"
                          >
                            <EmojiAvatar
                              avatar={toAvatar(g.avatarEmoji, g.avatarColor)}
                              size={44}
                              shape="square"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-main-text truncate">
                                {g.title}
                              </p>
                              <p className="text-xs text-muted inline-flex items-center gap-1">
                                {g.minStake} <UsdtLabel size={10} /> min stake
                              </p>
                            </div>
                            <span
                              className={`text-xs font-semibold rounded-full px-3 py-1 ${
                                result.positive
                                  ? "bg-emerald-50 text-emerald-500"
                                  : "bg-red-50 text-red-400"
                              }`}
                            >
                              {result.label}
                            </span>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
