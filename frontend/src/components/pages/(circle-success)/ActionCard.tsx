"use client";

import Link from "next/link";
import { HiOutlineArrowRight } from "react-icons/hi2";
import { TbTargetArrow } from "react-icons/tb";

export default function ActionCard() {
  return (
    <div className="px-4 py-3">
      <Link
        href="/create-prediction"
        className="flex items-center justify-between rounded-2xl bg-white p-4 cursor-pointer transition-all duration-200 active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
            <TbTargetArrow className="w-6 h-6 text-brand" />
          </div>
          <div>
            <p className="text-sm font-semibold text-main-text">
              Create your first prediction
            </p>
            <p className="text-xs text-muted max-w-[220px]">
              Kickstart your circle with a fun prediction event.
            </p>
          </div>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50">
          <HiOutlineArrowRight className="w-4 h-4 text-main-text" />
        </div>
      </Link>
    </div>
  );
}
