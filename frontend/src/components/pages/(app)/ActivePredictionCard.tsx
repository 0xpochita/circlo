"use client";

import { HiChevronRight } from "react-icons/hi2";

export default function ActivePredictionCard() {
  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between rounded-2xl bg-surface p-4 cursor-pointer transition-all duration-200 active:scale-[0.97]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand">
            <span className="text-sm font-bold text-white">C</span>
          </div>
          <div>
            <p className="text-base font-semibold text-main-text">0.5 USDm</p>
            <p className="text-sm text-muted">Ends in 2 days · Crypto Circle</p>
          </div>
        </div>
        <HiChevronRight className="w-5 h-5 text-muted" />
      </div>
    </div>
  );
}
