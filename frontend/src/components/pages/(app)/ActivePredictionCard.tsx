"use client";

import Image from "next/image";
import { HiChevronRight } from "react-icons/hi2";

export default function ActivePredictionCard() {
  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between rounded-2xl bg-surface p-4 cursor-pointer transition-all duration-200 active:scale-[0.97]">
        <div className="flex items-center gap-3">
          <Image
            src="/Assets/Images/Logo/logo-coin/celo-logo.svg"
            alt="Celo"
            width={44}
            height={44}
            className="rounded-full"
          />
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
