"use client";

import { HiOutlineAdjustmentsHorizontal, HiOutlineGift } from "react-icons/hi2";

export default function RecentActivity() {
  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-main-text">Recent Activity</p>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-100 bg-white cursor-pointer"
        >
          <HiOutlineAdjustmentsHorizontal className="w-4 h-4 text-main-text" />
        </button>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-10 px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 mb-3">
          <HiOutlineGift className="w-6 h-6 text-muted" />
        </div>
        <p className="text-sm font-semibold text-main-text mb-1">
          No referral activity yet
        </p>
        <p className="text-xs text-muted text-center">
          Share your referral code to start earning rewards
        </p>
      </div>
    </div>
  );
}
