"use client";

import { HiOutlineArrowRight } from "react-icons/hi2";
import { UsdtLabel } from "@/components/shared";

const predictions = [
  { title: "BTC above 70k", circle: "Crypto", result: "Won", amount: "+1.20" },
  { title: "Run 5km streak", circle: "Fitness", result: "Lost", amount: "-0.50" },
  { title: "Valorant Champions", circle: "Gaming", result: "Won", amount: "+0.80" },
];

export default function RecentPredictions() {
  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-main-text">Recent predictions</p>
        <button type="button" className="text-sm font-medium text-muted cursor-pointer">
          See all
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
        {predictions.map((p) => (
          <div
            key={p.title}
            className="flex min-w-[160px] flex-col rounded-2xl bg-white p-1 cursor-pointer transition-all duration-200 active:scale-[0.97]"
          >
            <div className="flex aspect-square flex-col justify-between rounded-2xl bg-gray-50 p-3">
              <div>
                <HiOutlineArrowRight className={`w-6 h-6 ${p.result === "Won" ? "text-emerald-500 -rotate-45" : "text-red-400 rotate-45"}`} />
              </div>
              <p className="text-sm text-muted">{p.title}</p>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-2">
              <p className="text-base font-bold text-main-text inline-flex items-center gap-1">
                {p.amount} <UsdtLabel size={12} />
              </p>
              <p className={`text-xs font-medium ${p.result === "Won" ? "text-emerald-500" : "text-red-400"}`}>
                {p.result}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
