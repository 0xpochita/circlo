"use client";

import { UsdtLabel } from "@/components/shared";
import { useCreateGoalStore } from "@/stores/createGoalStore";

const PLATFORM_FEE_BPS = 100;
const NETWORK_FEE = 0.001;

export default function PredictionSummary() {
  const stakeAmount = useCreateGoalStore((s) => s.stakeAmount);

  const stake = parseFloat(stakeAmount) || 0;
  const platformFee = (stake * PLATFORM_FEE_BPS) / 10000;
  const total = stake + platformFee + NETWORK_FEE;

  function fmt(n: number): string {
    if (n === 0) return "0";
    if (n < 0.01) return n.toFixed(3);
    return n.toFixed(2);
  }

  const rows = [
    { label: "Stake Amount", value: fmt(stake) },
    { label: "Platform Fee", value: fmt(platformFee) },
    { label: "Network Fee", value: fmt(NETWORK_FEE) },
  ];

  return (
    <div className="px-4 py-2">
      <div className="rounded-2xl bg-white p-4">
        <div className="divide-y divide-gray-50">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between py-3"
            >
              <p className="text-sm text-muted">{row.label}</p>
              <p className="text-sm font-medium text-main-text inline-flex items-center gap-1">
                {row.value} <UsdtLabel size={12} />
              </p>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3">
          <p className="text-sm font-semibold text-main-text">Total Cost</p>
          <p className="text-sm font-bold text-main-text inline-flex items-center gap-1">
            {fmt(total)} <UsdtLabel size={12} />
          </p>
        </div>
      </div>
    </div>
  );
}
