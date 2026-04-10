"use client";

import { UsdtLabel } from "@/components/shared";

const info: { label: string; value: string; usdt?: boolean }[] = [
  { label: "Goal owner", value: "Sandra Flavor" },
  { label: "Circle", value: "Friends 2026" },
  { label: "Start date", value: "Apr 9, 2026" },
  { label: "Deadline", value: "Dec 31, 2026" },
  { label: "Resolved by", value: "Circle vote" },
  { label: "Minimum stake", value: "0.10", usdt: true },
];

export default function InfoSection() {
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
    </div>
  );
}
