"use client";

import Image from "next/image";
import Link from "next/link";
import { HiChevronRight } from "react-icons/hi2";

export default function ActivePredictionCard() {
  return (
    <div className="px-4 py-2">
      <Link
        href="/prediction-detail"
        className="flex items-center justify-between rounded-2xl bg-white p-4 cursor-pointer transition-all duration-200 active:scale-[0.97]"
      >
        <div className="flex items-center gap-3">
          <Image
            src="/Assets/Images/Avatar/avatar-2.jpeg"
            alt="Sandra"
            width={44}
            height={44}
            className="rounded-full object-cover"
          />
          <div>
            <p className="text-base font-semibold text-main-text">Will Sandra get a job in 2026?</p>
            <p className="text-sm text-muted">Ends in 2 days · Friends 2026</p>
          </div>
        </div>
        <HiChevronRight className="w-5 h-5 text-muted shrink-0" />
      </Link>
    </div>
  );
}
