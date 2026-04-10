"use client";

import { HiXMark } from "react-icons/hi2";
import { useRouter } from "next/navigation";

export default function ReferralHeader() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between px-4 pt-14 pb-2">
      <p className="text-xl font-bold tracking-tight text-main-text">Circlo</p>
      <button
        type="button"
        onClick={() => router.back()}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white cursor-pointer transition-all duration-200 active:scale-[0.95]"
      >
        <HiXMark className="w-5 h-5 text-main-text" />
      </button>
    </div>
  );
}
