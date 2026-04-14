"use client";

import { useState, useEffect } from "react";
import { HiOutlineArrowRight } from "react-icons/hi2";
import { UsdtLabel } from "@/components/shared";
import { goalsApi } from "@/lib/api/endpoints";
import type { GoalResponse } from "@/lib/api/endpoints";
import { toast } from "sonner";

function getResultLabel(goal: GoalResponse): { label: string; positive: boolean } {
  if (goal.status === "resolved" || goal.status === "claimed") {
    if (goal.winningSide === "yes") return { label: "Won", positive: true };
    return { label: "Lost", positive: false };
  }
  return { label: "Active", positive: true };
}

export default function RecentPredictions() {
  const [goals, setGoals] = useState<GoalResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    goalsApi
      .mine()
      .then((res) => setGoals(res.items))
      .catch(() => {
        
        setGoals([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-main-text">Recent predictions</p>
          <button type="button" className="text-sm font-medium text-muted cursor-pointer">
            See all
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`skel-${i}`} className="animate-pulse min-w-[160px] rounded-2xl bg-white p-1">
              <div className="aspect-square rounded-2xl bg-gray-50 p-3 flex flex-col justify-between">
                <div className="h-6 w-6 rounded-lg bg-gray-100" />
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
          <p className="text-base font-bold text-main-text">Recent predictions</p>
          <button type="button" className="text-sm font-medium text-muted cursor-pointer">
            See all
          </button>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-8 px-4">
          <p className="text-sm text-muted">No predictions yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-main-text">Recent predictions</p>
        <button type="button" className="text-sm font-medium text-muted cursor-pointer">
          See all
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
        {goals.map((g) => {
          const result = getResultLabel(g);
          return (
            <div
              key={g.id}
              className="flex min-w-[160px] flex-col rounded-2xl bg-white p-1 cursor-pointer transition-all duration-200 active:scale-[0.97]"
            >
              <div className="flex aspect-square flex-col justify-between rounded-2xl bg-gray-50 p-3">
                <div>
                  <HiOutlineArrowRight className={`w-6 h-6 ${result.positive ? "text-emerald-500 -rotate-45" : "text-red-400 rotate-45"}`} />
                </div>
                <p className="text-sm text-muted">{g.title}</p>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-2">
                <p className="text-base font-bold text-main-text inline-flex items-center gap-1">
                  {g.minStake} <UsdtLabel size={12} />
                </p>
                <p className={`text-xs font-medium ${result.positive ? "text-emerald-500" : "text-red-400"}`}>
                  {result.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
