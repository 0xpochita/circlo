"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useReadContract } from "wagmi";
import { UsdtLabel } from "@/components/shared";
import { predictionPoolContract } from "@/lib/web3/contracts";
import { fromUSDT } from "@/lib/web3/usdt";

type OddsCardProps = {
  goalChainId?: string;
};

export default function OddsCard({ goalChainId }: OddsCardProps) {
  const [selected, setSelected] = useState(0);

  const enabled = !!goalChainId;
  const goalId = goalChainId ? BigInt(goalChainId) : BigInt(0);

  const { data: yesPoolRaw } = useReadContract({
    ...predictionPoolContract,
    functionName: "poolPerSide",
    args: [goalId, 0],
    query: { enabled },
  });

  const { data: noPoolRaw } = useReadContract({
    ...predictionPoolContract,
    functionName: "poolPerSide",
    args: [goalId, 1],
    query: { enabled },
  });

  const yesPool = yesPoolRaw ? fromUSDT(yesPoolRaw as bigint) : 0;
  const noPool = noPoolRaw ? fromUSDT(noPoolRaw as bigint) : 0;
  const totalPool = yesPool + noPool;

  const yesPercent =
    totalPool > 0 ? Math.round((yesPool / totalPool) * 100) : 50;
  const noPercent = totalPool > 0 ? 100 - yesPercent : 50;

  const options = [
    {
      label: "Yes",
      percentage: yesPercent,
      pool: parseFloat(yesPool.toFixed(4)).toString(),
    },
    {
      label: "No",
      percentage: noPercent,
      pool: parseFloat(noPool.toFixed(4)).toString(),
    },
  ];

  return (
    <div className="px-4 py-2">
      <div className="rounded-2xl bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-main-text">Current Odds</p>
          <p className="text-xs text-muted inline-flex items-center gap-1">
            Total pool: {parseFloat(totalPool.toFixed(4)).toString()}{" "}
            <UsdtLabel size={11} />
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
              <p
                className={`text-2xl font-bold mb-2 ${selected === i ? "text-white" : "text-main-text"}`}
              >
                {opt.percentage}%
              </p>
              <div
                className={`h-1.5 rounded-full mb-2 ${selected === i ? "bg-white/30" : "bg-gray-200"}`}
              >
                <motion.div
                  className={`h-1.5 rounded-full ${selected === i ? "bg-white" : "bg-brand"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${opt.percentage}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" as const }}
                />
              </div>
              <p
                className={`text-xs inline-flex items-center gap-1 ${selected === i ? "text-white/80" : "text-muted"}`}
              >
                Pool: {opt.pool} <UsdtLabel size={11} />
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
