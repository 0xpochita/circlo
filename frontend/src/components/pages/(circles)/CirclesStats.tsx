"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UsdtLabel } from "@/components/shared";
import { circlesApi } from "@/lib/api/endpoints";

export default function CirclesStats() {
  const [circleCount, setCircleCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    circlesApi
      .list()
      .then((res) => setCircleCount(res.items.length))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { value: loading ? "--" : String(circleCount).padStart(2, "0"), label: "Circles", usdt: false },
    { value: "--", label: "Active goals", usdt: false },
    { value: "--", label: "Staked", usdt: true },
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
