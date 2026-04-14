"use client";

import { useEffect, useState } from "react";
import { UsdtLabel } from "@/components/shared";
import { circlesApi } from "@/lib/api/endpoints";

export default function CirclesStats() {
  const [circleCount, setCircleCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    circlesApi
      .list()
      .then((res) => setCircleCount(res.items?.length ?? 0))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="px-4 py-2">
        <div className="flex items-center rounded-2xl bg-white p-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`stat-skel-${i}`}
              className={`flex-1 flex flex-col items-center gap-1 ${i !== 2 ? "border-r border-gray-100" : ""}`}
            >
              <div className="h-6 w-8 rounded-lg bg-gray-100" />
              <div className="h-3 w-14 rounded-lg bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    { value: String(circleCount).padStart(2, "0"), label: "Circles", usdt: false },
    { value: "--", label: "Active goals", usdt: false },
    { value: "0", label: "Staked", usdt: true },
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
