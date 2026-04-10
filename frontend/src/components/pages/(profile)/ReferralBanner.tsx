"use client";

import { HiOutlineArrowRight } from "react-icons/hi2";

export default function ReferralBanner() {
  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between rounded-2xl bg-surface p-5 cursor-pointer transition-all duration-200 active:scale-[0.97]">
        <div>
          <p className="text-base font-bold text-main-text">Invite friends to Circlo</p>
          <p className="text-sm text-muted">Earn bonus USDm for each referral</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
          <HiOutlineArrowRight className="w-5 h-5 text-main-text" />
        </div>
      </div>
    </div>
  );
}
