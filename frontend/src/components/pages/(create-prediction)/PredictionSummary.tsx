"use client";

import { UsdtLabel } from "@/components/shared";

const fees = [
  { label: "Stake Amount", value: "0.50" },
  { label: "Platform Fee", value: "0.01" },
  { label: "Network Fee", value: "0.001" },
];

export default function PredictionSummary() {
  return (
    <div className="px-4 py-2">
      <div className="rounded-2xl bg-white p-4">
        <div className="divide-y divide-gray-50">
          {fees.map((fee) => (
            <div key={fee.label} className="flex items-center justify-between py-3">
              <p className="text-sm text-muted">{fee.label}</p>
              <p className="text-sm font-medium text-main-text inline-flex items-center gap-1">
                {fee.value} <UsdtLabel size={12} />
              </p>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3">
          <p className="text-sm font-semibold text-main-text">Total Cost</p>
          <p className="text-sm font-bold text-main-text inline-flex items-center gap-1">
            0.511 <UsdtLabel size={12} />
          </p>
        </div>
      </div>
    </div>
  );
}
