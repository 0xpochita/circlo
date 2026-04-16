"use client";

import { useEffect, useState } from "react";
import { UsdtLabel } from "@/components/shared";
import { circlesApi } from "@/lib/api/endpoints";

type CircleStatsProps = {
  circleId?: string | null;
};

export default function CircleStats({ circleId }: CircleStatsProps) {
  const [memberCount, setMemberCount] = useState(0);
  const [goalCount, setGoalCount] = useState(0);

  useEffect(() => {
    if (!circleId) return;
    Promise.all([
      circlesApi
        .members(circleId)
        .then((res) => setMemberCount(res.items?.length ?? 0))
        .catch(() => {}),
      circlesApi
        .goals(circleId)
        .then((res) => setGoalCount(res.items?.length ?? 0))
        .catch(() => {}),
    ]);
  }, [circleId]);

  const stats = [
    {
      value: String(memberCount).padStart(2, "0"),
      label: "Members",
      usdt: false,
    },
    {
      value: String(goalCount).padStart(2, "0"),
      label: "Predictions",
      usdt: false,
    },
    { value: "0", label: "Total staked", usdt: true },
  ];

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-main-text">Circle Stats</p>
        <button
          type="button"
          className="rounded-full border border-gray-100 bg-white px-4 py-1.5 text-xs font-medium text-main-text cursor-pointer transition-all duration-200 active:scale-[0.95]"
        >
          View Details
        </button>
      </div>
      <div className="flex items-center rounded-2xl bg-white p-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`flex-1 text-center ${i !== stats.length - 1 ? "border-r border-gray-100" : ""}`}
          >
            <p className="text-xl font-bold text-main-text inline-flex items-center gap-1">
              {stat.value}
              {stat.usdt && (
                <UsdtLabel size={14} className="text-xs font-medium" />
              )}
            </p>
            <p className="mt-1 text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
