"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  HiOutlineArrowRight,
  HiOutlineClock,
  HiOutlineFunnel,
  HiXMark,
} from "react-icons/hi2";
import { TbTargetArrow } from "react-icons/tb";
import { toast } from "sonner";
import { EmojiAvatar, UsdtLabel } from "@/components/shared";
import { useSheetOverflow } from "@/hooks";
import type { GoalResponse } from "@/lib/api/endpoints";
import { circlesApi } from "@/lib/api/endpoints";
import { formatTimeLeft, toAvatar } from "@/lib/utils";

type DetailsGoalsProps = {
  circleId?: string;
};

const STATUS_FILTERS = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Locked", value: "locked" },
  { label: "Resolved", value: "resolved" },
];

const PREVIEW_COUNT = 3;

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-emerald-50 text-emerald-500",
    locked: "bg-amber-50 text-amber-500",
    resolved: "bg-gray-100 text-muted",
    paidout: "bg-gray-100 text-muted",
  };

  return (
    <span
      className={`text-[10px] font-semibold rounded-full px-2 py-0.5 capitalize ${styles[status] || "bg-gray-100 text-muted"}`}
    >
      {status}
    </span>
  );
}

export default function DetailsGoals({ circleId }: DetailsGoalsProps) {
  const [goals, setGoals] = useState<GoalResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  useSheetOverflow(sheetOpen);

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

  const filteredGoals = useMemo(() => {
    if (activeFilter === "all") return goals;
    return goals.filter((g) => g.status === activeFilter);
  }, [goals, activeFilter]);

  const previewGoals = goals.slice(0, PREVIEW_COUNT);
  const hasMore = goals.length > PREVIEW_COUNT;

  return (
    <>
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-main-text">Active Goals</p>
          {goals.length > PREVIEW_COUNT && (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-1 text-xs font-medium text-muted cursor-pointer"
            >
              View all ({goals.length})
              <HiOutlineArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`skel-${i}`} className="flex items-center gap-3 rounded-2xl bg-white p-3 animate-pulse">
                <div className="h-12 w-12 rounded-full bg-gray-100" />
                <div className="flex-1">
                  <div className="h-4 w-32 rounded-lg bg-gray-100 mb-2" />
                  <div className="h-3 w-24 rounded-lg bg-gray-100" />
                </div>
                <div className="h-4 w-12 rounded-lg bg-gray-100" />
              </div>
            ))}
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
            {previewGoals.map((g, i) => (
              <GoalCard key={g.id} goal={g} index={i} />
            ))}
            {hasMore && (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-medium text-muted cursor-pointer transition-all duration-200 active:scale-[0.98]"
              >
                <HiOutlineFunnel className="w-4 h-4" />
                View all {goals.length} goals
              </button>
            )}
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
              <div className="flex items-start justify-between px-6 pt-6 pb-3 shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-main-text">
                    All Goals
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {filteredGoals.length} of {goals.length} goals
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

              <div className="flex gap-2 px-6 pb-4 overflow-x-auto scrollbar-none">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setActiveFilter(f.value)}
                    className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium cursor-pointer transition-all duration-200 ${
                      activeFilter === f.value
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-muted"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-8">
                {filteredGoals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 mb-4">
                      <TbTargetArrow className="w-7 h-7 text-muted" />
                    </div>
                    <p className="text-base font-semibold text-main-text mb-1">
                      No {activeFilter} goals
                    </p>
                    <p className="text-sm text-muted">
                      Try a different filter
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredGoals.map((g, i) => (
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
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-main-text truncate">
                              {g.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted inline-flex items-center gap-1">
                                {g.minStake} <UsdtLabel size={10} />
                              </span>
                              <span className="text-xs text-muted">
                                {g.participantCount} joined
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <StatusBadge status={g.status} />
                            <span className="text-[10px] text-muted inline-flex items-center gap-0.5">
                              <HiOutlineClock className="w-3 h-3" />
                              {formatTimeLeft(g.deadline)}
                            </span>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
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

function GoalCard({ goal, index }: { goal: GoalResponse; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.08 * index }}
    >
      <Link
        href={`/prediction-detail?id=${goal.id}`}
        className="flex items-center gap-3 rounded-2xl bg-white p-3 cursor-pointer transition-all duration-200 active:scale-[0.98]"
      >
        <EmojiAvatar
          avatar={toAvatar(goal.avatarEmoji, goal.avatarColor)}
          size={48}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-main-text truncate">
            {goal.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted inline-flex items-center gap-1">
              {goal.minStake} <UsdtLabel size={12} />
            </span>
            <span className="text-xs text-muted">·</span>
            <span className="text-xs text-muted">
              {goal.participantCount} joined
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <HiOutlineClock className="w-3.5 h-3.5 text-muted" />
          <span className="text-xs font-medium text-main-text">
            {formatTimeLeft(goal.deadline)}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
