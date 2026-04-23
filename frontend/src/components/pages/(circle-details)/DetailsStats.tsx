"use client";

import { useEffect, useState } from "react";
import { UsdtLabel } from "@/components/shared";
import type { CircleDetailResponse, GoalResponse } from "@/lib/api/endpoints";
import { circlesApi, goalsApi } from "@/lib/api/endpoints";

type DetailsStatsProps = {
  circleId?: string;
  circle?: CircleDetailResponse;
};

type GoalDetail = GoalResponse & {
  participationSummary?: { side: string; totalStaked: string; count: number }[];
};

function formatStake(total: number): string {
  return total < 1 ? total.toFixed(4) : total.toFixed(2);
}

export default function DetailsStats({ circleId, circle }: DetailsStatsProps) {
  const [memberCount, setMemberCount] = useState(circle?.memberCount ?? 0);
  const [goalCount, setGoalCount] = useState(0);
  const [totalStaked, setTotalStaked] = useState(0);

  useEffect(() => {
    if (!circleId) return;
    Promise.all([
      circlesApi.members(circleId).catch(() => null),
      circlesApi.goals(circleId).catch(() => null),
    ]).then(async ([membersRes, goalsRes]) => {
      setMemberCount(membersRes?.items?.length ?? 0);
      const goals = goalsRes?.items ?? [];
      setGoalCount(goals.length);

      const details = await Promise.all(
        goals.map((g) =>
          goalsApi.detail(g.id).catch(() => null) as Promise<GoalDetail | null>,
        ),
      );
      const sum = details.reduce((acc, d) => {
        if (!d?.participationSummary) return acc;
        return (
          acc +
          d.participationSummary.reduce(
            (s, p) => s + (parseFloat(p.totalStaked) || 0),
            0,
          )
        );
      }, 0);
      setTotalStaked(sum);
    });
  }, [circleId]);

  const stats = [
    { value: String(memberCount), label: "Members", usdt: false },
    { value: String(goalCount), label: "Active goals", usdt: false },
    { value: formatStake(totalStaked), label: "Total staked", usdt: true },
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
