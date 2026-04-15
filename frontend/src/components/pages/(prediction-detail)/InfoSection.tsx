"use client";

import { useState, useEffect } from "react";
import { EmojiAvatar, UsdtLabel } from "@/components/shared";
import { circlesApi } from "@/lib/api/endpoints";
import { toAvatar } from "@/lib/utils";
import type { GoalResponse } from "@/lib/api/endpoints";

type Resolver = {
  userId: string;
  vote: number | null;
  votedAt: string | null;
  user: {
    name: string | null;
    username: string | null;
    avatarEmoji: string | null;
    avatarColor: string | null;
  };
};

type InfoSectionProps = {
  goal?: (GoalResponse & { resolvers?: Resolver[] }) | null;
};

export default function InfoSection({ goal }: InfoSectionProps) {
  const [circleName, setCircleName] = useState("");

  useEffect(() => {
    if (!goal?.circleId) return;
    circlesApi
      .detail(goal.circleId)
      .then((res) => setCircleName(res.name))
      .catch(() => {});
  }, [goal?.circleId]);

  const createdDate = goal?.createdAt
    ? new Date(goal.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "--";

  const deadlineDate = goal?.deadline
    ? new Date(goal.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "--";

  const info = [
    { label: "Circle", value: circleName || "--" },
    { label: "Start date", value: createdDate },
    { label: "Deadline", value: deadlineDate },
    { label: "Outcome type", value: goal?.outcomeType || "binary" },
    { label: "Minimum stake", value: goal?.minStake || "0.10", usdt: true },
  ];

  const resolvers = goal?.resolvers || [];

  return (
    <div className="px-4 py-2">
      <p className="text-base font-bold text-main-text mb-3">Details</p>
      <div className="rounded-2xl bg-white divide-y divide-gray-50">
        {info.map((item) => (
          <div key={item.label} className="flex items-center justify-between px-4 py-3">
            <p className="text-sm text-muted">{item.label}</p>
            <p className="text-sm font-medium text-main-text inline-flex items-center gap-1">
              {item.value}
              {item.usdt && <UsdtLabel size={12} />}
            </p>
          </div>
        ))}
      </div>

      {resolvers.length > 0 && (
        <>
          <p className="text-base font-bold text-main-text mt-4 mb-3">Resolvers</p>
          <div className="rounded-2xl bg-white divide-y divide-gray-50">
            {resolvers.map((r) => (
              <div key={r.userId} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <EmojiAvatar avatar={toAvatar(r.user.avatarEmoji, r.user.avatarColor)} size={36} />
                  <div>
                    <p className="text-sm font-semibold text-main-text">
                      {r.user.name || r.user.username || "Resolver"}
                    </p>
                    {r.user.username && (
                      <p className="text-xs text-muted">@{r.user.username}</p>
                    )}
                  </div>
                </div>
                {r.vote !== null ? (
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    r.vote === 0 ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-400"
                  }`}>
                    Voted {r.vote === 0 ? "Yes" : "No"}
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-muted">
                    Pending
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
