"use client";

import { UsdtLabel } from "@/components/shared";

const stats = [
  { value: "03", label: "Friends invited", usdt: false },
  { value: "02", label: "Friends verified", usdt: false },
  { value: "20", label: "Total earned", usdt: true },
];

export default function RewardStats() {
  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-main-text">Your Rewards</p>
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
              {stat.usdt && <UsdtLabel size={14} className="text-xs font-medium" />}
            </p>
            <p className="mt-1 text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
