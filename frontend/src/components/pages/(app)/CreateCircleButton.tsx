"use client";

import Link from "next/link";
import { HiOutlinePlusCircle } from "react-icons/hi2";

export default function CreateCircleButton() {
  return (
    <div className="px-4 py-2">
      <Link
        href="/create-circle"
        className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-4 text-base font-semibold text-white cursor-pointer transition-all duration-200 active:scale-[0.97]"
      >
        <HiOutlinePlusCircle className="w-5 h-5" />
        Create Circle
      </Link>
    </div>
  );
}
