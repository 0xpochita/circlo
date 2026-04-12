"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UsdtLabel } from "@/components/shared";

const options = [
  { label: "Yes", percentage: 67, pool: "4.02", color: "emerald" },
  { label: "No", percentage: 33, pool: "1.98", color: "red" },
];

export default function OddsCard() {
  const [selected, setSelected] = useState(0);

  return (
    <div className="px-4 py-2">
      <div className="rounded-2xl bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-main-text">Current Odds</p>
          <p className="text-xs text-muted inline-flex items-center gap-1">
            Total pool: 6.00 <UsdtLabel size={11} />
          </p>
        </div>

        <div className="flex gap-3">
          {options.map((opt, i) => (
            <button
              type="button"
              key={opt.label}
              onClick={() => setSelected(i)}
              className={`flex-1 rounded-xl p-4 cursor-pointer transition-all duration-200 text-left ${
                selected === i
                  ? "bg-brand text-white"
                  : "bg-gray-50 text-main-text"
              }`}
            >
              <p className="text-xs font-medium mb-2 uppercase tracking-wide">
                {opt.label}
              </p>
              <p className={`text-2xl font-bold mb-2 ${selected === i ? "text-white" : "text-main-text"}`}>
                {opt.percentage}%
              </p>
              <div className={`h-1.5 rounded-full mb-2 ${selected === i ? "bg-white/30" : "bg-gray-200"}`}>
                <motion.div
                  className={`h-1.5 rounded-full ${selected === i ? "bg-white" : "bg-brand"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${opt.percentage}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" as const }}
                />
              </div>
              <p className={`text-xs inline-flex items-center gap-1 ${selected === i ? "text-white/80" : "text-muted"}`}>
                Pool: {opt.pool} <UsdtLabel size={11} />
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
