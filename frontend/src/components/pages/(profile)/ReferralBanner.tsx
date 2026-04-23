"use client";

import Link from "next/link";
import { HiOutlinePlus } from "react-icons/hi2";

export default function ReferralBanner() {
  return (
    <div className="px-4 py-2">
      <Link
        href="/create-circle"
        className="flex items-center justify-between rounded-2xl bg-white p-5 cursor-pointer transition-all duration-200 active:scale-[0.97]"
      >
        <div>
          <p className="text-base font-bold text-main-text">
            Create your circle
          </p>
          <p className="text-sm text-muted">
            Start your own circle and predict together
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-main-bg">
          <HiOutlinePlus className="w-5 h-5 text-main-text" />
        </div>
      </Link>
    </div>
  );
}
