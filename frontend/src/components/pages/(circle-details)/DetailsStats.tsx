"use client";

import { useState, useEffect } from "react";
import { UsdtLabel } from "@/components/shared";
import { circlesApi } from "@/lib/api/endpoints";
import type { CircleDetailResponse } from "@/lib/api/endpoints";

type DetailsStatsProps = {
  circleId?: string;
  circle?: CircleDetailResponse;
};

export default function DetailsStats({ circleId, circle }: DetailsStatsProps) {
  const [memberCount, setMemberCount] = useState(circle?.memberCount ?? 0);
  const [goalCount, setGoalCount] = useState(0);

  useEffect(() => {
    if (!circleId) return;
    circlesApi.members(circleId).then((res) => setMemberCount(res.items?.length ?? 0)).catch(() => {});
    circlesApi.goals(circleId).then((res) => setGoalCount(res.items?.length ?? 0)).catch(() => {});
  }, [circleId]);

  const stats = [
    { value: String(memberCount), label: "Members", usdt: false },
    { value: String(goalCount), label: "Active goals", usdt: false },
    { value: "0", label: "Total staked", usdt: true },
  ];

  return (
    <div className="px-4 py-2">
      <div className="flex items-center rounded-2xl bg-white p-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`flex-1 text-center ${i !== stats.length - 1 ? "border-r border-gray-100" : ""}`}
          >
            <p className="text-xl font-bold text-main-text inline-flex items-center gap-1">
              {stat.value}
              {stat.usdt && <UsdtLabel size={14} className="text-xs font-medium" />}
            </p>
            <p className="mt-1 text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
